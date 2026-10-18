export type Entity = {
  id: string;
  classes: string[];
  attrs?: Record<string, string>;
  parent?: string;
  hidden?: boolean;
};
export type Op = {
  method: "hide" | "show" | "fadeOut" | "removeClass" | "addClass" | "on";
  value?: string;
  callback?: Plan;
};
export type Plan = { selector: string; operations: Op[] };
const e = (
  id: string,
  classes: string,
  extra: Partial<Entity> = {},
): Entity => ({ id, classes: classes.split(" ").filter(Boolean), ...extra });
export const challenges = [
  {
    title: "Infected Signal",
    topic: "Class selector · hide",
    mission:
      "Aktifkan purge UV: sembunyikan semua infected bertanda. Lindungi ally dan target yang tidak bertanda.",
    solution: '$(".infected").hide();',
    hint: "Titik memilih class. hide() menyembunyikan elemen.",
    entities: [
      e("virus-a", "enemy infected"),
      e("virus-b", "enemy infected"),
      e("medic", "ally"),
      e("clean", "enemy"),
    ],
    targets: ["virus-a", "virus-b"],
    ops: ["hide"],
  },
  {
    title: "Priority Target",
    topic: "ID selector · fadeOut",
    mission: "Matikan beacon palsu relay-core menggunakan transisi fade.",
    solution: '$("#relay-core").fadeOut();',
    hint: "Tanda # memilih ID unik. Gunakan fadeOut().",
    entities: [
      e("relay-core", "relay"),
      e("relay-decoy", "relay"),
      e("medic", "ally"),
    ],
    targets: ["relay-core"],
    ops: ["fadeOut"],
  },
  {
    title: "Shield Breaker",
    topic: "Compound class · removeClass",
    mission:
      "Lepaskan shielded hanya dari enemy bershield, bukan ally. Shield yang dilepas menonaktifkan serangan infected.",
    solution: '$(".enemy.shielded").removeClass("shielded");',
    hint: "Gabungkan dua class tanpa spasi untuk memilih elemen yang memiliki keduanya.",
    entities: [
      e("tank-a", "enemy shielded"),
      e("tank-b", "enemy shielded"),
      e("escort", "ally shielded"),
      e("clean", "enemy"),
    ],
    targets: ["tank-a", "tank-b"],
    ops: ["removeClass:shielded"],
  },
  {
    title: "Threat Classification",
    topic: "Attribute selector · addClass",
    mission:
      'Tandai enemy data-threat="high" dengan marked untuk mengaktifkan tactical strike.',
    solution: '$(\'.enemy[data-threat="high"]\').addClass("marked");',
    hint: 'Gunakan [atribut="nilai"] dan class enemy. addClass() menambahkan penanda.',
    entities: [
      e("threat-a", "enemy", { attrs: { "data-threat": "high" } }),
      e("threat-b", "enemy", { attrs: { "data-threat": "high" } }),
      e("scout", "enemy", { attrs: { "data-threat": "low" } }),
      e("escort", "ally", { attrs: { "data-threat": "high" } }),
    ],
    targets: ["threat-a", "threat-b"],
    ops: ["addClass:marked"],
  },
  {
    title: "Sector Cleanup",
    topic: "Descendant selector · hide",
    mission:
      "Sembunyikan enemy di dalam sector-b saja. Pertahankan ally dan sektor lain.",
    solution: '$("#sector-b .enemy").hide();',
    hint: "Spasi di antara selector berarti turunan dari parent.",
    entities: [
      e("sector-a", "sector"),
      e("sector-b", "sector"),
      e("a-drone", "enemy", { parent: "sector-a" }),
      e("b-drone", "enemy", { parent: "sector-b" }),
      e("b-heavy", "enemy", { parent: "sector-b" }),
      e("b-ally", "ally", { parent: "sector-b" }),
    ],
    targets: ["b-drone", "b-heavy"],
    ops: ["hide"],
  },
  {
    title: "Reveal the Exit",
    topic: "Method chaining · show",
    mission:
      "Buka exit-gate: hapus locked, lalu tampilkan exit yang tersembunyi.",
    solution: '$("#exit-gate").removeClass("locked").show();',
    hint: "Sambungkan method pada selection yang sama. Lepaskan kunci sebelum show().",
    entities: [
      e("exit-gate", "gate locked", { hidden: true }),
      e("decoy-gate", "gate locked"),
    ],
    targets: ["exit-gate"],
    ops: ["removeClass:locked", "show"],
  },
  {
    title: "Bind the Pulse",
    topic: "Event handler · callback",
    mission:
      "Pasang handler click pada pulse-switch. Di dalam function () { ... }, sembunyikan semua jammer. Setelah terpasang, aktifkan switch.",
    solution:
      '$("#pulse-switch").on("click", function () { $(".jammer").hide(); });',
    hint: 'on("click", function () { perintah; }) memasang handler, belum menjalankannya.',
    entities: [
      e("pulse-switch", "switch"),
      e("jammer-a", "jammer"),
      e("jammer-b", "jammer"),
      e("escort", "ally"),
    ],
    targets: ["pulse-switch"],
    ops: ["on:click"],
  },
  {
    title: "The Breakwater",
    topic: "ID selector · ordered chaining",
    mission:
      "Shield boss hanya dapat ditembus Code Gun. Lepaskan shielded dari boss, lalu fadeOut untuk purge.",
    solution: '$("#boss").removeClass("shielded").fadeOut();',
    hint: "Pilih ID boss. Urutannya penting: lepaskan shield, kemudian fade.",
    entities: [e("boss", "enemy shielded"), e("escort", "ally shielded")],
    targets: ["boss"],
    ops: ["removeClass:shielded", "fadeOut"],
  },
];
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
