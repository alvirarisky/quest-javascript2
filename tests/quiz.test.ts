import { test } from "node:test";
import assert from "node:assert/strict";
import { start, result } from "../server/state.js";
import { question, answerChoice } from "../server/quiz.js";
import { challenges } from "../shared/challenges.js";
process.env.RUN_SIGNING_SECRET =
  "quiz-tests-secret-at-least-thirty-two-characters";
test("eight quiz choices use server validation, wrong answers can be repaired", () => {
  let { token } = start();
  for (let wave = 0; wave < 8; wave++) {
    const q = question(token);
    assert.equal(q.wave, wave);
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices.map((o) => o.id)).size, 4);
    assert.ok(!("solution" in q));
    assert.deepEqual(question(token), q);
    if (wave === 0) {
      const wrong = answerChoice(
        token,
        q.choices.find((o) => o.code !== challenges[wave].solution)!.id,
      );
      assert.equal(wrong.correct, false);
      assert.equal(wrong.state.wave, 0);
      token = wrong.token;
    }
    const correct = answerChoice(
      token,
      q.choices.find((o) => o.code === challenges[wave].solution)!.id,
    );
    assert.equal(correct.correct, true);
    assert.equal(correct.state.wave, wave + 1);
    token = correct.token;
  }
  assert.equal(result(token).score, 87.5);
  assert.throws(() => question(token));
});
test("choice tokens cannot be used for another run or fabricated", () => {
  const a = start(),
    b = start();
  assert.throws(() => answerChoice(b.token, question(a.token).choices[0].id));
  assert.throws(() => answerChoice(a.token, "correct"));
  assert.throws(() => question(a.token + "tampered"));
});
