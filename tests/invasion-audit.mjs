import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.BASE_URL || "http://127.0.0.1:5173";
const saveKey = "dead-signal-story-v3";
async function ready() {
  await page.waitForFunction(
    () =>
      window.__invasion?.world.player &&
      !document.querySelector("#start").disabled,
  );
}
async function reset(data) {
  await page.evaluate(
    ({ data, saveKey }) => localStorage.setItem(saveKey, JSON.stringify(data)),
    { data, saveKey },
  );
  await page.reload();
  await ready();
  await page.locator("#resume").click();
}
try {
  await page.goto(base + "/?qa=1");
  await ready();
  await page.locator("#name").fill("Audit");
  await page.locator("#student").fill("TEST");
  await page.locator("#kelas").fill("QA");
  await page.route("**/api/run/start", (r) => r.abort());
  await page.locator("#start").click();
  await page.waitForFunction(() => !document.querySelector("#start").disabled);
  assert.equal(await page.locator("#menu").isVisible(), true);
  await page.unroute("**/api/run/start");
  await page.locator("#start").click();
  await page.locator("#play").waitFor();
  if (await page.locator("#cinematic").isVisible())
    await page.locator("#skipIntro").click();
  if (await page.locator("#briefing").isVisible())
    await page.locator("#beginMission").click();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    saveKey,
  );
  // Invalid cached room/progress cannot skip ahead of the signed token.
  await reset({
    ...saved,
    room: 7,
    progress: "invalid",
    repaired: true,
    finished: true,
  });
  await page.locator("#play").waitFor();
  if (await page.locator("#cinematic").isVisible())
    await page.locator("#skipIntro").click();
  if (await page.locator("#briefing").isVisible())
    await page.locator("#beginMission").click();
  assert.equal(await page.evaluate(() => window.__invasion.world.wave), 0);
  assert.equal(await page.evaluate(() => window.__invasion.world.progress), 0);
  assert.equal(
    await page.evaluate(() => window.__invasion.world.repaired),
    false,
  );
  await page.locator("#stepAction").click();
  await page.waitForFunction(() => window.__invasion.world.progress === 1);
  await page.locator("#stepAction").click();
  await page.locator("#taskPanel").waitFor();
  assert.equal(
    await page.evaluate(() => document.querySelector("#play").inert),
    true,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.locator("#closeTask").click();
  assert.equal(
    await page.evaluate(() => window.__invasion.world.blocked),
    true,
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.locator("#stepAction").click();
  await page.getByRole("button", { name: /Bunyikan alarm freezer/ }).click();
  await page.route("**/api/run/question", (r) =>
    r.fulfill({
      status: 503,
      contentType: "text/html",
      body: "<h1>Offline</h1>",
    }),
  );
  await page.locator("#stepAction").click();
  await page.locator("#retryQuiz").waitFor();
  assert.doesNotMatch(
    await page.locator("#feedback").innerText(),
    /Unexpected|JSON/,
  );
  assert.equal(await page.locator("#hint").isDisabled(), true);
  await page.unroute("**/api/run/question");
  await page.locator("#retryQuiz").click();
  await page.locator(".option").first().waitFor();
  assert.equal(
    await page.evaluate(() => document.activeElement.closest("#quiz") !== null),
    true,
  );
  await page.locator("#closeQuiz").click();
  await page.locator("#pause").click();
  await page.locator("#reduced").check();
  assert.equal(
    await page.evaluate(() => window.__invasion.world.reduced),
    true,
  );
  await page.locator("#toMenu").click();
  assert.equal(await page.locator("#menu").isVisible(), true);
  await page.evaluate((key) => localStorage.setItem(key, "{broken"), saveKey);
  await page.reload();
  await ready();
  await page.locator("#resume").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#startError")
      .textContent.includes("Checkpoint rusak"),
  );
  await page.setViewportSize({ width: 667, height: 375 });
  await page.locator("#name").fill("Landscape");
  await page.locator("#student").fill("TEST");
  await page.locator("#kelas").fill("QA");
  await page.locator("#start").click();
  await page.locator("#play").waitFor();
  if (await page.locator("#cinematic").isVisible())
    await page.locator("#skipIntro").click();
  if (await page.locator("#briefing").isVisible())
    await page.locator("#beginMission").click();
  await page.locator("#right").scrollIntoViewIfNeeded();
  const r = await page.locator("#right").boundingBox();
  const x = await page.evaluate(() => window.__invasion.world.player.x);
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await page.mouse.up();
  assert.ok((await page.evaluate(() => window.__invasion.world.player.x)) > x);
  assert.deepEqual(errors, []);
  console.log(
    "PASS audit: API start/question failure, checkpoint validation, focus trap, blur, reduced motion, menu recovery, broken save, landscape pointer controls.",
  );
} finally {
  await browser.close();
}
