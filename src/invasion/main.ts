import Phaser from "phaser";
import { InvasionWorld } from "./world";
import { missions, clampProgress, type Task } from "./missions";
import type { Character } from "../gameplay/story";
import type { State, Proof } from "../../server/state";
import type { Entity } from "../../shared/challenges";
import "./style.css";
import {
  scars,
  damage,
  chapterBeat,
  ending,
  rank,
  streak,
  type Plan,
  type Rank,
} from "./story";
import {
  cue,
  unlockAudio,
  muted,
  setMuted,
  musicOn,
  setMusicOn,
  startMusic,
  setTension,
  setMusicQuiet,
  setAlarm,
  suspendAudio,
} from "./audio";
import { mountPuzzle } from "./puzzles";
import { simulate } from "./simulate";
import { renderGuide } from "./guide";
import { proofImage, download, formatTime } from "./proof";

type Question = {
  wave: number;
  topic: string;
  hint: string;
  entities: Entity[];
  choices: { id: string; code: string }[];
};
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
document.querySelector("#app")!.innerHTML = `
<main>
<section id="reveal" class="plot-reveal" role="dialog" aria-modal="true" aria-labelledby="revealTitle" hidden><div><small id="revealAct"></small><h2 id="revealTitle"></h2><p id="revealText"></p><p id="revealRank" class="reveal-rank" hidden></p><button id="skipReveal">Lanjut ↗</button></div></section>
<section id="cinematic" class="cinematic" role="dialog" aria-modal="true" aria-label="Intro Dead Signal" hidden>
 <div class="cinema-shot" aria-hidden="true"></div><div class="cinema-shade"></div>
 <div class="cinema-meta">03:14 <span>WEST DISTRICT</span></div>
 <button id="skipIntro">Lewati intro ↗</button>
 <ol id="cinemaLog" class="cinema-log" aria-live="polite"></ol>
 <div class="cinema-title">DEAD SIGNAL<small>WEST DISTRICT · 03:15</small></div>
 <div class="cinema-progress"><span></span></div>
</section>
<section id="briefing" class="overlay" role="dialog" aria-modal="true" aria-labelledby="briefingTitle" hidden><div class="card briefing-card"><p class="eyebrow">BRIEFING</p><h2 id="briefingTitle">03:15 — West District</h2><p>Sejak 03:14 siaran evakuasi memanggil warga keluar rumah. Yang keluar tidak kembali seperti semula. Sinyalnya berasal dari menara siaran di ujung distrik, dan sekarang memakai suaramu.</p><p>Rute: minimarket → klinik → stasiun → menara. Di tiap lokasi: <b>ambil barang</b>, <b>selesaikan masalah di lapangan</b>, <b>jalankan perintah jQuery</b> di terminal, lalu <b>kabur</b>.</p><div class="controls-grid"><span><kbd>A</kbd><kbd>D</kbd> jalan</span><span><kbd>SPACE</kbd> lompat</span><span><kbd>Q</kbd> gelombang (robohkan infected)</span><span><kbd>E</kbd> interaksi / pukul</span><span><kbd>ESC</kbd> jeda</span></div><p class="grade-line">Nilai = 8 kuis jQuery, masing-masing sekali kirim (benar +12,5). Jawaban salah tidak menghentikan cerita, tetapi meninggalkan kerusakan. Di akhir kamu mendapat <b>bukti pengerjaan</b> berisi nama, NIM, kelas, dan nilai.</p><button id="beginMission" class="primary">Mulai misi →</button></div></section>
<section id="guide" class="overlay" role="dialog" aria-modal="true" aria-labelledby="guideTitle" hidden><div class="card guide-card"><div class="card-top"><p class="eyebrow">PANDUAN</p><button id="closeGuide">Tutup ×</button></div><h2 id="guideTitle">Panduan misi</h2><nav id="guideNav" class="guide-nav" aria-label="Bagian panduan"></nav><div id="guideBody" class="guide-body"></div></div></section>
<section id="menu" class="landing">
 <div class="landing-art" aria-hidden="true"><span class="signal-ring"></span><span class="art-label">TRANSMISSION 07 / SOURCE UNKNOWN</span></div>
 <div class="landing-content"><a class="brand" href="#">N / A <span>NOAH & ALLIE</span></a><p class="eyebrow">A SURVIVAL STORY</p><h1>DEAD<br><em>SIGNAL<span>_</span></em></h1><p class="tagline">Praktikum jQuery · 8 misi · 4 lokasi</p>
 <form id="startForm"><label class="field-label">PILIH KARAKTER · TETAP SAMPAI AKHIR</label><div class="characters"><button type="button" id="noah" class="character selected" aria-pressed="true"><span class="portrait noah"></span><span>NOAH</span><b>01</b></button><button type="button" id="allie" class="character" aria-pressed="false"><span class="portrait allie"></span><span>ALLIE</span><b>02</b></button></div><div class="identity"><label>Nama<input id="name" required maxlength="80" autocomplete="name" placeholder="Nama lengkap"></label><label>NIM<input id="student" required maxlength="40" placeholder="Nomor mahasiswa"></label><label>Kelas<input id="kelas" required maxlength="40" placeholder="Contoh: TI-24-XX"></label></div><div class="actions"><button id="start" class="primary" disabled>Memuat lingkungan…</button><button id="resume" type="button" hidden>Lanjut checkpoint ↗</button></div><p id="startError" role="status"></p></form><button id="openGuide" type="button" class="link-button">Panduan cara main ↗</button></div>
 <div class="landing-bottom"><span>HEADPHONES OFF. INSTINCT ON.</span></div>
</section>
<section id="play" hidden>
 <header class="game-header"><div class="wordmark">DEAD SIGNAL<span>NOAH / ALLIE</span></div><nav id="actNav" aria-label="Perjalanan"></nav><div class="header-tools"><button id="scarStatus" hidden></button><button id="notes" aria-label="Buka catatan">Catatan</button><button id="help" aria-label="Panduan">?</button><button id="pause">Jeda <kbd>ESC</kbd></button></div></header>
 <div class="game-layout"><aside class="mission-rail"><div class="eyebrow" id="actLabel"></div><h1 id="missionTitle"></h1><p id="location"></p><div class="operator"><span id="operatorPortrait" class="portrait"></span><div><small>KARAKTER AKTIF</small><strong id="operatorName"></strong><span id="radioPartner">Sendirian</span></div></div><div class="rail-divider"></div><p class="eyebrow">RENCANA AKSI</p><ol id="steps"></ol><div class="inventory"><p class="eyebrow">BARANG DITEMUKAN</p><span id="inventory">Tas masih kosong.</span></div><p class="grade-note">Pilihan eksplorasi tidak dinilai.<br>Kuis pertama benar: +12,5.</p></aside>
 <div class="scene-column"><div class="scene-top"><span id="sceneTag"></span><span id="sceneTime"></span></div><div id="arena" aria-label="Lingkungan interaktif"></div><div id="danger" aria-hidden="true"></div><div class="radio-strip"><span class="radio-dot"></span><span id="radioWho"></span><p id="radioText" role="status" aria-live="polite"></p></div><div id="villain" class="villain-strip"><span>⚠ SINYAL ASING</span><p id="villainText"></p><small>TIDAK TERVERIFIKASI</small></div><div class="objective-bar"><div><small id="stepNumber"></small><p id="objective"></p></div><button id="pulse" hidden>Gelombang <kbd>Q</kbd></button><button id="stepAction" class="primary">Menuju penanda →</button></div><div class="scene-controls"><span>A D · jalan &nbsp; SPACE · lompat &nbsp; Q · gelombang &nbsp; E · aksi / pukul</span><div class="touch"><button id="left" aria-label="Jalan ke kiri">←</button><button id="jump" aria-label="Lompat">↑</button><button id="interact" aria-label="Interaksi atau pukul">E</button><button id="right" aria-label="Jalan ke kanan">→</button></div></div><p id="saveStatus" role="status"></p></div></div>
</section>
<section id="taskPanel" class="overlay" role="dialog" aria-modal="true" aria-labelledby="taskTitle" hidden><div class="card task-card"><div class="card-top"><p class="eyebrow">PILIH TINDAKAN</p><button id="closeTask" aria-label="Tutup keputusan">×</button></div><h2 id="taskTitle"></h2><p id="taskInstruction"></p><div id="taskChoices"></div><p id="taskFeedback" role="status"></p></div></section>
<section id="quiz" class="overlay" role="dialog" aria-modal="true" aria-labelledby="quizTitle" hidden><div class="card quiz-card"><div class="card-top"><p class="eyebrow" id="quizTag">KONEKSI SISTEM</p><button id="closeQuiz">Tutup ×</button></div><h2 id="quizTitle"></h2><p id="quizMission"></p><details><summary>Lihat objek & atribut</summary><pre id="scanner"></pre></details><div id="choices" role="group" aria-label="Pilihan kode"></div><div id="simulation" class="simulation" hidden></div><p id="scoreState" class="score-state"></p><p id="feedback" role="status"></p><div class="actions"><button id="confirm" class="primary" disabled>Kirim jawaban ↗</button><button id="hint" disabled>Petunjuk</button><button id="retryQuiz" hidden>Muat soal lagi</button><button id="activate" class="primary" hidden>Aktifkan sistem →</button></div></div></section>
<section id="modal" class="overlay" role="dialog" aria-modal="true" aria-labelledby="modalTitle" hidden><div class="card"><div class="card-top"><p class="eyebrow">DEAD SIGNAL</p><button id="closeModal">Kembali ×</button></div><h2 id="modalTitle"></h2><div id="modalBody"></div><label class="setting"><input id="reduced" type="checkbox"> Kurangi gerakan</label><label class="setting"><input id="sound" type="checkbox"> Efek suara</label><label class="setting"><input id="music" type="checkbox"> Musik latar</label><button id="toMenu">Simpan & kembali ke menu</button></div></section>
<section id="results" class="overlay result-overlay" role="dialog" aria-modal="true" aria-labelledby="resultTitle" hidden><div class="card result-card"><p class="eyebrow">05:07 / SIARAN BERHASIL DIPUTUS</p><div class="ending-mark">✓</div><h1 id="resultTitle">KOTA INI<br><em>MASIH MILIK KITA.</em></h1><p class="ending-copy">Sang Penyiar kehilangan jaringan.</p><p id="resultIdentity"></p><div id="resultScore">— / 100</div><p id="resultStatus" role="status"></p><p id="resultRanks"></p><div id="proof" class="proof" hidden><p class="eyebrow">BUKTI PENGERJAAN</p><dl id="proofFields"></dl><div class="actions"><button id="downloadProof" class="primary">Unduh bukti (PNG)</button></div><p id="proofStatus" role="status"></p></div><details><summary>Catatan delapan misi</summary><div id="review"></div></details><div class="actions"><button id="retryResult" hidden>Muat nilai lagi</button><button id="replay">Perjalanan baru ↗</button></div></div></section>
</main>`;
const world = new InvasionWorld();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "arena",
  width: 1200,
  height: 650,
  backgroundColor: "#0d1b20",
  scene: world,
  scale: {
    expandParent: false,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { keyboard: false },
});
// The game boots behind the menu. Re-bind the parent when it becomes visible,
// and on grid/mobile layout changes, so FIT never keeps its initial zero bounds.
const fitCanvas = () => {
  if (!game.canvas || !el("arena").clientWidth || !el("arena").clientHeight)
    return;
  const portrait = el("arena").clientWidth / el("arena").clientHeight < 0.8;
  const viewWidth = portrait ? 600 : 1200;
  if (game.scale.gameSize.width !== viewWidth)
    game.scale.setGameSize(viewWidth, 650);
  if (world.cameras?.main) {
    world.cameras.main.setSize(viewWidth, 650).setBounds(0, 0, 1200, 650);
    if (world.player) world.cameras.main.startFollow(world.player, true, 1, 1);
  }
  game.scale.getParentBounds();
  game.scale.displaySize.setParent(game.scale.parentSize);
  game.scale.refresh();
};
const arenaObserver = new ResizeObserver(fitCanvas);
arenaObserver.observe(el("arena"));
const SAVE = "dead-signal-story-v3";
let ready = false,
  busy = false,
  active = false,
  focused = document.hasFocus();
