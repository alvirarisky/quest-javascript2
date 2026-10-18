import { test } from "node:test";
import assert from "node:assert/strict";
import { restoreCheckpoint } from "../src/quiz/checkpoint";
import { start, submit } from "../server/state";
import { handle } from "../server/handler";
import { challenges } from "../shared/challenges";
import { question, answerChoice } from "../server/quiz";
process.env.RUN_SIGNING_SECRET =
  "checkpoint-test-secret-at-least-32-characters";
const base = {
  selected: "allie",
  identity: { name: "Student", student: "01" },
  history: [],
  room: 0,
  stage: "walk",
};
test("resume returns signed state, ignoring forged cached progress", () => {
  const run = start();
  const checked = handle("resume", {
    token: run.token,
    state: { wave: 8 },
  }) as { state: typeof run.state };
  assert.equal(checked.state.wave, 0);
  const restored = restoreCheckpoint(
    { ...base, room: 7, state: { wave: 7 }, stage: "results" },
    checked.state,
  );
  assert.equal(restored.room, 0);
  assert.equal(restored.stage, "walk");
  assert.throws(() => handle("resume", { token: run.token + "invalid" }));
});
test("checkpoint keeps pending pulse separate from repaired world", () => {
  let run = start();
  for (let i = 0; i < 7; i++) run = submit(run.token, challenges[i].solution);
  const restored = restoreCheckpoint(
    { ...base, room: 6, stage: "answer" },
    run.state,
  );
  assert.equal(restored.stage, "answer");
  assert.equal(restored.room, 6);
  assert.equal(
    restoreCheckpoint(
      { ...base, room: 6, stage: "outro", lineIndex: 2 },
      run.state,
    ).lineIndex,
    2,
  );
});
test("corrupt identity rejected, invalid history filtered, legacy checkpoints supported", () => {
  assert.throws(() =>
    restoreCheckpoint({ ...base, identity: null }, start().state),
  );
  assert.throws(() =>
    restoreCheckpoint({ ...base, selected: "missing" }, start().state),
  );
  const restored = restoreCheckpoint(
    {
      ...base,
      stage: undefined,
      history: [
        null,
        { who: "Noah", text: "Hello" },
        { who: "unknown", text: 1 },
      ],
      lineIndex: -10,
    },
    start().state,
  );
  assert.equal(restored.stage, "walk");
  assert.equal(restored.lineIndex, 0);
  assert.equal(restored.history.length, 1);
});
test("each quiz has exactly one correct choice; every distractor stays on the same chapter", () => {
  let run = start();
  for (let i = 0; i < 8; i++) {
    const q = question(run.token);
    const outcomes = q.choices.map((c) => answerChoice(run.token, c.id));
    assert.equal(outcomes.filter((o) => o.correct).length, 1);
    for (const wrong of outcomes.filter((o) => !o.correct)) {
      assert.equal(wrong.state.wave, i);
      assert.equal(wrong.state.attempts[i], 1);
    }
    run = outcomes.find((o) => o.correct)!;
  }
});

test('solo POV alternates consistently for both opening characters and restored rooms', async () => {
  const {sceneFor} = await import('../src/quiz/scenes');
  for (const opening of ['noah','allie'] as const) {
    for (let room=0;room<8;room++) {
      const scene=sceneFor(opening,room);
      assert.equal(scene.character,room%2===0?opening:opening==='noah'?'allie':'noah');
      assert.notEqual(scene.character,scene.partner);
      assert.notEqual(scene.place,scene.remotePlace);
      assert.ok(scene.intro.length && scene.outro.length);
    }
  }
});
