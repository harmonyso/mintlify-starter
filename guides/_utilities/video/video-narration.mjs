#!/usr/bin/env node
/**
 * Adds narration (TTS) and subtitles to guide videos using AWS Bedrock + Polly.
 *
 * Run with: AWS_PROFILE=harmony-mgmt AWS_REGION=us-east-1 node scripts/video-narration.mjs
 *   node scripts/video-narration.mjs --guides=managing-knowledge-base
 *
 * Prerequisites:
 * - aws sso login --profile harmony-mgmt (SSO credentials)
 * - AWS_PROFILE=harmony-mgmt, AWS_REGION=us-east-1
 * - @aws-sdk/client-bedrock-runtime, @aws-sdk/client-polly
 * - ffmpeg
 */

import { FALLBACK_NARRATION } from "./narration-scripts.mjs";
import { fromSSO } from "@aws-sdk/credential-providers";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { access, mkdir, readFile, writeFile, unlink, rename } from "fs/promises";
import { join, dirname } from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, "../../..");
const GUIDE_ASSETS = join(DOCS_ROOT, "guides");
/** Returns the per-guide asset directory: guides/{guide}/ */
const guideDir = (guide) => join(GUIDE_ASSETS, guide);
/** Returns the per-guide video directory: guides/{guide}/video/ */
const guideVideoDir = (guide) => join(GUIDE_ASSETS, guide, "video");
/** Returns the per-guide video source directory: guides/{guide}/video/source/ */
const guideSourceDir = (guide) => join(GUIDE_ASSETS, guide, "video", "source");

const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const AWS_PROFILE = process.env.AWS_PROFILE || "harmony-mgmt";

const guidesArg = process.argv.find((a) => a.startsWith("--guides="));
const selectedGuide = guidesArg ? guidesArg.replace("--guides=", "").trim() : "managing-knowledge-base";

/** Human-readable titles for intro frame. Keyed by guide filename stem. */
const GUIDE_TITLES = {
  "managing-knowledge-base": "Knowledge Base",
  "managing-asset-views-and-details": "Asset Views & Details",
  "analyzing-asset-and-automation-metrics": "Asset & Automation Metrics",
};

const INTRO_DURATION_MS = 2500;
const INTRO_DURATION_SEC = INTRO_DURATION_MS / 1000;
const INTRO_BG_PATH = join(GUIDE_ASSETS, "_shared", "background-light.png");
const BG_MUSIC_PATH = join(GUIDE_ASSETS, "_shared", "background-music-alex_kizenkov-upbeat-happy-corporate-144497.mp3");
const BG_MUSIC_VOLUME = 0.10; // 10% volume

function runFfmpeg(args, cwd = DOCS_ROOT) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: "inherit", cwd });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
}

