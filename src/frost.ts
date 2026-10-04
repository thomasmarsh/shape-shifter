import * as THREE from 'three';
import { hash, Kind, Layout } from './layout';

// Looks only: the snow, ice and frost of Frostfang. Nothing here collides or
// changes a query; it is all drawn from the terrain the island gave us, with
// the same hash so it looks the same every time.

/** Tiles from this column east are Frostfang (Highcrag ends well before it). */
export const FROST_X = 200;

/** How thick the white snow blanket is drawn on Frostfang's snow tiles. */
export const SNOW_CAP = 0.42;

/** How much of a tile's edge a snow lip covers: thick and just proud of the ground. */
const LIP_OUT = 0.14;
const LIP_IN = 0.22;
const LIP_UP = 0.03;
const LIP_DOWN = 0.2;

export interface FrostGround {
  width: number;
  depth: number;
  /** Top of the ground at a tile; -Infinity for sky. */
  height(i: number, j: number): number;
  kind(i: number, j: number): Kind;
  wet(i: number, j: number): boolean;
  /** True on the tiles that Frostfang built; only those get frost decor. */
  frost(i: number, j: number): boolean;
  layout: Layout;
}

const SIDES = [
  { di: -1, dj: 0, seen: true }, // west: the camera sees it
  { di: 1, dj: 0, seen: false },
  { di: 0, dj: -1, seen: false },
  { di: 0, dj: 1, seen: true }, // south: the camera sees it
] as const;

/**
 * 0 where the camera is well away from Frostfang, 1 once it is properly there.
 * Underroot's landing touches the end of Frostfang's last run (x 303..305, z 45),
 * so from x = 290 east the cold also fades out to the south: it is 1 at z <= 30 and
 * 0 from z = 46, so none of Underroot's hub (z >= 46 for x >= 299) is cold. East of x = 320 it is 0 whatever z is.
 */
export function coldAt(x: number, z = 0): number {
  const smooth = (t: number): number => {
    const u = Math.min(1, Math.max(0, t));
    return u * u * (3 - 2 * u);
  };
  const west = smooth((x - 190) / 14);
  const east = 1 - smooth((x - 306) / 14);
  const south = smooth((x - 290) / 6) * smooth((z - 30) / 16);
  return west * east * (1 - south);
}

class Bucket {
  readonly m: THREE.Matrix4[] = [];
  readonly c: THREE.Color[] = [];
  private tmp = new THREE.Object3D();

  add(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: THREE.Color,
    rx = 0,
    ry = 0,
    rz = 0,
  ): void {
    const o = this.tmp;
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
    o.scale.set(sx, sy, sz);
    o.updateMatrix();
    this.m.push(o.matrix.clone());
    this.c.push(color);
  }

  build(geo: THREE.BufferGeometry, material: THREE.Material, shadow = false): THREE.InstancedMesh | null {
    if (this.m.length === 0) return null;
    const mesh = new THREE.InstancedMesh(geo, material, this.m.length);
    this.m.forEach((m, n) => {
      mesh.setMatrixAt(n, m);
      mesh.setColorAt(n, this.c[n]);
    });
    mesh.castShadow = false;
    mesh.receiveShadow = shadow;
    return mesh;
  }
}

