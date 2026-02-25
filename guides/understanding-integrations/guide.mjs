import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "understanding-integrations";

export const targets = [
  {
    type: "element",
    selector: 'main:has([data-integration-card], div[class*="integration"]), div:has(h1:has-text("Integrations")):has(input[placeholder*="Search"])',
    filename: "integrations-list.png",
    dir,
    path: "settings/integrations",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/integrations`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2500));
    },
  },
  {
    type: "element",
    selector: '[data-integration-card]:has(:text("Connected")), div[class*="card"]:has(:text("Connected")):has(img[alt])',
    filename: "integration-connected.png",
    dir,
    path: "settings/integrations",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/integrations`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2500));
    },
  },
  {
    type: "element",
    selector: '[data-integration-card]:has(button:has-text("Connect")):not(:has(:text("Connected"))), div[class*="card"]:has(button:has-text("Connect"))',
    filename: "integration-connect.png",
    dir,
    path: "settings/integrations",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/integrations`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2500));
    },
  },
];

export const videoConfig = {
  path: "settings/integrations",
  preload: async (page) => {
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
  },
};
