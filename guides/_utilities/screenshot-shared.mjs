/**
 * Shared utilities and constants for dashboard screenshot capture.
 */

import { access } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, "../..");
const GUIDE_ASSETS = join(DOCS_ROOT, "guides");

/** Returns the screenshots directory for a given guide: guides/{guide}/screenshots/ */
export const guideScreenshotsDir = (guide) => join(GUIDE_ASSETS, guide, "screenshots");
/** @deprecated use guideScreenshotsDir(guide) instead */
export const IMAGES_GUIDES = join(DOCS_ROOT, "images/guides");
export const PROFILE_DIR = join(DOCS_ROOT, ".playwright-dashboard-profile");

export const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
export const DASHBOARD_PATH = "/dashboard";
export const SYSTEM_DASHBOARD_PATH = "/dashboard/system-dashboard";

export const exists = async (p) => access(p).then(() => true).catch(() => false);

/** Injects CSS and observes DOM to hide the impersonation banner. Use with context.addInitScript(). */
export function injectHideImpersonationBanner() {
  const hide = (el) => {
    if (el && !el.dataset.__playwrightHidden) {
      el.style.setProperty("display", "none", "important");
      el.dataset.__playwrightHidden = "1";
    }
  };

  const run = () => {
    const style = document.createElement("style");
    style.id = "__playwright_hide_impersonation__";
    if (document.getElementById(style.id)) return;
    style.textContent = `
      [data-impersonation-banner] { display: none !important; }
    `;
    (document.head || document.documentElement).appendChild(style);

    // Hide any already in DOM
    document.querySelectorAll("[data-impersonation-banner]").forEach(hide);

    // Catch dynamically added banner (React renders client-side)
    const obs = new MutationObserver(() => {
      document.querySelectorAll("[data-impersonation-banner]").forEach(hide);
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
}

export async function hideImpersonationBanner(page) {
  await new Promise((r) => setTimeout(r, 200));
  await page.evaluate(() => {
    const sel = "[data-impersonation-banner]";
    let banner = document.querySelector(sel);
    if (!banner) {
      const el = Array.from(document.querySelectorAll("*")).find((e) =>
        e.textContent?.includes("IMPERSONATION MODE ACTIVE")
      );
      banner = el?.closest("[class*='bg-red'], [class*='bg-red-600']");
    }
    if (banner) banner.style.setProperty("display", "none");
  });
}
