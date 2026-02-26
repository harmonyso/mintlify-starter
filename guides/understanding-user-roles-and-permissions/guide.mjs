import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "understanding-user-roles-and-permissions";

async function goToUsersTab(p) {
  await p.goto(`${BASE_URL}/settings/user-management`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForSelector('[data-slot="tabs-list"], [role="tablist"]', { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));
  const usersTab = p.getByRole("tab", { name: /^Users$/i }).first();
  if (await usersTab.isVisible().catch(() => false)) {
    await usersTab.click();
  }
  // Wait for real rows (skeleton rows have empty td content)
  await p.waitForFunction(() => {
    const rows = document.querySelectorAll("table tbody tr");
    if (!rows.length) return false;
    const cells = rows[0]?.querySelectorAll("td");
    return Array.from(cells ?? []).some((td) => (td.textContent?.trim().length ?? 0) > 2);
  }, { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 500));
}

export const targets = [
  {
    // UserDetailPane at /settings/user-management/$userId
    // Outer wrapper: div.flex.w-[880px].flex-col.gap-6
    // Groups & Desks section: div > h2 "Groups & Desks" + GroupDeskRow items with Badge components
    type: "element",
    selector: 'div:has(> h2:has-text("Groups")), div:has(h2:has-text("Groups & Desks"))',
    filename: "user-roles-badges.png",
    dir,
    path: "settings/user-management",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToUsersTab(p);
      const row = p.locator("table tbody tr").first();
      if (await row.isVisible().catch(() => false)) {
        const firstCellText = await row.locator("td").first().textContent().catch(() => "");
        if ((firstCellText?.trim().length ?? 0) > 2) {
          await row.click();
          // Row click navigates to /settings/user-management/$userId
          await p.waitForSelector('h2:has-text("Groups")', { timeout: 10000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    },
  },
  {
    // Users table with Role column showing Badge components (variant="outline", no data-role-badge attr)
    type: "element",
    selector: 'div.overflow-auto.border-t:has(table:has(th:has-text("Role"))), table:has(th:has-text("Role"))',
    filename: "users-table-role-column.png",
    dir,
    path: "settings/user-management",
    clipToContent: true,
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToUsersTab(p);
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
