#!/usr/bin/env node
/**
 * Harmony Docs Studio — interactive CLI for screenshot & video creation.
 *
 * Run with: pnpm run studio   (from mintlify-docs/)
 *
 * Controls
 *   ↑ / ↓     navigate
 *   Space      toggle selection
 *   a          select all / deselect all
 *   Enter      confirm
 *   q / Esc    cancel / go back
 */

import { readdir, stat, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import * as readline from "readline";
import { request } from "http";
import { FALLBACK_NARRATION } from "./video/narration-scripts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, "../..");
const GUIDES_ROOT = join(DOCS_ROOT, "guides");

// ─── ANSI ────────────────────────────────────────────────────────────────────

const E = "\x1b[";
const ansi = {
  hide: "\x1b[?25l",
  show: "\x1b[?25h",
  clear: "\x1b[2J\x1b[H",
  eol: "\x1b[K",           // erase to end of line
  up: (n) => `\x1b[${n}A`,
  reset: "\x1b[0m",
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
  white: (s) => `\x1b[97m${s}\x1b[0m`,
  bgRow: (s) => {
    const BG = "\x1b[48;5;237m";
    return BG + s.replace(/\x1b\[0m/g, `\x1b[0m${BG}`) + "\x1b[0m";
  },
};

function vlen(s) {
  // Visible length — strip all ANSI escape sequences
  return s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").length;
}
function rpad(s, w) { return s + " ".repeat(Math.max(0, w - vlen(s))); }
function lpad(s, w) { return " ".repeat(Math.max(0, w - vlen(s))) + s; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function countLines(filePath) {
  try {
    const txt = await readFile(filePath, "utf8");
    return txt.split("\n").length;
  } catch {
    return 0;
  }
}

// ─── Guide discovery ─────────────────────────────────────────────────────────

// Folders inside guides/ that are not article guides
const SKIP_DIRS = new Set(["_utilities", "_shared", "agents"]);

async function discoverGuides() {
  const entries = await readdir(GUIDES_ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

// ─── Stats ───────────────────────────────────────────────────────────────────

async function getGuideStats(guideName) {
  const guideDir = join(GUIDES_ROOT, guideName);

  // Screenshots
  const screenshotsDir = join(guideDir, "screenshots");
  let screenshotCount = 0;
  let screenshotMtime = null;
  try {
    const files = await readdir(screenshotsDir);
    const pngs = files.filter((f) => f.endsWith(".png"));
    screenshotCount = pngs.length;
    for (const f of pngs) {
      const s = await stat(join(screenshotsDir, f));
      if (!screenshotMtime || s.mtime > screenshotMtime) screenshotMtime = s.mtime;
    }
  } catch { }

  // Final video
  const videoPath = join(guideDir, "video", "video.mp4");
  let videoExists = false;
  let videoMtime = null;
  try {
    const s = await stat(videoPath);
    videoExists = true;
    videoMtime = s.mtime;
  } catch { }

  // guide.mjs metadata
  let expectedScreenshots = 0;
  let hasVideoConfig = false;
  let hasGuideFile = false;
  try {
    const guide = await import(`${guideDir}/guide.mjs`);
    expectedScreenshots = guide.targets?.length ?? 0;
    hasVideoConfig = !!guide.videoConfig;
    hasGuideFile = true;
  } catch { }

  // Line counts (MDX + guide.mjs)
  const mdxFiles = (await readdir(guideDir)).filter((f) => f.endsWith(".mdx"));
  const mdxLines = mdxFiles.length
    ? await countLines(join(guideDir, mdxFiles[0]))
    : 0;
  const mjsLines = hasGuideFile
    ? await countLines(join(guideDir, "guide.mjs"))
    : 0;

  const mtimes = [screenshotMtime, videoMtime].filter(Boolean);
  const lastUpdated = mtimes.length
    ? new Date(Math.max(...mtimes.map((d) => d.getTime())))
    : null;

  const narrationSegments = FALLBACK_NARRATION[guideName]?.length ?? 0;
  const hasNarrationConfig = narrationSegments > 0;

  return {
    guideName,
    screenshotCount,
    expectedScreenshots,
    videoExists,
    hasVideoConfig,
    hasGuideFile,
    mdxLines,
    mjsLines,
    hasNarrationConfig,
    narrationSegments,
    lastUpdated,
  };
}

function formatAge(date) {
  if (!date) return ansi.gray("—");
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return ansi.green(`${mins}m ago`);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return ansi.green(`${hrs}h ago`);
  const days = Math.floor(hrs / 24);
  if (days === 1) return ansi.yellow("yesterday");
  if (days < 30) return ansi.yellow(`${days}d ago`);
  return ansi.red(`${Math.floor(days / 30)}mo ago`);
}

// ─── Shared TUI primitives ───────────────────────────────────────────────────

function writeLines(lines) {
  process.stdout.write(lines.map((l) => `\r${l}${ansi.eol}`).join("\n") + "\n");
}

function rewriteLines(lines, prevCount) {
  if (prevCount > 0) process.stdout.write(ansi.up(prevCount));
  writeLines(lines);
  return lines.length;
}

function startRaw() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdout.write(ansi.hide);
}

function stopRaw() {
  process.stdout.write(ansi.show);
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
}

// Promisified keypress — resolves with the key event
function nextKey() {
  return new Promise((resolve) => {
    process.stdin.once("keypress", (str, key) => resolve({ str, key }));
  });
}

// ─── Screen 1: Guide multi-select ────────────────────────────────────────────

const COL_NAME = 38;
const COL_CFG  = 12;
const COL_MDX  = 5;
const COL_MJS  = 6;
const COL_NARR = 5;
const COL_SHOT = 14;
const COL_VID  = 10;

function buildGuideLines(stats, cursor, selected) {
  const W = 96;
  const lines = [];

  lines.push("");
  lines.push(ansi.bold("  Harmony Docs Studio"));
  lines.push(ansi.gray("  Screenshot & video creator"));
  lines.push("");
  lines.push(
    ansi.gray(
      "  " +
      rpad("Guide", COL_NAME) +
      rpad("  Blueprint", COL_CFG) +
      lpad("MDX", COL_MDX) + " " +
      lpad(".mjs", COL_MJS) + " " +
      lpad("Narr", COL_NARR) + "  " +
      rpad("Screenshots", COL_SHOT) +
      rpad("Video", COL_VID) +
      "Updated"
    )
  );
  lines.push(ansi.gray("  " + "─".repeat(W)));

  for (let i = 0; i < stats.length; i++) {
    const stat = stats[i];
    const active = i === cursor;
    const checked = selected.has(stat.guideName);
    const blocked = !stat.hasGuideFile;

    const indicator = active ? (blocked ? ansi.red("▶") : ansi.cyan("▶")) : " ";
    const box = blocked
      ? ansi.red("✗")
      : checked
      ? ansi.green("◉")
      : ansi.gray("○");

    let name = stat.guideName;
    if (name.length > COL_NAME - 4) name = name.slice(0, COL_NAME - 7) + "...";
    const nameCol = blocked
      ? ansi.red(rpad(name, COL_NAME - 4))
      : active
      ? ansi.bold(ansi.cyan(rpad(name, COL_NAME - 4)))
      : rpad(name, COL_NAME - 4);

    // Blueprint (guide.mjs) column
    const cfgCol = rpad(
      "  " + (stat.hasGuideFile ? ansi.green("✓") : ansi.red("✗")),
      COL_CFG
    );

    // Line count columns
    const mdxVal = stat.mdxLines ? String(stat.mdxLines) : "—";
    const mjsVal = stat.mjsLines ? String(stat.mjsLines) : "—";
    const mdxCol = blocked
      ? ansi.red(lpad(mdxVal, COL_MDX))
      : ansi.gray(lpad(mdxVal, COL_MDX));
    const mjsCol = blocked
      ? ansi.red(lpad(mjsVal, COL_MJS))
      : ansi.dim(lpad(mjsVal, COL_MJS));

    // Narration column — shows segment count; yellow if mismatch with targets
    let narrCol;
    if (blocked) {
      narrCol = ansi.red(lpad("—", COL_NARR));
    } else if (!stat.hasNarrationConfig) {
      narrCol = ansi.red(lpad("—", COL_NARR));
    } else if (stat.expectedScreenshots > 0 && stat.narrationSegments !== stat.expectedScreenshots) {
      narrCol = ansi.yellow(lpad(String(stat.narrationSegments), COL_NARR));
    } else {
      narrCol = ansi.green(lpad(String(stat.narrationSegments), COL_NARR));
    }

    // Screenshots column
    let shotCol;
    if (blocked) {
      shotCol = ansi.red(rpad("—", COL_SHOT));
    } else if (stat.expectedScreenshots === 0) {
      shotCol = ansi.gray(rpad("—", COL_SHOT));
    } else if (stat.screenshotCount === 0) {
      shotCol = ansi.red(rpad(`0/${stat.expectedScreenshots}`, COL_SHOT));
    } else if (stat.screenshotCount >= stat.expectedScreenshots) {
      shotCol = ansi.green(rpad(`${stat.screenshotCount}/${stat.expectedScreenshots} ✓`, COL_SHOT));
    } else {
      shotCol = ansi.yellow(rpad(`${stat.screenshotCount}/${stat.expectedScreenshots}`, COL_SHOT));
    }

    // Video column  — "—" no config · "cfg" configured not recorded · "✓ mp4" done
    let vidCol;
    if (blocked) {
      vidCol = ansi.red(rpad("—", COL_VID));
    } else if (!stat.hasVideoConfig) {
      vidCol = ansi.gray(rpad("—", COL_VID));
    } else if (stat.videoExists) {
      vidCol = ansi.green(rpad("✓ mp4", COL_VID));
    } else {
      vidCol = ansi.yellow(rpad("cfg", COL_VID));
    }

    const age = blocked ? ansi.red("—") : formatAge(stat.lastUpdated);

    const rowLine = `  ${indicator} ${box} ${nameCol} ${cfgCol}${mdxCol} ${mjsCol} ${narrCol}  ${shotCol}${vidCol}${age}`;
    lines.push(active ? ansi.bgRow(rowLine) : rowLine);
  }

  lines.push(ansi.gray("  " + "─".repeat(W)));

  const selCount = selected.size;
  const selLabel =
    selCount > 0
      ? ansi.cyan(`  ${selCount} guide${selCount === 1 ? "" : "s"} selected`)
      : ansi.gray("  No guides selected");
  lines.push(selLabel);
  lines.push(ansi.red("  ✗ Red guides are missing a guide.mjs blueprint and cannot be selected"));
  lines.push(
    ansi.gray(
      "  ↑/↓ navigate  · Space select  · a all  · Enter confirm  · q quit"
    )
  );
  lines.push("");

  return lines;
}

async function screenSelectGuides(stats) {
  const selected = new Set();
  let cursor = 0;

  startRaw();

  let prevCount = 0;
  const render = () => {
    const lines = buildGuideLines(stats, cursor, selected);
    prevCount = rewriteLines(lines, prevCount);
  };

  render();

  while (true) {
    const { str, key } = await nextKey();

    if (key.ctrl && key.name === "c") { stopRaw(); return null; }
    if (key.name === "q") { stopRaw(); return null; }

    if (key.name === "up" || (key.name === "k" && !key.ctrl)) {
      cursor = Math.max(0, cursor - 1);
    } else if (key.name === "down" || (key.name === "j" && !key.ctrl)) {
      cursor = Math.min(stats.length - 1, cursor + 1);
    } else if (key.name === "space") {
      const stat = stats[cursor];
      if (!stat.hasGuideFile) { /* blocked — no blueprint */ }
      else if (selected.has(stat.guideName)) selected.delete(stat.guideName);
      else selected.add(stat.guideName);
    } else if (str === "a") {
      const selectable = stats.filter((s) => s.hasGuideFile);
      if (selected.size === selectable.length) selected.clear();
      else selectable.forEach((s) => selected.add(s.guideName));
    } else if (key.name === "return") {
      if (selected.size > 0) {
        stopRaw();
        return [...selected];
      }
    }

    render();
  }
}

// ─── Screen 2: Action select ─────────────────────────────────────────────────

const ACTIONS = [
  {
    id: "screenshots",
    icon: "📷",
    label: "Screenshots + apply to MDX",
    desc: "Capture screenshots then inject them as image tags into the MDX",
  },
  {
    id: "full",
    icon: "🎞 ",
    label: "Full video pipeline",
    desc: "Record → narrate → compose final video (requires local app running)",
  },
];

function buildActionLines(guideNames, cursor) {
  const lines = [];
  lines.push("");
  lines.push(
    ansi.bold(
      `  Run for ${guideNames.length} guide${guideNames.length === 1 ? "" : "s"}:`
    )
  );
  lines.push(
    ansi.gray("  " + guideNames.map((g) => g.replace(/-/g, " ")).join(", "))
  );
  lines.push("");

  for (let i = 0; i < ACTIONS.length; i++) {
    const a = ACTIONS[i];
    const active = i === cursor;
    const prefix = active ? ansi.cyan("  ❯ ") : "    ";
    const label = active
      ? ansi.bold(ansi.cyan(`${a.icon}  ${a.label}`))
      : `${a.icon}  ${a.label}`;
    const desc = active ? `\n${ansi.gray("       " + a.desc)}` : "";
    lines.push(`${prefix}${label}${desc}`);
  }

  lines.push("");
  lines.push(ansi.gray("  ↑/↓ navigate  · Enter confirm  · Esc/q back"));
  lines.push("");
  return lines;
}

async function screenSelectAction(guideNames) {
  let cursor = 0;

  startRaw();

  let prevCount = 0;
  const render = () => {
    const lines = buildActionLines(guideNames, cursor);
    prevCount = rewriteLines(lines, prevCount);
  };

  render();

  while (true) {
    const { str, key } = await nextKey();

    if (key.ctrl && key.name === "c") { stopRaw(); return null; }
    if (key.name === "q" || key.name === "escape") { stopRaw(); return null; }

    if (key.name === "up" || (key.name === "k" && !key.ctrl)) {
      cursor = Math.max(0, cursor - 1);
    } else if (key.name === "down" || (key.name === "j" && !key.ctrl)) {
      cursor = Math.min(ACTIONS.length - 1, cursor + 1);
    } else if (key.name === "return") {
      stopRaw();
      return ACTIONS[cursor].id;
    }

    render();
  }
}

// ─── Runner ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

function checkAppRunning() {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL);
    const req = request({ host: url.hostname, port: url.port || 80, path: "/", method: "HEAD" }, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

function runCmd(cmd, args, cwd = DOCS_ROOT) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "inherit", cwd });
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`Exited with code ${code}`))
    );
  });
}

