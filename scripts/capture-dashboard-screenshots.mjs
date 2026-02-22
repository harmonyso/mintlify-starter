#!/usr/bin/env node
/**
 * Playwright script to capture dashboard widget screenshots for docs.
 * Run with: pnpm run screenshots:dashboard (from mintlify-docs/)
 *
 * Uses a persistent Chrome profile so you only need to log in once:
 *   pnpm run screenshots:dashboard:login   # First time: opens browser, log in, then close
 *   pnpm run screenshots:dashboard         # Subsequent runs: uses saved session
 *   pnpm run screenshots:dashboard -- --force   # Overwrite existing screenshots
 *   pnpm run screenshots:dashboard -- --guides=analyzing-service-desk-metrics   # Only capture for selected guide(s)
 *
 * Guide names (for --guides): analyzing-asset-and-automation-metrics, analyzing-service-desk-metrics, configuring-ai-agents, configuring-asset-management, configuring-automation-and-sla, configuring-integration-sync-and-credentials, connecting-and-managing-integrations, creating-and-managing-custom-dashboards, getting-started-with-harmony-dashboard, managing-asset-organization-and-importing, managing-asset-views-and-details
 *
 * Prerequisites:
 * - Frontend running at BASE_URL (default localhost:5173 for all 8 widgets; demo.harmony.io yields 4 until deployed)
 * - Widgets on default dashboard: asset-compliance, software-breakdown, etc.
 */

import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { access } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const exists = async (p) => access(p).then(() => true).catch(() => false);

async function hideImpersonationBanner(page) {
  await new Promise((r) => setTimeout(r, 200));
  await page.evaluate(() => {
    const sel = "[data-impersonation-banner]";
    let banner = document.querySelector(sel);
    if (!banner) {
      const el = Array.from(document.querySelectorAll("*")).find((e) => e.textContent?.includes("IMPERSONATION MODE ACTIVE"));
      banner = el?.closest("[class*='bg-red'], [class*='bg-red-600']");
    }
    if (banner) banner.style.setProperty("display", "none");
  });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = join(__dirname, "..");
const IMAGES_GUIDES = join(DOCS_ROOT, "images/guides");
const PROFILE_DIR = join(DOCS_ROOT, ".playwright-dashboard-profile");

// Default localhost: frontend must run locally to capture all 8 (default layout includes extra widgets).
// Use BASE_URL=https://demo.harmony.io for demo—only 4 widgets until demo is deployed with updated layout.
const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const DASHBOARD_PATH = "/dashboard";
const SYSTEM_DASHBOARD_PATH = "/dashboard/system-dashboard";
const needsLogin = process.argv.includes("--login");
const forceOverwrite = process.argv.includes("--force");
const useHeaded = process.argv.includes("--headed");
const guidesArg = process.argv.find((a) => a.startsWith("--guides="));
const selectedGuides = guidesArg ? guidesArg.replace("--guides=", "").split(",").map((s) => s.trim()) : null;

/** Navigate to /agents and click an agent that has Run Schedule (e.g. Asset Acknowledgment, Low Storage). */
async function clickAgentWithSchedule(page) {
  const scheduleAgentNames = [
    "Asset Acknowledgment",
    "Low Storage Monitoring",
    "Device Uptime Monitoring",
    "License Expiration Monitoring",
    "Software Compliance Report",
    "Asset Ownership",
  ];
  await navigateAndClickAgent(page, scheduleAgentNames);
}

/** Navigate to /agents and click an agent that has Approval logic (e.g. Application Access, Employee Termination). */
async function clickAgentWithApprovals(page) {
  const approvalAgentNames = [
    "Application Access Request",
    "Application Access",
    "Employee Account Termination",
    "Employee Termination",
    "IDP Group Management",
    "Provision Application Access",
    "Revoke Application Access",
  ];
  await navigateAndClickAgent(page, approvalAgentNames);
}

async function navigateAndClickAgent(page, agentNames) {
  const base = process.env.BASE_URL || "http://localhost:5173";
  await page.goto(`${base}/agents`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2000));
  await hideImpersonationBanner(page);
  for (const name of agentNames) {
    const link = page.locator(`a[href*="/agents/"]`).filter({ hasText: name }).first();
    if (await link.isVisible().catch(() => false)) {
      await link.click();
      await page.waitForURL((u) => u.pathname.includes("/agents/") && u.pathname.includes("/v2"), { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 4000));
      return;
    }
    const card = page.locator(`[class*="grid"] .cursor-pointer`).filter({ hasText: name }).first();
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.waitForURL((u) => u.pathname.includes("/agents/") && u.pathname.includes("/v2"), { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 4000));
      return;
    }
    const row = page.locator("table tbody tr.cursor-pointer").filter({ hasText: name }).first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await page.waitForURL((u) => u.pathname.includes("/agents/") && u.pathname.includes("/v2"), { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 4000));
      return;
    }
  }
  console.log("⚠ No matching agent found; trying first agent");
  const fallbacks = [
    page.locator('a[href*="/agents/"]').first(),
    page.locator('[class*="grid"] .cursor-pointer').first(),
    page.locator("table tbody tr.cursor-pointer").first(),
    page.getByText(/Application Access Request|Asset Acknowledgment|Asset Ownership|Device Recovery|Low Storage|New Hire Onboarding/).first(),
  ];
  for (const el of fallbacks) {
    try {
      await el.click({ timeout: 5000 });
      await page.waitForURL((u) => u.pathname.includes("/agents/") && u.pathname.includes("/v2"), { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 4000));
      return;
    } catch {
      /* try next */
    }
  }
}

