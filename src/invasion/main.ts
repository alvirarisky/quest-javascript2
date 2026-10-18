import Phaser from "phaser";
import { InvasionWorld } from "./world";
import { missions, pov, partner, clampProgress, type Task } from "./missions";
import type { Character } from "../gameplay/story";
import type { State } from "../../server/state";
import type { Entity } from "../../shared/challenges";
import "./style.css";
import { scars, damage, chapterBeat, ending, type Plan } from "./story";

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
<section id="reveal" class="plot-reveal" role="dialog" aria-modal="true" aria-labelledby="revealTitle" hidden><div><small id="revealAct"></small><h2 id="revealTitle"></h2><p id="revealText"></p><button id="skipReveal">Lanjut ↗</button></div></section>
<section id="cinematic" class="cinematic" role="dialog" aria-modal="true" aria-label="Intro Dead Signal" hidden>
 <div class="cinema-shot" aria-hidden="true"></div><div class="cinema-shade"></div>
 <div class="cinema-meta">03:14 <span>WEST DISTRICT</span></div>
 <button id="skipIntro">Lewati intro ↗</button>
 <div class="cinema-copy"><small id="cinemaSpeaker">ALLIE</small><h2 id="cinemaLine">Noah. Jangan buka pintunya.</h2></div>
 <div class="cinema-title">DEAD SIGNAL<small>SEBELUM SIARAN TERPUTUS</small></div>
 <div class="cinema-progress"><span></span></div>
</section>
<section id="menu" class="landing">
 <div class="landing-art" aria-hidden="true"><span class="signal-ring"></span><span class="art-label">TRANSMISSION 07 / SOURCE UNKNOWN</span></div>
 <div class="landing-content"><a class="brand" href="#">N / A <span>NOAH & ALLIE</span></a><p class="eyebrow">A SURVIVAL STORY</p><h1>DEAD<br><em>SIGNAL<span>_</span></em></h1><p class="tagline">Suaranya sama. Bukan dia.</p>
 <form id="startForm"><label class="field-label">MULAI SEBAGAI</label><div class="characters"><button type="button" id="noah" class="character selected" aria-pressed="true"><span class="portrait noah"></span><span>NOAH</span><b>01</b></button><button type="button" id="allie" class="character" aria-pressed="false"><span class="portrait allie"></span><span>ALLIE</span><b>02</b></button></div><div class="identity"><label>Nama<input id="name" required maxlength="80" autocomplete="name" placeholder="Nama lengkap"></label><label>NIM<input id="student" required maxlength="40" placeholder="Nomor mahasiswa"></label></div><div class="actions"><button id="start" class="primary" disabled>Memuat lingkungan…</button><button id="resume" type="button" hidden>Lanjut checkpoint ↗</button></div><p id="startError" role="status"></p></form></div>
 <div class="landing-bottom"><span>HEADPHONES OFF. INSTINCT ON.</span></div>
</section>
<section id="play" hidden>
 <header class="game-header"><div class="wordmark">DEAD SIGNAL<span>NOAH / ALLIE</span></div><nav id="actNav" aria-label="Perjalanan"></nav><div class="header-tools"><button id="scarStatus" hidden></button><button id="notes" aria-label="Buka catatan">Catatan</button><button id="help" aria-label="Petunjuk">?</button><button id="pause">Jeda <kbd>ESC</kbd></button></div></header>
 <div class="game-layout"><aside class="mission-rail"><div class="eyebrow" id="actLabel"></div><h1 id="missionTitle"></h1><p id="location"></p><div class="operator"><span id="operatorPortrait" class="portrait"></span><div><small>KARAKTER AKTIF</small><strong id="operatorName"></strong><span id="radioPartner"></span></div></div><div class="rail-divider"></div><p class="eyebrow">RENCANA AKSI</p><ol id="steps"></ol><div class="inventory"><p class="eyebrow">BARANG DITEMUKAN</p><span id="inventory">Tas masih kosong.</span></div><p class="grade-note">Pilihan eksplorasi tidak dinilai.<br>Kuis pertama benar: +12,5.</p></aside>
 <div class="scene-column"><div class="scene-top"><span id="sceneTag"></span><span id="sceneTime"></span></div><div id="arena" aria-label="Lingkungan interaktif"></div><div class="radio-strip"><span class="radio-dot"></span><span id="radioWho"></span><p id="radioText" role="status" aria-live="polite"></p></div><div id="villain" class="villain-strip"><span>⚠ SINYAL ASING</span><p id="villainText"></p><small>TIDAK TERVERIFIKASI</small></div><div class="objective-bar"><div><small id="stepNumber"></small><p id="objective"></p></div><button id="pulse" hidden>Pulse <kbd>SPACE</kbd></button><button id="stepAction" class="primary">Menuju penanda →</button></div><div class="scene-controls"><span>A D · jalan &nbsp; E · interaksi</span><div class="touch"><button id="left" aria-label="Jalan ke kiri">←</button><button id="interact" aria-label="Interaksi">E</button><button id="right" aria-label="Jalan ke kanan">→</button></div></div><p id="saveStatus" role="status"></p></div></div>
