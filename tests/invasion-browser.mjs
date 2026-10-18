import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { missions } from "../src/invasion/missions.ts";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
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
await mkdir("artifacts/invasion", { recursive: true });
const base = process.env.BASE_URL || "http://127.0.0.1:5173";
async function ready() {
  await page.waitForFunction(
    () =>
      window.__invasion?.world.player &&
      !document.querySelector("#start").disabled,
  );
}
async function pause() {
  await page.locator("#pause").click();
  const x = await page.evaluate(() => window.__invasion.world.player.x);
  await page.keyboard.down("d");
  await page.waitForTimeout(200);
  await page.keyboard.up("d");
  assert.equal(await page.evaluate(() => window.__invasion.world.player.x), x);
  await page.locator("#closeModal").click();
}
try {
  await page.goto(base + "/?qa=1");
  await ready();
  await page.screenshot({ path: "artifacts/invasion/01-menu.png" });
  await page.locator("#allie").click();
  await page.locator("#name").fill("QA Invasion");
  await page.locator("#student").fill("INV-08");
  await page.locator("#start").click();
  await page.locator("#skipIntro").click();
  await page.locator("#play").waitFor();
  await page.waitForFunction(
    () => document.querySelector("canvas").getBoundingClientRect().width > 500,
  );
  await page.screenshot({ path: "artifacts/invasion/02-minimarket.png" });
  await pause();
  for (let wave = 0; wave < 8; wave++) {
    console.log("Mission", wave + 1);
    assert.equal(
      await page.evaluate(() => window.__invasion.world.player.texture.key),
      wave % 2 === 0 ? "allie" : "noah",
    );
    assert.equal(
      await page.evaluate(
        () =>
          window.__invasion.world.children.list.filter(
            (o) => o.texture && ["noah", "allie"].includes(o.texture.key),
          ).length,
      ),
      1,
    );
    assert.equal(await page.locator("#steps li.current").count(), 1);
    if (wave === 0) {
      const r = await page.locator("canvas").boundingBox();
      await page.mouse.click(
        r.x + (240 * r.width) / 1200,
        r.y + (190 * r.height) / 650,
      );
    } else await page.locator("#stepAction").click();
    await page.waitForFunction(() => window.__invasion.world.progress === 1);
    if (wave === 0) {
      const inv = await page.locator("#inventory").innerText();
      await page.reload();
      await ready();
      await page.locator("#resume").click();
      await page.waitForFunction(() => window.__invasion.world.progress === 1);
      assert.equal(await page.locator("#inventory").innerText(), inv);
    }
    await page.locator("#stepAction").click();
    const task = missions[wave].tasks[1];
    if (task.choices) {
      await page.locator("#taskPanel").waitFor();
      if (wave === 0) {
        await page
          .getByRole("button", {
            name: task.choices.find((c) => !c.correct).label,
            exact: false,
          })
          .click();
        assert.ok((await page.locator("#taskFeedback").innerText()).length > 0);
        assert.equal(
          await page.evaluate(() => window.__invasion.world.progress),
          1,
        );
      }
      await page
        .getByRole("button", {
          name: task.choices.find((c) => c.correct).label,
          exact: false,
        })
        .click();
    }
    await page.waitForFunction(() => window.__invasion.world.progress === 2);
    if (wave === 1)
      await page.route("**/api/run/question", (r) =>
        r.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Endpoint tidak ditemukan." }),
        }),
      );
    await page.locator("#stepAction").click();
    if (wave === 1) {
      await page.locator("#retryQuiz").waitFor();
      assert.match(await page.locator("#feedback").innerText(), /versi lama/);
      await page.unroute("**/api/run/question");
      await page.locator("#retryQuiz").click();
    }
    await page.locator(".option").first().waitFor();
    assert.equal(await page.locator(".option").count(), 4);
    if (wave === 0) {
      await page
        .locator(".option")
        .filter({ hasNot: page.getByText(solutions[wave], { exact: true }) })
        .first()
        .click();
      await page.locator("#confirm").click();
      await page.waitForFunction(() =>
        document
          .querySelector("#feedback")
          .textContent.startsWith("Belum tepat"),
      );
      assert.match(
        await page.locator("#scoreState").innerText(),
        /Poin misi ini: 0/,
      );
    }
    await page
      .locator(".option")
      .filter({ has: page.getByText(solutions[wave], { exact: true }) })
      .click();
    if (wave === 2) {
      await page.screenshot({ path: "artifacts/invasion/03-quiz.png" });
      await page.route("**/api/run/submit", (r) => r.abort());
      await page.locator("#confirm").click();
      await page.waitForFunction(
        () => !document.querySelector("#confirm").disabled,
      );
      await page.unroute("**/api/run/submit");
    }
    await page.locator("#confirm").click();
    await page.locator("#activate").waitFor();
    if (wave === 6) {
      await page.reload();
      await ready();
      await page.locator("#resume").click();
      await page.locator("#activate").waitFor();
      assert.equal(
        await page.evaluate(() => window.__invasion.world.repaired),
        false,
      );
      assert.match(await page.locator("#activate").innerText(), /pulse-switch/);
      await page.locator("#closeQuiz").click();
      await page.locator("#stepAction").click();
      await page.locator("#activate").waitFor();
    }
    await page.locator("#activate").click();
    assert.equal(
      await page.evaluate(() => window.__invasion.world.repaired),
      true,
    );
    if (wave === 0) {
      assert.equal(
        await page.evaluate(() => window.__invasion.world.escaping),
        true,
      );
      // Let the pursuit start, then repel it with a real keyboard action.
      await page.waitForTimeout(1600);
      const before = await page.evaluate(
        () => window.__invasion.world.hunters[0].x,
      );
      await page.keyboard.press("Space");
      const after = await page.evaluate(
        () => window.__invasion.world.hunters[0].x,
      );
      assert.ok(after < before - 180);
      assert.equal(await page.locator("#pulse").isDisabled(), true);
      await pause();
      await page.waitForFunction(
        () => !document.querySelector("#pulse").disabled,
      );
    }
    if (wave === 1)
      assert.equal(
        await page.evaluate(() => window.__invasion.world.props[1].alpha),
        0,
      );
    if (wave === 5)
      assert.equal(
        await page.evaluate(() => window.__invasion.world.gate.alpha),
        1,
      );
    if (wave === 7)
      await page.waitForFunction(() => !window.__invasion.world.core.visible);
    if ([0, 2, 4, 7].includes(wave))
      await page.screenshot({ path: `artifacts/invasion/effect-${wave}.png` });
    if (wave === 3) {
      await page.setViewportSize({ width: 1280, height: 720 });
      assert.ok(
        await page.evaluate(
          () =>
            document.querySelector("#stepAction").getBoundingClientRect()
              .bottom <= innerHeight,
        ),
      );
      await page.screenshot({ path: "artifacts/invasion/04-laptop.png" });
    }
    await page.locator("#stepAction").click();
    // The new escape requires repelling threats while crossing the room.
    for (let tick = 0; tick < 16; tick++) {
      if (
        await page.evaluate(
          (w) =>
            window.__invasion.world.wave !== w ||
            !document.querySelector("#results").hidden,
          wave,
        )
      )
        break;
      await page.keyboard.press("Space");
      await page.waitForTimeout(450);
      // A catch is recoverable without affecting the quiz score.
      if (
        await page.evaluate((w) => window.__invasion.world.wave === w && !window.__invasion.world.blocked && window.__invasion.world.destination === null, wave)
      )
        await page.locator("#stepAction").click();
    }
    if (wave < 7)
      await page.waitForFunction(
        (w) => window.__invasion.world.wave === w,
        wave + 1,
      );
  }
  await page.waitForFunction(
    () => document.querySelector("#resultScore").textContent === "87,5 / 100",
  );
  await page.screenshot({ path: "artifacts/invasion/05-ending.png" });
  await page.reload();
  await ready();
  await page.locator("#resume").click();
  await page.waitForFunction(
    () => document.querySelector("#resultScore").textContent === "87,5 / 100",
  );
  await page.locator("#replay").click();
  await page.locator("#noah").click();
  await page.locator("#start").click();
  await page.locator("#skipIntro").click();
  await page.locator("#play").waitFor();
  assert.equal(
    await page.evaluate(() => window.__invasion.world.character),
    "noah",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "artifacts/invasion/06-mobile.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator("#stepAction").click();
  await page.waitForFunction(() => window.__invasion.world.progress === 1);
  await page.locator("#stepAction").click();
  await page.locator("#taskPanel").waitFor();
  await page.screenshot({ path: "artifacts/invasion/07-mobile-decision.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all 8 missions with real auto-walking, 16 field steps, wrong field/quiz retry, API recovery, all backgrounds, solo POV, refresh prep/pulse/results, score87.5, laptop/mobile.",
  );
} catch (e) {
  await page.screenshot({ path: "artifacts/invasion/failure.png" });
  console.log(await page.locator("body").innerText());
  console.log(errors);
  throw e;
} finally {
  await browser.close();
}
