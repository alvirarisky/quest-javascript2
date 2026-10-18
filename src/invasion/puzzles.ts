// Field puzzles: short, ungraded, randomised each attempt so the text never
// gives the answer away. A miss reshuffles; the caller decides the cost.
export type PuzzleKind = "wave" | "socket" | "blink";
type Handlers = {
  solve: () => void;
  miss: (feedback: string, alarm?: boolean) => void;
};
const shuffle = <T>(items: T[]) =>
  items
    .map((v) => [Math.random(), v] as const)
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);
const pick = (n: number) => Math.floor(Math.random() * n);
function make<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
// Returns a cleanup that stops timers when the panel closes.
export function mountPuzzle(
  kind: PuzzleKind,
  root: HTMLElement,
  on: Handlers,
): () => void {
  let timers: number[] = [];
  const clear = () => {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  };
  const later = (fn: () => void, ms: number) =>
    timers.push(window.setTimeout(fn, ms));
  const wave = () => {
    const motif = Array.from({ length: 4 }, () => 2 + pick(8));
    const looped = [...motif, ...motif, ...motif];
    let noise: number[];
    do noise = Array.from({ length: 12 }, () => 2 + pick(8));
    while (noise.slice(0, 4).join() === noise.slice(4, 8).join());
    const fake = pick(2);
    ["A", "B"].forEach((name, i) => {
      const row = make("button", "wave-row");
      row.append(make("strong", "", `Kanal ${name}`));
      const bars = make("span", "wave-bars");
      for (const h of i === fake ? looped : noise) {
        const bar = make("i");
        bar.style.height = `${h * 10}%`;
        bars.append(bar);
      }
      row.append(bars);
      row.onclick = () =>
        i === fake
          ? on.solve()
          : on.miss(
              "Kanal itu berubah-ubah — ada orang sungguhan di sana. Rekaman selalu mengulang pola yang sama.",
            );
      root.append(row);
    });
  };
  const socket = () => {
    const row = make("div", "socket-row");
    const sockets = shuffle([
      { color: "biru", ok: true },
      { color: "merah", ok: false },
      { color: "hijau", ok: false },
    ]);
    for (const s of sockets) {
      const b = make("button", `socket socket-${s.color}`);
      b.setAttribute("aria-label", "Soket");
      b.append(make("span", "socket-name", s.color.toUpperCase()));
      b.onclick = () =>
        s.ok
          ? on.solve()
          : s.color === "merah"
            ? on.miss(
                "Soket merah tersambung ke alarm darurat stasiun. Sekringmu biru.",
                true,
              )
            : on.miss(
                `Itu soket ${s.color}. Sekringmu biru — perhatikan saat lampu menyala.`,
              );
      row.append(b);
    }
    root.append(row);
    const flash = () => {
      row.classList.add("lit");
      later(() => row.classList.remove("lit"), 260);
      later(flash, 1500);
    };
    later(flash, 500);
  };
  const blink = () => {
    const count = 2 + pick(3);
    const lamp = make("div", "test-lamp");
    lamp.setAttribute("aria-hidden", "true");
    const status = make("p", "lamp-status", "Perhatikan lampu…");
    const options = make("div", "voice-options");
    const words = ["", "", "Dua", "Tiga", "Empat"];
    const voices = shuffle([
      ...[2, 3, 4].map((n) => ({
        label: `“${words[n]} kedipan. Kami lihat dari kamera pos.”`,
        ok: n === count,
      })),
      { label: "“Kode AMBER-07. Buka pintu merah sekarang!”", ok: false },
    ]);
    for (const v of voices) {
      const b = make("button", "field-choice");
      b.append(make("strong", "", v.label));
      b.onclick = () =>
        v.ok
          ? on.solve()
          : on.miss(
              v.label.includes("AMBER")
                ? "Kode bisa dicuri. Pos asli menyebut jumlah kedipan yang kamu lihat."
                : "Jumlahnya tidak cocok. Hitung lagi kedipannya.",
            );
      options.append(b);
    }
    const replay = make("button", "quiet", "Ulangi kedipan");
    const play = () => {
      clear();
      options.hidden = true;
      replay.hidden = true;
      status.textContent = "Perhatikan lampu…";
      for (let i = 0; i < count; i++) {
        later(() => lamp.classList.add("on"), 500 + i * 650);
        later(() => lamp.classList.remove("on"), 850 + i * 650);
      }
      later(
        () => {
          options.hidden = false;
          replay.hidden = false;
          status.textContent = "Suara mana yang benar-benar melihat lampumu?";
          options.querySelector("button")?.focus();
        },
        700 + count * 650,
      );
    };
    replay.onclick = play;
    root.append(lamp, status, options, replay);
    play();
  };
  ({ wave, socket, blink })[kind]();
  return clear;
}