/** All the little things on Frostfang's ground: drifts, shards, icicles, pebbles, shrubs. */
export function buildFrostDecor(g: FrostGround): THREE.Group {
  const group = new THREE.Group();

  // Keep a clear circle round everything the player uses or climbs.
  const L = g.layout;
  const keep: { x: number; z: number; r: number }[] = [
    { x: L.spawn.x, z: L.spawn.z, r: 1.5 },
    ...L.puzzles.flatMap((p) => [
      { x: p.speaker.x, z: p.speaker.z, r: 1.6 },
      { x: p.candle.x, z: p.candle.z, r: 1.6 },
    ]),
    ...L.checkpoints.map((c) => ({ x: c.x, z: c.z, r: 1.6 })),
    ...L.bread.map((b) => ({ x: b.x, z: b.z, r: 1.3 })),
    ...L.trees.map((t) => ({ x: t.x, z: t.z, r: 1.7 })),
    ...L.boulders.map((b) => ({ x: b.x, z: b.z, r: 1.3 })),
    ...L.enemies.map((e) => ({ x: e.x, z: e.z, r: 1.2 })),
  ].filter((s) => Number.isFinite(s.x) && s.x > FROST_X - 4);
  const clear = (i: number, j: number): boolean =>
    keep.every((s) => Math.hypot(i + 0.5 - s.x, j + 0.5 - s.z) >= s.r);

  const col = (h: number, s: number, l: number): THREE.Color => new THREE.Color().setHSL(h, s, l);
  const lipColor = col(0.58, 0.12, 0.985);

  const lips = new Bucket();
  const icicles = new Bucket();
  const drifts = new Bucket();
  const shards = new Bucket();
  const pebbles = new Bucket();
  const twigs = new Bucket();
  const glints = new Bucket();

  for (let j = 1; j < g.depth - 1; j++) {
    for (let i = FROST_X; i < g.width - 1; i++) {
      const h = g.height(i, j);
      const kind = g.kind(i, j);
      if (!Number.isFinite(h) || kind === Kind.Void || !g.frost(i, j)) continue;
      const rand = (seed: number): number => hash(i, j, 40 + seed);
      const solidTop = kind === Kind.Snow || kind === Kind.Ice || kind === Kind.Stone;

      // ---- edges: snow lips on cliff tops, icicles and shelves on the faces we see
      let exposed = 0;
      if (kind !== Kind.Cloud) {
        SIDES.forEach((s, n) => {
          const nb = g.height(i + s.di, j + s.dj);
          const drop = Number.isFinite(nb) ? h - nb : 99;
          if (drop < 1) return;
          exposed++;
          const depth = LIP_IN + LIP_OUT;
          const along = 1.0 + 2 * LIP_OUT;
          const y = h + LIP_UP - (LIP_DOWN + LIP_UP) / 2;
          const thick = LIP_DOWN + LIP_UP;
          // The lip is centred on the face, reaching LIP_OUT beyond it and LIP_IN in.
          const off = (LIP_OUT - LIP_IN) / 2;
          const px = i + 0.5 + s.di * (0.5 + off);
          const pz = j + 0.5 + s.dj * (0.5 + off);
          if (s.di !== 0) lips.add(px, y, pz, depth, thick, along, lipColor);
          else lips.add(px, y, pz, along, thick, depth, lipColor);

          if (!s.seen) return;
          // Icicles hang from the lip, longest where the drop is big.
          const count = 1 + Math.floor(rand(10 + n) * 3.2);
          for (let m = 0; m < count; m++) {
            const t = (m + 0.25 + rand(20 + n * 5 + m) * 0.5) / count;
            const len = Math.min(drop - 0.4, 0.3 + rand(30 + n * 5 + m) * 0.65);
            if (len < 0.2 || rand(50 + n * 5 + m) < 0.2) continue;
            const ox = s.di !== 0 ? s.di * (0.5 + LIP_OUT * 0.55) : t - 0.5;
            const oz = s.dj !== 0 ? s.dj * (0.5 + LIP_OUT * 0.55) : t - 0.5;
            const w = 0.1 + rand(60 + m) * 0.07;
            icicles.add(i + 0.5 + ox, h - LIP_DOWN - len / 2 + 0.02, j + 0.5 + oz, w, len, w, col(0.54, 0.7, 0.86 + rand(70 + m) * 0.1), Math.PI);
          }
        });
      }

      // ---- the top of the tile
      if (!solidTop || g.wet(i, j) || !clear(i, j)) continue;
      const inset = exposed > 0 ? 0.12 : 0.28;
      const jx = (a: number): number => (a - 0.5) * 2 * inset;

      if (kind === Kind.Snow) {
        if (rand(1) < 0.15) {
          const w = 0.55 + rand(2) * 0.5;
          const d = 0.5 + rand(3) * 0.5;
          const hh = 0.11 + rand(4) * 0.12;
          drifts.add(i + 0.5 + jx(rand(5)), h - 0.04, j + 0.5 + jx(rand(6)), w / 2, hh + 0.04, d / 2, col(0.58, 0.3, 0.97 + rand(7) * 0.03), 0, rand(8) * 3);
        }
        if (rand(11) < 0.05) cluster(shards, i + 0.5 + jx(rand(12)), h, j + 0.5 + jx(rand(13)), rand);
        if (rand(21) < 0.08) {
          const n = 2 + Math.floor(rand(22) * 2.5);
          for (let m = 0; m < n; m++) {
            const s = 0.09 + rand(23 + m) * 0.09;
            const x = i + 0.5 + jx(rand(26 + m));
            const z = j + 0.5 + jx(rand(29 + m));
            const a = rand(32 + m) * 3;
            const tone = 0.34 + rand(35 + m) * 0.12;
            pebbles.add(x, h + s * 0.35, z, s * 1.3, s * 0.8, s, col(0.62, 0.2, tone), 0, a);
            pebbles.add(x, h + s * 0.78, z, s * 1.0, s * 0.18, s * 0.78, lipColor, 0, a);
          }
        }
        if (rand(41) < 0.035 && exposed === 0) shrub(twigs, drifts, i + 0.5 + jx(rand(42)), h, j + 0.5 + jx(rand(43)), rand);
      } else if (kind === Kind.Ice) {
        if (rand(11) < 0.1) cluster(shards, i + 0.5 + jx(rand(12)), h, j + 0.5 + jx(rand(13)), rand);
        // A glossy sheen: short parallel streaks all slanting the same way, like a
        // reflection (cracks, by contrast, only ever appear on thin ice).
        if (rand(14) < 0.45) {
          const x = i + 0.5 + (rand(18) - 0.5) * 0.4;
          const z = j + 0.5 + (rand(21) - 0.5) * 0.4;
          glints.add(x, h + 0.012, z, 0.42, 0.012, 0.06, col(0.5, 0.3, 1), 0, -0.75);
          glints.add(x + 0.16, h + 0.012, z - 0.13, 0.2, 0.012, 0.035, col(0.5, 0.3, 1), 0, -0.75);
        }
      } else if (kind === Kind.Stone) {
        if (rand(21) < 0.35) {
          const s = 0.08 + rand(23) * 0.08;
          pebbles.add(i + 0.5 + jx(rand(26)), h + s * 0.3, j + 0.5 + jx(rand(29)), s * 1.3, s * 0.7, s, col(0.62, 0.2, 0.5), 0, rand(32) * 3);
        }
        if (rand(11) < 0.08) cluster(shards, i + 0.5 + jx(rand(12)), h, j + 0.5 + jx(rand(13)), rand);
      }
    }
  }

  const lambert = (opts: THREE.MeshLambertMaterialParameters = {}): THREE.MeshLambertMaterial =>
    new THREE.MeshLambertMaterial({ color: 0xffffff, ...opts });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cone4 = new THREE.ConeGeometry(0.5, 1, 4);
  const cone5 = new THREE.ConeGeometry(0.5, 1, 5);
  const blob = new THREE.IcosahedronGeometry(1, 2);

  const meshes = [
    lips.build(box, lambert()),
    icicles.build(cone4, lambert({ emissive: 0x2a5878, flatShading: true })),
    drifts.build(blob, lambert(), true),
    shards.build(cone5, lambert({ emissive: 0x2f6f98, flatShading: true })),
    pebbles.build(box, lambert()),
    twigs.build(box, lambert()),
    glints.build(
      box,
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }),
    ),
  ];
  for (const mesh of meshes) if (mesh) group.add(mesh);
  group.name = 'frost-decor';
  return group;
}

