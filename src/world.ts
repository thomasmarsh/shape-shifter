import * as THREE from 'three';
import { ISLANDS } from './islands';
import { hash, Island, Kind, Layout, Terrain, TREE_BLOCK } from './layout';

export { Kind, TREE_BLOCK } from './layout';
export type {
  Arrival,
  EnemySpot,
  HintZone,
  Island,
  IslandLayout,
  Layout,
  PuzzleSpot,
  Spot,
  Terrain,
  TreeKind,
  TreeSpot,
} from './layout';

// The world is a grid of one-by-one tiles. Each tile is either empty sky or a
// column of ground with a height. Everything that collides - the player, bad
// guys - asks the world how high the ground is at a point.
//
// The islands (src/islands/) shape the ground and say what stands on it; the
// world keeps the grid, answers the queries and builds the meshes.
//
// x runs east, z runs south, y is up. Tile (i, j) covers x in [i, i+1) and
// z in [j, j+1).

/** The box of tiles (bounds inclusive) that one island shaped. */
export interface IslandBounds {
  id: string;
  name: string;
  i0: number;
  j0: number;
  i1: number;
  j1: number;
}

/**
 * Speakers, candles and checkpoints are "no standing" tiles: a solid column far
 * taller than anything can climb, jump or fly over, so nothing can land on one
 * or pass over it. Players slide round them like a wall.
 */
export const NO_STAND = 100;
const BOULDER = 0.9;

export class World {
  readonly width = 220;
  readonly depth = 64;
  readonly waterLevel = 2.7;

  /** Top of the ground for each tile; -Infinity where there is only sky. */
  private height: Float32Array;
  private kind: Uint8Array;
  private water: Uint8Array;
  /** Extra solid height from things standing on the tile (trunks, speakers). */
  private block: Float32Array;
  /** Solid height of the tree on each tile, 0 where there is none. */
  private tree: Float32Array;

  readonly layout: Layout;
  /** Where each island put its ground, for tools like the map printer. */
  readonly bounds: IslandBounds[] = [];
  readonly group = new THREE.Group();
  private waterMesh: THREE.InstancedMesh | null = null;
  /** The ground meshes, for checking whether something hides the player. */
  readonly solidMeshes: THREE.Object3D[] = [];

  constructor(islands: readonly Island[] = ISLANDS) {
    const n = this.width * this.depth;
    this.height = new Float32Array(n).fill(-Infinity);
    this.kind = new Uint8Array(n);
    this.water = new Uint8Array(n);
    this.block = new Float32Array(n);
    this.tree = new Float32Array(n);

    this.layout = this.buildIslands(islands);
    this.placeBlocks();
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

  /** Height of the bare ground at a point, ignoring trees and speakers. */
  groundAt(x: number, z: number): number {
    const k = this.index(x, z);
    return k < 0 ? -Infinity : this.height[k];
  }

  /** How tall the tree block on this tile is (above the ground), 0 if no tree. */
  treeAt(x: number, z: number): number {
    const k = this.index(x, z);
    return k < 0 ? 0 : this.tree[k];
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

  /** Mark a tile as solid up to `extra` above the ground (a tree, a speaker). */
  addBlock(x: number, z: number, extra: number): void {
    const k = this.index(x, z);
    if (k >= 0) this.block[k] = Math.max(this.block[k], extra);
  }

  update(time: number): void {
    if (this.waterMesh) this.waterMesh.position.y = Math.sin(time * 1.3) * 0.03;
  }

  // ---- islands -----------------------------------------------------------

  private get(i: number, j: number): number {
    if (i < 0 || j < 0 || i >= this.width || j >= this.depth) return -Infinity;
    return this.height[j * this.width + i];
  }

  /** The tools an island module uses to shape its ground. */
  private makeTerrain(): Terrain {
    const inside = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < this.width && j < this.depth;
    const at = (i: number, j: number): number => j * this.width + i;
    const terrain: Terrain = {
      set: (i, j, h, kind) => {
        if (!inside(i, j)) return;
        this.height[at(i, j)] = h;
        this.kind[at(i, j)] = kind;
      },
      get: (i, j) => this.get(i, j),
      kindAt: (i, j) => (inside(i, j) ? this.kind[at(i, j)] : Kind.Void),
      clear: (i, j) => {
        if (!inside(i, j)) return;
        this.height[at(i, j)] = -Infinity;
        this.kind[at(i, j)] = Kind.Void;
        this.water[at(i, j)] = 0;
      },
      setWater: (i, j, wet) => {
        if (inside(i, j)) this.water[at(i, j)] = wet ? 1 : 0;
      },
      rect: (i0, j0, i1, j1, fn) => {
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) fn(i, j);
        }
      },
      ellipse: (cx, cz, rx, rz, fn, wobble = 0) => {
        for (let j = Math.floor(cz - rz - 2); j <= cz + rz + 2; j++) {
          for (let i = Math.floor(cx - rx - 2); i <= cx + rx + 2; i++) {
            const dx = (i + 0.5 - cx) / rx;
            const dz = (j + 0.5 - cz) / rz;
            const d = dx * dx + dz * dz + (hash(i, j, 7) - 0.5) * wobble;
            if (d < 1) fn(i, j, d);
          }
        }
      },
      hash,
    };
    return terrain;
  }

