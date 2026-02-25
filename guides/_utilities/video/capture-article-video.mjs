#!/usr/bin/env node
/**
 * Playwright script to record article walkthrough videos.
 *
 * Run with: pnpm run video:article (from mintlify-docs/)
 *   pnpm run video:article -- --guides=managing-asset-views-and-details
 *   pnpm run video:article -- --keep-static   # skip removing duplicate-frame segments
 *
 * For subtitles + narrator: after recording, run
 *   pnpm run video:narration -- --guides=managing-knowledge-base
 * Uses AWS Bedrock (Claude) + Polly. Set AWS_PROFILE=harmony-mgmt, run aws sso login first.
 *
 * Uses the same persistent Chrome profile as screenshots (login once with screenshots:dashboard:login).
 * Records the browser viewport with Playwright recordVideo. Ghost cursor overlay shows mouse movement.
 * Records at your screen's available size by default. Override with RECORDING_WIDTH and RECORDING_HEIGHT.
 * Output: WebM → MP4 via ffmpeg.
 *
 * Prerequisites:
 * - Frontend running at BASE_URL (default localhost:5173)
 * - ffmpeg installed (for WebM → MP4 conversion)
 * - Run screenshots:dashboard:login first if not logged in
 */

import { chromium } from "playwright";
import { createCursor } from "ghost-cursor-playwright";
import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

import {
  hideImpersonationBanner,
  injectHideImpersonationBanner,
  PROFILE_DIR,
  BASE_URL,
} from "../screenshot-shared.mjs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, "../../..");
const GUIDE_ASSETS = join(DOCS_ROOT, "guides");
const RECORDINGS_DIR = join(DOCS_ROOT, ".recordings");

const SCREEN_PAUSE_MS = 1500;
const guidesArg = process.argv.find((a) => a.startsWith("--guides="));
const selectedGuide = guidesArg ? guidesArg.replace("--guides=", "").trim() : "managing-knowledge-base";
const keepStatic = process.argv.includes("--keep-static");

/** Gets screen size for full-viewport recording. Env vars override: RECORDING_WIDTH, RECORDING_HEIGHT. */
async function getRecordingSize() {
  const w = process.env.RECORDING_WIDTH ? parseInt(process.env.RECORDING_WIDTH, 10) : null;
  const h = process.env.RECORDING_HEIGHT ? parseInt(process.env.RECORDING_HEIGHT, 10) : null;
  if (w && h && w > 0 && h > 0) {
    return { width: w, height: h };
  }
  // Headed required to get real screen size (headless defaults to 800x600)
  process.stdout.write("  Detecting screen size... ");
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const size = await page.evaluate(() => ({
    width: Math.floor(window.screen.availWidth),
    height: Math.floor(window.screen.availHeight),
  }));
  await browser.close();
  console.log(`${size.width}x${size.height}`);
  // Cap at 1920x1080 so content stays readable (large viewports make UI tiny)
  const MAX_W = 1920;
  const MAX_H = 1080;
  return {
    width: Math.min(MAX_W, Math.max(1280, size.width)),
    height: Math.min(MAX_H, Math.max(720, size.height)),
  };
}

function runFfmpeg(args, cwd = DOCS_ROOT) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: "inherit", cwd });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
}

/** Auto-detects and returns crop params {w,h,x,y} using ffmpeg cropdetect at limit=128 (catches light gray). */
async function detectCrop(filePath) {
  return new Promise((resolve) => {
    // Sample 2 seconds from the middle of the video where content is visible
    const proc = spawn("ffmpeg", ["-ss", "10", "-t", "2", "-i", filePath, "-vf", "cropdetect=limit=128:round=2:skip=2", "-f", "null", "-"], {
      cwd: DOCS_ROOT,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", () => {
      const matches = [...stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
      if (matches.length === 0) { resolve(null); return; }
      // Use the most common crop value
      const counts = {};
      for (const m of matches) counts[m[0]] = (counts[m[0]] || 0) + 1;
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      const [, w, h, x, y] = best.match(/crop=(\d+):(\d+):(\d+):(\d+)/);
      resolve({ w: +w, h: +h, x: +x, y: +y });
    });
  });
}

async function getDurationMs(filePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath], {
      cwd: DOCS_ROOT,
      encoding: "utf-8",
    });
    let out = "";
    proc.stdout?.on("data", (d) => (out += d));
    proc.on("close", (code) => {
      if (code === 0) resolve(Math.round(parseFloat(out.trim()) * 1000) || 0);
      else reject(new Error(`ffprobe exited ${code}`));
    });
  });
}

