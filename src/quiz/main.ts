import Phaser from "phaser";
import { sceneFor } from "./scenes";
import { Walkway } from "./world";
import { chapters, ending, type Character, type Line } from "../gameplay/story";
import type { State } from "../../server/state";
import type { Entity } from "../../shared/challenges";
import { restoreCheckpoint, type Stage } from "./checkpoint";
import "./style.css";

type Question = {
  wave: number;
  topic: string;
  mission: string;
  hint: string;
  entities: Entity[];
  choices: { id: string; code: string }[];
};
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
document.querySelector("#app")!.innerHTML = `
<main>
<section id="menu" class="menu">
 <div class="menu-copy"><p class="eyebrow">NOAH & ALLIE / A STORY IN EIGHT CHAPTERS</p><h1>DEAD<br><em>SIGNAL.</em></h1><p class="lead">Satu kota kehilangan arah.<br>Dua orang masih saling mencari.</p><p class="description">Temani Noah dan Allie menuju dermaga tujuh. Jalan, dengarkan ceritanya, dan pulihkan jalur evakuasi lewat kuis jQuery.</p>
 <form id="startForm"><p class="fine">Pilih sudut pandang pembuka. Noah dan Allie bergantian di lokasi berbeda.</p><div class="characters"><button type="button" id="noah" class="character selected" aria-pressed="true"><span class="portrait noah"></span><span>NOAH<small>Operator keamanan</small></span></button><button type="button" id="allie" class="character" aria-pressed="false"><span class="portrait allie"></span><span>ALLIE<small>Teknisi sistem</small></span></button></div>
 <div class="identity"><label>Nama<input id="name" required maxlength="80" autocomplete="name" placeholder="Nama lengkap"></label><label>NIM<input id="student" required maxlength="40" placeholder="Nomor mahasiswa"></label></div>
 <button id="start" class="primary">Mulai perjalanan ↗</button><button type="button" id="resume" hidden>Lanjut checkpoint</button><p id="startError" role="status"></p></form><p class="fine">A/D untuk berjalan · E untuk berinteraksi · 8 kuis pilihan ganda<br>Tanpa batas waktu. Jawaban pertama benar = 12,5 poin; salah bisa diperbaiki.</p></div><div class="menu-stamp">03:14 AM<br><span>THE COAST IS NOT CLEAR.</span></div>
</section>
<section id="play" hidden><header><div><span class="eyebrow" id="place"></span><h2 id="chapter"></h2><p id="pov" class="fine"></p></div><div class="header-actions"><span id="progress"></span><button id="notes">Catatan</button><button id="pause">Jeda</button></div></header><div id="arena"></div><footer><span id="objective">Jalan ke terminal →</span><span id="saveStatus" role="status"></span><div class="touch"><button id="left" aria-label="Jalan ke kiri">←</button><button id="interact">Interaksi · E</button><button id="right" aria-label="Jalan ke kanan">→</button></div></footer></section>
<section id="story" class="overlay" role="dialog" aria-modal="true" aria-labelledby="speaker" hidden><div class="story-card"><span id="portrait" class="portrait"></span><div><p class="eyebrow" id="storyTag"></p><h2 id="speaker"></h2><p id="line"></p><div class="actions"><button id="next" class="primary">Lanjut →</button><button id="skip">Lewati percakapan</button></div></div></div></section>
<section id="quiz" class="overlay" role="dialog" aria-modal="true" aria-labelledby="quizTitle" hidden><div class="quiz-card"><div class="quiz-top"><p class="eyebrow">CONTAINMENT TERMINAL / PILIH SATU JAWABAN</p><button id="closeQuiz" aria-label="Tutup kuis">Tutup ×</button></div><h2 id="quizTitle"></h2><p id="mission"></p><details><summary>Lihat objek pada scanner</summary><pre id="scanner"></pre></details><div id="choices" role="group" aria-label="Pilihan jawaban"></div><p id="scoreState" class="fine"></p><p id="feedback" role="status" aria-live="polite"></p><div class="actions"><button id="confirm" class="primary" disabled>Kirim jawaban</button><button id="hint">Petunjuk</button><button id="retryQuiz" hidden>Coba muat soal lagi</button><button id="continue" class="primary" hidden>Lanjut cerita →</button></div></div></section>
<section id="modal" class="overlay" role="dialog" aria-modal="true" aria-labelledby="modalTitle" hidden><div class="modal-card"><p class="eyebrow">DEAD SIGNAL / FIELD NOTES</p><h2 id="modalTitle"></h2><div id="modalBody"></div><div class="actions"><button id="closeModal" class="primary">Kembali</button><button id="toMenu">Kembali ke menu</button></div></div></section>
<section id="results" class="overlay" hidden><div class="result-card"><p class="eyebrow">05:21 / DERMAGA TUJUH</p><h1>SAMPAI<br><em>RUMAH.</em></h1><p>Noah, Allie, dan para penyintas berhasil naik feri.</p><h2 id="resultIdentity"></h2><div id="resultScore"></div><p id="resultStatus" role="status"></p><div id="review"></div><div class="actions"><button id="retryResult" hidden>Coba muat nilai lagi</button><button id="replay" class="primary">Perjalanan baru ↗</button></div></div></section>
</main>`;
const world = new Walkway();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "arena",
  width: 1200,
  height: 650,
  backgroundColor: "#101c21",
  scene: world,
  scale: {
    expandParent: false,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { keyboard: false },
});
let ready = false,
  busy = false,
  active = false;
