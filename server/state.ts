import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { validate } from "./validator.js";
export type State = {
  version: 1;
  mode?: "story";
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
export function sign(s: State) {
  const data = Buffer.from(JSON.stringify(s)).toString("base64url");
  return (
    data + "." + createHmac("sha256", secret()).update(data).digest("base64url")
  );
}
export function verify(token: unknown): State {
  if (typeof token !== "string" || token.length > 6000)
    throw Error("Token tidak valid.");
  const [data, sig, ...extra] = token.split(".");
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
  const s = JSON.parse(Buffer.from(data, "base64url").toString());
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
export function start(mode?: "story") {
  const now = Date.now();
  const state: State = {
    version: 1,
    ...(mode === "story" ? { mode } : {}),
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
  return { ...result, state, token: sign(state) };
}
export function result(token: unknown) {
  const state = verify(token);
  if (state.wave !== 8 || !state.completed.every(Boolean))
    throw Error("Selesaikan delapan tantangan dahulu.");
  return { state, score: state.first.filter(Boolean).length * 12.5 };
}
