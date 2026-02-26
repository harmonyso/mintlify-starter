import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "working-with-ai-agents";

async function goToAgents(p) {
  await p.goto(`${BASE_URL}/agents`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2500));
}

// Clicks the i-th table row on the agents list and waits for navigation to an agent page.
async function openAgentRow(p, i) {
  const row = p.locator("table tbody tr").nth(i);
  if (!(await row.isVisible().catch(() => false))) return false;
  await row.click();
  await p.waitForURL((u) => u.pathname.match(/\/agents\/.+/), { timeout: 8000 }).catch(() => {});
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 1500));
  return true;
}

// Iterates agents in the table until checkFn(page) returns true.
// Returns true when found; false if no matching agent found in the first `limit` rows.
async function findAgentWith(p, checkFn, limit = 10) {
  await goToAgents(p);
  const rowCount = await p.locator("table tbody tr").count().catch(() => 0);
  for (let i = 0; i < Math.min(rowCount, limit); i++) {
    // Re-navigate to agents list before each click (rows are stale after navigation)
    await goToAgents(p);
    if (!(await openAgentRow(p, i))) continue;
    if (await checkFn(p)) return true;
  }
  return false;
}

export const targets = [
  {
    // Page / PageTitle render as div[data-slot="page"] / h2[data-slot="page-title"], not main/h1
    type: "element",
    selector: '[data-slot="page"]:has([data-slot="page-title"]:has-text("Agents"))',
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
      await goToAgents(p);
      await openAgentRow(p, 0);
    },
  },
  {
    // AgentConfigPanel renders a Card with h2 "Agent Configurations" (only for certain agent templates)
    type: "element",
    selector: '[data-slot="card"]:has(h2:has-text("Agent Configurations"))',
    filename: "agent-configuration-panel.png",
    dir,
    path: "agents",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await findAgentWith(p, async (page) =>
        page
          .locator('[data-slot="card"]:has(h2:has-text("Agent Configurations"))')
          .isVisible()
          .catch(() => false),
      );
    },
  },
  {
    // Dialog title is "Agent Run: {workflowName}"; Run button is only shown when hasInstance && canRun
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Agent Run"))',
    filename: "agent-run-dialog.png",
    dir,
    path: "agents",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await findAgentWith(p, async (page) => {
        const runBtn = page.getByRole("button", { name: /^Run$/i }).first();
        if (
          (await runBtn.isVisible().catch(() => false)) &&
          (await runBtn.isEnabled().catch(() => false))
        ) {
          await runBtn.click();
          await new Promise((r) => setTimeout(r, 1000));
          return page
            .locator('[role="dialog"]:has(h2:has-text("Agent Run"))')
            .isVisible()
            .catch(() => false);
        }
        return false;
      });
    },
  },
  {
    // Run details page renders h2 "Run details" (no data-run-step attributes exist)
    type: "element",
    selector: '[data-slot="page"]:has(h2:has-text("Run details"))',
    filename: "agent-run-details.png",
    dir,
    path: "agents",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await findAgentWith(p, async (page) => {
        // Go to the "Runs history" tab
        const runsTab = page.getByRole("tab", { name: /Runs/i }).first();
        if (!(await runsTab.isVisible().catch(() => false))) return false;
        await runsTab.click();
        await new Promise((r) => setTimeout(r, 1500));
        // Click the first run row in the history table
        const runRow = page.locator("table tbody tr").first();
        if (!(await runRow.isVisible().catch(() => false))) return false;
        await runRow.click();
        await page.waitForURL((u) => u.pathname.match(/\/runs\/.+/), { timeout: 8000 }).catch(() => {});
        await page.waitForLoadState("networkidle");
        await new Promise((r) => setTimeout(r, 2000));
        return page
          .locator('[data-slot="page"]:has(h2:has-text("Run details"))')
          .isVisible()
          .catch(() => false);
      });
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
