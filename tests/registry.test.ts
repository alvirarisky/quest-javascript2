import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { challenges } from "../shared/challenges";
import { parseCommand } from "../server/validator";
import type { Arena } from "../src/game";
const dom = new JSDOM(
  '<body><div id="outside" class="infected">HUD</div></body>',
);
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
});
const { Registry } = await import("../src/registry");
const effects: { id: string; method: string; hidden: boolean }[] = [];
const bridge = {
  showEntities() {},
  async sync(id: string, el: HTMLElement, method: string) {
    effects.push({ id, method, hidden: el.style.display === "none" });
  },
} as unknown as Arena;
const registry = new Registry(bridge);
for (const [i, c] of challenges.entries()) {
  test(`registry wave ${i + 1}: real jQuery and bridge`, async () => {
    effects.length = 0;
    registry.reset(c.entities);
    if (i === 5) {
      assert.equal(
        (registry.root.querySelector("#exit-gate") as HTMLElement).style
          .display,
        "none",
      );
      assert.equal(
        registry.root.querySelector("#exit-gate")!.classList.contains("locked"),
        true,
      );
    }
    let events = 0;
    registry.onEvent = () => events++;
    await registry.apply(parseCommand(c.solution));
    if (i === 6) {
      assert.equal(effects.length, 0);
      assert.equal(events, 0);
      registry.click();
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(events, 1);
      assert.equal(effects.length, 2);
      registry.click();
      assert.equal(events, 1);
    } else assert.ok(effects.length >= c.targets.length);
    if (i === 5) {
      assert.notEqual(
        (registry.root.querySelector("#exit-gate") as HTMLElement).style
          .display,
        "none",
      );
      assert.equal(
        registry.root.querySelector("#exit-gate")!.classList.contains("locked"),
        false,
      );
    }
    assert.equal(
      (document.querySelector("#outside") as HTMLElement).style.display,
      "",
    );
  });
}
test("scanner retains parent hierarchy; reset removes old handler", async () => {
  registry.reset(challenges[4].entities);
  assert.match(registry.snapshot(), /id="sector-b"[^\n]*\n  <div id="b-drone"/);
  registry.reset(challenges[6].entities);
  await registry.apply(parseCommand(challenges[6].solution));
  registry.reset(challenges[6].entities);
  effects.length = 0;
  registry.click();
  assert.equal(effects.length, 0);
});
