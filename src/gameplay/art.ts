import Phaser from "phaser";
import { WORLD, type Obstacle } from "./systems";
import { chapters, type Character } from "./story";
export function frameFor(row: number, angle: number) {
  const d = Math.round(angle / (Math.PI / 2));
  const col = d === 0 ? 0 : d === 1 ? 1 : Math.abs(d) === 2 ? 2 : 3;
  return `${row}-${col}`;
}
export function createFrames(scene: Phaser.Scene) {
  const props = scene.textures.get("props");
  const frames = [
    [20, 50, 480, 440],
    [530, 35, 480, 465],
    [1040, 150, 490, 290],
    [10, 600, 510, 320],
    [640, 560, 270, 430],
    [1020, 610, 510, 300],
  ];
  frames.forEach(([x, y, w, h], i) => props.add(String(i), 0, x, y, w, h));
  const texture = scene.textures.get("people");
  const source = texture.getSourceImage() as HTMLImageElement;
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) {
      const x = Math.round((col * source.width) / 4),
        y = Math.round((row * source.height) / 4);
      texture.add(
        `${row}-${col}`,
        0,
        x,
        y,
        Math.round(((col + 1) * source.width) / 4) - x,
        Math.round(((row + 1) * source.height) / 4) - y,
      );
    }
}
export type Actor = {
  g: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
  gun: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
  row: number;
  angle: number;
};
export function actor(
  scene: Phaser.Scene,
  x: number,
  y: number,
  row: number,
  label = "",
  color = 0xc0c7a3,
): Actor {
  const shadow = scene.add.ellipse(
    0,
    8,
    row === 3 ? 62 : 42,
    20,
    0x000000,
    0.4,
  );
  const ring = scene.add
    .circle(0, 0, row === 3 ? 29 : 21)
    .setStrokeStyle(1, color, 0.5);
  const body = scene.add
    .image(0, -20, "people", `${row}-1`)
    .setDisplaySize(row === 3 ? 104 : 88, row === 3 ? 104 : 88);
  const gun = scene.add.rectangle(21, -8, 24, 4, 0x202a2a).setVisible(row < 2);
  const g = scene.add.container(x, y, [shadow, ring, gun, body]);
  if (label)
    g.add(
      scene.add
        .text(0, -70, label, {
          fontFamily: "monospace",
          fontSize: "10px",
          color: Phaser.Display.Color.IntegerToColor(color).rgba,
        })
        .setOrigin(0.5),
    );
  return { g, body, ring, gun, x, y, row, angle: 0 };
}
export function pose(a: Actor, angle: number, time: number, moving: boolean) {
  a.angle = angle;
  a.g.setPosition(a.x, a.y).setDepth(100 + a.y);
  a.body
    .setFrame(frameFor(a.row, angle))
    .setPosition(0, -20 + (moving ? Math.sin(time * 14) * 2 : 0));
  a.gun
    .setPosition(Math.cos(angle) * 23, -8 + Math.sin(angle) * 12)
    .setRotation(angle);
}
export function drawWorld(
  scene: Phaser.Scene,
  wave: number,
  obstacles: Obstacle[],
) {
  const list: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics().setDepth(-20);
  list.push(g);
  const chapter = chapters[wave];
  g.fillStyle(0x111e24).fillRect(0, 0, WORLD.width, WORLD.height);
  g.fillStyle(0x252c2d).fillRect(40, 350, 2480, 485);
  g.fillStyle(0x383d38).fillRect(40, 340, 2480, 14).fillRect(40, 833, 2480, 16);
  for (let x = 70; x < 2480; x += 115)
    g.fillStyle(0xa29a6c, 0.32).fillRect(x, 586, 55, 5);
  for (let i = 0; i < 220; i++) {
    const x = (i * 137 + wave * 57) % 2500,
      y = (i * 73) % 1080;
    g.lineStyle(1, 0x617477, 0.1).lineBetween(x, y, x + 35, y + 2);
  }
  for (let i = 0; i < 35; i++) {
    const x = (i * 233 + 100) % 2450,
      y = 380 + ((i * 67) % 420);
    g.fillStyle(0x637778, 0.09).fillEllipse(x, y, 80, 18);
  }
  const label = (
    x: number,
    y: number,
    text: string,
    size = 14,
    color = "#9ca78d",
  ) => {
    const t = scene.add
      .text(x, y, text, {
        fontFamily: "monospace",
        fontSize: size + "px",
        color,
        letterSpacing: 2,
      })
      .setDepth(-8);
    list.push(t);
    return t;
  };
  for (const o of obstacles) {
    g.fillStyle(0x000000, 0.35).fillRect(o.x + 10, o.y + 14, o.w, o.h);
    const frame =
      o.kind === "building"
        ? o.x < 600 && wave < 2
          ? "0"
          : "1"
        : o.kind === "car"
          ? wave === 3
            ? "3"
            : "2"
          : "5";
    const sprite = scene.add
      .image(o.x + o.w / 2, o.y + o.h / 2, "props", frame)
      .setDisplaySize(o.w + 12, o.h + 20)
      .setDepth(-12)
      .setTint(0xa1b4ad);
    list.push(sprite);
    if (o.kind === "building")
      label(o.x + 20, o.y + o.h + 12, o.label ?? "", 11, "#9aa991");
  }

  for (const x of [260, 1060, 1860, 2300]) {
    g.fillStyle(0xf6c365, 0.025).fillCircle(x, 400, 135);
    g.fillStyle(0xf6c365, 0.04).fillCircle(x, 400, 70);
    g.lineStyle(5, 0x53605b).lineBetween(x, 350, x, 405);
    g.fillStyle(0xfbe1a1).fillRect(x - 8, 396, 16, 5);
  }
  label(130, 785, "← KARANTINA", 21, "#727d6c");
  label(
    1980,
    370,
    chapter.theme === "harbor" ? "DERMAGA 07 →" : "TERMINAL / UV",
    18,
    "#a3b28c",
  );
  label(150, 375, chapter.place, 12, "#647a7a");
  if (chapter.theme === "harbor") {
    g.fillStyle(0x0d242e).fillRect(2330, 40, 230, 1040);
    for (let y = 80; y < 1080; y += 35)
      g.lineStyle(2, 0x49717a, 0.25).lineBetween(2340, y, 2550, y + 8);
    g.fillStyle(0x4c5041).fillRect(2280, 490, 240, 130);
    g.fillStyle(0xa3a991).fillRoundedRect(2390, 360, 135, 330, 30);
    g.fillStyle(0x394c50).fillRect(2410, 420, 90, 125);
    g.fillStyle(0xe5bc62).fillRect(2420, 435, 70, 10);
    label(2398, 560, "FERI 07", 12, "#122a2c");
  }
  return list;
}
export function characterRow(c: Character) {
  return c === "allie" ? 0 : 1;
}

