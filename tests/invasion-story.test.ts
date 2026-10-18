import { test } from "node:test";
import assert from "node:assert/strict";
import { start, submit, result, verify } from "../server/state";
import { question, answerChoice } from "../server/quiz";
import { challenges } from "../shared/challenges";
import { damage, ending, chapterBeat } from "../src/invasion/story";
process.env.RUN_SIGNING_SECRET ||=
  "story-tests-signing-secret-at-least-32-chars";
test("story: wrong answer advances once, persists signed damage, no score; legacy still retries", () => {
  const run = start("story");
  const q = question(run.token);
  const wrong = q.choices.find((c) => c.code !== challenges[0].solution)!;
  const next = answerChoice(run.token, wrong.id);
  assert.equal(next.correct, false);
  assert.equal(next.state.wave, 1);
  assert.equal(next.state.completed[0], true);
  assert.equal(resultFor(next.token)[0], true);
  assert.throws(() => answerChoice(next.token, wrong.id));
  assert.equal(submit(start().token, wrong.code).state.wave, 0);
  function resultFor(token: string) {
    return damage(verify(token));
  }
});
test("story: all wrong still finishes with 0 and eight consequences", () => {
  let token = start("story").token;
  for (let i = 0; i < 8; i++) {
    const q = question(token),
      wrong = q.choices.find((c) => c.code !== challenges[i].solution)!;
    token = answerChoice(token, wrong.id).token;
  }
  const r = result(token);
  assert.equal(r.score, 0);
  assert.deepEqual(damage(r.state), Array(8).fill(true));
});
test("endings depend on chosen plan AND surviving network, with specific losses retained", () => {
  const clean = Array(8).fill(false),
    broken = [...clean];
  broken[6] = true;
  assert.equal(ending(clean, "cut").title, "KOTA TANPA SUARA");
  assert.equal(ending(clean, "broadcast").title, "PAGI PERTAMA");
  assert.equal(ending(broken, "broadcast").title, "SUARA KETIGA");
  const train = [...clean];
  train[4] = true;
  assert.equal(ending(train, "broadcast").title, "YANG TIDAK KEMBALI");
  assert.notEqual(chapterBeat(5, clean), chapterBeat(5, train));
});
