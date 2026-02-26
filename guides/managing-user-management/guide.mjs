import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "managing-user-management";

export const targets = [
  {
    type: "element",
    selector: 'table:has(thead th:has-text("Role")), [role="tabpanel"]:has(table)',
    clipToContent: true,
    filename: "users-tab.png",
    dir,
    path: "settings/user-management",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/user-management`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector('[data-slot="tabs-list"], [role="tablist"]', { timeout: 15000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1000));
      const usersTab = p.getByRole("tab", { name: /^Users$/i }).first();
      if (await usersTab.isVisible().catch(() => false)) {
        await usersTab.click();
        await p.waitForSelector('table thead th:has-text("Role")', { timeout: 10000 }).catch(() => {});
        // Wait for real rows — skeleton td elements have no meaningful text
        await p.waitForFunction(() => {
          const rows = document.querySelectorAll("table tbody tr");
          if (!rows.length) return false;
          const cells = rows[0]?.querySelectorAll("td");
          return Array.from(cells ?? []).some((td) => (td.textContent?.trim().length ?? 0) > 2);
        }, { timeout: 15000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 500));
      }
    },
  },
  {
    type: "element",
    selector: 'div:has(> h2:has-text("Groups")), div:has(h2:has-text("Groups & Desks"))',
    filename: "user-detail-pane.png",
    dir,
    path: "settings/user-management",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/user-management`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector('[data-slot="tabs-list"], [role="tablist"]', { timeout: 15000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1000));
      const usersTab = p.getByRole("tab", { name: /^Users$/i }).first();
      if (await usersTab.isVisible().catch(() => false)) {
        await usersTab.click();
        // Wait for real rows (skeleton rows have empty td content; real rows have text)
        await p.waitForFunction(() => {
          const rows = document.querySelectorAll("table tbody tr");
          if (!rows.length) return false;
          const cells = rows[0]?.querySelectorAll("td");
          if (!cells?.length) return false;
          return Array.from(cells).some((td) => (td.textContent?.trim().length ?? 0) > 2);
        }, { timeout: 15000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 500));
      }
      const row = p.locator("table tbody tr").first();
      if (await row.isVisible().catch(() => false)) {
        const firstCellText = await row.locator("td").first().textContent().catch(() => "");
        if ((firstCellText?.trim().length ?? 0) > 2) {
          await row.click();
          await p.waitForSelector('h2:has-text("Groups")', { timeout: 10000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    },
  },
  {
    type: "element",
    selector: 'div:has(h2:has-text("Groups")):has(table), main:has(button:has-text("Import group"))',
    clipToContent: true,
    filename: "groups-tab.png",
    dir,
    path: "settings/user-management",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/user-management`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector('[data-slot="tabs-list"], [role="tablist"]', { timeout: 15000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
      const groupsTab = p.getByRole("tab", { name: /Groups/i }).first();
      if (await groupsTab.isVisible().catch(() => false)) {
        await groupsTab.click();
        await new Promise((r) => setTimeout(r, 1500));
      }
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Import")), [role="dialog"]:has(h2:has-text("group")):has([role="combobox"])',
    filename: "import-group-modal.png",
    dir,
    path: "settings/user-management",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/user-management`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector('[data-slot="tabs-list"], [role="tablist"]', { timeout: 15000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
      const groupsTab = p.getByRole("tab", { name: /Groups/i }).first();
      if (await groupsTab.isVisible().catch(() => false)) {
        await groupsTab.click();
        await new Promise((r) => setTimeout(r, 1500));
      }
      const importBtn = p.getByRole("button", { name: /Import group/i }).first();
      if (await importBtn.isVisible().catch(() => false)) {
        await importBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  },
];

export const videoConfig = {
  path: "settings/user-management",
  preload: async (page) => {
    await page.waitForSelector('[data-slot="tabs-list"], [role="tablist"]', { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
  },
};
