import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { missions } from "../src/invasion/missions.ts";
import { challenges } from "../shared/challenges.ts";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.BASE_URL || "http://127.0.0.1:5173";
const SAVE = "dead-signal-story-v3";
await mkdir("artifacts/story", { recursive: true });
async function ready() {
  await page.waitForFunction(() => !document.querySelector("#start").disabled);
}
// Escape bot: wave what is close, hop crates, and let the action button walk or smash.
async function leave(wave) {
  for (let i = 0; i < 700; i++) {
    if (
      await page.evaluate(
        (w) =>
          window.__invasion.world.wave !== w ||
          !document.querySelector("#results").hidden,
        wave,
      )
    )
      return;
    if (await page.evaluate(() => !window.__invasion.world.blocked)) {
      const seen = await page.evaluate(() => {
        const w = window.__invasion.world,
          px = w.player.x,
          dir = w.player.flipX ? -1 : 1;
        return {
          close: w.hunters.some(
            (h) =>
              h.visible &&
              !h.getData("stun") &&
              !h.getData("patrol") &&
              Math.abs(h.x - px) < 150,
          ),
          crate: w.obstacles.some(
            (o) =>
              o.cat === "jump" &&
              (o.x - px) * dir > 0 &&
              (o.x - px) * dir < o.w / 2 + 62,
          ),
          // A live spark or steam vent ahead: wait for it to switch off.
          hazard: w.obstacles.some(
            (o) =>
              o.cat === "hazard" && o.on && Math.abs(o.x - px) < o.w / 2 + 90,
          ),
          // The boss sweep strikes when its warning runs out: jump just before.
          sweep:
            w.sweep?.phase === "warn" &&
            w.sweep.timer < 450 &&
            px > w.sweep.from - 20 &&
            px < w.sweep.to + 20,
        };
      });
      if (seen.sweep) await page.keyboard.press("Space");
      else if (seen.close) await page.keyboard.press("q");
      if (seen.sweep || (seen.hazard && !seen.close)) {
      } else if (seen.crate && !seen.close) await page.keyboard.press("Space");
      // Short timeout: if the exit fires mid-check, the chapter reveal must not be waited out.
      else
        await page
          .locator("#stepAction")
          .click({ timeout: 1000 })
          .catch(() => {});
    }
    await page.waitForTimeout(90);
  }
  throw Error("Could not leave wave " + wave);
}
async function solvePuzzle(kind) {
  if (kind === "wave") {
    const rows = page.locator(".wave-row");
    const heights = await rows.evaluateAll((rs) =>
      rs.map((r) =>
        [...r.querySelectorAll("i")].map((i) => i.style.height).join(),
      ),
    );
    const loop = heights.findIndex((h) => {
      const a = h.split(",");
      return (
        a.slice(0, 4).join() === a.slice(4, 8).join() &&
        a.slice(0, 4).join() === a.slice(8, 12).join()
      );
    });
    await rows.nth(1 - loop).click();
    assert.match(
      await page.locator("#taskFeedback").innerText(),
      /terdengar sampai luar/,
    );
    const again = await page
      .locator(".wave-row")
      .evaluateAll((rs) =>
        rs.map((r) =>
          [...r.querySelectorAll("i")].map((i) => i.style.height).join(),
        ),
      );
    await page
      .locator(".wave-row")
      .nth(
        again.findIndex((h) => {
          const a = h.split(",");
          return a.slice(0, 4).join() === a.slice(4, 8).join();
        }),
      )
      .click();
  } else if (kind === "socket") await page.locator(".socket-biru").click();
  else {
    // Count a full replay so no blink is missed while the panel opened.
    await page.locator(".voice-options").waitFor();
    await page.evaluate(() => {
      window.__blinks = 0;
      new MutationObserver(() => {
        if (document.querySelector(".test-lamp.on")) window.__blinks++;
      }).observe(document.querySelector(".test-lamp"), { attributes: true });
    });
    await page.getByRole("button", { name: "Ulangi kedipan" }).click();
    await page.locator(".voice-options").waitFor({ state: "hidden" });
    await page.locator(".voice-options").waitFor();
    const n = await page.evaluate(() => window.__blinks);
    await page
      .locator(".voice-options button", {
        hasText: ["", "", "Dua", "Tiga", "Empat"][n],
      })
      .click();
  }
}
try {
  await page.goto(base + "/?qa=1");
  await ready();
  await page.locator("#name").fill("Story QA");
  await page.locator("#student").fill("ST-08");
  await page.locator("#start").click();
  assert.equal(await page.locator("#menu").isVisible(), true);
  assert.equal(
    await page.locator("#kelas").evaluate((i) => i.validity.valueMissing),
    true,
  );
  await page.locator("#kelas").fill("TI-2A");
  await page.locator("#allie").click();
  await page.locator("#start").click();
  await page.locator("#skipIntro").click();
  await page.locator("#briefing").waitFor();
  await page.screenshot({ path: "artifacts/story/briefing.png" });
  await page.locator("#beginMission").click();
  for (let wave = 0; wave < 8; wave++) {
    console.log("Story mission", wave + 1);
    if (wave > 0) {
      await page.locator("#reveal").waitFor();
      await page.locator("#skipReveal").click();
    }
    // The chosen character never changes and nobody answers on the radio.
    assert.equal(
      await page.evaluate(() => window.__invasion.world.character),
      "allie",
    );
    await page.locator("#stepAction").click();
    await page.waitForFunction(() => window.__invasion.world.progress === 1);
    await page.locator("#stepAction").click();
    const t = missions[wave].tasks[1];
    if (t.choices || t.puzzle) {
      await page.locator("#taskPanel").waitFor();
      if (t.puzzle) {
        await page.screenshot({
          path: `artifacts/story/puzzle-${t.puzzle}.png`,
        });
        await solvePuzzle(t.puzzle);
      } else if (wave === 7)
        await page.getByRole("button", { name: /Balik siaran/ }).click();
      else
        await page
          .getByRole("button", {
            name: t.choices.find((c) => c.correct).label,
            exact: false,
          })
          .click();
    }
    await page.waitForFunction(() => window.__invasion.world.progress === 2);
    // The freezer alarm wails (red beacon) from the choice until the chapter ends.
    assert.equal(
      await page.evaluate(() => window.__invasion.world.alarmFx.length),
      wave === 0 ? 2 : 0,
    );
    await page.locator("#stepAction").click();
    await page.locator(".option").first().waitFor();
    const fail = [0, 2, 6].includes(wave);
    const options = await page.locator(".option").allTextContents();
    const index = options.findIndex((t) =>
      fail
        ? !t.includes(challenges[wave].solution)
        : t.includes(challenges[wave].solution),
    );
    assert.ok(index >= 0);
    await page.locator(".option").nth(index).click();
    await page.locator("#confirm").click();
    await page.locator("#activate").waitFor();
    // The submitted code replays on the scanner elements with a verdict.
    await page.waitForFunction(
      () => document.querySelector(".sim-verdict")?.textContent,
    );
    assert.match(
      await page.locator(".sim-verdict").innerText(),
      fail ? /^✗/ : /^✓/,
    );
    if (wave === 0) {
      await page.screenshot({ path: "artifacts/story/simulation.png" });
      // The guide opens on the current mission and explains every mission.
      await page.locator("#closeQuiz").click();
      await page.locator("#help").click();
      assert.equal(await page.locator(".guide-mission").count(), 8);
      assert.match(
        await page.locator(".guide-mission.current").innerText(),
        /SEKARANG/,
      );
      assert.doesNotMatch(
        await page.locator("#guideBody").innerText(),
        /\$\("\.infected"\)\.hide/,
      );
      await page.screenshot({ path: "artifacts/story/guide.png" });
      await page.locator("#closeGuide").click();
      await page.locator("#stepAction").click();
      await page.locator("#activate").waitFor();
    }
    if (fail) {
      assert.equal(await page.locator(".option").count(), 0);
      assert.match(await page.locator("#activate").innerText(), /akibat/);
    }
    if (wave === 2) {
      await page.reload();
      await ready();
      await page.locator("#resume").click();
      await page.locator("#activate").waitFor();
      assert.equal(
        await page.evaluate(() => window.__invasion.world.failures[2]),
        true,
      );
    }
    await page.locator("#activate").click();
    const world = await page.evaluate(() => ({
      escaping: window.__invasion.world.escaping,
      mode: window.__invasion.world.mode,
      hunters: window.__invasion.world.hunters.length,
    }));
    // Wave 1's wrong first wave pick alerted the relay room: the quiet chapter becomes a chase.
    assert.equal(world.escaping, wave !== 6 || fail);
    assert.equal(
      world.mode,
      { 1: "run", 3: "hide", 5: "defend", 6: "run" }[wave] ?? "run",
    );
    // Wrong answers thicken the chase; right ones thin it.
    if (wave === 0) assert.equal(world.hunters, 3);
    if (wave === 4) assert.equal(world.hunters, 3);
    if (wave === 2) {
      await page.keyboard.press("q");
      assert.equal(await page.locator("#pulse").isDisabled(), true);
      assert.ok(
        (await page.evaluate(() => window.__invasion.world.obstacles.length)) >
          0,
      );
      await page.locator("#pause").click();
      const x = await page.evaluate(() => window.__invasion.world.hunters[0].x);
      await page.waitForTimeout(200);
      assert.equal(
        await page.evaluate(() => window.__invasion.world.hunters[0].x),
        x,
      );
      await page.locator("#closeModal").click();
    }
    if (wave === 3 || wave === 5)
      await page.screenshot({
        path: `artifacts/story/escape-${world.mode}.png`,
      });
    if (wave === 7) {
      assert.equal(
        await page.evaluate(() => window.__invasion.world.bossNodes.length),
        3,
      );
      await page.screenshot({ path: "artifacts/story/finale.png" });
    }
    await leave(wave);
  }
  await page.waitForFunction(
    () => document.querySelector("#resultScore").textContent === "62,5 / 100",
  );
  assert.equal(await page.locator("#resultTitle").innerText(), "SUARA KETIGA");
  assert.match(await page.locator(".ending-copy").innerText(), /Allie/);
  assert.doesNotMatch(await page.locator(".ending-copy").innerText(), /Noah/);
  await page.locator("#proof").waitFor();
  assert.match(
    await page.locator("#proofFields").innerText(),
    /Story QA[\s\S]*ST-08[\s\S]*TI-2A[\s\S]*62,5/,
  );
  await page.screenshot({ path: "artifacts/story/ending-proof.png" });
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#downloadProof").click(),
  ]);
  assert.match(file.suggestedFilename(), /ST-08\.png$/);
  await file.saveAs("artifacts/story/bukti.png");
  // No assistant verification on the menu any more.
  await page.locator("#replay").click();
  assert.equal(await page.locator("#openVerify").count(), 0);
  // Server-issued completed runs exercise both alternate finale paths and resume.
  for (const plan of ["cut", "broadcast"]) {
    await page.evaluate(
      async ({ codes, plan, SAVE }) => {
        const post = async (action, body) =>
          (
            await fetch("/api/run/" + action, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          ).json();
        let run = await post("start", {
          mode: "story",
          identity: { name: "Finale QA", student: "QA", kelas: "X" },
        });
        for (const code of codes) {
          const q = await post("question", { token: run.token });
          run = await post("submit", {
            token: run.token,
            choice: q.choices.find((c) => c.code === code).id,
          });
        }
        localStorage.setItem(
          SAVE,
          JSON.stringify({
            token: run.token,
            room: 7,
            progress: 2,
            repaired: true,
            finished: false,
            opening: "noah",
            identity: { name: "Finale QA", student: "QA", kelas: "X" },
            history: [],
            finalPlan: plan,
            tutorialDone: true,
          }),
        );
      },
      { codes: challenges.map((c) => c.solution), plan, SAVE },
    );
    await page.reload();
    await ready();
    await page.locator("#resume").click();
    await page.locator("#play").waitFor();
    assert.equal(
      await page.evaluate(() => window.__invasion.world.bossNodes.length),
      plan === "cut" ? 2 : 3,
    );
    if (plan === "broadcast")
      await page.setViewportSize({ width: 390, height: 844 });
    await leave(7);
    await page.waitForFunction(
      () => document.querySelector("#resultScore").textContent === "100 / 100",
    );
    assert.equal(
      await page.locator("#resultTitle").innerText(),
      plan === "cut" ? "KOTA TANPA SUARA" : "PAGI PERTAMA",
    );
  }
  await page.screenshot({
    path: "artifacts/story/mobile-proof.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: fixed character, kelas, briefing, puzzles + noise, wave/jump/smash obstacles, hide/defend waves, damage, three endings, mobile final, proof PNG.",
  );
} catch (e) {
  await page.screenshot({ path: "artifacts/story/failure.png" });
  console.log(await page.locator("body").innerText());
  throw e;
} finally {
  await browser.close();
}
