import { chromium } from "playwright";
import { join } from "path";

const PROFILE_DIR = join("/Users/guym/Dev/harmony/mintlify-docs", ".playwright-dashboard-profile");
const BASE_URL = "http://localhost:5173";

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: true,
  viewport: { width: 1400, height: 900 },
});
const page = context.pages()[0] || await context.newPage();

try {
  await page.goto(`${BASE_URL}/tickets/desk/all`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("table thead", { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Collect ticket row data
  const rows = await page.evaluate(() => {
    const trs = document.querySelectorAll("table tbody tr");
    return Array.from(trs).slice(0, 20).map(row => {
      const cells = row.querySelectorAll("td");
      const text = Array.from(cells).map(c => c.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean);
      // Check for source icons (svg title attributes)
      const svgTitles = Array.from(row.querySelectorAll("svg title")).map(t => t.textContent);
      return { text: text.slice(0, 5).join(" | "), svgTitles };
    });
  });
  console.log("\n=== TICKET ROWS ===");
  rows.forEach((r, i) => console.log(`${i+1}. ${r.text} [svgTitles: ${r.svgTitles.join(",")}]`));

  // Check all tickets by opening each preview and checking for approvals and KB
  const rowCount = await page.locator("table tbody tr").count();
  console.log(`\n=== CHECKING ${Math.min(rowCount, 15)} TICKETS FOR APPROVALS/KB ===`);
  for (let i = 0; i < Math.min(rowCount, 15); i++) {
    await page.goto(`${BASE_URL}/tickets/desk/all`, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForSelector("table thead", { timeout: 8000 });
    await new Promise(r => setTimeout(r, 800));
    
    const row = page.locator("table tbody tr").nth(i);
    await row.click();
    await new Promise(r => setTimeout(r, 600));
    
    const url = page.url();
    const match = url.match(/[?&]preview=([^&]+)/);
    if (!match) { console.log(`Row ${i}: no preview URL`); continue; }
    const ticketId = match[1];
    
    // Go to full ticket page to check all sections
    await page.goto(`${BASE_URL}/tickets/${ticketId}/ticket`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1200));

    const hasApprovals = await page.locator('[data-slot="card"]:has(button:has-text("Approvals"))').isVisible().catch(() => false);
    const hasSla = await page.locator('[data-slot="card"]:has(button:has-text("SLA"))').isVisible().catch(() => false);
    
    // Check KB button (lightbulb)
    const allBtns = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("button")).map(b => ({
        text: b.textContent?.replace(/\s+/g," ").trim(),
        title: b.title,
        ariaLabel: b.getAttribute("aria-label"),
        disabled: b.disabled,
      })).filter(b => b.text || b.title || b.ariaLabel);
    });
    const kbBtn = allBtns.find(b => 
      (b.title && b.title.toLowerCase().includes("knowledge")) ||
      (b.ariaLabel && b.ariaLabel.toLowerCase().includes("knowledge"))
    );
    
    console.log(`Ticket ${ticketId}: SLA=${hasSla} | Approvals=${hasApprovals} | KB button=${kbBtn ? JSON.stringify(kbBtn) : "none"}`);
  }

  // Check desks for mandatory close comment
  console.log("\n=== CHECKING DESK SETTINGS ===");
  await page.goto(`${BASE_URL}/settings/desks`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("table", { timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));
  const deskRows = await page.locator("table tbody tr").count().catch(() => 0);
  console.log(`Found ${deskRows} desks`);
  
  // Click first desk to check settings
  const firstDesk = page.locator("table tbody tr").first();
  if (await firstDesk.isVisible().catch(() => false)) {
    await firstDesk.click();
    await page.waitForURL(u => u.pathname.match(/\/settings\/desks\//), { timeout: 8000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    
    // Look for close comment setting
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasCloseComment = pageText.toLowerCase().includes("close") && pageText.toLowerCase().includes("comment");
    console.log("First desk has close/comment setting reference:", hasCloseComment);
    const deskUrl = page.url();
    console.log("Desk URL:", deskUrl);
    
    // Find the settings panel text (first 2000 chars)
    const settingsText = await page.locator("main, [role='main']").first().textContent().catch(() => "");
    console.log("Desk settings text (first 1000):", settingsText?.slice(0, 1000).replace(/\s+/g, " "));
  }

} finally {
  await context.close();
}
