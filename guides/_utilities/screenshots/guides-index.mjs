/**
 * Dynamically discovers all guide.mjs files and aggregates their targets.
 * No manual registration needed — drop a guide.mjs into any guide folder and
 * it is automatically picked up on the next run.
 */

import { readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GUIDES_ROOT = join(__dirname, "../../");
const SKIP_DIRS = new Set(["_utilities", "_shared", "agents"]);

async function discoverGuideNames() {
  const entries = await readdir(GUIDES_ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

let _cache = null;

async function load() {
  if (_cache) return _cache;

  const names = await discoverGuideNames();
  const allTargets = [];
  const validNames = [];

  for (const name of names) {
    try {
      const mod = await import(`${GUIDES_ROOT}${name}/guide.mjs`);
      if (Array.isArray(mod.targets) && mod.targets.length > 0) {
        allTargets.push(...mod.targets);
        validNames.push(name);
      }
    } catch {
      // No guide.mjs or no targets — skip silently
    }
  }

  _cache = { allTargets, validNames };
  return _cache;
}

export async function getAllTargets(selectedGuides = null) {
  const { allTargets, validNames } = await load();
  if (selectedGuides?.length) {
    const invalid = selectedGuides.filter((g) => !validNames.includes(g));
    if (invalid.length) {
      console.log(`\n⚠ No targets for guides: ${invalid.join(", ")}`);
      console.log(`  Valid: ${validNames.join(", ")}\n`);
    }
    return allTargets.filter((t) => selectedGuides.includes(t.dir));
  }
  return allTargets;
}

export async function getAllGuideNames() {
  const { validNames } = await load();
  return validNames;
}
