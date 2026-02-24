import { BASE_URL } from "../_utilities/screenshot-shared.mjs";
import { clickWithCursor } from "../_utilities/video/video-cursor.mjs";

const dir = "managing-asset-views-and-details";

export const targets = [
  {
    type: "element",
    selector: 'div.overflow-auto.border-t:has(table:has(th:has-text("Availability")))',
    filename: "warehouse-view.png",
    dir,
    path: "assets",
    clipToContent: true,
    videoPrepare: async (p, cursor) => {
      // Page is already in list view (guaranteed by the guide's preload function).
      // Brief pause so the starting frame is clearly visible, then click warehouse view.
      await new Promise((r) => setTimeout(r, 600));
      const warehouseBtn = p.locator('[data-slot="toggle-group"] button').nth(1);
      await warehouseBtn.waitFor({ state: "visible", timeout: 3000 });
      await clickWithCursor(p, cursor, '[aria-label="Warehouse view"]', () => warehouseBtn.click());
      await new Promise((r) => setTimeout(r, 1500));
    },
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      await p.goto(`${BASE_URL}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await p.waitForSelector('[data-table-search="true"], button:has-text("Import assets")', { state: "visible", timeout: 5000 });
      await new Promise((r) => setTimeout(r, 2000));
      const warehouseBtn = p.locator('[data-slot="toggle-group"] button').nth(1);
      await warehouseBtn.waitFor({ state: "visible", timeout: 5000 });
      await warehouseBtn.click();
      await new Promise((r) => setTimeout(r, 3000));
    },
  },
  {
    type: "element",
    selector: 'div.grid:has(div:has-text("Unassigned assets")):has(div:has-text("Assets reached EOL"))',
    filename: "asset-quick-filters.png",
    dir,
    path: "assets",
    videoPrepare: async (p, cursor) => {
      const listBtn = p.locator('[data-slot="toggle-group"] button').first();
      if (await listBtn.isVisible().catch(() => false)) {
        await clickWithCursor(p, cursor, '[aria-label="List view"]', () => listBtn.click());
        await p.waitForLoadState("networkidle");
        await new Promise((r) => setTimeout(r, 2000));
      }
      await p.waitForSelector('table th:has-text("Status")', { state: "visible", timeout: 8000 });
      await p.waitForSelector("table tbody tr[data-row-index]", { state: "visible", timeout: 5000 });
    },
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      await p.goto(`${BASE_URL}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      if (await p.getByRole("button", { name: "List view" }).isVisible().catch(() => false)) {
        await p.getByRole("button", { name: "List view" }).click();
        await new Promise((r) => setTimeout(r, 2000));
      }
    },
  },
  {
    type: "element",
    selector: '[id="overview"]',
    filename: "asset-detail-overview.png",
    dir,
    path: "assets",
    videoPrepare: async (p, cursor) => {
      const row = p.locator('table tbody tr[data-row-index].cursor-pointer').first();
      await row.waitFor({ state: "visible", timeout: 5000 });
      // Click Asset column (2nd cell) - avoids hitting editable Location dropdown
      const assetCell = row.locator('td:nth-child(2)');
      await clickWithCursor(p, cursor, 'td:nth-child(2)', () =>
        assetCell.click({ force: true, noWaitAfter: true }),
      );
      // Client-side routing (pushState) doesn't trigger waitForURL; poll the URL
      await p.waitForFunction(
        () => !!window.location.pathname.match(/\/assets\/[^/]+/),
        { timeout: 5000 },
      );
      await p.waitForSelector('[id="overview"]', { state: "visible", timeout: 8000 });
      await new Promise((r) => setTimeout(r, 1500));
      await p.locator('[id="overview"]').first().scrollIntoViewIfNeeded();
      await new Promise((r) => setTimeout(r, 500));
    },
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      await p.goto(`${BASE_URL}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 3000));
      if (await p.locator('[data-slot="toggle-group"] button').first().isVisible().catch(() => false)) {
        await p.locator('[data-slot="toggle-group"] button').first().click();
        await new Promise((r) => setTimeout(r, 1500));
      }
      const row = p.locator('table tbody tr[data-row-index]').first();
      await row.waitFor({ state: "visible", timeout: 5000 });
      await row.click();
      await p.waitForURL((u) => u.pathname.match(/\/assets\/[^/]+/), { timeout: 5000 });
      await p.waitForSelector('[id="overview"]', { state: "visible", timeout: 5000 });
      await p.locator('[id="overview"]').first().scrollIntoViewIfNeeded();
      // Wait for card content to populate (cards start empty while data loads)
      await p.waitForSelector('[id="overview"] [class*="card"] *:not(:empty), [id="overview"] dl dt, [id="overview"] [data-field]', { state: "visible", timeout: 8000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1500));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Mark asset as retired"))',
    filename: "retirement-modal.png",
    dir,
    path: "assets",
    videoPrepare: async (p, cursor) => {
      const combobox = p.getByRole("combobox").first();
      await combobox.waitFor({ state: "visible", timeout: 5000 });
      await clickWithCursor(p, cursor, '[role="combobox"]', () => combobox.click({ timeout: 5000 }));
      await new Promise((r) => setTimeout(r, 300));
      const retiredOption = p.getByRole("option", { name: "Retired" });
      await retiredOption.waitFor({ state: "visible", timeout: 5000 });
      await clickWithCursor(p, cursor, '[role="option"]:has-text("Retired")', () =>
        retiredOption.click({ timeout: 5000 }),
      );
      await p.waitForSelector('[role="dialog"]:has(h2:has-text("Mark asset as retired"))', { state: "visible", timeout: 3000 });
      await new Promise((r) => setTimeout(r, 200));
    },
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      await p.goto(`${BASE_URL}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      const row = p.locator('table tbody tr.cursor-pointer').first();
      await row.waitFor({ state: "visible", timeout: 5000 });
      await row.click();
      await p.waitForURL((u) => u.pathname.match(/\/assets\/[^/]+/), { timeout: 5000 }).catch(() => { });
      await new Promise((r) => setTimeout(r, 2000));
      await p.getByRole("combobox").first().click();
      await new Promise((r) => setTimeout(r, 500));
      await p.getByRole("option", { name: "Retired" }).click();
      await new Promise((r) => setTimeout(r, 1000));
    },
  },
  {
    type: "element",
    selector: '[data-slot="sheet-content"]:has(h2:has-text("Activity"))',
    filename: "activity-log-sheet.png",
    dir,
    path: "assets",
    clipToContent: true,
    contentEndSelector: 'div.overflow-y-auto div.flex.gap-3',
    videoPrepare: async (p, cursor) => {
      // Close retirement modal: Cancel works reliably; Escape as fallback
      const cancelBtn = p.getByRole("button", { name: "Cancel" });
      if (await cancelBtn.isVisible().catch(() => false)) {
        await clickWithCursor(p, cursor, 'button:has-text("Cancel")', () =>
          cancelBtn.click({ timeout: 3000, noWaitAfter: true }),
        );
      } else {
        await p.keyboard.press("Escape");
      }
      await new Promise((r) => setTimeout(r, 200));
      await clickWithCursor(p, cursor, 'button:has-text("Activity log")', () =>
        p.getByRole("button", { name: "Activity log" }).click({ timeout: 5000 }),
      );
      await new Promise((r) => setTimeout(r, 800));
    },
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      await p.goto(`${BASE_URL}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      const row = p.locator('table tbody tr.cursor-pointer').first();
      await row.waitFor({ state: "visible", timeout: 5000 });
      await row.click();
      await p.waitForURL((u) => u.pathname.match(/\/assets\/[^/]+/), { timeout: 5000 }).catch(() => { });
      await new Promise((r) => setTimeout(r, 2000));
      await p.getByRole("button", { name: "Activity log" }).click();
      await new Promise((r) => setTimeout(r, 1500));
    },
  },
];

export const videoConfig = {
  path: "assets",
  /** Runs before recording starts to ensure page is in list view, not warehouse view. */
  preload: async (page) => {
    await page.waitForSelector('table tbody tr[data-row-index], button:has-text("Import assets")', { state: "visible", timeout: 10000 });
    const listBtn = page.locator('[data-slot="toggle-group"] button').first();
    if (await listBtn.isVisible().catch(() => false)) {
      const isWarehouseActive = await page.locator('[aria-label="Warehouse view"][data-state="on"], [aria-label="Warehouse view"][aria-pressed="true"]').isVisible().catch(() => false);
      if (isWarehouseActive) {
        await listBtn.click();
        await page.waitForSelector('table th:has-text("Status")', { state: "visible", timeout: 8000 });
      }
    }
    await page.waitForSelector('table tbody tr[data-row-index]', { state: "visible", timeout: 8000 });
    await new Promise((r) => setTimeout(r, 500));
  },
};