async function runAction(action, guides, statsMap) {
  const banner = (text) =>
    console.log(`\n${ansi.bold(ansi.cyan("  ▶"))} ${ansi.bold(text)}\n`);
  const skip = (guide, reason) =>
    console.log(`\n  ${ansi.gray("○")} ${ansi.gray(`Skipping ${guide} — ${reason}`)}`);

  if (action === "screenshots" || action === "full") {
    const appUp = await checkAppRunning();
    if (!appUp) {
      console.log(
        `\n  ${ansi.red("✗")} ${ansi.bold("App is not running at")} ${ansi.yellow(BASE_URL)}\n` +
        `\n  Start the frontend first, then re-run the studio.\n`
      );
      return;
    }
  }

  for (const guide of guides) {
    const s = statsMap.get(guide);

    switch (action) {
      case "screenshots":
        if (!s?.hasGuideFile) { skip(guide, "no guide.mjs"); break; }
        banner(`Screenshots — ${guide}`);
        await runCmd("pnpm", ["run", "screenshots:dashboard", "--", `--guides=${guide}`, "--force"]);
        banner(`Applying screenshots → MDX — ${guide}`);
        await runCmd("pnpm", ["run", "screenshots:apply", "--", `--guides=${guide}`]);
        break;

      case "full":
        if (!s?.hasGuideFile) { skip(guide, "no guide.mjs"); break; }
        if (!s?.hasVideoConfig) { skip(guide, "no videoConfig in guide.mjs"); break; }
        banner(`Full pipeline — ${guide}`);
        await runCmd("pnpm", ["run", "video:full", "--", `--guides=${guide}`]);
        break;
    }
  }

  console.log(`\n  ${ansi.green("✓")} ${ansi.bold("All done!")}\n`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

process.on("SIGINT", () => {
  process.stdout.write(ansi.show);
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stdout.write("\n");
  process.exit(0);
});

async function main() {
  // Load stats while showing a spinner-ish message
  process.stdout.write(ansi.clear);
  process.stdout.write(
    `${ansi.bold("  Harmony Docs Studio")}\n${ansi.gray("  Loading guide stats...")}\n`
  );
  const guides = await discoverGuides();
  const stats = await Promise.all(guides.map(getGuideStats));

  // Screen 1 — guide selection
  process.stdout.write(ansi.clear);
  const selectedGuides = await screenSelectGuides(stats);
  if (!selectedGuides) {
    console.log(ansi.gray("\n  Cancelled.\n"));
    process.exit(0);
  }

  // Screen 2 — action selection
  process.stdout.write(ansi.clear);
  const action = await screenSelectAction(selectedGuides);
  if (!action) {
    console.log(ansi.gray("\n  Cancelled.\n"));
    process.exit(0);
  }

  // Run
  const statsMap = new Map(stats.map((s) => [s.guideName, s]));
  process.stdout.write(ansi.clear);
  await runAction(action, selectedGuides, statsMap);
  process.exit(0);
}

main().catch((err) => {
  process.stdout.write(ansi.show);
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  console.error(ansi.red("\n  Error: ") + err.message + "\n");
  process.exit(1);
});