/** Navigate to first desk's Automation tab (/settings/desks/$deskId/automation). */
async function navigateToDeskAutomation(page) {
  const base = process.env.BASE_URL || "http://localhost:5173";
  await page.goto(`${base}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2000));
  const firstDesk = page.locator("table tbody tr.cursor-pointer").first();
  await firstDesk.click().catch(() => page.locator('a[href*="/settings/desks/"]').first().click());
  await page.waitForURL((u) => u.pathname.match(/\/settings\/desks\/[^/]+\/?$/), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.getByRole("link", { name: "Automation" }).first().click();
  await page.waitForURL((u) => u.pathname.includes("/automation"), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 2000));
  await hideImpersonationBanner(page);
}

/** Navigate to first desk's SLA tab (/settings/desks/$deskId/sla). */
async function navigateToDeskSla(page) {
  const base = process.env.BASE_URL || "http://localhost:5173";
  await page.goto(`${base}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2000));
  const firstDesk = page.locator("table tbody tr.cursor-pointer").first();
  await firstDesk.click().catch(() => page.locator('a[href*="/settings/desks/"]').first().click());
  await page.waitForURL((u) => u.pathname.match(/\/settings\/desks\/[^/]+\/?$/), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.getByRole("link", { name: "SLAs" }).first().click();
  await page.waitForURL((u) => u.pathname.includes("/sla"), { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 2000));
  await hideImpersonationBanner(page);
}

