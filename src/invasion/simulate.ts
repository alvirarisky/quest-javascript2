import { select, type Entity } from "../../shared/selector";
// Replays a submitted jQuery answer on the quiz's scanner elements: the code
// types out, the selection lights up (hit / wrong / missed), then each method
// in the chain visibly changes the chips. Returns a cleanup for its timers.
type Step = { method: string; value?: string };
function chain(part: string): { selector: string | null; steps: Step[] } {
  const head = /\$\((['"])(.*?)\1\)/.exec(part);
  if (!head) return { selector: null, steps: [] };
  const rest = part.slice(head.index + head[0].length);
  const steps = [...rest.matchAll(/\.(\w+)\(\s*(?:(['"])(.*?)\2)?/g)].map(
    (m) => ({ method: m[1], value: m[3] }),
  );
  return { selector: head[2], steps };
}
function matched(selector: string | null, entities: Entity[]) {
  try {
    return selector ? select(selector, entities) : [];
  } catch {
    return [];
  }
}
function tag(text: string, className = "tag") {
  const i = document.createElement("i");
  i.className = className;
  i.textContent = text;
  return i;
}
export function simulate(
  root: HTMLElement,
  code: string,
  entities: Entity[],
  targets: string[],
  correct: boolean,
  reduced: boolean,
): () => void {
  const timers: number[] = [];
  const later = (fn: () => void, ms: number) =>
    timers.push(window.setTimeout(fn, reduced ? 0 : ms));
  root.replaceChildren();
  const title = document.createElement("p");
  title.className = "sim-title";
  title.textContent = "SIMULASI DOM";
  const pre = document.createElement("pre");
  pre.className = "sim-code";
  const list = document.createElement("div");
  list.className = "sim-chips";
  const verdict = document.createElement("p");
  verdict.className = "sim-verdict";
  verdict.setAttribute("role", "status");
  root.append(title, pre, list, verdict);
  const chips = new Map<string, HTMLElement>();
  for (const e of entities) {
    const chip = document.createElement("div");
    chip.className = "chip" + (e.hidden ? " is-hidden" : "");
    if (e.parent) chip.classList.add("child");
    const id = document.createElement("b");
    id.textContent = (e.parent ? "↳ " : "") + "#" + e.id;
    chip.append(id, ...e.classes.map((c) => tag("." + c)));
    for (const [k, v] of Object.entries(e.attrs ?? {}))
      chip.append(tag(`${k}="${v}"`, "attr"));
    chips.set(e.id, chip);
    list.append(chip);
  }
  // Event handlers: the callback runs on its own selection after a "click".
  const [outer, inner = ""] = code.split(/function\s*\(\s*\)/);
  const main = chain(outer),
    callback = chain(inner),
    hits = matched(main.selector, entities);
  const typeSpeed = 14;
  if (reduced) pre.textContent = code;
  else
    [...code].forEach((_, i) =>
      later(() => (pre.textContent = code.slice(0, i + 1)), i * typeSpeed),
    );
  let t = code.length * typeSpeed + 300;
  later(() => {
    for (const [id, chip] of chips) {
      const hit = hits.includes(id),
        aimed = targets.includes(id);
      if (hit) chip.classList.add(aimed ? "hit" : "wrong");
      else if (aimed) chip.classList.add("missed");
    }
  }, t);
  const apply = (ids: string[], step: Step) => {
    for (const id of ids) {
      const chip = chips.get(id)!;
      if (step.method === "hide" || step.method === "fadeOut")
        chip.classList.add(step.method === "fadeOut" ? "fading" : "gone");
      else if (step.method === "show") chip.classList.remove("is-hidden");
      else if (step.method === "addClass" && step.value)
        chip.append(tag("." + step.value, "tag added"));
      else if (step.method === "removeClass" && step.value)
        chip
          .querySelectorAll(".tag")
          .forEach(
            (node) =>
              node.textContent === "." + step.value &&
              node.classList.add("removed"),
          );
      else if (step.method === "on") chip.append(tag("⚡ click", "handler"));
    }
  };
  for (const step of main.steps) {
    t += 700;
    later(() => apply(hits, step), t);
    if (step.method === "on") {
      t += 900;
      const inside = matched(callback.selector, entities);
      later(
        () => hits.forEach((id) => chips.get(id)!.classList.add("clicked")),
        t,
      );
      for (const inner of callback.steps) {
        t += 600;
        later(() => apply(inside, inner), t);
      }
    }
  }
  later(() => {
    const sorted = (ids: string[]) => [...ids].sort().join();
    const aimed = sorted(hits) === sorted(targets),
      extra = hits.filter((id) => !targets.includes(id)),
      missed = targets.filter((id) => !hits.includes(id));
    verdict.className = "sim-verdict " + (correct ? "ok" : "bad");
    verdict.textContent = correct
      ? "✓ Tepat sasaran. Hanya target yang terkena, dengan method dan urutan yang benar."
      : !main.selector || (!hits.length && !missed.length)
        ? "✗ Selector tidak memilih apa pun."
        : aimed
          ? "✗ Seleksinya sudah tepat, tetapi method, argumen, atau urutannya salah."
          : `✗ Salah sasaran.${extra.length ? " Ikut terkena: #" + extra.join(", #") + "." : ""}${missed.length ? " Terlewat: #" + missed.join(", #") + "." : ""}`;
  }, t + 500);
  return () => timers.forEach((id) => clearTimeout(id));
}
