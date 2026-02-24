# Article Video Pipeline — Exploration

> Short (< 60 second) MP4 videos with English narration and subtitles for doc articles (e.g., managing-knowledge-base). This doc explores feasibility and implementation options.

## Requirements

| Requirement | Target |
|-------------|--------|
| Duration | < 60 seconds |
| Format | MP4 (Mintlify: `/videos/`, max 100MB) |
| Audio | English narration |
| Subtitles | Burned-in or soft subs |
| Source | **Playwright screen recording** + MJS prepare steps |

## Playwright Screen Recording

**Yes, it's possible.** Playwright supports `recordVideo` when creating a browser context. Videos are saved when the context closes.

### Setup

```javascript
const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,  // recording typically runs headed
  viewport: { width: 1280, height: 720 },
  recordVideo: {
    dir: "./recordings",
    size: { width: 1280, height: 720 },
  },
});

// ... perform actions (same prepare steps as screenshots) ...

await context.close();  // Video written to disk
```

### Per-Article Video

For one video per guide: create a context with `recordVideo`, run only that guide's targets (reusing MJS prepare logic), then close the context. Each close produces one WebM file.

### Video API

- `page.video()` — Video object for the page
- `video.saveAs(path)` — Save to custom path (e.g. `videos/managing-knowledge-base-raw.webm`)

### Output

Playwright records **WebM**. Convert to MP4 with FFmpeg:

```bash
ffmpeg -i recording.webm -c:v libx264 -c:a aac videos/managing-knowledge-base.mp4
```

---

## Mintlify Video Support

- **Self-hosted**: `<video controls src="/videos/demo.mp4" className="w-full aspect-video rounded-xl" />`
- **Location**: Store in `mintlify-docs/videos/` or `mintlify-docs/public/videos/`
- **Size**: Max 100MB per file
- **Formats**: MP4, WebM

---

## Architecture Options

### Option A: Screenshot Slideshow + TTS (Recommended for MVP)

**Idea**: Use existing screenshots as “slides,” add Ken Burns–style motion, overlay TTS narration and subtitles. No live browser recording.

**Pros**:
- Reuses existing screenshots
- No timing/sync issues with UI
- Predictable output
- Simpler to automate

**Flow**:
1. **Script generation** — Extract key points from MDX (~150 words)
2. **TTS** — OpenAI TTS or ElevenLabs → MP3
3. **Subtitle timings** — From TTS API or Whisper transcription
4. **Video assembly** — FFmpeg: images → slideshow with transitions, add audio, burn SRT

**Tools**: `ffmpeg`, Node.js for orchestration, OpenAI TTS (or similar)

---

### Option B: Playwright Screen Recording (Preferred)

**Idea**: Use Playwright with `recordVideo` to capture a real walkthrough. Run the same prepare steps as screenshots. Add TTS + subtitles in post.

**Pros**:
- Real UI interaction, not static slides
- Reuses existing MJS prepare logic
- Single source of truth for "what to show"

**Flow**:
1. `capture-article-video.mjs` — One context per guide with `recordVideo`, run targets
2. Convert WebM → MP4 with FFmpeg
3. Generate TTS from MDX script, add narration + subs (optional)

---

### Option C: Hybrid — Recorded Clips + Narration

**Idea**: Record 3–5 short clips (e.g., “Add source,” “View table,” “Permissions”), stitch with transitions, add narration.

---

## Recommended: Option B (Screen Recording) — Implementation Sketch

### 1. Capture Script (`capture-article-video.mjs`)

```javascript
// For guide "managing-knowledge-base":
// 1. Launch context with recordVideo
// 2. Navigate to /settings/knowledge-base (reuse login from profile)
// 3. Run each target's prepare in sequence with 2-3s pauses
// 4. context.close() → video saved
// 5. ffmpeg: webm → mp4
```

### 2. Script Generation (for TTS/narration)

```javascript
// scripts/generate-video-script.mjs
// Parse MDX, extract headings + key bullets → ~150 words
// For managing-knowledge-base:
```

