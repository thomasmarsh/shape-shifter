import * as THREE from 'three';

// The world is a grid of one-by-one tiles. Each tile is either empty sky or a
// column of ground with a height. Everything that collides — the player, bad
// guys — asks the world how high the ground is at a point.
//
// x runs east, z runs south, y is up. Tile (i, j) covers x in [i, i+1) and
// z in [j, j+1).

export const enum Kind {
  Void = 0,
  Grass,
  Sand,
  Stone,
  Cloud,
  Dirt,
}

export interface Spot {
  x: number;
  z: number;
}

export interface PuzzleSpot {
  id: string;
  speaker: Spot;
  candle: Spot;
  /** Number of notes in the melody. */
  notes: number;
}

export interface EnemySpot extends Spot {
  tester: boolean;
}

export interface Layout {
  spawn: Spot;
  checkpoints: (Spot & { id: string })[];
  puzzles: PuzzleSpot[];
  enemies: EnemySpot[];
  bread: (Spot & { id: string; amount: number })[];
  trees: Spot[];
  boulders: Spot[];
  /** Where the tutorial ends: the far cloud island. */
  goal: Spot & { radius: number };
}

/** Small deterministic hash so the island looks the same every time. */
function hash(i: number, j: number, seed = 0): number {
  let n = (i * 374761393 + j * 668265263 + seed * 2147483647) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return ((n >>> 0) % 100000) / 100000;
}

export class World {
  readonly width = 78;
  readonly depth = 44;
  readonly waterLevel = 2.7;

  /** Top of the ground for each tile; -Infinity where there is only sky. */
  private height: Float32Array;
  private kind: Uint8Array;
  private water: Uint8Array;
  /** Extra solid height from things standing on the tile (trunks, pedestals). */
  private block: Float32Array;

  readonly layout: Layout;
  readonly group = new THREE.Group();
  private waterMesh: THREE.InstancedMesh | null = null;
  /** The ground meshes, for checking whether something hides the player. */
  readonly solidMeshes: THREE.Object3D[] = [];

  constructor() {
    const n = this.width * this.depth;
    this.height = new Float32Array(n).fill(-Infinity);
    this.kind = new Uint8Array(n);
    this.water = new Uint8Array(n);
    this.block = new Float32Array(n);

    this.shapeTerrain();
    this.layout = this.placeThings();
    this.buildMeshes();
  }

  // ---- queries -----------------------------------------------------------

  private index(x: number, z: number): number {
    const i = Math.floor(x);
    const j = Math.floor(z);
    if (i < 0 || j < 0 || i >= this.width || j >= this.depth) return -1;
    return j * this.width + i;
  }

  /** Height of solid ground at a point, including anything standing on it. */
  solidAt(x: number, z: number): number {
    const k = this.index(x, z);
    if (k < 0) return -Infinity;
    return this.height[k] + this.block[k];
  }

  /** Height of the bare ground at a point, ignoring trees and pedestals. */
  groundAt(x: number, z: number): number {
    const k = this.index(x, z);
    return k < 0 ? -Infinity : this.height[k];
  }

  /** Highest solid ground under a circle of radius r. */
  solidUnder(x: number, z: number, r: number): number {
    return Math.max(
      this.solidAt(x, z),
      this.solidAt(x - r, z - r),
      this.solidAt(x + r, z - r),
      this.solidAt(x - r, z + r),
      this.solidAt(x + r, z + r),
    );
  }

  isWater(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k >= 0 && this.water[k] === 1;
  }

  isVoid(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k < 0 || this.kind[k] === Kind.Void;
  }

  /** Mark a tile as solid up to `extra` above the ground (a tree, a pedestal). */
  addBlock(x: number, z: number, extra: number): void {
    const k = this.index(x, z);
    if (k >= 0) this.block[k] = Math.max(this.block[k], extra);
  }

  update(time: number): void {
    if (this.waterMesh) this.waterMesh.position.y = Math.sin(time * 1.3) * 0.03;
  }

  // ---- terrain -----------------------------------------------------------

  private set(i: number, j: number, h: number, kind: Kind): void {
    if (i < 0 || j < 0 || i >= this.width || j >= this.depth) return;
    const k = j * this.width + i;
    this.height[k] = h;
    this.kind[k] = kind;
  }

  private get(i: number, j: number): number {
    if (i < 0 || j < 0 || i >= this.width || j >= this.depth) return -Infinity;
    return this.height[j * this.width + i];
  }

