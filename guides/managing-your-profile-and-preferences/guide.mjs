import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "managing-your-profile-and-preferences";

export const targets = [
  {
    type: "element",
    selector: '[data-radix-popper-content-wrapper]:has([role="menuitem"]):has(:text("Log out")), [role="menu"]:has([role="menuitem"]:has-text("Log out"))',
    filename: "user-menu.png",
    dir,
    path: "dashboard",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      const userMenuBtn = p.locator('nav footer button, [data-sidebar="footer"] button').first();
      if (await userMenuBtn.isVisible().catch(() => false)) {
        await userMenuBtn.click();
        await new Promise((r) => setTimeout(r, 800));
      }
    },
  },
  {
    type: "element",
    selector: 'div:has(h2:has-text("Appearance")), section:has(h3:has-text("Theme")), main:has(h1:has-text("Preferences"))',
    filename: "preferences-theme.png",
    dir,
    path: "settings/preferences",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/preferences`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
    },
  },
  {
    type: "element",
    selector: 'div:has(h2:has-text("Desk Visibility")), section:has(h3:has-text("Desk Visibility")), div:has(label:has-text("Desk Visibility"))',
    filename: "desk-visibility-preferences.png",
    dir,
    path: "settings/preferences",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/settings/preferences`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      const deskVisibility = p.locator('h2:has-text("Desk Visibility"), h3:has-text("Desk Visibility")').first();
      await deskVisibility.scrollIntoViewIfNeeded().catch(() => null);
      await new Promise((r) => setTimeout(r, 500));
    },
  },
];

export const videoConfig = {
  path: "settings/preferences",
  preload: async (page) => {
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
  },
};