let opening: Character = "noah",
  room = 0,
  progress = 0,
  repaired = false,
  finished = false;
let finalPlan: Plan = "cut";
let token = "",
  state: State,
  identity = { name: "", student: "", kelas: "" },
  history: string[] = [],
  ranks: (Rank | null)[] = Array(8).fill(null),
  // Wrong field choices make noise: the chapter's escape gets one more hunter.
  alerted: boolean[] = Array(8).fill(false),
  tutorialDone = false,
  proof: { proof: Proof; ending: string } | null = null;
let stopPuzzle = () => {},
  stopSimulation = () => {};
let question: Question | null = null,
  choice = "",
  task: Task | null = null;
const overlays = [
  "reveal",
  "cinematic",
  "briefing",
  "guide",
  "menu",
  "taskPanel",
  "quiz",
  "modal",
  "results",
];
function sync() {
  const top = [
    "reveal",
    "cinematic",
    "briefing",
    "guide",
    "modal",
    "results",
    "quiz",
    "taskPanel",
    "menu",
  ].find((id) => !el(id).hidden);
  world.blocked = !active || busy || !focused || document.hidden || !!top;
  setMusicQuiet(!active || !!top);
  world.keys.clear();
  if (world.tweens) {
    if (world.blocked) world.tweens.pauseAll();
    else world.tweens.resumeAll();
  }
  for (const id of [...overlays, "play"]) el(id).inert = !!top && id !== top;
}
// Space is the jump key: a fresh overlay must not eat a mashed press as a click.
let guardUntil = 0;
function show(id: string, value = true) {
  if (value && el(id).hidden) guardUntil = performance.now() + 800;
  el(id).hidden = !value;
  sync();
  if (value && overlays.includes(id) && id !== "menu") {
    el(id).tabIndex = -1;
    el(id).focus({ preventScroll: true });
  } else if (!value && active && !world.blocked)
    el("stepAction").focus({ preventScroll: true });
}
function setBusy(value: boolean) {
  busy = value;
  for (const id of [
    "start",
    "resume",
    "noah",
    "allie",
    "confirm",
    "closeQuiz",
    "hint",
    "retryQuiz",
    "activate",
    "replay",
    "retryResult",
    "toMenu",
  ])
    el<HTMLButtonElement>(id).disabled = value;
  el<HTMLButtonElement>("start").disabled = value || !ready;
  el<HTMLButtonElement>("confirm").disabled = value || !choice;
  el<HTMLButtonElement>("hint").disabled = value || !question;
  for (const b of el("choices").querySelectorAll<HTMLButtonElement>("button"))
    b.disabled = value;
  sync();
}
function choose(c: Character) {
  opening = c;
  for (const id of ["noah", "allie"]) {
    el(id).classList.toggle("selected", id === c);
    el(id).setAttribute("aria-pressed", String(id === c));
  }
}
for (const c of ["noah", "allie"] as const)
  el(c).onclick = () => {
    if (!busy) choose(c);
  };
