import { test } from "node:test";
import assert from "node:assert/strict";
import {
  missions,
  pov,
  partner,
  clampProgress,
} from "../src/invasion/missions";
test("four locations, eight missions, sixteen actionable preparation steps", () => {
  assert.equal(missions.length, 8);
  assert.equal(new Set(missions.map((m) => m.background)).size, 4);
  for (const m of missions) {
    assert.equal(m.tasks.length, 2);
    assert.ok(m.quiz && m.effect && m.villain && m.exit);
    assert.notEqual(m.tasks[0].x, m.tasks[1].x);
    for (const t of m.tasks) {
      assert.ok(t.instruction.length < 140);
      if (t.choices) assert.equal(t.choices.filter((c) => c.correct).length, 1);
    }
  }
});
test("POV alternates; partner never occupies the controlled role", () => {
  for (const opening of ["noah", "allie"] as const)
    for (let i = 0; i < 8; i++) {
      assert.notEqual(pov(opening, i), partner(opening, i));
      assert.equal(
        pov(opening, i),
        i % 2 === 0 ? opening : opening === "noah" ? "allie" : "noah",
      );
    }
});
test("checkpoint clamps prep progress and retains answered activation stage", () => {
  assert.equal(clampProgress(-4, false), 0);
  assert.equal(clampProgress(9, false), 2);
  assert.equal(clampProgress("2", false), 0);
  assert.equal(clampProgress(1, false), 1);
  assert.equal(clampProgress(null, true), 2);
});
