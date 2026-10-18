import Phaser from "phaser";
import { Arena, keys, pauseReasons, settings, sound } from "./game";
import { Registry } from "./registry";
import { challenges, select, type Plan } from "../shared/challenges";
import type { State } from "../server/state";
import {
  chapters,
  names,
  ending,
  type Character,
  type Line,
} from "./gameplay/story";
import { weapons, distance } from "./gameplay/systems";
import { unlockAudio } from "./gameplay/audio";
import { markup } from "./ui";
import "./style.css";
document.querySelector<HTMLDivElement>("#app")!.innerHTML = markup;
const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const show = (id: string, value = true) => {
  el(id).hidden = !value;
};
const arena = new Arena();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "arena",
  width: 1200,
  height: 720,
  backgroundColor: "#101d23",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: arena,
  render: { antialias: true },
  input: { keyboard: false },
});
let registry: Registry;
let token = "";
let state: State;
let selected: Character = "noah";
let active = false;
let busy = false;
let tutorial = false;
let tutorialStep = 0;
let started = 0;
let identity = { name: "", student: "" };
let eventPending = false;
let dialogDismissible = false;
let ready = false;
let storyLines: Line[] = [];
let storyIndex = 0;
let afterStory = () => {};
let oldFocus: HTMLElement | null = null;
let captionQueue: Line[] = [];
let history: Line[] = [];
let hudTick = 0;
let chapterToastUntil = 0;
let escaped = false;
pauseReasons.add("menu");
arena.onChapterReady = () => {
  ready = true;
};
const rules =
  "WASD / panah: bergerak. Mouse + klik kiri: bidik dan tembak. R: reload. 1: pistol, 2: shotgun / SMG. Q: dorong zombie. Space sambil bergerak: dash. E / tahan E: interaksi. Ikuti panah objective. Barrel bisa ditembak; jaga jarak ledakan. Ambil + untuk health dan ||| untuk ammo. Companion ikut bertarung.\n\nSetiap bab memiliki satu tantangan bernilai 12,5 poin. Hanya jawaban benar pada pengiriman pertama yang memperoleh poin. Setelah salah, kamu tetap bisa memperbaiki jawaban untuk melanjutkan. Mati dan waktu bermain tidak mengurangi nilai. Semua simulasi berhenti saat editor terbuka.";