/** Two or three ice shards leaning out of one spot. */
function cluster(b: Bucket, x: number, y: number, z: number, rand: (s: number) => number): void {
  const n = 2 + Math.floor(rand(90) * 2.4);
  for (let m = 0; m < n; m++) {
    const h = 0.2 + rand(91 + m) * 0.32;
    const w = 0.1 + rand(94 + m) * 0.08;
    const a = rand(97 + m) * Math.PI * 2;
    const lean = 0.12 + rand(100 + m) * 0.25;
    b.add(
      x + Math.cos(a) * 0.1 * m,
      y + h / 2 - 0.02,
      z + Math.sin(a) * 0.1 * m,
      w,
      h,
      w,
      new THREE.Color().setHSL(0.54, 0.65, 0.78 + rand(103 + m) * 0.14),
      Math.sin(a) * lean,
      rand(106 + m) * 3,
      Math.cos(a) * lean,
    );
  }
}

/** A knee-high dead shrub: a few bare twigs in a little heap of snow. */
function shrub(
  twigs: Bucket,
  mounds: Bucket,
  x: number,
  y: number,
  z: number,
  rand: (s: number) => number,
): void {
  const bark = new THREE.Color().setHSL(0.07, 0.25, 0.26);
  const n = 4 + Math.floor(rand(110) * 3);
  for (let m = 0; m < n; m++) {
    const len = 0.28 + rand(111 + m) * 0.22;
    const a = (m / n) * Math.PI * 2 + rand(120 + m);
    const lean = 0.35 + rand(130 + m) * 0.5;
    twigs.add(
      x + Math.cos(a) * 0.08,
      y + Math.cos(lean) * len * 0.5,
      z + Math.sin(a) * 0.08,
      0.035,
      len,
      0.035,
      bark,
      Math.sin(a) * lean,
      0,
      -Math.cos(a) * lean,
    );
  }
  mounds.add(x, y - 0.03, z, 0.34, 0.11, 0.3, new THREE.Color().setHSL(0.58, 0.2, 0.97), 0, rand(140) * 3);
}