/** Injects a visible cursor overlay that follows Playwright's mouse. Must run in page context. */
function injectCursorOverlay() {
  if (document.getElementById("__playwright_cursor_overlay__") || !document.body) return;
  const box = document.createElement("div");
  box.id = "__playwright_cursor_overlay__";
  Object.assign(box.style, {
    pointerEvents: "none",
    position: "fixed",
    top: "0",
    left: "0",
    zIndex: "2147483647",
    width: "24px",
    height: "24px",
    background: "rgba(102,98,255,0.75)",
    border: "2px solid white",
    borderRadius: "12px",
    margin: "-12px 0 0 -12px",
    padding: "0",
    transition: "background .15s, border-radius .15s",
    boxSizing: "border-box",
  });
  const update = (e) => {
    box.style.left = e.clientX + "px";
    box.style.top = e.clientY + "px";
    box.style.visibility = "visible";
  };
  document.addEventListener("mousemove", update, true);
  document.addEventListener("mousedown", (e) => {
    update(e);
    box.style.background = "rgba(102,98,255,1)";
  }, true);
  document.addEventListener("mouseup", (e) => {
    update(e);
    box.style.background = "rgba(102,98,255,0.75)";
  }, true);
  document.body.appendChild(box);
}

async function main() {
  const guideFile = join(GUIDE_ASSETS, selectedGuide, "guide.mjs");
  let guideModule;
  try {
    guideModule = await import(guideFile);
  } catch {
    console.error(`\nUnknown guide or missing guide file: ${selectedGuide}`);
    console.error(`  Expected: ${guideFile}\n`);
    process.exit(1);
  }
  const { targets, videoConfig } = guideModule;
  if (!videoConfig?.path) {
    console.error(`\nGuide "${selectedGuide}" has no videoConfig.path export.\n`);
    process.exit(1);
  }
  const config = { ...videoConfig, targets };

  const gDir = join(GUIDE_ASSETS, selectedGuide);
  const vDir = join(gDir, "video");
  const sDir = join(vDir, "source");
  await mkdir(RECORDINGS_DIR, { recursive: true });
  await mkdir(sDir, { recursive: true });

  const webmPath = join(RECORDINGS_DIR, `${selectedGuide}.webm`);
  const mp4Path = join(sDir, "video-raw.mp4");

  console.log(`\nRecording guide: ${selectedGuide}`);
  console.log(`  Path: /${config.path}`);
  console.log(`  Targets: ${targets.length}`);
  console.log(`  Output: ${mp4Path}\n`);

  const VIDEO_SIZE = await getRecordingSize();
  console.log(`  Viewport: ${VIDEO_SIZE.width}x${VIDEO_SIZE.height}\n`);

  const baseOptions = {
    headless: false,
    viewport: null, // Required for --start-maximized to fill screen; recordVideo size controls output
    ignoreHTTPSErrors: true,
    args: ["--start-maximized"],
    defaultTimeout: 10000,
  };

  console.log("\nRecording...\n");
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    ...baseOptions,
    recordVideo: { dir: RECORDINGS_DIR, size: VIDEO_SIZE },
  });

  await context.addInitScript(injectHideImpersonationBanner);
  await context.addInitScript(injectCursorOverlay);

  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto(`${BASE_URL}/${config.path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => { });
    await new Promise((r) => setTimeout(r, 1500));
    const isLoginPage =
      (await page.locator("form[action*='login'], [data-testid=login], input[type='password']").count()) > 0;
    if (isLoginPage) {
      console.error("\n❌ Login required. Run: pnpm run screenshots:dashboard:login\n");
      process.exit(1);
    }
    await hideImpersonationBanner(page);

    // Run optional guide-level preload: resets UI state before recording begins
    // (runs during the blank loading period so first visible frame is the correct starting state)
    if (typeof config.preload === "function") {
      console.log("  Preloading initial state...");
      await config.preload(page);
      await hideImpersonationBanner(page);
    }

    const cursor = await createCursor(page, { debug: true });

    await page.evaluate(injectCursorOverlay);

    const stepStartMs = [];
    const recordStart = Date.now();

    for (let i = 0; i < config.targets.length; i++) {
      const target = config.targets[i];
      const label = target.filename?.replace(".png", "") ?? `step-${i + 1}`;
      console.log(`  [${i + 1}/${config.targets.length}] ${label}`);
      await page.evaluate(injectCursorOverlay);
      const stepStart = Date.now() - recordStart; // Record BEFORE action so narration plays during it
      const prepareFn = target.videoPrepare ?? target.prepare;
      if (typeof prepareFn === "function") {
        await prepareFn(page, cursor);
        await hideImpersonationBanner(page);
      }
      try {
        await page.waitForSelector(target.selector, { state: "visible", timeout: 3000 });
      } catch {
        /* selector may not match; use action-complete time */
      }

      stepStartMs.push(stepStart);
      await new Promise((r) => setTimeout(r, SCREEN_PAUSE_MS));
    }

    const recordedDurationMs = Date.now() - recordStart;
    const stepsPath = join(sDir, "video-steps.json");
    await writeFile(
      stepsPath,
      JSON.stringify({
        recordedDurationMs,
        steps: stepStartMs.map((startMs, index) => ({
          index,
          startMs,
          selector: config.targets[index]?.selector,
        })),
      }),
      "utf-8"
    );
    console.log(`  Step mapping: ${stepsPath}`);

    console.log("\nStopping recording...");
  } finally {
    const video = page.video();
    await Promise.all([
      context.close(),
      video ? video.saveAs(webmPath) : Promise.resolve(),
    ]);
  }

  console.log(`Video saved: ${webmPath}`);

  try {
    const crop = await detectCrop(webmPath);
    if (crop) console.log(`  Auto-crop: ${crop.w}x${crop.h}+${crop.x}+${crop.y}`);

    const ffmpegArgs = ["-y", "-i", webmPath];
    const vfParts = [];
    if (!keepStatic) vfParts.push("mpdecimate=hi=64*12:lo=64*5:frac=0.1");
    if (crop) vfParts.push(`crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`);
    if (vfParts.length > 0) {
      if (!keepStatic) ffmpegArgs.push("-vsync", "vfr");
      ffmpegArgs.push("-vf", vfParts.join(","));
    }
    ffmpegArgs.push("-c:v", "libx264", "-crf", "18");
    if (keepStatic) ffmpegArgs.push("-c:a", "aac");
    else ffmpegArgs.push("-an");
    ffmpegArgs.push("-movflags", "+faststart", mp4Path);
    console.log("Converting to MP4...");
    await runFfmpeg(ffmpegArgs);
    console.log(`✓ video-raw.mp4\n`);
  } catch (e) {
    console.warn("\n⚠ ffmpeg not found or failed. WebM is at:", webmPath);
    console.warn("  Install ffmpeg and run manually:");
    console.warn(`  ffmpeg -i "${webmPath}" -vf "mpdecimate=hi=64*12:lo=64*5:frac=0.1,crop=1254:720:0:0" -vsync vfr -c:v libx264 -crf 18 -an -movflags +faststart "${mp4Path}"\n`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