let selected: Character = "noah",
  token = "",
  state: State,
  room = 0;
let stage: Stage = "intro";
let windowFocused = document.hasFocus();
let identity = { name: "", student: "" };
let q: Question | null = null,
  choice = "",
  history: Line[] = [];
let lines: Line[] = [],
  lineIndex = 0,
  afterStory = () => {};
const overlays = ["menu", "story", "quiz", "modal", "results"];
const show = (id: string, visible = true) => {
  $(id).hidden = !visible;
  sync();
  if (visible && ["quiz", "modal", "results", "story"].includes(id))
    $(id).querySelector<HTMLElement>("button:not([disabled])")?.focus();
  else if (!visible && active && !world.blocked)
    $("interact").focus({ preventScroll: true });
};
function sync() {
  world.blocked =
    !active ||
    !windowFocused ||
    document.hidden ||
    overlays.some((id) => !$(id).hidden);
  world.keys.clear();
  const top = ["modal", "results", "quiz", "story", "menu"].find(
    (id) => !$(id).hidden,
  );
  for (const id of [...overlays, "play"]) $(id).inert = !!top && id !== top;
}
function setBusy(value: boolean) {
  busy = value;
  for (const id of [
    "start",
    "resume",
    "noah",
    "allie",
    "closeQuiz",
    "retryQuiz",
    "retryResult",
    "replay",
  ])
    $<HTMLButtonElement>(id).disabled = value;
  $<HTMLButtonElement>("hint").disabled = value || !q;
  for (const button of $("choices").querySelectorAll<HTMLButtonElement>(
    "button",
  ))
    button.disabled = value;
}
function save() {
  try {
    localStorage.setItem(
      "dead-signal-quiz-v1",
      JSON.stringify({
        token,
        state,
        room,
        selected,
        identity,
        history,
        stage,
        lineIndex,
      }),
    );
    $("saveStatus").textContent = "";
  } catch {
    $("saveStatus").textContent =
      "Checkpoint gagal disimpan. Jangan refresh sebelum selesai.";
  }
}
function hasSave() {
  try {
    return !!localStorage.getItem("dead-signal-quiz-v1");
  } catch {
    return false;
  }
}
$("resume").hidden = !hasSave();
async function api(action: string, body: object) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api/run/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json"))
      throw Error(
        "Server kuis belum tersedia. Pastikan aplikasi dijalankan dengan npm run dev.",
      );
    const data = await response.json();
    if (data.error === "Endpoint tidak ditemukan.")
      throw Error(
        "Server masih memakai versi lama. Restart npm run dev agar soal kuis tersedia.",
      );
    if (!response.ok) throw Error(data.error || "Permintaan gagal.");
    return data;
  } catch (error) {
    throw Error(
      error instanceof Error && error.name !== "AbortError"
        ? error.message
        : "Koneksi terputus. Coba lagi; jawaban belum tercatat di layar ini.",
    );
  } finally {
    clearTimeout(timer);
  }
}
world.onReady = () => {
  ready = true;
};
function choose(c: Character) {
  selected = c;
  for (const other of ["noah", "allie"]) {
    $(other).classList.toggle("selected", other === c);
    $(other).setAttribute("aria-pressed", String(other === c));
  }
}
for (const c of ["noah", "allie"] as const)
  $(c).onclick = () => {
    if (!busy) choose(c);
  };