/** Create intro frame: background-light.png + title + "Harmony tutorial" subtitle. */
async function createIntroFrame(title, outputPath, width = 1920, height = 1080) {
  const bg = await sharp(INTRO_BG_PATH).resize(width, height).toBuffer();
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Scale logo-aligned left margin and font sizes proportionally from 1920 baseline
  const scale = width / 1920;
  const leftX = Math.round(55 * scale);
  const titleY = Math.round(280 * scale);
  const subtitleY = Math.round(340 * scale);
  const titleSize = Math.round(52 * scale);
  const subtitleSize = Math.round(28 * scale);
  const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <text x="${leftX}" y="${titleY}" text-anchor="start" fill="white" font-size="${titleSize}" font-weight="700" font-family="system-ui,-apple-system,sans-serif">${esc(title)}</text>
    <text x="${leftX}" y="${subtitleY}" text-anchor="start" fill="white" font-size="${subtitleSize}" font-weight="500" font-family="system-ui,-apple-system,sans-serif">Harmony tutorial</text>
  </svg>`;
  const textBuf = await sharp(Buffer.from(textSvg)).png().toBuffer();
  await sharp(bg).composite([{ input: textBuf, top: 0, left: 0 }]).png().toFile(outputPath);
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

/**
 * Applies a video fade-to-black + audio fade-out to the last FADE_DUR seconds of a video file.
 * The narration ends before the video, so fading only affects the tail (background music + frozen UI).
 */
async function applyFadeOut(filePath, holdSec = 3, fadeDurSec = 1.5) {
  const [totalMs, bgmDurationMs] = await Promise.all([getDurationMs(filePath), getDurationMs(BG_MUSIC_PATH)]);
  const totalSec = totalMs / 1000;
  const fadeStartSec = totalSec + holdSec - fadeDurSec;
  // Seek the BGM to exactly where it was when the main video ended so it continues seamlessly
  const bgmSeekSec = (totalSec % (bgmDurationMs / 1000)).toFixed(3);
  const tmp = filePath.replace(/\.mp4$/, "-prefade.mp4");
  await rename(filePath, tmp);
  await runFfmpeg([
    "-y", "-i", tmp,
    // Seek BGM to its continuation point, looped in case hold+fade exceeds remaining track length
    "-ss", bgmSeekSec, "-stream_loop", "-1", "-i", BG_MUSIC_PATH,
    "-filter_complex", [
      // Video: clone last frame for holdSec then fade to black
      `[0:v]tpad=stop_mode=clone:stop_duration=${holdSec},` +
        `fade=type=out:start_time=${fadeStartSec.toFixed(3)}:duration=${fadeDurSec}[outv]`,
      // Original audio padded with silence for holdSec
      `[0:a]apad=pad_dur=${holdSec}[orig]`,
      // BGM tail: starts from the seek point (= continuation), delayed to align with hold start
      `[1:a]volume=${BG_MUSIC_VOLUME},adelay=${Math.round(totalSec * 1000)}|${Math.round(totalSec * 1000)}[bgmtail]`,
      // Mix silence-padded original + bgm tail (bgm only audible during hold/fade period)
      `[orig][bgmtail]amix=inputs=2:duration=first:normalize=0[mixed]`,
      // Fade out
      `[mixed]afade=type=out:start_time=${fadeStartSec.toFixed(3)}:duration=${fadeDurSec}[outa]`,
    ].join(";"),
    "-map", "[outv]", "-map", "[outa]",
    "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    "-c:a", "aac", filePath,
  ]);
  await unlink(tmp).catch(() => {});
}

/** Finds when the first non-white/blank frame appears so we can trim the loading screen. */
// Detects the end of a blank/white initial loading screen (app splash).
// Uses negate+blackdetect: white frames become "black" in the negated stream.
// Returns ms offset from start of file where first non-white content appears.
async function findFirstContentMs(filePath, maxScanSecs = 8) {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", [
      "-t", String(maxScanSecs), "-i", filePath,
      "-vf", "negate,blackdetect=d=0.05:pix_th=0.85",
      "-an", "-f", "null", "-",
    ], { cwd: DOCS_ROOT, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", () => {
      const matches = [...stderr.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)/g)];
      let whiteEnd = 0;
      for (const m of matches) {
        const start = parseFloat(m[1]);
        const end = parseFloat(m[2]);
        if (start <= whiteEnd + 0.1) { whiteEnd = end; } else { break; }
      }
      resolve(Math.round(whiteEnd * 1000));
    });
  });
}

// After a page navigation (transition), the browser shows a skeleton/loading animation
// (frames are in motion) before the real content renders (page becomes static).
// This function scans forward from startMs and returns the absolute time (ms) in the
// original video file when the page first stabilizes — i.e. the first fully-loaded frame.
// Uses freezedetect: skeleton shimmer = motion; loaded content = freeze.
async function findFirstStableFrameMs(filePath, startMs, maxScanSecs = 4) {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", [
      "-ss", String(startMs / 1000),
      "-t", String(maxScanSecs),
      "-i", filePath,
      "-vf", "freezedetect=noise=0.005:duration=0.25",
      "-an", "-f", "null", "-",
    ], { cwd: DOCS_ROOT, stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", () => {
      // freeze_start timestamps are relative to the -ss seek point
      const match = stderr.match(/freeze_start: ([\d.]+)/);
      if (match) {
        resolve(startMs + Math.round(parseFloat(match[1]) * 1000));
      } else {
        resolve(startMs); // no stable period found — use insertion point as-is
      }
    });
  });
}

async function getVideoDimensions(filePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", filePath], {
      cwd: DOCS_ROOT,
      encoding: "utf-8",
    });
    let out = "";
    proc.stdout?.on("data", (d) => (out += d));
    proc.on("close", (code) => {
      if (code === 0) {
        const [w, h] = out.trim().split(",").map(Number);
        resolve({ width: w || 1280, height: h || 720 });
      } else reject(new Error(`ffprobe exited ${code}`));
    });
  });
}

function formatSrtTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const f = Math.floor((ms % 1000) / 10);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(f).padStart(2, "0")}`;
}

const MIN_CUE_MS = 600; // Avoid subtitles flashing too fast to read
const MIN_CUE_DURATION_MS = 100; // Minimum duration when trimming overlaps
const SUBTITLE_OFFSET_MS = 0; // Subtitle timing; use 0 for tight sync with word-level cues from Polly

const GAP_BETWEEN_CUES_MS = 150; // Minimum gap; must never overlap (ffmpeg overlay stacks)

/** Ensures no two cues overlap - trims earlier cue ends so later cues keep their synced start times. */
function enforceNoOverlap(cues) {
  if (cues.length <= 1) return cues;
  const sorted = cues
    .map((c) => ({
      ...c,
      start: Math.round(c.start),
      end: Math.round(c.end),
    }))
    .sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.end + GAP_BETWEEN_CUES_MS > curr.start) {
      prev.end = Math.max(prev.start + MIN_CUE_DURATION_MS, curr.start - GAP_BETWEEN_CUES_MS);
    }
  }
  return sorted;
}

function wordsToSrtCues(wordMarks, maxWordsPerCue = 5) {
  const cues = [];
  let chunk = [];
  let startMs = 0;

  for (let i = 0; i < wordMarks.length; i++) {
    const m = wordMarks[i];
    const next = wordMarks[i + 1];
    if (chunk.length === 0) startMs = m.time;
    chunk.push(m.value);
    const endMs = next ? next.time : m.time + 250;
    const duration = endMs - startMs;

    if (chunk.length >= maxWordsPerCue) {
      const effectiveEnd = Math.max(endMs, startMs + MIN_CUE_MS);
      cues.push({ start: startMs, end: effectiveEnd, text: chunk.join(" ") });
      chunk = [];
    }
  }
  if (chunk.length > 0) {
    const last = wordMarks[wordMarks.length - 1];
    const endMs = last.time + 250;
    const effectiveEnd = Math.max(endMs, startMs + MIN_CUE_MS);
    cues.push({ start: startMs, end: effectiveEnd, text: chunk.join(" ") });
  }
  return cues;
}

function buildSrt(allCues) {
  return allCues
    .map((c, i) => `${i + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text}\n`)
    .join("\n");
}