export function drawEscapeWorld(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(-20);
  g.fillStyle(0x102b32).fillRect(0, 0, WORLD.width, WORLD.height);
  for (let y = 50; y < 1080; y += 28)
    for (let x = 40; x < 2500; x += 170)
      g.lineStyle(1, 0x4c797b, 0.3).lineBetween(x, y, x + 80, y + 4);
  g.fillStyle(0x494e40).fillRect(40, 460, 2480, 320);
  for (let x = 40; x < 2520; x += 30)
    g.lineStyle(2, 0x2c3933, 0.7).lineBetween(x, 460, x, 780);
  g.lineStyle(6, 0x7a8062)
    .lineBetween(40, 460, 2340, 460)
    .lineBetween(40, 780, 2340, 780);
  for (let x = 200; x < 2300; x += 300) {
    g.fillStyle(0xeacb7b, 0.055).fillCircle(x, 485, 90);
    g.fillStyle(0xeacb7b).fillRect(x, 475, 7, 13);
  }
  g.fillStyle(0x9caa94).fillRoundedRect(2330, 400, 190, 440, 30);
  g.fillStyle(0x2b4649).fillRect(2370, 430, 100, 130);
  const t = scene.add
    .text(2350, 615, "FERI 07\nNAIK DI SINI", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#172b2b",
      align: "center",
    })
    .setDepth(25);
  return [g, t];
}
