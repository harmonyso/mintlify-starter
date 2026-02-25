#!/usr/bin/env node
/**
 * Playwright script to capture dashboard widget screenshots for docs.
 * Run with: pnpm run screenshots:dashboard (from mintlify-docs/)
 *
 * Uses a persistent Chrome profile so you only need to log in once:
 *   pnpm run screenshots:dashboard:login   # First time: opens browser, log in, then close
 *   pnpm run screenshots:dashboard         # Subsequent runs: uses saved session
 *   pnpm run screenshots:dashboard -- --force   # Overwrite existing screenshots
 *   pnpm run screenshots:dashboard -- --guides=analyzing-service-desk-metrics   # Only capture for selected guide(s)
 *
 * Guide names (for --guides): analyzing-asset-and-automation-metrics, analyzing-service-desk-metrics,
 * configuring-ai-agents, configuring-asset-management, configuring-automation-and-sla,
 * configuring-integration-sync-and-credentials, connecting-and-managing-integrations,
 * creating-and-managing-custom-dashboards, getting-started-with-harmony-dashboard,
 * managing-asset-organization-and-importing, managing-asset-views-and-details, managing-knowledge-base
 *
 * Prerequisites:
 * - Frontend running at BASE_URL (default localhost:5173 for all 8 widgets; demo.harmony.io yields 4 until deployed)
 * - Widgets on default dashboard: asset-compliance, software-breakdown, etc.
 */

import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "path";

import { exists, hideImpersonationBanner, injectHideImpersonationBanner, guideScreenshotsDir, PROFILE_DIR, BASE_URL, DASHBOARD_PATH, SYSTEM_DASHBOARD_PATH } from "../screenshot-shared.mjs";
import { getAllTargets, getAllGuideNames } from "./guides-index.mjs";

const forceOverwrite = process.argv.includes("--force");
const useHeadless = process.argv.includes("--headless");
const needsLogin = process.argv.includes("--login");
const guidesArg = process.argv.find((a) => a.startsWith("--guides="));
const selectedGuides = guidesArg ? guidesArg.replace("--guides=", "").split(",").map((s) => s.trim()) : null;

async function captureTarget(target, page, captured, skipped) {
  const { filename, dir } = target;
  const key = `${dir}/${filename}`;
  if (captured.has(key)) return;

  const outDir = guideScreenshotsDir(dir);
  await mkdir(outDir, { recursive: true });
  const filepath = join(outDir, filename);
  if (!forceOverwrite && (await exists(filepath))) {
    console.log(`○ ${dir}/${filename} (exists, skipped)`);
    captured.add(key);
    return;
  }

  await hideImpersonationBanner(page);
  if (target.type === "region") {
    await page.screenshot({ path: filepath, clip: target.clip });
    console.log(`✓ ${dir}/${filename}`);
    captured.add(key);
  } else if (target.type === "fullpage") {
    if (typeof target.prepare === "function") {
      await target.prepare(page);
      await hideImpersonationBanner(page);
    }
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`✓ ${dir}/${filename} (full page)`);
    captured.add(key);
  } else if (target.type === "element") {
    if (typeof target.prepare === "function") {
      await target.prepare(page);
      await hideImpersonationBanner(page);
    }
    const el = page.locator(target.selector).first();
    const isVisible = await el.isVisible().catch(() => false);
    if (isVisible) {
      if (target.clipToContent) {
        const box = await el.boundingBox();
        const contentEndSel = target.contentEndSelector ?? 'div.sticky.border-t, div:has-text("Showing")';
        const contentEnd = target.contentEndSelector ? el.locator(contentEndSel).last() : el.locator(contentEndSel).first();
        const endBox = await contentEnd.boundingBox().catch(() => null);
        if (box) {
          const clipHeight = endBox
            ? Math.ceil(endBox.y + endBox.height - box.y) + 16
            : Math.min(box.height, 800);
          await page.screenshot({
            path: filepath,
            clip: {
              x: Math.round(box.x),
              y: Math.round(box.y),
              width: Math.round(box.width),
              height: Math.min(Math.ceil(clipHeight), box.height + 120),
            },
          });
        } else {
          await el.screenshot({ path: filepath });
        }
      } else {
        await el.screenshot({ path: filepath });
      }
      console.log(`✓ ${dir}/${filename}`);
      captured.add(key);
    } else {
      console.log(`✗ ${dir}/${filename} (selector not visible: ${target.selector})`);
    }
  } else {
    const { title } = target;
    const widget = page.locator(".dashboard-widget").filter({
      has: page.getByText(title, { exact: true }),
    });
    const isVisible = await widget.first().isVisible().catch(() => false);
    if (isVisible) {
      await widget.first().screenshot({ path: filepath });
      console.log(`✓ ${dir}/${filename} (${title})`);
      captured.add(key);
    } else {
      skipped.push({ ...target, title });
    }
  }
}