function save() {
  if (!active) return;
  try {
    localStorage.setItem(
      SAVE,
      JSON.stringify({
        token,
        finalPlan,
        room,
        progress,
        repaired,
        finished,
        opening,
        identity,
        history,
        ranks,
        alerted,
        tutorialDone,
      }),
    );
    el("saveStatus").textContent = "";
  } catch {
    el("saveStatus").textContent =
      "Checkpoint tidak dapat disimpan. Selesaikan tanpa menutup halaman.";
  }
}
function checkSave() {
  try {
    el("resume").hidden = !localStorage.getItem(SAVE);
  } catch {
    el("resume").hidden = true;
  }
}
checkSave();
async function api(action: string, body: object) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("/api/run/" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (
      !(response.headers.get("content-type") || "").includes("application/json")
    )
      throw Error("Server kuis belum tersedia. Jalankan npm run dev.");
    const data = await response.json();
    if (data.error === "Endpoint tidak ditemukan.")
      throw Error("Server masih versi lama. Restart npm run dev.");
    if (!response.ok) throw Error(data.error || "Permintaan gagal.");
    return data;
  } catch (e) {
    throw Error(
      e instanceof Error && e.name !== "AbortError"
        ? e.message
        : "Koneksi belum merespons. Coba lagi tanpa mengubah jawaban.",
    );
  } finally {
    clearTimeout(timer);
  }
}
world.onReady = () => {
  ready = true;
  el("start").textContent = "Main ↗";
  setBusy(false);
};
world.onLoadError = () => {
  ready = false;
  el("startError").textContent =
    "Aset lingkungan gagal dimuat. Periksa koneksi lalu refresh halaman.";
  el("start").textContent = "Aset belum siap";
};
let radioTimer = 0;
function radio(text: string) {
  clearTimeout(radioTimer);
  el("play").classList.add("radio-visible");
  radioTimer = window.setTimeout(
    () => el("play").classList.remove("radio-visible"),
    6500,
  );
  el("radioWho").textContent = opening.toUpperCase() + " / INSTING";
  el("radioText").textContent = text;
  if (history.at(-1) !== text) history.push(text);
  history = history.slice(-80);
}
let introFrame = 0;
function endIntro() {
  cancelAnimationFrame(introFrame);
  show("cinematic", false);
  el("cinematic").className = "cinematic";
  show("briefing");
  fitCanvas();
}
el("beginMission").onclick = () => {
  show("briefing", false);
  radio("Pintunya terkunci. Ambil sekring itu.");
};
// Intro as a radio log: the same broadcast twice, then a voice that is yours.
const INTRO_LOG: [string, string, string][][] = [
  [
    [
      "03:14:02",
      "SIARAN DARURAT",
      "Warga diminta tetap di dalam ruangan. Kunci pintu.",
    ],
  ],
  [
    [
      "03:14:32",
      "SIARAN DARURAT",
      "Warga diminta tetap di dalam ruangan. Kunci pintu.",
    ],
  ],
  [
    ["03:15:09", "KANAL 7", "Ini aku. Buka pintunya."],
    ["03:15:09", "ANALISIS SUARA", "Cocok 97% dengan suaramu."],
    ["03:15:10", "", "Daya padam."],
  ],
  [],
];
function playIntro() {
  el("cinemaLog").replaceChildren();
  show("cinematic");
  el("skipIntro").focus();
  let elapsed = 0,
    previous = performance.now(),
    beat = -1;
  const tick = (now: number) => {
    if (!document.hidden && focused) elapsed += Math.min(now - previous, 100);
    previous = now;
    const next =
      elapsed < 3300 ? 0 : elapsed < 6800 ? 1 : elapsed < 9900 ? 2 : 3;
    if (next !== beat) {
      beat = next;
      el("cinematic").className =
        `cinematic beat-${beat}${world.reduced ? " still" : ""}`;
      INTRO_LOG[beat].forEach(([time, source, text], i) => {
        const li = document.createElement("li"),
          when = document.createElement("time"),
          who = document.createElement("b"),
          line = document.createElement("span");
        when.textContent = time;
        who.textContent = source;
        line.textContent = text;
        li.append(when, who, line);
        li.style.animationDelay = `${i * 0.9}s`;
        if (!source.startsWith("SIARAN")) li.className = "odd";
        el("cinemaLog").append(li);
      });
    }
    if (elapsed >= 12800) endIntro();
    else introFrame = requestAnimationFrame(tick);
  };
  introFrame = requestAnimationFrame(tick);
}
el("skipIntro").onclick = endIntro;
function objective() {
  const losses = damage(state).filter(Boolean).length;
  el("scarStatus").hidden = losses === 0;
  el("scarStatus").textContent = `${losses} kerusakan`;
  const m = missions[room],
    idx = repaired ? 3 : progress;
  el("stepNumber").textContent = repaired ? "KABUR" : "";
  el("pulse").hidden = !repaired || !world.escaping;
  el("play").classList.toggle("escaping", repaired);
  const instruction = repaired
    ? m.exit
    : progress < 2
      ? m.tasks[progress].instruction
      : `Gunakan ${m.device.toLowerCase()} untuk memulihkan sistem.`;
  el("stepAction").setAttribute("aria-description", instruction);
  el("objective").textContent = repaired ? "Mereka mendekat." : "";
  el("stepAction").textContent = repaired
    ? !world.gateOpen
      ? "Pukul gerbang (E) →"
      : world.bossIndex < world.bossNodes.length
        ? "Hancurkan simpul (E) →"
        : "Menuju keluar →"
    : progress < 2
      ? `${m.tasks[progress].label} →`
      : `${m.device} →`;
  el("inventory").textContent =
    progress > 0
      ? m.tasks[0].item || "Petunjuk sudah dicatat."
      : "Tas masih kosong.";
  el("steps").replaceChildren();
  [...m.tasks.map((t) => t.label), m.device, "LANJUTKAN EVAKUASI"].forEach(
    (label, i) => {
      const li = document.createElement("li");
      li.className = i < idx ? "done" : i === idx ? "current" : "";
      const num = document.createElement("span");
      num.textContent = i < idx ? "✓" : String(i + 1).padStart(2, "0");
      const name = document.createElement("span");
      name.textContent = label;
      li.append(num, name);
      el("steps").append(li);
    },
  );
  el("villainText").textContent = m.villain;
  el("villain").classList.toggle("silent", repaired);
  if (repaired)
    el("villainText").textContent =
      "Sinyal asing pada sektor ini berhasil diputus.";
}
let revealTimer = 0;
function closeReveal() {
  clearTimeout(revealTimer);
  show("reveal", false);
}
const RANK_COPY: Record<Rank, string> = {
  S: "tanpa cela",
  A: "bersih",
  B: "lolos tipis",
  C: "babak belur",
  D: "nyaris tamat",
};
function revealChapter() {
  const text = chapterBeat(room, damage(state));
  radio(text);
  el("revealAct").textContent = missions[room].act;
  el("revealTitle").textContent = missions[room].title;
  el("revealText").textContent = text;
  const last = ranks[room - 1];
  el("revealRank").hidden = !last;
  if (last)
    el("revealRank").textContent =
      `KABUR BAB SEBELUMNYA · RANK ${last} — ${RANK_COPY[last]}`;
  cue("static");
  show("reveal");
  clearTimeout(revealTimer);
  revealTimer = window.setTimeout(closeReveal, 7500);
}
el("skipReveal").onclick = closeReveal;
// The freezer alarm keeps wailing from the moment it is triggered until the
// player leaves that chapter.
function syncAlarm() {
  const on = active && !finished && !!missions[room]?.alarm && progress >= 2;
  setAlarm(on);
  world.setAlarm(on);
}
function chapter(reveal = true) {
  question = null;
  choice = "";
  task = null;
  const m = missions[room];
  world.failures = damage(state);
  world.finalPlan = finalPlan;
  world.alerted = alerted[room];
  world.tutorial = !tutorialDone;
  world.begin(room, opening, progress, repaired);
  el("actLabel").textContent = m.act;
  el("missionTitle").textContent = m.title;
  el("location").textContent = m.location;
  el("operatorPortrait").className = "portrait " + opening;
  el("operatorName").textContent = opening.toUpperCase();
  el("sceneTag").textContent =
    `${opening.toUpperCase()} / ${m.act.split(" / ")[1]}`;
  el("sceneTime").textContent = m.time + " AM";
  el("actNav").replaceChildren();
  ["MINIMARKET", "KLINIK", "STASIUN", "MENARA"].forEach((name, i) => {
    const span = document.createElement("span");
    span.className =
      i === Math.floor(room / 2)
        ? "active"
        : i < Math.floor(room / 2)
          ? "done"
          : "";
    span.textContent = `0${i + 1} / ${name}`;
    el("actNav").append(span);
  });
  objective();
  radio(
    repaired
      ? m.effect
      : state.completed[room]
        ? "Perintah sudah tercatat. Aktifkan sistem untuk membuka jalur."
        : progress < 2
          ? m.tasks[progress].instruction
          : m.quiz,
  );
  if (reveal && room > 0) revealChapter();
  syncAlarm();
  save();
  fitCanvas();
}
async function start(resume = false) {
  if (busy || !ready) return;
  setBusy(true);
  el("startError").textContent = "Menghubungkan kanal…";
  try {
    if (resume) {
      let data;
      try {
        data = JSON.parse(localStorage.getItem(SAVE) || "null");
      } catch {
        throw Error("Checkpoint rusak. Mulai operasi baru.");
      }
      if (
        !data ||
        typeof data.token !== "string" ||
        !["noah", "allie"].includes(data.opening) ||
        typeof data.identity?.name !== "string" ||
        typeof data.identity?.student !== "string" ||
        typeof data.identity?.kelas !== "string"
      )
        throw Error("Checkpoint tidak tersedia. Mulai operasi baru.");
      const checked = await api("resume", { token: data.token });
      state = checked.state;
      finalPlan = data.finalPlan === "broadcast" ? "broadcast" : "cut";
      token = data.token;
      const latest = Math.min(state.wave, 7);
      room =
        Number.isInteger(data.room) &&
        data.room >= 0 &&
        (data.room === latest || data.room === state.wave - 1)
          ? data.room
          : latest;
      opening = data.opening;
      // The signed identity wins over whatever the local cache claims.
      identity = state.identity ?? {
        name: data.identity.name.slice(0, 80),
        student: data.identity.student.slice(0, 40),
        kelas: data.identity.kelas.slice(0, 40),
      };
      progress = clampProgress(data.progress, state.completed[room]);
      repaired = state.completed[room] && data.repaired === true;
      finished = state.wave === 8 && data.finished === true;
      history = Array.isArray(data.history)
        ? data.history.filter((s: unknown) => typeof s === "string").slice(-80)
        : [];
      ranks = Array.from({ length: 8 }, (_, i) => {
        const r = Array.isArray(data.ranks) ? data.ranks[i] : null;
        return typeof r === "string" && r in RANK_COPY ? (r as Rank) : null;
      });
      alerted = Array.from(
        { length: 8 },
        (_, i) => Array.isArray(data.alerted) && data.alerted[i] === true,
      );
      tutorialDone = data.tutorialDone === true;
    } else {
      const who = {
        name: el<HTMLInputElement>("name").value.trim(),
        student: el<HTMLInputElement>("student").value.trim(),
        kelas: el<HTMLInputElement>("kelas").value.trim(),
      };
      const data = await api("start", { mode: "story", identity: who });
      finalPlan = "cut";
      token = data.token;
      state = data.state;
      room = 0;
      progress = 0;
      repaired = false;
      finished = false;
      history = [];
      ranks = Array(8).fill(null);
      alerted = Array(8).fill(false);
      tutorialDone = false;
      identity = who;
    }
    choose(opening);
    el<HTMLInputElement>("name").value = identity.name;
    el<HTMLInputElement>("student").value = identity.student;
    el<HTMLInputElement>("kelas").value = identity.kelas;
    active = true;
    show("menu", false);
    show("play");
    chapter(!resume);
    setBusy(false);
    if (finished) await finish();
    else if (state.completed[room] && !repaired) accepted();
    else if (!resume) playIntro();
  } catch (e) {
    el("startError").textContent = (e as Error).message;
  } finally {
    setBusy(false);
  }
}
const wakeAudio = () =>
  void unlockAudio().then(() => {
    startMusic();
    syncAlarm();
  });
