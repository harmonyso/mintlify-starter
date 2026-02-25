import { SYSTEM_DASHBOARD_PATH } from "../_utilities/screenshot-shared.mjs";

const dir = "analyzing-asset-and-automation-metrics";

/**
 * Scroll a dashboard widget matching titleText into the viewport and pause so
 * charts finish rendering before we record the narration frame.
 */
async function scrollToWidget(page, titleText) {
  const widget = page.locator(".dashboard-widget").filter({ hasText: titleText }).first();
  if (await widget.isVisible().catch(() => false)) {
    await widget.scrollIntoViewIfNeeded();
  } else {
    await page.getByText(titleText, { exact: false }).first().scrollIntoViewIfNeeded().catch(() => { });
  }
  await new Promise((r) => setTimeout(r, 800));
}

export const targets = [
  {
    title: "Asset Breakdown by Compliance",
    filename: "asset-compliance-widget.png",
    dir,
    path: SYSTEM_DASHBOARD_PATH,
    zoomSelector: '.dashboard-widget:has-text("Asset Breakdown by Compliance")',
    videoPrepare: async (page) => {
      // First step: wait for the dashboard and all charts to fully paint
      await page.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      await scrollToWidget(page, "Asset Breakdown by Compliance");
    },
  },
  {
    title: "Asset Breakdown by Vendor",
    filename: "asset-distribution-widgets.png",
    dir,
    videoPrepare: async (page) => {
      await scrollToWidget(page, "Asset Breakdown by Vendor");
    },
  },
  {
    title: "Asset Breakdown by Model Family",
    filename: "asset-distribution-widgets.png",
    dir,
    videoPrepare: async (page) => {
      await scrollToWidget(page, "Asset Breakdown by Model Family");
    },
  },
  {
    title: "Asset Breakdown by Status",
    filename: "asset-status-widget.png",
    dir,
    videoPrepare: async (page) => {
      await scrollToWidget(page, "Asset Breakdown by Status");
    },
  },
  {
    title: "Asset Breakdown by Age",
    filename: "asset-age-chart.png",
    dir,
    videoPrepare: async (page) => {
      await scrollToWidget(page, "Asset Breakdown by Age");
    },
  },
  {
    title: "Software Breakdown by Status",
    filename: "software-status-chart.png",
    dir,
    videoPrepare: async (page) => {
      await scrollToWidget(page, "Software Breakdown by Status");
    },
  },
  {
    title: "AI vs Human Resolution",
    filename: "ai-vs-human-resolution.png",
    dir,
    videoPrepare: async (page) => {
      await scrollToWidget(page, "AI vs Human Resolution");
    },
  },
  {
    title: "Agent Runs by Status",
    filename: "agent-runs-status.png",
    dir,
    videoPrepare: async (page) => {
      await scrollToWidget(page, "Agent Runs by Status");
    },
  },
  {
    title: "Workflow Runs by Status",
    filename: "workflow-runs-status.png",
    dir,
    videoPrepare: async (page) => {
      await scrollToWidget(page, "Workflow Runs by Status");
    },
  },
];

export const videoConfig = {
  path: "dashboard/system-dashboard",
  /** Wait for the dashboard to fully load and charts to render before recording starts. */
  preload: async (page) => {
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
    // Scroll to top so we always start from the beginning of the dashboard
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await new Promise((r) => setTimeout(r, 500));
  },
};
