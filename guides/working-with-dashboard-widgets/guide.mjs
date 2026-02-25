import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "working-with-dashboard-widgets";

export const targets = [
  {
    type: "element",
    selector: 'aside:has([data-widget-library]), div:has(h2:has-text("Widget library")), [data-widget-library-panel]',
    filename: "widget-library.png",
    dir,
    path: "dashboard",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      const addWidgetsBtn = p.getByRole("button", { name: /Add widgets/i }).first();
      if (await addWidgetsBtn.isVisible().catch(() => false)) {
        await addWidgetsBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  },
  {
    type: "element",
    selector: 'div:has([data-drag-handle]):has([data-widget]), div[class*="widget"]:has([aria-label*="drag"]), div:has(button[aria-label*="drag"]):has([data-widget-type])',
    filename: "widget-drag-handle.png",
    dir,
    path: "dashboard",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      const editBtn = p.getByRole("button", { name: /Edit/i }).first();
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  },
  {
    type: "element",
    selector: '[data-radix-popper-content-wrapper]:has([role="option"]:has-text("Last")), [data-date-range-selector], div[class*="date-range"]:has(button)',
    filename: "date-range-selector.png",
    dir,
    path: "dashboard",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      const dateRangeBtn = p.getByRole("button", { name: /Last 30|Last 7|days/i }).first();
      if (await dateRangeBtn.isVisible().catch(() => false)) {
        await dateRangeBtn.click();
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