function chapter() {
  q = null;
  choice = "";
  const scene = sceneFor(selected, room);
  world.character = scene.character;
  world.begin(room, scene.place);
  $("pov").textContent =
    `KAMU: ${scene.character.toUpperCase()} · RADIO: ${scene.partner.toUpperCase()}`;
  if (state.completed[room] && stage !== "answer") world.repair();
  $("place").textContent = `${chapters[room].time} / ${scene.place}`;
  $("chapter").textContent = chapters[room].title;
  $("progress").textContent = `BAB ${room + 1} / 8`;
  $("objective").textContent = world.repaired
    ? "Jalur pulih. Jalan ke pintu EXIT lalu tekan E →"
    : "Temui terminal bercahaya, lalu tekan E untuk membuka kuis →";
  save();
}
function displayLine() {
  const line = lines[lineIndex];
  const scene = sceneFor(selected, room);
  const remote = stage !== "ending" && line.who.toLowerCase() === scene.partner;
  $("speaker").textContent = line.who + (remote ? " · lewat radio" : "");
  $("line").textContent = line.text;
  $("portrait").className = `portrait ${line.who.toLowerCase()}`;
  $("storyTag").textContent =
    `${remote ? scene.remotePlace : chapters[room].title} / ${lineIndex + 1} dari ${lines.length}`;
  $("next").textContent =
    lineIndex === lines.length - 1 ? "Lanjut perjalanan →" : "Lanjut →";
}
function story(content: Line[], done: () => void, restoring = false) {
  lines = content;
  if (!restoring) {
    history.push(...content);
    lineIndex = 0;
  }
  lineIndex = Math.min(lineIndex, lines.length - 1);
  save();
  afterStory = done;
  displayLine();
  show("story");
  $("next").focus();
}
function endStory() {
  show("story", false);
  afterStory();
}
$("next").onclick = () => {
  if (++lineIndex < lines.length) {
    displayLine();
    save();
  } else endStory();
};
$("skip").onclick = endStory;
function intro(restoring = false) {
  stage = "intro";
  story(sceneFor(selected, room).intro, finishDialogue, restoring);
}
async function start(resume = false) {
  if (busy || !ready) {
    $("startError").textContent = "Tunggu sebentar, terminal sedang dimuat.";
    return;
  }
  setBusy(true);
  $("startError").textContent = "Menghubungkan terminal…";
  try {
    if (resume) {
      let stored;
      try {
        stored = JSON.parse(
          localStorage.getItem("dead-signal-quiz-v1") || "null",
        );
      } catch {
        throw Error("Checkpoint rusak. Mulai perjalanan baru.");
      }
      if (!stored || typeof stored.token !== "string")
        throw Error("Checkpoint tidak tersedia. Mulai perjalanan baru.");
      const checked = await api("resume", { token: stored.token });
      const restored = restoreCheckpoint(stored, checked.state);
      token = stored.token;
      state = checked.state;
      ({ room, stage, selected, identity, history, lineIndex } = restored);
    } else {
      const response = await api("start", {});
      token = response.token;
      state = response.state;
      room = 0;
      stage = "intro";
      lineIndex = 0;
      history = [];
      identity = {
        name: $<HTMLInputElement>("name").value.trim(),
        student: $<HTMLInputElement>("student").value.trim(),
      };
    }
    $<HTMLInputElement>("name").value = identity.name;
    $<HTMLInputElement>("student").value = identity.student;
    choose(selected);
    active = true;
    show("menu", false);
    show("results", false);
    show("play");
    game.scale.refresh();
    chapter();
    if (stage === "intro") intro(resume);
    else if (stage === "answer") accepted();
    else if (stage === "outro") outro(true);
    else if (stage === "ending") story(ending, () => void finish(), true);
    else if (stage === "results") {
      setBusy(false);
      await finish();
    }
  } catch (error) {
    $("startError").textContent = (error as Error).message;
  } finally {
    setBusy(false);
  }
}
$("startForm").onsubmit = (e) => {
  e.preventDefault();
  if (
    !$<HTMLInputElement>("name").value.trim() ||
    !$<HTMLInputElement>("student").value.trim()
  ) {
    $("startError").textContent = "Isi nama dan NIM dulu.";
    return;
  }
  void start();
};
$("resume").onclick = () => void start(true);
function scoreNote() {
  $("scoreState").textContent = state.completed[room]
    ? `Tercatat: ${state.first[room] ? "12,5" : "0"} poin.`
    : state.attempts[room]
      ? "Poin bab ini: 0. Pilih perbaikan yang benar untuk melanjutkan."
      : "Jawaban pertama benar: +12,5 poin. Petunjuk tidak mengurangi nilai.";
}
function renderChoices() {
  $("choices").replaceChildren();
  q!.choices.forEach((option, i) => {
    const b = document.createElement("button");
    b.className = "option";
    b.setAttribute("aria-pressed", "false");
    const badge = document.createElement("span");
    badge.textContent = String.fromCharCode(65 + i);
    const code = document.createElement("code");
    code.textContent = option.code;
    b.append(badge, code);
    b.onclick = () => {
      if (busy || state.completed[room]) return;
      choice = option.id;
      for (const el of $("choices").children) {
        el.classList.toggle("selected", el === b);
        el.setAttribute("aria-pressed", String(el === b));
      }
      $<HTMLButtonElement>("confirm").disabled = false;
    };
    $("choices").append(b);
  });
}
async function openQuiz() {
  if (busy) return;
  if (state.completed[room]) {
    accepted();
    return;
  }
  q = null;
  choice = "";
  setBusy(true);
  show("retryQuiz", false);
  $("scoreState").textContent = "";
  world.blocked = true;
  world.keys.clear();
  $("quizTitle").textContent = "Menghubungkan terminal…";
  $("mission").textContent = "";
  $("feedback").textContent = "";
  $("scanner").textContent = "";
  $("choices").replaceChildren();
  show("continue", false);
  show("confirm");
  $<HTMLButtonElement>("confirm").disabled = true;
  show("quiz");
  try {
    const data = await api("question", { token });
    if (
      data.wave !== room ||
      !Array.isArray(data.choices) ||
      data.choices.length !== 4
    )
      throw Error("Data soal tidak sesuai bab ini. Coba muat ulang.");
    q = data;
    choice = "";
    $("quizTitle").textContent = q!.topic;
    $("mission").textContent = q!.mission;
    $("scanner").textContent = q!.entities
      .map(
        (e) =>
          `${e.parent ? `  [di #${e.parent}] ` : ""}#${e.id} .${e.classes.join(" .")}${e.attrs ? " " + JSON.stringify(e.attrs) : ""}${e.hidden ? " [tersembunyi]" : ""}`,
      )
      .join("\n");
    renderChoices();
    scoreNote();
  } catch (error) {
    $("quizTitle").textContent = "Terminal belum terhubung";
    $("feedback").textContent = `${(error as Error).message}`;
    show("retryQuiz");
  } finally {
    setBusy(false);
    (
      $("choices").querySelector<HTMLElement>("button") || $("retryQuiz")
    ).focus();
  }
}
world.onInteract = () => void openQuiz();
$("retryQuiz").onclick = () => void openQuiz();
$("closeQuiz").onclick = () => {
  if (!busy) show("quiz", false);
};
$("hint").onclick = () => {
  if (q && !busy) $("feedback").textContent = q.hint;
};
$("confirm").onclick = async () => {
  if (!choice || busy || state.completed[room]) return;
  setBusy(true);
  $<HTMLButtonElement>("confirm").disabled = true;
  $("feedback").textContent = "Memeriksa jawaban…";
  try {
    const response = await api("submit", { token, choice });
    token = response.token;
    state = response.state;
    save();
    scoreNote();
    if (response.correct) {
      stage = "answer";
      save();
      accepted();
    } else {
      $("feedback").textContent =
        `Belum tepat. ${q!.hint} Pilih jawaban lain lalu kirim lagi.`;
      choice = "";
      renderChoices();
    }
  } catch (error) {
    $("feedback").textContent = (error as Error).message;
    $<HTMLButtonElement>("confirm").disabled = false;
  } finally {
    setBusy(false);
  }
};
function accepted() {
  show("quiz");
  show("confirm", false);
  show("retryQuiz", false);
  show("continue");
  $("quizTitle").textContent = "Jawaban benar · " + chapters[room].title;
  $("mission").textContent =
    "Perintah sudah diverifikasi. Lanjutkan untuk memulihkan jalur.";
  $("choices").replaceChildren();
  $("scanner").textContent = "";
  $("feedback").textContent =
    (q?.hint || "Jawaban bab ini sudah tercatat.") +
    (room === 6
      ? " Klik Aktifkan pulse-switch untuk menjalankannya."
      : " Lanjutkan cerita untuk membuka pintu.");
  $("continue").textContent =
    room === 6 ? "Aktifkan pulse-switch" : "Lanjut cerita →";
  scoreNote();
  $("continue").focus();
}
function finishDialogue() {
  stage = "walk";
  lineIndex = 0;
  save();
}
function outro(restoring = false) {
  stage = "outro";
  story(sceneFor(selected, room).outro, finishDialogue, restoring);
}
$("continue").onclick = () => {
  if (busy || !state.completed[room]) return;
  world.repair();
  stage = "outro";
  save();
  $("objective").textContent =
    "Jalur pulih. Jalan ke pintu EXIT lalu tekan E →";
  show("quiz", false);
  outro();
};
world.onExit = () => {
  if (room === 7) {
    stage = "ending";
    story(ending, () => void finish());
  } else {
    room++;
    stage = "intro";
    chapter();
    intro();
  }
};
async function finish() {
  if (busy) return;
  stage = "results";
  save();
  setBusy(true);
  show("results");
  $("resultIdentity").textContent = `${identity.name} / ${identity.student}`;
  $("resultStatus").textContent = "Memuat nilai terverifikasi…";
  $("resultScore").textContent = "— / 100";
  show("retryResult", false);
  $("review").replaceChildren();
  try {
    const result = await api("result", { token });
    state = result.state;
    $("resultScore").textContent =
      `${String(result.score).replace(".", ",")} / 100`;
    $("resultStatus").textContent =
      `${state.first.filter(Boolean).length} dari 8 jawaban pertama benar · Nilai diverifikasi server`;
    chapters.forEach((c, i) => {
      const row = document.createElement("p");
      row.textContent = `${i + 1}. ${c.title} — ${state.first[i] ? "12,5 poin" : "0 poin · selesai dengan perbaikan"}`;
      $("review").append(row);
    });
  } catch (error) {
    $("resultStatus").textContent = (error as Error).message;
    show("retryResult");
  } finally {
    setBusy(false);
    $("replay").focus();
  }
}
$("retryResult").onclick = () => void finish();
function toMenu() {
  if (busy) return;
  active = false;
  for (const id of ["quiz", "story", "modal"]) show(id, false);
  show("results", false);
  show("play", false);
  show("menu");
  $("resume").hidden = !hasSave();
  $("startError").textContent = "";
  choose(selected);
  $("start").focus();
}
$("replay").onclick = toMenu;
$("toMenu").onclick = toMenu;
function modal(title: string, body: string) {
  $("modalTitle").textContent = title;
  $("modalBody").textContent = body;
  show("modal");
  $("closeModal").focus();
}
$("pause").onclick = () =>
  modal(
    "Istirahat dulu.",
    "A/D atau panah kiri/kanan: berjalan. E: buka terminal atau keluar. Pilih satu jawaban lalu kirim. Delapan jawaban pertama benar bernilai total 100. Tidak ada timer, combat, atau pengurangan nilai karena berjalan. Checkpoint tersimpan pada browser ini.",
  );
$("notes").onclick = () =>
  modal(
    "Catatan perjalanan",
    history.map((l) => `${l.who}: ${l.text}`).join("\n\n") ||
      "Perjalanan baru dimulai.",
  );
$("closeModal").onclick = () => show("modal", false);
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input, textarea")) return;
  const key = e.key.toLowerCase();
  if (key === "tab") {
    const panel = ["modal", "results", "quiz", "story"].find(
      (id) => !$(id).hidden,
    );
    if (panel) {
      const focusable = Array.from(
        $(panel).querySelectorAll<HTMLElement>(
          "button:not([disabled]), summary, input",
        ),
      ).filter((el) => !el.hidden && el.getClientRects().length);
      const first = focusable[0],
        last = focusable.at(-1);
      if (!$(panel).contains(document.activeElement)) {
        e.preventDefault();
        first?.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }
  if (key === "escape" && active) {
    if (!$("modal").hidden) show("modal", false);
    else if (!$("quiz").hidden) $("closeQuiz").click();
    else if (!world.blocked) $("pause").click();
    return;
  }
  if (world.blocked) return;
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
  windowFocused = false;
  sync();
});
window.addEventListener("focus", () => {
  windowFocused = true;
  sync();
});
document.addEventListener("visibilitychange", sync);
for (const [id, key] of [
  ["left", "a"],
  ["right", "d"],
]) {
  $(id).onpointerdown = (e) => {
    e.preventDefault();
    if (!world.blocked) {
      $(id).setPointerCapture(e.pointerId);
      world.keys.add(key);
    }
  };
  $(id).onpointerup = $(id).onpointercancel = () => {
    world.keys.delete(key);
  };
  $(id).onlostpointercapture = () => world.keys.delete(key);
}
$("interact").onclick = () => world.interact();
if (import.meta.env.DEV && new URLSearchParams(location.search).has("qa"))
  Object.assign(window, { __quiz: { world, game } });
