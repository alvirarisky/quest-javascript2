export type Point = { x: number; y: number };
export type Obstacle = Point & {
  w: number;
  h: number;
  kind: "building" | "car" | "crate";
  label?: string;
};
export const WORLD = { width: 2560, height: 1120, cell: 40 };
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export function blocked(
  x: number,
  y: number,
  obstacles: Obstacle[],
  radius = 18,
) {
  return (
    x < 35 + radius ||
    x > WORLD.width - 35 - radius ||
    y < 45 + radius ||
    y > WORLD.height - 45 - radius ||
    obstacles.some(
      (o) =>
        x > o.x - radius &&
        x < o.x + o.w + radius &&
        y > o.y - radius &&
        y < o.y + o.h + radius,
    )
  );
}
export function move(
  point: Point,
  dx: number,
  dy: number,
  obstacles: Obstacle[],
  radius = 18,
) {
  const p = { ...point };
  if (!blocked(p.x + dx, p.y, obstacles, radius)) p.x += dx;
  if (!blocked(p.x, p.y + dy, obstacles, radius)) p.y += dy;
  return p;
}
export function lineClear(
  a: Point,
  b: Point,
  obstacles: Obstacle[],
  radius = 4,
) {
  const steps = Math.ceil(distance(a, b) / 16);
  for (let i = 1; i <= steps; i++)
    if (
      blocked(
        a.x + ((b.x - a.x) * i) / steps,
        a.y + ((b.y - a.y) * i) / steps,
        obstacles,
        radius,
      )
    )
      return false;
  return true;
}
// Breadth-first grid path, used by companion and zombies. No diagonal corner clipping.
export function findPath(
  from: Point,
  to: Point,
  obstacles: Obstacle[],
): Point[] {
  const cell = WORLD.cell,
    cols = WORLD.width / cell,
    rows = WORLD.height / cell;
  const start = Math.floor(from.y / cell) * cols + Math.floor(from.x / cell),
    goal = Math.floor(to.y / cell) * cols + Math.floor(to.x / cell);
  const queue = [start],
    parents = new Map<number, number>();
  parents.set(start, -1);
  let found = -1;
  for (let at = 0; at < queue.length && at < cols * rows; at++) {
    const node = queue[at];
    if (node === goal) {
      found = node;
      break;
    }
    const x = node % cols,
      y = Math.floor(node / cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        id = ny * cols + nx;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= cols ||
        ny >= rows ||
        parents.has(id) ||
        blocked(nx * cell + cell / 2, ny * cell + cell / 2, obstacles, 21)
      )
        continue;
      parents.set(id, node);
      queue.push(id);
    }
  }
  if (found < 0) return [];
  const path: Point[] = [];
  for (let id = found; id !== start; id = parents.get(id)!) {
    path.push({
      x: (id % cols) * cell + cell / 2,
      y: Math.floor(id / cols) * cell + cell / 2,
    });
  }
  return path.reverse();
}
export type WeaponId = "pistol" | "shotgun" | "smg";
export const weapons: Record<
  WeaponId,
  {
    name: string;
    mag: number;
    reload: number;
    rate: number;
    pellets: number;
    damage: number;
    spread: number;
    reserve: number;
  }
> = {
  pistol: {
    name: "PISTOL",
    mag: 12,
    reload: 1.05,
    rate: 0.24,
    pellets: 1,
    damage: 2,
    spread: 0.02,
    reserve: Infinity,
  },
  shotgun: {
    name: "SHOTGUN",
    mag: 6,
    reload: 1.55,
    rate: 0.68,
    pellets: 6,
    damage: 1.7,
    spread: 0.34,
    reserve: 36,
  },
  smg: {
    name: "SMG",
    mag: 28,
    reload: 1.3,
    rate: 0.085,
    pellets: 1,
    damage: 1.1,
    spread: 0.09,
    reserve: 112,
  },
};
export function director(elapsed: number, hp: number, nearby: number) {
  if (hp < 30 || nearby > 13)
    return { name: "BERTAHAN", interval: 3.5, pack: 1 };
  const phase = elapsed % 24;
  if (phase < 7) return { name: "JALUR TENANG", interval: 2.4, pack: 1 };
  if (phase < 18) return { name: "GEROMBOLAN", interval: 1.8, pack: 3 };
  return { name: "TARIK NAPAS", interval: 3.5, pack: 1 };
}
export function makeObstacles(wave: number): Obstacle[] {
  const offset = (wave % 3) * 65;
  const result: Obstacle[] = [
    {
      x: 80,
      y: 100,
      w: 460,
      h: 240,
      kind: "building",
      label: wave === 0 ? "MINIMARKET 24H" : "TOKO / DITUTUP",
    },
    {
      x: 670,
      y: 90,
      w: 500,
      h: 230,
      kind: "building",
      label: wave === 3 ? "RUMAH SAKIT" : "KARANTINA",
    },
    {
      x: 1340,
      y: 80,
      w: 510,
      h: 220,
      kind: "building",
      label: wave === 6 ? "RADIO / 07" : "GUDANG 09",
    },
    { x: 80, y: 850, w: 520, h: 190, kind: "building", label: "EVAKUASI →" },
    {
      x: 800,
      y: 880,
      w: 440,
      h: 170,
      kind: "building",
      label: "STAY TOGETHER",
    },
    { x: 1460, y: 870, w: 390, h: 170, kind: "building", label: "DANGER" },
    { x: 880, y: 440 + offset, w: 145, h: 62, kind: "car" },
    { x: 1150, y: 710 - offset, w: 145, h: 62, kind: "car" },
    { x: 420, y: 710, w: 130, h: 58, kind: "car" },
    { x: 1660, y: 450, w: 110, h: 65, kind: "crate" },
  ];
  if (wave === 1)
    result.push(
      { x: 630, y: 435, w: 130, h: 60, kind: "car" },
      { x: 1490, y: 760, w: 155, h: 65, kind: "car" },
    );
  if (wave === 2)
    result.push(
      { x: 720, y: 580, w: 180, h: 65, kind: "crate" },
      { x: 1240, y: 380, w: 150, h: 70, kind: "crate" },
    );
  if (wave === 3)
    result.push(
      { x: 490, y: 430, w: 155, h: 65, kind: "car" },
      { x: 1300, y: 770, w: 160, h: 65, kind: "car" },
    );
  if (wave === 5) {
    result[0].h = 300;
    result[1].y = 55;
    result[1].h = 310;
    result[3].y = 810;
    result[3].h = 230;
    result.push({ x: 1230, y: 490, w: 160, h: 65, kind: "crate" });
  }
  if (wave >= 6) {
    result[0].label = "PORT / 07";
    result[2].label = wave === 6 ? "RADIO / 07" : "DOCK CONTROL";
    result.push(
      { x: 620, y: 365, w: 190, h: 65, kind: "crate" },
      { x: 1320, y: 790, w: 180, h: 65, kind: "crate" },
    );
  }
  if (wave === 4)
    result.push({ x: 1740, y: 600, w: 40, h: 180, kind: "crate" });
  return result;
}
