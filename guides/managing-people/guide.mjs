import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "managing-people";

export const targets = [
  {
    type: "element",
    selector: 'table:has(th:has-text("Department")), div:has(table:has(th:has-text("Status")))',
    filename: "people-list.png",
    dir,
    path: "people",
    clipToContent: true,
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/people`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
    },
  },
  {
    type: "fullpage",
    filename: "employee-profile.png",
    dir,
    path: "people",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/people`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      const row = p.locator("table tbody tr").first();
      await row.waitFor({ state: "visible", timeout: 5000 });
      await row.click();
      await p.waitForURL((u) => u.pathname.match(/\/people\/.+/), { timeout: 8000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
    },
  },
  // manage-groups-dialog.png omitted — Manage Groups is only available on Okta
  // test tenants and cannot be captured from the demo environment.
];

export const videoConfig = {
  path: "people",
  preload: async (page) => {
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
  },
};
