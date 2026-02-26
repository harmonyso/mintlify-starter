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
  // Matches the ImpersonationBanner component: absolute div with bg-red-600 containing
  // "IMPERSONATION MODE ACTIVE" text. No data attribute exists on the element.
  const BANNER_SELECTOR = 'div.bg-red-600.text-white.absolute';

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
      div.bg-red-600.text-white { display: none !important; }
    `;
    (document.head || document.documentElement).appendChild(style);

    document.querySelectorAll(BANNER_SELECTOR).forEach(hide);

    const obs = new MutationObserver(() => {
      document.querySelectorAll(BANNER_SELECTOR).forEach(hide);
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
    // The ImpersonationBanner renders as an absolute div.bg-red-600.text-white with no data attribute.
    const banner = document.querySelector("div.bg-red-600.text-white.absolute") ??
      Array.from(document.querySelectorAll("div.bg-red-600")).find((el) =>
        el.textContent?.includes("IMPERSONATION MODE ACTIVE")
      );
    if (banner) banner.style.setProperty("display", "none", "important");
  });
}
