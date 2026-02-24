import { BASE_URL } from "../_utilities/screenshot-shared.mjs";
import { clickWithCursor } from "../_utilities/video/video-cursor.mjs";

const dir = "managing-knowledge-base";

export const targets = [
  {
    type: "element",
    selector: '[data-slot="dropdown-menu-content"]',
    filename: "kb-add-source.png",
    dir,
    path: "settings/knowledge-base",
    videoPrepare: async (p, cursor) => {
      await p.waitForSelector('[data-slot="dropdown-menu-content"], button:has-text("Add")', { state: "visible", timeout: 5000 });
      await new Promise((r) => setTimeout(r, 1000));
      await clickWithCursor(p, cursor, 'button:has-text("Add knowledge source")', () =>
        p.getByRole("button", { name: /Add knowledge source/i }).click(),
      );
      await new Promise((r) => setTimeout(r, 500));
    },
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      await p.goto(`${BASE_URL}/settings/knowledge-base`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 3000));
      await p.getByRole("button", { name: /Add knowledge source/i }).click();
      await new Promise((r) => setTimeout(r, 500));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has-text("knowledge base"):has(button:has-text("Save & sync"))',
    filename: "kb-third-party-dialog.png",
    dir,
    path: "settings/knowledge-base",
    videoPrepare: async (p, cursor) => {
      const thirdParty = p.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /Confluence|Notion|Freshservice|SharePoint/ }).first();
      await thirdParty.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
      if (await thirdParty.isVisible().catch(() => false)) {
        await clickWithCursor(p, cursor, '[role="menuitem"]', () => thirdParty.click());
        await new Promise((r) => setTimeout(r, 4000));
      }
    },
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      await p.goto(`${BASE_URL}/settings/knowledge-base`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 3000));
      await p.getByRole("button", { name: /Add knowledge source/i }).click();
      await new Promise((r) => setTimeout(r, 500));
      const thirdParty = p.locator('[role="menu"] [role="menuitem"]').filter({ hasText: /Confluence|Notion|Freshservice|SharePoint/ }).first();
      if (await thirdParty.isVisible().catch(() => false)) {
        await thirdParty.click();
        await new Promise((r) => setTimeout(r, 4000));
      }
    },
  },
  {
    type: "element",
    selector: 'div.overflow-auto.border-t:has(table:has(th:has-text("Sync Status")))',
    filename: "kb-table-sync-status.png",
    dir,
    path: "settings/knowledge-base",
    clipToContent: true,
    videoPrepare: async (p, cursor) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 500));
      await p.waitForSelector('table:has(th:has-text("Sync Status"))', { state: "visible", timeout: 5000 });
    },
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      if (!p.url().includes("/knowledge-base")) {
        await p.goto(`${BASE_URL}/settings/knowledge-base`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await p.waitForLoadState("networkidle");
        await new Promise((r) => setTimeout(r, 2000));
      }
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 500));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Access Permissions"))',
    filename: "kb-permissions-dialog.png",
    dir,
    path: "settings/knowledge-base",
    videoPrepare: async (p, cursor) => {
      const lockBtn = p.locator('table button.h-5.w-5').first();
      await lockBtn.waitFor({ state: "visible", timeout: 5000 });
      await clickWithCursor(p, cursor, 'table button.h-5.w-5', () => lockBtn.click());
      await new Promise((r) => setTimeout(r, 1000));
    },
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      await p.goto(`${BASE_URL}/settings/knowledge-base`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 3000));
      const lockBtn = p.locator('table button.h-5.w-5').first();
      if (await lockBtn.isVisible().catch(() => false)) {
        await lockBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  },
  {
    type: "element",
    selector: 'div:has(span:has-text("selected")):has(button:has-text("Delete"))',
    filename: "kb-bulk-delete.png",
    dir,
    path: "settings/knowledge-base",
    videoPrepare: async (p, cursor) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      const checkbox = p.locator('table tbody tr').first().locator('input[type="checkbox"], [role="checkbox"]').first();
      await checkbox.waitFor({ state: "visible", timeout: 5000 });
      await clickWithCursor(p, cursor, 'table tbody tr input[type="checkbox"], table tbody tr [role="checkbox"]', () =>
        checkbox.click(),
      );
      await new Promise((r) => setTimeout(r, 800));
    },
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      await p.goto(`${BASE_URL}/settings/knowledge-base`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 3000));
      const checkbox = p.locator('table tbody tr').first().locator('input[type="checkbox"], [role="checkbox"]').first();
      if (await checkbox.isVisible().catch(() => false)) {
        await checkbox.click();
        await new Promise((r) => setTimeout(r, 800));
      }
    },
  },
];

export const videoConfig = {
  path: "settings/knowledge-base",
};
