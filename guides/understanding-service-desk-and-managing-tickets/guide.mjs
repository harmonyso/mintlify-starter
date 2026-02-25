import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "understanding-service-desk-and-managing-tickets";

async function goToTickets(p) {
  await p.goto(`${BASE_URL}/tickets/desk/all`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2500));
}

async function openFirstTicket(p) {
  await goToTickets(p);
  const row = p.locator("table tbody tr").first();
  await row.waitFor({ state: "visible", timeout: 8000 });
  await row.click();
  await new Promise((r) => setTimeout(r, 2000));
}

export const targets = [
  {
    type: "element",
    selector: 'div:has(h1:has-text("Tickets")):has([role="combobox"]), div.overflow-auto.border-t:has(table:has(th:has-text("Title")))',
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
    selector: '[role="dialog"]:has(h2:has-text("Create"):has-text("ticket"), h2:has-text("New ticket")):has(input[placeholder*="title"], input[name="subject"])',
    filename: "create-ticket-dialog.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToTickets(p);
      const createBtn = p.getByRole("button", { name: /Create ticket|New ticket/i }).first();
      if (await createBtn.isVisible().catch(() => false)) {
        await createBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  },
  {
    type: "element",
    selector: 'div[data-ticket-preview], aside:has([data-ticket-preview-content]), div:has(h2:has-text("Properties")):has(div:has-text("Status"))',
    filename: "ticket-preview-panel.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await openFirstTicket(p);
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("canned response"), h2:has-text("Canned response")):has(input)',
    filename: "canned-response-search.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await openFirstTicket(p);
      // Look for canned response button in the chat area
      const cannedBtn = p.getByRole("button", { name: /canned response|template/i }).first();
      if (await cannedBtn.isVisible().catch(() => false)) {
        await cannedBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("knowledge base"), h2:has-text("KB solution")), [role="dialog"]:has(:text("Respond with knowledge base"))',
    filename: "kb-solution-modal.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await openFirstTicket(p);
      const kbBtn = p.getByRole("button", { name: /knowledge base|KB/i }).first();
      if (await kbBtn.isVisible().catch(() => false)) {
        await kbBtn.click();
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  },
  {
    type: "element",
    selector: 'div:has(h2:has-text("Approvals")):has([data-approval-step]), section:has(h3:has-text("Approvals")):has([aria-label*="approval"])',
    filename: "ticket-approvals-section.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await openFirstTicket(p);
      const approvalsHeading = p.locator('h2:has-text("Approvals"), h3:has-text("Approvals")').first();
      await approvalsHeading.scrollIntoViewIfNeeded().catch(() => null);
      await new Promise((r) => setTimeout(r, 500));
    },
  },
  {
    type: "element",
    selector: '[role="dialog"]:has(h2:has-text("close"), h2:has-text("Close")):has(textarea), [role="dialog"]:has(textarea):has(button:has-text("Close"))',
    filename: "close-ticket-comment-dialog.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await openFirstTicket(p);
      const statusSelect = p.locator('[data-ticket-status-select], button:has-text("Open"), button:has-text("In Progress")').first();
      if (await statusSelect.isVisible().catch(() => false)) {
        await statusSelect.click();
        await new Promise((r) => setTimeout(r, 500));
        const closedOption = p.getByRole("option", { name: /Resolved|Closed/i }).first();
        if (await closedOption.isVisible().catch(() => false)) {
          await closedOption.click();
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    },
  },
  {
    type: "element",
    selector: 'div:has(h2:has-text("SLA")):has([data-sla-timer]), section:has(h3:has-text("SLA")):has(time)',
    filename: "ticket-sla-section.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await openFirstTicket(p);
      const slaHeading = p.locator('h2:has-text("SLA"), h3:has-text("SLA")').first();
      await slaHeading.scrollIntoViewIfNeeded().catch(() => null);
      await new Promise((r) => setTimeout(r, 500));
    },
  },
];

export const videoConfig = {
  path: "tickets/desk/all",
  preload: async (page) => {
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
  },
};