  /** Call `fn` for every tile whose centre lies inside an ellipse. */
  private ellipse(
    cx: number,
    cz: number,
    rx: number,
    rz: number,
    fn: (i: number, j: number, d: number) => void,
    wobble = 0,
  ): void {
    for (let j = Math.floor(cz - rz - 2); j <= cz + rz + 2; j++) {
      for (let i = Math.floor(cx - rx - 2); i <= cx + rx + 2; i++) {
        const dx = (i + 0.5 - cx) / rx;
        const dz = (j + 0.5 - cz) / rz;
        const d = dx * dx + dz * dz + (hash(i, j, 7) - 0.5) * wobble;
        if (d < 1) fn(i, j, d);
      }
    }
  }

  private shapeTerrain(): void {
    // Main island: a low meadow in the west, a plateau one step up to the east.
    this.ellipse(
      23,
      22,
      19.5,
      16.5,
      (i, j) => {
        const plateau = i >= 17;
        this.set(i, j, plateau ? 3 : 2, Kind.Grass);
      },
      0.14,
    );

    // The hill in the north, in three jumpable terraces.
    const onIsland = (i: number, j: number) => this.get(i, j) > 0;
    this.ellipse(22, 12, 7, 5, (i, j) => onIsland(i, j) && this.set(i, j, 4, Kind.Grass), 0.1);
    this.ellipse(22, 12, 5, 3.6, (i, j) => onIsland(i, j) && this.set(i, j, 5, Kind.Stone), 0.1);
    this.ellipse(22, 12, 3.2, 2.3, (i, j) => onIsland(i, j) && this.set(i, j, 6, Kind.Stone));

    // The training ground: packed dirt where the tester bad guys wait.
    for (let j = 22; j <= 28; j++) {
      for (let i = 19; i <= 25; i++) this.set(i, j, 3, Kind.Dirt);
    }

    // A worn path from the spawn point, up the ledge, to the training ground.
    for (let i = 11; i <= 18; i++) {
      this.set(i, 27, i >= 17 ? 3 : 2, Kind.Dirt);
      this.set(i, 28, i >= 17 ? 3 : 2, Kind.Dirt);
    }

    // The pond, with a sandy shore and a little islet in the middle.
    this.ellipse(32, 27, 6.2, 5.6, (i, j) => onIsland(i, j) && this.set(i, j, 3, Kind.Sand), 0.12);
    this.ellipse(32, 27, 4.8, 4.2, (i, j) => {
      if (!onIsland(i, j)) return;
      this.set(i, j, 1.5, Kind.Sand);
      this.water[j * this.width + i] = 1;
    });
    this.ellipse(32.5, 27.5, 1.9, 1.9, (i, j) => {
      this.set(i, j, 3, Kind.Grass);
      this.water[j * this.width + i] = 0;
    });

    // The bluff on the east edge: the place to take off from.
    for (let j = 18; j <= 25; j++) {
      for (let i = 38; i <= 43; i++) {
        if (onIsland(i, j)) this.set(i, j, 4, Kind.Stone);
      }
    }

    // A resting cloud halfway across the gap.
    this.ellipse(52, 22, 3.1, 3.1, (i, j) => this.set(i, j, 3, Kind.Cloud));

    // The second cloud island.
    this.ellipse(68, 22, 6.6, 6.2, (i, j) => this.set(i, j, 3, Kind.Grass), 0.14);
    this.ellipse(69.5, 20.5, 2.6, 2.4, (i, j) => this.set(i, j, 4, Kind.Grass));
  }

  // ---- things on the island ----------------------------------------------