async function api(action: string, body: object) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("/api/run/" + action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw Error("API tidak tersedia. Jalankan npm run dev, bukan Vite saja.");
    }
    if (!response.ok) throw Error(data.error ?? "Permintaan gagal.");
    return data;
  } catch (e) {
    throw Error(
      e instanceof Error && e.name !== "AbortError"
        ? e.message
        : "Koneksi belum merespons. Coba lagi dengan jawaban yang sama.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
function focusArena() {
  game.canvas?.focus();
  keys.clear();
}
function dialog(
  title: string,
  body: string,
  buttons: { text: string; action: () => void }[],
  dismissible = false,
  tag = "DEAD SIGNAL",
) {
  pauseReasons.add("dialog");
  keys.clear();
  dialogDismissible = dismissible;
  el("dialogTitle").textContent = title;
  el("dialogBody").textContent = body;
  el("dialogTag").textContent = tag;
  el("dialogActions").replaceChildren();
  buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.textContent = b.text;
    btn.onclick = b.action;
    el("dialogActions").append(btn);
  });
  show("dialog");
  el("dialogActions").querySelector("button")?.focus();
}
function closeDialog() {
  show("dialog", false);
  pauseReasons.delete("dialog");
  focusArena();
}
function choose(character: Character) {
  selected = character;
  for (const c of ["noah", "allie"] as const) {
    const b = el(c === "noah" ? "chooseNoah" : "chooseAllie");
    b.classList.toggle("selected", character === c);
    b.setAttribute("aria-pressed", String(character === c));
  }
  el("characterCopy").replaceChildren();
  el("characterCopy").append(
    document.createTextNode(
      character === "noah"
        ? "“Lo benerin sinyalnya. Gue jagain pintunya.”"
        : "“Kita kasih mereka jalan yang benar.”",
    ),
  );
  const small = document.createElement("small");
  small.textContent = `${character === "noah" ? "Allie" : "Noah"} akan menemani dan ikut bertarung.`;
  el("characterCopy").append(small);
}
el("chooseNoah").onclick = () => choose("noah");
el("chooseAllie").onclick = () => choose("allie");
function displayStory() {
  const line = storyLines[storyIndex];
  el("storyWho").textContent = line.who;
  el("storyText").textContent = line.text;
  el("storyPortrait").className = "story-portrait " + line.who.toLowerCase();
  el("storyProgress").textContent =
    `${storyIndex + 1} / ${storyLines.length} · Cerita bisa dibaca ulang di Catatan`;
  el("storyNext").textContent =
    storyIndex === storyLines.length - 1
      ? "Lanjutkan perjalanan ↗"
      : "Lanjut →";
  history.push(line);
}
function story(
  lines: Line[],
  done: () => void,
  title = chapters[arena.wave].title,
) {
  captionQueue = [];
  show("caption", false);
  storyLines = lines;
  storyIndex = 0;
  afterStory = done;
  pauseReasons.add("story");
  keys.clear();
  el("storyLocation").textContent =
    chapters[arena.wave].time + " / " + chapters[arena.wave].place;
  el("storyChapter").textContent = title;
  show("storyPanel");
  displayStory();
  el("storyNext").focus();
}
function endStory() {
  show("storyPanel", false);
  pauseReasons.delete("story");
  focusArena();
  afterStory();
}
el("storyNext").onclick = () => {
  if (storyIndex < storyLines.length - 1) {
    storyIndex++;
    displayStory();
  } else endStory();
};
el("storySkip").onclick = () => {
  history.push(...storyLines.slice(storyIndex + 1));
  endStory();
};
function queueLine(line: Line) {
  captionQueue.push(line);
  history.push(line);
  if (el("caption").hidden) advanceCaption();
}
function advanceCaption() {
  const line = captionQueue.shift();
  if (!line) {
    show("caption", false);
    return;
  }
  el("captionWho").textContent = line.who;
  el("captionText").textContent = line.text;
  el("captionPortrait").className =
    "caption-portrait " + line.who.toLowerCase();
  show("caption");
}
el("nextCaption").onclick = advanceCaption;
arena.onLine = queueLine;
function chapterStart() {
  captionQueue = [];
  show("caption", false);
  show("codeButton", false);
  show("pulse", false);
  show("tutorial", false);
  el("banner").textContent = "";
  eventPending = false;
  arena.begin(state.wave);
  show("hud");
  show("vignette");
  show("threat");
  show("waypoint");
  el("chapterTitle").textContent = chapters[arena.wave].title;
  el("chapterTime").textContent =
    `BAB ${String(arena.wave + 1).padStart(2, "0")} / ${chapters[arena.wave].time}`;
  el("chapterPlace").textContent = chapters[arena.wave].place;
  chapterToastUntil = 4.5;
  const intro =
    arena.wave === 4 && selected === "allie"
      ? [
          {
            who: "Allie" as const,
            text: "Pintunya nutup! Noah, lo di sisi mana?",
          },
          {
            who: "Noah" as const,
            text: "Sektor B. Gue tahan mereka. Lo cari terminalnya.",
          },
          {
            who: "Allie" as const,
            text: "Gue datang. Jangan jadi pahlawan sendirian.",
          },
        ]
      : chapters[arena.wave].intro;
  story(intro, () => show("chapterToast"));
}
async function startRun() {
  if (busy) return;
  if (!ready) {
    el("startError").textContent =
      "Aset karakter sedang dimuat. Coba lagi sebentar.";
    return;
  }
  busy = true;
  el<HTMLButtonElement>("start").disabled = true;
  el("startError").textContent = "Menghubungkan terminal penilaian…";
  unlockAudio();
  try {
    const response = await api("start", {});
    token = response.token;
    state = response.state;
    registry ??= new Registry(arena);
    registry.onEvent = () => void finishChallenge();
    arena.character = selected;
    history = [];
    captionQueue = [];
    identity = {
      name: el<HTMLInputElement>("name").value.trim(),
      student: el<HTMLInputElement>("student").value.trim(),
    };
    started = Date.now();
    active = true;
    escaped = false;
    eventPending = false;
    tutorial = false;
    show("menu", false);
    show("results", false);
    show("caption", false);
    pauseReasons.delete("menu");
    pauseReasons.delete("results");
    closeDialog();
    el("playerName").textContent = names[selected].toUpperCase();
    el("hudPortrait").className = "hud-portrait " + selected;
    arena.begin(0, true);
    show("hud");
    show("vignette");
    dialog(
      "Sebelum kita keluar",
      rules,
      [
        {
          text: "Coba kontrol dulu",
          action: () => {
            closeDialog();
            beginTutorial();
          },
        },
        {
          text: "Langsung ke cerita",
          action: () => {
            closeDialog();
            chapterStart();
          },
        },
      ],
      false,
      "BRIEFING / PENILAIAN TIDAK DIPENGARUHI COMBAT",
    );
  } catch (e) {
    show("menu");
    show("results", false);
    pauseReasons.add("menu");
    active = false;
    arena.phase = "idle";
    el("startError").textContent =
      (e as Error).message + " Klik Mulai Perjalanan untuk mencoba lagi.";
  } finally {
    busy = false;
    el<HTMLButtonElement>("start").disabled = false;
  }
}
el("startForm").onsubmit = (e) => {
  e.preventDefault();
  void startRun();
};
el("how").onclick = () =>
  dialog(
    "Cara bermain",
    rules,
    [{ text: "Mengerti", action: closeDialog }],
    true,
  );
