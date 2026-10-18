import $ from "jquery";
import { select, type Entity, type Plan } from "../shared/challenges";
import type { Arena } from "./game";
export class Registry {
  root = document.createElement("div");
  entities: Entity[] = [];
  onEvent = () => {};
  constructor(private arena: Arena) {
    this.root.hidden = true;
    this.root.setAttribute("aria-hidden", "true");
    document.body.append(this.root);
  }
  reset(entities: Entity[]) {
    $(this.root).find("*").off();
    this.root.replaceChildren();
    this.entities = structuredClone(entities);
    for (const e of entities) {
      const el = document.createElement("div");
      el.id = e.id;
      el.className = e.classes.join(" ");
      for (const [k, v] of Object.entries(e.attrs ?? {})) el.setAttribute(k, v);
      if (e.hidden) $(el).hide();
      const parent = e.parent
        ? this.root.querySelector("#" + e.parent)
        : this.root;
      (parent ?? this.root).append(el);
    }
    this.arena.showEntities(entities);
  }
  snapshot() {
    const lines: string[] = [];
    const walk = (parent: Element, depth: number) => {
      for (const el of parent.children) {
        const attrs = Array.from(el.attributes)
          .map((a) => `${a.name}="${a.value}"`)
          .join(" ");
        lines.push("  ".repeat(depth) + `<div ${attrs}>`);
        walk(el, depth + 1);
        lines.push("  ".repeat(depth) + "</div>");
      }
    };
    walk(this.root, 0);
    return lines.join("\n");
  }
  async apply(plan: Plan) {
    const ids = select(plan.selector, this.entities);
    for (const op of plan.operations) {
      if (op.method === "on") {
        for (const id of ids) {
          const el = this.root.querySelector("#" + id)!;
          $(el)
            .off("click.codegun")
            .one("click.codegun", () => {
              void this.apply(op.callback!).then(() => this.onEvent());
            });
        }
        continue;
      }
      await Promise.all(
        ids.map(async (id) => {
          const el = this.root.querySelector("#" + id) as HTMLElement;
          switch (op.method) {
            case "hide":
              $(el).hide();
              break;
            case "show":
              $(el).show();
              break;
            case "fadeOut":
              await Promise.all([
                new Promise<void>((resolve) =>
                  $(el).fadeOut(650, () => resolve()),
                ),
                this.arena.sync(id, el, op.method),
              ]);
              return;
            case "removeClass":
              $(el).removeClass(op.value!);
              break;
            case "addClass":
              $(el).addClass(op.value!);
              break;
          }
          await this.arena.sync(id, el, op.method);
        }),
      );
    }
  }
  click() {
    const el = this.root.querySelector("#pulse-switch");
    if (el) $(el).trigger("click");
  }
}
