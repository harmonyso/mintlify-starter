import { clickAgentWithSchedule, clickAgentWithApprovals } from "../screenshot-helpers.mjs";
import { SYSTEM_DASHBOARD_PATH } from "../screenshot-shared.mjs";

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
