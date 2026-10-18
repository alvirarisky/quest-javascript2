import type { State } from "../../server/state";
import type { Character, Line } from "../gameplay/story";
export type Stage =
  "intro" | "walk" | "answer" | "outro" | "ending" | "results";
export function restoreCheckpoint(stored: any, state: State) {
  if (
    !stored ||
    !["noah", "allie"].includes(stored.selected) ||
    typeof stored.identity?.name !== "string" ||
    typeof stored.identity?.student !== "string"
  )
    throw Error("Checkpoint rusak. Mulai perjalanan baru.");
  // Only the current unsolved chapter or the immediately preceding solved one is valid.
  const latest = Math.min(state.wave, 7);
  const room =
    Number.isInteger(stored.room) &&
    stored.room >= 0 &&
    (stored.room === latest || stored.room === state.wave - 1)
      ? stored.room
      : latest;
  const completed = state.completed[room];
  const valid: Stage[] = completed
    ? [
        "walk",
        "answer",
        "outro",
        ...(room === 7 ? (["ending", "results"] as Stage[]) : []),
      ]
    : ["intro", "walk"];
  const stage: Stage = valid.includes(stored.stage) ? stored.stage : "walk";
  const history: Line[] = Array.isArray(stored.history)
    ? stored.history
        .filter(
          (l: any) =>
            l &&
            ["Noah", "Allie", "Radio"].includes(l.who) &&
            typeof l.text === "string",
        )
        .slice(-200)
    : [];
  return {
    room,
    stage,
    selected: stored.selected as Character,
    identity: {
      name: stored.identity.name.slice(0, 80),
      student: stored.identity.student.slice(0, 40),
    },
    history,
    lineIndex: Number.isInteger(stored.lineIndex)
      ? Math.max(0, stored.lineIndex)
      : 0,
  };
}