  private placeThings(): Layout {
    const layout: Layout = {
      spawn: { x: 10.5, z: 27.5 },
      checkpoints: [
        { id: 'meadow', x: 12.5, z: 25.5 },
        { id: 'middle', x: 29.5, z: 17.5 },
        { id: 'bluff', x: 39.5, z: 20.5 },
        { id: 'far-island', x: 64.5, z: 23.5 },
      ],
      puzzles: [
        { id: 'grove', speaker: { x: 22.5, z: 33.5 }, candle: { x: 24.5, z: 34.5 }, notes: 3 },
        { id: 'hilltop', speaker: { x: 21.5, z: 11.5 }, candle: { x: 23.5, z: 12.5 }, notes: 4 },
        { id: 'islet', speaker: { x: 32.5, z: 26.5 }, candle: { x: 33.5, z: 28.5 }, notes: 5 },
      ],
      enemies: [
        { x: 21.5, z: 24.0, tester: true },
        { x: 23.5, z: 26.5, tester: true },
        // One guard on the hill's lower terrace, two on the pond's south shore.
        // The north side of the pond is left open as the safe way in.
        { x: 17.0, z: 14.5, tester: false },
        { x: 31.5, z: 32.5, tester: false },
        { x: 36.5, z: 30.5, tester: false },
      ],
      bread: [
        { id: 'meadow', x: 13.5, z: 31.5, amount: 5 },
        { id: 'north', x: 31.5, z: 15.5, amount: 5 },
        { id: 'south', x: 36.5, z: 33.5, amount: 5 },
      ],
      trees: [],
      boulders: [
        { x: 19.5, z: 12.5 },
        { x: 24.5, z: 10.5 },
        { x: 16.5, z: 20.5 },
        { x: 36.5, z: 17.5 },
      ],
      goal: { x: 66, z: 22, radius: 4 },
    };

    // A wall of trees hides the first puzzle from the training ground. It is
    // open on the camera's side so you can see it once you walk around.
    const grove: [number, number][] = [
      [19, 31], [20, 31], [21, 31], [22, 31], [23, 31], [24, 31], [25, 31],
      [26, 31], [27, 32], [27, 33], [27, 34], [26, 35],
    ];
    for (const [i, j] of grove) layout.trees.push({ x: i + 0.5, z: j + 0.5 });

    // Scatter the rest, keeping clear of anything the player needs to reach.
    const keepClear: (Spot & { r: number })[] = [
      { ...layout.spawn, r: 3 },
      ...layout.checkpoints.map((c) => ({ ...c, r: 2.5 })),
      ...layout.puzzles.flatMap((p) => [
        { ...p.speaker, r: 2.6 },
        { ...p.candle, r: 2.6 },
      ]),
      ...layout.enemies.map((e) => ({ ...e, r: 2.5 })),
      ...layout.bread.map((b) => ({ ...b, r: 1.5 })),
      ...layout.boulders.map((b) => ({ ...b, r: 1.5 })),
      { x: 22.5, z: 25.5, r: 5.5 }, // training ground
      { x: 16.5, z: 27.5, r: 2.5 }, // the first ledge to hop up
    ];
    for (let j = 0; j < this.depth; j++) {
      for (let i = 0; i < this.width; i++) {
        const k = j * this.width + i;
        if (this.kind[k] !== Kind.Grass || this.height[k] > 4) continue;
        if (hash(i, j, 3) > 0.075) continue;
        const x = i + 0.5;
        const z = j + 0.5;
        if (keepClear.some((c) => Math.hypot(c.x - x, c.z - z) < c.r)) continue;
        if (layout.trees.some((t) => Math.hypot(t.x - x, t.z - z) < 1.5)) continue;
        // Keep trees off the very edge so nothing hangs over the sky.
        if (this.get(i - 1, j) < 0 || this.get(i + 1, j) < 0) continue;
        if (this.get(i, j - 1) < 0 || this.get(i, j + 1) < 0) continue;
        layout.trees.push({ x, z });
      }
    }

    for (const t of layout.trees) this.addBlock(t.x, t.z, 3.4);
    for (const b of layout.boulders) this.addBlock(b.x, b.z, 0.9);
    return layout;
  }

  // ---- meshes ------------------------------------------------------------

