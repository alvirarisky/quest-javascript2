import { test } from "node:test";
import assert from "node:assert/strict";
import { challenges, select } from "../shared/challenges";
import { validate, parseCommand } from "../server/validator";
import { start, submit, result, sign, verify } from "../server/state";
import { handle } from "../server/handler";
process.env.RUN_SIGNING_SECRET = "test-only-secret-with-at-least-32-characters";
for (const [i, c] of challenges.entries()) {
  test(`wave ${i + 1}: canonical and whitespace`, () => {
    assert.equal(validate(i, c.solution).correct, true);
    assert.equal(
      validate(i, " \n" + c.solution.replace(/;$/, "") + " ").correct,
      true,
    );
  });
  test(`wave ${i + 1}: wrong targets and method`, () => {
    assert.equal(validate(i, '$(".ally").hide();').correct, false);
    assert.equal(validate(i, '$("#missing").hide();').correct, false);
    assert.equal(
      validate(
        i,
        c.solution
          .replace(".hide()", ".show()")
          .replace(".fadeOut()", ".hide()")
          .replace("removeClass", "addClass")
          .replace('addClass("marked")', 'removeClass("marked")')
          .replace(".on(", ".bind("),
      ).correct,
      false,
    );
  });
}
test("equivalent quotes and compound order", () => {
  assert.equal(validate(0, "$('.infected').hide()").correct, true);
  assert.equal(
    validate(2, "$('.shielded.enemy').removeClass('shielded')").correct,
    true,
  );
});
test("broad selectors rejected", () => {
  assert.equal(validate(0, '$(".enemy").hide()').correct, false);
  assert.equal(
    validate(2, '$(".shielded").removeClass("shielded")').correct,
    false,
  );
  assert.equal(validate(4, '$(".enemy").hide()').correct, false);
});
test("chaining and order", () => {
  assert.equal(validate(5, '$("#exit-gate").show()').correct, false);
  assert.equal(
    validate(7, '$("#boss").fadeOut().removeClass("shielded")').correct,
    false,
  );
});
test("arbitrary code and unsupported callbacks rejected", () => {
  for (const code of [
    "window.alert(1)",
    "process.exit()",
    '$(".infected")["hide"]()',
    '$(".infected").hide(); fetch("x")',
    "$(window).hide()",
    "$(`.infected`).hide()",
    "while(true){}",
    '$("#pulse-switch").on("click",()=>{$(".jammer").hide()})',
    '$("#pulse-switch").on("click",function(){document.body.remove()})',
  ]) {
    assert.throws(() => parseCommand(code));
  }
});
test("selector parser restricts scope and supports ancestors", () => {
  assert.throws(() => select("body", challenges[0].entities));
  assert.throws(() => select(".enemy, body", challenges[0].entities));
  assert.deepEqual(select("#sector-b .enemy", challenges[4].entities), [
    "b-drone",
    "b-heavy",
  ]);
});
test("first correct is 12.5; wrong then correct remains zero", () => {
  let r = start();
  let a = submit(r.token, challenges[0].solution);
  assert.equal(a.state.first[0], true);
  assert.equal(a.state.attempts[0], 1);
  let b = submit(r.token, "bad()");
  b = submit(b.token, challenges[0].solution);
  assert.equal(b.state.first[0], false);
  assert.equal(b.state.attempts[0], 2);
});
test("eight correct scores 100; unfinished result rejected", () => {
  let r = start();
  assert.throws(() => result(r.token));
  for (const c of challenges) r = submit(r.token, c.solution);
  assert.equal(result(r.token).score, 100);
});
test("token mutation, signature, expiry, version", () => {
  const r = start();
  assert.throws(() => verify(r.token + "x"));
  assert.throws(() => verify("x.y"));
  assert.throws(() => verify(sign({ ...r.state, exp: Date.now() - 1 })));
  assert.throws(() => verify(sign({ ...r.state, version: 2 as 1 })));
});
test("client score ignored; malformed envelopes do not mutate token", () => {
  const r = start();
  const out = handle("submit", {
    token: r.token,
    answer: challenges[0].solution,
    score: 100,
    attemptCount: 0,
    completedWaves: 8,
  }) as ReturnType<typeof submit>;
  assert.equal(out.state.wave, 1);
  assert.equal(out.state.first.filter(Boolean).length, 1);
  assert.throws(() => submit(r.token, ""));
  assert.throws(() => submit(r.token, "x".repeat(2001)));
  assert.equal(verify(r.token).attempts[0], 0);
});
test("stateless retries deterministic along same state chain", () => {
  const r = start();
  assert.deepEqual(submit(r.token, "wrong()"), submit(r.token, "wrong()"));
});