el("startForm").onsubmit = (e) => {
  e.preventDefault();
  wakeAudio();
  if (
    !el<HTMLInputElement>("name").value.trim() ||
    !el<HTMLInputElement>("student").value.trim() ||
    !el<HTMLInputElement>("kelas").value.trim()
  ) {
    el("startError").textContent = "Isi nama, NIM, dan kelas terlebih dahulu.";
    return;
  }
  void start();
};
el("resume").onclick = () => {
  wakeAudio();
  void start(true);
};
function finishTask() {
  if (!task) return;
  const done =
    room === 7 && progress === 1
      ? finalPlan === "cut"
        ? "Putus listriknya. Hancurkan dua simpul daya."
        : "Balik siarannya. Hancurkan tiga simpul penyelaras."
      : task.done;
  progress = Math.min(2, progress + 1);
  cue("pickup");
  world.advance();
  syncAlarm();
  closeTask();
  objective();
  radio(done);
  save();
  task = null;
}
function closeTask() {
  stopPuzzle();
  show("taskPanel", false);
}
function makeNoise() {
  if (alerted[room]) return;
  alerted[room] = true;
  world.alerted = true;
  save();
}
function mistake(feedback: string) {
  const first = !alerted[room];
  makeNoise();
  cue("wrong");
  el("taskFeedback").textContent =
    feedback +
    (first
      ? " Suaranya terdengar sampai luar — jalan keluar tidak akan sepi."
      : "");
}
function openPuzzle(kind: NonNullable<Task["puzzle"]>) {
  stopPuzzle();
  el("taskChoices").replaceChildren();
  stopPuzzle = mountPuzzle(kind, el("taskChoices"), {
    solve: finishTask,
    miss: (feedback, alarm) => {
      if (alarm) cue("alarm");
      mistake(feedback);
      openPuzzle(kind);
    },
  });
}
world.onTask = (index) => {
  if (busy || index !== progress) return;
  task = missions[room].tasks[index];
  if (!task.choices && !task.puzzle) {
    finishTask();
    return;
  }
  el("taskTitle").textContent = task.label;
  el("taskInstruction").textContent = task.instruction;
  el("taskFeedback").textContent = "";
  el("taskChoices").replaceChildren();
  el("taskChoices").classList.toggle("puzzle", !!task.puzzle);
  el("taskInstruction").hidden = !task.puzzle;
  if (task.puzzle) {
    openPuzzle(task.puzzle);
    show("taskPanel");
    el("taskChoices").querySelector("button")?.focus();
    return;
  }
  const options =
    room === 7
      ? [
          {
            label: "Putus listrik",
            detail: "2 simpul. Kamu pasti keluar; infeksi tidak sembuh.",
            correct: true,
            feedback: "",
            plan: "cut" as Plan,
          },
          {
            label: "Balik siaran",
            detail:
              damage(state)[6] ||
              damage(state)[7] ||
              damage(state).filter(Boolean).length >= 4
                ? "3 simpul. Jaringan rusak: Sang Penyiar bisa ikut keluar."
                : "3 simpul. Pertahankan jaringan untuk memulihkan korban.",
            correct: true,
            feedback: "",
            plan: "broadcast" as Plan,
          },
        ]
      : task.choices!.map((c) => ({ ...c, plan: undefined }));
  if (room === 7) el("taskTitle").textContent = "Akhiri dengan cara apa?";
  options.forEach((c) => {
    const button = document.createElement("button");
    button.className = "field-choice";
    const title = document.createElement("strong"),
      detail = document.createElement("span");
    title.textContent = c.label;
    detail.textContent = c.detail;
    button.append(title, detail);
    button.onclick = () => {
      if (c.correct) {
        if (c.plan) {
          finalPlan = c.plan;
          world.finalPlan = finalPlan;
        }
        finishTask();
      } else {
        button.classList.add("incorrect");
        mistake(c.feedback);
      }
    };
    el("taskChoices").append(button);
  });
  show("taskPanel");
  el("taskChoices").querySelector("button")?.focus();
};
el("closeTask").onclick = closeTask;
el("scarStatus").onclick = () => el("notes").click();
function scoreNote() {
  el("scoreState").textContent = state.completed[room]
    ? `Tercatat: ${state.first[room] ? "12,5" : "0"} poin.`
    : state.attempts[room]
      ? "Poin misi ini: 0. Perbaiki jawaban untuk melanjutkan."
      : `Sekali kirim · benar +12,5 · risiko salah: ${scars[room].name.toLowerCase()}.`;
}
async function openQuiz() {
  if (busy || progress < 2) return;
  if (state.completed[room]) {
    accepted();
    return;
  }
  question = null;
  choice = "";
  setBusy(true);
  show("quiz");
  show("activate", false);
  show("confirm");
  show("retryQuiz", false);
  el("quizTitle").textContent = "Menghubungkan sistem…";
  el("quizTag").textContent = missions[room].device;
  el("quizMission").textContent = missions[room].quiz;
  el("choices").replaceChildren();
  el("scanner").textContent = "";
  el("feedback").textContent = "";
  stopSimulation();
  show("simulation", false);
  scoreNote();
  try {
    const q = await api("question", { token });
    if (q.wave !== room || !Array.isArray(q.choices) || q.choices.length !== 4)
      throw Error("Soal tidak sesuai misi. Coba muat lagi.");
    question = q;
    el("quizTitle").textContent = q.topic;
    el("scanner").textContent = q.entities
      .map(
        (e: Entity) =>
          `${e.parent ? "[di #" + e.parent + "] " : ""}#${e.id} .${e.classes.join(" .")}${e.attrs ? " " + JSON.stringify(e.attrs) : ""}${e.hidden ? " [tersembunyi]" : ""}`,
      )
      .join("\n");
    renderChoices();
  } catch (e) {
    el("quizTitle").textContent = "Sistem belum terhubung";
    el("feedback").textContent = (e as Error).message;
    show("retryQuiz");
  } finally {
    setBusy(false);
    (
      el("choices").querySelector<HTMLElement>("button") || el("retryQuiz")
    ).focus();
  }
}
function renderChoices() {
  el("choices").replaceChildren();
  question!.choices.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "option";
    b.setAttribute("aria-pressed", "false");
    const badge = document.createElement("span"),
      code = document.createElement("code");
    badge.textContent = String.fromCharCode(65 + i);
    code.textContent = c.code;
    b.append(badge, code);
    b.onclick = () => {
      if (busy || state.completed[room]) return;
      choice = c.id;
      for (const other of el("choices").children) {
        other.classList.toggle("selected", other === b);
        other.setAttribute("aria-pressed", String(other === b));
      }
      el<HTMLButtonElement>("confirm").disabled = false;
    };
    el("choices").append(b);
  });
}
world.onQuiz = () => void openQuiz();
el("retryQuiz").onclick = () => void openQuiz();
el("hint").onclick = () => {
  if (question && !busy) el("feedback").textContent = question.hint;
};
function closeQuiz() {
  stopSimulation();
  show("quiz", false);
}
el("closeQuiz").onclick = () => {
  if (!busy) closeQuiz();
};
el("confirm").onclick = async () => {
  if (busy || !choice || state.completed[room]) return;
  setBusy(true);
  el("feedback").textContent = "Memeriksa perintah…";
  try {
    const response = await api("submit", { token, choice });
    token = response.token;
    state = response.state;
    cue(response.correct ? "correct" : "wrong");
    save();
    scoreNote();
    world.failures = damage(state);
    accepted();
    // Replay the submitted code on the scanner elements as a breakdown.
    const code = question?.choices.find((c) => c.id === choice)?.code;
    if (code && question && Array.isArray(response.targets)) {
      show("simulation");
      stopSimulation = simulate(
        el("simulation"),
        code,
        question.entities,
        response.targets,
        response.correct,
        world.reduced,
      );
    }
  } catch (e) {
    el("feedback").textContent = (e as Error).message;
  } finally {
    setBusy(false);
  }
};
function accepted() {
  show("quiz");
  show("confirm", false);
  show("retryQuiz", false);
  show("activate");
  el("quizTag").textContent = missions[room].device;
  const failed = !state.first[room];
  el("quizTitle").textContent = failed ? scars[room].name : "Perintah diterima";
  el("quizMission").textContent = missions[room].quiz;
  el("choices").replaceChildren();
  el("scanner").textContent = "";
  stopSimulation();
  show("simulation", false);
  const run = streak(state.first, room);
  el("feedback").textContent = failed
    ? scars[room].text
    : "Sistem siap. Jalankan perintah." +
      (run >= 2 ? ` Beruntun ×${run} — Sang Penyiar mulai panik.` : "");
  el("activate").textContent = failed
    ? "Hadapi akibatnya →"
    : room === 6
      ? "Aktifkan pulse-switch →"
      : "Jalankan →";
  scoreNote();
  el("activate").focus();
}
el("activate").onclick = () => {
  if (busy || !state.completed[room]) return;
  repaired = true;
  progress = 2;
  world.repair();
  closeQuiz();
  objective();
  setTension(world.escaping ? 0.35 : 0);
  const how = !world.escaping
    ? "Jalur aman. Bawa bukti ini ke lokasi berikutnya."
    : room === 7
      ? "Pukul simpul bercahaya dengan E sampai pecah. Q untuk merobohkan infected."
      : world.mode === "hide"
        ? "Patroli di depan. Diam di bayangan saat mereka lewat — gelombang membangunkan semuanya."
        : world.mode === "defend"
          ? "Gerbang servis macet. Pukul terus dengan E — mereka datang bergelombang, Q untuk merobohkan."
          : "Jalur terbuka. Lari! Q gelombang, Space lompati peti, E hancurkan barikade.";
  radio(state.first[room] ? how : scars[room].text + " " + how);
  save();
};
world.onExit = () => {
  if (!repaired || busy) return;
  if (world.escaping) ranks[room] = rank(world.stats, room === 7);
  cue("exit");
  if (room === 7) {
    finished = true;
    save();
    void finish();
  } else {
    room++;
    progress = 0;
    repaired = false;
    chapter();
  }
};
world.onHint = (text) => radio(text);
world.onDanger = (danger) => {
  el("play").style.setProperty("--danger", danger.toFixed(2));
  setTension(world.escaping ? 0.35 + danger * 0.65 : 0);
};
world.onIdle = () => radio("Klik tombol aksi untuk mendekati objek.");
el("stepAction").onclick = () => world.goToTarget();
el("interact").onclick = () => world.interact();
el("pulse").onclick = () => world.pulse();
el("jump").onpointerdown = (e) => {
  e.preventDefault();
  world.jump();
};
world.onPulseReady = (ready, armed) => {
  el("pulse").hidden = !armed || !repaired;
  el<HTMLButtonElement>("pulse").disabled = !ready;
  el("pulse").innerHTML = ready ? "Gelombang <kbd>Q</kbd>" : "Mengisi…";
};
world.onTutorialDone = () => {
  tutorialDone = true;
  save();
};
world.onGate = objective;
function openGuide(current = active) {
  const step = repaired
    ? "Langkah 4 — " + missions[room].exit
    : progress < 2
      ? `Langkah ${progress + 1} — ${missions[room].tasks[progress].instruction}`
      : "Langkah 3 — " + missions[room].quiz;
  renderGuide(el("guideNav"), el("guideBody"), current ? { room, step } : null);
  show("guide");
  el("closeGuide").focus();
}
el("help").onclick = () => openGuide();
el("openGuide").onclick = () => openGuide(false);
el("closeGuide").onclick = () => show("guide", false);
function toMenu() {
  if (busy) return;
  save();
  active = false;
  setTension(0);
  syncAlarm();
  for (const id of ["quiz", "taskPanel", "modal", "results", "play"])
    show(id, false);
  show("menu");
  choose(opening);
  checkSave();
  el("startError").textContent = "";
  el("start").focus();
}
el("toMenu").onclick = toMenu;
el("replay").onclick = toMenu;
function modal(title: string, text: string) {
  el("modalTitle").textContent = title;
  el("modalBody").textContent = text;
  show("modal");
  el("closeModal").focus();
}
el("pause").onclick = () =>
  modal(
    "Operasi dijeda.",
    "A / D — jalan\nSpace / W — lompat (melewati peti)\nQ — gelombang: robohkan infected dekat, dorong yang jauh\nE — interaksi; tekan berulang untuk memukul barikade, gerbang, dan simpul\n\nKlik objek bercahaya untuk mendekat. Setelah terminal aktif, kabur ke pintu. Kalau tertangkap, coba lagi; nilai tidak berubah.\n\nKuis: sekali kirim. Benar +12,5; salah menetapkan kerusakan dan cerita tetap lanjut. Progres tersimpan otomatis.",
  );
