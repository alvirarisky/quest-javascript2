import Phaser from "phaser";
import type { Entity } from "../shared/challenges";
import { chapters, names, type Character, type Line } from "./gameplay/story";
import {
  actor,
  pose,
  createFrames,
  drawWorld,
  drawEscapeWorld,
  characterRow,
  type Actor,
} from "./gameplay/art";
import {
  WORLD,
  blocked,
  move,
  distance,
  lineClear,
  findPath,
  makeObstacles,
  director,
  weapons,
  type Obstacle,
  type Point,
  type WeaponId,
} from "./gameplay/systems";
import { keys, pauseReasons, settings } from "./gameplay/input";
import { sfx, sound } from "./gameplay/audio";
export { keys, pauseReasons, settings, sound };
type Enemy = Actor & {
  hp: number;
  maxHp: number;
  type: number;
  age: number;
  attack: number;
  path: Point[];
  nav: number;
  hit: number;
  charge: Point | null;
  chargeTime: number;
};
type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  friendly: boolean;
  g: Phaser.GameObjects.Rectangle;
};
type Prop = {
  x: number;
  y: number;
  hp: number;
  kind: "barrel" | "alarm";
  g: Phaser.GameObjects.Container;
  active: number;
};
type Pickup = {
  x: number;
  y: number;
  kind: "health" | "ammo";
  g: Phaser.GameObjects.Container;
};
export class Arena extends Phaser.Scene {
  player!: Actor;
  buddy!: Actor;
  character: Character = "noah";
  wave = 0;
  phase = "idle";
  hp = 100;
  kills = 0;
  quota = 18;
  clock = 0;
  dash = 0;
  invulnerable = 0;
  fire = 0;
  melee = 0;
  reload = 0;
  weapon: WeaponId = "pistol";
  secondary: WeaponId = "shotgun";
  magazines = { pistol: 12, shotgun: 6, smg: 28 };
  reserves = { pistol: Infinity, shotgun: 36, smg: 112 };
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  obstacles: Obstacle[] = [];
  props: Prop[] = [];
  pickups: Pickup[] = [];
  scenery: Phaser.GameObjects.GameObject[] = [];
  visuals = new Map<string, Phaser.GameObjects.Container>();
  marks: Phaser.GameObjects.Container[] = [];
  fx = new Set<Phaser.GameObjects.GameObject>();
  corpses: Phaser.GameObjects.Image[] = [];
  taskIndex = 0;
  taskProgress = 0;
  spawnTimer = 1;
  buddyShot = 0;
  buddyPath: Point[] = [];
  buddyNav = 0;
  buddyRecover = 0;
  buddyStuck = 0;
  middleSaid = false;
  bossSpawned = false;
  escapeCheckpoint = false;
  captionClock = 0;
  footstep = 0;
  cursor!: Phaser.GameObjects.Graphics;
  interaction = "";
  combatLabel = "";
  onReady = () => {};
  onDeath = () => {};
  onHud = (_: Arena) => {};
  onAction = (_: string) => {};
  onSwitch = () => {};
  onOpenCode = () => {};
  onEscape = () => {};
  onLine = (_: Line) => {};
  onChapterReady = () => {};
  shotPending = false;
  dashPending = false;
  constructor() {
    super("arena");
  }
  preload() {
    this.load.image("people", "/art/survivors-infected.png");
    this.load.image("props", "/art/city-props.png");
  }
  create() {
    createFrames(this);
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!pauseReasons.size && pointer.downElement === this.game.canvas)
        this.shotPending = true;
    });
    this.cursor = this.add.graphics().setScrollFactor(0).setDepth(10000);
    this.game.canvas.setAttribute("tabindex", "0");
    this.game.canvas.setAttribute(
      "aria-label",
      "Arena Dead Signal. WASD bergerak, mouse membidik.",
    );
    this.begin(0, true);
    this.phase = "idle";
    this.onChapterReady();
  }
  clear() {
    this.tweens.killAll();
    for (const list of [
      this.scenery,
      this.corpses,
      Array.from(this.fx),
      this.marks,
    ])
      list.forEach((o) => o.destroy());
    this.scenery = [];
    this.corpses = [];
    this.fx.clear();
    this.marks = [];
    this.enemies.forEach((e) => e.g.destroy());
    this.enemies = [];
    this.bullets.forEach((b) => b.g.destroy());
    this.bullets = [];
    this.props.forEach((p) => p.g.destroy());
    this.props = [];
    this.pickups.forEach((p) => p.g.destroy());
    this.pickups = [];
    this.visuals.forEach((v) => v.destroy());
    this.visuals.clear();
    this.player?.g.destroy();
    this.buddy?.g.destroy();
    this.cameras.main.stopFollow();
  }
  begin(wave: number, tutorial = false) {
    this.clear();
    this.shotPending = false;
    this.dashPending = false;
    this.wave = wave;
    this.phase = tutorial ? "tutorial" : "combat";
    this.hp = 100;
    this.kills = 0;
    this.quota = chapters[wave].quota;
    this.clock = 0;
    this.dash = 0;
    this.invulnerable = 1.5;
    this.fire = 0;
    this.melee = 0;
    this.reload = 0;
    this.weapon = "pistol";
    this.secondary = wave % 2 === 0 ? "shotgun" : "smg";
    this.magazines = { pistol: 12, shotgun: 6, smg: 28 };
    this.reserves = { pistol: Infinity, shotgun: 36, smg: 112 };
    this.taskIndex = 0;
    this.taskProgress = 0;
    this.spawnTimer = 1.8;
    this.buddyShot = 0;
    this.buddyPath = [];
    this.buddyNav = 0;
    this.buddyRecover = 0;
    this.buddyStuck = 0;
    this.middleSaid = false;
    this.bossSpawned = false;
    this.escapeCheckpoint = false;
    this.obstacles = makeObstacles(wave);
    this.scenery = drawWorld(this, wave, this.obstacles);
    this.player = actor(
      this,
      190,
      580,
      characterRow(this.character),
      names[this.character],
      0x98dad0,
    );
    this.buddy = actor(
      this,
      140,
      650,
      characterRow(this.character === "noah" ? "allie" : "noah"),
      this.character === "noah" ? "Allie" : "Noah",
      0xe7bb78,
    );
    this.cameras.main.panEffect.reset();
    this.cameras.main.centerOn(190, 580);
    this.cameras.main
      .setBounds(0, 0, WORLD.width, WORLD.height)
      .startFollow(this.player.g, true, 0.12, 0.12)
      .setZoom(1);
    this.addProps();
    this.drawTaskMarkers();
    this.onHud(this);
  }
  private text(
    x: number,
    y: number,
    text: string,
    color = "#d4d8ba",
    size = 11,
  ) {
    return this.add
      .text(x, y, text, {
        fontFamily: "monospace",
        fontSize: size + "px",
        color,
        align: "center",
      })
      .setOrigin(0.5);
  }
  drawTaskMarkers() {
    this.marks.forEach((m) => m.destroy());
    this.marks = [];
    chapters[this.wave].tasks.forEach((t, i) => {
      const ring = this.add
        .circle(0, 0, 28, 0xc7b378, 0.08)
        .setStrokeStyle(2, 0xd1b66e, 0.8);
      const icon = this.text(
        0,
        -2,
        t.kind === "pickup" ? "+" : "E",
        "#e9cb83",
        22,
      );
      const label = this.text(0, 47, t.label);
      this.marks.push(
        this.add
          .container(t.x, t.y, [ring, icon, label])
          .setDepth(20)
          .setAlpha(i === this.taskIndex ? 1 : 0.25),
      );
    });
    const terminal = this.add.container(2080, 590, [
      this.add.rectangle(0, 0, 48, 64, 0x192e32).setStrokeStyle(2, 0x80b5a6),
      this.add.rectangle(0, -8, 35, 25, 0x589e8a),
      this.text(0, 54, "TERMINAL CONTAINMENT", "#91cdb6"),
    ]);
    this.marks.push(terminal.setDepth(25));
  }
  addProps() {
    for (const [x, y, kind] of [
      [550, 420, "barrel"],
      [1180, 430, "barrel"],
      [1580, 800, "barrel"],
      [1010, 815, "alarm"],
    ] as const) {
      const shape =
        kind === "barrel"
          ? this.add.image(0, -5, "props", "4").setDisplaySize(30, 43)
          : this.add
              .rectangle(0, 0, 36, 22, 0x4a5c60)
              .setStrokeStyle(1, 0xd5b878);
      const label = this.text(
        0,
        -27,
        kind === "barrel" ? "⚠" : "ALARM",
        "#bba683",
        10,
      );
      const g = this.add.container(x, y, [shape, label]).setDepth(y + 80);
      this.props.push({
        x,
        y,
        kind,
        hp: kind === "barrel" ? 3 : 1,
        g,
        active: 0,
      });
    }
  }
  burst(x: number, y: number, color = 0xe7b06c, count = 8) {
    if (settings.reduced) count = 3;
    for (let i = 0; i < count && this.fx.size < 100; i++) {
      const p = this.add
        .rectangle(x, y, Phaser.Math.Between(2, 5), 3, color)
        .setDepth(3000);
      this.fx.add(p);
      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-45, 45),
        y: y + Phaser.Math.Between(-45, 45),
        alpha: 0,
        duration: Phaser.Math.Between(180, 380),
        onComplete: () => {
          this.fx.delete(p);
          p.destroy();
        },
      });
    }
  }
  pulseRing(x: number, y: number, radius: number, color: number) {
    const r = this.add
      .circle(x, y, 8)
      .setStrokeStyle(3, color, 0.8)
      .setDepth(2900);
    this.fx.add(r);
    this.tweens.add({
      targets: r,
      radius,
      alpha: 0,
      duration: settings.reduced ? 200 : 450,
      onComplete: () => {
        r.destroy();
        this.fx.delete(r);
      },
    });
  }
  addEnemy(type: number, force?: Point) {
    if (this.enemies.length >= 25) return false;
    let p: Point | undefined = force;
    if (!p) {
      for (let i = 0; i < 35; i++) {
        const a = Math.random() * Math.PI * 2,
          d = 400 + Math.random() * 180;
        const candidate = {
          x: this.player.x + Math.cos(a) * d,
          y: this.player.y + Math.sin(a) * d,
        };
        if (
          !blocked(candidate.x, candidate.y, this.obstacles, 32) &&
          distance(candidate, this.player) > 330
        ) {
          p = candidate;
          break;
        }
      }
    }
    if (!p) return false;
    const row = type >= 3 ? 3 : 2;
    const a = actor(this, p.x, p.y, row, "", type === 2 ? 0xcfc980 : 0x91665d);
    if (type === 1) a.body.setTint(0xaac9c0);
    if (type === 2) {
      a.body.setTint(0xd4bd92);
      a.ring.setStrokeStyle(2, 0xcba663);
    }
    if (type === 4) {
      a.body.setDisplaySize(165, 165);
      a.g.add(this.text(0, -110, "THE BREAKWATER", "#e1ae84", 15));
    }
    const hp = [5, 3.5, 8, 20, 260][type];
    this.enemies.push({
      ...a,
      hp,
      maxHp: hp,
      type,
      age: -0.9,
      attack: 2.5,
      path: [],
      nav: 0,
      hit: 0,
      charge: null,
      chargeTime: 0,
    });
    a.g.setAlpha(0.25);
    this.pulseRing(p.x, p.y, 38, 0xb58a65);
    return true;
  }
  private fireBullet(
    from: Point,
    angle: number,
    damage: number,
    life = 1.1,
    friendly = false,
  ) {
    if (this.bullets.length >= 160) return;
    const speed = 800;
    const x = from.x + Math.cos(angle) * 28,
      y = from.y - 9 + Math.sin(angle) * 28;
    this.bullets.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      damage,
      friendly,
      g: this.add
        .rectangle(x, y, 15, 3, friendly ? 0x9fd6c7 : 0xffd593)
        .setRotation(angle)
        .setDepth(2500),
    });
  }
  command(key: string) {
    if (
      pauseReasons.size ||
      !["combat", "tutorial", "escape", "code", "switch"].includes(this.phase)
    )
      return;
    if (key === "1") this.switchWeapon(1);
    if (key === "2") this.switchWeapon(2);
    if (key === "r") this.reloadWeapon();
    if (key === "q") this.shove();
    if (key === " ") this.dashPending = true;
  }
  reloadWeapon() {
    const w = weapons[this.weapon];
    if (
      this.reload > 0 ||
      this.magazines[this.weapon] === w.mag ||
      this.reserves[this.weapon] === 0
    )
      return;
    this.reload = w.reload;
    sfx("reload");
  }
  switchWeapon(slot: number) {
    if (this.reload > 0) return;
    this.weapon = slot === 1 ? "pistol" : this.secondary;
    sfx("reload");
  }
  private shoot() {
    if (this.fire > 0 || this.reload > 0) return;
    if (this.magazines[this.weapon] === 0) {
      this.reloadWeapon();
      return;
    }
    const w = weapons[this.weapon];
    this.magazines[this.weapon]--;
    this.fire = w.rate;
    for (let n = 0; n < w.pellets; n++) {
      const spread =
        w.pellets === 1
          ? (Math.random() - 0.5) * w.spread
          : (n / (w.pellets - 1) - 0.5) * w.spread * 2;
      this.fireBullet(
        this.player,
        this.player.angle + spread,
        w.damage,
        this.weapon === "shotgun" ? 0.55 : 1.1,
      );
    }
    const x = this.player.x + Math.cos(this.player.angle) * 40,
      y = this.player.y - 8 + Math.sin(this.player.angle) * 30;
    this.burst(x, y, 0xffdca0, 4);
    if (!settings.reduced && this.weapon === "shotgun")
      this.cameras.main.shake(70, 0.0016);
    sfx(this.weapon);
    this.onAction("shoot");
  }
  private shove() {
    if (this.melee > 0) return;
    this.melee = 1.1;
    this.pulseRing(this.player.x, this.player.y, 85, 0xc9c8a0);
    for (const e of this.enemies) {
      if (distance(e, this.player) < 105) {
        this.hitEnemy(e, 1.5);
        const a = Math.atan2(e.y - this.player.y, e.x - this.player.x);
        const p = move(
          e,
          Math.cos(a) * 55,
          Math.sin(a) * 55,
          this.obstacles,
          22,
        );
        e.x = p.x;
        e.y = p.y;
        e.attack = Math.max(e.attack, 0.8);
      }
    }
    sfx("hit");
  }
  private hitEnemy(e: Enemy, damage: number) {
    if (e.hp <= 0 || e.age < 0) return;
    e.hp -= damage;
    e.hit = 0.12;
    this.burst(e.x, e.y - 12, settings.gore ? 0x97483d : 0xa3a889, 5);
    if (e.hp <= 0) {
      this.kills++;
      if (settings.gore) {
        const corpse = this.add
          .image(e.x, e.y, "people", e.body.frame.name)
          .setDisplaySize(e.type === 4 ? 130 : 66, e.type === 4 ? 130 : 66)
          .setAngle(90 + Math.random() * 60)
          .setTint(0x56574b)
          .setAlpha(0.45)
          .setDepth(10);
        this.corpses.push(corpse);
        if (this.corpses.length > 30) this.corpses.shift()?.destroy();
      }
      e.g.destroy();
      if (Math.random() < 0.32 || e.type === 3)
        this.drop(e.x, e.y, Math.random() < 0.45 ? "health" : "ammo");
      sfx("hit");
    }
  }
  drop(x: number, y: number, kind: "health" | "ammo") {
    if (this.pickups.length >= 18) return;
    const color = kind === "health" ? 0xa9c6a0 : 0xd6bb7c;
    const g = this.add
      .container(x, y, [
        this.add.rectangle(0, 0, 22, 18, 0x243331).setStrokeStyle(1, color),
        this.text(
          0,
          0,
          kind === "health" ? "+" : "|||",
          kind === "health" ? "#c9e0b3" : "#e8d393",
          18,
        ),
      ])
      .setDepth(40);
    this.pickups.push({ x, y, kind, g });
  }
  damage(amount: number) {
    if (this.invulnerable > 0 || this.phase === "dead") return;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnerable = 0.7;
    sfx("hit");
    this.burst(this.player.x, this.player.y, 0xca7760);
    if (!settings.reduced) this.cameras.main.shake(90, 0.002);
    if (this.hp === 0) {
      this.phase = "dead";
      keys.clear();
      this.onDeath();
    }
  }
  interact() {
    if (pauseReasons.size) return;
    if (this.phase === "code") {
      if (distance(this.player, { x: 2080, y: 590 }) < 260) this.onOpenCode();
      else
        this.onLine({
          who: this.character === "allie" ? "Allie" : "Noah",
          text: "Terminalnya di ujung jalan. Ikuti penanda cyan.",
        });
    } else if (this.phase === "switch") {
      this.onSwitch();
    } else if (this.phase === "tutorial") {
      this.onOpenCode();
    }
  }
  startEscape() {
    this.phase = "escape";
    this.escapeCheckpoint = true;
    this.hp = Math.max(this.hp, 70);
    this.scenery.forEach((o) => o.destroy());
    this.scenery = drawEscapeWorld(this);
    this.marks.forEach((o) => o.destroy());
    this.marks = [];
    this.props.forEach((p) => p.g.destroy());
    this.props = [];
    this.pickups.forEach((p) => p.g.destroy());
    this.pickups = [];
    this.corpses.forEach((p) => p.destroy());
    this.corpses = [];
    this.enemies.forEach((e) => e.g.destroy());
    this.enemies = [];
    this.obstacles = [
      { x: 0, y: 0, w: 2560, h: 440, kind: "building" },
      { x: 0, y: 800, w: 2560, h: 320, kind: "building" },
    ];
    this.player.x = 190;
    this.player.y = 620;
    this.buddy.x = 130;
    this.buddy.y = 660;
    this.buddyPath = [];
    this.buddyNav = 0;
    this.spawnTimer = 1;
    this.invulnerable = 2;
    this.cameras.main.panEffect.reset();
    this.cameras.main.centerOn(190, 620);
    this.followPlayer();
    this.visuals.forEach((v) => v.destroy());
    this.visuals.clear();
    this.bullets.forEach((b) => b.g.destroy());
    this.bullets = [];
    this.onLine({
      who: "Allie",
      text: "Feri di ujung dermaga! Terus bergerak ke kanan. Jangan tunggu mereka.",
    });
    this.pulseRing(2440, 610, 70, 0xc8dba9);
  }
  respawn() {
    if (this.escapeCheckpoint) {
      this.enemies.forEach((e) => e.g.destroy());
      this.enemies = [];
      this.player.x = 190;
      this.player.y = 620;
      this.buddy.x = 130;
      this.buddy.y = 650;
      this.hp = 100;
      this.invulnerable = 2;
      this.spawnTimer = 2;
      this.phase = "escape";
    } else this.begin(this.wave);
  }
  private updateTasks(dt: number) {
    const t = chapters[this.wave].tasks[this.taskIndex];
    this.interaction = "";
    if (!t) return;
    if (distance(this.player, t) < 85) {
      this.interaction =
        t.seconds > 0
          ? `TAHAN E · ${t.label} ${Math.round((this.taskProgress / Math.max(t.seconds, 0.1)) * 100)}%`
          : `E · ${t.label}`;
      if (keys.has("e")) {
        this.taskProgress += dt;
        if (this.taskProgress >= t.seconds) {
          this.taskIndex++;
          this.taskProgress = 0;
          this.marks.forEach((m, i) => {
            if (i < chapters[this.wave].tasks.length)
              m.setAlpha(
                i === this.taskIndex ? 1 : i < this.taskIndex ? 0.12 : 0.25,
              );
          });
          sfx("pickup");
          this.pulseRing(t.x, t.y, 65, 0xa5d6bc);
          this.drop(t.x + 30, t.y, "ammo");
          if (this.taskIndex === 1 && !this.middleSaid) {
            this.middleSaid = true;
            chapters[this.wave].middle.forEach((l) => this.onLine(l));
          }
        }
      } else this.taskProgress = Math.max(0, this.taskProgress - dt * 0.4);
    }
  }
  private navigate(
    a: Actor,
    target: Point,
    speed: number,
    dt: number,
    path: Point[],
  ) {
    let goal = target;
    if (!lineClear(a, target, this.obstacles, 22)) {
      while (path.length && distance(a, path[0]) < 18) path.shift();
      if (path.length) goal = path[0];
      else return false;
    }
    const d = distance(a, goal);
    if (d < 5) return false;
    const p = move(
      a,
      ((goal.x - a.x) / d) * speed * dt,
      ((goal.y - a.y) / d) * speed * dt,
      this.obstacles,
      20,
    );
    const moved = distance(a, p) > 1;
    a.x = p.x;
    a.y = p.y;
    return moved;
  }
  private updateBuddy(dt: number) {
    this.buddyShot -= dt;
    this.buddyNav -= dt;
    this.buddyRecover = Math.max(0, this.buddyRecover - dt);
    let target: Point = { x: this.player.x - 65, y: this.player.y + 55 };
    if (this.wave === 4 && this.taskIndex < 2 && this.phase === "combat")
      target = { x: 1830, y: 650 };
    if (blocked(target.x, target.y, this.obstacles, 22)) target = this.player;
    if (this.buddyNav <= 0) {
      this.buddyNav = 0.65;
      this.buddyPath = findPath(this.buddy, target, this.obstacles);
    }
    const moving =
      distance(this.buddy, target) > 65 &&
      this.navigate(
        this.buddy,
        target,
        this.phase === "escape" ? 285 : 235,
        dt,
        this.buddyPath,
      );
    this.buddyStuck = moving ? 0 : this.buddyStuck + dt;
    if (
      distance(this.buddy, this.player) > 650 &&
      this.buddyStuck > 2 &&
      this.wave !== 4
    ) {
      const path = findPath(
        this.player,
        { x: this.player.x - 80, y: this.player.y },
        this.obstacles,
      );
      const p = path.at(-1);
      if (p) {
        this.buddy.x = p.x;
        this.buddy.y = p.y;
        this.buddyStuck = 0;
      }
    }
    const enemy = this.enemies
      .filter(
        (e) =>
          e.age >= 0 &&
          e.hp > 0 &&
          distance(e, this.buddy) < 430 &&
          lineClear(this.buddy, e, this.obstacles),
      )
      .sort((a, b) => distance(a, this.buddy) - distance(b, this.buddy))[0];
    let angle = this.player.angle;
    if (enemy) {
      angle = Math.atan2(enemy.y - this.buddy.y, enemy.x - this.buddy.x);
      if (this.buddyShot <= 0 && this.buddyRecover === 0) {
        this.buddyShot = 0.7;
        this.fireBullet(this.buddy, angle, 1.1, 1, true);
        this.burst(
          this.buddy.x + Math.cos(angle) * 30,
          this.buddy.y - 10,
          0xcadac3,
          2,
        );
      }
      if (distance(enemy, this.buddy) < 40 && this.buddyRecover === 0) {
        this.buddyRecover = 3;
        this.pulseRing(this.buddy.x, this.buddy.y, 70, 0xc1b783);
        const p = move(
          enemy,
          (enemy.x - this.buddy.x) * 1.5,
          (enemy.y - this.buddy.y) * 1.5,
          this.obstacles,
        );
        enemy.x = p.x;
        enemy.y = p.y;
      }
    }
    this.buddy.g.setAlpha(this.buddyRecover > 0 ? 0.65 : 1);
    pose(this.buddy, angle, this.clock, moving);
  }
  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      e.age += dt;
      if (e.hp <= 0) continue;
      if (e.age < 0) {
        e.g.setAlpha(0.25 + (e.age + 1) * 0.4);
        continue;
      }
      e.hit -= dt;
      e.g.setAlpha(e.hit > 0 ? 0.45 : 1);
      e.attack -= dt;
      e.nav -= dt;
      let target: Point = this.player;
      const alarm = this.props.find((p) => p.kind === "alarm" && p.active > 0);
      if (alarm && distance(e, alarm) < 650) target = alarm;
      let speed = [63, 132, 48, 44, 38][e.type];
      const d = distance(e, target);
      const angle = Math.atan2(target.y - e.y, target.x - e.x);
      if (e.type === 2 && e.attack <= 0) {
        this.pulseRing(e.x, e.y, 130, 0xdeb984);
        for (let n = 0; n < 2 && this.enemies.length < 22; n++)
          this.addEnemy(1);
        e.attack = 9;
      }
      if (e.type >= 3) {
        if (e.chargeTime > 0) {
          e.chargeTime -= dt;
          if (e.chargeTime > 0.65) {
            speed = 0;
            e.ring.setStrokeStyle(3, 0xf3a16d);
            if (e.type === 4) this.pulseBossTell(e);
          } else if (e.charge) {
            speed = 420;
            target = e.charge;
          }
          if (e.chargeTime <= 0) {
            if (e.type === 4) {
              this.pulseRing(e.x, e.y, 140, 0xd6a071);
              if (distance(e, this.player) < 135) this.damage(22);
            }
            e.attack = e.type === 4 ? 3.2 : 4;
            e.charge = null;
          }
        } else if (e.attack <= 0 && d < 470) {
          e.charge = { x: this.player.x, y: this.player.y };
          e.chargeTime = 1.45;
        }
      }
      if (e.nav <= 0) {
        e.nav = 0.8 + Math.random() * 0.2;
        e.path = lineClear(e, target, this.obstacles, 22)
          ? []
          : findPath(e, target, this.obstacles);
      }
      const moving = this.navigate(e, target, speed, dt, e.path);
      for (const other of this.enemies) {
        if (other === e || other.hp <= 0) continue;
        const apart = distance(e, other);
        if (apart > 0 && apart < 28) {
          const p = move(
            e,
            ((e.x - other.x) / apart) * 18 * dt,
            ((e.y - other.y) / apart) * 18 * dt,
            this.obstacles,
            20,
          );
          e.x = p.x;
          e.y = p.y;
        }
      }
      pose(e, angle, this.clock + e.x, moving);
      if (distance(e, this.player) < (e.type === 4 ? 65 : 29))
        this.damage(e.type >= 3 ? 18 : 9);
    }
  }
  private pulseBossTell(e: Enemy) {
    e.ring.setRadius(44 + (Math.sin(this.clock * 8) + 1) * 8);
  }
  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      b.life -= dt;
      const steps = Math.max(1, Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 12));
      for (let s = 0; s < steps && b.life > 0; s++) {
        b.x += (b.vx * dt) / steps;
        b.y += (b.vy * dt) / steps;
        if (blocked(b.x, b.y, this.obstacles, 0)) {
          b.life = 0;
          this.burst(b.x, b.y, 0xc1b294, 2);
          break;
        }
        for (const p of this.props) {
          if (p.hp > 0 && distance(b, p) < 23) {
            p.hp -= b.damage;
            b.life = 0;
            if (p.hp <= 0) {
              if (p.kind === "barrel") {
                p.g.setVisible(false);
                this.pulseRing(p.x, p.y, 160, 0xe3ac60);
                this.burst(p.x, p.y, 0xe8b061, 20);
                sfx("boom");
                for (const e of this.enemies)
                  if (distance(e, p) < 160) this.hitEnemy(e, 35);
                if (distance(this.player, p) < 130) this.damage(15);
              } else {
                p.active = 8;
                p.g.setAlpha(0.6);
                sfx("radio");
                this.onLine({
                  who: "Noah",
                  text: "Alarmnya narik mereka. Sekarang, lewat sisi satunya!",
                });
              }
            }
            break;
          }
        }
        if (b.life <= 0) break;
        const enemy = this.enemies.find(
          (e) =>
            e.hp > 0 &&
            e.age >= 0 &&
            distance(b, { x: e.x, y: e.y - 12 }) <
              (e.type === 4 ? 57 : e.type === 3 ? 34 : 25),
        );
        if (enemy) {
          this.hitEnemy(enemy, b.damage);
          b.life = 0;
        }
      }
      b.g.setPosition(b.x, b.y);
    }
    this.bullets = this.bullets.filter((b) => {
      if (b.life <= 0) {
        b.g.destroy();
        return false;
      }
      return true;
    });
    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }
  update(_time: number, delta: number) {
    if (!this.player) return;
    this.tweens.timeScale = pauseReasons.size ? 0 : 1;
    this.cursor.clear();
    if (pauseReasons.size) {
      this.shotPending = false;
      this.dashPending = false;
      this.onHud(this);
      return;
    }
    const dt = Math.min(delta / 1000, 0.04);
    if (
      !["combat", "tutorial", "code", "switch", "escape"].includes(this.phase)
    ) {
      this.onHud(this);
      return;
    }
    this.clock += dt;
    this.fire -= dt;
    this.melee = Math.max(0, this.melee - dt);
    this.dash = Math.max(0, this.dash - dt);
    this.invulnerable -= dt;
    this.footstep -= dt;
    if (this.reload > 0) {
      this.reload -= dt;
      if (this.reload <= 0) {
        const amount = Math.min(
          weapons[this.weapon].mag - this.magazines[this.weapon],
          this.reserves[this.weapon],
        );
        this.magazines[this.weapon] += amount;
        this.reserves[this.weapon] -= amount;
      }
    }
    let dx =
        Number(keys.has("d") || keys.has("arrowright")) -
        Number(keys.has("a") || keys.has("arrowleft")),
      dy =
        Number(keys.has("s") || keys.has("arrowdown")) -
        Number(keys.has("w") || keys.has("arrowup"));
    const length = Math.hypot(dx, dy);
    if (length) {
      dx /= length;
      dy /= length;
      this.onAction("move");
      if (this.footstep <= 0) {
        sfx("step");
        this.footstep = 0.33;
      }
    }
    if ((keys.has(" ") || this.dashPending) && this.dash === 0 && length) {
      this.dash = 2.4;
      this.invulnerable = 0.3;
      sfx("dash");
      this.onAction("dash");
      this.pulseRing(this.player.x, this.player.y, 35, 0x8db5ab);
    }
    const speed = this.dash > 2.15 ? 620 : this.phase === "escape" ? 285 : 230;
    const p = move(
      this.player,
      dx * speed * dt,
      dy * speed * dt,
      this.obstacles,
    );
    this.player.x = p.x;
    this.player.y = p.y;
    const pointer = this.input.activePointer;
    pointer.updateWorldPoint(this.cameras.main);
    const angle = Math.atan2(
      pointer.worldY - this.player.y + 10,
      pointer.worldX - this.player.x,
    );
    pose(this.player, angle, this.clock, !!length);
    this.player.g.setAlpha(this.invulnerable > 0 ? 0.7 : 1);
    this.cursor
      .lineStyle(1, 0xe9d39b, 0.8)
      .strokeCircle(pointer.x, pointer.y, 7)
      .lineBetween(pointer.x - 12, pointer.y, pointer.x - 4, pointer.y)
      .lineBetween(pointer.x + 4, pointer.y, pointer.x + 12, pointer.y);
    if (keys.has("1")) this.switchWeapon(1);
    if (keys.has("2")) this.switchWeapon(2);
    if (keys.has("r")) this.reloadWeapon();
    if (keys.has("q")) this.shove();
    const canShoot = ["combat", "tutorial", "escape"].includes(this.phase);
    if (
      canShoot &&
      ((pointer.isDown && pointer.downElement === this.game.canvas) ||
        this.shotPending)
    )
      this.shoot();
    this.shotPending = false;
    if (this.phase === "combat" || this.phase === "escape") {
      const near = this.enemies.filter(
        (e) => distance(e, this.player) < 220,
      ).length;
      const pacing = director(this.clock, this.hp, near);
      this.combatLabel = pacing.name;
      this.spawnTimer -= dt;
      for (const prop of this.props) {
        prop.active = Math.max(0, prop.active - dt);
        if (
          prop.active > 0 &&
          Math.floor(this.clock * 3) !== Math.floor((this.clock - dt) * 3)
        )
          this.pulseRing(prop.x, prop.y, 100, 0xe0a777);
      }
      if (this.spawnTimer <= 0) {
        const left =
          this.phase === "escape"
            ? 3
            : this.quota -
              this.kills -
              this.enemies.filter((e) => e.type !== 4).length;
        if (left > 0) {
          for (let n = 0; n < Math.min(left, pacing.pack); n++) {
            const r = Math.random();
            this.addEnemy(
              this.wave === 0
                ? r < 0.8
                  ? 0
                  : 1
                : r < 0.48
                  ? 0
                  : r < 0.76
                    ? 1
                    : r < 0.9
                      ? 2
                      : 3,
            );
          }
        }
        this.spawnTimer = pacing.interval;
      }
      if (
        this.wave === 7 &&
        !this.bossSpawned &&
        this.taskIndex >= 1 &&
        this.phase === "combat"
      ) {
        this.bossSpawned = this.addEnemy(4, { x: 1970, y: 640 });
      }
      this.updateEnemies(dt);
      this.updateBullets(dt);
      if (this.phase === "combat") this.updateTasks(dt);
    }
    this.updateBuddy(dt);
    if (this.phase === "tutorial") this.updateBullets(dt);
    this.pickups = this.pickups.filter((pickup) => {
      if (distance(this.player, pickup) < 38) {
        if (pickup.kind === "health") this.hp = Math.min(100, this.hp + 30);
        else {
          this.reserves.shotgun += 12;
          this.reserves.smg += 42;
        }
        pickup.g.destroy();
        sfx("pickup");
        return false;
      }
      return true;
    });
    if (
      this.phase === "combat" &&
      this.kills >= this.quota &&
      this.taskIndex === chapters[this.wave].tasks.length &&
      this.enemies.every((e) => e.hp <= 0) &&
      (this.wave !== 7 || this.bossSpawned) &&
      distance(this.player, { x: 2080, y: 590 }) < 210
    ) {
      this.phase = "code";
      this.bullets.forEach((b) => b.g.destroy());
      this.bullets = [];
      this.onReady();
    }
    if (
      this.phase === "escape" &&
      this.player.x > 2360 &&
      Math.abs(this.player.y - 600) < 130
    ) {
      this.phase = "ending";
      this.onEscape();
    }
    this.onHud(this);
  }
  get objective() {
    if (this.phase === "escape") return "Lari ke feri · arah kanan";
    const t = chapters[this.wave].tasks[this.taskIndex];
    if (this.phase === "code") return "E · Terminal containment / ujung jalan";
    if (this.phase === "switch") return "Aktifkan pulse-switch";
    if (t) return t.label;
    if (this.kills >= this.quota && this.enemies.length === 0)
      return "Capai terminal di ujung jalan";
    return this.wave === 7
      ? "Lemahkan mutan dan bersihkan dermaga"
      : `Bersihkan jalan · ${Math.min(this.kills, this.quota)}/${this.quota}`;
  }
  get targetPoint(): Point {
    if (this.phase === "escape") return { x: 2420, y: 600 };
    return chapters[this.wave].tasks[this.taskIndex] ?? { x: 2080, y: 590 };
  }
  showEntities(entities: Entity[]) {
    this.visuals.forEach((v) => v.destroy());
    this.visuals.clear();
    let index = 0;
    for (const e of entities) {
      const sector = e.classes.includes("sector");
      const x = sector
        ? e.id === "sector-a"
          ? 1880
          : 2210
        : e.parent
          ? e.parent === "sector-a"
            ? 1880
            : 2140 + (index % 2) * 130
          : 1840 + (index % 3) * 180;
      const y = sector
        ? 570
        : e.parent
          ? 550 + Math.floor(index / 5) * 110
          : 470 + Math.floor(index / 3) * 190;
      index++;
      const ally = e.classes.includes("ally");
      let shape: Phaser.GameObjects.GameObject;
      let silhouette: Phaser.GameObjects.Image | undefined;
      if (sector)
        shape = this.add
          .rectangle(0, 0, 295, 300, 0x1f3e3d, 0.18)
          .setStrokeStyle(2, 0x708d7d);
      else if (e.classes.includes("enemy")) {
        silhouette = this.add
          .image(0, -15, "people", e.id === "boss" ? "3-1" : "2-1")
          .setDisplaySize(
            e.id === "boss" ? 130 : 85,
            e.id === "boss" ? 130 : 85,
          );
        shape = silhouette;
      } else if (ally) {
        silhouette = this.add
          .image(
            0,
            -15,
            "people",
            `${characterRow(this.character === "noah" ? "allie" : "noah")}-1`,
          )
          .setDisplaySize(75, 75);
        shape = silhouette;
      } else
        shape = this.add
          .rectangle(
            0,
            0,
            42,
            58,
            e.classes.includes("gate") ? 0x485e51 : 0x346265,
          )
          .setStrokeStyle(2, 0xa5d3b6);
      const shield = this.add
        .circle(0, 0, e.id === "boss" ? 65 : 40)
        .setStrokeStyle(2, 0xd6b274)
        .setVisible(e.classes.includes("shielded"));
      const marker = this.add
        .circle(0, 0, 43)
        .setStrokeStyle(3, 0xa4edc3)
        .setVisible(false);
      const label = this.text(
        0,
        sector ? -170 : 60,
        e.id,
        ally ? "#b9e1c3" : "#d6d6ba",
        12,
      );
      const g = this.add
        .container(x, y, [shape, shield, marker, label])
        .setDepth(sector ? 15 : 100 + y)
        .setVisible(!e.hidden);
      g.setData({
        shield,
        marker,
        silhouette,
        entity: e.id,
        attackEnabled: e.classes.includes("shielded"),
      });
      if (
        e.id === "pulse-switch" &&
        shape instanceof Phaser.GameObjects.Rectangle
      ) {
        shape.setInteractive({ useHandCursor: true });
        shape.on("pointerdown", () => this.onSwitch());
      }
      this.visuals.set(e.id, g);
    }
    this.cameras.main.stopFollow();
    this.cameras.main.pan(2110, 590, settings.reduced ? 0 : 450);
  }
  highlight(ids: string[]) {
    this.visuals.forEach((v, id) => {
      v.setScale(ids.includes(id) ? 1.12 : 1);
      (v.getData("marker") as Phaser.GameObjects.Arc).setVisible(
        ids.includes(id) || v.getData("marked"),
      );
    });
  }
  async sync(id: string, element: HTMLElement, method: string) {
    const v = this.visuals.get(id);
    if (!v) return;
    (v.getData("shield") as Phaser.GameObjects.Arc).setVisible(
      element.classList.contains("shielded"),
    );
    v.setData(
      "attackEnabled",
      element.classList.contains("shielded") &&
        element.style.display !== "none",
    );
    if (element.classList.contains("marked")) {
      v.setData("marked", true);
      (v.getData("marker") as Phaser.GameObjects.Arc).setVisible(true);
      this.pulseRing(v.x, v.y, 85, 0xa5e0be);
      this.burst(v.x, v.y, 0xc8d7a1, 14);
      v.setData("attackEnabled", false);
      (
        v.getData("silhouette") as Phaser.GameObjects.Image | undefined
      )?.setTint(0x657e65);
    }
    if (method === "fadeOut") {
      await new Promise<void>((resolve) =>
        this.tweens.add({
          targets: v,
          alpha: 0,
          duration: 650,
          onComplete: () => {
            v.setVisible(false);
            resolve();
          },
        }),
      );
    } else if (element.style.display === "none") {
      this.pulseRing(v.x, v.y, 65, 0x9fddd0);
      this.burst(v.x, v.y, 0xade1c6, 12);
      v.setVisible(false);
    } else v.setVisible(true).setAlpha(1);
    if (method === "removeClass") {
      this.pulseRing(v.x, v.y, 60, 0xd7c18d);
      this.burst(v.x, v.y, 0xd4bd8a);
    }
    sfx("radio");
  }
  followPlayer() {
    this.cameras.main.startFollow(this.player.g, true, 0.12, 0.12);
  }
}
