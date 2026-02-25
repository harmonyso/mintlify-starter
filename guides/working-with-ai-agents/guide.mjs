import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "working-with-ai-agents";

async function goToAgents(p) {
  await p.goto(`${BASE_URL}/agents`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2500));
}

async function openFirstAgent(p) {
  await goToAgents(p);
  const agentItem = p.locator('[data-agent-card] a, table tbody tr a, [class*="agent-card"] a').first();
  if (await agentItem.isVisible().catch(() => false)) {
    await agentItem.click();
  } else {
    // Try clicking a row
    const row = p.locator("table tbody tr").first();
    if (await row.isVisible().catch(() => false)) await row.click();
  }
  await p.waitForURL((u) => u.pathname.match(/\/agents\/.+/), { timeout: 10000 }).catch(() => {});
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2000));
}

export const targets = [
  {
    type: "element",
    selector: 'main:has(h1:has-text("Agents")), div:has([data-agent-card]):has(button[aria-label*="view"]), div:has(table:has(th:has-text("Status"))):has(h1)',
    filename: "agents-list.png",
    dir,
    path: "agents",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToAgents(p);
    },
  },
  {
    type: "element",
    selector: 'div:has([role="tablist"]):has([role="tab"]:has-text("Overview")):has([role="tab"]:has-text("Runs"))',
    filename: "agent-detail-tabs.png",
    dir,
    path: "agents",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await openFirstAgent(p);
    },
  },
  {
    type: "element",
    selector: 'div:has(h2:has-text("Run Schedule")), aside:has([data-agent-config]), div:has(h3:has-text("Schedule")):has([role="combobox"])',
    filename: "agent-configuration-panel.png",
    dir,
    path: "agents",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await openFirstAgent(p);
      const configSection = p.locator('h2:has-text("Run Schedule"), h3:has-text("Schedule")').first();
      await configSection.scrollIntoViewIfNeeded().catch(() => null);
      await new Promise((r) => setTimeout(r, 500));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Run")):has(button[type="submit"]:has-text("Run")), [role="dialog"]:has([data-agent-run-form])',
    filename: "agent-run-dialog.png",
    dir,
    path: "agents",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await openFirstAgent(p);
      const runBtn = p.getByRole("button", { name: /^Run$/i }).first();
      if (await runBtn.isVisible().catch(() => false)) {
        await runBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  },
  {
    type: "element",
    selector: 'main:has([data-run-step]), div:has(h1:has-text("Run")):has([data-step-status]), div:has(h2:has-text("Steps")):has([data-status])',
    filename: "agent-run-details.png",
    dir,
    path: "agents",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await openFirstAgent(p);
      // Go to the Runs history tab
      const runsTab = p.getByRole("tab", { name: /Runs/i }).first();
      if (await runsTab.isVisible().catch(() => false)) {
        await runsTab.click();
        await new Promise((r) => setTimeout(r, 1500));
        // Click the first completed run
        const runRow = p.locator("table tbody tr").first();
        if (await runRow.isVisible().catch(() => false)) {
          await runRow.click();
          await p.waitForURL((u) => u.pathname.match(/\/runs\/.+/), { timeout: 8000 }).catch(() => {});
          await p.waitForLoadState("networkidle");
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    },
  },
];

export const videoConfig = {
  path: "agents",
  preload: async (page) => {
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
  },
};
