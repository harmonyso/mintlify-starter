#!/usr/bin/env node
/**
 * Records guide video, then adds narration and subtitles in one command.
 *
 * pnpm run video:full -- --guides=managing-knowledge-base
 * pnpm run video:full -- --guides=managing-asset-views-and-details --keep-static
 */
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = __dirname;
const args = process.argv.slice(2);

function run(script, env = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn("node", [join(scriptsDir, script), ...args], {
      stdio: "inherit",
      env: { ...process.env, ...env },
      cwd: join(__dirname, "../../.."),
    });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`))));
  });
}

function runAwsSsoLogin(profile) {
  return new Promise((resolve, reject) => {
    const proc = spawn("aws", ["sso", "login", "--profile", profile], {
      stdio: "inherit",
      env: process.env,
      cwd: join(__dirname, "../../.."),
    });
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`aws sso login exited ${code}`))));
  });
}

async function main() {
  const profile = process.env.AWS_PROFILE || "harmony-mgmt";

  console.log("\n=== Step 1: Recording video ===\n");
  await run("capture-article-video.mjs");

  console.log("\n=== Refreshing AWS SSO session ===\n");
  await runAwsSsoLogin(profile);

  console.log("\n=== Step 2: Adding narration and subtitles ===\n");
  await run("video-narration.mjs", {
    AWS_PROFILE: profile,
    AWS_REGION: process.env.AWS_REGION || "us-east-1",
  });

  console.log("\n✓ Done.\n");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