  private buildMeshes(): void {
    const tiles: { i: number; j: number; h: number; kind: Kind; bottom: number }[] = [];
    for (let j = 0; j < this.depth; j++) {
      for (let i = 0; i < this.width; i++) {
        const k = j * this.width + i;
        if (this.kind[k] === Kind.Void) continue;
        tiles.push({ i, j, h: this.height[k], kind: this.kind[k], bottom: this.underside(i, j) });
      }
    }

    const unit = new THREE.BoxGeometry(1, 1, 1);
    const capMat = new THREE.MeshLambertMaterial();
    const bodyMat = new THREE.MeshLambertMaterial();
    const caps = new THREE.InstancedMesh(unit, capMat, tiles.length);
    const bodies = new THREE.InstancedMesh(unit, bodyMat, tiles.length);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    const CAP = 0.28;

    tiles.forEach((t, n) => {
      const v = hash(t.i, t.j, 1);
      // Top
      m.makeScale(1, CAP, 1).setPosition(t.i + 0.5, t.h - CAP / 2, t.j + 0.5);
      caps.setMatrixAt(n, m);
      switch (t.kind) {
        case Kind.Grass:
          c.setHSL(0.27 + v * 0.03, 0.52, 0.5 + v * 0.07);
          break;
        case Kind.Sand:
          c.setHSL(0.12, 0.55, 0.74 + v * 0.05);
          break;
        case Kind.Stone:
          c.setHSL(0.6, 0.06, 0.6 + v * 0.07);
          break;
        case Kind.Dirt:
          c.setHSL(0.08, 0.4, 0.58 + v * 0.05);
          break;
        default:
          c.setHSL(0.58, 0.3, 0.97);
      }
      caps.setColorAt(n, c);

      // Column underneath
      const len = t.h - CAP - t.bottom;
      m.makeScale(1, len, 1).setPosition(t.i + 0.5, t.bottom + len / 2, t.j + 0.5);
      bodies.setMatrixAt(n, m);
      switch (t.kind) {
        case Kind.Stone:
          c.setHSL(0.6, 0.06, 0.46 + v * 0.05);
          break;
        case Kind.Sand:
          c.setHSL(0.11, 0.4, 0.6 + v * 0.04);
          break;
        case Kind.Cloud:
          c.setHSL(0.58, 0.35, 0.93);
          break;
        default:
          c.setHSL(0.07, 0.36, 0.38 + v * 0.05);
      }
      bodies.setColorAt(n, c);
    });
    caps.receiveShadow = true;
    bodies.receiveShadow = true;
    bodies.castShadow = true;
    this.group.add(caps, bodies);
    this.solidMeshes.push(caps, bodies);

    // Water
    const wet = tiles.filter((t) => this.water[t.j * this.width + t.i] === 1);
    if (wet.length) {
      const waterMat = new THREE.MeshLambertMaterial({
        color: 0x4cc3f0,
        transparent: true,
        opacity: 0.72,
      });
      const water = new THREE.InstancedMesh(unit, waterMat, wet.length);
      wet.forEach((t, n) => {
        const d = this.waterLevel - t.h;
        m.makeScale(1, d, 1).setPosition(t.i + 0.5, t.h + d / 2, t.j + 0.5);
        water.setMatrixAt(n, m);
      });
      this.waterMesh = water;
      this.group.add(water);
    }

    this.buildCloudSkirt(tiles);
  }

  /** How far down the rock goes under a tile: deeper toward the middle. */
  private underside(i: number, j: number): number {
    const k = j * this.width + i;
    if (this.kind[k] === Kind.Cloud) return this.height[k] - 1.1;
    let edge = 6;
    for (let r = 1; r <= 6 && edge === 6; r++) {
      for (let a = 0; a < 8; a++) {
        const di = Math.round(Math.cos((a * Math.PI) / 4) * r);
        const dj = Math.round(Math.sin((a * Math.PI) / 4) * r);
        if (this.get(i + di, j + dj) < 0) {
          edge = r;
          break;
        }
      }
    }
    return 1.2 - edge * 0.95 - hash(i, j, 5) * 0.8;
  }

  /** Puffs of cloud around the rim, so the islands sit in the sky. */
  private buildCloudSkirt(tiles: { i: number; j: number; kind: Kind }[]): void {
    const rim = tiles.filter(
      (t) =>
        this.get(t.i - 1, t.j) < 0 ||
        this.get(t.i + 1, t.j) < 0 ||
        this.get(t.i, t.j - 1) < 0 ||
        this.get(t.i, t.j + 1) < 0,
    );
    const puff = new THREE.IcosahedronGeometry(1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    const picks = rim.filter((t) => t.kind === Kind.Cloud || hash(t.i, t.j, 9) < 0.55);
    const mesh = new THREE.InstancedMesh(puff, mat, picks.length);
    const m = new THREE.Matrix4();
    picks.forEach((t, n) => {
      const s = t.kind === Kind.Cloud ? 0.9 + hash(t.i, t.j, 11) * 0.5 : 1.3 + hash(t.i, t.j, 11) * 1.4;
      const y = t.kind === Kind.Cloud ? 2.1 : -0.6 - hash(t.i, t.j, 12) * 1.6;
      m.makeScale(s, s * 0.62, s).setPosition(t.i + 0.5, y, t.j + 0.5);
      mesh.setMatrixAt(n, m);
    });
    this.group.add(mesh);
  }
}
