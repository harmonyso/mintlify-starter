import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "organizing-tickets-and-table-views";

async function goToTickets(p) {
  await p.goto(`${BASE_URL}/tickets/desk/all`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForLoadState("networkidle");
  await new Promise((r) => setTimeout(r, 2500));
  // If redirected away from all desks, try a specific desk
  if (p.url().includes("/tickets/desk/all")) return;
  // Already on a specific desk, that's fine
}

export const targets = [
  {
    type: "element",
    selector: 'div[data-filter-popover], div[aria-expanded]:has([data-filter-content]), div:has(table):has([data-active-filter-count])',
    filename: "ticket-filters.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToTickets(p);
      // Open the filter popover
      const filterBtn = p.getByRole("button", { name: /Filter/i }).first();
      if (await filterBtn.isVisible().catch(() => false)) {
        await filterBtn.click();
        await new Promise((r) => setTimeout(r, 800));
      }
    },
  },
  {
    type: "element",
    selector: 'div.overflow-auto.border-t:has(table):has(th[data-sortable="true"], th:has(svg)), table:has(th:has-text("Title"))',
    filename: "ticket-table-sorting.png",
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
    selector: '[role="listbox"]:has([role="option"]:has-text("Save current view")), [data-radix-popper-content-wrapper]:has(:text("Save current view"))',
    filename: "saved-views-dropdown.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToTickets(p);
      const viewsDropdown = p.getByRole("button", { name: /view|Default view/i }).first();
      if (await viewsDropdown.isVisible().catch(() => false)) {
        await viewsDropdown.click();
        await new Promise((r) => setTimeout(r, 800));
      }
    },
  },
  {
    type: "element",
    selector: '[data-radix-popper-content-wrapper]:has([role="checkbox"]):has(:text("Status")), [data-view-options], div:has(h4:has-text("Toggle columns"))',
    filename: "manage-columns.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToTickets(p);
      const manageColBtn = p.getByRole("button", { name: /column|Columns/i }).last();
      if (await manageColBtn.isVisible().catch(() => false)) {
        await manageColBtn.click();
        await new Promise((r) => setTimeout(r, 800));
      }
    },
  },
  {
    type: "element",
    selector: 'div:has(button:has-text("Bulk status")):has([role="checkbox"]), div[data-bulk-actions]:has(button)',
    filename: "ticket-bulk-actions.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToTickets(p);
      const checkbox = p.locator("table tbody tr").first().locator('[role="checkbox"], input[type="checkbox"]').first();
      if (await checkbox.isVisible().catch(() => false)) {
        await checkbox.click();
        await new Promise((r) => setTimeout(r, 500));
        // Select a couple more
        const secondRow = p.locator("table tbody tr").nth(1);
        const secondCheck = secondRow.locator('[role="checkbox"], input[type="checkbox"]').first();
        if (await secondCheck.isVisible().catch(() => false)) await secondCheck.click();
        await new Promise((r) => setTimeout(r, 500));
      }
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
