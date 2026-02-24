/**
 * Navigation and interaction helpers for screenshot capture.
 */

import { hideImpersonationBanner } from "../screenshot-shared.mjs";
import { BASE_URL } from "../screenshot-shared.mjs";

/** Navigate to /agents and click an agent that has Run Schedule (e.g. Asset Acknowledgment, Low Storage). */
export async function clickAgentWithSchedule(page) {
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
export async function clickAgentWithApprovals(page) {
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

export async function navigateAndClickAgent(page, agentNames) {
  await page.goto(`${BASE_URL}/agents`, { waitUntil: "domcontentloaded", timeout: 30000 });
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
export async function navigateToDeskAutomation(page) {
  await page.goto(`${BASE_URL}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
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
export async function navigateToDeskSla(page) {
  await page.goto(`${BASE_URL}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
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
