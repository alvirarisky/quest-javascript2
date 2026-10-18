import { test } from "node:test";
import assert from "node:assert/strict";
import { start, submit, result, verify } from "../server/state";
import { question, answerChoice } from "../server/quiz";
import { handle } from "../server/handler";
import { challenges } from "../shared/challenges";
import {
  damage,
  ending,
  chapterBeat,
  rank,
  streak,
} from "../src/invasion/story";
process.env.RUN_SIGNING_SECRET ||=
  "story-tests-signing-secret-at-least-32-chars";
test("story: wrong answer advances once, persists signed damage, no score; legacy still retries", () => {
  const run = start("story");
  const q = question(run.token);
  const wrong = q.choices.find((c) => c.code !== challenges[0].solution)!;
  const next = answerChoice(run.token, wrong.id);
  assert.equal(next.correct, false);
  // Story answers are final: targets come back for the in-game breakdown…
  assert.deepEqual(
    (next as { targets?: string[] }).targets,
    challenges[0].targets,
  );
  // …but the retry-based legacy mode never reveals them.
  assert.equal("targets" in submit(start().token, wrong.code), false);
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
test("escape rank rewards clean or daring runs; streak counts back from the room", () => {
  assert.equal(rank({ time: 4000, catches: 0, closeCalls: 0 }), "S");
  assert.equal(rank({ time: 30000, catches: 0, closeCalls: 0 }), "A");
  assert.equal(rank({ time: 30000, catches: 0, closeCalls: 2 }), "S");
  assert.equal(rank({ time: 9000, catches: 0, closeCalls: 0 }, true), "S");
  assert.equal(rank({ time: 5000, catches: 1, closeCalls: 3 }), "B");
  assert.equal(rank({ time: 5000, catches: 3, closeCalls: 0 }), "C");
  assert.equal(rank({ time: 5000, catches: 4, closeCalls: 0 }), "D");
  assert.equal(streak([true, true, false, true, true, true], 5), 3);
  assert.equal(streak([true, false], 1), 0);
});
test("identity is bound at start and returned with the result; no verify endpoint", () => {
  assert.throws(() => start("story", { name: "A", student: "1", kelas: " " }));
  let run = start("story", { name: " Rina ", student: "123", kelas: "TI-2A" });
  assert.deepEqual(run.state.identity, {
    name: "Rina",
    student: "123",
    kelas: "TI-2A",
  });
  let token = run.token;
  for (let i = 0; i < 8; i++) {
    const q = question(token),
      pick = q.choices.find(
        (c) => (i === 0) !== (c.code === challenges[i].solution),
      )!;
    token = answerChoice(token, pick.id).token;
  }
  const r = result(token);
  assert.equal(r.score, 87.5);
  // The result carries the identity signed into the run, not the client's.
  assert.equal(r.proof?.name, "Rina");
  assert.equal(r.proof?.kelas, "TI-2A");
  assert.equal(r.proof?.score, 87.5);
  assert.equal(r.proof?.correct, 7);
  assert.throws(() => handle("proof", { proof: token }));
});