  /** Let every island shape its ground, then merge what they place. */
  private buildIslands(islands: readonly Island[]): Layout {
    const terrain = this.makeTerrain();
    const layout: Layout = {
      spawn: { x: NaN, z: NaN },
      checkpoints: [],
      puzzles: [],
      enemies: [],
      bread: [],
      trees: [],
      boulders: [],
      hints: [],
      arrivals: [],
    };
    let hasSpawn = false;
    for (const island of islands) {
      const before = this.height.slice();
      const part = island.build(terrain);
      this.noteBounds(island, before);
      if (part.spawn && !hasSpawn) {
        layout.spawn = part.spawn;
        hasSpawn = true;
      }
      layout.checkpoints.push(...(part.checkpoints ?? []));
      layout.puzzles.push(...(part.puzzles ?? []));
      layout.enemies.push(...(part.enemies ?? []));
      layout.bread.push(...(part.bread ?? []));
      layout.trees.push(...(part.trees ?? []));
      layout.boulders.push(...(part.boulders ?? []));
      layout.hints.push(...(part.hints ?? []));
      layout.arrivals.push(...(part.arrivals ?? []));
    }
    if (!hasSpawn) throw new Error('No island has a spawn point');
    // Saves and hints refer to these by id, so a clash would be a silent bug.
    for (const [what, items] of [
      ['checkpoint', layout.checkpoints],
      ['puzzle', layout.puzzles],
      ['bread', layout.bread],
      ['hint', layout.hints],
      ['arrival', layout.arrivals],
    ] as const) {
      const seen = new Set<string>();
      for (const item of items) {
        if (seen.has(item.id)) throw new Error(`Two ${what}s are called "${item.id}"`);
        seen.add(item.id);
      }
    }
    return layout;
  }

  /** Remember the box around every tile this island changed. */
  private noteBounds(island: Island, before: Float32Array): void {
    const box = { id: island.id, name: island.name, i0: Infinity, j0: Infinity, i1: -Infinity, j1: -Infinity };
    for (let k = 0; k < before.length; k++) {
      if (this.height[k] === before[k]) continue;
      const i = k % this.width;
      const j = Math.floor(k / this.width);
      box.i0 = Math.min(box.i0, i);
      box.j0 = Math.min(box.j0, j);
      box.i1 = Math.max(box.i1, i);
      box.j1 = Math.max(box.j1, j);
    }
    if (box.i0 <= box.i1) this.bounds.push(box);
  }

  /** Make trees and boulders solid, and speakers, candles and checkpoints impassable. */
  private placeBlocks(): void {
    for (const t of this.layout.trees) {
      this.addBlock(t.x, t.z, TREE_BLOCK[t.kind]);
      this.tree[this.index(t.x, t.z)] = TREE_BLOCK[t.kind];
    }
    for (const b of this.layout.boulders) this.addBlock(b.x, b.z, BOULDER);
    for (const p of this.layout.puzzles) {
      this.addBlock(p.speaker.x, p.speaker.z, NO_STAND);
      this.addBlock(p.candle.x, p.candle.z, NO_STAND);
    }
    for (const c of this.layout.checkpoints) this.addBlock(c.x, c.z, NO_STAND);
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
  private buildCloudSkirt(tiles: { i: number; j: number; h: number; kind: Kind }[]): void {
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
      const y = t.kind === Kind.Cloud ? t.h - 0.9 : -0.6 - hash(t.i, t.j, 12) * 1.6;
      m.makeScale(s, s * 0.62, s).setPosition(t.i + 0.5, y, t.j + 0.5);
      mesh.setMatrixAt(n, m);
    });
    this.group.add(mesh);
  }
}
