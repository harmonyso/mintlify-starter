import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "understanding-user-roles-and-permissions";

export const targets = [
  {
    type: "element",
    selector: 'aside:has([data-user-detail]), div:has(h2:has-text("Groups")):has([data-role-badge]), div:has(dl):has(dd:has-text("Platform"))',
    filename: "user-roles-badges.png",
    dir,
    path: "settings/user-management",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/user-management`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      const row = p.locator("table tbody tr").first();
      if (await row.isVisible().catch(() => false)) {
        await row.click();
        await new Promise((r) => setTimeout(r, 1500));
      }
    },
  },
  {
    type: "element",
    selector: 'div.overflow-auto.border-t:has(table:has(th:has-text("Role"))), table:has(th:has-text("Role")):has(td:has([data-role-badge]))',
    filename: "users-table-role-column.png",
    dir,
    path: "settings/user-management",
    clipToContent: true,
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/user-management`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
    },
  },
];

export const videoConfig = {
  path: "settings/user-management",
  preload: async (page) => {
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
  },
};
