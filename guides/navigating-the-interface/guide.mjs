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
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
    },
  },
  {
    type: "element",
    selector: '[data-radix-popper-content-wrapper]:has(p), [role="tooltip"]:has(span), div:has([data-state="open"]):has([data-sidebar="group"])',
    filename: "desk-hover-preview.png",
    dir,
    path: "dashboard",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      // Collapse sidebar first
      const toggleBtn = p.locator('[data-sidebar="rail"], button[aria-label*="sidebar"], button[aria-label*="Sidebar"]').first();
      if (await toggleBtn.isVisible().catch(() => false)) {
        await toggleBtn.click();
        await new Promise((r) => setTimeout(r, 800));
      }
      // Hover a desk item
      const deskItem = p.locator('[data-sidebar="group"] a[href*="/tickets/desk/"]').first();
      if (await deskItem.isVisible().catch(() => false)) {
        await deskItem.hover();
        await new Promise((r) => setTimeout(r, 1000));
      }
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
      await p.waitForLoadState("networkidle");
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
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      const firstDesk = p.locator('table tbody tr, li:has(a[href*="/settings/desks/"])').first();
      if (await firstDesk.isVisible().catch(() => false)) {
        await firstDesk.click();
        await p.waitForURL((u) => u.pathname.match(/\/settings\/desks\/.+/), { timeout: 8000 }).catch(() => {});
        await p.waitForLoadState("networkidle");
        await new Promise((r) => setTimeout(r, 1500));
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
      await p.waitForLoadState("networkidle");
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
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
  },
};
