/**
 * Shared cursor utilities for video recording - smooth movement, no jumping.
 */

const MOUSE_STEPS = 25;

/**
 * Scale used when zooming in around a click target.
 * Slightly less aggressive than a "show element" zoom — the viewer just needs
 * to clearly see what's being clicked, not inspect the whole element.
 */
const CLICK_ZOOM_SCALE = 1.6;

/**
 * Click on `selector` with a smooth cursor movement, briefly zooming in around
 * the target just before the click and triggering a zoom-out immediately after.
 * The zoom-out runs in the background so that it resolves naturally while the
 * cursor is already moving toward the next target.
 */
export async function clickWithCursor(page, cursor, selector, fallback) {
  // Zoom in on the click target so the action is clearly visible
  await zoomToElement(page, selector, CLICK_ZOOM_SCALE);

  let clicked = false;
  if (cursor && typeof selector === "string") {
    try {
      await cursor.actions.click({ target: selector });
      clicked = true;
    } catch {
      /* ghost-cursor can throw; fall back to animated Playwright click */
    }
  }

  if (!clicked) {
    const locator = page.locator(selector).first();
    const box = await locator.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: MOUSE_STEPS });
    }
    await fallback();
  }

  // Fire-and-forget zoom-out — the transition completes in the background while
  // the cursor is already moving on, giving a natural "zooming back as we move away" feel.
  unzoomPage(page).catch(() => { });
}

/**
 * Smoothly zoom the viewport in on the element matching `selector`.
 *
 * Applies a CSS transform to <body> centered on the element's midpoint so the
 * element fills a larger portion of the recorded frame. The cursor overlay div
 * is temporarily moved to <html> (outside <body>) so it stays viewport-relative
 * and isn't distorted by the body transform.
 *
 * @param {import('playwright').Page} page
 * @param {string} selector  CSS selector of the element to zoom into
 * @param {number} [scale=1.7]  Zoom multiplier (1.7 = 70% larger)
 */
export async function zoomToElement(page, selector, scale = 1.7) {
  // Use Playwright's locator to resolve the element (supports :has-text() and other
  // Playwright-specific pseudo-selectors that don't work with document.querySelector).
  const box = await page.locator(selector).first().boundingBox().catch(() => null);

  await page.evaluate(({ box, scale }) => {
    if (!box) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Clamp center so zoomed content doesn't expose empty space at edges
    const halfW = vw / (2 * scale);
    const halfH = vh / (2 * scale);
    const cx = Math.max(halfW, Math.min(vw - halfW, box.x + box.width / 2));
    const cy = Math.max(halfH, Math.min(vh - halfH, box.y + box.height / 2));

    document.body.style.transition = "transform 0.4s cubic-bezier(0.4,0,0.2,1)";
    document.body.style.transformOrigin = `${cx}px ${cy}px`;
    document.body.style.transform = `scale(${scale})`;

    // Move cursor overlay to <html> so it escapes the body transform
    const cursor = document.getElementById("__playwright_cursor_overlay__");
    if (cursor && cursor.parentElement === document.body) {
      document.documentElement.appendChild(cursor);
    }
  }, { box, scale });

  await new Promise((r) => setTimeout(r, 450)); // wait for transition
}

/**
 * Smoothly zoom back out to normal scale and restore the cursor overlay.
 *
 * @param {import('playwright').Page} page
 */
export async function unzoomPage(page) {
  await page.evaluate(() => {
    // Keep transformOrigin unchanged while transitioning back to scale(1) —
    // clearing it here would instantly snap the anchor to 50% 50% while the
    // body is still scaled, causing a visible jump. Clear it only after the
    // transition finishes (when origin no longer matters at scale=1).
    document.body.style.transition = "transform 0.5s cubic-bezier(0.4,0,0.2,1)";
    document.body.style.transform = "";

    // Restore cursor overlay to body
    const cursor = document.getElementById("__playwright_cursor_overlay__");
    if (cursor && cursor.parentElement === document.documentElement) {
      document.body.appendChild(cursor);
    }

    setTimeout(() => {
      document.body.style.transition = "";
      document.body.style.transformOrigin = "";
    }, 550);
  });

  await new Promise((r) => setTimeout(r, 550)); // wait for transition
}