el<HTMLInputElement>("motion").checked = settings.reduced;
el("motion").onchange = () => {
  settings.reduced = el<HTMLInputElement>("motion").checked;
};
el("gore").onchange = () => {
  settings.gore = el<HTMLInputElement>("gore").checked;
};
el("mute").onchange = () => {
  settings.volume = el<HTMLInputElement>("mute").checked
    ? 0
    : Number(el<HTMLInputElement>("volume").value);
};
el("volume").oninput = () => {
  if (!el<HTMLInputElement>("mute").checked)
    settings.volume = Number(el<HTMLInputElement>("volume").value);
};
const tutorialSteps = [
  "1 / 5 · WASD atau panah untuk berjalan.",
  "2 / 5 · Arahkan mouse lalu klik arena untuk menembak.",
  "3 / 5 · Bergerak sambil tekan Space untuk dash.",
  "4 / 5 · Tekan E untuk mencoba Code Gun.",
  '5 / 5 · Ketik $(".infected").hide(); lalu Jalankan. Ini tidak dinilai.',
];
function beginTutorial() {
  closeEditor();
  captionQueue = [];
  show("caption", false);
  show("pulse", false);
  tutorial = true;
  tutorialStep = 0;
  arena.begin(state.wave, true);
  show("tutorial");
  show("hud");
  show("codeButton", false);
  show("waypoint", false);
  el("tutorialStep").textContent = tutorialSteps[0];
}
function finishTutorial() {
  if (busy) return;
  tutorial = false;
  show("tutorial", false);
  closeEditor();
  chapterStart();
}
el("skip").onclick = finishTutorial;
arena.onAction = (action) => {
  if (tutorial && ["move", "shoot", "dash"][tutorialStep] === action) {
    tutorialStep++;
    el("tutorialStep").textContent = tutorialSteps[tutorialStep];
  }
};
arena.onHud = (a) => {
  if (!a.player) return;
  const now = performance.now();
  if (now - hudTick < 80) return;
  hudTick = now;
  el("hp").innerHTML = `${a.hp}<span> HP</span>`;
  el<HTMLMeterElement>("health").value = a.hp;
  el("dash").textContent =
    `DASH ${a.dash > 0 ? a.dash.toFixed(1) + "s" : "SIAP"} · Q DORONG`;
  el("weaponName").textContent =
    `${weapons[a.weapon].name} · ${a.weapon === "pistol" ? "1" : "2"}`;
  el("ammo").innerHTML =
    a.reload > 0
      ? `<span>RELOAD ${a.reload.toFixed(1)}s</span>`
      : `${a.magazines[a.weapon]}<span> / ${Number.isFinite(a.reserves[a.weapon]) ? a.reserves[a.weapon] : "∞"}</span>`;
  el("waveLabel").textContent =
    `${String(a.wave + 1).padStart(2, "0")} / 08 · ${chapters[a.wave].title.toUpperCase()}`;
  el("objective").textContent = tutorial
    ? "Ikuti latihan kontrol"
    : a.objective;
  const target = a.targetPoint;
  el("routeDistance").textContent = tutorial
    ? ""
    : `${Math.round(distance(a.player, target) / 10)} m · ${a.kills} infected tumbang`;
  el("threatText").textContent =
    a.phase === "combat"
      ? a.combatLabel
      : a.phase === "escape"
        ? "EVAKUASI / TETAP BERGERAK"
        : "JALUR AMAN";
  el("buddyState").textContent =
    `${selected === "noah" ? "ALLIE" : "NOAH"} · ${a.buddyRecover > 0 ? "BERLINDUNG" : "BERSAMAMU"}`;
  show(
    "interaction",
    !!a.interaction && a.phase === "combat" && !pauseReasons.size,
  );
  el("interaction").textContent = a.interaction;
  const angle = Math.atan2(target.y - a.player.y, target.x - a.player.x);
  el("waypoint").style.transform = `rotate(${angle}rad)`;
  const boss = a.enemies.find((e) => e.type === 4);
  show("bossHud", !!boss);
  if (boss) el<HTMLMeterElement>("bossHealth").value = boss.hp;
  if (!pauseReasons.size && chapterToastUntil > 0) {
    chapterToastUntil -= 0.08;
    if (chapterToastUntil <= 0) show("chapterToast", false);
  }
};
arena.onReady = () => {
  registry.reset(challenges[arena.wave].entities);
  el("banner").textContent = "TERMINAL TERHUBUNG / CODE GUN SIAP";
  show("codeButton");
  show("waypoint", false);
  show("chapterToast", false);
  queueLine({
    who: "Allie",
    text: "Area aman. Buka Code Gun. Pilih target yang tepat lewat scanner; sistem containment yang menjalankan efeknya.",
  });
  sound(1000);
};
arena.onDeath = () =>
  dialog(
    "Tetap sama gue.",
    `${selected === "noah" ? "Allie" : "Noah"} menarikmu ke titik aman. Ulangi ${arena.escapeCheckpoint ? "lari ke feri" : "combat bab ini"} dengan health penuh. Jawaban dan nilai yang sudah dicatat tetap tersimpan.`,
    [
      {
        text: "Bangkit lagi",
        action: () => {
          closeDialog();
          arena.respawn();
          show("chapterToast", false);
        },
      },
    ],
    false,
    "CHECKPOINT / NILAI TIDAK BERKURANG",
  );
