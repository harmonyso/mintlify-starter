import { clickAgentWithSchedule, clickAgentWithApprovals } from "../_utilities/screenshots/screenshot-helpers.mjs";
import { SYSTEM_DASHBOARD_PATH } from "../_utilities/screenshot-shared.mjs";

const dir = "configuring-ai-agents";

export const targets = [
  {
    type: "element",
    selector: 'div:has(h2:has-text("Agent Configurations"))',
    filename: "agent-config-panel.png",
    dir,
    path: "agents",
    prepare: clickAgentWithSchedule,
  },
  {
    type: "element",
    selector: 'div:has(h3:has-text("Run Schedule"))',
    filename: "agent-schedule.png",
    dir,
    path: "agents",
    prepare: clickAgentWithSchedule,
  },
  {
    type: "element",
    selector: 'div:has(label:has-text("Approval logic"))',
    filename: "agent-approvals.png",
    dir,
    path: "agents",
    prepare: clickAgentWithApprovals,
  },
  {
    type: "element",
    selector: 'div[class*="absolute"][class*="right-0"]:has(h2:has-text("Agent Configurations"))',
    filename: "agent-provisioning.png",
    dir,
    path: "agents",
    prepare: async (p) => {
      await p.getByRole("tab", { name: "Provisioning" }).click().catch(() => null);
      await new Promise((r) => setTimeout(r, 1500));
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
