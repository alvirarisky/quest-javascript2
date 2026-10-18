import Phaser from "phaser";
import { missions, type EscapeMode } from "./missions";
import type { Plan, Escape } from "./story";
import { cue, heartbeat } from "./audio";
import type { Character } from "../gameplay/story";
// Hunters start (and respawn) from these lanes, never closer than SAFE to the player.
// Extra hunters join from behind, never camping the exit.
const LANES = [-140, 600, 990, -380, -620];
const SAFE = 360;
// Grace freezes hunters and catching; short enough that SAFE cannot be crossed.
const GRACE = 900;
const ASSIST_AFTER = 3;
// The wave (Q) knocks close hunters flat for a long time and shoves the rest.
const WAVE_RANGE = 600;
const KNOCKDOWN_RANGE = 160;
const KNOCKDOWN = 3200;
const SHOVE_STUN = 1600;
// Stealth chapter: patrol start lanes and the shadows that hide a still player.
const PATROLS = [560, 920, 1060, 700];
const SHADOWS = [420, 780];
const SHADOW_WIDTH = 120;
// Each location has its own obstacles: low ones are jumped (Space), tall ones
// smashed (E), hazards switch on and off, puddles slow everyone down.
type ObstacleKind =
  | "cart"
  | "shelf"
  | "stretcher"
  | "luggage"
  | "cables"
  | "shutter"
  | "glass"
  | "turnstile"
  | "spark"
  | "steam"
  | "puddle";
type Category = "jump" | "smash" | "hazard" | "slow";
export const KINDS: Record<
  ObstacleKind,
  { cat: Category; w: number; hp?: number; name: string }