arena.onOpenCode = openEditor;
function openEditor() {
  if (
    busy ||
    eventPending ||
    pauseReasons.has("dialog") ||
    pauseReasons.has("story") ||
    (!tutorial && arena.phase !== "code")
  )
    return;
  if (tutorial && tutorialStep < 3) return;
  if (tutorial) {
    tutorialStep = 4;
    el("tutorialStep").textContent = tutorialSteps[4];
    registry.reset(challenges[0].entities);
  }
  oldFocus = document.activeElement as HTMLElement;
  keys.clear();
  pauseReasons.add("editor");
  const c = challenges[tutorial ? 0 : arena.wave];
  el("challengeTitle").textContent =
    `${tutorial ? "Latihan" : chapters[arena.wave].title} / ${c.topic}`;
  el("mission").textContent = c.mission;
  el("scanner").textContent = registry.snapshot();
  el("feedback").textContent = "";
  el<HTMLTextAreaElement>("answer").value = "";
  el("matches").textContent = "Preview selector tidak menilai jawaban.";
  updateScore();
  show("editorPanel");
  el("answer").focus();
}
function closeEditor() {
  if (busy) return;
  show("editorPanel", false);
  pauseReasons.delete("editor");
  keys.clear();
  if (oldFocus && !oldFocus.closest("[hidden]")) oldFocus.focus();
  else focusArena();
}
function updateScore() {
  el("scoreState").textContent = tutorial
    ? "Latihan · tidak dinilai"
    : state.completed[arena.wave]
      ? `Tercatat: ${state.first[arena.wave] ? "12,5" : "0"} poin`
      : state.attempts[arena.wave] > 0
        ? "Poin bab ini: 0 · Perbaiki jawaban agar perjalanan berlanjut."
        : "Pengiriman pertama · tersedia 12,5 poin";
}
el("codeButton").onclick = openEditor;
el("closeEditor").onclick = closeEditor;
el("answer").oninput = () => {
  try {
    const m = /^\s*\$\(\s*(["'])((?:\\.|[^\\])*?)\1\s*\)/.exec(
      el<HTMLTextAreaElement>("answer").value,
    );
    if (!m) throw Error();
    const selector = m[2].replace(/\\(["'\\])/g, "$1");
    const ids = select(selector, registry.entities);
    arena.highlight(ids);
    el("matches").textContent =
      `${ids.length} objek cocok · preview, bukan penilaian`;
  } catch {
    arena.highlight([]);
    el("matches").textContent = "Selector belum lengkap atau tidak didukung.";
  }
};
el("hint").onclick = () => {
  const c = challenges[tutorial ? 0 : arena.wave];
  el("feedback").textContent =
    !tutorial && state.attempts[arena.wave] > 0
      ? `${c.hint}\nContoh: ${c.solution}`
      : c.hint;
};
async function finishChallenge() {
  show("pulse", false);
  show("codeButton", false);
  eventPending = false;
  el("banner").textContent = "";
  sound(1100);
  arena.phase = "transition";
  story(chapters[arena.wave].outro, () => {
    if (state.wave === 8) {
      arena.followPlayer();
      arena.startEscape();
      show("waypoint");
    } else
      dialog(
        "Jalur terbuka",
        `${state.first[arena.wave] ? "Jawaban pertama benar: +12,5 poin." : "Tantangan selesai: 0 poin untuk bab ini."}\n${challenges[arena.wave].hint}`,
        [
          {
            text: `Lanjut · ${chapters[state.wave].title}`,
            action: () => {
              closeDialog();
              chapterStart();
            },
          },
        ],
        false,
        "CATATAN PEMULIHAN",
      );
  });
}
async function applyValidated(plan: Plan) {
  show("codeButton", false);
  arena.phase = "effect";
  el("banner").textContent = "CONTAINMENT / MENERAPKAN PERINTAH";
  await registry.apply(plan);
  if (arena.wave === 6) {
    eventPending = true;
    arena.phase = "switch";
    show("pulse");
    el("banner").textContent =
      "HANDLER TERPASANG · Aktifkan switch untuk menyiarkan koordinat.";
    el("pulse").focus();
  } else await finishChallenge();
}
async function send() {
  const answer = el<HTMLTextAreaElement>("answer").value;
  if (busy || !answer.trim()) return;
  busy = true;
  el<HTMLButtonElement>("submit").disabled = true;
  el("feedback").textContent = "Mengirim ke terminal penilaian…";
  try {
    if (tutorial) {
      const { parseCommand } = await import("../server/validator");
      const p = parseCommand(answer);
      if (
        select(p.selector, registry.entities).join(",") !== "virus-a,virus-b" ||
        p.operations.length !== 1 ||
        p.operations[0].method !== "hide"
      )
        throw Error("Sembunyikan .infected dengan hide().");
      busy = false;
      closeEditor();
      busy = true;
      await registry.apply(p);
      busy = false;
      finishTutorial();
      return;
    }
    const response = await api("submit", { token, answer });
    token = response.token;
    state = response.state;
    el("feedback").textContent = response.feedback;
    updateScore();
    sound(response.correct ? 950 : 150);
    if (response.correct) {
      busy = false;
      closeEditor();
      busy = true;
      try {
        await applyValidated(response.plan);
      } catch (e) {
        dialog(
          "Perintah sudah tercatat",
          "Efek visual belum selesai. Ulangi penerapan tanpa mengirim jawaban atau menambah percobaan.",
          [
            {
              text: "Terapkan ulang",
              action: () => {
                closeDialog();
                void applyValidated(response.plan);
              },
            },
          ],
        );
      }
    }
  } catch (e) {
    el("feedback").textContent =
      (e as Error).message + " Coba lagi; progression menunggu respons server.";
  } finally {
    busy = false;
    el<HTMLButtonElement>("submit").disabled = false;
  }
}
el("submit").onclick = () => void send();
function pulse() {
  if (!eventPending || busy || pauseReasons.size) return;
  eventPending = false;
  arena.phase = "effect";
  registry.click();
}
el("pulse").onclick = pulse;
arena.onSwitch = pulse;
arena.onEscape = () => {
  escaped = true;
  show("waypoint", false);
  show("caption", false);
  show("threat", false);
  story(ending, () => void results(), "Kita pulang bersama.");
};
async function results() {
  if (!escaped) return;
  try {
    const data = await api("result", { token });
    show("hud", false);
    show("results");
    show("chapterToast", false);
    pauseReasons.add("results");
    el("results").innerHTML =
      `<div class="result-card"><p class="eyebrow">EVAKUASI BERHASIL / HASIL DIVERIFIKASI SERVER</p><h2>SELECTOR STRIKE <em>DEAD SIGNAL</em></h2><p class="ending-line">Noah dan Allie selamat. Sinyal yang benar membawa mereka pulang.</p><div class="result-top"><div><h3 id="resultName"></h3><p id="resultStudent"></p><p id="resultMeta"></p></div><div class="score">${String(data.score).replace(".", ",")}<small> / 100</small></div></div><p>${data.state.first.filter(Boolean).length} dari 8 jawaban benar pada pengiriman pertama</p><div class="result-rows">${chapters.map((c, i) => `<div><span>0${i + 1} / ${c.title}<small>${challenges[i].topic}</small></span><span>${data.state.attempts[i]} percobaan</span><b>${data.state.first[i] ? "12,5" : "0"} poin</b></div>`).join("")}</div><p>Ambil screenshot halaman ini untuk pengumpulan.</p><small>Identitas lokal · Waktu tidak tersertifikasi · Run ID bukan kode verifikasi publik.</small><div class="actions"><button id="again" class="primary">Main Lagi</button><button id="back">Kembali ke Menu</button></div></div>`;
    el("resultName").textContent = identity.name;
    el("resultStudent").textContent = "NIM / ID: " + identity.student;
    el("resultMeta").textContent =
      `${names[selected]} · Durasi lokal ${Math.round((Date.now() - started) / 60000)} menit · Run ${data.state.runId.slice(0, 8)}`;
    el("again").onclick = () => {
      pauseReasons.delete("results");
      void startRun();
    };
    el("back").onclick = returnMenu;
    sound(1200);
  } catch (e) {
    dialog("Hasil belum dapat diverifikasi", (e as Error).message, [
      {
        text: "Coba lagi",
        action: () => {
          closeDialog();
          void results();
        },
      },
    ]);
  }
}
function returnMenu() {
  active = false;
  pauseReasons.delete("results");
  pauseReasons.delete("dialog");
  pauseReasons.delete("story");
  pauseReasons.delete("editor");
  pauseReasons.add("menu");
  for (const id of [
    "results",
    "hud",
    "dialog",
    "storyPanel",
    "editorPanel",
    "caption",
    "waypoint",
    "threat",
    "vignette",
    "codeButton",
    "pulse",
    "tutorial",
    "chapterToast",
  ])
    show(id, false);
  show("menu");
  arena.clear();
  arena.phase = "idle";
  el("banner").textContent = "";
}
function openLog() {
  if (
    !active ||
    busy ||
    pauseReasons.has("story") ||
    pauseReasons.has("dialog")
  )
    return;
  dialog(
    "Catatan perjalanan",
    history.length
      ? history.map((l) => l.who + ": " + l.text).join("\n\n")
      : "Belum ada percakapan.",
    [{ text: "Kembali", action: closeDialog }],
    true,
    "NOAH × ALLIE",
  );
}
el("logButton").onclick = openLog;
function pause() {
  if (
    !active ||
    busy ||
    pauseReasons.has("story") ||
    pauseReasons.has("dialog")
  )
    return;
  const buttons = [
    { text: "Lanjutkan", action: closeDialog },
    {
      text: settings.volume ? "Senyapkan audio" : "Aktifkan audio",
      action: () => {
        settings.volume = settings.volume ? 0 : 0.25;
        closeDialog();
      },
    },
    {
      text: settings.reduced ? "Gerakan normal" : "Kurangi gerakan",
      action: () => {
        settings.reduced = !settings.reduced;
        closeDialog();
      },
    },
    {
      text: "Lihat kontrol",
      action: () =>
        dialog(
          "Kontrol",
          rules,
          [{ text: "Kembali bermain", action: closeDialog }],
          true,
        ),
    },
  ];
  if (!eventPending && state.wave === arena.wave && arena.phase !== "dead")
    buttons.push({
      text: "Ulang latihan kontrol (combat bab diulang)",
      action: () => {
        closeDialog();
        beginTutorial();
      },
    });
  dialog(
    "Tarik napas dulu.",
    "Dunia dijeda. Noah dan Allie menunggu sampai lo siap.",
    buttons,
    true,
  );
}
el("pauseButton").onclick = pause;
window.addEventListener("keydown", (e) => {
  const modal = ["dialog", "storyPanel", "editorPanel"]
    .map(el)
    .find((x) => !x.hidden);
  if (e.key === "Tab" && modal) {
    const list = Array.from(
      modal.querySelectorAll<HTMLElement>(
        "button:not(:disabled),textarea,input",
      ),
    );
    const first = list[0],
      last = list.at(-1);
    if (
      first &&
      (!modal.contains(document.activeElement) ||
        (e.shiftKey && document.activeElement === first) ||
        (!e.shiftKey && document.activeElement === last))
    ) {
      e.preventDefault();
      (e.shiftKey ? last : first)?.focus();
    }
  }
  const typing = ["INPUT", "TEXTAREA"].includes(
    (e.target as HTMLElement).tagName,
  );
  if (e.key === "Escape") {
    e.preventDefault();
    if (busy) return;
    if (!el("dialog").hidden) {
      if (dialogDismissible) closeDialog();
    } else if (!el("editorPanel").hidden) closeEditor();
    else if (el("storyPanel").hidden) pause();
    return;
  }
  if (typing) {
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key === "Enter" &&
      !el("editorPanel").hidden
    ) {
      e.preventDefault();
      void send();
    }
    return;
  }
  if (pauseReasons.size) return;
  const key = e.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key))
    e.preventDefault();
  keys.add(key);
  if (!e.repeat) arena.command(key);
  if (key === "e" && !e.repeat) arena.interact();
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => {
  keys.clear();
  pauseReasons.add("blur");
});
window.addEventListener("focus", () => {
  if (!document.hidden) pauseReasons.delete("blur");
});
document.addEventListener("visibilitychange", () => {
  keys.clear();
  if (document.hidden) pauseReasons.add("hidden");
  else if (document.hasFocus()) {
    pauseReasons.delete("hidden");
    pauseReasons.delete("blur");
  } else pauseReasons.delete("hidden");
});
if (matchMedia("(pointer: coarse)").matches) show("touchNotice");

// Dev-only integration hook. Tests inspect this live instance without importing/restarting the entry module.
if (import.meta.env.DEV && new URLSearchParams(location.search).has("qa")) {
  Object.assign(window, { __deadSignal: { arena, game } });
}
