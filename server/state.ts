import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { validate } from "./validator.js";
import { challenges } from "../shared/challenges.js";
export type Identity = { name: string; student: string; kelas: string };
export type State = {
  version: 1;
  mode?: "story";
  // Bound at start so the proof cannot be re-labelled after the run.
  identity?: Identity;
  runId: string;
  iat: number;
  exp: number;
  wave: number;
  attempts: number[];
  first: boolean[];
  completed: boolean[];
};
const secret = () => {
  const s = process.env.RUN_SIGNING_SECRET;
  if (!s || s.length < 32)
    throw Error(
      "Server belum dikonfigurasi: signing secret minimal 32 karakter.",
    );
  return s;
};
function seal(value: unknown) {
  const data = Buffer.from(JSON.stringify(value)).toString("base64url");
  return (
    data + "." + createHmac("sha256", secret()).update(data).digest("base64url")
  );
}
function open(token: unknown) {
  if (typeof token !== "string" || token.length > 6000)
    throw Error("Token tidak valid.");
  const [data, sig, ...extra] = token.trim().split(".");
  const expected = createHmac("sha256", secret())
    .update(data ?? "")
    .digest();
  const actual = Buffer.from(sig ?? "", "base64url");
  if (
    extra.length ||
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  )
    throw Error("Signature tidak valid.");
  return JSON.parse(Buffer.from(data, "base64url").toString());
}
export const sign = (s: State) => seal(s);
export function verify(token: unknown): State {
  const s = open(token);
  if (
    s.version !== 1 ||
    s.exp < Date.now() ||
    s.wave < 0 ||
    s.wave > 8 ||
    !Array.isArray(s.attempts) ||
    s.attempts.length !== 8
  )
    throw Error("Token kedaluwarsa atau versi tidak valid.");
  return s;
}
function identityOf(value: unknown): Identity | undefined {
  if (value === undefined) return undefined;
  const v = value as Record<string, unknown>;
  const field = (key: string, max: number) => {
    const text = typeof v?.[key] === "string" ? (v[key] as string).trim() : "";
    if (!text || text.length > max)
      throw Error("Nama, NIM, dan kelas wajib diisi.");
    return text;
  };
  return {
    name: field("name", 80),
    student: field("student", 40),
    kelas: field("kelas", 40),
  };
}
export function start(mode?: "story", who?: unknown) {
  const now = Date.now();
  const identity = identityOf(who);
  const state: State = {
    version: 1,
    ...(mode === "story" ? { mode } : {}),
    ...(identity ? { identity } : {}),
    runId: randomUUID(),
    iat: now,
    exp: now + 86400000,
    wave: 0,
    attempts: Array(8).fill(0),
    first: Array(8).fill(false),
    completed: Array(8).fill(false),
  };
  return { token: sign(state), state };
}
export function submit(token: unknown, answer: unknown) {
  if (typeof answer !== "string" || !answer.trim() || answer.length > 2000)
    throw Error("Jawaban harus berisi 1–2000 karakter.");
  const state = verify(token);
  if (state.wave === 8) throw Error("Run sudah selesai.");
  const wave = state.wave;
  const result = validate(wave, answer);
  state.attempts[wave]++;
  if (result.correct || state.mode === "story") {
    state.first[wave] = result.correct && state.attempts[wave] === 1;
    state.completed[wave] = true;
    state.wave++;
  }
  // Story answers are final, so the intended targets can be shown as feedback.
  return {
    ...result,
    ...(state.mode === "story" ? { targets: challenges[wave].targets } : {}),
    state,
    token: sign(state),
  };
}
export function result(token: unknown) {
  const state = verify(token);
  if (state.wave !== 8 || !state.completed.every(Boolean))
    throw Error("Selesaikan delapan tantangan dahulu.");
  const score = state.first.filter(Boolean).length * 12.5;
  if (!state.identity) return { state, score };
  const proof = {
    v: 1,
    runId: state.runId,
    ...state.identity,
    score,
    correct: state.first.filter(Boolean).length,
    startedAt: state.iat,
    finishedAt: Date.now(),
  };
  return { state, score, proof };
}
export type Proof = {
  v: 1;
  runId: string;
  name: string;
  student: string;
  kelas: string;
  score: number;
  correct: number;
  startedAt: number;
  finishedAt: number;
};