async function main() {
  console.log(`Screenshots will be saved to: guides/{guide}/screenshots/\n`);

  if (needsLogin) {
    console.log("🔐 Login mode: Browser will open. Log in to Harmony, then close the browser.\n");
  }

  const headless = !needsLogin && useHeadless;
  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless,
      viewport: { width: 1400, height: 900 },
      ignoreHTTPSErrors: true,
      args: headless ? ["--disable-blink-features=AutomationControlled"] : [],
    });
  } catch (e) {
    if (e.message?.includes("Executable doesn't exist")) {
      console.error("\n❌ Playwright browsers not installed.");
      console.error("   Run from mintlify-docs/:  pnpm exec playwright install chromium");
      console.error("   Then run this script again (ideally from your system terminal, not Cursor sandbox).\n");
      process.exit(1);
    }
    throw e;
  }

  await context.addInitScript(injectHideImpersonationBanner);

  const page = context.pages()[0] || (await context.newPage());

  try {
    console.log(`Navigating to ${BASE_URL}${DASHBOARD_PATH}...`);
    await page.goto(`${BASE_URL}${DASHBOARD_PATH}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 5000));

    const isLoginPage =
      (await page.locator("form[action*='login'], [data-testid=login], input[type='password']").count()) > 0;
    if (isLoginPage) {
      if (needsLogin) {
        console.log("👉 Log in via the open browser. You have 15 minutes. When you reach the dashboard, the script will finish.");
        await page.waitForURL((url) => url.pathname.includes("dashboard"), { timeout: 15 * 60 * 1000 });
        await hideImpersonationBanner(page);
        console.log("✓ Logged in. Profile saved. Run without --login next time.");
      } else {
        console.error("\n❌ Detected login page. Run with --login to save your session:");
        console.error("   pnpm run screenshots:dashboard:login\n");
        process.exit(1);
      }
    } else if (needsLogin) {
      console.log("✓ Already logged in. Profile saved. You can close the browser.");
      await hideImpersonationBanner(page);
      await new Promise((r) => setTimeout(r, 60000));
    }

    if (needsLogin) {
      return;
    }

    const captured = new Set();
    const skipped = [];
    const targets = await getAllTargets(selectedGuides);

    const byPath = {};
    for (const t of targets) {
      const p = t.path ?? SYSTEM_DASHBOARD_PATH;
      if (!byPath[p]) byPath[p] = [];
      byPath[p].push(t);
    }

    // Paths with special pre-navigation logic run first; all others follow generically.
    const SPECIAL_PATHS = new Set([SYSTEM_DASHBOARD_PATH, "agents", "assets", "settings/asset-management", "settings/desks", "settings/integrations", "settings/knowledge-base"]);
    const pathOrder = [
      ...Object.keys(byPath).filter((p) => SPECIAL_PATHS.has(p)),
      ...Object.keys(byPath).filter((p) => !SPECIAL_PATHS.has(p)),
    ];

    for (const path of pathOrder) {
      const pathTargets = byPath[path];
      if (!pathTargets?.length) continue;

      if (path === "settings/integrations") {
        console.log(`\nNavigating to /settings/integrations...`);
        await page.goto(`${BASE_URL}/settings/integrations`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 4000));
        await hideImpersonationBanner(page);
      } else if (path === "settings/desks") {
        console.log(`\nNavigating to /settings/desks...`);
        await page.goto(`${BASE_URL}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector("table tbody tr, button:has-text('Create desk')", { timeout: 15000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 2000));
        const firstDesk = page.locator("table tbody tr.cursor-pointer").first();
        if (await firstDesk.isVisible().catch(() => false)) {
          await firstDesk.click();
          await page.waitForURL((u) => u.pathname.match(/\/settings\/desks\/[^/]+/), { timeout: 10000 });
        }
        await new Promise((r) => setTimeout(r, 2000));
        await hideImpersonationBanner(page);
      } else if (path === "assets") {
        console.log(`\nNavigating to /assets...`);
        await page.goto(`${BASE_URL}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 4000));
        await hideImpersonationBanner(page);
      } else if (path === "settings/asset-management") {
        console.log(`\nNavigating to /settings/asset-management...`);
        await page.goto(`${BASE_URL}/settings/asset-management`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 4000));
        await hideImpersonationBanner(page);
      } else if (path === "settings/knowledge-base") {
        console.log(`\nNavigating to /settings/knowledge-base...`);
        await page.goto(`${BASE_URL}/settings/knowledge-base`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 4000));
        await hideImpersonationBanner(page);
      } else if (path === "agents") {
        console.log(`\nNavigating to /agents...`);
        await page.goto(`${BASE_URL}/agents`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 3000));
        await hideImpersonationBanner(page);
        let firstAgent = page.locator('a[href*="/agents/"]').first();
        let hasAgent = await firstAgent.isVisible().catch(() => false);
        if (!hasAgent) {
          firstAgent = page.locator('[class*="grid"] .cursor-pointer').first();
          hasAgent = await firstAgent.isVisible().catch(() => false);
        }
        if (!hasAgent) {
          firstAgent = page.getByText(/Application Access Request|Asset Ownership|Device Recovery|New Hire Onboarding/).first();
          hasAgent = await firstAgent.isVisible().catch(() => false);
        }
        if (!hasAgent) {
          console.log("⚠ Skipping agent screenshots: no agents found");
          continue;
        }
        await firstAgent.click();
        await page.waitForURL((url) => /\/agents\/[^/]+\/[^/]+/.test(url.pathname), { timeout: 15000 });
        await new Promise((r) => setTimeout(r, 5000));
        await hideImpersonationBanner(page);
      } else {
        console.log(`\nNavigating to ${path}...`);
        await page.goto(`${BASE_URL}/${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 5000));
        if (path === SYSTEM_DASHBOARD_PATH) {
          await page.waitForSelector(".dashboard-widget", { timeout: 10000 });
          await new Promise((r) => setTimeout(r, 5000));
          await hideImpersonationBanner(page);
        }
      }

      for (const target of pathTargets) {
        await captureTarget(target, page, captured, skipped);
      }
    }

    if (skipped.length > 0) {
      console.log("\n⚠ Widgets not on dashboard (add from Widget Library):");
      for (const { title, filename, dir } of skipped) {
        console.log(`  - ${title} → ${dir}/${filename}`);
      }
    }

    console.log(`\nDone. Captured ${captured.size} screenshot(s)`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    try {
      await hideImpersonationBanner(page);
    } catch {
      /* ignore if page/context already torn down */
    }
    await context?.close();
  }
}

main();
