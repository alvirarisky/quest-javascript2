import Phaser from "phaser";
import { chapters, type Character } from "../gameplay/story";

// A single horizontal walking plane: scenery never changes the controls.
export class Walkway extends Phaser.Scene {
  player!: Phaser.GameObjects.Image;
  gate!: Phaser.GameObjects.Rectangle;
  lamp!: Phaser.GameObjects.Arc;
  prompt!: Phaser.GameObjects.Text;
  keys = new Set<string>();
  blocked = true;
  repaired = false;
  wave = 0;
  character: Character = "noah";
  facing = 1;
  onInteract = () => {};
  onExit = () => {};
  onReady = () => {};
  preload() {
    this.load.image("people", "/art/survivors-infected.png");
    for (const character of ["noah", "allie"])
      this.load.spritesheet(character, `/art/${character}-side.png`, {
        frameWidth: 512,
        frameHeight: 512,
      });
    this.load.image("city", "/art/dead-signal-city.png");
  }
  create() {
    const t = this.textures.get("people");
    const source = t.getSourceImage() as HTMLImageElement;
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        const x = Math.round((col * source.width) / 4),
          y = Math.round((row * source.height) / 4);
        t.add(
          `${row}-${col}`,
          0,
          x,
          y,
          Math.round(((col + 1) * source.width) / 4) - x,
          Math.round(((row + 1) * source.height) / 4) - y,
        );
      }
    this.begin(0);
    this.onReady();
  }
  begin(wave: number, place?: string) {
    this.children.removeAll(true);
    this.wave = wave;
    this.repaired = false;
    this.facing = 1;
    this.keys.clear();
    const c = chapters[wave];
    this.cameras.main.setBounds(0, 0, 1800, 650);
    this.add.image(900, 280, "city").setDisplaySize(1800, 1000).setAlpha(0.24);
    const g = this.add.graphics();
    g.fillStyle(0x0a151a, 0.8).fillRect(0, 40, 1800, 490);
    for (let x = 0; x < 1800; x += 240) {
      g.fillStyle(c.theme === "hospital" ? 0x233531 : 0x1c292d).fillRect(
        x,
        155,
        220,
        365,
      );
      g.lineStyle(2, 0x37484a).strokeRect(x + 20, 185, 180, 240);
      g.fillStyle(0x081115).fillRect(x + 30, 195, 160, 220);
      g.lineStyle(4, 0x28393d).lineBetween(x + 110, 195, x + 110, 415);
      g.lineStyle(3, 0x28393d).lineBetween(x + 30, 295, x + 190, 295);
      g.fillStyle(0xadb08d, 0.2).fillRect(x + 20, 135, 160, 4);
    }
    // Infected stay behind the windows: atmosphere, no combat or death gate.
    [390, 1120, 1380].forEach((x, i) =>
      this.add
        .image(x, 375, "people", "2-1")
        .setDisplaySize(140, 140)
        .setTint(0x536760)
        .setAlpha(0.35 + i * 0.05),
    );
    g.fillStyle(0x090e11).fillRect(0, 520, 1800, 130);
    g.fillStyle(0x52605a).fillRect(0, 520, 1800, 5);
    for (let x = 0; x < 1800; x += 100)
      g.lineStyle(1, 0x223035).lineBetween(x, 525, x - 80, 650);
    g.fillStyle(0x151c20).fillRect(0, 95, 1800, 24);
    this.add.text(
      65,
      210,
      `SECTOR ${String(wave + 1).padStart(2, "0")}\n${place || c.place}`,
      {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#8c9b91",
        lineSpacing: 12,
      },
    );
    this.add.rectangle(900, 460, 85, 120, 0x344548).setStrokeStyle(3, 0x69817b);
    this.add.rectangle(900, 425, 65, 40, 0x183d3b).setStrokeStyle(2, 0x87ad90);
    this.lamp = this.add.circle(900, 425, 8, 0xdfb56d);
    this.add
      .text(900, 355, "TERMINAL", {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "#dfb56d",
      })
      .setOrigin(0.5);
    this.gate = this.add
      .rectangle(1610, 380, 100, 280, 0x302c25)
      .setStrokeStyle(4, 0xb18b54);
    this.add
      .text(1610, 210, wave === 7 ? "FERI 07" : "EXIT", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#dfb56d",
      })
      .setOrigin(0.5);
    this.player = this.add
      .image(220, 418, this.character, 0)
      .setDisplaySize(220, 220);
    this.prompt = this.add
      .text(0, 565, "", {
        fontFamily: "monospace",
        fontSize: "17px",
        color: "#f3dfb4",
        backgroundColor: "#0b171c",
        padding: { x: 15, y: 10 },
      })
      .setOrigin(0.5);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1, 0, 136);
  }
  repair() {
    this.repaired = true;
    this.lamp.setFillStyle(0x96cdb1);
    this.gate.setFillStyle(0x1e584d).setAlpha(0.35);
  }
  interact() {
    if (this.blocked) return;
    if (!this.repaired && Math.abs(this.player.x - 900) < 145)
      this.onInteract();
    else if (this.repaired && this.player.x > 1470) this.onExit();
  }
  update(time: number, delta: number) {
    if (!this.player || this.blocked) return;
    const dir =
      Number(this.keys.has("d") || this.keys.has("arrowright")) -
      Number(this.keys.has("a") || this.keys.has("arrowleft"));
    this.player.x = Phaser.Math.Clamp(
      this.player.x + dir * Math.min(delta, 40) * 0.36,
      90,
      this.repaired ? 1650 : 1460,
    );
    this.player.y = 418 + (dir ? Math.sin(time / 95) * 2 : 0);
    this.player.setFrame(dir ? 1 + (Math.floor(time / 150) % 2) : 0);
    if (dir) this.player.setFlipX(dir < 0);
    if (dir) this.facing = dir;
    this.prompt
      .setX(this.player.x)
      .setText(
        !this.repaired && Math.abs(this.player.x - 900) < 145
          ? "E · Buka kuis terminal"
          : this.repaired && this.player.x > 1470
            ? "E · Lanjut perjalanan"
            : this.repaired
              ? "Jalur terbuka →"
              : this.player.x > 900
                ? "← Kembali ke terminal · A / D"
                : "A / D · Jalan ke terminal →",
      );
  }
}
