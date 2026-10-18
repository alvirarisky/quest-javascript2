import Phaser from "phaser";
import { missions, type Mission } from "./missions";
import type { Plan } from "./story";
import type { Character } from "../gameplay/story";
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
  private pulseCooldown = 0;
  private escapeGrace = 0;
  private pulseRing!: Phaser.GameObjects.Arc;
  onPulseReady = (_ready: boolean) => {};
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
    this.pulseCooldown = 0;
    this.escapeGrace = 0;
    this.onPulseReady(true);
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
    this.pulseRing = this.add
      .circle(140, 440, 20, 0x9cffe3, 0)
      .setStrokeStyle(3, 0x9cffe3)
      .setDepth(6)
      .setVisible(false);
    this.renderState();
    if (repaired) this.beginEscape();
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
    if (
      this.repaired &&
      this.wave === 7 &&
      this.bossIndex < this.bossNodes.length
    )
      return this.bossNodes[this.bossIndex].x;
    return this.targetIndex < 2
      ? missions[this.wave].tasks[this.targetIndex].x
      : this.targetIndex === 2
        ? 940
        : 1135;
  }
  goToTarget() {
    if (this.blocked) return;
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
    ) {
      if (this.pulseCooldown > 0)
        this.onHint("Pulse sedang mengisi. Tahan posisi.");
      else this.pulse();
    } else if (this.repaired) this.onExit();
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
    // Evidence/triage chapters breathe; failed operations turn them into pursuit.
    this.escaping =
      ![1, 3, 6].includes(this.wave) || !!this.failures[this.wave];
    if (!this.escaping) return;
    this.escapeGrace = 1600;
    this.player.x = 140;
    const count =
      3 +
      Number(!!this.failures[0]) +
      Number(this.wave >= 5 && !!this.failures[5]);
    this.hunters = Array.from({ length: count }, (_, i) =>
      this.add
        .image([-140, 600, 990, -380, 1160][i], 455, "infected", "zombie")
        .setDisplaySize(150, 150)
        .setTint(this.failures[this.wave] ? 0xc99583 : 0xa5b59a)
        .setDepth(4),
    );
    if (this.failures[this.wave]) this.backdrop.setTint(0xb6877e);
    if (this.wave === 7) {
      const count =
        (this.finalPlan === "cut" ? 2 : 3) + Number(!!this.failures[7]);
      this.core.setVisible(true).setAlpha(1);
      this.bossNodes = Array.from({ length: count }, (_, i) =>
        this.add
          .circle(
            300 + i * (650 / Math.max(1, count - 1)),
            460,
            28,
            0x111d22,
            0.9,
          )
          .setStrokeStyle(3, this.finalPlan === "cut" ? 0xe6ae82 : 0x8cdacb)
          .setDepth(6)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => this.goToTarget()),
      );
      this.nodes[3].setX(this.targetX);
      this.labels[3].setText(
        this.finalPlan === "cut" ? "PUTUS SIMPUL" : "SELARASKAN",
      );
      this.gate.setStrokeStyle(3, 0xd18b62);
    }
  }

  pulse() {
    if (this.blocked || !this.escaping || this.pulseCooldown > 0) return;
    this.pulseCooldown = this.failures[2] ? 2200 : 1300;
    this.escapeGrace = 1400;
    this.onPulseReady(false);
    if (
      this.wave === 7 &&
      this.bossIndex < this.bossNodes.length &&
      Math.abs(this.player.x - this.targetX) < 100
    ) {
      this.bossNodes[this.bossIndex++]
        .setFillStyle(0x9fdbc3, 0.8)
        .setStrokeStyle(1, 0x9fdbc3);
      this.nodes[3].setX(this.targetX);
      this.core.setAlpha(1 - (this.bossIndex / this.bossNodes.length) * 0.8);
      this.onHint(
        `Simpul ${this.bossIndex}/${this.bossNodes.length}. ${this.bossIndex === this.bossNodes.length ? "Selesai. Keluar sekarang!" : "Lanjut ke simpul berikutnya."}`,
      );
      if (this.bossIndex === this.bossNodes.length) {
        this.core.setVisible(false);
        this.gate.setStrokeStyle(3, 0x8bcdb7);
        this.labels[3].setText("KELUAR");
      }
    }
    this.hunters.forEach((enemy) => {
      if (Math.abs(enemy.x - this.player.x) < 430)
        enemy.x += (enemy.x < this.player.x ? -1 : 1) * 360;
    });
    this.pulseRing
      .setPosition(this.player.x, 445)
      .setScale(1)
      .setAlpha(1)
      .setVisible(true);
    this.tweens.add({
      targets: this.pulseRing,
      scale: this.reduced ? 5 : 17,
      alpha: 0,
      duration: this.reduced ? 120 : 500,
      onComplete: () => this.pulseRing.setVisible(false),
    });
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
  update(time: number, delta: number) {
    if (!this.player || this.blocked) return;
    const elapsed = Math.min(delta, 40);
    if (this.pulseCooldown > 0) {
      this.pulseCooldown = Math.max(0, this.pulseCooldown - elapsed);
      if (this.pulseCooldown === 0) this.onPulseReady(true);
    }
    if (this.escaping) {
      this.escapeGrace = Math.max(0, this.escapeGrace - elapsed);
      if (this.escapeGrace === 0) {
        this.hunters.forEach((enemy, i) => {
          enemy.x +=
            Math.sign(this.player.x - enemy.x) * elapsed * (0.18 + i * 0.015);
          enemy.y = 455 + (this.reduced ? 0 : Math.sin(time / 90 + i) * 3);
        });
        if (
          this.hunters.some((enemy) => Math.abs(enemy.x - this.player.x) < 50)
        ) {
          this.player.x =
            this.wave === 7 && this.bossIndex > 0
              ? this.bossNodes[this.bossIndex - 1].x
              : 140;
          this.destination = null;
          this.autoAction = false;
          this.hunters.forEach((enemy, i) => (enemy.x = [-180, 620, 1000][i]));
          this.escapeGrace = 1600;
          if (!this.reduced) this.cameras.main.shake(180, 0.004);
          this.onHint(
            "Tertangkap. Coba lagi — Space untuk pulse, D untuk lari.",
          );
        }
      }
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
    const dir =
      keyboard ||
      (this.destination !== null
        ? Math.sign(this.destination - this.player.x)
        : 0);
    if (dir) this.idle = 0;
    else this.idle += Math.min(delta, 40);
    if (this.idle > 18000 && !this.hinted) {
      this.hinted = true;
      this.onIdle();
    }
    const amount = Math.min(delta, 40) * 0.38;
    if (
      this.destination !== null &&
      Math.abs(this.player.x - this.destination) <= amount
    ) {
      this.player.x = this.destination;
      this.destination = null;
      const action = this.autoAction;
      this.autoAction = false;
      if (action) this.interact();
    } else
      this.player.x = Phaser.Math.Clamp(this.player.x + dir * amount, 75, 1150);
    this.player.setFrame(dir ? 1 + (Math.floor(time / 150) % 2) : 0);
    if (dir) this.player.setFlipX(dir < 0);
    this.player.y =
      423 + (dir && !this.reduced ? Math.sin(time / 100) * 1.5 : 0);
    (this.children.getByName("shadow") as Phaser.GameObjects.Ellipse).setX(
      this.player.x,
    );
  }
}
