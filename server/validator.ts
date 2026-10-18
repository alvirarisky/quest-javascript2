import { parse } from "acorn";
import {
  challenges,
  select,
  type Plan,
  type Op,
} from "../shared/challenges.js";
export function parseCommand(code: string): Plan {
  if (code.length > 2000) throw Error("Kode maksimal 2000 karakter.");
  const ast: any = parse(code, { ecmaVersion: 2022 });
  const literal = (n: any) => {
    if (n?.type !== "Literal" || typeof n.value !== "string")
      throw Error("Argumen harus string literal.");
    return n.value as string;
  };
  function expression(n: any, depth = 0): Plan {
    if (depth > 8 || n?.type !== "CallExpression" || n.optional)
      throw Error("Gunakan satu ekspresi jQuery yang didukung.");
    if (
      n.callee.type === "Identifier" &&
      n.callee.name === "$" &&
      n.arguments.length === 1
    )
      return { selector: literal(n.arguments[0]), operations: [] };
    if (
      n.callee.type !== "MemberExpression" ||
      n.callee.computed ||
      n.callee.optional
    )
      throw Error("Akses ini tidak diizinkan.");
    const p = expression(n.callee.object, depth + 1),
      method = n.callee.property.name;
    const args = n.arguments;
    let op: Op;
    if (["hide", "show", "fadeOut"].includes(method) && args.length === 0)
      op = { method };
    else if (["removeClass", "addClass"].includes(method) && args.length === 1)
      op = { method, value: literal(args[0]) };
    else if (method === "on" && args.length === 2) {
      const f = args[1];
      if (
        literal(args[0]) !== "click" ||
        f.type !== "FunctionExpression" ||
        f.id ||
        f.async ||
        f.generator ||
        f.params.length ||
        f.body.body.length !== 1 ||
        f.body.body[0].type !== "ExpressionStatement"
      )
        throw Error("Gunakan function () { satu perintah; } untuk click.");
      const callback = expression(f.body.body[0].expression, depth + 1);
      if (callback.operations.some((x) => x.method === "on"))
        throw Error("Handler bertingkat ditolak.");
      op = { method: "on", value: "click", callback };
    } else throw Error("Method atau argumen tidak diizinkan.");
    p.operations.push(op);
    return p;
  }
  if (ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement")
    throw Error("Hanya satu expression statement diperbolehkan.");
  return expression(ast.body[0].expression);
}
export function validate(wave: number, code: string) {
  try {
    const c = challenges[wave],
      plan = parseCommand(code);
    const ids = select(plan.selector, c.entities);
    if (
      JSON.stringify([...ids].sort()) !== JSON.stringify([...c.targets].sort())
    )
      throw Error(
        "Selection belum tepat: periksa target, ally, dan decoy di scanner.",
      );
    const signature = plan.operations.map(
      (o) => o.method + (o.value ? ":" + o.value : ""),
    );
    if (JSON.stringify(signature) !== JSON.stringify(c.ops))
      throw Error("Periksa method, argumen, dan urutan operasi yang diminta.");
    if (
      (wave === 0 && !plan.selector.includes(".infected")) ||
      (wave === 1 && !plan.selector.includes("#relay-core")) ||
      (wave === 2 &&
        (!plan.selector.includes(".enemy") ||
          !plan.selector.includes(".shielded"))) ||
      (wave === 3 && !plan.selector.includes("[data-threat=")) ||
      (wave === 4 && !/\s/.test(plan.selector.trim())) ||
      (wave >= 5 && !plan.selector.includes("#" + c.targets[0]))
    )
      throw Error("Gunakan jenis selector yang sedang dipelajari.");
    if (wave === 6) {
      const cb = plan.operations[0].callback!;
      if (
        JSON.stringify(select(cb.selector, c.entities).sort()) !==
          JSON.stringify(["jammer-a", "jammer-b"]) ||
        cb.operations.length !== 1 ||
        cb.operations[0].method !== "hide"
      )
        throw Error("Callback harus menyembunyikan semua jammer saja.");
    }
    return {
      correct: true,
      feedback: "Perintah tepat. Efek diterapkan ke arena.",
      plan,
    };
  } catch (e) {
    return {
      correct: false,
      feedback: e instanceof Error ? e.message : "Perintah tidak valid.",
    };
  }
}
