import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "working-with-dashboard-widgets";

// Navigate to a non-system dashboard (system dashboard has "Add widgets" permanently disabled).
// If no user dashboard exists, creates one.
async function ensureNonSystemDashboard(p) {
  await p.keyboard.press("Escape");
  await p.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2000));

  // If "Add widgets" is already enabled, we're on a user dashboard
  const addBtn = p.getByRole("button", { name: /Add widgets/i }).first();
  const enabled = await addBtn.isEnabled().catch(() => false);
  if (enabled) return;

  // We're on the system dashboard — open the dashboard selector dropdown
  const titleBtn = p.locator('button:has(h2[class*="text-3xl"])').first();
  await titleBtn.click();
  await new Promise((r) => setTimeout(r, 800));

  // Try to click an existing non-system dashboard item (name != "Dashboard")
  let navigated = false;
  const items = p.locator('div.cursor-pointer:has(div[class*="truncate"])');
  const count = await items.count().catch(() => 0);
  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const name = await item.locator("div[class*='truncate']").first().textContent().catch(() => "");
    if (name && name.trim() !== "Dashboard") {
      await item.click();
      navigated = true;
      break;
    }
  }

  if (!navigated) {
    // No user dashboard exists — create one
    await p.getByRole("button", { name: /Create dashboard/i }).click();
  }

  // Wait for the URL to land on a specific dashboard (/dashboard/<id>)
  await p.waitForURL(/\/dashboard\/.+/, { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
}

export const targets = [
  {
    type: "element",
    selector: 'aside:has([data-widget-library]), div:has(h2:has-text("Widget library")), [data-widget-library-panel]',
    filename: "widget-library.png",
    dir,
    path: "dashboard",
    prepare: async (p) => {
      await ensureNonSystemDashboard(p);
      const addWidgetsBtn = p.getByRole("button", { name: /Add widgets/i }).first();
      if (await addWidgetsBtn.isVisible().catch(() => false)) {
        await addWidgetsBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  },
  {
    // Selector: a widget Card that has the .drag-handle div (only present in edit mode)
    type: "element",
    selector: '[data-slot="card"]:has(.drag-handle)',
    filename: "widget-drag-handle.png",
    dir,
    path: "dashboard",
    prepare: async (p) => {
      await ensureNonSystemDashboard(p);
      await p.keyboard.press("Escape");

      // If the dashboard is empty (no real widget cards), add one via the widget library
      if ((await p.locator('.dashboard-widget:has([data-slot="card"])').count()) === 0) {
        // Try the "Add widgets" header button first; fall back to the empty-state click target
        const addBtn = p.getByRole("button", { name: /Add widgets/i }).first();
        if (await addBtn.isVisible().catch(() => false)) {
          await addBtn.click();
        } else {
          await p.locator(".dashboard-widget").first().click();
        }
        // Wait for the Widget library sheet to open
        await p
          .waitForSelector('div:has(> h2:has-text("Widget library"))', { timeout: 8000 })
          .catch(() => {});
        await new Promise((r) => setTimeout(r, 600));
        // Click the first widget entry in the library to add it
        const firstItem = p
          .locator('div:has(> h2:has-text("Widget library")) div.group.cursor-pointer')
          .first();
        if (await firstItem.isVisible().catch(() => false)) {
          await firstItem.click();
        }
        // Wait for the widget card to appear in the grid
        await p
          .waitForSelector('.dashboard-widget:has([data-slot="card"])', { timeout: 10000 })
          .catch(() => {});
        await new Promise((r) => setTimeout(r, 1000));
      }

      // Enter edit mode so .drag-handle divs are rendered
      const editBtn = p
        .getByRole("button", { name: /^Edit$/i })
        .first();
      if (
        (await editBtn.isVisible().catch(() => false)) &&
        (await editBtn.isEnabled().catch(() => false))
      ) {
        await editBtn.click();
        await p.waitForSelector(".drag-handle", { timeout: 8000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 800));
      }
    },
  },
  {
    // Selector: the Radix popper wrapper that contains the open date-range dropdown
    // (the trigger button has role="combobox", not role="button", so we use a CSS locator)
    type: "element",
    selector: '[data-radix-popper-content-wrapper]:has(button:has-text("Last 30 days"))',
    filename: "date-range-selector.png",
    dir,
    path: "dashboard",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      // The trigger has an explicit role="combobox" — getByRole("button") won't find it
      const dateRangeBtn = p.locator('button[role="combobox"]').first();
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