el("notes").onclick = () =>
  modal(
    "Jejak perjalanan",
    damage(state)
      .flatMap((lost, i) =>
        lost ? [scars[i].name + " — " + scars[i].text] : [],
      )
      .concat(history)
      .join("\n\n") || "Belum ada catatan.",
  );
el("closeModal").onclick = () => show("modal", false);
el<HTMLInputElement>("reduced").checked = world.reduced;
el("reduced").onchange = () => {
  world.reduced = el<HTMLInputElement>("reduced").checked;
};
el<HTMLInputElement>("sound").checked = !muted;
el("sound").onchange = () => {
  setMuted(!el<HTMLInputElement>("sound").checked);
  void unlockAudio().then(() => {
    startMusic();
    syncAlarm();
  });
};
el<HTMLInputElement>("music").checked = musicOn;
el("music").onchange = () => {
  setMusicOn(el<HTMLInputElement>("music").checked);
  wakeAudio();
};
async function finish() {
  if (busy) return;
  finished = true;
  syncAlarm();
  save();
  show("results");
  setBusy(true);
  el("resultIdentity").textContent =
    `${identity.name} · ${identity.student} · ${identity.kelas}`;
  show("proof", false);
  el("resultScore").textContent = "— / 100";
  el("resultStatus").textContent = "Memuat hasil terverifikasi…";
  show("retryResult", false);
  el("review").replaceChildren();
  try {
    const result = await api("result", { token });
    state = result.state;
    const outcome = ending(
      damage(state),
      finalPlan,
      opening === "noah" ? "Noah" : "Allie",
    );
    el("resultTitle").textContent = outcome.title;
    document.querySelector(".ending-copy")!.textContent = outcome.text;
    el("resultScore").textContent =
      String(result.score).replace(".", ",") + " / 100";
    el("resultStatus").textContent =
      state.first.filter(Boolean).length +
      " dari 8 jawaban pertama benar · Diverifikasi server";
    const graded = ranks.filter((r): r is Rank => !!r);
    el("resultRanks").textContent = graded.length
      ? `Rating kabur: ${graded.join(" · ")} · ${graded.filter((r) => r === "S").length} rank S · tidak memengaruhi nilai`
      : "";
    if (result.proof) {
      proof = { proof: result.proof, ending: outcome.title };
      renderProof();
    }
    missions.forEach((m, i) => {
      const p = document.createElement("p");
      p.textContent = `${i + 1}. ${m.title} — ${state.first[i] ? "12,5 poin" : "0 poin · " + scars[i].name}${ranks[i] ? " · kabur " + ranks[i] : ""}`;
      el("review").append(p);
    });
  } catch (e) {
    el("resultStatus").textContent = (e as Error).message;
    show("retryResult");
  } finally {
    setBusy(false);
    el("results").focus({ preventScroll: true });
  }
}
el("retryResult").onclick = () => void finish();
function proofRows(p: Proof): [string, string][] {
  return [
    ["Nama", p.name],
    ["NIM", p.student],
    ["Kelas", p.kelas],
    ["Nilai", String(p.score).replace(".", ",") + " / 100"],
    ["Benar", `${p.correct} dari 8`],
    ["Selesai", formatTime(p.finishedAt)],
  ];
}
function fillFields(target: HTMLElement, rows: [string, string][]) {
  target.replaceChildren(
    ...rows.flatMap(([k, v]) => {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = k;
      dd.textContent = v;
      return [dt, dd];
    }),
  );
}
function renderProof() {
  if (!proof) return;
  fillFields(el("proofFields"), proofRows(proof.proof));
  el("proofStatus").textContent =
    "Unduh PNG ini dan kumpulkan ke tugas praktikum.";
  show("proof");
}
el("downloadProof").onclick = () => {
  if (proof) download(proofImage(proof.proof, proof.ending), proof.proof);
};
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input,textarea")) return;
  const key = e.key.toLowerCase();
  if (
    (key === " " || key === "enter") &&
    (e.repeat || performance.now() < guardUntil) &&
    (e.target as HTMLElement).closest(".overlay,.plot-reveal")
  ) {
    e.preventDefault();
    return;
  }
  if (key === "tab") {
    const panel = [
      "reveal",
      "cinematic",
      "briefing",
      "guide",
      "modal",
      "results",
      "quiz",
      "taskPanel",
    ].find((id) => !el(id).hidden);
    if (panel) {
      const buttons = Array.from(
        el(panel).querySelectorAll<HTMLElement>(
          "button:not([disabled]),input,textarea,summary",
        ),
      ).filter((b) => b.getClientRects().length);
      const first = buttons[0],
        last = buttons.at(-1);
      if (
        !el(panel).contains(document.activeElement) ||
        (!e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === el(panel)))
      ) {
        e.preventDefault();
        first?.focus();
      } else if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === el(panel))
      ) {
        e.preventDefault();
        last?.focus();
      }
    }
  }
  if ((key === "escape" || key === "enter") && !el("reveal").hidden) {
    closeReveal();
    return;
  }
  if (key === "escape" && !el("cinematic").hidden) {
    endIntro();
    return;
  }
  if (key === "escape" && !el("guide").hidden) {
    show("guide", false);
    return;
  }
  if (key === "escape" && active && !busy) {
    if (!el("briefing").hidden) el("beginMission").click();
    else if (!el("modal").hidden) show("modal", false);
    else if (!el("quiz").hidden) closeQuiz();
    else if (!el("taskPanel").hidden) closeTask();
    else if (el("results").hidden) el("pause").click();
    return;
  }
  if (world.blocked) return;
  if ([" ", "w", "arrowup"].includes(key) && !e.repeat) {
    e.preventDefault();
    world.jump();
  }
  if (key === "q" && !e.repeat) {
    e.preventDefault();
    world.pulse();
  }
  if (["a", "d", "arrowleft", "arrowright"].includes(key)) {
    e.preventDefault();
    world.keys.add(key);
  }
  if (key === "e" && !e.repeat) {
    e.preventDefault();
    world.interact();
  }
});
window.addEventListener("keyup", (e) => world.keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  focused = false;
  sync();
});
window.addEventListener("focus", () => {
  focused = true;
  sync();
});
document.addEventListener("visibilitychange", () => {
  suspendAudio(document.hidden);
  sync();
});
for (const [id, key] of [
  ["left", "a"],
  ["right", "d"],
]) {
  el(id).onpointerdown = (e) => {
    e.preventDefault();
    if (!world.blocked) {
      el(id).setPointerCapture(e.pointerId);
      world.keys.add(key);
    }
  };
  el(id).onpointerup =
    el(id).onpointercancel =
    el(id).onlostpointercapture =
      () => world.keys.delete(key);
}
if (import.meta.env.DEV && new URLSearchParams(location.search).has("qa"))
  Object.assign(window, { __invasion: { world, game } });
