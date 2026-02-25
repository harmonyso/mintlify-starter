import { navigateToDeskAutomation, navigateToDeskSla } from "../_utilities/screenshots/screenshot-helpers.mjs";

const dir = "configuring-automation-and-sla";

export const targets = [
  {
    type: "element",
    selector: 'div:has(h2:has-text("Ticket assignment"))',
    filename: "auto-assignment.png",
    dir,
    path: "settings/desks",
    prepare: navigateToDeskAutomation,
  },
  {
    type: "element",
    selector: 'div:has(h2:has-text("Ticket closing"))',
    filename: "auto-close-settings.png",
    dir,
    path: "settings/desks",
    prepare: navigateToDeskAutomation,
  },
  {
    type: "element",
    selector: 'div:has(h2:has-text("SLA targets"))',
    filename: "sla-policies.png",
    dir,
    path: "settings/desks",
    prepare: navigateToDeskSla,
  },
];

export const videoConfig = {
  path: "settings/desks",
  preload: async (page) => {
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
  },
};
