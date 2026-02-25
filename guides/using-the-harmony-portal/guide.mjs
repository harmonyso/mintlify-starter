import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "using-the-harmony-portal";

async function goToPortal(p) {
  await p.goto(`${BASE_URL}/portal`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2500));
}

export const targets = [
  {
    type: "element",
    selector: 'main:has([data-portal-hero], div:has-text("How can I help you")), div:has([role="tablist"]):has([role="tab"]:has-text("Tickets")):has([role="tab"]:has-text("Approvals"))',
    filename: "portal-home.png",
    dir,
    path: "portal",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToPortal(p);
    },
  },
  {
    type: "element",
    selector: 'div:has(textarea[placeholder*="message"], input[placeholder*="message"]):has([data-portal-hero], h1), section:has(textarea):has(button[type="submit"])',
    filename: "portal-hero-chat.png",
    dir,
    path: "portal",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToPortal(p);
    },
  },
  {
    type: "element",
    selector: 'div:has(aside:has([data-threads-sidebar])), main:has(aside):has([data-thread-list]), div:has(nav:has-text("New chat"))',
    filename: "portal-threads.png",
    dir,
    path: "portal/threads",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await p.goto(`${BASE_URL}/portal`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await p.waitForLoadState("networkidle");
      await new Promise((r) => setTimeout(r, 2000));
      const threadsBtn = p.getByRole("button", { name: /Threads|thread/i }).first();
      if (await threadsBtn.isVisible().catch(() => false)) {
        await threadsBtn.click();
        await p.waitForURL((u) => u.pathname.includes("/portal/threads")).catch(() => {});
        await new Promise((r) => setTimeout(r, 1500));
      } else {
        await p.goto(`${BASE_URL}/portal/threads`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await p.waitForLoadState("networkidle");
        await new Promise((r) => setTimeout(r, 2000));
      }
    },
  },
  {
    type: "element",
    selector: 'div[role="tabpanel"]:has(table:has(th:has-text("Status"))), div:has(h2:has-text("Tickets")):has(table)',
    filename: "portal-tickets-tab.png",
    dir,
    path: "portal",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToPortal(p);
      const ticketsTab = p.getByRole("tab", { name: /^Tickets$/i }).first();
      if (await ticketsTab.isVisible().catch(() => false)) {
        await ticketsTab.click();
        await new Promise((r) => setTimeout(r, 1500));
      }
    },
  },
  {
    type: "element",
    selector: 'div:has([role="tablist"]:has([role="tab"]:has-text("Chat")):has([role="tab"]:has-text("Activity")))',
    filename: "portal-ticket-detail.png",
    dir,
    path: "portal",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToPortal(p);
      const ticketsTab = p.getByRole("tab", { name: /^Tickets$/i }).first();
      if (await ticketsTab.isVisible().catch(() => false)) {
        await ticketsTab.click();
        await new Promise((r) => setTimeout(r, 1500));
        const row = p.locator("table tbody tr").first();
        if (await row.isVisible().catch(() => false)) {
          await row.click();
          await p.waitForURL((u) => u.pathname.includes("/portal/tickets/")).catch(() => {});
          await p.waitForLoadState("networkidle");
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    },
  },
  {
    type: "element",
    selector: 'div[role="tabpanel"]:has(table:has(th:has-text("Subject"))):has(button:has-text("Approve")), div:has(h2:has-text("Approvals")):has(button:has-text("Approve"))',
    filename: "portal-approvals-tab.png",
    dir,
    path: "portal",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToPortal(p);
      const approvalsTab = p.getByRole("tab", { name: /Approvals/i }).first();
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
    await page.waitForLoadState("networkidle");
    await new Promise((r) => setTimeout(r, 2000));
  },
};
