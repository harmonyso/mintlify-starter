import { SYSTEM_DASHBOARD_PATH } from "../_utilities/screenshot-shared.mjs";

const dir = "analyzing-service-desk-metrics";

export const targets = [
  { type: "region", filename: "overview-widgets.png", dir, path: SYSTEM_DASHBOARD_PATH, clip: { x: 0, y: 0, width: 1400, height: 280 } },
  { title: "Opened vs Resolved Tickets", filename: "opened-vs-resolved.png", dir },
  { title: "Response vs Resolution Time", filename: "response-vs-resolution.png", dir },
  { title: "SLA Compliance Trend", filename: "sla-compliance-chart.png", dir },
  { title: "Ticket Breakdown by Status", filename: "breakdown-status.png", dir },
  { title: "Ticket Breakdown by Priority", filename: "breakdown-priority.png", dir },
  { title: "User satisfaction score", filename: "user-satisfaction.png", dir },
];