function buildCueToStepMap(cues, videoStepMs, segmentDurationsMs, segmentCount, stepsData) {
  const stepRanges = [];
  if (videoStepMs) {
    for (let i = 0; i < segmentCount; i++) {
      const stepInfo = stepsData?.steps?.[i];
      stepRanges.push({
        stepIndex: i,
        startMs: videoStepMs[i],
        endMs: i < segmentCount - 1 ? videoStepMs[i + 1] : videoStepMs[i] + (segmentDurationsMs[i] || 0),
        selector: stepInfo?.selector,
      });
    }
  } else {
    let cumul = 0;
    for (let i = 0; i < segmentCount; i++) {
      const dur = segmentDurationsMs[i] || 0;
      stepRanges.push({ stepIndex: i, startMs: cumul, endMs: cumul + dur });
      cumul += dur;
    }
  }
  const cuesWithStep = cues.map((c, idx) => {
    const step = stepRanges.find((r) => c.start >= r.startMs && c.start < r.endMs);
    return {
      index: idx,
      startMs: c.start,
      endMs: c.end,
      text: c.text,
      stepIndex: step?.stepIndex ?? -1,
      selector: step?.selector,
    };
  });
  return { cues: cuesWithStep, stepRanges };
}

function getBedrockClient() {
  return new BedrockRuntimeClient({
    region: AWS_REGION,
    credentials: fromSSO({ profile: AWS_PROFILE }),
  });
}

function getPollyClient() {
  return new PollyClient({
    region: AWS_REGION,
    credentials: fromSSO({ profile: AWS_PROFILE }),
  });
}

async function generateNarrationWithBedrock(mdxContent, targetLabels) {
  const client = getBedrockClient();
  const prompt = `You are writing short narration for a product tutorial video. Given this documentation:

${mdxContent}

The video has ${targetLabels.length} steps: ${targetLabels.join(", ")}

Write exactly ${targetLabels.length} short narration sentences, one per step. Each sentence should be 1-2 short phrases, spoken in 3-8 seconds. Match the documentation content. Output only the ${targetLabels.length} sentences, one per line, no numbering.`;

  const response = await client.send(
    new ConverseCommand({
      modelId: "anthropic.claude-3-5-haiku-20241022-v1:0",
      messages: [{ role: "user", content: [{ text: prompt }] }],
      maxTokens: 1024,
      inferenceConfig: { temperature: 0.3 },
    })
  );

  const text = response.output?.[0]?.message?.content?.[0]?.text ?? "";
  const lines = text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return lines.slice(0, targetLabels.length);
}

// Generative engine produces the most human-like audio but does NOT support speech marks.
// Neural engine supports speech marks (word-level timing for subtitles) but sounds more robotic.
// Strategy: use generative for audio, neural for speech marks timing.
const TTS_VOICE_ID = "Ruth"; // generative US English voice (Ruth, Danielle, Matthew, Stephen, ...)
const TTS_MARKS_VOICE_ID = "Joanna"; // neural voice used only for word-timing; audio is discarded

async function synthesizeWithPolly(text, voiceId = TTS_VOICE_ID, outputFormat = "mp3") {
  const client = getPollyClient();
  // Speech marks (json) require neural engine; audio uses generative for best quality
  const engine = outputFormat === "json" ? "neural" : "generative";
  const effectiveVoice = outputFormat === "json" ? TTS_MARKS_VOICE_ID : voiceId;
  const cmd = new SynthesizeSpeechCommand({
    Engine: engine,
    Text: text,
    OutputFormat: outputFormat,
    VoiceId: effectiveVoice,
    ...(outputFormat === "json" && { SpeechMarkTypes: ["word"] }),
  });

  const response = await client.send(cmd);
  return response.AudioStream;
}

async function getPollySpeechMarks(text, voiceId = TTS_MARKS_VOICE_ID) {
  const stream = await synthesizeWithPolly(text, voiceId, "json");
  if (!stream?.transformToString) {
    throw new Error("Polly speech marks response missing AudioStream");
  }
  const str = await stream.transformToString("utf-8");
  return str
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((m) => m.type === "word");
}

