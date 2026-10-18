import { chromium } from "@playwright/test";
const b = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto("http://127.0.0.1:5173/?qa=1");
await p.waitForFunction(() => !document.querySelector("#start").disabled);
await p.locator("#name").fill("Layout");
await p.locator("#student").fill("QA");
await p.locator("#start").click();
await p.locator("#play").waitFor();
await p.locator("#skipIntro").click();
await p.waitForTimeout(400);
console.log(
  await p.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    nodes: [...document.querySelectorAll("body *")]
      .map((e) => ({
        tag: e.tagName,
        id: e.id,
        class: e.className,
        left: e.getBoundingClientRect().left,
        right: e.getBoundingClientRect().right,
        width: e.getBoundingClientRect().width,
      }))
      .filter((r) => r.width > 0 && (r.right > innerWidth + 1 || r.left < 0))
      .slice(0, 25),
  })),
);
await p.screenshot({ path: "artifacts/invasion/mobile-layout.png" });
await p.locator("#stepAction").click();
await p.waitForFunction(() => window.__invasion.world.progress === 1);
await p.locator("#stepAction").click();
await p.locator("#taskPanel").waitFor();
await p.screenshot({ path: "artifacts/invasion/mobile-camera-decision.png" });
await p.getByRole('button', {name: /Bunyikan alarm freezer/}).click();
await p.locator('#stepAction').click();
await p.locator('.option').first().waitFor();
const camera = await p.evaluate(() => ({ width: window.__invasion.world.cameras.main.width, scroll: window.__invasion.world.cameras.main.scrollX, player: window.__invasion.world.player.x }));
if (camera.width !== 600 || camera.scroll <= 0 || camera.player < 850) throw new Error('Portrait camera did not follow the player');
await p.screenshot({path:'artifacts/invasion/mobile-camera-quiz.png'});
console.log('PASS: portrait camera follows player through both tasks and terminal.');
await b.close();
