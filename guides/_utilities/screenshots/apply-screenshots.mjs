#!/usr/bin/env node
/**
 * apply-screenshots.mjs
 *
 * Converts {/* IMAGE: alt → /path.png | ... *\/} MDX comments into
 * real markdown image tags once the screenshot file exists on disk.
 *
 * Run with:
 *   node guides/_utilities/screenshots/apply-screenshots.mjs
 *   node guides/_utilities/screenshots/apply-screenshots.mjs --guides=managing-people
 *   node guides/_utilities/screenshots/apply-screenshots.mjs --dry-run
 */

import { readFile, writeFile, access, readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, "../../..");
const GUIDES_ROOT = join(DOCS_ROOT, "guides");

const SKIP_DIRS = new Set(["_utilities", "_shared", "agents"]);

// ── CLI args ──────────────────────────────────────────────────────────────────
const guidesArg = process.argv.find((a) => a.startsWith("--guides="));
const selectedGuides = guidesArg
  ? guidesArg.replace("--guides=", "").split(",").map((s) => s.trim())
  : null;
const dryRun = process.argv.includes("--dry-run");

// ── Regex ─────────────────────────────────────────────────────────────────────
// Matches: {/* IMAGE: <alt> → <path> | ... */}
// Also tolerates the variant without any | section
const IMAGE_COMMENT_RE =
  /\{\/\*\s*IMAGE:\s*(.+?)\s*→\s*(\/[^\s|*]+?)(?:\s*\|[^*]*)?\*\/\}/g;

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function discoverGuides() {
  const entries = await readdir(GUIDES_ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

// ── Per-guide processing ──────────────────────────────────────────────────────
async function applyGuide(guideName) {
  const guideDir = join(GUIDES_ROOT, guideName);
  const mdxFiles = (await readdir(guideDir)).filter((f) => f.endsWith(".mdx"));
  if (mdxFiles.length === 0) return;

  const mdxPath = join(guideDir, mdxFiles[0]);
  const original = await readFile(mdxPath, "utf8");

  let applied = 0;
  let skipped = 0;

  // We need to iterate matches first to check existence, then do the replace
  const replacements = new Map(); // full match string → replacement string

  for (const match of original.matchAll(IMAGE_COMMENT_RE)) {
    const [fullMatch, altText, publicPath] = match;

    // publicPath starts with /guides/... — map to filesystem
    const fsPath = join(DOCS_ROOT, publicPath);

    if (await fileExists(fsPath)) {
      replacements.set(fullMatch, `![${altText}](${publicPath})`);
      applied++;
    } else {
      console.log(
        `  ⚠  ${guideName}: screenshot not found, skipping — ${publicPath}`
      );
      skipped++;
    }
  }

  if (applied === 0) {
    if (skipped === 0) {
      // No IMAGE comments at all — nothing to do
    }
    return;
  }

  let updated = original;
  for (const [from, to] of replacements) {
    updated = updated.replaceAll(from, to);
  }

  if (dryRun) {
    console.log(`  [dry-run] ${guideName}: would apply ${applied} image(s)`);
  } else {
    await writeFile(mdxPath, updated, "utf8");
    console.log(`  ✓ ${guideName}: applied ${applied} image(s)${skipped ? `, ${skipped} skipped (no file)` : ""}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const allGuides = await discoverGuides();
const guides = selectedGuides
  ? allGuides.filter((g) => selectedGuides.includes(g))
  : allGuides;

console.log(`\nApplying screenshots to MDX${dryRun ? " [dry-run]" : ""}...\n`);

for (const guide of guides) {
  await applyGuide(guide);
}

console.log("\nDone.\n");