// Screenshot targets: { title, filename, dir } for widgets, or { type: "region", filename, dir, clip } for regions
const SCREENSHOT_TARGETS = [
  // analyzing-asset-and-automation-metrics
  { title: "Asset Breakdown by Compliance", filename: "asset-compliance-widget.png", dir: "analyzing-asset-and-automation-metrics" },
  { title: "Asset Breakdown by Vendor", filename: "asset-distribution-widgets.png", dir: "analyzing-asset-and-automation-metrics" },
  { title: "Asset Breakdown by Model Family", filename: "asset-distribution-widgets.png", dir: "analyzing-asset-and-automation-metrics" },
  { title: "Asset Breakdown by Status", filename: "asset-status-widget.png", dir: "analyzing-asset-and-automation-metrics" },
  { title: "Asset Breakdown by Age", filename: "asset-age-chart.png", dir: "analyzing-asset-and-automation-metrics" },
  { title: "Software Breakdown by Status", filename: "software-status-chart.png", dir: "analyzing-asset-and-automation-metrics" },
  { title: "AI vs Human Resolution", filename: "ai-vs-human-resolution.png", dir: "analyzing-asset-and-automation-metrics" },
  { title: "Agent Runs by Status", filename: "agent-runs-status.png", dir: "analyzing-asset-and-automation-metrics" },
  { title: "Workflow Runs by Status", filename: "workflow-runs-status.png", dir: "analyzing-asset-and-automation-metrics" },
  // analyzing-service-desk-metrics
  { type: "region", filename: "overview-widgets.png", dir: "analyzing-service-desk-metrics", clip: { x: 0, y: 0, width: 1400, height: 280 } },
  { title: "Opened vs Resolved Tickets", filename: "opened-vs-resolved.png", dir: "analyzing-service-desk-metrics" },
  { title: "Response vs Resolution Time", filename: "response-vs-resolution.png", dir: "analyzing-service-desk-metrics" },
  { title: "SLA Compliance Trend", filename: "sla-compliance-chart.png", dir: "analyzing-service-desk-metrics" },
  { title: "Ticket Breakdown by Status", filename: "breakdown-status.png", dir: "analyzing-service-desk-metrics" },
  { title: "Ticket Breakdown by Priority", filename: "breakdown-priority.png", dir: "analyzing-service-desk-metrics" },
  { title: "User satisfaction score", filename: "user-satisfaction.png", dir: "analyzing-service-desk-metrics" },
  // configuring-ai-agents (path uses agents flow: /agents → click first → agent detail)
  {
    type: "element",
    selector: 'div:has(h2:has-text("Agent Configurations"))',
    filename: "agent-config-panel.png",
    dir: "configuring-ai-agents",
    path: "agents",
    prepare: clickAgentWithSchedule,
  },
  {
    type: "element",
    selector: 'div:has(h3:has-text("Run Schedule"))',
    filename: "agent-schedule.png",
    dir: "configuring-ai-agents",
    path: "agents",
    prepare: clickAgentWithSchedule,
  },
  {
    type: "element",
    selector: 'div:has(label:has-text("Approval logic"))',
    filename: "agent-approvals.png",
    dir: "configuring-ai-agents",
    path: "agents",
    prepare: clickAgentWithApprovals,
  },
  {
    type: "element",
    selector: 'div[class*="absolute"][class*="right-0"]:has(h2:has-text("Agent Configurations"))',
    filename: "agent-provisioning.png",
    dir: "configuring-ai-agents",
    path: "agents",
    prepare: async (p) => {
      await p.getByRole("tab", { name: "Provisioning" }).click().catch(() => null);
      await new Promise((r) => setTimeout(r, 1500));
    },
  },
  // configuring-asset-management (path: /settings/asset-management)
  {
    type: "element",
    selector: 'div:has(h2:has-text("Asset notifications"))',
    filename: "eol-notifications.png",
    dir: "configuring-asset-management",
    path: "settings/asset-management",
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Create new policy"))',
    filename: "eol-policy-form.png",
    dir: "configuring-asset-management",
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
    dir: "configuring-asset-management",
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
    dir: "configuring-asset-management",
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
  // configuring-automation-and-sla (path: /settings/desks → click first desk → Automation or SLA tab)
  {
    type: "element",
    selector: 'div:has(h2:has-text("Ticket assignment"))',
    filename: "auto-assignment.png",
    dir: "configuring-automation-and-sla",
    path: "settings/desks",
    prepare: navigateToDeskAutomation,
  },
  {
    type: "element",
    selector: 'div:has(h2:has-text("Ticket closing"))',
    filename: "auto-close-settings.png",
    dir: "configuring-automation-and-sla",
    path: "settings/desks",
    prepare: navigateToDeskAutomation,
  },
  {
    type: "element",
    selector: 'div:has(h2:has-text("SLA targets"))',
    filename: "sla-policies.png",
    dir: "configuring-automation-and-sla",
    path: "settings/desks",
    prepare: navigateToDeskSla,
  },
  // configuring-integration-sync-and-credentials (path: /settings/integrations)
  {
    type: "region",
    filename: "integration-status.png",
    dir: "configuring-integration-sync-and-credentials",
    path: "settings/integrations",
    clip: { x: 0, y: 0, width: 1400, height: 420 },
  },
  {
    type: "element",
    selector: 'div:has(label:has-text("Bidirectional synchronization"))',
    filename: "sync-toggle.png",
    dir: "configuring-integration-sync-and-credentials",
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
    dir: "configuring-integration-sync-and-credentials",
    path: "settings/integrations",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 500));
      // Try integrations with credential forms first (Freshservice, Okta, Solarwinds, etc.)
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
  // connecting-and-managing-integrations (path: /settings/integrations)
  {
    type: "region",
    filename: "integrations-connect.png",
    dir: "connecting-and-managing-integrations",
    path: "settings/integrations",
    clip: { x: 0, y: 0, width: 1400, height: 420 },
  },
  {
    type: "element",
    selector: '[role="dialog"], [data-slot="dialog-content"]',
    filename: "integration-config-form.png",
    dir: "connecting-and-managing-integrations",
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
    dir: "connecting-and-managing-integrations",
    path: "settings/integrations",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 500));
      // Click a card for an integration that supports multiple instances (Slack, Okta, Confluence, etc.)
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
  // getting-started-with-harmony-dashboard (path: /dashboard)
  {
    type: "region",
    filename: "sidebar-sections.png",
    dir: "getting-started-with-harmony-dashboard",
    path: SYSTEM_DASHBOARD_PATH,
    clip: { x: 0, y: 0, width: 280, height: 900 },
  },
  {
    type: "region",
    filename: "dashboard-home.png",
    dir: "getting-started-with-harmony-dashboard",
    path: SYSTEM_DASHBOARD_PATH,
    clip: { x: 280, y: 0, width: 1120, height: 900 },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has([data-slot="command"])',
    filename: "command-palette.png",
    dir: "getting-started-with-harmony-dashboard",
    path: SYSTEM_DASHBOARD_PATH,
    prepare: async (p) => {
      await p.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
      await new Promise((r) => setTimeout(r, 800));
      await p.getByPlaceholder("Search for commands...").fill("dashboard").catch(() => null);
      await new Promise((r) => setTimeout(r, 500));
    },
  },
  // creating-and-managing-custom-dashboards (path: /dashboard or system-dashboard)
  {
    type: "element",
    selector: 'div:has(button:has-text("Create dashboard"))',
    filename: "dashboard-dropdown.png",
    dir: "creating-and-managing-custom-dashboards",
    path: SYSTEM_DASHBOARD_PATH,
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 400));
      const titleBtn = p.locator("button").filter({ has: p.locator("h2") }).first();
      await titleBtn.waitFor({ state: "visible", timeout: 15000 });
      await titleBtn.click();
      await new Promise((r) => setTimeout(r, 800));
    },
  },
  {
    type: "element",
    selector: 'div:has(button:has-text("Delete"))',
    filename: "dashboard-edit-delete.png",
    dir: "creating-and-managing-custom-dashboards",
    path: SYSTEM_DASHBOARD_PATH,
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 400));
      const titleBtn = p.locator("button").filter({ has: p.locator("h2") }).first();
      await titleBtn.waitFor({ state: "visible", timeout: 15000 });
      await titleBtn.click();
      await new Promise((r) => setTimeout(r, 600));
      const dropdown = p.locator('div:has(button:has-text("Create dashboard"))');
      const firstRow = dropdown.locator('div.flex.w-full.items-center').filter({ has: p.getByText("Dashboard", { exact: true }) }).first();
      const copyBtn = firstRow.locator('div.flex.gap-2').locator('button').nth(1);
      await copyBtn.click();
      await p.waitForURL((u) => u.pathname.includes("/dashboard/") && !u.pathname.endsWith("/system-dashboard"), { timeout: 8000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
      await p.getByRole("button", { name: "Edit" }).click();
      await new Promise((r) => setTimeout(r, 800));
    },
  },
  // managing-asset-organization-and-importing (path: /assets or /assets/$assetId)
  {
    type: "element",
    selector: 'div:has([data-table-search="true"]):has(button:has-text("Import assets"))',
    filename: "assets-toolbar-export.png",
    dir: "managing-asset-organization-and-importing",
    path: "assets",
  },
  {
    type: "element",
    selector: 'div:has(span:has-text("selected")):has(button:has-text("Change location"))',
    filename: "asset-bulk-actions.png",
    dir: "managing-asset-organization-and-importing",
    path: "assets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      const base = process.env.BASE_URL || "http://localhost:5173";
      await p.goto(`${base}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      const checkbox = p.locator('table tbody tr').first().locator('input[type="checkbox"], [role="checkbox"]').first();
      await checkbox.click().catch(() => p.locator('table tbody tr td').first().click());
      await new Promise((r) => setTimeout(r, 800));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Import assets"))',
    filename: "asset-import-dialog.png",
    dir: "managing-asset-organization-and-importing",
    path: "assets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      const base = process.env.BASE_URL || "http://localhost:5173";
      if (!p.url().endsWith("/assets") && !p.url().includes("/assets?")) {
        await p.goto(`${base}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 2000));
      }
      const checkbox = p.locator('table tbody tr').first().locator('input[type="checkbox"], [role="checkbox"]').first();
      if (await checkbox.isVisible().catch(() => false)) {
        const isChecked = await checkbox.isChecked().catch(() => false);
        if (isChecked) await checkbox.click();
        await new Promise((r) => setTimeout(r, 500));
      }
      await p.getByRole("button", { name: /Import assets/i }).click();
      await new Promise((r) => setTimeout(r, 1000));
    },
  },
  {
    type: "element",
    selector: 'div:has(h3:has-text("Asset details")):has(div:has-text("Ownership"))',
    filename: "asset-detail-org-fields.png",
    dir: "managing-asset-organization-and-importing",
    path: "assets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      const base = process.env.BASE_URL || "http://localhost:5173";
      await p.goto(`${base}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      const row = p.locator('table tbody tr.cursor-pointer').first();
      await row.waitFor({ state: "visible", timeout: 10000 });
      await row.click();
      await p.waitForURL((u) => u.pathname.match(/\/assets\/[^/]+/), { timeout: 10000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
    },
  },
  // managing-asset-views-and-details (path: /assets or /assets/$assetId)
  {
    type: "element",
    selector: 'div.overflow-auto.border-t:has(table:has(th:has-text("Availability")))',
    filename: "warehouse-view.png",
    dir: "managing-asset-views-and-details",
    path: "assets",
    clipToContent: true,
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      const base = process.env.BASE_URL || "http://localhost:5173";
      await p.goto(`${base}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await p.waitForSelector('[data-table-search="true"], button:has-text("Import assets")', { state: "visible", timeout: 15000 });
      await new Promise((r) => setTimeout(r, 2000));
      const warehouseBtn = p.locator('[data-slot="toggle-group"] button').nth(1);
      await warehouseBtn.waitFor({ state: "visible", timeout: 15000 });
      await warehouseBtn.click();
      await new Promise((r) => setTimeout(r, 3000));
    },
  },
  {
    type: "element",
    selector: 'div.grid:has(div:has-text("Unassigned assets")):has(div:has-text("Assets reached EOL"))',
    filename: "asset-quick-filters.png",
    dir: "managing-asset-views-and-details",
    path: "assets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      const base = process.env.BASE_URL || "http://localhost:5173";
      await p.goto(`${base}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      if (await p.getByRole("button", { name: "List view" }).isVisible().catch(() => false)) {
        await p.getByRole("button", { name: "List view" }).click();
        await new Promise((r) => setTimeout(r, 2000));
      }
    },
  },
  {
    type: "element",
    selector: '[id="overview"]',
    filename: "asset-detail-overview.png",
    dir: "managing-asset-views-and-details",
    path: "assets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      const base = process.env.BASE_URL || "http://localhost:5173";
      await p.goto(`${base}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 3000));
      if (await p.locator('[data-slot="toggle-group"] button').first().isVisible().catch(() => false)) {
        await p.locator('[data-slot="toggle-group"] button').first().click();
        await new Promise((r) => setTimeout(r, 1500));
      }
      const row = p.locator('table tbody tr[data-row-index]').first();
      await row.waitFor({ state: "visible", timeout: 15000 });
      await row.click();
      await p.waitForURL((u) => u.pathname.match(/\/assets\/[^/]+/), { timeout: 15000 });
      await p.waitForSelector('[id="overview"]', { state: "visible", timeout: 15000 });
      await p.locator('[id="overview"]').first().scrollIntoViewIfNeeded();
      await new Promise((r) => setTimeout(r, 500));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("Mark asset as retired"))',
    filename: "retirement-modal.png",
    dir: "managing-asset-views-and-details",
    path: "assets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      const base = process.env.BASE_URL || "http://localhost:5173";
      await p.goto(`${base}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      const row = p.locator('table tbody tr.cursor-pointer').first();
      await row.waitFor({ state: "visible", timeout: 10000 });
      await row.click();
      await p.waitForURL((u) => u.pathname.match(/\/assets\/[^/]+/), { timeout: 10000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
      await p.getByRole("combobox").first().click();
      await new Promise((r) => setTimeout(r, 500));
      await p.getByRole("option", { name: "Retired" }).click();
      await new Promise((r) => setTimeout(r, 1000));
    },
  },
  {
    type: "element",
    selector: '[data-slot="sheet-content"]:has(h2:has-text("Activity"))',
    filename: "activity-log-sheet.png",
    dir: "managing-asset-views-and-details",
    path: "assets",
    clipToContent: true,
    contentEndSelector: 'div.overflow-y-auto div.flex.gap-3',
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      const base = process.env.BASE_URL || "http://localhost:5173";
      await p.goto(`${base}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 3000));
      const row = p.locator('table tbody tr.cursor-pointer').first();
      await row.waitFor({ state: "visible", timeout: 10000 });
      await row.click();
      await p.waitForURL((u) => u.pathname.match(/\/assets\/[^/]+/), { timeout: 10000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 2000));
      await p.getByRole("button", { name: "Activity log" }).click();
      await new Promise((r) => setTimeout(r, 1500));
    },
  },
];

