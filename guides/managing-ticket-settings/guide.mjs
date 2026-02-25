import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "managing-ticket-settings";

async function goToFirstDeskSubpage(p, subpage) {
  await p.goto(`${BASE_URL}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2000));
  const firstDesk = p.locator('table tbody tr').first();
  await firstDesk.waitFor({ state: "visible", timeout: 8000 });
  await firstDesk.click();
  await p.waitForURL((u) => u.pathname.match(/\/settings\/desks\/[^/]+$/), { timeout: 8000 }).catch(() => {});
  const deskPath = new URL(p.url()).pathname;
  await p.goto(`${BASE_URL}${deskPath}/${subpage}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 1500));
}

export const targets = [
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Create custom field"))',
    filename: "custom-fields.png",
    dir,
    path: "settings/desks",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToFirstDeskSubpage(p, "tickets");
      await p.getByRole("button", { name: /Create custom field/i }).first().click();
      await new Promise((r) => setTimeout(r, 800));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Create tag"))',
    filename: "tags-section.png",
    dir,
    path: "settings/desks",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToFirstDeskSubpage(p, "tickets");
      await p.getByRole("button", { name: /Create tag/i }).first().click();
      await new Promise((r) => setTimeout(r, 800));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Create response template")), [role="dialog"]:has(h2:has-text("Create template"))',
    filename: "canned-responses.png",
    dir,
    path: "settings/desks",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToFirstDeskSubpage(p, "templates");
      await p.getByRole("button", { name: /Create template/i }).first().click();
      await new Promise((r) => setTimeout(r, 800));
    },
  },
];

export const videoConfig = {
  path: "settings/desks",
  preload: async (page) => {
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
  },
};
