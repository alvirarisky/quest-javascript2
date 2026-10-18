import type { Entity } from "./selector.js";
export { parseSelector, select, type Entity } from "./selector.js";
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
