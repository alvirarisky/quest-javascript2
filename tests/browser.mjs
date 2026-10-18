import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("artifacts/qa", { recursive: true });
process.on("uncaughtException", async (e) => {
  console.error(e);
  console.error("Page errors:", errors);
  await page.screenshot({ path: "artifacts/qa/failure.png" }).catch(() => {});
  console.log(
    await page
      .locator("body")
      .innerText()
      .catch(() => ""),
  );
  await browser.close();
  process.exit(1);
});
await page.goto((process.env.BASE_URL || "http://127.0.0.1:5173") + "/?qa=1");
await page.waitForFunction(() => !!document.querySelector("canvas"));
await page.evaluate(async () => {
  window.scene = window.__deadSignal.arena;
});
await page.waitForFunction(
  () => window.scene.player && window.scene.phase === "idle",
);
assert.equal(await page.locator("canvas").count(),1);
await page.screenshot({ path: "artifacts/qa/01-menu.png" });
await page.locator("#chooseAllie").click();
await page.locator("#name").fill("QA Noah & Allie");
await page.locator("#student").fill("TEST-08");
await page.locator("#start").click();
await page
  .getByRole("button", { name: "Coba kontrol dulu", exact: true })
  .click();
await page.keyboard.down("d");
await page.waitForTimeout(300);
await page.keyboard.up("d");
await page.mouse.click(660, 440);
await page.waitForFunction(() =>
  document.querySelector("#tutorialStep").textContent.includes("3 / 5"),
);
await page.keyboard.down("d");
await page.keyboard.press("Space", { delay: 100 });
await page.keyboard.up("d");
await page.waitForFunction(() =>
  document.querySelector("#tutorialStep").textContent.includes("4 / 5"),
);
await page.keyboard.press("e");
await page.locator("#answer").fill('$(".infected").hide();');
await page.screenshot({ path: "artifacts/qa/02-tutorial-code.png" });
await page.locator("#submit").click();
await page.locator("#storyPanel").waitFor({ state: "visible" });
await page.screenshot({ path: "artifacts/qa/03-story.png" });
await page.locator("#storySkip").click();
await page.waitForFunction(() => window.scene.phase === "combat");
assert.equal(await page.evaluate(() => window.scene.character), "allie");
// Actual movement, weapon, pause and damage/respawn checks before accelerated chapter fixtures.
const before = await page.evaluate(() => window.scene.player.x);
await page.keyboard.down("d");
await page.waitForTimeout(500);
await page.keyboard.up("d");
assert.ok((await page.evaluate(() => window.scene.player.x)) > before + 40);
await page.keyboard.press("2");
await page.waitForTimeout(100);
assert.equal(await page.evaluate(() => window.scene.weapon), "shotgun");
await page.mouse.click(760, 410);
await page.waitForTimeout(100);
assert.ok((await page.evaluate(() => window.scene.magazines.shotgun)) < 6);
await page.keyboard.press("r");
await page.waitForTimeout(1800);
assert.equal(await page.evaluate(() => window.scene.magazines.shotgun), 6);
await page.locator("#pauseButton").click();
const paused = await page.evaluate(() => ({
  clock: window.scene.clock,
  x: window.scene.player.x,
}));
await page.keyboard.down("w");
await page.waitForTimeout(200);
await page.keyboard.up("w");
assert.deepEqual(
  await page.evaluate(() => ({
    clock: window.scene.clock,
    x: window.scene.player.x,
  })),
  paused,
);
await page.getByRole("button", { name: "Lanjutkan", exact: true }).click();
await page.evaluate(() => {
  window.scene.invulnerable = 0;
  window.scene.damage(100);
});
await page.getByRole("button", { name: "Bangkit lagi", exact: true }).click();
assert.equal(await page.evaluate(() => window.scene.hp), 100);
await page.evaluate(() => {
  window.scene.spawnTimer = 999;
  window.scene.buddyShot = 999;
  window.scene.addEnemy(0, { x: 500, y: 580 });
});
await page.waitForTimeout(1200);
const aim = await page.evaluate(() => {
  const s = window.scene,
    r = s.game.canvas.getBoundingClientRect();
  return {
    x: r.x + ((500 - s.cameras.main.scrollX) * r.width) / 1200,
    y: r.y + ((568 - s.cameras.main.scrollY) * r.height) / 720,
  };
});
await page.mouse.move(aim.x, aim.y);
await page.mouse.down();
await page.waitForFunction(() => window.scene.kills >= 1, null, {
  timeout: 5000,
});
await page.mouse.up();
await page.evaluate(() => {
  window.scene.spawnTimer = 0.1;
  window.scene.buddyShot = 0;
});
await page.waitForTimeout(1600);
await page.screenshot({ path: "artifacts/qa/04-combat.png" });
const solutions = [
  '$(".infected").hide();',
  '$("#relay-core").fadeOut();',
  '$(".enemy.shielded").removeClass("shielded");',
  '$(\'.enemy[data-threat="high"]\').addClass("marked");',
  '$("#sector-b .enemy").hide();',
  '$("#exit-gate").removeClass("locked").show();',
  '$("#pulse-switch").on("click", function () { $(".jammer").hide(); });',
  '$("#boss").removeClass("shielded").fadeOut();',
];
for (let wave = 0; wave < 8; wave++) {
  await page.waitForFunction(
    (w) => window.scene.wave === w && window.scene.phase === "combat",
    wave,
  );
  await page.waitForFunction(w=>document.querySelector("#waveLabel").textContent.startsWith(String(w+1).padStart(2,"0")),wave);
  // Advance physical objectives by holding E at their real positions. Combat quota is accelerated for this integration test.
  for (let i = 0; i < 2; i++) {
    await page.evaluate(
      async ({ wave, i }) => {
        const { chapters } = await import("/src/gameplay/story.ts");
        const t = chapters[wave].tasks[i];
        window.scene.player.x = t.x;
        window.scene.player.y = t.y;
        window.scene.invulnerable = 100;
      },
      { wave, i },
    );
    await page.keyboard.down("e");
    await page.waitForFunction((i) => window.scene.taskIndex > i, i, {
      timeout: 10000,
    });
    await page.keyboard.up("e");
  }
  if (wave === 7) {
    await page.waitForFunction(() => window.scene.bossSpawned);
    await page.evaluate(() => {
      window.scene.player.x = 1770;
      window.scene.player.y = 650;
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: "artifacts/qa/07-boss.png" });
  }
  await page.evaluate(() => {
    const s = window.scene;
    s.enemies.forEach((e) => e.g.destroy());
    s.enemies = [];
    s.kills = s.quota;
    s.player.x = 2040;
    s.player.y = 620;
    s.spawnTimer = 999;
  });
  await page.locator("#codeButton").waitFor({ state: "visible" });
  await page.locator("#codeButton").click();
  const pos = await page.evaluate(() => ({
    x: window.scene.player.x,
    y: window.scene.player.y,
    clock: window.scene.clock,
  }));
  await page.locator("#answer").fill("wasd ");
  await page.keyboard.press("Space");
  await page.waitForTimeout(150);
  assert.deepEqual(
    await page.evaluate(() => ({
      x: window.scene.player.x,
      y: window.scene.player.y,
      clock: window.scene.clock,
    })),
    pos,
  );
  if (wave === 0) {
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.locator("#closeEditor").click();
    const blurClock = await page.evaluate(() => window.scene.clock);
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(() => window.scene.clock), blurClock);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.locator("#codeButton").click();
    await page.route("**/api/run/submit", (route) => route.abort(), {
      times: 1,
    });
    await page.locator("#answer").fill(solutions[0]);
    await page.locator("#submit").click();
    await page.waitForFunction(() =>
      document.querySelector("#feedback").textContent.includes("Coba lagi"),
    );
    assert.match(
      await page.locator("#scoreState").innerText(),
      /Pengiriman pertama/,
    );
    assert.equal(await page.evaluate(() => window.scene.wave), 0);
    await page.locator("#answer").fill('$(".ally").hide()');
    await page.locator("#submit").click();
    await page.waitForFunction(() =>
      document
        .querySelector("#scoreState")
        .textContent.includes("Poin bab ini: 0"),
    );
    await page.screenshot({ path: "artifacts/qa/05-wrong-answer.png" });
  }
  await page.locator("#answer").fill(solutions[wave]);
  await page.locator("#submit").click();
  if (wave === 6) {
    await page.locator("#pulse").waitFor({ state: "visible" });
    assert.equal(
      await page.evaluate(() => window.scene.visuals.get("jammer-a").visible),
      true,
    );
    await page.screenshot({ path: "artifacts/qa/06-switch.png" });
    await page.locator("#pulse").click();
  }
  await page.locator("#storyPanel").waitFor({ state: "visible" });
  if (wave === 0)
    assert.equal(
      await page.evaluate(() => window.scene.visuals.get("virus-a").visible),
      false,
    );
  if (wave === 1)
    assert.equal(
      await page.evaluate(() => window.scene.visuals.get("relay-core").visible),
      false,
    );
  if (wave === 2)
    assert.equal(
      await page.evaluate(
        () => window.scene.visuals.get("tank-a").getData("shield").visible,
      ),
      false,
    );
  if (wave === 3)
    assert.equal(
      await page.evaluate(() =>
        window.scene.visuals.get("threat-a").getData("marked"),
      ),
      true,
    );
  if (wave === 5)
    assert.equal(
      await page.evaluate(() => window.scene.visuals.get("exit-gate").visible),
      true,
    );
  if (wave === 6)
    assert.equal(
      await page.evaluate(() => window.scene.visuals.get("jammer-a").visible),
      false,
    );
  await page.locator("#storySkip").click();
  if (wave < 7) {
    await page.locator("#dialogActions button").first().click();
    await page.locator("#storySkip").click();
  }
}
await page.waitForFunction(() => window.scene.phase === "escape");
assert.equal(await page.locator("#results").isVisible(), false);
await page.waitForTimeout(200);
await page.screenshot({ path: "artifacts/qa/07b-escape.png" });
// Escape is genuinely traversed with keyboard; objective completion is never inferred from signed score alone.
await page.keyboard.down("d");
await page.waitForFunction(() => window.scene.phase === "ending", null, {
  timeout: 10000,
});
await page.keyboard.up("d");
await page.locator("#storySkip").click();
await page.locator("#results").waitFor({ state: "visible" });
assert.match(await page.locator(".score").innerText(), /87,5/);
assert.match(await page.locator("#results").innerText(), /TEST-08/);
await page.screenshot({ path: "artifacts/qa/08-results.png" });
await page.setViewportSize({ width: 1280, height: 720 });
await page.screenshot({ path: "artifacts/qa/09-results-laptop.png" });
assert.equal(
  await page
    .locator("#results")
    .evaluate((e) => e.scrollHeight <= e.clientHeight),
  true,
);
await page.getByRole("button", { name: "Main Lagi", exact: true }).click();
await page
  .getByRole("button", { name: "Langsung ke cerita", exact: true })
  .click();
await page.locator("#storySkip").click();
assert.equal(await page.evaluate(() => window.scene.wave), 0);
assert.deepEqual(errors, []);
console.log(
  "Browser integration PASS: tutorial, Allie, movement, shotgun/reload, pause, respawn, 8 physical objectives + signed submissions (combat accelerated), switch, escape, 87.5 results, replay, 1280x720. No page errors.",
);
await browser.close();
