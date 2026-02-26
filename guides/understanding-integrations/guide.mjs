import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "understanding-integrations";

async function goToIntegrations(p) {
  await p.goto(`${BASE_URL}/settings/integrations`, { waitUntil: "domcontentloaded", timeout: 30000 });
  // IntegrationsPane root is div.space-y-6; wait for cards (data-slot="card") to render
  await p.waitForSelector('[data-slot="card"]', { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));
}

export const targets = [
  {
    // IntegrationsPane root: div.space-y-6 containing title, search input, and IntegrationCard grid
    // Cards render as <div data-slot="card"> (shadcn Card), no data-integration-card attribute
    // Heading is h4 (not h1) — SettingsPageTitle renders as h4
    type: "element",
    selector: 'div.space-y-6:has(input[placeholder="Search"])',
    clipToContent: true,
    filename: "integrations-list.png",
    dir,
    path: "settings/integrations",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToIntegrations(p);
    },
  },
  {
    // Connected integration card: data-slot="card" (class includes "bg-card") with "Connected" text and icon img
    type: "element",
    selector: '[data-slot="card"]:has(:text("Connected")):has(img[alt])',
    filename: "integration-connected.png",
    dir,
    path: "settings/integrations",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToIntegrations(p);
    },
  },
  {
    // Integration config modal: opened via ?integration-id=dots URL param (non-connected integration)
    // Modal confirmed live: dialog "Dots" with img, h2, description, API Key input, Close + Connect buttons
    type: "element",
    selector: '[role="dialog"]:has(button:has-text("Connect"))',
    filename: "integration-connect.png",
    dir,
    path: "settings/integrations",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      // Navigate directly with integration-id query param — opens the config modal without clicking
      await p.goto(`${BASE_URL}/settings/integrations?integration-id=workwize`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
    },
  },
];

export const videoConfig = {
  path: "settings/integrations",
  preload: async (page) => {
    await page.waitForSelector('[data-slot="card"]', { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
  },
};
