import { createHmac } from "node:crypto";
import { challenges } from "../shared/challenges.js";
import { verify, submit } from "./state.js";

const distractors = [
  ['$("#infected").hide();', '$(".enemy").hide();', '$(".infected").show();'],
  [
    '$(".relay").fadeOut();',
    '$("#relay-core").show();',
    '$("#relay-decoy").fadeOut();',
  ],
  [
    '$(".shielded").removeClass("shielded");',
    '$(".enemy .shielded").removeClass("shielded");',
    '$(".enemy.shielded").addClass("shielded");',
  ],
  [
    '$(\'.enemy[data-threat="low"]\').addClass("marked");',
    '$(\'[data-threat="high"]\').addClass("marked");',
    '$(\'.enemy[data-threat="high"]\').removeClass("marked");',
  ],
  [
    '$("#sector-a .enemy").hide();',
    '$("#sector-b").hide();',
    '$("#sector-b .ally").hide();',
  ],
  [
    '$("#exit-gate").show().removeClass("locked");',
    '$("#exit-gate").removeClass("locked").hide();',
    '$(".gate").removeClass("locked").show();',
  ],
  [
    '$("#pulse-switch").on("click", function () { $(".jammer").show(); });',
    '$("#pulse-switch").on("click", function () { $(".ally").hide(); });',
    '$(".jammer").hide();',
  ],
  [
    '$("#boss").fadeOut().removeClass("shielded");',
    '$(".shielded").removeClass("shielded").fadeOut();',
    '$("#boss").removeClass("shielded").show();',
  ],
];
function options(token: unknown) {
  const state = verify(token);
  if (state.wave >= challenges.length) throw Error("Semua kuis sudah selesai.");
  const c = challenges[state.wave];
  return [c.solution, ...distractors[state.wave]]
    .map((code, i) => ({
      id: createHmac("sha256", process.env.RUN_SIGNING_SECRET!)
        .update(`${state.runId}:${state.wave}:${i}`)
        .digest("hex")
        .slice(0, 24),
      code,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
export function question(token: unknown) {
  const state = verify(token);
  const choices = options(token);
  const c = challenges[state.wave];
  return {
    wave: state.wave,
    topic: c.topic,
    mission: c.mission,
    hint: c.hint,
    entities: c.entities,
    choices,
  };
}
export function answerChoice(token: unknown, choice: unknown) {
  const option = options(token).find((o) => o.id === choice);
  if (!option) throw Error("Pilih salah satu jawaban dari kuis ini.");
  return submit(token, option.code);
}
