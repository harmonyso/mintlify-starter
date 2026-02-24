import { SYSTEM_DASHBOARD_PATH } from "../_utilities/screenshot-shared.mjs";

const dir = "creating-and-managing-custom-dashboards";

export const targets = [
  {
    type: "element",
    selector: 'div:has(button:has-text("Create dashboard"))',
    filename: "dashboard-dropdown.png",
    dir,
    path: SYSTEM_DASHBOARD_PATH,
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 400));
      const titleBtn = p.locator("button").filter({ has: p.locator("h2") }).first();
      await titleBtn.waitFor({ state: "visible", timeout: 15000 });
      await titleBtn.click();
      await new Promise((r) => setTimeout(r, 800));
    },
  },
  {
    type: "element",
    selector: 'div:has(button:has-text("Delete"))',
    filename: "dashboard-edit-delete.png",
    dir,
    path: SYSTEM_DASHBOARD_PATH,
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 400));
      const titleBtn = p.locator("button").filter({ has: p.locator("h2") }).first();
      await titleBtn.waitFor({ state: "visible", timeout: 15000 });
      await titleBtn.click();
      await new Promise((r) => setTimeout(r, 600));
      const dropdown = p.locator('div:has(button:has-text("Create dashboard"))');
      const firstRow = dropdown.locator('div.flex.w-full.items-center').filter({ has: p.getByText("Dashboard", { exact: true }) }).first();
      const copyBtn = firstRow.locator('div.flex.gap-2').locator('button').nth(1);
      await copyBtn.click();
      await p.waitForURL((u) => u.pathname.includes("/dashboard/") && !u.pathname.endsWith("/system-dashboard"), { timeout: 8000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
      await p.getByRole("button", { name: "Edit" }).click();
      await new Promise((r) => setTimeout(r, 800));
    },
  },
];
