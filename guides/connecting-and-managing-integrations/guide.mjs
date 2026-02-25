const dir = "connecting-and-managing-integrations";

export const targets = [
  {
    type: "region",
    filename: "integrations-connect.png",
    dir,
    path: "settings/integrations",
    clip: { x: 0, y: 0, width: 1400, height: 420 },
  },
  {
    type: "element",
    selector: '[role="dialog"], [data-slot="dialog-content"]',
    filename: "integration-config-form.png",
    dir,
    path: "settings/integrations",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 500));
      const preferred = p.getByText(/Freshservice|Okta|Solarwinds|ServiceNow/i).first();
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
  {
    type: "element",
    selector: '[role="dialog"]',
    filename: "multi-instance-modal.png",
    dir,
    path: "settings/integrations",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 500));
      const multiInstanceNames = ["Slack", "Okta", "Confluence", "Google Drive", "Jira", "Microsoft Teams"];
      let clicked = false;
      for (const name of multiInstanceNames) {
        const card = p.locator('div[class*="grid"] [class*="cursor-pointer"]').filter({ hasText: name }).first();
        if (await card.isVisible().catch(() => false)) {
          await card.scrollIntoViewIfNeeded().catch(() => null);
          await new Promise((r) => setTimeout(r, 300));
          await card.click();
          clicked = true;
          break;
        }
      }
      if (!clicked) {
        const firstCard = p.locator('div[class*="grid"] [class*="cursor-pointer"]').first();
        await firstCard.scrollIntoViewIfNeeded().catch(() => null);
        await new Promise((r) => setTimeout(r, 300));
        await firstCard.click();
      }
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
