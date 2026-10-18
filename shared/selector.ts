// Selector matching only — no challenge data, so the client may import it
// without shipping the answer key.
export type Entity = {
  id: string;
  classes: string[];
  attrs?: Record<string, string>;
  parent?: string;
  hidden?: boolean;
};
// Deliberately small CSS grammar: compound ID/class/attribute selectors and descendants.
export function parseSelector(selector: string) {
  if (selector.length > 200) throw Error("Selector terlalu panjang.");
  let i = 0;
  const parts: { kind: string; name: string; value?: string }[][] = [];
  const ident = () => {
    const m = /^[a-zA-Z_][\w-]*/.exec(selector.slice(i));
    if (!m) throw Error("Nama selector tidak valid.");
    i += m[0].length;
    return m[0];
  };
  while (i < selector.length) {
    while (/\s/.test(selector[i] ?? "") && i < selector.length) i++;
    if (i === selector.length) break;
    const part: { kind: string; name: string; value?: string }[] = [];
    while (i < selector.length && !/\s/.test(selector[i])) {
      const c = selector[i++];
      if (c === "." || c === "#") part.push({ kind: c, name: ident() });
      else if (c === "[") {
        const name = ident();
        if (selector[i++] !== "=")
          throw Error("Gunakan atribut dengan nilai literal.");
        const quote = selector[i++];
        if (quote !== "'" && quote !== '"')
          throw Error("Nilai atribut wajib dikutip.");
        let value = "";
        while (i < selector.length && selector[i] !== quote)
          value += selector[i++];
        if (selector[i++] !== quote || selector[i++] !== "]")
          throw Error("Atribut tidak lengkap.");
        part.push({ kind: "attr", name, value });
      } else
        throw Error(
          'Subset selector: #id, .class, [atribut="nilai"], dan spasi.',
        );
    }
    if (!part.length) throw Error("Selector kosong.");
    parts.push(part);
  }
  if (!parts.length || parts.length > 5)
    throw Error("Selector tidak didukung.");
  return parts;
}
export function select(selector: string, entities: Entity[]) {
  const parts = parseSelector(selector);
  const match = (e: Entity, p: (typeof parts)[number]) =>
    p.every((t) =>
      t.kind === "#"
        ? e.id === t.name
        : t.kind === "."
          ? e.classes.includes(t.name)
          : e.attrs?.[t.name] === t.value,
    );
  return entities
    .filter((e) => {
      let n = parts.length - 1;
      if (!match(e, parts[n--])) return false;
      let parent = entities.find((x) => x.id === e.parent);
      while (n >= 0) {
        while (parent && !match(parent, parts[n]))
          parent = entities.find((x) => x.id === parent!.parent);
        if (!parent) return false;
        n--;
        parent = entities.find((x) => x.id === parent!.parent);
      }
      return true;
    })
    .map((e) => e.id);
}
