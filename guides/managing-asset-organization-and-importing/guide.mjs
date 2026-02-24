import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "managing-asset-organization-and-importing";

export const targets = [
  {
    type: "element",
    selector: 'div:has([data-table-search="true"]):has(button:has-text("Import assets"))',
    filename: "assets-toolbar-export.png",
    dir,
    path: "assets",
  },
  {
    type: "element",
    selector: 'div:has(span:has-text("selected")):has(button:has-text("Change location"))',
    filename: "asset-bulk-actions.png",
    dir,
    path: "assets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      await p.goto(`${BASE_URL}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      const checkbox = p.locator('table tbody tr').first().locator('input[type="checkbox"], [role="checkbox"]').first();
      await checkbox.click().catch(() => p.locator('table tbody tr td').first().click());
      await new Promise((r) => setTimeout(r, 800));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Import assets"))',
    filename: "asset-import-dialog.png",
    dir,
    path: "assets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      if (!p.url().endsWith("/assets") && !p.url().includes("/assets?")) {
        await p.goto(`${BASE_URL}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 2000));
      }
      const checkbox = p.locator('table tbody tr').first().locator('input[type="checkbox"], [role="checkbox"]').first();
      if (await checkbox.isVisible().catch(() => false)) {
        const isChecked = await checkbox.isChecked().catch(() => false);
        if (isChecked) await checkbox.click();
        await new Promise((r) => setTimeout(r, 500));
      }
      await p.getByRole("button", { name: /Import assets/i }).click();
      await new Promise((r) => setTimeout(r, 1000));
    },
  },
  {
    type: "element",
    selector: 'div:has(h3:has-text("Asset details")):has(div:has-text("Ownership"))',
    filename: "asset-detail-org-fields.png",
    dir,
    path: "assets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      await p.goto(`${BASE_URL}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      const row = p.locator('table tbody tr.cursor-pointer').first();
      await row.waitFor({ state: "visible", timeout: 10000 });
      await row.click();
      await p.waitForURL((u) => u.pathname.match(/\/assets\/[^/]+/), { timeout: 10000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
    },
  },
];