async function main() {
  await mkdir(IMAGES_GUIDES, { recursive: true });
  console.log(`Screenshots will be saved to: ${IMAGES_GUIDES}/*\n`);

  if (needsLogin) {
    console.log("🔐 Login mode: Browser will open. Log in to Harmony, then close the browser.\n");
  }

  const headless = !needsLogin && !useHeaded;
  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless,
      viewport: { width: 1400, height: 900 },
      ignoreHTTPSErrors: true,
      args: headless ? ["--disable-blink-features=AutomationControlled"] : [], // Hide automation banner when headless
    });
  } catch (e) {
    if (e.message?.includes("Executable doesn't exist")) {
      console.error("\n❌ Playwright browsers not installed.");
      console.error("   Run from mintlify-docs/:  pnpm exec playwright install chromium");
      console.error("   Then run this script again (ideally from your system terminal, not Cursor sandbox).\n");
      process.exit(1);
    }
    throw e;
  }

  const page = context.pages()[0] || (await context.newPage());

  try {
    console.log(`Navigating to ${BASE_URL}${DASHBOARD_PATH}...`);
    await page.goto(`${BASE_URL}${DASHBOARD_PATH}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 5000)); // Let redirects (e.g. to login) complete

    const isLoginPage =
      (await page.locator("form[action*='login'], [data-testid=login], input[type='password']").count()) > 0;
    if (isLoginPage) {
      if (needsLogin) {
        console.log("👉 Log in via the open browser. You have 15 minutes. When you reach the dashboard, the script will finish.");
        await page.waitForURL((url) => url.pathname.includes("dashboard"), { timeout: 15 * 60 * 1000 });
        console.log("✓ Logged in. Profile saved. Run without --login next time.");
      } else {
        console.error("\n❌ Detected login page. Run with --login to save your session:");
        console.error("   pnpm run screenshots:dashboard:login\n");
        process.exit(1);
      }
    } else if (needsLogin) {
      console.log("✓ Already logged in. Profile saved. You can close the browser.");
      await new Promise((r) => setTimeout(r, 5000));
    }

    if (needsLogin) {
      return; // Skip screenshot capture in login-only mode
    }

    const captured = new Set();
    const skipped = [];

    const captureTarget = async (target, page) => {
      const { filename, dir } = target;
      const key = `${dir}/${filename}`;
      if (captured.has(key)) return;

      const outDir = join(IMAGES_GUIDES, dir);
      await mkdir(outDir, { recursive: true });
      const filepath = join(outDir, filename);
      if (!forceOverwrite && (await exists(filepath))) {
        console.log(`○ ${dir}/${filename} (exists, skipped)`);
        captured.add(key);
        return;
      }

      await hideImpersonationBanner(page);
      if (target.type === "region") {
        await page.screenshot({ path: filepath, clip: target.clip });
        console.log(`✓ ${dir}/${filename}`);
        captured.add(key);
      } else if (target.type === "element") {
        if (typeof target.prepare === "function") {
          await target.prepare(page);
          await hideImpersonationBanner(page);
        }
        const el = page.locator(target.selector).first();
        const isVisible = await el.isVisible().catch(() => false);
        if (isVisible) {
          if (target.clipToContent) {
            const box = await el.boundingBox();
            const contentEndSel = target.contentEndSelector ?? 'div.sticky.border-t, div:has-text("Showing")';
            const contentEnd = target.contentEndSelector ? el.locator(contentEndSel).last() : el.locator(contentEndSel).first();
            const endBox = await contentEnd.boundingBox().catch(() => null);
            if (box) {
              const clipHeight = endBox
                ? Math.ceil(endBox.y + endBox.height - box.y) + 16
                : Math.min(box.height, 800);
              await page.screenshot({
                path: filepath,
                clip: {
                  x: Math.round(box.x),
                  y: Math.round(box.y),
                  width: Math.round(box.width),
                  height: Math.min(Math.ceil(clipHeight), box.height + 120),
                },
              });
            } else {
              await el.screenshot({ path: filepath });
            }
          } else {
            await el.screenshot({ path: filepath });
          }
          console.log(`✓ ${dir}/${filename}`);
          captured.add(key);
        } else {
          console.log(`✗ ${dir}/${filename} (selector not visible: ${target.selector})`);
        }
      } else {
        const { title } = target;
        const widget = page.locator(".dashboard-widget").filter({
          has: page.getByText(title, { exact: true }),
        });
        const isVisible = await widget.first().isVisible().catch(() => false);
        if (isVisible) {
          await widget.first().screenshot({ path: filepath });
          console.log(`✓ ${dir}/${filename} (${title})`);
          captured.add(key);
        } else {
          skipped.push({ ...target, title });
        }
      }
    };

    const targets = selectedGuides
      ? SCREENSHOT_TARGETS.filter((t) => selectedGuides.includes(t.dir))
      : SCREENSHOT_TARGETS;

    if (selectedGuides?.length && targets.length === 0) {
      console.log(`\n⚠ No targets for guides: ${selectedGuides.join(", ")}`);
      console.log("  Valid: analyzing-asset-and-automation-metrics, analyzing-service-desk-metrics, configuring-ai-agents, configuring-asset-management, configuring-automation-and-sla, configuring-integration-sync-and-credentials, connecting-and-managing-integrations, creating-and-managing-custom-dashboards, getting-started-with-harmony-dashboard, managing-asset-organization-and-importing, managing-asset-views-and-details\n");
    }

    const byPath = {};
    for (const t of targets) {
      const p = t.path ?? SYSTEM_DASHBOARD_PATH;
      if (!byPath[p]) byPath[p] = [];
      byPath[p].push(t);
    }

    for (const path of [SYSTEM_DASHBOARD_PATH, "agents", "assets", "settings/asset-management", "settings/desks", "settings/integrations"]) {
      const targets = byPath[path];
      if (!targets?.length) continue;

      if (path === "settings/integrations") {
        console.log(`\nNavigating to /settings/integrations...`);
        await page.goto(`${BASE_URL}/settings/integrations`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForLoadState("networkidle");
        await new Promise((r) => setTimeout(r, 4000));
        await hideImpersonationBanner(page);
      } else if (path === "settings/desks") {
        console.log(`\nNavigating to /settings/desks...`);
        await page.goto(`${BASE_URL}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForLoadState("networkidle");
        await new Promise((r) => setTimeout(r, 3000));
        const firstDesk = page.locator("table tbody tr.cursor-pointer").first();
        if (await firstDesk.isVisible().catch(() => false)) {
          await firstDesk.click();
          await page.waitForURL((u) => u.pathname.match(/\/settings\/desks\/[^/]+/), { timeout: 10000 });
        }
        await new Promise((r) => setTimeout(r, 2000));
        await hideImpersonationBanner(page);
      } else if (path === "assets") {
        console.log(`\nNavigating to /assets...`);
        await page.goto(`${BASE_URL}/assets`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForLoadState("networkidle");
        await new Promise((r) => setTimeout(r, 4000));
        await hideImpersonationBanner(page);
      } else if (path === "settings/asset-management") {
        console.log(`\nNavigating to /settings/asset-management...`);
        await page.goto(`${BASE_URL}/settings/asset-management`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForLoadState("networkidle");
        await new Promise((r) => setTimeout(r, 4000));
        await hideImpersonationBanner(page);
      } else if (path === "agents") {
        console.log(`\nNavigating to /agents...`);
        await page.goto(`${BASE_URL}/agents`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForLoadState("networkidle");
        await new Promise((r) => setTimeout(r, 3000));
        await hideImpersonationBanner(page);
        // Table view uses links; card view uses clickable divs (no anchors)
        let firstAgent = page.locator('a[href*="/agents/"]').first();
        let hasAgent = await firstAgent.isVisible().catch(() => false);
        if (!hasAgent) {
          firstAgent = page.locator('[class*="grid"] .cursor-pointer').first();
          hasAgent = await firstAgent.isVisible().catch(() => false);
        }
        if (!hasAgent) {
          firstAgent = page.getByText(/Application Access Request|Asset Ownership|Device Recovery|New Hire Onboarding/).first();
          hasAgent = await firstAgent.isVisible().catch(() => false);
        }
        if (!hasAgent) {
          console.log("⚠ Skipping agent screenshots: no agents found");
          continue;
        }
        await firstAgent.click();
        await page.waitForURL((url) => /\/agents\/[^/]+\/[^/]+/.test(url.pathname), { timeout: 15000 });
        await new Promise((r) => setTimeout(r, 5000));
        await hideImpersonationBanner(page);
      } else {
        console.log(`\nNavigating to ${path}...`);
        await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 5000));

        if (path === SYSTEM_DASHBOARD_PATH) {
          await page.waitForSelector(".dashboard-widget", { timeout: 10000 });
          await page.waitForLoadState("networkidle");
          await new Promise((r) => setTimeout(r, 5000));
          await hideImpersonationBanner(page);
        }
      }

      for (const target of targets) {
        await captureTarget(target, page);
      }
    }

    if (skipped.length > 0) {
      console.log("\n⚠ Widgets not on dashboard (add from Widget Library):");
      for (const { title, filename, dir } of skipped) {
        console.log(`  - ${title} → ${dir}/${filename}`);
      }
    }

    console.log(`\nDone. Captured ${captured.size} screenshot(s)`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await context?.close();
  }
}

main();
