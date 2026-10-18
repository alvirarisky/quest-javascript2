import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto((process.env.BASE_URL || "http://127.0.0.1:5173") + "/?qa=1");
  await page.locator("#name").fill("Cinema QA");
  await page.locator("#student").fill("CINE");
  await page.locator("#kelas").fill("QA");
  await page.waitForFunction(() => !document.querySelector("#start").disabled);
  await page.locator("#start").click();
  await page.locator("#cinematic").waitFor();
  assert.equal(
    await page.evaluate(() => window.__invasion.world.blocked),
    true,
  );
  await page.keyboard.down("d");
  await page.waitForTimeout(150);
  await page.keyboard.up("d");
  assert.equal(
    await page.evaluate(() => window.__invasion.world.player.x),
    140,
  );
  await page.waitForFunction(() =>
    document.querySelector("#cinematic").classList.contains("beat-1"),
  );
  await page.screenshot({ path: "artifacts/invasion/08-cinema.png" });
  assert.equal(
    await page.evaluate(() => document.querySelector("#play").inert),
    true,
  );
  await page.waitForFunction(() =>
    document.querySelector("#cinematic").classList.contains("beat-3"),
  );
  await page.screenshot({ path: "artifacts/invasion/09-title.png" });
  await page.locator("#cinematic").waitFor({ state: "hidden" });
  // The briefing follows the intro and still holds the world.
  await page.locator("#briefing").waitFor();
  assert.equal(
    await page.evaluate(() => window.__invasion.world.blocked),
    true,
  );
  await page.locator("#beginMission").click();
  assert.equal(
    await page.evaluate(() => window.__invasion.world.blocked),
    false,
  );
  assert.equal(await page.locator(".mission-rail").isVisible(), false);
  await page.waitForFunction(
    () => !document.querySelector("#play").classList.contains("radio-visible"),
  );
  await page.screenshot({ path: "artifacts/invasion/10-clean-world.png" });
  // Resume bypasses intro; keyboard skip remains usable with reduced motion.
  await page.reload();
  await page.waitForFunction(() => !document.querySelector("#start").disabled);
  await page.locator("#resume").click();
  await page.locator("#play").waitFor();
  assert.equal(await page.locator("#cinematic").isVisible(), false);
  await page.locator("#pause").click();
  await page.locator("#toMenu").click();
  await page.locator("#start").click();
  await page.locator("#cinematic").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#cinematic").isVisible(), false);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#briefing").isVisible(), false);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: natural intro, briefing, movement lock, reduced motion, subtitle expiry, resume bypass, Escape skip.",
  );
} finally {
  await browser.close();
}