> = {
  cart: { cat: "jump", w: 80, name: "Troli belanja" },
  shelf: { cat: "jump", w: 110, name: "Rak roboh" },
  stretcher: { cat: "jump", w: 110, name: "Ranjang dorong" },
  luggage: { cat: "jump", w: 84, name: "Tumpukan koper" },
  cables: { cat: "jump", w: 70, name: "Gulungan kabel" },
  shutter: { cat: "smash", w: 60, hp: 6, name: "Rolling door" },
  glass: { cat: "smash", w: 50, hp: 3, name: "Sekat kaca" },
  turnstile: { cat: "smash", w: 54, hp: 5, name: "Palang tiket" },
  spark: { cat: "hazard", w: 76, name: "Kabel memercik" },
  steam: { cat: "hazard", w: 56, name: "Uap panas" },
  puddle: { cat: "slow", w: 170, name: "Genangan" },
};
export const OBSTACLES: [ObstacleKind, number][][] = [
  [
    ["cart", 430],
    ["shutter", 800],
  ],
  [
    ["shelf", 450],
    ["spark", 790],
  ],
  [
    ["glass", 560],
    ["stretcher", 860],
  ],
  [["puddle", 600]],
  [
    ["luggage", 400],
    ["spark", 690],
    ["turnstile", 950],
  ],
  [],
  [
    ["cables", 500],
    ["steam", 820],
  ],
  [
    ["steam", 390],
    ["cables", 800],
  ],
];
// Hazards cycle: on for HAZARD_ON of every HAZARD_PERIOD, offset by position.
const HAZARD_PERIOD = 2800;
const HAZARD_ON = 1100;
type Obstacle = {
  kind: ObstacleKind;
  cat: Category;
  x: number;
  w: number;
  hp: number;
  max: number;
  on: boolean;
  g: Phaser.GameObjects.Graphics;
};
// Player half-width for collisions; crates clear once the feet are this high.
const BODY = 22;
const CLEAR = -50;
const DEFEND_GAP = 6500;
export class InvasionWorld extends Phaser.Scene {
  player!: Phaser.GameObjects.Image;
  character: Character = "noah";
  wave = 0;
  progress = 0;
  repaired = false;
  blocked = true;
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  keys = new Set<string>();
  destination: number | null = null;
  autoAction = false;
  nodes: Phaser.GameObjects.Container[] = [];
  props: Phaser.GameObjects.Graphics[] = [];
  shields!: Phaser.GameObjects.Graphics;
  backdrop!: Phaser.GameObjects.Image;
  enemies: Phaser.GameObjects.Image[] = [];
  indicators: Phaser.GameObjects.Arc[] = [];
  labels: Phaser.GameObjects.Text[] = [];
  gate!: Phaser.GameObjects.Rectangle;
  core!: Phaser.GameObjects.Container;
  effect!: Phaser.GameObjects.Graphics;
  onReady = () => {};
  onTask = (index: number) => {};
  onQuiz = () => {};
  onExit = () => {};
  onHint = (text: string) => {};
  onLoadError = () => {};
  onIdle = () => {};
  hunters: Phaser.GameObjects.Image[] = [];
  escaping = false;
  failures: boolean[] = [];
  finalPlan: Plan = "cut";
  bossIndex = 0;
  bossNodes: Phaser.GameObjects.Arc[] = [];
  obstacles: Obstacle[] = [];
  private escapeGrace = 0;
  onPulseReady = (_ready: boolean, _armed: boolean) => {};
  onTutorialDone = () => {};
  onGate = () => {};
  mode: EscapeMode = "quiet";
  // Set by the shell: a wrong field choice made noise in this chapter.
  alerted = false;
  // Set by the shell until the player has used the wave once in a chase.
  tutorial = false;
  jumpY = 0;
  pulseCooldown = 0;
  gateHp = 0;
  private gateMax = 0;
  private vy = 0;
  private moving = false;
  private tutorialStep = 0;
  private hitCooldown = 0;
  private stagger = 0;
  // Furthest obstacle the player has cleared this escape; respawns land past it.
  private checkpoint = 0;
  private clock = 0;
  private alarmFx: Phaser.GameObjects.GameObject[] = [];
  private dust: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sweep: {
    g: Phaser.GameObjects.Graphics;
    timer: number;
    phase: "idle" | "warn" | "strike";
    from: number;
    to: number;
  } | null = null;
  private spawnTimer = 0;
  private waves = 0;
  private told = new Set<string>();
  private gateBar: Phaser.GameObjects.Graphics | null = null;
  onDanger = (_danger: number) => {};
  danger = 0;
  stats: Escape = { time: 0, catches: 0, closeCalls: 0 };
  screamer: Phaser.GameObjects.Image | null = null;
  // After ASSIST_AFTER catches adrenaline kicks in: slower chase.
  assist = false;
  private scream: "idle" | "warn" | "lunge" = "idle";
  private screamTimer = 0;
  private lungeDir = 0;
  private idle = 0;
  private hinted = false;
  private failed = false;
  preload() {
    this.load.on("loaderror", () => {
      this.failed = true;
      this.onLoadError();
    });
    this.load.image("environments", "/art/invasion-environments.png");
    this.load.image("infected", "/art/survivors-infected.png");
    for (const c of ["noah", "allie"])
      this.load.spritesheet(c, `/art/${c}-side.png`, {
        frameWidth: 512,
        frameHeight: 512,
      });
  }
  create() {
    if (this.failed) return;
    const atlas = this.textures.get("environments"),
      source = atlas.getSourceImage() as HTMLImageElement;
    for (let i = 0; i < 4; i++) {
      const x = ((i % 2) * source.width) / 2,
        y = (Math.floor(i / 2) * source.height) / 2;
      atlas.add(String(i), 0, x, y, source.width / 2, source.height / 2);
    }
    const t = this.textures.get("infected"),
      im = t.getSourceImage() as HTMLImageElement;
    t.add(
      "zombie",
      0,
      im.width / 4,
      im.height / 2,
      im.width / 4,
      im.height / 4,
    );
    const dot = this.make.graphics({}, false);
    dot.fillStyle(0xffffff).fillCircle(4, 4, 4).generateTexture("mote", 8, 8);
    dot.destroy();
    this.begin(0, "noah", 0, false);
    this.onReady();
  }
  begin(
    wave: number,
    character: Character,
    progress: number,
    repaired: boolean,
  ) {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.idle = 0;
    this.escaping = false;
    this.hunters = [];
    this.bossIndex = 0;
    this.bossNodes = [];
    this.escapeGrace = 0;
    this.mode = "quiet";
    this.pulseCooldown = 0;
    this.hitCooldown = 0;
    this.jumpY = this.vy = 0;
    this.obstacles = [];
    this.alarmFx = [];
    this.dust = null;
    this.sweep = null;
    this.stagger = this.clock = this.checkpoint = 0;
    this.told.clear();
    this.gateHp = this.gateMax = 0;
    this.gateBar = null;
    this.tutorialStep = 0;
    this.stats = { time: 0, catches: 0, closeCalls: 0 };
    this.screamer = null;
    this.assist = false;
    this.setDanger(0);
    this.hinted = false;
    this.nodes = [];
    this.props = [];
    this.indicators = [];
    this.labels = [];
    this.enemies = [];
    this.wave = wave;
    this.character = character;
    this.progress = progress;
    this.repaired = repaired;
    this.destination = null;
    this.autoAction = false;
    this.keys.clear();
    const m = missions[wave];
    this.backdrop = this.add
      .image(600, 325, "environments", String(m.background))
      .setDisplaySize(1200, 650);
    this.add.rectangle(600, 325, 1200, 650, 0x06171b, 0.12);
    // Readable foreground walkway; scenery remains visible above the playable layer.
    this.add.rectangle(600, 581, 1200, 138, 0x081114, 0.73);
    this.add.rectangle(600, 518, 1200, 2, 0x8daf9a, 0.4);
    this.ambience(m.background);
    this.effect = this.add.graphics().setDepth(3);
    [480, 760, 1040].forEach((x, i) => {
      const e = this.add
        .image(x, 420, "infected", "zombie")
        .setDisplaySize(120, 120)
        .setTint(0x8a9c6b)
        .setAlpha(0.65)
        .setDepth(2);
      this.enemies.push(e);
      if (m.background === 3) e.setVisible(false);
    });
    this.shields = this.add.graphics().setDepth(3);
    if (wave === 2) {
      this.shields.lineStyle(3, 0x91d1e7, 0.8);
      this.enemies
        .slice(0, 2)
        .forEach((e) => this.shields.strokeEllipse(e.x, e.y - 10, 110, 145));
    }
    this.drawProp(m.tasks[0].x, m.tasks[0].icon);
    this.drawProp(m.tasks[1].x, m.tasks[1].icon);
    this.drawProp(940, "console");
    this.gate = this.add
      .rectangle(1135, 411, 76, 214, 0x10262b, 0.8)
      .setStrokeStyle(3, 0xd18b62)
      .setDepth(3);
    if (wave === 5 && !repaired) this.gate.setAlpha(0);
    this.gate
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.selectTarget(3));
    this.core = this.add
      .container(925, 150)
      .setDepth(2)
      .setVisible(m.background === 3);
    const alien = this.add.graphics();
    alien.fillStyle(0xc2ef9c, 0.12).fillCircle(0, 0, 72);
    alien.lineStyle(2, 0xc2ef9c, 0.65).strokeCircle(0, 0, 49);
    alien.fillStyle(0xc2ef9c, 0.2).fillCircle(0, 0, 34);
    alien.lineStyle(1, 0xc2ef9c, 0.3).strokeCircle(0, 0, 65);
    this.core.add(alien);
    [
      ...m.tasks.map((t) => ({ x: t.x, label: t.label })),
      { x: 940, label: m.device },
      { x: 1135, label: "KELUAR" },
    ].forEach((n, i) => {
      const marker = this.add
        .circle(0, 0, 18, 0x102025)
        .setStrokeStyle(2, 0xe3bd78);
      const number = this.add
        .text(0, 0, i < 3 ? "◇" : "→", {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#f3d99b",
        })
        .setOrigin(0.5);
      const label = this.add
        .text(0, 32, n.label, {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#f6e4ba",
          align: "center",
          wordWrap: { width: 145 },
          backgroundColor: "#102025",
          padding: { x: 7, y: 5 },
        })
        .setOrigin(0.5, 0);
      const node = this.add
        .container(n.x, 190, [marker, number, label])
        .setDepth(6)
        .setSize(130, 105)
        .setInteractive({ useHandCursor: true });
      node.on("pointerdown", () => this.selectTarget(i));
      this.nodes.push(node);
      this.indicators.push(marker);
      this.labels.push(label);
    });
    this.add
      .ellipse(140, 512, 82, 15, 0x000000, 0.45)
      .setName("shadow")
      .setDepth(4);
    this.player = this.add
      .image(140, 423, character, 0)
      .setDisplaySize(210, 210)
      .setDepth(5);
    this.renderState();
    if (repaired) this.beginEscape();
    else this.onPulseReady(true, false);
    this.cameras.main
      .setBounds(0, 0, 1200, 650)
      .startFollow(this.player, true, 1, 1);
  }
  drawProp(x: number, icon: string) {
    const g = this.add.graphics().setDepth(3);
    this.props.push(g);
    const index =
      x === missions[this.wave].tasks[0].x
        ? 0
        : x === missions[this.wave].tasks[1].x
          ? 1
          : 2;
    g.setInteractive(
      new Phaser.Geom.Rectangle(x - 65, 380, 130, 140),
      Phaser.Geom.Rectangle.Contains,
    );
    g.input!.cursor = "pointer";
    g.on("pointerdown", () => this.selectTarget(index));
    if (icon === "freezer") {
      g.fillStyle(0x1d3f46, 0.95).fillRect(x - 65, 390, 130, 125);
      g.lineStyle(3, 0x8ebcbe)
        .strokeRect(x - 65, 390, 130, 125)
        .lineBetween(x, 390, x, 515);
      g.fillStyle(0xe3bd78).fillRect(x + 43, 430, 8, 25);
    } else if (icon === "valve") {
      g.fillStyle(0x345359).fillRect(x - 6, 380, 12, 135);
      g.lineStyle(6, 0xa7c2b9)
        .strokeCircle(x, 425, 29)
        .lineBetween(x - 29, 425, x + 29, 425)
        .lineBetween(x, 396, x, 454);
    } else if (index === 0) {
      g.fillStyle(0x101b1d, 0.65).fillEllipse(x, 508, 85, 12);
      if (icon === "battery") {
        g.fillStyle(0xbebd9d).fillRoundedRect(x - 11, 460, 22, 45, 4);
        g.fillStyle(0x93dabd).fillRect(x - 7, 473, 14, 18);
        g.fillStyle(0xe3bd78).fillRect(x - 5, 454, 10, 6);
      } else {
        g.fillStyle(0xcec3a0).fillRoundedRect(x - 25, 465, 50, 34, 3);
        g.lineStyle(2, 0x53635c)
          .lineBetween(x - 15, 475, x + 14, 475)
          .lineBetween(x - 15, 483, x + 5, 483);
      }
    } else {
      g.fillStyle(0x172e35, 0.95).fillRoundedRect(x - 45, 421, 90, 94, 5);
      g.lineStyle(2, 0x647f7d).strokeRoundedRect(x - 45, 421, 90, 94, 5);
      g.fillStyle(icon === "console" ? 0x82b8ad : 0xe3bd78, 0.75).fillRect(
        x - 30,
        435,
        60,
        32,
      );
      g.fillStyle(0x0a2228)
        .fillRect(x - 20, 445, 40, 4)
        .fillRect(x - 20, 454, 25, 3);
    }
  }
  selectTarget(index: number) {
    if (this.blocked) return;
    if (index === this.targetIndex) this.goToTarget();
    else
      this.onHint(
        index < this.targetIndex
          ? "Langkah ini sudah selesai."
          : "Selesaikan langkah yang ditandai amber dulu.",
      );
  }
  get targetIndex() {
    return this.repaired ? 3 : this.progress < 2 ? this.progress : 2;
  }
  get targetX() {
    if (this.repaired && !this.gateOpen) return 1060;
    if (
      this.repaired &&
      this.wave === 7 &&
      this.bossIndex < this.bossNodes.length
    )
      return this.bossNodes[this.bossIndex].x - 70;
    return this.targetIndex < 2
      ? missions[this.wave].tasks[this.targetIndex].x
      : this.targetIndex === 2
        ? 940
        : 1135;
  }
  goToTarget() {
    if (this.blocked) return;
    // A barricade in the way turns the walk button into a swing.
    const wall = this.wallNear(Math.sign(this.targetX - this.player.x) || 1);
    if (wall) {
      this.smash(wall);
      return;
    }
    this.destination = this.targetX;
    this.autoAction = true;
    if (Math.abs(this.player.x - this.targetX) < 65) {
      this.destination = null;
      this.autoAction = false;
      this.interact();
    }
  }
  interact() {
    if (this.blocked) return;
    const facing = this.player.flipX ? -1 : 1;
    const wall = this.wallNear(facing) ?? this.wallNear(-facing);
    if (wall) {
      this.smash(wall);
      return;
    }
    if (Math.abs(this.player.x - this.targetX) > 90) {
      this.onHint(
        "Dekati penanda amber, atau klik tombol langkah untuk berjalan otomatis.",
      );
      return;
    }
    this.destination = null;
    this.autoAction = false;
    if (
      this.repaired &&
      this.wave === 7 &&
      this.bossIndex < this.bossNodes.length
    )
      this.smashNode();
    else if (this.repaired && !this.gateOpen) this.smashGate();
    else if (this.repaired) this.onExit();
    else if (this.progress < 2) this.onTask(this.progress);
    else this.onQuiz();
  }
  advance() {
    this.idle = 0;
    this.hinted = false;
    this.progress = Math.min(2, this.progress + 1);
    this.renderState();
  }
  beginEscape() {
    const planned = missions[this.wave].escape,
      failed = !!this.failures[this.wave];
    // Quiet chapters breathe unless the quiz failed or a field mistake made noise.
    this.mode =
      planned === "quiet"
        ? failed || this.alerted
          ? "run"
          : "quiet"
        : planned;
    this.escaping = this.mode !== "quiet";
    if (!this.escaping) return;
    this.escapeGrace = GRACE;
    if (this.mode !== "defend") this.player.x = 140;
    const tint = failed ? 0xc99583 : 0xa5b59a;
    // A correct answer thins the pursuit; a wrong one thickens it.
    const count =
      this.mode === "hide"
        ? (failed ? 3 : 2) + Number(this.alerted)
        : this.mode === "defend"
          ? 0
          : Math.min(
              LANES.length,
              (failed ? 3 : 2) +
                Number(this.wave > 0 && !!this.failures[0]) +
                Number(this.wave > 5 && !!this.failures[5]) +
                Number(this.alerted),
            );
    this.hunters = Array.from({ length: count }, () => this.spawn(0, tint));
    // Second half: one hunter telegraphs, then lunges. The wave cancels it.
    if (this.wave >= 4 && this.mode === "run")
      this.screamer = this.hunters[1]
        .setDisplaySize(175, 175)
        .setTint(0xd98a6e)
        .setData("tint", 0xd98a6e);
    // Task props fade so obstacles read clearly during the escape.
    this.props.forEach((prop) => prop.setAlpha(Math.min(prop.alpha, 0.3)));
    // Backdrop infected are scenery; in these modes they read as threats.
    if (this.mode !== "run") this.enemies.forEach((e) => e.setVisible(false));
    if (this.mode === "hide") this.effect.clear();
    if (this.mode === "hide")
      for (const x of SHADOWS) {
        this.add
          .rectangle(x, 450, SHADOW_WIDTH, 150, 0x000000, 0.55)
          .setDepth(3);
        this.add
          .text(x, 540, "BAYANGAN", {
            fontFamily: "monospace",
            fontSize: "11px",
            color: "#8fa5a0",
          })
          .setOrigin(0.5)
          .setDepth(3);
      }
    if (this.mode === "defend") {
      // The service gate is jammed: smash it open while waves come from the left.
      this.gateMax = this.gateHp = failed ? 36 : 30;
      this.spawnTimer = 400;
      this.waves = 0;
      this.gateBar = this.add.graphics().setDepth(6);
      this.gate.setAlpha(1).setStrokeStyle(3, 0xd18b62);
      this.drawGate();
    }
    this.obstacles = OBSTACLES[this.wave].map(([kind, x]) => {
      const spec = KINDS[kind],
        max = spec.hp ? spec.hp + (failed ? 2 : 0) : 0;
      const o = {
        kind,
        cat: spec.cat,
        x,
        w: spec.w,
        hp: max,
        max,
        on: false,
        g: this.add.graphics().setDepth(spec.cat === "slow" ? 2 : 4),
      };
      this.drawObstacle(o);
      return o;
    });
    this.placeHunters();
    if (failed) this.backdrop.setTint(0xb6877e);
    if (this.wave === 7) {
      const count =
        (this.finalPlan === "cut" ? 2 : 3) + Number(!!this.failures[7]);
      this.core.setVisible(true).setAlpha(1);
      this.bossNodes = Array.from({ length: count }, (_, i) =>
        this.add
          .circle(
            300 + i * (650 / Math.max(1, count - 1)),
            440,
            28,
            0x111d22,
            0.9,
          )
          .setStrokeStyle(3, this.finalPlan === "cut" ? 0xe6ae82 : 0x8cdacb)
          .setDepth(6)
          .setData("hp", 3)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => this.goToTarget()),
      );
      this.markNode();
      this.sweep = {
        g: this.add.graphics().setDepth(7),
        timer: 2600,
        phase: "idle",
        from: 0,
        to: 0,
      };
      this.labels[3].setText(
        this.finalPlan === "cut" ? "PUTUS SIMPUL" : "SELARASKAN",
      );
      this.gate.setStrokeStyle(3, 0xd18b62);
    }
    this.onPulseReady(true, true);
  }
  private spawn(x: number, tint: number) {
    return this.add
      .image(x, 455, "infected", "zombie")
      .setDisplaySize(150, 150)
      .setTint(tint)
      .setData({ tint, stun: 0, patrol: 0 })
      .setDepth(4);
  }
  private drawObstacle(o: Obstacle) {
    const g = o.g.clear(),
      x = o.x,
      half = o.w / 2;
    if (o.kind === "cart") {
      g.lineStyle(3, 0x9aa7a8).strokeRect(x - 38, 468, 76, 34);
      for (let i = -26; i < 38; i += 13) g.lineBetween(x + i, 468, x + i, 502);
      g.lineBetween(x + 38, 468, x + 48, 452);
      g.fillStyle(0x1c2224)
        .fillCircle(x - 28, 512, 6)
        .fillCircle(x + 28, 512, 6);
    } else if (o.kind === "shelf") {
      g.fillStyle(0x3b4447).fillRect(x - half, 480, o.w, 38);
      g.lineStyle(3, 0x6f7b7f).strokeRect(x - half, 480, o.w, 38);
      [0xb6503c, 0xd9b24a, 0x4f8fb0, 0x7da35a].forEach((c, i) =>
        g.fillStyle(c).fillRect(x - half + 8 + i * 26, 466, 18, 16),
      );
    } else if (o.kind === "stretcher") {
      g.fillStyle(0xa9c7cf).fillRect(x - half, 470, o.w, 16);
      g.lineStyle(3, 0x7c8b8f)
        .lineBetween(x - half + 10, 486, x - half + 10, 508)
        .lineBetween(x + half - 10, 486, x + half - 10, 508);
      g.fillStyle(0x1c2224)
        .fillCircle(x - half + 10, 512, 6)
        .fillCircle(x + half - 10, 512, 6);
    } else if (o.kind === "luggage") {
      g.fillStyle(0x7a2f2f).fillRoundedRect(x - 42, 480, 48, 38, 4);
      g.fillStyle(0x27405f).fillRoundedRect(x - 8, 458, 50, 60, 4);
      g.lineStyle(3, 0xc9b27a).strokeRoundedRect(x + 8, 450, 18, 10, 3);
    } else if (o.kind === "cables") {
      for (let i = 0; i < 4; i++)
        g.lineStyle(5, i % 2 ? 0xd87b2c : 0x181c1e).strokeEllipse(
          x + (i - 1.5) * 9,
          500 - i * 4,
          o.w - i * 8,
          30,
        );
    } else if (o.kind === "shutter") {
      g.fillStyle(0x46545b).fillRect(x - half, 345, o.w, 173);
      g.lineStyle(2, 0x2c363b);
      for (let y = 352; y < 518; y += 10)
        g.lineBetween(x - half, y, x + half, y);
      // Dents spread as the door gives way.
      g.fillStyle(0x1b2226);
      for (let i = 0; i < o.max - o.hp; i++)
        g.fillEllipse(x - 14 + (i % 3) * 14, 380 + i * 22, 16, 9);
    } else if (o.kind === "glass") {
      g.fillStyle(0x9fd0e0, 0.22).fillRect(x - half, 345, o.w, 173);
      g.lineStyle(4, 0x9aa9a6).strokeRect(x - half, 345, o.w, 173);
      g.lineStyle(1, 0xe6f6ff, 0.9);
      for (let i = 0; i < o.max - o.hp; i++) {
        const cy = 400 + i * 30;
        g.lineBetween(x, cy, x - 22, cy - 30)
          .lineBetween(x, cy, x + 20, cy + 26)
          .lineBetween(x, cy, x + 22, cy - 18);
      }
    } else if (o.kind === "turnstile") {
      g.fillStyle(0x5d666a).fillRect(x - 9, 410, 18, 108);
      g.fillStyle(0xd9b24a);
      for (let i = 0; i < 3; i++) g.fillRect(x - half, 440 + i * 14, o.w, 6);
      g.fillStyle(0x1b1f21).fillRect(x - 6, 418, 12, 8);
    } else if (o.kind === "spark") {
      g.lineStyle(4, 0x2a2f31)
        .beginPath()
        .moveTo(x - half, 514);
      for (let i = 1; i <= 6; i++)
        g.lineTo(x - half + (o.w / 6) * i, i % 2 ? 508 : 516);
      g.strokePath();
      g.fillStyle(0xe3bd78).fillTriangle(x - 8, 500, x + 8, 500, x, 486);
      if (o.on) {
        g.fillStyle(0xfff2a0, 0.25).fillEllipse(x, 498, o.w + 30, 60);
        g.lineStyle(3, 0xfff2a0);
        for (let i = -2; i <= 2; i++)
          g.lineBetween(
            x + i * 14,
            510,
            x + i * 14 + 6,
            478 - Math.abs(i) * 6,
          ).lineBetween(
            x + i * 14 + 6,
            478 - Math.abs(i) * 6,
            x + i * 14 - 4,
            466,
          );
      }
    } else if (o.kind === "steam") {
      g.fillStyle(0x2c3337).fillRect(x - half, 510, o.w, 8);
      g.lineStyle(2, 0x5c666a);
      for (let i = -2; i <= 2; i++)
        g.lineBetween(x + i * 10, 510, x + i * 10, 518);
      if (o.on) {
        g.fillStyle(0xe8f1f2, 0.32).fillRect(x - half + 4, 300, o.w - 8, 210);
        g.fillStyle(0xe8f1f2, 0.18).fillEllipse(x, 300, o.w + 40, 70);
      } else g.fillStyle(0xe8f1f2, 0.08).fillEllipse(x, 498, o.w, 20);
    } else if (o.kind === "puddle") {
      g.fillStyle(0x5f8f4a, 0.5).fillEllipse(x, 516, o.w, 18);
      g.fillStyle(0x9fd07a, 0.35).fillEllipse(x - 30, 514, 40, 6);
    }
    if (o.cat !== "smash") return;
    g.fillStyle(0x0a1418, 0.85).fillRect(x - half - 2, 326, o.w + 4, 8);
    g.fillStyle(0xe3bd78).fillRect(
      x - half - 1,
      327,
      (o.w + 2) * (o.hp / o.max),
      6,
    );
  }
  private drawGate() {
    if (!this.gateBar) return;
    this.gateBar
      .clear()
      .fillStyle(0x0a1418, 0.85)
      .fillRect(1075, 280, 120, 12)
      .fillStyle(0xe3bd78)
      .fillRect(1077, 282, 116 * (this.gateHp / this.gateMax), 8);
  }
  // The live node glows; the rest stay dim until their turn.
  private markNode() {
    this.bossNodes.forEach((n, i) =>
      n.setAlpha(i === this.bossIndex ? 1 : i < this.bossIndex ? 0.8 : 0.45),
    );
    // Marker sits on the node; targetX is where the player stands to swing.
    if (this.bossIndex < this.bossNodes.length)
      this.nodes[3].setX(this.bossNodes[this.bossIndex].x);
  }
  get gateOpen() {
    return this.mode !== "defend" || this.gateHp <= 0;
  }
  placeHunters() {
    this.tweens.killTweensOf(this.hunters);
    this.hunters.forEach((enemy, i) => {
      let x =
        this.mode === "hide"
          ? PATROLS[i]
          : this.mode === "defend"
            ? -90 - i * 140
            : LANES[i];
      if (Math.abs(x - this.player.x) < SAFE)
        x = this.player.x + (x < this.player.x ? -SAFE : SAFE);
      enemy
        .setX(x)
        .setAngle(0)
        .setAlpha(1)
        .setFlipX(false)
        .setData({
          down: false,
          stun: 0,
          patrol: this.mode === "hide" ? (i % 2 ? 1 : -1) : 0,
        })
        .setTint(enemy.getData("tint"));
    });
    this.resetScream(true);
  }
  private resetScream(fresh = false) {
    this.scream = "idle";
    this.screamTimer = (fresh ? 900 : 2600) + Math.random() * 1400;
    this.screamer?.setTint(this.screamer.getData("tint"));
  }
  private float(x: number, y: number, text: string, color = "#f3d99b") {
    const label = this.add
      .text(x, y, text, {
        fontFamily: "Oswald, sans-serif",
        fontSize: "26px",
        color,
        stroke: "#05090c",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(9);
    this.tweens.add({
      targets: label,
      y: this.reduced ? y : y - 50,
      alpha: 0,
      delay: 350,
      duration: 750,
      onComplete: () => label.destroy(),
    });
  }
  private tell(key: string, text: string) {
    if (this.told.has(key)) return;
    this.told.add(key);
    this.onHint(text);
  }
  private setDanger(value: number) {
    if (Math.abs(value - this.danger) < 0.02 && value !== 0) return;
    this.danger = value;
    this.onDanger(value);
  }
  get hidden() {
    return (
      this.mode === "hide" &&
      this.jumpY === 0 &&
      !this.moving &&
      SHADOWS.some((x) => Math.abs(this.player.x - x) < SHADOW_WIDTH / 2 - 20)
    );
  }
  jump() {
    if (this.blocked || this.jumpY < 0) return;
    this.vy = -1;
    cue("jump");
    // Jumping at a crate without holding a direction hops over it, so the
    // touch buttons need only ↑. Auto-walk resumes if the target is beyond.
    if (this.keys.size) return;
    const dir = this.player.flipX ? -1 : 1;
    const crate = this.obstacles.find((o) => {
      const ahead = (o.x - this.player.x) * dir;
      return o.cat === "jump" && ahead > 0 && ahead < o.w / 2 + BODY + 40;
    });
    if (!crate) return;
    const landing = crate.x + dir * (crate.w / 2 + BODY + 6),
      beyond = (this.targetX - landing) * dir > 0;
    this.destination = beyond ? this.targetX : landing;
    this.autoAction = beyond;
  }
  pulse() {
    if (this.blocked || !this.escaping || this.pulseCooldown > 0) return;
    this.pulseCooldown = this.failures[2] ? 2200 : 1300;
    this.onPulseReady(false, true);
    cue("pulse");
    if (this.tutorialStep === 1) {
      this.tutorialStep = 2;
      this.onHint(
        "Bagus! Yang roboh bisa dilewati. Space untuk lompat peti, E untuk memukul barikade.",
      );
    }
    let close = false;
    this.hunters.forEach((enemy) => {
      const gap = Math.abs(enemy.x - this.player.x),
        side = enemy.x < this.player.x ? -1 : 1;
      if (gap >= WAVE_RANGE || !enemy.visible) return;
      enemy.setData("patrol", 0).setTintFill(0xffffff);
      this.time.delayedCall(110, () => enemy.setTint(enemy.getData("tint")));
      if (gap < KNOCKDOWN_RANGE) {
        close ||= gap < 100;
        this.knockDown(enemy, side, KNOCKDOWN);
        return;
      }
      const x = this.blockedAt(enemy.x, enemy.x + side * 360, 30);
      enemy.setData("stun", SHOVE_STUN);
      if (this.reduced) enemy.setX(x);
      else
        this.tweens.add({
          targets: enemy,
          x,
          duration: 260,
          ease: "Cubic.easeOut",
        });
    });
    if (this.scream !== "idle") {
      this.resetScream();
      if (
        this.screamer &&
        Math.abs(this.screamer.x - this.player.x) < WAVE_RANGE
      )
        this.float(this.screamer.x, 360, "BATAL!", "#9cffe3");
    }
    if (close) {
      this.stats.closeCalls++;
      cue("close");
      this.float(this.player.x, 320, "NYARIS!", "#9cffe3");
    }
    if (this.mode === "hide")
      this.float(this.player.x, 290, "MEREKA MENDENGAR", "#ff8a6e");
    const ring = this.add
      .circle(this.player.x, 445, 20, 0x9cffe3, 0)
      .setStrokeStyle(3, 0x9cffe3)
      .setDepth(6);
    this.tweens.add({
      targets: ring,
      scale: this.reduced ? 5 : 17,
      alpha: 0,
      duration: this.reduced ? 120 : 500,
      onComplete: () => ring.destroy(),
    });
  }
  // Nearest standing barricade within arm's reach on the given side.
  private wallNear(dir: number) {
    return this.obstacles.find(
      (o) =>
        o.cat === "smash" &&
        (o.x - this.player.x) * dir > 0 &&
        Math.abs(o.x - this.player.x) < o.w / 2 + BODY + 45,
    );
  }
  private swing(dir: number) {
    if (this.hitCooldown > 0) return false;
    this.hitCooldown = 180;
    this.player.setFlipX(dir < 0);
    cue("hit");
    if (!this.reduced) this.cameras.main.shake(70, 0.003);
    return true;
  }
  private smash(o: Obstacle) {
    if (!this.swing(Math.sign(o.x - this.player.x))) return;
    o.hp--;
    if (!this.reduced)
      this.tweens.add({ targets: o.g, x: 4, duration: 40, yoyo: true });
    if (o.hp > 0) {
      this.drawObstacle(o);
      return;
    }
    cue("break");
    this.puff(o.x, 470, 18, 0x8a6a45);
    this.float(o.x, 330, "HANCUR!", "#f3d99b");
    o.g.destroy();
    this.obstacles = this.obstacles.filter((other) => other !== o);
  }
  private smashGate() {
    if (!this.swing(1)) return;
    this.gateHp--;
    this.drawGate();
    if (this.gateHp > 0) return;
    cue("break");
    this.float(1135, 260, "GERBANG TERBUKA", "#9fdbc3");
    this.onHint("Gerbang terbuka! Lari ke keluar.");
    this.gate.setStrokeStyle(3, 0x8bcdb7).setFillStyle(0x8bcdb7, 0.16);
    this.gateBar?.clear();
    this.tweens.add({
      targets: this.hunters,
      alpha: 0,
      duration: 500,
      onComplete: () => this.hunters.forEach((h) => h.setVisible(false)),
    });
    this.hunters.forEach((h) => h.setData("stun", 99999));
    this.onGate();
  }
  private smashNode() {
    const node = this.bossNodes[this.bossIndex];
    if (!this.swing(Math.sign(node.x - this.player.x) || 1)) return;
    const hp = node.getData("hp") - 1;
    node.setData("hp", hp).setScale(1 + (3 - hp) * 0.08);
    if (hp > 0) return;
    this.bossIndex++;
    node.setScale(1).setFillStyle(0x9fdbc3, 0.8).setStrokeStyle(1, 0x9fdbc3);
    this.core.setAlpha(1 - (this.bossIndex / this.bossNodes.length) * 0.8);
    cue("node");
    this.float(
      node.x,
      360,
      `SIMPUL ${this.bossIndex}/${this.bossNodes.length}`,
      "#9fdbc3",
    );
    this.onHint(
      `Simpul ${this.bossIndex}/${this.bossNodes.length}. ${this.bossIndex === this.bossNodes.length ? "Selesai. Keluar sekarang!" : "Hancurkan simpul berikutnya."}`,
    );
    this.markNode();
    if (this.bossIndex === this.bossNodes.length) {
      this.core.setVisible(false);
      this.gate.setStrokeStyle(3, 0x8bcdb7);
      this.labels[3].setText("KELUAR");
      this.nodes[3].setX(1135);
    }
    this.onGate();
  }
  // Clamp a move against obstacles. Smashables stop everyone; low ones stop
  // only a grounded player; hazards and puddles never block.
  private blockedAt(from: number, to: number, half: number, player = false) {
    for (const o of this.obstacles) {
      if (o.cat === "hazard" || o.cat === "slow") continue;
      if (o.cat === "jump" && (!player || this.jumpY < CLEAR)) continue;
      const edge = o.w / 2 + half;
      if (from <= o.x - edge && to > o.x - edge) return o.x - edge;
      if (from >= o.x + edge && to < o.x + edge) return o.x + edge;
    }
    return to;
  }
  private caught() {
    this.player.x =
      this.mode === "defend"
        ? 1000
        : Math.max(
            this.wave === 7 && this.bossIndex > 0
              ? this.bossNodes[this.bossIndex - 1].x
              : 140,
            this.checkpoint,
          );
    this.jumpY = this.vy = 0;
    this.destination = null;
    this.autoAction = false;
    if (this.mode === "defend")
      this.gateHp = Math.min(this.gateMax, this.gateHp + 4);
    this.drawGate();
    this.placeHunters();
    this.escapeGrace = GRACE;
    this.stats.catches++;
    cue("caught");
    this.float(this.player.x, 300, "TERTANGKAP", "#ff8a6e");
    if (!this.reduced) {
      this.cameras.main.shake(180, 0.004);
      this.cameras.main.flash(220, 120, 24, 18);
    }
    if (this.stats.catches >= ASSIST_AFTER && !this.assist) {
      this.assist = true;
      this.float(this.player.x, 250, "ADRENALIN", "#9cffe3");
      this.onHint("Adrenalin naik. Mereka terasa lebih lambat — lari!");
    } else
      this.onHint(
        this.mode === "hide"
          ? "Ketahuan. Diam di bayangan saat mereka lewat — gelombang membangunkan semuanya."
          : this.mode === "defend"
            ? "Tertangkap. Gerbang sempat terkunci lagi — Q untuk gelombang, lalu pukul lagi."
            : this.stats.catches === 1
              ? "Tertangkap. Tunggu mereka dekat, baru Q — yang roboh bisa dilewati."
              : "Tertangkap. Coba lagi — Q gelombang, Space lompat peti.",
      );
  }
  private chase(elapsed: number, time: number) {
    const slow =
      (this.assist ? 0.55 : 1) * (this.tutorialStep === 1 ? 0.25 : 1);
    this.hunters.forEach((enemy, i) => {
      const stun = Math.max(0, enemy.getData("stun") - elapsed);
      enemy.setData("stun", stun);
      const down = enemy.getData("down");
      if (!stun && down) enemy.setData("down", false).setAngle(0).setAlpha(1);
      enemy.y = enemy.getData("down")
        ? 490
        : 455 + (this.reduced ? 0 : Math.sin(time / 90 + i) * 3);
      if (stun) return;
      // A shambling lean while they walk.
      if (!this.reduced) enemy.setAngle(Math.sin(time / 130 + i * 1.7) * 5);
      const patrol = enemy.getData("patrol") as number;
      if (patrol) {
        // Patrols sweep their lane and spot an exposed player ahead of them.
        enemy.x += patrol * elapsed * 0.09;
        enemy.setFlipX(patrol < 0);
        if (enemy.x < 300 || enemy.x > 1060)
          enemy
            .setData("patrol", -patrol)
            .setX(Phaser.Math.Clamp(enemy.x, 300, 1060));
        const ahead = (this.player.x - enemy.x) * patrol;
        if (!this.hidden && ahead > 0 && ahead < 230) {
          enemy.setData("patrol", 0);
          cue("screech");
          this.float(enemy.x, 330, "KETAHUAN!", "#ff8a6e");
        }
        return;
      }
      if (enemy === this.screamer && this.screamStep(elapsed)) return;
      // Hunters climb low obstacles slowly, wade puddles, stop at smashables.
      const over = this.obstacles.find(
        (o) =>
          (o.cat === "jump" || o.cat === "slow") &&
          Math.abs(enemy.x - o.x) < o.w / 2 + 20,
      );
      const step =
        Math.sign(this.player.x - enemy.x) *
        elapsed *
        (0.18 + i * 0.015) *
        slow *
        (over ? (over.cat === "jump" ? 0.35 : 0.5) : 1);
      enemy.x = this.blockedAt(enemy.x, enemy.x + step, 30);
    });
    if (
      !this.hidden &&
      this.hunters.some(
        (enemy) =>
          !enemy.getData("stun") && Math.abs(enemy.x - this.player.x) < 50,
      )
    )
      this.caught();
  }
  // Defence arrives in waves from the street side, with a breather between.
  private defend(elapsed: number) {
    if (this.gateOpen) return;
    this.spawnTimer -= elapsed;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = DEFEND_GAP;
    const standing = this.hunters.filter((h) => h.visible).length,
      size = Math.min(
        (this.failures[5] ? 2 : 1) + this.waves + Number(this.alerted),
        7 - standing,
      );
    this.waves++;
    const tint = this.failures[5] ? 0xc99583 : 0xa5b59a;
    for (let i = 0; i < size; i++)
      this.hunters.push(this.spawn(-90 - i * 150, tint));
    if (size > 0) {
      cue("screech");
      this.float(this.player.x, 270, `GELOMBANG ${this.waves}`, "#ff8a6e");
    }
  }
  repair() {
    this.idle = 0;
    this.hinted = false;
    this.repaired = true;
    this.progress = 2;
    this.renderState();
    this.beginEscape();
    if (!this.reduced) {
      if ([0, 4].includes(this.wave)) {
        this.enemies.forEach((e) => e.setVisible(true).setAlpha(0.65));
        this.tweens.add({
          targets: this.enemies,
          alpha: 0,
          duration: 700,
          onComplete: () => this.enemies.forEach((e) => e.setVisible(false)),
        });
      }
    }
  }
  renderState() {
    this.nodes.forEach((n, i) => {
      n.setVisible(i === this.targetIndex);
      n.setAlpha(1);
      this.indicators[i].setStrokeStyle(
        i === this.targetIndex ? 3 : 1,
        i < this.targetIndex ? 0x8fcdb7 : 0xe3bd78,
      );
    });
    this.effect.clear();
    if (this.progress >= 1) {
      this.effect.fillStyle(0xe3bd78, 0.8).fillCircle(240, 445, 6);
    }
    if (this.progress >= 2) {
      if (this.wave === 0)
        this.enemies.forEach((e, i) => e.setPosition(600 + i * 38, 420));
      if (this.wave === 2) {
        this.effect.lineStyle(2, 0x98d4e3, 0.6);
        for (let x = 460; x < 1040; x += 36)
          this.effect.lineBetween(x, 260, x - 30, 470);
      }
      if (this.wave === 3) {
        this.effect.lineStyle(3, 0xd6ad70, 0.8).strokeRect(690, 300, 140, 195);
      }
      if (this.wave === 7) this.core.setScale(1.15);
    }
    if (!this.repaired) return;
    if (this.failures[this.wave]) {
      this.gate
        .setAlpha(1)
        .setFillStyle(0xbb7054, 0.15)
        .setStrokeStyle(3, 0xbb7054);
      this.effect.fillStyle(0xc06349, 0.14).fillRect(0, 0, 1200, 650);
      return;
    }
    this.gate.setFillStyle(0x8bcdb7, 0.16).setStrokeStyle(3, 0x8bcdb7);
    this.effect.lineStyle(4, 0x96d6b9, 0.85).lineBetween(160, 520, 1165, 520);
    if ([0, 4].includes(this.wave)) {
      this.enemies.forEach((e) => e.setVisible(false));
      this.effect
        .fillStyle(0x9cb4f2, 0.18)
        .fillRect(this.wave === 0 ? 560 : 430, 250, 430, 265);
    }
    if (this.wave === 1) {
      this.props[1].setAlpha(0);
      this.effect.fillStyle(0x87cdb1, 0.6).fillCircle(650, 440, 10);
    }
    if (this.wave === 2) this.shields.clear();
    if (this.wave === 2)
      this.enemies.forEach((e) => e.setTint(0x51675e).setAlpha(0.25));
    if (this.wave === 3)
      this.enemies.forEach((e, i) => {
        if (i !== 1)
          this.effect.lineStyle(3, 0xe0a56e).strokeCircle(e.x, e.y - 55, 32);
      });
    if (this.wave === 5) this.gate.setAlpha(1);
    if (this.wave === 6) {
      this.core.setAlpha(0.35);
      this.effect.lineStyle(3, 0x9be5c2).strokeCircle(940, 450, 50);
    }
    if (this.wave === 7) {
      this.backdrop.setTint(0x7e929c);
      this.core.setVisible(false);
      this.enemies.forEach((e) => e.setVisible(false));
      this.effect.fillStyle(0xd0f0c0, 0.12).fillRect(650, 100, 500, 410);
    }
  }
  // Returns true while the screamer's own movement replaces the normal chase.
  private screamStep(elapsed: number) {
    const s = this.screamer!;
    this.screamTimer -= elapsed;
    if (this.scream === "idle") {
      // No surprise lunges while the tutorial has slowed time.
      if (
        this.screamTimer > 0 ||
        this.tutorialStep === 1 ||
        Math.abs(s.x - this.player.x) > 560
      )
        return false;
      this.scream = "warn";
      this.screamTimer = 700;
      s.setTint(0xff4a2e);
      cue("screech");
      this.float(s.x, 330, "!", "#ff8a6e");
      return true;
    }
    if (this.scream === "warn") {
      if (!this.reduced) s.x += Math.sin(this.screamTimer / 18) * 2;
      if (this.screamTimer > 0) return true;
      this.scream = "lunge";
      this.screamTimer = 480;
      this.lungeDir = Math.sign(this.player.x - s.x) || 1;
      return true;
    }
    const lunge =
      this.lungeDir *
      elapsed *
      (this.assist ? 0.45 : 0.75) *
      (this.tutorialStep === 1 ? 0.25 : 1);
    s.x = this.blockedAt(s.x, s.x + lunge, 30);
    if (this.screamTimer <= 0) this.resetScream();
    return true;
  }
  private tutorialCheck() {
    if (!this.tutorial || this.mode !== "run" || this.tutorialStep) return;
    const near = this.hunters.some(
      (h) => !h.getData("stun") && Math.abs(h.x - this.player.x) < 260,
    );
    if (!near) return;
    this.tutorialStep = 1;
    this.tutorial = false;
    this.onTutorialDone();
    this.float(this.player.x, 290, "TEKAN Q — GELOMBANG!", "#f3d99b");
    this.onHint(
      "Waktu melambat. Tekan Q (atau tombol Gelombang) saat mereka dekat!",
    );
  }
  private knockDown(
    enemy: Phaser.GameObjects.Image,
    side: number,
    stun: number,
  ) {
    enemy.setData({ stun, down: true, patrol: 0 }).setAlpha(0.6);
    this.puff(enemy.x, 512, 10, 0x8a8f86);
    if (this.reduced) enemy.setAngle(side * 80);
    else this.tweens.add({ targets: enemy, angle: side * 80, duration: 160 });
  }
  private puff(x: number, y: number, count: number, tint: number) {
    if (this.reduced) return;
    this.dust ??= this.add
      .particles(0, 0, "mote", {
        emitting: false,
        speed: { min: 40, max: 160 },
        angle: { min: 200, max: 340 },
        lifespan: 550,
        scale: { start: 1.1, end: 0 },
        alpha: { start: 0.7, end: 0 },
      })
      .setDepth(7);
    this.dust.setParticleTint(tint);
    this.dust.explode(count, x, y);
  }
  // Each location breathes: flickering tubes, drips, dust, rising spores.
  private ambience(background: number) {
    if (this.reduced) return;
    const motes = (
      config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
    ) => this.add.particles(0, 0, "mote", config).setDepth(3);
    if (background === 0) {
      const flicker = this.add
        .rectangle(600, 325, 1200, 650, 0x000000, 0)
        .setDepth(8);
      this.time.addEvent({
        delay: 140,
        loop: true,
        callback: () =>
          flicker.setAlpha(
            Math.random() < 0.12 ? 0.18 + Math.random() * 0.2 : 0,
          ),
      });
      motes({
        x: { min: 0, max: 1200 },
        y: { min: 120, max: 460 },
        speedX: { min: -8, max: 8 },
        speedY: { min: -4, max: 6 },
        lifespan: 6000,
        frequency: 260,
        scale: { min: 0.15, max: 0.35 },
        alpha: { start: 0.35, end: 0 },
        tint: 0xf3d99b,
      });
    } else if (background === 1)
      motes({
        x: { min: 80, max: 1120 },
        y: 70,
        speedY: { min: 260, max: 340 },
        lifespan: 1500,
        frequency: 380,
        scale: { min: 0.25, max: 0.4 },
        alpha: { start: 0.7, end: 0.2 },
        tint: 0x9fd0e0,
      });
    else if (background === 2)
      motes({
        x: { min: 0, max: 1200 },
        y: { min: 150, max: 480 },
        speedX: { min: 10, max: 30 },
        speedY: { min: -6, max: 6 },
        lifespan: 7000,
        frequency: 180,
        scale: { min: 0.15, max: 0.3 },
        alpha: { start: 0.4, end: 0 },
        tint: 0xe3bd78,
      });
    else
      motes({
        x: { min: 600, max: 1200 },
        y: 520,
        speedY: { min: -60, max: -25 },
        speedX: { min: -10, max: 10 },
        lifespan: 5000,
        frequency: 140,
        scale: { start: 0.35, end: 0.05 },
        alpha: { start: 0.55, end: 0 },
        tint: 0xc2ef9c,
        blendMode: "ADD",
      });
  }
  // Final boss: Sang Penyiar marks a strip of floor red, then sweeps it with a
  // tentacle. Jump clear or get thrown back; hunters in the strip go down too.
  private bossSweep(elapsed: number) {
    const sw = this.sweep!;
    sw.timer -= elapsed * (this.tutorialStep === 1 ? 0.25 : 1);
    if (sw.timer > 0) return;
    if (sw.phase === "idle") {
      sw.phase = "warn";
      sw.timer = 850;
      sw.from = Phaser.Math.Clamp(this.player.x - 190, 60, 1140);
      sw.to = Phaser.Math.Clamp(this.player.x + 190, 60, 1140);
      sw.g
        .clear()
        .fillStyle(0xff3b24, 0.22)
        .fillRect(sw.from, 500, sw.to - sw.from, 22)
        .lineStyle(2, 0xff3b24, 0.8)
        .strokeRect(sw.from, 500, sw.to - sw.from, 22);
      cue("screech");
      this.tell(
        "sweep",
        "Garis merah di lantai: tentakel akan menyapu. Lompat!",
      );
      return;
    }
    if (sw.phase === "warn") {
      sw.phase = "strike";
      sw.timer = 260;
      sw.g
        .clear()
        .fillStyle(0x1d3a22, 0.95)
        .fillRoundedRect(sw.from, 470, sw.to - sw.from, 44, 20)
        .fillStyle(0xc2ef9c, 0.5)
        .fillRoundedRect(sw.from + 10, 478, sw.to - sw.from - 20, 10, 5);
      cue("break");
      if (!this.reduced) this.cameras.main.shake(160, 0.006);
      const inStrip = (x: number) => x > sw.from - 10 && x < sw.to + 10;
      if (inStrip(this.player.x) && this.jumpY > CLEAR) {
        const side = this.player.x < (sw.from + sw.to) / 2 ? -1 : 1;
        this.player.x = Phaser.Math.Clamp(this.player.x + side * 170, 75, 1150);
        this.stagger = 700;
        this.destination = null;
        this.autoAction = false;
        this.stats.catches++;
        cue("caught");
        this.float(this.player.x, 300, "TERHEMPAS", "#ff8a6e");
      } else if (inStrip(this.player.x)) {
        this.stats.closeCalls++;
        this.float(this.player.x, 300, "NYARIS!", "#9cffe3");
      }
      for (const h of this.hunters)
        if (h.visible && !h.getData("down") && inStrip(h.x))
          this.knockDown(h, h.x < this.player.x ? -1 : 1, 2000);
      return;
    }
    sw.phase = "idle";
    sw.timer = 3400 + Math.random() * 1400;
    sw.g.clear();
  }
  // Sparks and steam cycle; touching one while live throws you back. Hunters
  // caught in them are stunned too, so timing a chase through one pays off.
  private hazards(elapsed: number) {
    this.clock += elapsed;
    for (const o of this.obstacles) {
      if (o.cat === "slow" && Math.abs(this.player.x - o.x) < o.w / 2)
        this.tell(o.kind, "Genangan memperlambat — mereka juga.");
      if (o.cat !== "hazard") continue;
      const on = (this.clock + o.x * 3) % HAZARD_PERIOD < HAZARD_ON;
      if (on !== o.on) {
        o.on = on;
        this.drawObstacle(o);
        if (on && Math.abs(o.x - this.player.x) < 500)
          cue(o.kind === "spark" ? "zap" : "steam");
      }
      if (Math.abs(o.x - this.player.x) < 220)
        this.tell(
          o.kind,
          o.kind === "spark"
            ? "Kabel memercik berkala. Lewati saat padam, atau lompati saat menyala."
            : "Uap panas menyembur berkala dan terlalu tinggi untuk dilompati. Tunggu berhenti.",
        );
      if (!on) continue;
      const reach = o.w / 2 + BODY - 8,
        grounded = o.kind === "steam" || this.jumpY > CLEAR;
      if (!this.stagger && grounded && Math.abs(this.player.x - o.x) < reach) {
        const side = this.player.x < o.x ? -1 : 1;
        this.player.x = o.x + side * (reach + 50);
        this.stagger = 500;
        this.destination = null;
        this.autoAction = false;
        cue(o.kind === "spark" ? "zap" : "steam");
        this.float(
          this.player.x,
          320,
          o.kind === "spark" ? "ZAP!" : "PANAS!",
          "#fff2a0",
        );
        if (!this.reduced) this.cameras.main.shake(120, 0.004);
      }
      for (const h of this.hunters)
        if (!h.getData("stun") && Math.abs(h.x - o.x) < o.w / 2 + 10) {
          h.setData("stun", 1400).setTintFill(0xfff2a0);
          this.time.delayedCall(140, () => h.setTint(h.getData("tint")));
        }
    }
  }
  // Freezer alarm: a red beacon over the scene while the siren runs.
  setAlarm(on: boolean) {
    if (!this.player) return;
    if (!on) {
      this.alarmFx.forEach((fx) => fx.destroy());
      this.alarmFx = [];
      return;
    }
    if (this.alarmFx.length) return;
    const wash = this.add
      .rectangle(600, 325, 1200, 650, 0xc0301e, 0)
      .setDepth(8);
    const lamp = this.add.circle(323, 228, 46, 0xff3b24, 0.5).setDepth(8);
    this.alarmFx = [wash, lamp];
    if (this.reduced) wash.setAlpha(0.06);
    else
      [
        [wash, 0.12],
        [lamp, 0.7],
      ].forEach(([target, to]) =>
        this.tweens.add({
          targets: target,
          alpha: { from: 0, to },
          duration: 600,
          yoyo: true,
          repeat: -1,
        }),
      );
  }
  update(time: number, delta: number) {
    if (!this.player || this.blocked) return;
    const elapsed = Math.min(delta, 40);
    this.hitCooldown = Math.max(0, this.hitCooldown - elapsed);
    if (this.pulseCooldown > 0) {
      this.pulseCooldown = Math.max(0, this.pulseCooldown - elapsed);
      if (!this.pulseCooldown) this.onPulseReady(true, this.escaping);
    }
    if (this.vy || this.jumpY) {
      this.vy += 0.0034 * elapsed;
      this.jumpY = Math.min(0, this.jumpY + this.vy * elapsed);
      if (!this.jumpY) {
        this.vy = 0;
        // Never land inside a low obstacle: step off on the facing side.
        const crate = this.obstacles.find(
          (o) =>
            o.cat === "jump" && Math.abs(this.player.x - o.x) < o.w / 2 + BODY,
        );
        if (crate)
          this.player.x =
            crate.x + (crate.w / 2 + BODY) * (this.player.flipX ? -1 : 1);
      }
    }
    if (this.escaping) {
      this.stats.time += elapsed;
      this.escapeGrace = Math.max(0, this.escapeGrace - elapsed);
      this.hazards(elapsed);
      for (const [kind, x] of OBSTACLES[this.wave]) {
        const past = x + KINDS[kind].w / 2 + BODY + 30;
        if (this.mode === "run" && this.player.x > past + 10)
          this.checkpoint = Math.max(this.checkpoint, past);
      }
      if (this.escapeGrace === 0) {
        this.tutorialCheck();
        this.chase(elapsed, time);
        if (this.mode === "defend") this.defend(elapsed);
        if (this.sweep && this.bossIndex < this.bossNodes.length)
          this.bossSweep(elapsed);
      }
      const threats = this.hunters.filter(
        (h) => h.visible && !h.getData("stun") && !h.getData("patrol"),
      );
      const nearest = Math.min(
        ...threats.map((enemy) => Math.abs(enemy.x - this.player.x)),
      );
      this.setDanger(Phaser.Math.Clamp(1 - (nearest - 50) / 450, 0, 1));
      heartbeat(this.danger);
    }
    this.labels.forEach((label, i) =>
      label.setVisible(
        i === this.targetIndex && Math.abs(this.player.x - this.targetX) < 220,
      ),
    );
    const keyboard =
      Number(this.keys.has("d") || this.keys.has("arrowright")) -
      Number(this.keys.has("a") || this.keys.has("arrowleft"));
    if (keyboard) {
      this.destination = null;
      this.autoAction = false;
    }
    this.stagger = Math.max(0, this.stagger - elapsed);
    const dir = this.stagger
      ? 0
      : keyboard ||
        (this.destination !== null
          ? Math.sign(this.destination - this.player.x)
          : 0);
    this.moving = dir !== 0;
    if (dir) this.idle = 0;
    else this.idle += elapsed;
    if (this.idle > 18000 && !this.hinted) {
      this.hinted = true;
      this.onIdle();
    }
    const wading = this.obstacles.some(
        (o) => o.cat === "slow" && Math.abs(this.player.x - o.x) < o.w / 2,
      ),
      amount = elapsed * 0.38 * (wading ? 0.5 : 1),
      arriving =
        this.destination !== null &&
        Math.abs(this.player.x - this.destination) <= amount;
    const wanted = arriving
      ? this.destination!
      : Phaser.Math.Clamp(this.player.x + dir * amount, 75, 1150);
    const next = this.blockedAt(this.player.x, wanted, BODY, true);
    if (next !== wanted) {
      // Bumped an obstacle: stop auto-walk and say what it needs.
      const o = this.obstacles.find(
        (o) => Math.abs(o.x - next) <= o.w / 2 + BODY + 1,
      );
      this.destination = null;
      this.autoAction = false;
      if (o?.cat === "jump")
        this.tell(
          o.kind,
          `${KINDS[o.kind].name} menghalangi. Space untuk melompat.`,
        );
      else if (o)
        this.tell(
          o.kind,
          `${KINDS[o.kind].name}! Tekan E berulang untuk menghancurkannya. Bisa ada yang menunggu di baliknya — siapkan Q.`,
        );
    }
    this.player.x = next;
    if (arriving && next === wanted) {
      this.destination = null;
      const action = this.autoAction;
      this.autoAction = false;
      if (action) this.interact();
    }
    this.player.setFrame(
      this.jumpY ? 1 : dir ? 1 + (Math.floor(time / 150) % 2) : 0,
    );
    if (dir) this.player.setFlipX(dir < 0);
    this.player.y =
      423 +
      this.jumpY +
      (dir && !this.jumpY && !this.reduced ? Math.sin(time / 100) * 1.5 : 0);
    this.player.setAlpha(this.hidden ? 0.45 : 1);
    (this.children.getByName("shadow") as Phaser.GameObjects.Ellipse)
      .setX(this.player.x)
      .setScale(1 + this.jumpY / 260);
  }
}
