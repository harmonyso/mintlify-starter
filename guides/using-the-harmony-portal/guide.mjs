import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "using-the-harmony-portal";

// Portal home: wait for the chat input and tabs to be visible
// ChatInput renders as a contenteditable div (role="textbox"), NOT a <textarea>
async function goToPortal(p) {
  await p.goto(`${BASE_URL}/portal`, { waitUntil: "domcontentloaded", timeout: 30000 });
  // Wait for the tabs list — appears after tenant preferences finish loading
  await p.waitForSelector('[role="tablist"]', { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
}

export const targets = [
  {
    // Portal home root: div.flex.flex-col containing the hero (div.relative.min-h-56) + PortalTicketsTabs
    // Tabs labels are "My tickets" / "Pending requests" (not "Tickets" / "Approvals")
    type: "element",
    selector: 'div:has(> div.relative.min-h-56):has([data-slot="tabs-list"])',
    filename: "portal-home.png",
    dir,
    path: "portal",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToPortal(p);
    },
  },
  {
    // Hero section: div.relative.min-h-56 contains the absolute-positioned h1 + ChatInput
    // ChatInput is a contenteditable div (role="textbox"), not a <textarea>
    type: "element",
    selector: 'div.relative.min-h-56:has([role="textbox"])',
    filename: "portal-hero-chat.png",
    dir,
    path: "portal",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToPortal(p);
    },
  },
  {
    // Threads layout: SidebarProvider wrapping ThreadsSidebar (variant="floating") + main content
    // Sidebar renders: data-slot="sidebar" data-variant="floating" (NOT data-sidebar="sidebar")
    // SidebarProvider renders: data-slot="sidebar-wrapper"
    type: "element",
    selector: '[data-slot="sidebar-wrapper"]:has([data-slot="sidebar"][data-variant="floating"])',
    filename: "portal-threads.png",
    dir,
    path: "portal/threads",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/portal/threads`, { waitUntil: "domcontentloaded", timeout: 30000 });
      // Wait for the ChatInput (role="textbox" contenteditable div) and sidebar to render
      await p.waitForSelector('[role="textbox"]', { timeout: 15000 }).catch(() => {});
      await new Promise((r) => setTimeout(r, 1500));
    },
  },
  {
    // Tickets tab panel: TabsContent value="tickets" (data-slot="tabs-content", data-state="active")
    // TicketsSection renders DataTable with scope="portal-tickets"
    type: "element",
    selector: '[data-slot="tabs-content"][data-state="active"]:has(table)',
    filename: "portal-tickets-tab.png",
    dir,
    path: "portal",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToPortal(p);
      // Tab label is "My tickets" not "Tickets"
      const ticketsTab = p.getByRole("tab", { name: /My tickets/i }).first();
      if (await ticketsTab.isVisible().catch(() => false)) {
        await ticketsTab.click();
        await p.waitForSelector("table tbody tr", { timeout: 10000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 1000));
      }
    },
  },
  {
    // Ticket detail: Card (data-slot="card") containing TabsList with "Chat" and "Activity" triggers
    // Rendered by TicketRouteComponent at /portal/tickets/$ticketId/$slug
    type: "element",
    selector: '[data-slot="card"]:has([data-slot="tabs-list"]):has([data-slot="tabs-trigger"])',
    filename: "portal-ticket-detail.png",
    dir,
    path: "portal",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToPortal(p);
      // Tab label is "My tickets" not "Tickets"
      const ticketsTab = p.getByRole("tab", { name: /My tickets/i }).first();
      if (await ticketsTab.isVisible().catch(() => false)) {
        await ticketsTab.click();
        await p.waitForSelector("table tbody tr", { timeout: 10000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 800));
        const row = p.locator("table tbody tr").first();
        if (await row.isVisible().catch(() => false)) {
          await row.click();
          await p.waitForURL((u) => u.pathname.includes("/portal/tickets/"), { timeout: 10000 }).catch(() => {});
          // Wait for the ticket Card with tabs to render
          await p.waitForSelector('[data-slot="card"]:has([data-slot="tabs-list"])', { timeout: 10000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    },
  },
  {
    // Approvals tab panel: TabsContent for "Pending requests" tab (value="approvals")
    // Empty state: h3 "No pending approvals" | With data: DataTable (scope="portal-approvals")
    // After clicking the tab, [data-slot="tabs-content"][data-state="active"] is the approvals panel
    type: "element",
    selector: '[data-slot="tabs-content"][data-state="active"]',
    filename: "portal-approvals-tab.png",
    dir,
    path: "portal",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToPortal(p);
      // Tab label is "Pending requests" not "Approvals"
      const approvalsTab = p.getByRole("tab", { name: /Pending requests/i }).first();
      if (await approvalsTab.isVisible().catch(() => false)) {
        await approvalsTab.click();
        await new Promise((r) => setTimeout(r, 1500));
      }
    },
  },
];

export const videoConfig = {
  path: "portal",
  preload: async (page) => {
    await page.waitForSelector('[role="tablist"]', { timeout: 15000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
  },
};