</section>
<section id="taskPanel" class="overlay" role="dialog" aria-modal="true" aria-labelledby="taskTitle" hidden><div class="card task-card"><div class="card-top"><p class="eyebrow">PILIH TINDAKAN</p><button id="closeTask" aria-label="Tutup keputusan">×</button></div><h2 id="taskTitle"></h2><p id="taskInstruction"></p><div id="taskChoices"></div><p id="taskFeedback" role="status"></p></div></section>
<section id="quiz" class="overlay" role="dialog" aria-modal="true" aria-labelledby="quizTitle" hidden><div class="card quiz-card"><div class="card-top"><p class="eyebrow" id="quizTag">KONEKSI SISTEM</p><button id="closeQuiz">Tutup ×</button></div><h2 id="quizTitle"></h2><p id="quizMission"></p><details><summary>Lihat objek & atribut</summary><pre id="scanner"></pre></details><div id="choices" role="group" aria-label="Pilihan kode"></div><p id="scoreState" class="score-state"></p><p id="feedback" role="status"></p><div class="actions"><button id="confirm" class="primary" disabled>Kirim jawaban ↗</button><button id="hint" disabled>Petunjuk</button><button id="retryQuiz" hidden>Muat soal lagi</button><button id="activate" class="primary" hidden>Aktifkan sistem →</button></div></div></section>
<section id="modal" class="overlay" role="dialog" aria-modal="true" aria-labelledby="modalTitle" hidden><div class="card"><div class="card-top"><p class="eyebrow">DEAD SIGNAL</p><button id="closeModal">Kembali ×</button></div><h2 id="modalTitle"></h2><div id="modalBody"></div><label class="setting"><input id="reduced" type="checkbox"> Kurangi gerakan</label><button id="toMenu">Simpan & kembali ke menu</button></div></section>
<section id="results" class="overlay result-overlay" role="dialog" aria-modal="true" aria-labelledby="resultTitle" hidden><div class="card result-card"><p class="eyebrow">05:07 / SIARAN BERHASIL DIPUTUS</p><div class="ending-mark">✓</div><h1 id="resultTitle">KOTA INI<br><em>MASIH MILIK KITA.</em></h1><p class="ending-copy">Sang Penyiar kehilangan jaringan. Noah dan Allie kembali bertemu di titik evakuasi.</p><p id="resultIdentity"></p><div id="resultScore">— / 100</div><p id="resultStatus" role="status"></p><details><summary>Catatan delapan misi</summary><div id="review"></div></details><div class="actions"><button id="retryResult" hidden>Muat nilai lagi</button><button id="replay" class="primary">Perjalanan baru ↗</button></div></div></section>
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
const SAVE = "dead-signal-story-v2";
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
  identity = { name: "", student: "" },
  history: string[] = [];
let question: Question | null = null,
  choice = "",
  task: Task | null = null;
