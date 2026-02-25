import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "managing-service-desks-and-teams";

/**
 * Navigates to /settings/desks and clicks the first desk row.
 * Returns the URL of the desk detail page (e.g. /settings/desks/it-desk).
 */
async function goToFirstDesk(p) {
  await p.goto(`${BASE_URL}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 1500));
  const firstRow = p.locator("table tbody tr").first();
  await firstRow.waitFor({ state: "visible", timeout: 5000 });
  await firstRow.click();
  await p.waitForURL((u) => /\/settings\/desks\/.+/.test(u.pathname), { timeout: 8000 });
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 1500));
  return p.url();
}

export const targets = [
  // ── 1. Desks list ────────────────────────────────────────────────────────
  {
    type: "element",
    selector: 'main:has(h4:has-text("Desks")):has(button:has-text("Create desk"))',
    filename: "desks-list.png",
    dir,
    path: "settings/desks",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
    },
  },

  // ── 2. Create desk dialog (two-step: "Create desk" → "Create custom desk") ─
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Create New Desk"))',
    filename: "create-desk-modal.png",
    dir,
    path: "settings/desks",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 1500));
      await p.getByRole("button", { name: "Create desk" }).click();
      await new Promise((r) => setTimeout(r, 600));
      await p.getByRole("menuitem", { name: /Create custom desk/i }).click();
      await new Promise((r) => setTimeout(r, 1000));
    },
  },

  // ── 3. Desk overview – Configurations nav cards ──────────────────────────
  {
    type: "fullpage",
    filename: "desk-overview-tabs.png",
    dir,
    path: "settings/desks",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToFirstDesk(p);
    },
  },

  // ── 4. Delete desk dialog (alertdialog role) ─────────────────────────────
  {
    type: "element",
    selector: '[role="alertdialog"]',
    filename: "delete-desk-dialog.png",
    dir,
    path: "settings/desks",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToFirstDesk(p);
      await p.getByRole("button", { name: "Delete desk" }).click();
      await p.locator('[role="alertdialog"]').waitFor({ state: "visible", timeout: 5000 });
      await new Promise((r) => setTimeout(r, 500));
    },
  },

  // ── 5. Members & Teams page – Members tab ────────────────────────────────
  {
    type: "fullpage",
    filename: "members-tab.png",
    dir,
    path: "settings/desks",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      const deskUrl = await goToFirstDesk(p);
      await p.goto(deskUrl + "/members", { waitUntil: "domcontentloaded" });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 1500));
    },
  },

  // ── 6. Create Team dialog ────────────────────────────────────────────────
  {
    type: "element",
    selector: '[role="dialog"]',
    filename: "create-team-dialog.png",
    dir,
    path: "settings/desks",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      const deskUrl = await goToFirstDesk(p);
      await p.goto(deskUrl + "/members", { waitUntil: "domcontentloaded" });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 1000));
      await p.getByRole("tab", { name: "Teams" }).click();
      await new Promise((r) => setTimeout(r, 800));
      // Multiple "Create team" buttons may exist (one per team row); click the first
      await p.getByRole("button", { name: "Create team" }).first().click();
      // Wait until the dialog is mounted
      await p.locator('[role="dialog"]').waitFor({ state: "visible", timeout: 5000 });
      await new Promise((r) => setTimeout(r, 500));
    },
  },

  // ── 7. SLA + Working hours ────────────────────────────────────────────────
  {
    type: "fullpage",
    filename: "working-hours.png",
    dir,
    path: "settings/desks",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      const deskUrl = await goToFirstDesk(p);
      await p.goto(deskUrl + "/sla", { waitUntil: "domcontentloaded" });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 1500));
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