async function main() {
  const gDir = guideDir(selectedGuide);
  const vDir = guideVideoDir(selectedGuide);
  const sDir = guideSourceDir(selectedGuide);
  const mp4Path = join(sDir, "video-raw.mp4");
  const transcriptionPath = join(sDir, "narration.txt");
  const srtPath = join(sDir, "narration.srt");

  await mkdir(sDir, { recursive: true });

  try {
    await readFile(mp4Path);
  } catch {
    console.error(`\n❌ Video not found: ${mp4Path}`);
    console.error("  Run video:article first to create the video.\n");
    process.exit(1);
  }

  const fallback = FALLBACK_NARRATION[selectedGuide];
  if (!fallback) {
    console.error(`\n❌ No narration config for guide: ${selectedGuide}\n`);
    process.exit(1);
  }

  let segments = fallback;

  // Try Bedrock to generate from MDX
  const mdxPath = join(DOCS_ROOT, "guides", selectedGuide, `${selectedGuide}.mdx`);
  try {
    const mdxContent = await readFile(mdxPath, "utf-8");
    const targetLabels = fallback.map((_, i) => `Step ${i + 1}`);
    const bedrockSegments = await generateNarrationWithBedrock(mdxContent, targetLabels);
    if (bedrockSegments.length >= fallback.length) {
      segments = bedrockSegments;
      console.log("  Using Bedrock-generated narration.");
    }
  } catch (e) {
    console.warn("  Bedrock generation failed, using fallback:", e.message);
  }

  // Expand abbreviations so TTS pronounces them naturally (add more as needed)
  const ABBREV_MAP = {
    "\\bEOL\\b": "end of life",
    "\\bSLA\\b": "S L A",
    "\\bSLAs\\b": "S L As",
    "\\bAPI\\b": "A P I",
    "\\bAPIs\\b": "A P Is",
    "\\bUI\\b": "user interface",
    "\\bURL\\b": "U R L",
    "\\bSSO\\b": "S S O",
    "\\bMDM\\b": "M D M",
    "\\bIAM\\b": "I A M",
    "\\bCSV\\b": "C S V",
    "\\bJSON\\b": "Jason",
    "\\bIT\\b": "I T",
  };
  segments = segments.map((s) => {
    for (const [pattern, replacement] of Object.entries(ABBREV_MAP)) {
      s = s.replace(new RegExp(pattern, "g"), replacement);
    }
    return s;
  });

  console.log(`\nAdding narration to: ${selectedGuide}`);
  console.log(`  Segments: ${segments.length}`);

  await writeFile(transcriptionPath, segments.join("\n\n"), "utf-8");
  console.log(`  Transcription: ${transcriptionPath}`);

  // Detect source video dimensions so intro and subtitles match exactly
  const { width: vidW, height: vidH } = await getVideoDimensions(mp4Path);
  console.log(`  Video dimensions: ${vidW}x${vidH}`);

  // Create intro frame + TTS + video if we have a title and background
  let introVideoPath = null;
  let introAudioPath = null;
  let actualIntroDurationMs = INTRO_DURATION_MS; // will be updated to actual TTS duration
  const introTitle = GUIDE_TITLES[selectedGuide];
  const hasIntroBg = await access(INTRO_BG_PATH).then(() => true).catch(() => false);
  if (introTitle && hasIntroBg) {
    const introFramePath = join(vDir, "intro-frame.png");
    const introTtsPath = join(vDir, "intro-tts.mp3");
    const introText = `Harmony tutorial. ${introTitle}.`;
    await createIntroFrame(introTitle, introFramePath, vidW, vidH);
    const introStream = await synthesizeWithPolly(introText, TTS_VOICE_ID, "mp3");
    if (introStream?.transformToByteArray) {
      await writeFile(introTtsPath, Buffer.from(await introStream.transformToByteArray()));
      // Use actual TTS length so narration is never cut off
      actualIntroDurationMs = Math.max(INTRO_DURATION_MS, await getDurationMs(introTtsPath));
      const actualIntroDurationSec = actualIntroDurationMs / 1000;
      console.log(`  Creating intro (${actualIntroDurationSec.toFixed(1)}s)...`);
      const introFrameRel = `guides/${selectedGuide}/video/intro-frame.png`;
      const introVideoRel = `guides/${selectedGuide}/video/intro.mp4`;
      const introTtsRel = `guides/${selectedGuide}/video/intro-tts.mp3`;
      const introAudioRel = `guides/${selectedGuide}/video/intro.m4a`;
      // Intro video: loop frame for the full TTS duration
      await runFfmpeg(["-y", "-loop", "1", "-i", introFrameRel, "-t", String(actualIntroDurationSec), "-vf", `scale=${vidW}:${vidH}`, "-r", "25", "-pix_fmt", "yuv420p", introVideoRel]);
      // Intro audio: keep full TTS (no trim/pad)
      await runFfmpeg(["-y", "-i", introTtsRel, "-c:a", "aac", "-b:a", "128k", introAudioRel]);
      await unlink(introFramePath).catch(() => {});
      await unlink(introTtsPath).catch(() => {});
      introVideoPath = join(vDir, "intro.mp4");
      introAudioPath = join(vDir, "intro.m4a");
      console.log(`  Intro ready.`);
    }
  }

  const tempFiles = [];
  const segmentsData = []; // { wordMarks, path }

  for (let i = 0; i < segments.length; i++) {
    process.stdout.write(`  [${i + 1}/${segments.length}] TTS... `);
    const [audioStream, wordMarks] = await Promise.all([
      synthesizeWithPolly(segments[i], TTS_VOICE_ID, "mp3"),
      getPollySpeechMarks(segments[i]),
    ]);
    if (!audioStream?.transformToByteArray) {
      throw new Error("Polly returned no audio stream");
    }
    const p = join(vDir, `seg-${i}.mp3`);
    await writeFile(p, Buffer.from(await audioStream.transformToByteArray()));
    tempFiles.push(p);
    segmentsData.push({ wordMarks, path: p });
    console.log("✓");
  }

  const segmentDurationsMs = await Promise.all(tempFiles.map((f) => getDurationMs(f)));
  const stepsPath = join(sDir, "video-steps.json");
  let videoStepMs = null;
  let stepsData = null;
  let videoDurationMs = 0;

  try {
    const stepsJson = await readFile(stepsPath, "utf-8");
    stepsData = JSON.parse(stepsJson);
    videoDurationMs = await getDurationMs(mp4Path);
    const recordedMs = stepsData.recordedDurationMs || 1;
    const scale = videoDurationMs / recordedMs;
    videoStepMs = stepsData.steps.map((s) => Math.round(s.startMs * scale));
    console.log(`  Using step mapping (${videoStepMs.length} steps)`);
  } catch {
    // No step mapping - use back-to-back concat
  }

  // Compute how many ms to trim from the start of the recording.
  // Strategy: prefer metadata-based calculation (reliable regardless of UI background color)
  //   blank_period ≈ total_video_duration − recorded_loop_duration
  //   mpdecimate compresses static blank frames, so video is shorter than real elapsed time;
  //   the difference gives us the compressed blank period that needs trimming.
  // Fallback: scan-based detection (for guides without step metadata).
  let trimStartMs = 0;
  if (stepsData && videoDurationMs > 0) {
    const recordedMs = stepsData.recordedDurationMs || 0;
    const computedBlankMs = videoDurationMs - recordedMs;
    if (computedBlankMs > 200) {
      // Small safety buffer: trim 150ms less than computed to avoid cutting the first action frame
      trimStartMs = Math.max(0, Math.round(computedBlankMs - 150));
      console.log(`  Trimming ${trimStartMs}ms of blank frames from start (metadata-based)`);
    }
  } else {
    trimStartMs = await findFirstContentMs(mp4Path);
    if (trimStartMs > 0) console.log(`  Trimming ${trimStartMs}ms of blank frames from start (scan-based)`);
  }

  // Among steps that occurred before trimStartMs, keep only the first one — its content is the
  // first frame visible right after the intro. All subsequent pre-trim steps add narration time
  // without corresponding visible content, which cascades and pushes later steps out of sync.
  let seenFirstPreTrim = false;
  const skipStep = videoStepMs
    ? videoStepMs.map((s) => {
        if (s >= trimStartMs) return false; // post-trim: always keep
        if (!seenFirstPreTrim) { seenFirstPreTrim = true; return false; } // keep first pre-trim step
        return true; // skip remaining pre-trim steps
      })
    : Array(segmentsData.length).fill(false);
  const skippedCount = skipStep.filter(Boolean).length;
  if (skippedCount > 0) console.log(`  Skipping ${skippedCount} intermediate pre-trim step(s) to preserve sync`);

  // Compute output step positions and freeze-frame hold points.
  // Rather than pushing narration forward (which leaves the video running ahead of speech),
  // we insert freeze frames in the video at each transition where the narration overruns.
  // This holds the video on the current frame until narration finishes, then lets it continue.
  const activeIndices = videoStepMs
    ? Array.from({ length: videoStepMs.length }, (_, i) => i).filter((i) => !skipStep[i])
    : [];
  const activeRawMs = activeIndices.map((i) => Math.max(0, videoStepMs[i] - trimStartMs));
  const activeNarDur = activeIndices.map((i) => segmentDurationsMs[i] || 0);

  // outputPos[j] = when step j starts in the freeze-adjusted video timeline (= narration start time)
  // holdPoints = where to insert freeze frames in the raw trimmed video
  const MIN_GAP_MS = 200;
  const outputPos = activeRawMs.length > 0 ? [activeRawMs[0]] : [];
  const holdPoints = []; // { insertAtMs (in trimmed video), holdDurMs }
  for (let j = 1; j < activeRawMs.length; j++) {
    const prevOut = outputPos[j - 1];
    const narEnd = prevOut + activeNarDur[j - 1];
    const naturalNext = prevOut + (activeRawMs[j] - activeRawMs[j - 1]);
    const requiredNext = Math.max(naturalNext, narEnd + MIN_GAP_MS);
    const holdDur = Math.round(requiredNext - naturalNext);
    if (holdDur > 0) {
      // Freeze at the raw position where the next step starts, lasting holdDur ms
      holdPoints.push({ insertAtMs: activeRawMs[j], holdDurMs: holdDur });
    }
    outputPos.push(Math.round(requiredNext));
  }

  // Map output positions back to original step index slots
  let adjustedStepMs = null;
  if (videoStepMs) {
    adjustedStepMs = new Array(videoStepMs.length).fill(null);
    for (let j = 0; j < activeIndices.length; j++) {
      adjustedStepMs[activeIndices[j]] = outputPos[j];
    }
  }
  // For each hold point, find the first fully-rendered frame after the page transition.
  // Strategy: use freezedetect to find when the skeleton animation stops (page becomes stable).
  // The segment shown to the viewer is limited to MAX_LOADING_SHOW_MS of the loading state
  // (so we don't linger on skeletons), then the video cuts to the first stable/loaded frame
  // and holds there for the narration duration.
  const MAX_LOADING_SHOW_MS = 1000; // show at most 1s of loading animation before jumping to loaded
  for (const h of holdPoints) {
    const rawScanStart = trimStartMs + h.insertAtMs;
    const maxNextHoldMs = holdPoints.find((o) => o.insertAtMs > h.insertAtMs)?.insertAtMs ?? Infinity;
    const rawLoaded = await findFirstStableFrameMs(mp4Path, rawScanStart, 4);
    // Convert to trimmed-video timeline and clamp
    const loadedInTrimmed = rawLoaded - trimStartMs;
    h.firstLoadedMs = Math.min(
      Math.max(loadedInTrimmed, h.insertAtMs),
      maxNextHoldMs === Infinity ? loadedInTrimmed : maxNextHoldMs - 100,
    );
    // The video plays normally up to this point before cutting to the loaded frame
    h.showUntilMs = Math.min(h.insertAtMs + MAX_LOADING_SHOW_MS, h.firstLoadedMs);
    const skipped = h.firstLoadedMs - h.showUntilMs;
    const loading = h.showUntilMs - h.insertAtMs;
    if (h.firstLoadedMs > h.insertAtMs) {
      console.log(`    Hold @ ${h.insertAtMs}ms: show ${loading}ms loading → skip ${skipped}ms → freeze on loaded @ ${h.firstLoadedMs}ms`);
    }
  }

  // Second pass: now that firstLoadedMs is known, recompute outputPos and holdDurMs with
  // the CORRECT video spans. After each hold, the video resumes from firstLoadedMs (not from
  // insertAtMs), so the span to the NEXT action is shorter by the amount of loading we cut.
  // Without this correction, later holds end up too short and narration drifts ahead of video.
  {
    let rawResumeMs = activeRawMs[0]; // where video resumes after the last hold's freeze ends
    for (let j = 1; j < activeRawMs.length; j++) {
      const prevOut = outputPos[j - 1]; // already corrected in previous iterations
      const narEnd = prevOut + activeNarDur[j - 1];
      const videoSpan = Math.max(0, activeRawMs[j] - rawResumeMs);
      const naturalNext = prevOut + videoSpan;
      const requiredNext = Math.max(naturalNext, narEnd + MIN_GAP_MS);
      const newHoldDur = Math.round(requiredNext - naturalNext);
      outputPos[j] = Math.round(requiredNext);

      const hold = holdPoints.find((h) => h.insertAtMs === activeRawMs[j]);
      if (hold) {
        hold.holdDurMs = Math.max(0, newHoldDur);
        rawResumeMs = hold.firstLoadedMs ?? activeRawMs[j];
      } else {
        rawResumeMs = activeRawMs[j];
      }
    }
    // Remove any holds whose duration became 0
    holdPoints.splice(0, holdPoints.length, ...holdPoints.filter((h) => h.holdDurMs > 0));
    // Sync adjustedStepMs with corrected positions
    if (adjustedStepMs) {
      for (let j = 0; j < activeIndices.length; j++) {
        adjustedStepMs[activeIndices[j]] = outputPos[j];
      }
    }
  }

  if (holdPoints.length > 0) {
    console.log(`  Freeze holds: ${holdPoints.map((h) => `${h.holdDurMs}ms @ t=${h.insertAtMs}ms (loaded @ ${h.firstLoadedMs}ms)`).join(", ")}`);
  }
  console.log(`  Output step timings: [${outputPos.join(", ")}]ms`);

  const srtCues = [];
  for (let i = 0; i < segmentsData.length; i++) {
    if (skipStep[i]) continue; // not visible in trimmed video
    const { wordMarks } = segmentsData[i];
    const cues = wordsToSrtCues(wordMarks);
    const baseOffset = adjustedStepMs?.[i] ?? segmentDurationsMs.slice(0, i).reduce((a, d) => a + (d || 0), 0);
    for (const c of cues) {
      srtCues.push({
        start: baseOffset + c.start,
        end: baseOffset + c.end,
        text: c.text,
      });
    }
  }

  // Apply offset so subtitles appear with speech (compensate encoder delay)
  for (const c of srtCues) {
    c.start = Math.max(0, c.start + SUBTITLE_OFFSET_MS);
    c.end = Math.max(c.start + MIN_CUE_MS, c.end + SUBTITLE_OFFSET_MS);
  }

  // Enforce no overlapping cues so subtitles never stack on top of each other
  const deduped = enforceNoOverlap(srtCues);
  srtCues.length = 0;
  srtCues.push(...deduped);

  const concatAacPath = join(vDir, "narration-full.m4a");

  // Only include audio for steps that are visible in the trimmed video (skipStep[i] === false)
  const activeStepIndices = Array.from({ length: tempFiles.length }, (_, i) => i).filter((i) => !skipStep[i]);
  const activeTempFiles = activeStepIndices.map((i) => tempFiles[i]);
  const activeAdjustedMs = adjustedStepMs
    ? activeStepIndices.map((i) => adjustedStepMs[i])
    : null;

  const delayedStepMs = introVideoPath
    ? (activeAdjustedMs ?? activeStepIndices.map((_, j) => activeTempFiles.slice(0, j).reduce((a, _, k) => a + (segmentDurationsMs[activeStepIndices[k]] || 0), 0))).map((s) => s + actualIntroDurationMs)
    : activeAdjustedMs;

  if (delayedStepMs) {
    // Place each segment at its video step time (adelay + amix), offset by intro duration if present
    const n = activeTempFiles.length;
    const adelayFilters = activeTempFiles.map((_, i) => `[${i}:a]adelay=${delayedStepMs[i]}|${delayedStepMs[i]}[a${i}]`).join(";");
    const amixInputs = Array.from({ length: n }, (_, i) => `[a${i}]`).join("");
    const audioFilter = `${adelayFilters};${amixInputs}amix=inputs=${n}:duration=longest:normalize=0[aout]`;
    const ffmpegArgs = ["-y", ...activeTempFiles.flatMap((f) => ["-i", f]), "-filter_complex", audioFilter, "-map", "[aout]", "-c:a", "aac", "-b:a", "128k", concatAacPath];
    await runFfmpeg(ffmpegArgs);
  } else if (!introVideoPath) {
    // Back-to-back concat (no step mapping, no intro)
    const listPath = join(vDir, "concat-list.txt");
    await writeFile(listPath, activeTempFiles.map((f) => `file '${f}'`).join("\n"), "utf-8");
    await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:a", "aac", "-b:a", "128k", concatAacPath]);
    await unlink(listPath).catch(() => {});
  }

  for (const f of tempFiles) await unlink(f).catch(() => {});

  // If we have intro, mix intro audio + main narration
  let finalAudioPath = concatAacPath;
  if (introAudioPath) {
    finalAudioPath = join(vDir, "narration-with-intro.m4a");
    const introRel = `guides/${selectedGuide}/video/intro.m4a`;
    const mainRel = `guides/${selectedGuide}/video/narration-full.m4a`;
    await runFfmpeg(["-y", "-i", introRel, "-i", mainRel, "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=longest:normalize=0[aout]", "-map", "[aout]", "-c:a", "aac", "-b:a", "128k", `guides/${selectedGuide}/video/narration-with-intro.m4a`]);
  }

  const scaledCues = srtCues;

  await writeFile(srtPath, buildSrt(scaledCues), "utf-8");
  console.log(`  SRT: ${srtPath}`);

  const cueMapPath = join(sDir, "narration-cue-map.json");
  const cueToStep = buildCueToStepMap(scaledCues, videoStepMs, segmentDurationsMs, segments.length, stepsData);
  await writeFile(cueMapPath, JSON.stringify(cueToStep, null, 2), "utf-8");
  console.log(`  Cue map: ${cueMapPath}`);

  // Merge narration audio with video, burn subtitles via PNG overlays (no libass/drawtext required)
  const finalPath = join(vDir, "video.mp4");
  const mp4Rel = `guides/${selectedGuide}/video/source/video-raw.mp4`;
  const concatRel = introAudioPath ? `guides/${selectedGuide}/video/narration-with-intro.m4a` : `guides/${selectedGuide}/video/narration-full.m4a`;

  // Render subtitle cues to PNGs (drawtext filter requires libfreetype)
  const subPngs = [];
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const subFont = "system-ui,-apple-system,BlinkMacSystemFont,sans-serif";
  const subScale = vidW / 1920;
  const subH = Math.round(120 * subScale);
  const subFontSize = Math.round(38 * subScale);
  const subPadY = Math.round(20 * subScale);
  const subBoxH = Math.round(80 * subScale);
  const subBoxR = Math.round(40 * subScale);
  const subTextY = Math.round(75 * subScale);
  for (let i = 0; i < scaledCues.length; i++) {
    const c = scaledCues[i];
    const estWidth = Math.min(vidW - 40, Math.max(180, Math.round((c.text.length * 22 + 80) * subScale)));
    const rectX = Math.round((vidW - estWidth) / 2);
    // Black text, no stroke; light container sized to fit text
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vidW}" height="${subH}" viewBox="0 0 ${vidW} ${subH}">
      <rect x="${rectX}" y="${subPadY}" width="${estWidth}" height="${subBoxH}" rx="${subBoxR}" fill="rgba(255,255,255,0.85)"/>
      <text x="${vidW / 2}" y="${subTextY}" text-anchor="middle" fill="black" font-size="${subFontSize}" font-weight="600" font-family="${subFont}">${esc(c.text)}</text>
    </svg>`;
    const pngPath = join(vDir, `sub-${i}.png`);
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    subPngs.push({ path: pngPath, ...c });
  }

  const outMp4 = `guides/${selectedGuide}/video/video.mp4`;
  const mainWithSubsRel = `guides/${selectedGuide}/video/main-with-subs.mp4`;
  const audioFilter = null; // Keep narration at normal speed (no stretch)

  // Build input args for main video, trimming blank start frames
  const mainVideoInputArgs = trimStartMs > 0 ? ["-ss", String(trimStartMs / 1000), "-i", mp4Rel] : ["-i", mp4Rel];

  const outputVideoForMerge = introVideoPath ? mainWithSubsRel : outMp4;
  const videoOnly = !!introVideoPath;

  // Build freeze-frame filter segments (inline, applied before subtitle overlay).
  //
  // For each hold point:
  //   1. Play video up to insertAtMs (the action/click moment)
  //   2. Skip the loading animation (insertAtMs → firstLoadedMs) — cut it out
  //   3. Grab a short clip at firstLoadedMs and freeze-clone it for holdDurMs
  //      so the viewer sees the fully-loaded UI while narration finishes
  //   4. Resume video from firstLoadedMs forward
  //
  // For N hold points we need split=2N+1:
  //   [vhs 0..N]   = N+1 regular play segments
  //   [vhs N+1..2N] = N freeze-frame source clips (one per hold point)
  function buildFreezeFilterParts(src) {
    if (holdPoints.length === 0) return { preamble: [], firstLabel: src };
    const N = holdPoints.length;
    const M = 2 * N + 1; // N+1 regular segments + N freeze-frame sources
    const parts = [];
    const splitOuts = Array.from({ length: M }, (_, i) => `[vhs${i}]`).join("");
    parts.push(`[${src}]split=${M}${splitOuts}`);
    const concatIns = [];
    let prevResumeMs = 0; // where the previous segment left off (in trimmed video)
    for (let i = 0; i < N; i++) {
      const { holdDurMs, firstLoadedMs, showUntilMs, insertAtMs } = holdPoints[i];
      // segEnd: play video up to showUntilMs (action + at most 1s of loading)
      const segEndMs = showUntilMs ?? insertAtMs;
      const resumeMs = firstLoadedMs ?? insertAtMs; // where video resumes after the freeze
      const segEnd = (segEndMs / 1000).toFixed(3);
      const freezeStart = (resumeMs / 1000).toFixed(3);
      const freezeEnd = ((resumeMs + 80) / 1000).toFixed(3); // ~2 frames at 25fps
      const holdSec = (holdDurMs / 1000).toFixed(3);
      // Regular segment i: play from previous resume point to end-of-loading cap
      const trimOpts = prevResumeMs === 0 ? `end=${segEnd}` : `start=${(prevResumeMs / 1000).toFixed(3)}:end=${segEnd}`;
      parts.push(`[vhs${i}]trim=${trimOpts},setpts=PTS-STARTPTS[vht${i}]`);
      concatIns.push(`[vht${i}]`);
      // Freeze-frame source i: grab the first loaded frame and hold it for narration
      const freezeSrcIdx = N + 1 + i;
      parts.push(`[vhs${freezeSrcIdx}]trim=start=${freezeStart}:end=${freezeEnd},setpts=PTS-STARTPTS[vhfreeze${i}]`);
      parts.push(`[vhfreeze${i}]tpad=stop_mode=clone:stop_duration=${holdSec}[vhp${i}]`);
      concatIns.push(`[vhp${i}]`);
      prevResumeMs = resumeMs;
    }
    // Final regular segment: resume from the last loaded frame to end
    const lastStart = (prevResumeMs / 1000).toFixed(3);
    parts.push(`[vhs${N}]trim=start=${lastStart},setpts=PTS-STARTPTS[vht${N}]`);
    concatIns.push(`[vht${N}]`);
    parts.push(`${concatIns.join("")}concat=n=${2 * N + 1}:v=1:a=0[vheld]`);
    return { preamble: parts, firstLabel: "vheld" };
  }

  if (subPngs.length === 0) {
    const ffmpegArgs = ["-y", ...mainVideoInputArgs];
    if (!videoOnly) ffmpegArgs.push("-i", concatRel);
    if (audioFilter) {
      ffmpegArgs.push("-filter_complex", audioFilter, "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", outputVideoForMerge);
    } else if (videoOnly) {
      ffmpegArgs.push("-map", "0:v", "-an", "-c:v", "copy", outputVideoForMerge);
    } else {
      ffmpegArgs.push("-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", outputVideoForMerge);
    }
    await runFfmpeg(ffmpegArgs);
  } else {
    const subRel = (i) => `guides/${selectedGuide}/video/sub-${i}.png`;
    const { preamble: freezeParts, firstLabel: frozenLabel } = buildFreezeFilterParts("0:v");
    const overlays = [...freezeParts];
    // fps=25 converts VFR to CFR; keep original resolution (no scale needed)
    overlays.push(`[${frozenLabel}]fps=25[v0]`);
    let prevLabel = "v0";
    const subInputOffset = videoOnly ? 1 : 2; // When videoOnly we skip concatRel, so subs start at input 1
    const subYPos = vidH - subH - Math.round(40 * subScale); // bottom padding scaled
    for (let i = 0; i < subPngs.length; i++) {
      const c = subPngs[i];
      const nextLabel = i === subPngs.length - 1 ? "vout" : `vl${i + 1}`;
      const enable = `between(t,${c.start / 1000},${c.end / 1000})`;
      overlays.push(`[${prevLabel}][${i + subInputOffset}:v]overlay=x=(main_w-overlay_w)/2:y=${subYPos}:enable='${enable}'[${nextLabel}]`);
      prevLabel = nextLabel;
    }
    const videoFilter = overlays.join(";");
    const filterComplex = audioFilter ? `${videoFilter};${audioFilter}` : videoFilter;
    const ffmpegArgs = ["-y", ...mainVideoInputArgs];
    if (!videoOnly) ffmpegArgs.push("-i", concatRel);
    for (let i = 0; i < subPngs.length; i++) ffmpegArgs.push("-i", subRel(i));
    ffmpegArgs.push("-filter_complex", filterComplex, "-map", "[vout]");
    if (videoOnly) {
      ffmpegArgs.push("-an", "-c:v", "libx264", "-crf", "18", outputVideoForMerge);
    } else {
      ffmpegArgs.push("-map", audioFilter ? "[aout]" : "1:a", "-c:v", "libx264", "-crf", "18", "-c:a", "aac", outputVideoForMerge);
    }
    await runFfmpeg(ffmpegArgs);
    for (const { path: p } of subPngs) await unlink(p).catch(() => {});
  }

  if (introVideoPath) {
    // Use xfade for a smooth fade transition from intro into main content.
    // normalize=0 on amix keeps the intro TTS at full volume instead of halving it at mix time.
    // No -shortest: let the video run to its full length (audio may be slightly shorter but that's fine).
    const introRel = `guides/${selectedGuide}/video/intro.mp4`;
    const mainRel = `guides/${selectedGuide}/video/main-with-subs.mp4`;
    const xfadeDuration = 0.5;
    const xfadeOffset = actualIntroDurationMs / 1000 - xfadeDuration;
    await runFfmpeg([
      "-y", "-i", introRel, "-i", mainRel, "-i", concatRel,
      "-stream_loop", "-1", "-i", BG_MUSIC_PATH,
      "-filter_complex",
      [
        `[0:v][1:v]xfade=transition=fade:duration=${xfadeDuration}:offset=${xfadeOffset.toFixed(3)}[outv]`,
        `[2:a]apad[narr]`,
        `[3:a]volume=${BG_MUSIC_VOLUME}[bgm]`,
        `[narr][bgm]amix=inputs=2:duration=first:normalize=0[outa]`,
      ].join(";"),
      "-map", "[outv]", "-map", "[outa]",
      "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      "-c:a", "aac", "-shortest", outMp4,
    ]);
    await unlink(join(vDir, "main-with-subs.mp4")).catch(() => {});
    await unlink(join(vDir, "intro.mp4")).catch(() => {});
    await unlink(join(vDir, "intro.m4a")).catch(() => {});
  }

  await unlink(concatAacPath).catch(() => {});
  if (introAudioPath) await unlink(finalAudioPath).catch(() => {});

  console.log("  Applying fade-out...");
  await applyFadeOut(finalPath);

  console.log(`\n✓ Output: ${finalPath}`);
  console.log(`  Transcription: ${transcriptionPath}`);
  console.log(`  Subtitles (SRT): ${srtPath}\n`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
