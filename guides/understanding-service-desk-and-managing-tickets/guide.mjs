import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "understanding-service-desk-and-managing-tickets";

async function goToTickets(p) {
  await p.goto(`${BASE_URL}/tickets/desk/all`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForSelector("table thead", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1500));
}

/**
 * Opens the side-panel preview for the first ticket (desktop: ?preview=... URL).
 * Use for screenshots that target the ResizableTicketPreview panel.
 */
async function openPreviewPanel(p) {
  await goToTickets(p);
  const row = p.locator("table tbody tr").first();
  await row.waitFor({ state: "visible", timeout: 8000 });
  await row.click();
  // Desktop: adds ?preview={ticketId} and opens ResizableTicketPreview
  await p.waitForSelector('[data-slot="card"]:has(button:has-text("SLA"))', { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 800));
}

/**
 * Navigates to the full ticket detail page for the first ticket.
 * Clicks the first row (opens ?preview=...), extracts the ticket ID from the URL,
 * then navigates directly to /tickets/{id}/ticket.
 * Use for screenshots that require the full-page ticket view (dialogs, chat, status).
 */
async function openFirstTicketFullPage(p) {
  await goToTickets(p);
  const row = p.locator("table tbody tr").first();
  await row.waitFor({ state: "visible", timeout: 8000 });
  await row.click();
  await new Promise((r) => setTimeout(r, 800));
  // On desktop, clicking a row adds ?preview=<ticketId> to the URL
  const url = p.url();
  const match = url.match(/[?&]preview=([^&]+)/);
  if (match) {
    const ticketId = match[1];
    await p.goto(`${BASE_URL}/tickets/${ticketId}/ticket`, { waitUntil: "domcontentloaded", timeout: 30000 });
  }
  // Wait for the full ticket page: tablist (Chat/Activity tabs) to confirm we're on the full page
  await p.waitForSelector('[role="tablist"]', { timeout: 10000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));
}

