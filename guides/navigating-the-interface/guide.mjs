import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "navigating-the-interface";

export const targets = [
  {
    type: "fullpage",
    filename: "layout-full.png",
    dir,
    path: "dashboard",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector('[data-sidebar="sidebar"]', { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 2000));
    },
  },
  {
    type: "region",
    clip: { x: 0, y: 0, width: 330, height: 600 },
    filename: "desk-hover-preview.png",
    dir,
    path: "dashboard",
    prepare: async (p) => {
      // Force sidebar to load collapsed via its persistence cookie
      await p.evaluate(() => {
        document.cookie = "sidebar_state=false; path=/; max-age=604800";
      });
      await p.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector('[data-sidebar="sidebar"][data-state="collapsed"]', { timeout: 10000 });
      await new Promise((r) => setTimeout(r, 1500));
      // Hover the Tickets menu button to open the desk hover card
      await p.locator('button[title="Tickets"]').first().hover();
      await new Promise((r) => setTimeout(r, 800));
      // Restore expanded state for subsequent screenshots
      await p.evaluate(() => {
        document.cookie = "sidebar_state=true; path=/; max-age=604800";
      });
    },
  },
  {
    type: "element",
    selector: '[role="dialog"][data-state="open"]:has(input[placeholder*="Search"]):has([cmdk-list]), [cmdk-root]',
    filename: "command-palette.png",
    dir,
    path: "dashboard",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector('[data-sidebar="sidebar"]', { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 2000));
      await p.keyboard.press("Meta+k");
      await new Promise((r) => setTimeout(r, 800));
    },
  },
  {
    type: "element",
    selector: 'nav[aria-label="breadcrumb"], ol[aria-label="breadcrumb"], nav:has(ol):has(li:has(a)):has(li:has-text("Desks"))',
    filename: "breadcrumbs.png",
    dir,
    path: "settings/desks",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector('table tbody tr, li:has(a[href*="/settings/desks/"])', { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 1000));
      const firstDesk = p.locator('table tbody tr, li:has(a[href*="/settings/desks/"])').first();
      if (await firstDesk.isVisible().catch(() => false)) {
        await firstDesk.click();
        await p.waitForURL((u) => u.pathname.match(/\/settings\/desks\/.+/), { timeout: 8000 }).catch(() => {});
        await p.waitForSelector('nav[aria-label="breadcrumb"], ol[aria-label="breadcrumb"]', { timeout: 8000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  },
  {
    type: "element",
    selector: '[data-radix-popper-content-wrapper]:has([role="menuitem"]):has(:text("Log out")), [role="menu"]:has([role="menuitem"]:has-text("Log out"))',
    filename: "user-menu.png",
    dir,
    path: "dashboard",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector('[data-sidebar="sidebar"]', { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 2000));
      const userMenuBtn = p.locator('nav footer button, [data-sidebar="footer"] button').first();
      if (await userMenuBtn.isVisible().catch(() => false)) {
        await userMenuBtn.click();
        await new Promise((r) => setTimeout(r, 800));
      }
    },
  },
];

export const videoConfig = {
  path: "dashboard",
  preload: async (page) => {
    await page.waitForSelector('[data-sidebar="sidebar"]', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));
  },
};
