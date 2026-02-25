import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "managing-software-applications";

async function goToFirstApp(p) {
  await p.goto(`${BASE_URL}/software`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2000));
  const row = p.locator("table tbody tr").first();
  await row.waitFor({ state: "visible", timeout: 8000 });
  await row.click();
  await p.waitForURL((u) => u.pathname.match(/\/software\/.+/), { timeout: 8000 });
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2000));
}

export const targets = [
  {
    type: "element",
    selector: 'div.overflow-auto.border-t:has(table:has(th:has-text("Status"))), table:has(th:has-text("Status"))',
    filename: "software-list.png",
    dir,
    path: "software",
    clipToContent: true,
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/software`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
    },
  },
  {
    type: "element",
    selector: 'main:has(h1):has(div:has-text("Licenc")), div:has(h2:has-text("Licenc"))',
    filename: "software-detail.png",
    dir,
    path: "software",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToFirstApp(p);
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("license")):has(input)',
    filename: "add-license-form.png",
    dir,
    path: "software",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToFirstApp(p);
      const addLicenseBtn = p.getByRole("button", { name: /Add license/i }).first();
      if (await addLicenseBtn.isVisible().catch(() => false)) {
        await addLicenseBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  },
  {
    type: "element",
    selector: 'div:has(button:has-text("Change status")):has([role="checkbox"]), div[data-bulk-actions]',
    filename: "software-bulk-actions.png",
    dir,
    path: "software",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/software`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      const checkbox = p.locator('table tbody tr').first().locator('[role="checkbox"], input[type="checkbox"]').first();
      if (await checkbox.isVisible().catch(() => false)) {
        await checkbox.click();
        await new Promise((r) => setTimeout(r, 500));
      }
    },
  },
];

export const videoConfig = {
  path: "software",
  preload: async (page) => {
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
  },
};