**Sample script (from managing-knowledge-base.mdx)**:
> "The Knowledge Base stores articles that AI agents use to answer questions. Add sources by uploading PDFs or connecting Confluence, Notion, or other integrations. Each article shows sync status: Completed, Pending, or Failed. Use the status filter to monitor progress. For permissions, view authorized groups and users from the source system. Bulk delete articles by selecting rows and clicking Delete."

~70 words ≈ 28 seconds. Expand for ~60s.

### 3. TTS (OpenAI)

```javascript
import OpenAI from "openai";
const speech = await openai.audio.speech.create({
  model: "gpt-4o-mini-tts",
  voice: "nova",
  input: scriptText,
  response_format: "mp3",
  speed: 0.95,
});
// Save to .mp3
```

**Alternatives**: ElevenLabs (higher quality), Google Cloud TTS, Amazon Polly.

### 4. Subtitle Timings

- **OpenAI Realtime TTS** — Can return word-level timestamps (if available).
- **Whisper** — Transcribe the MP3 and get segment timings.
- **Manual SRT** — Split script into sentences, estimate durations (~2.5 words/sec).

**SRT example**:
```
1
00:00:00,000 --> 00:00:05,000
The Knowledge Base stores articles that AI agents use.

2
00:00:05,000 --> 00:00:12,000
Add sources by uploading PDFs or connecting Confluence.
```

### 5. Video Assembly (FFmpeg)

**Screen recording:** `ffmpeg -i recording.webm -c:v libx264 -c:a aac output.mp4`

**Screenshot slideshow:**
```bash
# Create image sequence (each image 4–6 seconds)
ffmpeg -y -loop 1 -t 5 -i kb-add-source.png -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" -pix_fmt yuv420p add.mp4
# ... repeat for each image

# Concatenate clips
ffmpeg -f concat -i list.txt -c copy slides.mp4

# Add audio
ffmpeg -i slides.mp4 -i narration.mp3 -c:v copy -c:a aac -shortest -map 0:v:0 -map 1:a:0 with_audio.mp4

# Burn subtitles
ffmpeg -i with_audio.mp4 -vf "subtitles=subtitles.srt:force_style='FontSize=24'" -c:a copy final.mp4
```

### 6. Node.js Orchestration

```javascript
// scripts/generate-article-video.mjs
// 1. Load MDX, extract script
// 2. Call OpenAI TTS → narration.mp3
// 3. Generate SRT from script (or Whisper)
// 4. Spawn ffmpeg for each step
// 5. Output: videos/managing-knowledge-base.mp4
```

---

## File Structure

```
mintlify-docs/
├── videos/
│   └── managing-knowledge-base.mp4   # From capture-article-video.mjs
├── scripts/
│   ├── capture-article-video.mjs    # ✅ Screen recording (Playwright)
│   ├── extract-script-from-mdx.mjs   # MDX → narration script
│   ├── generate-tts.mjs              # Script → MP3
│   └── VIDEO_PIPELINE_EXPLORATION.md # This file
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `openai` | TTS API |
| `ffmpeg-static` or system `ffmpeg` | Video assembly |
| `fluent-ffmpeg` (optional) | FFmpeg Node.js wrapper |

---

## Cost Estimate (per video)

| Item | Cost |
|------|------|
| OpenAI TTS (~60 sec audio) | ~$0.02–0.05 |
| Whisper (if used for timing) | ~$0.01 |
| **Total per video** | **~$0.05** |

---

## Next Steps

1. **Proof of concept** — Manually create one 60s video for managing-knowledge-base:
   - Write a 150-word script
   - Generate TTS with OpenAI
   - Create SRT (manual or Whisper)
   - Assemble with FFmpeg using existing screenshots
2. **Evaluate output** — Quality, pacing, subtitle readability
3. **Automate** — Build `generate-article-video.mjs` that:
   - Takes a guide name (e.g. `managing-knowledge-base`)
   - Reads MDX + list of screenshot paths from MJS
   - Runs the pipeline end-to-end
4. **Integrate** — Add video embed to MDX (e.g. after the intro note)

---

## MDX Embed Example

```jsx
<video
  controls
  className="w-full aspect-video rounded-xl"
  src="/videos/managing-knowledge-base.mp4"
>
  <track kind="subtitles" src="/videos/managing-knowledge-base.vtt" srcLang="en" label="English" default />
</video>
```
