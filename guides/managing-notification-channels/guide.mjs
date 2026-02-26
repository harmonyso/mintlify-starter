import { BASE_URL } from "../_utilities/screenshot-shared.mjs";

const dir = "managing-notification-channels";

/** Navigate to the notifications tab of the first desk */
async function navigateToDeskNotifications(p) {
  await p.keyboard.press("Escape");
  await p.goto(`${BASE_URL}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await p.waitForSelector("table tbody tr", { timeout: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  const firstDesk = p.locator("table tbody tr").first();
  if (await firstDesk.isVisible().catch(() => false)) {
    await firstDesk.click();
    await p.waitForURL((u) => u.pathname.match(/\/settings\/desks\/.+/), { timeout: 8000 }).catch(() => {});
    await p.waitForSelector('a:has-text("Notifications")', { timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 500));
  }

  const notifLink = p.getByRole("link", { name: /Notification/i }).first();
  if (await notifLink.isVisible().catch(() => false)) {
    await notifLink.click();
    // Wait for either a destination card or the empty-state bell icon to confirm load
    await p.waitForSelector(
      'h2:has-text("Ticket notifications"), button:has-text("Add destination")',
      { timeout: 12000 },
    ).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));
  }
}

export const targets = [
  {
    // Ticket notifications section: h2 + Add destination button + all destination cards
    type: "element",
    selector: 'div:has(> div > h2:has-text("Ticket notifications")), div:has(h2:has-text("Ticket notifications")):has(button:has-text("Add destination"))',
    filename: "ticket-notifications.png",
    dir,
    path: "settings/desks",
    prepare: navigateToDeskNotifications,
  },
  {
    // EmailDestinationCard — shadcn Card renders as div[data-slot="card"]
    type: "element",
    selector: '[data-slot="card"]:has(p:has-text("Email reporters about ticket updates"))',
    filename: "email-reporters.png",
    dir,
    path: "settings/desks",
    prepare: navigateToDeskNotifications,
  },
];