const overlays = [
  "reveal",
  "cinematic",
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
    "modal",
    "results",
    "quiz",
    "taskPanel",
    "menu",
  ].find((id) => !el(id).hidden);
  world.blocked = !active || busy || !focused || document.hidden || !!top;
  world.keys.clear();
  if (world.tweens) {
    if (world.blocked) world.tweens.pauseAll();
    else world.tweens.resumeAll();
  }
  for (const id of [...overlays, "play"]) el(id).inert = !!top && id !== top;
}
function show(id: string, value = true) {
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
  el("radioWho").textContent =
    partner(opening, room).toUpperCase() + " / RADIO";
  el("radioText").textContent = text;
  if (history.at(-1) !== text) history.push(text);
  history = history.slice(-80);
}
let introFrame = 0;
function endIntro() {
  cancelAnimationFrame(introFrame);
  show("cinematic", false);
  el("cinematic").className = "cinematic";
  radio("Pintunya terkunci. Ambil sekring itu.");
  fitCanvas();
}
function playIntro() {
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
      el("cinemaSpeaker").textContent = [
        partner(opening, 0).toUpperCase(),
        "KANAL TIDAK DIKENAL",
        "",
        "",
      ][beat];
      el("cinemaLine").textContent = [
        "Jangan buka pintunya.",
        "Buka. Aku di luar.",
        "Listrik padam.",
        "",
      ][beat];
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
  el("pulse").hidden = !repaired || (!world.escaping && room !== 7);
  el("play").classList.toggle("escaping", repaired);
  const instruction = repaired
    ? m.exit
    : progress < 2
      ? m.tasks[progress].instruction
      : `Gunakan ${m.device.toLowerCase()} untuk memulihkan sistem.`;
  el("stepAction").setAttribute("aria-description", instruction);
  el("objective").textContent = repaired ? "Mereka mendekat." : "";
  el("stepAction").textContent = repaired
    ? "Menuju keluar →"
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
function revealChapter() {
  const text = chapterBeat(room, damage(state));
  radio(text);
  el("revealAct").textContent = missions[room].act;
  el("revealTitle").textContent = missions[room].title;
  el("revealText").textContent = text;
  show("reveal");
  el("skipReveal").focus();
  clearTimeout(revealTimer);
  revealTimer = window.setTimeout(closeReveal, 7500);
}
el("skipReveal").onclick = closeReveal;
function chapter(reveal = true) {
  question = null;
  choice = "";
  task = null;
  const m = missions[room];
  world.failures = damage(state);
  world.finalPlan = finalPlan;
  world.begin(room, pov(opening, room), progress, repaired);
  el("actLabel").textContent = m.act;
  el("missionTitle").textContent = m.title;
  el("location").textContent = m.location;
  el("operatorPortrait").className = "portrait " + pov(opening, room);
  el("operatorName").textContent = pov(opening, room).toUpperCase();
  el("radioPartner").textContent =
    partner(opening, room).toUpperCase() + " · lewat radio";
  el("sceneTag").textContent =
    `${pov(opening, room).toUpperCase()} / ${m.act.split(" / ")[1]}`;
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
        typeof data.identity?.student !== "string"
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
      identity = {
        name: data.identity.name.slice(0, 80),
        student: data.identity.student.slice(0, 40),
      };
      progress = clampProgress(data.progress, state.completed[room]);
      repaired = state.completed[room] && data.repaired === true;
      finished = state.wave === 8 && data.finished === true;
      history = Array.isArray(data.history)
        ? data.history.filter((s: unknown) => typeof s === "string").slice(-80)
        : [];
    } else {
      const data = await api("start", { mode: "story" });
      finalPlan = "cut";
      token = data.token;
      state = data.state;
      room = 0;
      progress = 0;
      repaired = false;
      finished = false;
      history = [];
      identity = {
        name: el<HTMLInputElement>("name").value.trim(),
        student: el<HTMLInputElement>("student").value.trim(),
      };
    }
    choose(opening);
    el<HTMLInputElement>("name").value = identity.name;
    el<HTMLInputElement>("student").value = identity.student;
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
el("startForm").onsubmit = (e) => {
  e.preventDefault();
  if (
    !el<HTMLInputElement>("name").value.trim() ||
    !el<HTMLInputElement>("student").value.trim()
  ) {
    el("startError").textContent = "Isi nama dan NIM terlebih dahulu.";
    return;
  }
  void start();
};
el("resume").onclick = () => void start(true);
function finishTask() {
  if (!task) return;
  const done =
    room === 7 && progress === 1
      ? finalPlan === "cut"
        ? "Kita putus listriknya. Dua simpul harus dihancurkan."
        : "Kita balik siarannya. Tiga simpul harus diselaraskan."
      : task.done;
  progress = Math.min(2, progress + 1);
  world.advance();
  show("taskPanel", false);
  objective();
  radio(done);
  save();
  task = null;
}
world.onTask = (index) => {
  if (busy || index !== progress) return;
  task = missions[room].tasks[index];
  if (!task.choices) {
    finishTask();
    return;
  }
  el("taskTitle").textContent = task.label;
  el("taskInstruction").textContent = task.instruction;
  el("taskFeedback").textContent = "";
  el("taskChoices").replaceChildren();
  const options =
    room === 7
      ? [
          {
            label: "Putus listrik",
            detail: "2 simpul. Bebaskan partner; infeksi tidak sembuh.",
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
      : task.choices.map((c) => ({ ...c, plan: undefined }));
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
        el("taskFeedback").textContent = c.feedback;
        button.classList.add("incorrect");
      }
    };
    el("taskChoices").append(button);
  });
  show("taskPanel");
  el("taskChoices").querySelector("button")?.focus();
};
el("closeTask").onclick = () => show("taskPanel", false);
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
el("closeQuiz").onclick = () => {
  if (!busy) show("quiz", false);
};
el("confirm").onclick = async () => {
  if (busy || !choice || state.completed[room]) return;
  setBusy(true);
  el("feedback").textContent = "Memeriksa perintah…";
  try {
    const response = await api("submit", { token, choice });
    token = response.token;
    state = response.state;
    save();
    scoreNote();
    world.failures = damage(state);
    accepted();
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
  el("feedback").textContent = failed
    ? scars[room].text
    : "Sistem siap. Jalankan perintah.";
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
  show("quiz", false);
  objective();
  radio(
    !state.first[room]
      ? scars[room].text
      : room === 7
        ? "Dekati simpul bercahaya. Tekan Space untuk menyalurkan pulse."
        : [1, 3, 6].includes(room)
          ? "Jalur aman. Bawa bukti ini ke lokasi berikutnya."
          : "Jalur terbuka. Lari! Space untuk menghalau.",
  );
  save();
};
world.onExit = () => {
  if (!repaired || busy) return;
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
world.onIdle = () => radio("Klik tombol aksi untuk mendekati objek.");
el("stepAction").onclick = () => world.goToTarget();
el("interact").onclick = () => world.interact();
el("pulse").onclick = () => world.pulse();
world.onPulseReady = (ready) => {
  el<HTMLButtonElement>("pulse").disabled = !ready;
  el("pulse").innerHTML = ready ? "Pulse <kbd>SPACE</kbd>" : "Mengisi…";
};
el("help").onclick = () => {
  radio(
    missions[room].hint +
      " " +
      (progress < 2
        ? missions[room].tasks[progress].instruction
        : repaired
          ? missions[room].exit
          : "Gunakan terminal bercahaya."),
  );
  save();
};
function toMenu() {
  if (busy) return;
  save();
  active = false;
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
    "A / D — jalan\nE — interaksi\nSpace — pulse saat kabur\n\nKlik objek bercahaya untuk mendekat. Setelah terminal aktif, lari ke pintu. Kalau tertangkap, coba lagi; nilai tidak berubah.\n\nKuis: sekali kirim. Benar +12,5; salah menetapkan kerusakan dan cerita tetap lanjut. Progres tersimpan otomatis.",
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
async function finish() {
  if (busy) return;
  finished = true;
  save();
  show("results");
  setBusy(true);
  el("resultIdentity").textContent = identity.name + " / " + identity.student;
  el("resultScore").textContent = "— / 100";
  el("resultStatus").textContent = "Memuat hasil terverifikasi…";
  show("retryResult", false);
  el("review").replaceChildren();
  try {
    const result = await api("result", { token });
    state = result.state;
    const outcome = ending(damage(state), finalPlan);
    el("resultTitle").textContent = outcome.title;
    document.querySelector(".ending-copy")!.textContent = outcome.text;
    el("resultScore").textContent =
      String(result.score).replace(".", ",") + " / 100";
    el("resultStatus").textContent =
      state.first.filter(Boolean).length +
      " dari 8 jawaban pertama benar · Diverifikasi server";
    missions.forEach((m, i) => {
      const p = document.createElement("p");
      p.textContent = `${i + 1}. ${m.title} — ${state.first[i] ? "12,5 poin" : "0 poin · " + scars[i].name}`;
      el("review").append(p);
    });
  } catch (e) {
    el("resultStatus").textContent = (e as Error).message;
    show("retryResult");
  } finally {
    setBusy(false);
    el("replay").focus();
  }
}
el("retryResult").onclick = () => void finish();
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input,textarea")) return;
  const key = e.key.toLowerCase();
  if (key === "tab") {
    const panel = [
      "reveal",
      "cinematic",
      "modal",
      "results",
      "quiz",
      "taskPanel",
    ].find((id) => !el(id).hidden);
    if (panel) {
      const buttons = Array.from(
        el(panel).querySelectorAll<HTMLElement>(
          "button:not([disabled]),input,summary",
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
  if (key === "escape" && !el("reveal").hidden) {
    closeReveal();
    return;
  }
  if (key === "escape" && !el("cinematic").hidden) {
    endIntro();
    return;
  }
  if (key === "escape" && active && !busy) {
    if (!el("modal").hidden) show("modal", false);
    else if (!el("quiz").hidden) show("quiz", false);
    else if (!el("taskPanel").hidden) show("taskPanel", false);
    else if (el("results").hidden) el("pause").click();
    return;
  }
  if (world.blocked) return;
  if (key === " " && !e.repeat) {
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
document.addEventListener("visibilitychange", sync);
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
