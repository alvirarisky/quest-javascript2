import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const solutions = [
  '$(".infected").hide();',
  '$("#relay-core").fadeOut();',
  '$(".enemy.shielded").removeClass("shielded");',
  `$('.enemy[data-threat="high"]').addClass("marked");`,
  '$("#sector-b .enemy").hide();',
  '$("#exit-gate").removeClass("locked").show();',
  '$("#pulse-switch").on("click", function () { $(".jammer").hide(); });',
  '$("#boss").removeClass("shielded").fadeOut();',
];
await mkdir("artifacts/quiz", { recursive: true });
try {
  await page.goto((process.env.BASE_URL || "http://127.0.0.1:5174") + "/?qa=1");
  await page.waitForFunction(() => window.__quiz?.world.player);
  await page.screenshot({ path: "artifacts/quiz/menu.png" });
  await page.locator("#allie").click();
  await page.locator("#name").fill("QA Allie");
  await page.locator("#student").fill("QUIZ-08");
  await page.locator("#start").click();
  await page.locator("#skip").click();
  assert.equal(
    await page.evaluate(() => window.__quiz.world.player.texture.key),
    "allie",
  );
  await page.keyboard.down("d");
  await page.waitForTimeout(500);
  await page.keyboard.up("d");
  assert.ok(await page.evaluate(() => window.__quiz.world.player.x > 220));
  await page.locator("#pause").click();
  const paused = await page.evaluate(() => window.__quiz.world.player.x);
  await page.keyboard.down("d");
  await page.waitForTimeout(200);
  await page.keyboard.up("d");
  assert.equal(await page.evaluate(() => window.__quiz.world.player.x), paused);
  await page.locator("#closeModal").click();
  assert.ok(await page.evaluate(() => document.querySelector("#interact").getBoundingClientRect().bottom <= innerHeight));
  await page.screenshot({ path: "artifacts/quiz/walkway.png" });
  for (let wave = 0; wave < 8; wave++) {
    assert.equal(
      await page.evaluate(() => window.__quiz.world.player.texture.key),
      wave % 2 === 0 ? "allie" : "noah",
    );
    assert.equal(
      await page.evaluate(
        () =>
          window.__quiz.world.children.list.filter(
            (o) => o.texture && ["noah", "allie"].includes(o.texture.key),
          ).length,
      ),
      1,
    );
    if (wave === 0) {
      await page.keyboard.down("d");
      await page.waitForFunction(() => window.__quiz.world.player.x > 790);
      await page.keyboard.up("d");
    } else
      await page.evaluate(() => {
        window.__quiz.world.player.x = 890;
      });
    await page.keyboard.press("e");
    await page.locator(".option").first().waitFor();
    if (wave === 0) {
      const wrong = page
        .locator(".option")
        .filter({ hasNot: page.locator("code", { hasText: solutions[0] }) })
        .first();
      await wrong.click();
      await page.locator("#confirm").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#feedback")
          .textContent.startsWith("Belum tepat"),
      );
      assert.match(
        await page.locator("#scoreState").innerText(),
        /Poin bab ini: 0/,
      );
    }
    await page
      .locator(".option")
      .filter({ has: page.getByText(solutions[wave], { exact: true }) })
      .click();
    if (wave === 1) {
      await page.route("**/api/run/submit", (route) => route.abort());
      await page.locator("#confirm").click();
      await page.waitForFunction(
        () => !document.querySelector("#confirm").disabled,
      );
      assert.match(
        await page.locator("#scoreState").innerText(),
        /Jawaban pertama/,
      );
      await page.unroute("**/api/run/submit");
    }
    if (wave === 2)
      await page.screenshot({ path: "artifacts/quiz/question.png" });
    await page.locator("#confirm").click();
    await page.locator("#continue").waitFor();
    if (wave === 6)
      assert.equal(
        await page.locator("#continue").innerText(),
        "Aktifkan pulse-switch",
      );
    await page.locator("#continue").click();
    await page.locator("#skip").click();
    assert.equal(await page.evaluate(() => window.__quiz.world.repaired), true);
    if (wave === 3) {
      await page.reload();
      await page.waitForFunction(() => window.__quiz?.world.player);
      await page.locator("#resume").click();
      await page.waitForFunction(
        () => window.__quiz.world.wave === 3 && window.__quiz.world.repaired,
      );
    }
    await page.evaluate(() => {
      window.__quiz.world.player.x = 1550;
    });
    await page.keyboard.press("e");
    await page.locator("#skip").click();
  }
  await page.waitForFunction(
    () => document.querySelector("#resultScore").textContent === "87,5 / 100",
  );
  await page.screenshot({ path: "artifacts/quiz/results.png" });
  await page.locator("#replay").click();
  await page.locator("#noah").click();
  await page.locator("#start").click();
  await page.locator("#skip").click();
  assert.equal(
    await page.evaluate(() => window.__quiz.world.player.texture.key),
    "noah",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    window.__quiz.world.player.x = 890;
  });
  await page.locator("#interact").click();
  await page.locator(".option").first().waitFor();
  await page.screenshot({ path: "artifacts/quiz/mobile.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 8 chapters, both characters, walking, pause, wrong/retry, network retry, checkpoint, pulse, ending 87.5, mobile.",
  );
} catch (error) {
  await page.screenshot({ path: "artifacts/quiz/failure.png" });
  console.log(await page.locator("body").innerText());
  throw error;
} finally {
  await browser.close();
}
