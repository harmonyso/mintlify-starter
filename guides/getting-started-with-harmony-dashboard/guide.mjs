import { SYSTEM_DASHBOARD_PATH } from "../_utilities/screenshot-shared.mjs";

const dir = "getting-started-with-harmony-dashboard";

export const targets = [
  {
    type: "region",
    filename: "sidebar-sections.png",
    dir,
    path: SYSTEM_DASHBOARD_PATH,
    clip: { x: 0, y: 0, width: 280, height: 900 },
  },
  {
    type: "region",
    filename: "dashboard-home.png",
    dir,
    path: SYSTEM_DASHBOARD_PATH,
    clip: { x: 280, y: 0, width: 1120, height: 900 },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has([data-slot="command"])',
    filename: "command-palette.png",
    dir,
    path: SYSTEM_DASHBOARD_PATH,
    prepare: async (p) => {
      await p.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
      await new Promise((r) => setTimeout(r, 800));
      await p.getByPlaceholder("Search for commands...").fill("dashboard").catch(() => null);
      await new Promise((r) => setTimeout(r, 500));
    },
  },
];

export const videoConfig = {
  path: "dashboard",
  preload: async (page) => {
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
  },
};
