import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const url = (process.env.BASE_URL || "http://127.0.0.1:5174") + "/?qa=1";
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
async function ready() {
  await page.waitForFunction(() => window.__quiz?.world.player);
}
async function seed(count, extra = {}) {
  const data = await page.evaluate(
    async ({ count, solutions }) => {
      const api = async (action, body) =>
        (
          await fetch("/api/run/" + action, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        ).json();
      let run = await api("start", {});
      for (let i = 0; i < count; i++) {
        const q = await api("question", { token: run.token });
        run = await api("submit", {
          token: run.token,
          choice: q.choices.find((o) => o.code === solutions[i]).id,
        });
      }
      return run;
    },
    { count, solutions },
  );
  await page.evaluate(
    ({ data, count, extra }) =>
      localStorage.setItem(
        "dead-signal-quiz-v1",
        JSON.stringify({
          token: data.token,
          state: data.state,
          room: Math.max(0, count - 1),
          selected: "allie",
          identity: { name: "Audit", student: "QA" },
          history: [],
          stage: "answer",
          lineIndex: 0,
          ...extra,
        }),
      ),
    { data, count, extra },
  );
  await page.reload();
  await ready();
  await page.locator("#resume").click();
}
try {
  await page.goto(url);
  await ready();
  await seed(7);
  await page.waitForFunction(() => document.querySelector("#menu").hidden);
  assert.equal(
    await page.evaluate(() => window.__quiz.world.repaired),
    false,
    "refresh must not activate pulse automatically",
  );
  await page.locator("#continue").waitFor();
  assert.equal(
    await page.locator("#continue").innerText(),
    "Aktifkan pulse-switch",
  );
  await page.locator("#closeQuiz").click();
  assert.equal(await page.locator("#quiz").isVisible(), false);
  await page.evaluate(() => {
    window.__quiz.world.player.x = 900;
  });
  await page.keyboard.press("e");
  await page.locator("#continue").waitFor();
  assert.equal(
    await page.locator("#choices .option").count(),
    0,
    "completed chapter must not fetch next question",
  );
  await page.locator("#continue").click();
  await page.locator("#next").click();
  const line = await page.locator("#line").innerText();
  await page.reload();
  await ready();
  await page.locator("#resume").click();
  await page.locator("#story").waitFor();
  assert.equal(
    await page.locator("#line").innerText(),
    line,
    "dialogue position survives refresh",
  );
  await page.locator("#skip").click();
  await page.evaluate(() => {
    window.__quiz.world.player.x = 1100;
  });
  await page.keyboard.down("a");
  await page.waitForTimeout(400);
  await page.keyboard.up("a");
  assert.equal(
    await page.evaluate(
      () =>
        window.__quiz.world.children.list.filter(
          (o) => o.texture && ["noah", "allie"].includes(o.texture.key),
        ).length,
    ),
    1,
  );
  await seed(0, {
    room: 7,
    state: { wave: 7, completed: Array(8).fill(true) },
    stage: "walk",
  });
  await page.waitForFunction(() => document.querySelector("#menu").hidden);
  assert.equal(
    await page.evaluate(() => window.__quiz.world.wave),
    0,
    "server state wins over corrupt cached state/room",
  );
  await page.evaluate(() => {
    window.__quiz.world.player.x = 1200;
  });
  await page.waitForTimeout(100);
  assert.match(
    await page.evaluate(() => window.__quiz.world.prompt.text),
    /←/,
    "terminal behind player needs left arrow",
  );
  await page.evaluate(() => {
    window.__quiz.world.player.x = 900;
  });
  await page.keyboard.press("e");
  await page.locator(".option").first().waitFor();
  assert.equal(
    await page.evaluate(() => document.querySelector("#play").inert),
    true,
  );
  assert.equal(
    await page.evaluate(() => document.activeElement.closest("#quiz") !== null),
    true,
    "focus enters quiz",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.locator("#closeQuiz").click();
  assert.equal(
    await page.evaluate(() => window.__quiz.world.blocked),
    true,
    "closing overlay cannot cancel blur pause",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.route("**/api/run/question", (route) =>
    route.fulfill({
      status: 503,
      contentType: "text/html",
      body: "<h1>Unavailable</h1>",
    }),
  );
  await page.keyboard.press("e");
  await page.waitForFunction(
    () =>
      document.querySelector("#quizTitle").textContent ===
      "Terminal belum terhubung",
  );
  assert.doesNotMatch(
    await page.locator("#feedback").innerText(),
    /Unexpected token|JSON/,
  );
  assert.equal(await page.locator("#hint").isDisabled(), true);
  await page.unroute("**/api/run/question");
  await page.route("**/api/run/question", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Endpoint tidak ditemukan." }),
    }),
  );
  await page.locator("#retryQuiz").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#feedback")
      .textContent.includes("Server masih memakai versi lama"),
  );
  await page.unroute("**/api/run/question");
  await page.locator("#retryQuiz").click();
  await page.locator(".option").first().waitFor();
  assert.equal(await page.locator(".option").count(), 4);
  await mkdir("artifacts/quiz", { recursive: true });
  await page.screenshot({ path: "artifacts/quiz/recovered-question.png" });
  await page.locator("#closeQuiz").click();
  await page.route("**/api/run/result", (route) => route.abort());
  await seed(8, { stage: "results" });
  await page.locator("#retryResult").waitFor();
  assert.equal(await page.locator("#resultScore").innerText(), "— / 100");
  await page.unroute("**/api/run/result");
  await page.locator("#retryResult").click();
  await page.waitForFunction(
    () => document.querySelector("#resultScore").textContent === "100 / 100",
  );
  await page.locator("#replay").click();
  assert.equal(
    await page.locator("#allie").getAttribute("aria-pressed"),
    "true",
  );
  // Actual touch input at small landscape dimensions, no keyboard or teleport for walking.
  await page.setViewportSize({ width: 667, height: 375 });
  await page.locator("#start").click();
  await page.locator("#skip").click();
  const before = await page.evaluate(() => window.__quiz.world.player.x);
  const right = await page.locator("#right").boundingBox();
  await page.mouse.move(right.x + right.width / 2, right.y + right.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await page.mouse.up();
  assert.ok((await page.evaluate(() => window.__quiz.world.player.x)) > before);
  await page.locator("#pause").click();
  await page.locator("#toMenu").click();
  assert.equal(await page.locator("#menu").isVisible(), true);
  await page.evaluate(() =>
    localStorage.setItem("dead-signal-quiz-v1", "{broken"),
  );
  await page.reload();
  await ready();
  await page.locator("#resume").click();
  await page.waitForFunction(() =>
    document.querySelector("#startError").textContent.includes("Checkpoint"),
  );
  assert.equal(await page.locator("#menu").isVisible(), true);
  await page.locator("#name").fill("Retry start");
  await page.locator("#student").fill("QA");
  await page.route("**/api/run/start", (route) => route.abort());
  await page.locator("#start").click();
  await page.waitForFunction(() => !document.querySelector("#start").disabled);
  assert.equal(await page.locator("#menu").isVisible(), true);
  await page.unroute("**/api/run/start");
  await page.locator("#start").click();
  await page.locator("#story").waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS audit: pulse checkpoint, dialogue restore, server-authoritative resume, focus isolation, blur, API outage, results restore, replay selection, solo character, direction, touch, corrupt save.",
  );
} finally {
  await mkdir("artifacts/quiz", { recursive: true });
  await page.screenshot({ path: "artifacts/quiz/audit-last.png" });
  await browser.close();
}