export const targets = [
  {
    type: "element",
    // Ticket table: border-t container with the table header columns
    selector: 'div.overflow-auto.border-t:has(table:has(th:has-text("Title")))',
    filename: "ticket-table-all-desks.png",
    dir,
    path: "tickets",
    clipToContent: true,
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToTickets(p);
    },
  },
  {
    type: "element",
    // Create Ticket dialog: heading is "Create new ticket" (h2)
    selector: '[role="dialog"]:has(h2:has-text("Create new ticket"))',
    filename: "create-ticket-dialog.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToTickets(p);
      const createBtn = p.getByRole("button", { name: /Create Ticket/i }).first();
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click();
        await new Promise((r) => setTimeout(r, 800));
      }
    },
  },
  {
    type: "element",
    // Ticket preview panel: the ResizableTicketPreview side panel.
    // TicketPreview renders: div.flex.h-full.flex-col.gap-4.border-l.bg-background.p-4.shadow-xl
    // This is the panel that slides in from the right when clicking a ticket row on desktop.
    selector: 'div.border-l.bg-background.shadow-xl:has([data-slot="card"])',
    filename: "ticket-preview-panel.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await openPreviewPanel(p);
    },
  },
  {
    type: "element",
    // Canned response search dialog: opened via "Quick response" button in the ticket chat.
    // Must use full-page ticket view — in the side panel the chat area is narrow and the
    // button text "Quick response" is hidden (only icon shown), making it unclickable by text.
    selector: '[role="dialog"]:has(input[placeholder="Search response"])',
    filename: "canned-response-search.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      // Try multiple tickets to find one whose desk has canned responses
      await goToTickets(p);
      const rows = p.locator("table tbody tr");
      const count = await rows.count().catch(() => 0);
      for (let i = 0; i < Math.min(count, 8); i++) {
        if (i === 0) {
          await rows.first().click();
        } else {
          // Re-fetch rows after goBack
          await goToTickets(p);
          await rows.nth(i).waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
          await rows.nth(i).click();
        }
        await new Promise((r) => setTimeout(r, 800));
        // Navigate to full page
        const url = p.url();
        const match = url.match(/[?&]preview=([^&]+)/);
        if (!match) break;
        const ticketId = match[1];
        await p.goto(`${BASE_URL}/tickets/${ticketId}/ticket`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await p.waitForSelector('[role="tablist"]', { timeout: 10000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 800));
        // Check if "Quick response" button is enabled (not disabled)
        const cannedBtn = p.locator('button:has-text("Quick response")').first();
        const isEnabled = await cannedBtn.isEnabled().catch(() => false);
        if (isEnabled) {
          await cannedBtn.click();
          await p
            .waitForSelector('[role="dialog"]:has(input[placeholder="Search response"])', { timeout: 8000 })
            .catch(() => {});
          await new Promise((r) => setTimeout(r, 600));
          break;
        }
        await p.keyboard.press("Escape");
        await p.goBack().catch(() => {});
        await p.waitForSelector("table thead", { timeout: 8000 }).catch(() => {});
      }
    },
  },
  {
    type: "element",
    // KB solution modal: InsightsCell in the ticket table renders a Lightbulb button directly
    // for any ticket where hasKnowledgeBaseAvailable(ticket) is true (kb_resolution != null).
    // Clicking the Lightbulb icon opens KbSolutionModal without navigating to the ticket page.
    // Tooltip text: "Click to view Knowledge base insight"
    selector: '[role="dialog"]:has(h2:has-text("Respond with knowledge base"))',
    filename: "kb-solution-modal.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToTickets(p);
      // Increase page size to see more tickets (valid range: 10-200)
      await p.goto(`${BASE_URL}/tickets/desk/all?pageSize=200`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector("table thead", { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 1500));
      // Find rows that have an insight Lightbulb button (button[type="button"] inside a td)
      // InsightsCell renders: button[type="button"] > Lightbulb svg (for kb) and/or Zap svg (for agentic)
      // The button has tooltip "Click to view Knowledge base insight"
      const insightBtns = p.locator('table tbody tr td button[type="button"]');
      const count = await insightBtns.count().catch(() => 0);
      for (let i = 0; i < Math.min(count, 50); i++) {
        const btn = insightBtns.nth(i);
        if (!(await btn.isVisible().catch(() => false))) continue;
        await btn.click();
        const hasDialog = await p
          .waitForSelector('[role="dialog"]:has(h2:has-text("Respond with knowledge base"))', { timeout: 1500 })
          .then(() => true)
          .catch(() => false);
        if (hasDialog) {
          await new Promise((r) => setTimeout(r, 600));
          break;
        }
        await p.keyboard.press("Escape");
      }
    },
  },
  {
    type: "element",
    // Approvals section: only visible when ticket.ticket_metadata.original_itsm_ticket.approvals_data exists.
    // Only freshservice ITSM tickets can have approvals_data — iterate their full pages to find one.
    // Use pageSize=200 to maximize the sample pool in a single page load.
    selector: '[data-slot="card"]:has(button:has-text("Approvals"))',
    filename: "ticket-approvals-section.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/tickets/desk/all?pageSize=200`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector("table thead", { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 1500));
      // Collect all visible ticket IDs from the table up front (faster than re-navigating)
      const ticketIds = await p.evaluate(() => {
        const spans = document.querySelectorAll("table tbody tr td span.flex-1");
        return Array.from(spans)
          .map((s) => s.textContent?.trim())
          .filter(Boolean);
      });
      for (const ticketId of ticketIds.slice(0, 40)) {
        await p.goto(`${BASE_URL}/tickets/${ticketId}/ticket`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await p.waitForSelector('[role="tablist"]', { timeout: 10000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 1000));
        const hasApprovals = await p
          .locator('[data-slot="card"]:has(button:has-text("Approvals"))')
          .isVisible()
          .catch(() => false);
        if (hasApprovals) break;
      }
    },
  },
  {
    type: "element",
    // Close ticket comment dialog: requires desk "mandatory close comment" setting to be enabled.
    // Prepare enables it via the desk automation settings page, then triggers the status change.
    selector: '[role="dialog"]:has(h2:has-text("Close ticket"))',
    filename: "close-ticket-comment-dialog.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");

      // 1. Find the first desk's ID from the settings page
      await p.goto(`${BASE_URL}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector("table tbody tr", { timeout: 10000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1200));
      const firstDeskRow = p.locator("table tbody tr.cursor-pointer, table tbody tr").first();
      if (!(await firstDeskRow.isVisible().catch(() => false))) return;
      await firstDeskRow.click();
      await p.waitForURL((u) => /\/settings\/desks\/[^/]+/.test(u.pathname), { timeout: 8000 }).catch(() => {});
      const deskId = p.url().match(/\/settings\/desks\/([^/]+)/)?.[1];
      if (!deskId) return;

      // 2. Go to automation settings and enable mandatory close comment
      await p.goto(`${BASE_URL}/settings/desks/${deskId}/automation`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await new Promise((r) => setTimeout(r, 1500));
      // The switch is next to "Enforce mandatory comment when closing tickets"
      const mandatorySection = p.locator('h4:has-text("Enforce mandatory comment")').first();
      if (await mandatorySection.isVisible().catch(() => false)) {
        const switchBtn = p.locator('[role="switch"]').first();
        const isOn = (await switchBtn.getAttribute("data-state").catch(() => "")) === "checked";
        if (!isOn) {
          await switchBtn.click();
          await new Promise((r) => setTimeout(r, 800));
        }
      }

      // 3. Navigate to a ticket from that desk and change status to trigger the dialog
      await p.goto(`${BASE_URL}/tickets/desk/${deskId}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector("table thead", { timeout: 10000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1500));
      const firstRow = p.locator("table tbody tr").first();
      if (!(await firstRow.isVisible().catch(() => false))) {
        // Desk might have no tickets — fall back to all-desks
        await goToTickets(p);
        await new Promise((r) => setTimeout(r, 500));
      }
      // Click first ticket to get preview URL, then open full page
      await p.locator("table tbody tr").first().click();
      await new Promise((r) => setTimeout(r, 600));
      const previewUrl = p.url();
      const previewMatch = previewUrl.match(/[?&]preview=([^&]+)/);
      if (!previewMatch) return;
      await p.goto(`${BASE_URL}/tickets/${previewMatch[1]}/ticket`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForSelector('[role="tablist"]', { timeout: 10000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1000));

      // 4. Click status selector → select Resolved/Closed → dialog should appear
      const statusTrigger = p.locator("div.cursor-pointer").filter({ hasText: /^open$|^in progress$/i }).first();
      if (await statusTrigger.isVisible().catch(() => false)) {
        await statusTrigger.click();
        await p.waitForSelector('[role="menu"]', { timeout: 3000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 300));
        const closedItem = p.getByRole("menuitem", { name: /Resolved|Closed/i }).first();
        if (await closedItem.isVisible().catch(() => false)) {
          await closedItem.click();
          await p
            .waitForSelector('[role="dialog"]:has(h2:has-text("Close ticket"))', { timeout: 3000 })
            .catch(() => {});
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    },
  },
  {
    type: "element",
    // SLA section: TicketSlaSection renders Collapsible > Card with CollapsibleTrigger button "SLA".
    // Present in both the preview panel and the full ticket page.
    selector: '[data-slot="card"]:has(button:has-text("SLA"))',
    filename: "ticket-sla-section.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      // Use full-page view: SLA is always rendered there regardless of sectionSettings
      await openFirstTicketFullPage(p);
      await p.waitForSelector('[data-slot="card"]:has(button:has-text("SLA"))', { timeout: 10000 }).catch(() => {});
    },
  },
];

export const videoConfig = {
  path: "tickets/desk/all",
  preload: async (page) => {
    await page.waitForSelector("table thead", { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));
  },
};
