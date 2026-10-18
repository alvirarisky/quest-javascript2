import { start, submit, result, verify } from "./state.js";
import { question, answerChoice } from "./quiz.js";
export function handle(action: string, body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw Error("Envelope JSON tidak valid.");
  const b = body as Record<string, unknown>;
  if (action === "resume") return { state: verify(b.token) };
  if (action === "start")
    return start(b.mode === "story" ? "story" : undefined, b.identity);
  if (action === "question") return question(b.token);
  if (action === "submit")
    return b.choice !== undefined
      ? answerChoice(b.token, b.choice)
      : submit(b.token, b.answer);
  if (action === "result") return result(b.token);
  throw Error("Endpoint tidak ditemukan.");
}
export function endpoint(action: string) {
  return (req: any, res: any) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST")
      return res.status(405).json({ error: "Gunakan POST." });
    try {
      if (
        Number(req.headers["content-length"] ?? 0) > 12000 ||
        JSON.stringify(req.body ?? {}).length > 12000
      )
        return res.status(413).json({ error: "Request terlalu besar." });
      return res.status(200).json(handle(action, req.body));
    } catch (e) {
      return res
        .status(400)
        .json({ error: e instanceof Error ? e.message : "Request gagal." });
    }
  };
}
