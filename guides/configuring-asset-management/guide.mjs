const dir = "configuring-asset-management";

export const targets = [
  {
    type: "element",
    selector: 'div:has(h2:has-text("Asset notifications"))',
    filename: "eol-notifications.png",
    dir,
    path: "settings/asset-management",
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Create new policy"))',
    filename: "eol-policy-form.png",
    dir,
    path: "settings/asset-management",
    prepare: async (p) => {
      const createBtn = p.getByRole("button", { name: "Create policy" }).first();
      await createBtn.scrollIntoViewIfNeeded().catch(() => null);
      await new Promise((r) => setTimeout(r, 300));
      await createBtn.click().catch(() => null);
      await new Promise((r) => setTimeout(r, 1500));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(label:has-text("Stock threshold"))',
    filename: "low-stock-alert-form.png",
    dir,
    path: "settings/asset-management",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 500));
      const createBtn = p.getByRole("button", { name: "Create alert" }).first();
      await createBtn.scrollIntoViewIfNeeded().catch(() => null);
      await new Promise((r) => setTimeout(r, 300));
      await createBtn.click().catch(() => null);
      await new Promise((r) => setTimeout(r, 1500));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Discovery policy"))',
    filename: "discovery-policy.png",
    dir,
    path: "settings/asset-management",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 500));
      const editBtn = p.locator('button[title*="Edit policy"]').first();
      await editBtn.scrollIntoViewIfNeeded().catch(() => null);
      await new Promise((r) => setTimeout(r, 300));
      await editBtn.click().catch(() => null);
      await new Promise((r) => setTimeout(r, 1500));
    },
  },
];