// ---- falling snow ----------------------------------------------------------

const FLAKES = 360;
const FLAKES_FAST = 90;
const BOX = { x: 34, y: 26, z: 34 };

/** One Points of snow flakes that are recycled round the camera target. */
export class Snowfall {
  readonly points: THREE.Points;
  private base: Float32Array;
  private speed: Float32Array;
  private sway: Float32Array;
  private pos: THREE.BufferAttribute;
  private material: THREE.PointsMaterial;
  private count: number;

  constructor(fast: boolean, pixelRatio: number) {
    this.count = fast ? FLAKES_FAST : FLAKES;
    this.base = new Float32Array(this.count * 3);
    this.speed = new Float32Array(this.count);
    this.sway = new Float32Array(this.count);
    for (let n = 0; n < this.count; n++) {
      this.base[n * 3] = hash(n, 1, 91) * BOX.x;
      this.base[n * 3 + 1] = hash(n, 2, 91) * BOX.y;
      this.base[n * 3 + 2] = hash(n, 3, 91) * BOX.z;
      this.speed[n] = 1.3 + hash(n, 4, 91) * 1.4;
      this.sway[n] = hash(n, 5, 91) * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(this.count * 3), 3);
    geo.setAttribute('position', this.pos);
    this.material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 4 * pixelRatio,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.points.renderOrder = 5;
  }

  update(time: number, target: THREE.Vector3, amount: number): void {
    this.points.visible = amount > 0.01;
    if (!this.points.visible) return;
    this.material.opacity = 0.9 * amount;
    const a = this.pos.array as Float32Array;
    const wrap = (v: number, size: number): number => ((v % size) + size) % size;
    for (let n = 0; n < this.count; n++) {
      const x = this.base[n * 3] + Math.sin(time * 0.7 + this.sway[n]) * 0.8 + time * 0.5;
      const y = this.base[n * 3 + 1] - time * this.speed[n];
      const z = this.base[n * 3 + 2] + Math.cos(time * 0.6 + this.sway[n]) * 0.8 - time * 0.3;
      a[n * 3] = target.x - BOX.x / 2 + wrap(x - target.x, BOX.x);
      a[n * 3 + 1] = target.y - BOX.y / 2 + wrap(y - target.y, BOX.y) + 4;
      a[n * 3 + 2] = target.z - BOX.z / 2 + wrap(z - target.z, BOX.z);
    }
    this.pos.needsUpdate = true;
  }
}
