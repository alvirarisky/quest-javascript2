import { test } from "node:test";
import assert from "node:assert/strict";
import { chapters, ending } from "../src/gameplay/story";
import {
  makeObstacles,
  findPath,
  blocked,
  lineClear,
  move,
  director,
  weapons,
  distance,
} from "../src/gameplay/systems";
import { pauseReasons, keys, resetInput } from "../src/gameplay/input";
test("eight story chapters have independent physical tasks and narrative payoff", () => {
  assert.equal(chapters.length, 8);
  for (const c of chapters) {
    assert.ok(c.tasks.length >= 2);
    assert.ok(c.intro.length >= 2);
    assert.ok(c.outro.length >= 2);
    assert.ok(c.quota > 0);
  }
  assert.ok(ending.some((l) => l.who === "Allie"));
  assert.ok(ending.some((l) => l.who === "Noah"));
});
for (let wave = 0; wave < 8; wave++)
  test(`chapter ${wave + 1}: objectives and terminal reachable without crossing walls`, () => {
    const obstacles = makeObstacles(wave);
    let from = { x: 190, y: 580 };
    for (const to of [
      ...chapters[wave].tasks,
      { x: 2080, y: 590 },
      { x: 2420, y: 600 },
    ]) {
      assert.equal(blocked(to.x, to.y, obstacles), false);
      const path = findPath(from, to, obstacles);
      assert.ok(path.length > 0);
      assert.ok(path.every((p) => !blocked(p.x, p.y, obstacles, 21)));
      assert.ok(distance(path.at(-1)!, to) < 30);
      for (let i = 1; i < path.length; i++)
        assert.equal(lineClear(path[i - 1], path[i], obstacles, 18), true);
      from = to;
    }
  });
test("collision blocks movement into building, allows sliding", () => {
  const obstacles = makeObstacles(0);
  const p = move({ x: 60, y: 200 }, 80, 20, obstacles);
  assert.equal(p.x, 60);
  assert.equal(p.y, 220);
  assert.equal(
    lineClear({ x: 40, y: 200 }, { x: 650, y: 200 }, obstacles),
    false,
  );
});
test("director reduces pressure at low health or overcrowding", () => {
  assert.equal(director(10, 20, 3).pack, 1);
  assert.equal(director(10, 100, 18).pack, 1);
  assert.equal(director(10, 100, 2).pack, 3);
  assert.ok(director(22, 100, 2).interval > director(10, 100, 2).interval);
});
test("weapons have distinct roles and pistol cannot exhaust reserve", () => {
  assert.equal(weapons.pistol.reserve, Infinity);
  assert.ok(weapons.shotgun.pellets > weapons.pistol.pellets);
  assert.ok(weapons.smg.rate < weapons.pistol.rate);
});
test("independent pause reasons cannot cancel one another", () => {
  pauseReasons.clear();
  pauseReasons.add("editor");
  pauseReasons.add("hidden");
  pauseReasons.delete("hidden");
  assert.equal(pauseReasons.has("editor"), true);
  keys.add("w");
  resetInput();
  assert.equal(keys.size, 0);
  pauseReasons.clear();
});
