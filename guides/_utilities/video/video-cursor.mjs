/**
 * Shared cursor utilities for video recording - smooth movement, no jumping.
 */

const MOUSE_STEPS = 25;

export async function clickWithCursor(page, cursor, selector, fallback) {
  if (cursor && typeof selector === "string") {
    try {
      await cursor.actions.click({ target: selector });
      return;
    } catch {
      /* ghost-cursor can throw; fall back to animated Playwright click */
    }
  }
  const locator = page.locator(selector).first();
  const box = await locator.boundingBox().catch(() => null);
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: MOUSE_STEPS });
  }
  await fallback();
}
