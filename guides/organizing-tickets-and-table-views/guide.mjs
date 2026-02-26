import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "organizing-tickets-and-table-views";

async function goToTickets(p) {
  await p.goto(`${BASE_URL}/tickets/desk/all`, { waitUntil: "domcontentloaded", timeout: 30000 });
  // Wait for the ticket table to render
  await p.waitForSelector("table thead", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1500));
}

export const targets = [
  {
    // Filter popover: DataTableFilterPopover renders PopoverContent with
    // DataTableFilterCategories (div.max-w-[180px].border-r) on the left
    type: "element",
    selector:
      '[data-radix-popper-content-wrapper]:has(div[class*="max-w-\\[180px\\]"][class*="border-r"])',
    filename: "ticket-filters.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToTickets(p);
      // Button has text "Filters" on desktop (DataTableFilterPopover)
      await p.locator('button:has-text("Filters")').first().click();
      await new Promise((r) => setTimeout(r, 600));
    },
  },
  {
    type: "element",
    selector:
      'div.overflow-auto.border-t:has(table):has(th[data-sortable="true"], th:has(svg)), table:has(th:has-text("Title"))',
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
    // Views dropdown: TicketViewsDropdown on a specific desk (AllDesksViewsDropdown has no "Save current view")
    // Trigger is scoped to h2 (page title area) to avoid TeamSelector or other dropdowns in the toolbar
    // Capture uses role="menu" directly — confirmed in DOM as div#radix-* with data-state="open"
    type: "element",
    selector: '[role="menu"][data-state="open"]:has([data-slot="dropdown-menu-item"])',
    filename: "saved-views-dropdown.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToTickets(p);
      // /tickets/desk/all uses AllDesksViewsDropdown (no "Save current view").
      // Navigate to first real desk found anywhere in the DOM.
      const deskHref = await p.evaluate(() => {
        const links = [...document.querySelectorAll('a[href*="/tickets/desk/"]')];
        const link = links.find((a) => {
          const href = a.getAttribute("href") ?? "";
          return !href.includes("/all") && !href.includes("/other");
        });
        return link ? link.getAttribute("href") : null;
      });
      if (deskHref) {
        await p.goto(`${BASE_URL}${deskHref}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        await p.waitForSelector("table thead", { timeout: 15000 });
        await new Promise((r) => setTimeout(r, 1500));
      }
      // Click the views dropdown trigger scoped to the h2 title area (avoids other dropdowns in toolbar)
      // DOM path confirmed: h2.flex-1 > div > div.text-foreground > button[data-slot="dropdown-menu-trigger"]
      const viewsBtn = p.locator('h2 button[data-slot="dropdown-menu-trigger"]').first();
      await viewsBtn.waitFor({ state: "visible", timeout: 10000 });
      await viewsBtn.click();
      await p
        .waitForSelector('[role="menu"][data-state="open"]', { timeout: 5000 })
        .catch(() => {});
      await new Promise((r) => setTimeout(r, 400));
    },
  },
  {
    // Manage columns: DropdownMenuContent (w-[250px]) from DataTableViewOptions with "Manage columns" label
    type: "element",
    selector:
      '[data-radix-popper-content-wrapper]:has([role="menuitem"]):has(:text("Manage columns"))',
    filename: "manage-columns.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToTickets(p);
      // DataTableViewOptions renders a DropdownMenu trigger (aria-haspopup="menu") with size-9 class
      await p.locator('button[aria-haspopup="menu"][class*="size-9"]').last().click();
      await new Promise((r) => setTimeout(r, 600));
    },
  },
  {
    // Bulk actions toolbar: DataTableBulkActionsToolbar renders a flex div with "X selected" + action buttons
    type: "element",
    selector:
      'div.flex.items-center.gap-2:has(span:has-text("selected")):has(button)',
    filename: "ticket-bulk-actions.png",
    dir,
    path: "tickets",
    prepare: async (p) => {
      await p.keyboard.press("Escape");
      await goToTickets(p);
      // Select first two rows via row checkboxes
      const firstCheck = p
        .locator("table tbody tr")
        .first()
        .locator('[role="checkbox"], input[type="checkbox"]')
        .first();
      if (await firstCheck.isVisible().catch(() => false)) {
        await firstCheck.click();
        await new Promise((r) => setTimeout(r, 400));
        const secondCheck = p
          .locator("table tbody tr")
          .nth(1)
          .locator('[role="checkbox"], input[type="checkbox"]')
          .first();
        if (await secondCheck.isVisible().catch(() => false)) {
          await secondCheck.click();
          await new Promise((r) => setTimeout(r, 400));
        }
      }
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
