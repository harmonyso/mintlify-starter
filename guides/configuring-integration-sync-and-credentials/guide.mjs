const dir = "configuring-integration-sync-and-credentials";

export const targets = [
  {
    type: "region",
    filename: "integration-status.png",
    dir,
    path: "settings/integrations",
    clip: { x: 0, y: 0, width: 1400, height: 420 },
  },
  {
    type: "element",
    selector: 'div:has(label:has-text("Bidirectional synchronization"))',
    filename: "sync-toggle.png",
    dir,
    path: "settings/integrations",
    prepare: async (p) => {
      const card = p.getByText(/Freshservice|Solarwinds/i).first();
      await card.scrollIntoViewIfNeeded().catch(() => null);
      await new Promise((r) => setTimeout(r, 300));
      await card.click().catch(() => p.locator("[class*='cursor-pointer']").first().click());
      await new Promise((r) => setTimeout(r, 2000));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"], [data-slot="dialog-content"]',
    filename: "integration-credentials-modal.png",
    dir,
    path: "settings/integrations",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 500));
      const preferred = p.getByText(/Freshservice|Okta|Solarwinds|Slack|ServiceNow/i).first();
      if (await preferred.isVisible().catch(() => false)) {
        await preferred.scrollIntoViewIfNeeded().catch(() => null);
        await new Promise((r) => setTimeout(r, 300));
        await preferred.click();
      } else {
        const firstCard = p.locator('div[class*="grid"] [class*="cursor-pointer"]').first();
        await firstCard.scrollIntoViewIfNeeded().catch(() => null);
        await new Promise((r) => setTimeout(r, 300));
        await firstCard.click();
      }
      await new Promise((r) => setTimeout(r, 2000));
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
