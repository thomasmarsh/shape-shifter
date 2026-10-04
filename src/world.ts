import * as THREE from 'three';
import { ISLANDS } from './islands';
import { BRITTLE_SPEED, fitsUnderKelp, ICE_REGROW, ICE_SPEED, KELP_DEEP } from './forms';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildFrostDecor, SNOW_CAP } from './frost';
import { hash, Island, Kind, Layout, PlateSpot, Spot, TANGLE_GAP, Terrain, TREE_BLOCK } from './layout';

export { Kind, TANGLE_GAP, TREE_BLOCK } from './layout';
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

/** Tiles from west to east. Background clouds in game.ts follow it. */
export const WORLD_WIDTH = 960;

/** Saltmere's water: turquoise, darker and bluer the deeper the bed (2 bright, 4 mid, 7 dark). */
const SEA_STOPS: [number, THREE.Color][] = [
  [2, new THREE.Color(0x46e0d2)],
  [4, new THREE.Color(0x1f9ab8)],
  [7, new THREE.Color(0x0b3f7a)],
];
export function seaWater(depth: number): number {
  const [a, b] = depth < 4 ? [SEA_STOPS[0], SEA_STOPS[1]] : [SEA_STOPS[1], SEA_STOPS[2]];
  const t = Math.min(1, Math.max(0, (depth - a[0]) / (b[0] - a[0])));
  return a[1].clone().lerp(b[1], t).getHex();
}

/** Sunveld's water holes: muddy green-brown in the shallows, dark green in the deep middle. */
export function sunWater(depth: number): number {
  return depth < 2 ? 0x8a7b43 : depth < 4 ? 0x66652f : 0x3a4524;
}

/** How thick the slab of thin ice is drawn. */
const ICE_SLAB = 0.14;
/** Gate bars: how tall, and where the four stand on a tile. */
const BAR_HEIGHT = 40;
const BAR_SPOTS = [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]];

export class World {
  readonly width = WORLD_WIDTH;
  readonly depth = 64;
  /** The default water level; a pond can set its own with `setWater`. */
  readonly waterLevel = 2.7;

  /** Top of the ground for each tile; -Infinity where there is only sky. */
  private height: Float32Array;
  private kind: Uint8Array;
  private water: Uint8Array;
  /** Where the surface is on each water tile. */
  private waterTop: Float64Array;
  /** Extra solid height from things standing on the tile (trunks, speakers). */
  private block: Float32Array;
  /** Solid height of the tree on each tile, 0 where there is none. */
  private tree: Float32Array;
  /**
   * Top of the thin-ice sheet on each tile, -Infinity where there is none. The
   * sheet sits over whatever the tile already is (sky or water) and does not
   * touch `height`, `kind` or `water`.
   */
  private iceTop: Float32Array;
  /** 1 while a thin-ice tile is whole, 0 once broken (and on tiles with no ice). */
  private iceOn: Uint8Array;
  /** Seconds since a thin-ice tile broke. */
  private iceAge: Float32Array;
  /** Every tile that has thin ice, intact or not. */
  private iceTiles: number[] = [];
  /** Real ground speed a thin sheet needs to hold, per tile: ICE_SPEED, BRITTLE_SPEED or 0 for none. */
  private sheet: Float32Array;
  /** Which timed gate a tile belongs to: an index into `gateIds` plus one, 0 where none. */
  private gate: Uint8Array;
  private gateIds: string[] = [];
  /** Seconds each gate stays open, by gate index. A gate is open while this is above 0. */
  private gateTimer: number[] = [];
  /** What the gate bars were last drawn as, by gate index, so only a change redraws them. */
  private gateShown: boolean[] = [];
  private gateDraw: { bars: THREE.InstancedMesh; tiles: number[] }[] = [];
  /** The round plate slabs: which tile and gate each instance is, so a pressed plate can sink. */
  private plateDraw: { slabs: THREE.InstancedMesh; spots: { k: number; gate: number }[] } | null = null;
  /** The plate on each tile, by tile index. */
  private plateAt = new Map<number, PlateSpot>();
  /** The gap of the root tangle on each tile, 0 where there is none. */
  private tangle: Float32Array;
  /** How far below the water surface the kelp mat on each tile hangs, 0 where there is none. */
  private kelp: Float32Array;
  /** Which island last shaped each tile: an index into `ownerIds` plus one, 0 where none did. */
  private owner: Uint8Array;
  private ownerIds: string[] = [];
  private iceRot = new Map<number, number>();
  /** Which instance of which slab mesh (and its frame and cracks) draws a thin-sheet tile. */
  private iceSlot = new Map<number, { slab: THREE.InstancedMesh; cracks: THREE.InstancedMesh; slot: number }>();

  readonly layout: Layout;
  /** Where each island put its ground, for tools like the map printer. */
  readonly bounds: IslandBounds[] = [];
  readonly group = new THREE.Group();
  private waterMesh: THREE.InstancedMesh | null = null;
  private seaMesh: THREE.InstancedMesh | null = null;
  /** The ground meshes, for checking whether something hides the player. */
  readonly solidMeshes: THREE.Object3D[] = [];

  constructor(islands: readonly Island[] = ISLANDS) {
    const n = this.width * this.depth;
    this.height = new Float32Array(n).fill(-Infinity);
    this.kind = new Uint8Array(n);
    this.water = new Uint8Array(n);
    this.waterTop = new Float64Array(n).fill(this.waterLevel);
    this.block = new Float32Array(n);
    this.tree = new Float32Array(n);
    this.iceTop = new Float32Array(n).fill(-Infinity);
    this.iceOn = new Uint8Array(n);
    this.iceAge = new Float32Array(n);
    this.sheet = new Float32Array(n);
    this.gate = new Uint8Array(n);
    this.tangle = new Float32Array(n);
    this.kelp = new Float32Array(n);
    this.owner = new Uint8Array(n);

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

  /**
   * Height of solid ground at a point, including anything standing on it. A
   * root tangle is a wall to a body taller than its gap, and a kelp mat is a
   * wall to a body that cannot dive far enough to get under it. `body` is the
   * height of whoever asks and `dive` is how deep they can go; anyone who does
   * not say is treated as too big and unable to dive.
   */
  solidAt(x: number, z: number, body = Infinity, dive = 0): number {
    const k = this.index(x, z);
    // Beyond the north and south edges is a wall with no top, so nobody flies around
    // the end of a wall that spans the whole depth. East and west stay open.
    if (k < 0) return x >= 0 && x < this.width && (z < 0 || z >= this.depth) ? NO_STAND : -Infinity;
    const walled =
      (body > this.tangle[k] && this.tangle[k] > 0) ||
      (this.kelp[k] > 0 && !fitsUnderKelp(body, dive, this.kelp[k])) ||
      this.closedGate(k);
    const ground = this.height[k] + this.block[k] + (walled ? NO_STAND : 0);
    return this.iceOn[k] ? Math.max(ground, this.iceTop[k]) : ground;
  }

  /** Height of the bare ground at a point, ignoring trees and speakers. */
  groundAt(x: number, z: number): number {
    const k = this.index(x, z);
    if (k < 0) return -Infinity;
    return this.iceOn[k] ? Math.max(this.height[k], this.iceTop[k]) : this.height[k];
  }

  /** How tall the tree block on this tile is (above the ground), 0 if no tree. */
  treeAt(x: number, z: number): number {
    const k = this.index(x, z);
    return k < 0 ? 0 : this.tree[k];
  }

  /** Highest solid ground under a circle of radius r. */
  solidUnder(x: number, z: number, r: number, body = Infinity, dive = 0): number {
    return Math.max(
      this.solidAt(x, z, body, dive),
      this.solidAt(x - r, z - r, body, dive),
      this.solidAt(x + r, z - r, body, dive),
      this.solidAt(x - r, z + r, body, dive),
      this.solidAt(x + r, z + r, body, dive),
    );
  }

  /** True on a tile that Frostfang built: only those are drawn with the frost look. */
  isFrostTile(i: number, j: number): boolean {
    return this.ownerAt(i, j) === 'frostfang';
  }

  /** The id of the island that last shaped a tile, '' for sky (or off the map). */
  ownerAt(i: number, j: number): string {
    if (i < 0 || j < 0 || i >= this.width || j >= this.depth) return '';
    const o = this.owner[j * this.width + i];
    return o === 0 ? '' : this.ownerIds[o - 1];
  }

  /** True on a root tangle tile. */
  isTangle(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k >= 0 && this.tangle[k] > 0;
  }

  /** The gap of the root tangle on a tile, 0 if none. */
  tangleGapAt(x: number, z: number): number {
    const k = this.index(x, z);
    return k < 0 ? 0 : this.tangle[k];
  }

  /** True on a kelp mat tile. */
  isKelp(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k >= 0 && this.kelp[k] > 0;
  }

  /** How far below the surface the kelp mat on a tile hangs, 0 if none. */
  kelpDepthAt(x: number, z: number): number {
    const k = this.index(x, z);
    return k < 0 ? 0 : this.kelp[k];
  }

  isWater(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k >= 0 && this.water[k] === 1 && !this.iceOn[k];
  }

  /** Height of the water surface on the tile at a point (the default level where there is none). */
  waterLevelAt(x: number, z: number): number {
    const k = this.index(x, z);
    return k < 0 ? this.waterLevel : this.waterTop[k];
  }

  isVoid(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k < 0 || (this.kind[k] === Kind.Void && !this.iceOn[k]);
  }

  // ---- thin ice ----------------------------------------------------------

  /** True for a thin-ice tile, whole or broken. */
  isThinIce(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k >= 0 && this.iceTop[k] > -Infinity;
  }

  /** True for a brittle sheet tile, whole or broken. */
  isBrittle(x: number, z: number): boolean {
    return this.sheetSpeedAt(x, z) === BRITTLE_SPEED;
  }

  /** Real ground speed the sheet on a tile needs to hold: ICE_SPEED, BRITTLE_SPEED, or 0 for none. */
  sheetSpeedAt(x: number, z: number): number {
    const k = this.index(x, z);
    return k < 0 ? 0 : this.sheet[k];
  }

  /** Top of the thin-ice sheet on a tile whether whole or broken; -Infinity if none. */
  iceTopAt(x: number, z: number): number {
    const k = this.index(x, z);
    return k < 0 ? -Infinity : this.iceTop[k];
  }

  /** True while a thin-ice tile is whole. */
  isIceIntact(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k >= 0 && this.iceOn[k] === 1;
  }

  /** The tiles a circle of radius r overlaps, as indexes. */
  private footprint(x: number, z: number, r: number): number[] {
    const out: number[] = [];
    for (const [ox, oz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      const k = this.index(x + ox, z + oz);
      if (k >= 0 && !out.includes(k)) out.push(k);
    }
    return out;
  }

  /**
   * The whole thin-ice tiles (as their middles) that carry a body standing at
   * height `y` with a circular footprint of radius r. A tile whose top is well
   * below the feet carries nothing.
   */
  iceHolding(x: number, z: number, r: number, y: number): Spot[] {
    const out: Spot[] = [];
    for (const k of this.footprint(x, z, r)) {
      if (this.iceOn[k] && this.iceTop[k] >= y - 0.05) out.push(this.tileMiddle(k));
    }
    return out;
  }

  private tileMiddle(k: number): Spot {
    return { x: (k % this.width) + 0.5, z: Math.floor(k / this.width) + 0.5 };
  }

  /** Break the thin-ice tiles at these spots. They grow back after ICE_REGROW. */
  breakIce(spots: readonly Spot[]): void {
    for (const s of spots) {
      const k = this.index(s.x, s.z);
      if (k < 0 || !this.iceOn[k]) continue;
      this.iceOn[k] = 0;
      this.iceAge[k] = 0;
      this.showIce(k);
    }
  }

  /** Every thin-ice tile whole again, at once. */
  resetIce(): void {
    for (const k of this.iceTiles) {
      if (this.iceOn[k]) continue;
      this.iceOn[k] = 1;
      this.showIce(k);
    }
  }

  /**
   * Let broken ice grow back. A tile comes back ICE_REGROW seconds after it
   * broke, but never while the circle (x, z, r) overlaps its column, so it
   * cannot trap a swimmer or pop up under a faller.
   */
  stepIce(dt: number, x: number, z: number, r: number): void {
    for (const k of this.iceTiles) {
      if (this.iceOn[k]) continue;
      this.iceAge[k] += dt;
      if (this.iceAge[k] < ICE_REGROW) continue;
      const i = k % this.width;
      const j = Math.floor(k / this.width);
      if (x + r > i && x - r < i + 1 && z + r > j && z - r < j + 1) continue;
      this.iceOn[k] = 1;
      this.showIce(k);
    }
  }

  /** Show or hide the slab (and its cracks) drawn for a tile. */
  private showIce(k: number): void {
    const draw = this.iceSlot.get(k);
    if (!draw) return;
    const m = new THREE.Matrix4();
    const c = new THREE.Matrix4();
    if (this.iceOn[k]) {
      const at = this.tileMiddle(k);
      m.makeScale(1, ICE_SLAB, 1).setPosition(at.x, this.iceTop[k] - ICE_SLAB / 2, at.z);
      c.makeRotationY(this.iceRot.get(k) ?? 0).setPosition(at.x, this.iceTop[k] + 0.012, at.z);
    } else {
      m.makeScale(0, 0, 0);
      c.makeScale(0, 0, 0);
    }
    draw.slab.setMatrixAt(draw.slot, m);
    draw.slab.instanceMatrix.needsUpdate = true;
    draw.cracks.setMatrixAt(draw.slot, c);
    draw.cracks.instanceMatrix.needsUpdate = true;
  }

  // ---- timed gates -------------------------------------------------------

  private closedGate(k: number): boolean {
    const g = this.gate[k];
    return g > 0 && !(this.gateTimer[g - 1] > 0);
  }

  /** True on a tile of any timed gate, open or closed. */
  isGate(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k >= 0 && this.gate[k] > 0;
  }

  /** True on a tile of a timed gate that is shut right now. */
  isClosedGate(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k >= 0 && this.closedGate(k);
  }

  /** True while gate `id` is open. An unknown gate counts as shut. */
  gateOpen(id: string): boolean {
    const g = this.gateIds.indexOf(id);
    return g >= 0 && this.gateTimer[g] > 0;
  }

  /** Open gate `id` for at least `seconds` more. */
  pressPlate(id: string, seconds: number): void {
    const g = this.gateIds.indexOf(id);
    if (g >= 0) this.gateTimer[g] = Math.max(this.gateTimer[g], seconds);
  }

  /** The plate whose tile holds this point, if any. */
  plateAtPoint(x: number, z: number): PlateSpot | null {
    const k = this.index(x, z);
    return k < 0 ? null : (this.plateAt.get(k) ?? null);
  }

  /**
   * Run the gates for one frame. A body on the ground with its centre on a
   * plate holds that plate's gate open at the plate's `seconds`; every other
   * gate counts down. A gate never closes on the circle (x, z, r): while it
   * overlaps a tile of the gate, the gate stays open.
   */
  stepGates(dt: number, x: number, z: number, r: number, grounded: boolean): void {
    if (this.gateIds.length === 0) return;
    const pressed = new Set<number>();
    const plate = grounded ? this.plateAtPoint(x, z) : null;
    if (plate) {
      this.pressPlate(plate.gate, plate.seconds);
      pressed.add(this.gateIds.indexOf(plate.gate));
    }
    for (let g = 0; g < this.gateTimer.length; g++) {
      if (!pressed.has(g)) this.gateTimer[g] = Math.max(0, this.gateTimer[g] - dt);
    }
    for (const [at, d] of this.gateDraw.entries()) {
      if (this.gateTimer[at] <= 0 && d.tiles.some((k) => this.overlaps(k, x, z, r))) this.gateTimer[at] = 1e-6;
      this.showGate(at);
    }
  }

  /** Every gate shut again, as at the start. */
  resetGates(): void {
    this.gateTimer.fill(0);
    this.gateDraw.forEach((_, g) => this.showGate(g));
  }

  private overlaps(k: number, x: number, z: number, r: number): boolean {
    const i = k % this.width;
    const j = Math.floor(k / this.width);
    return x + r > i && x - r < i + 1 && z + r > j && z - r < j + 1;
  }

  /** Raise the bars of a gate when it shuts, sink them when it opens. */
  private showGate(g: number): void {
    const draw = this.gateDraw[g];
    if (!draw) return;
    const open = this.gateTimer[g] > 0;
    if (this.gateShown[g] === open) return;
    this.gateShown[g] = open;
    const m = new THREE.Matrix4();
    let n = 0;
    for (const k of draw.tiles) {
      const at = this.tileMiddle(k);
      const top = this.height[k];
      for (const [ox, oz] of BAR_SPOTS) {
        if (open) m.makeScale(0, 0, 0);
        else m.makeScale(0.12, BAR_HEIGHT, 0.12).setPosition(at.x + ox, top + BAR_HEIGHT / 2, at.z + oz);
        draw.bars.setMatrixAt(n++, m);
      }
    }
    draw.bars.instanceMatrix.needsUpdate = true;
    this.showPlates(g, open);
  }

  /** A plate sits slightly proud of the ground; while its gate is open it is pressed flat. */
  private showPlates(g: number, pressed: boolean): void {
    const draw = this.plateDraw;
    if (!draw) return;
    const m = new THREE.Matrix4();
    draw.spots.forEach((s, n) => {
      if (s.gate !== g) return;
      const thick = pressed ? 0.03 : 0.1;
      m.makeScale(0.8, thick, 0.8).setPosition(this.tileMiddle(s.k).x, this.height[s.k] + thick / 2, this.tileMiddle(s.k).z);
      draw.slabs.setMatrixAt(n, m);
    });
    draw.slabs.instanceMatrix.needsUpdate = true;
  }

  private buildGates(): void {
    this.gateIds.forEach((_, g) => {
      const tiles: number[] = [];
      for (let k = 0; k < this.gate.length; k++) if (this.gate[k] === g + 1) tiles.push(k);
      const bars = new THREE.InstancedMesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshLambertMaterial({ color: 0x2a2623 }), // dark iron bars
        tiles.length * BAR_SPOTS.length,
      );
      bars.name = 'gate';
      this.gateDraw[g] = { bars, tiles };
      this.group.add(bars);
      this.showGate(g);
    });
    if (this.plateAt.size === 0) return;
    // A round bronze plate.
    const slabs = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, 20),
      new THREE.MeshLambertMaterial({ color: 0xb5742f }),
      this.plateAt.size,
    );
    slabs.name = 'plate';
    const spots = [...this.plateAt.entries()].map(([k, p]) => ({ k, gate: this.gateIds.indexOf(p.gate) }));
    this.plateDraw = { slabs, spots };
    spots.forEach((s) => this.showPlates(s.gate, this.gateTimer[s.gate] > 0));
    this.group.add(slabs);
  }

  /** Mark a tile as solid up to `extra` above the ground (a tree, a speaker). */
  addBlock(x: number, z: number, extra: number): void {
    const k = this.index(x, z);
    if (k >= 0) this.block[k] = Math.max(this.block[k], extra);
  }

  update(time: number): void {
    const bob = Math.sin(time * 1.3) * 0.03;
    if (this.waterMesh) this.waterMesh.position.y = bob;
    if (this.seaMesh) this.seaMesh.position.y = bob;
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
        this.iceTop[at(i, j)] = -Infinity;
        this.iceOn[at(i, j)] = 0;
        this.sheet[at(i, j)] = 0;
        this.gate[at(i, j)] = 0;
        this.tangle[at(i, j)] = 0;
        this.kelp[at(i, j)] = 0;
      },
      setWater: (i, j, wet, level = this.waterLevel) => {
        if (!inside(i, j)) return;
        this.water[at(i, j)] = wet ? 1 : 0;
        this.waterTop[at(i, j)] = level;
      },
      setThinIce: (i, j, h) => {
        if (!inside(i, j)) return;
        this.iceTop[at(i, j)] = h;
        this.iceOn[at(i, j)] = 1;
        this.sheet[at(i, j)] = ICE_SPEED;
      },
      setBrittle: (i, j, h) => {
        if (!inside(i, j)) return;
        this.iceTop[at(i, j)] = h;
        this.iceOn[at(i, j)] = 1;
        this.sheet[at(i, j)] = BRITTLE_SPEED;
      },
      setGate: (i, j, id) => {
        if (!inside(i, j)) return;
        let g = this.gateIds.indexOf(id);
        if (g < 0) {
          g = this.gateIds.push(id) - 1;
          this.gateTimer[g] = 0;
        }
        this.gate[at(i, j)] = g + 1;
      },
      setTangle: (i, j, gap = TANGLE_GAP) => {
        if (!inside(i, j)) return;
        this.tangle[at(i, j)] = gap;
      },
      setKelp: (i, j, depth) => {
        if (!inside(i, j)) return;
        this.kelp[at(i, j)] = depth;
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
      plates: [],
    };
    let hasSpawn = false;
    for (const island of islands) {
      const before = this.height.slice();
      const beforeIce = this.iceTop.slice();
      const beforeKind = this.kind.slice();
      const part = island.build(terrain);
      this.noteBounds(island, before, beforeIce);
      this.noteOwner(island, before, beforeIce, beforeKind);
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
      layout.plates.push(...(part.plates ?? []));
    }
    if (!hasSpawn) throw new Error('No island has a spawn point');
    this.checkKelp();
    for (const p of layout.plates) {
      if (!this.gateIds.includes(p.gate)) throw new Error(`A plate opens gate "${p.gate}", which has no tiles`);
      this.plateAt.set(this.index(p.x, p.z), p);
    }
    for (let k = 0; k < this.iceTop.length; k++) {
      if (this.iceTop[k] > -Infinity) this.iceTiles.push(k);
    }
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

  /** A mat must hang over water at least `depth + 2` deep, so there is room for a body under it. */
  private checkKelp(): void {
    for (let k = 0; k < this.kelp.length; k++) {
      if (this.kelp[k] <= 0) continue;
      const at = `(${k % this.width}, ${Math.floor(k / this.width)})`;
      if (this.water[k] !== 1) throw new Error(`Kelp at ${at} is not on a water tile`);
      if (this.waterTop[k] - this.height[k] < this.kelp[k] + 2) {
        throw new Error(`Kelp at ${at} hangs ${this.kelp[k]} below the surface, but the water is too shallow`);
      }
    }
  }

  /** Remember which island last shaped each tile, for the look of its ground, water and thin sheets. */
  private noteOwner(island: Island, before: Float32Array, beforeIce: Float32Array, beforeKind: Uint8Array): void {
    let id = this.ownerIds.indexOf(island.id);
    if (id < 0) id = this.ownerIds.push(island.id) - 1;
    for (let k = 0; k < before.length; k++) {
      if (this.height[k] === before[k] && this.iceTop[k] === beforeIce[k] && this.kind[k] === beforeKind[k]) continue;
      this.owner[k] = id + 1;
    }
  }

  /** Remember the box around every tile this island changed, thin ice included. */
  private noteBounds(island: Island, before: Float32Array, beforeIce: Float32Array): void {
    const box = { id: island.id, name: island.name, i0: Infinity, j0: Infinity, i1: -Infinity, j1: -Infinity };
    for (let k = 0; k < before.length; k++) {
      if (this.height[k] === before[k] && this.iceTop[k] === beforeIce[k]) continue;
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
    const CAP_THIN = 0.28;

    tiles.forEach((t, n) => {
      const v = hash(t.i, t.j, 1);
      const frost = this.isFrostTile(t.i, t.j);
      // Frostfang's snow is a thick white blanket over dark rock.
      const CAP = frost && t.kind === Kind.Snow ? SNOW_CAP : CAP_THIN;
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
        case Kind.Salt:
          c.setHSL(0.03, 0.3, 0.9 + v * 0.05);
          break;
        case Kind.Straw:
          c.setHSL(0.13 + v * 0.02, 0.62, 0.55 + v * 0.06);
          break;
        case Kind.Clay:
          c.setHSL(0.04 + v * 0.015, 0.58, 0.46 + v * 0.05);
          break;
        case Kind.Moss:
          c.setHSL(0.43 + v * 0.03, 0.55, 0.3 + v * 0.06);
          break;
        case Kind.Bark:
          c.setHSL(0.07 + v * 0.02, 0.5, 0.36 + v * 0.06);
          break;
        case Kind.Stone:
          // Frostfang's rock is dark and frosted, not Highcrag's grey.
          if (frost) c.setHSL(0.61, 0.28, 0.3 + v * 0.07);
          else c.setHSL(0.6, 0.06, 0.6 + v * 0.07);
          break;
        case Kind.Dirt:
          c.setHSL(0.08, 0.4, 0.58 + v * 0.05);
          break;
        case Kind.Snow: {
          // Bright white, with a drift-sized wash of cool blue across it.
          const drift = (Math.sin(t.i * 0.55 + t.j * 0.3) + Math.sin(t.j * 0.7 - t.i * 0.2)) * 0.5;
          c.setHSL(0.58, 0.35 + v * 0.2, 0.92 + drift * 0.025 + v * 0.04);
          break;
        }
        case Kind.Ice:
          c.setHSL(0.52, 0.85, 0.68 + v * 0.07);
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
          if (frost) c.setHSL(0.62, 0.38, 0.19 + v * 0.05);
          else c.setHSL(0.6, 0.06, 0.46 + v * 0.05);
          break;
        case Kind.Salt:
        case Kind.Sand:
          c.setHSL(0.11, 0.4, 0.6 + v * 0.04);
          break;
        case Kind.Straw:
          c.setHSL(0.1, 0.38, 0.5 + v * 0.04);
          break;
        case Kind.Clay:
          c.setHSL(0.03, 0.5, 0.27 + v * 0.05);
          break;
        case Kind.Cloud:
          c.setHSL(0.58, 0.35, 0.93);
          break;
        case Kind.Snow:
          // Dark rock, so the cliff faces read against the white tops.
          c.setHSL(0.62, 0.28, 0.22 + v * 0.05);
          break;
        case Kind.Ice:
          c.setHSL(0.55, 0.55, 0.46 + v * 0.06);
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

    // Water. Saltmere's sea is its own, slightly clearer mesh, so the bed, a sea
    // pickle and a diver show through.
    const wet = tiles.filter((t) => this.water[t.j * this.width + t.i] === 1);
    const makeWater = (list: typeof wet, opacity: number, name: string, paint: (t: (typeof wet)[0], d: number) => number) => {
      if (list.length === 0) return null;
      // No depth write: the water must not hide the translucent glow of what lies under it.
      const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false });
      const water = new THREE.InstancedMesh(unit, mat, list.length);
      water.name = name;
      list.forEach((t, n) => {
        const d = this.waterTop[t.j * this.width + t.i] - t.h;
        m.makeScale(1, d, 1).setPosition(t.i + 0.5, t.h + d / 2, t.j + 0.5);
        water.setMatrixAt(n, m);
        water.setColorAt(n, c.setHex(paint(t, d)));
      });
      this.group.add(water);
      return water;
    };
    const isSea = (t: (typeof wet)[0]) => this.ownerAt(t.i, t.j) === 'saltmere';
    // Pond water is bright; a frozen lake is deep, cold and dark under its ice.
    this.waterMesh = makeWater(
      wet.filter((t) => !isSea(t)),
      0.72,
      'water',
      (t) => {
        const k = t.j * this.width + t.i;
        if (this.iceTop[k] > -Infinity) return 0x2f7fb5;
        if (this.ownerAt(t.i, t.j).startsWith('sunveld')) return sunWater(this.waterTop[k] - t.h);
        return this.isFrostTile(t.i, t.j) ? 0x3aa0d0 : 0x4cc3f0;
      },
    );
    this.seaMesh = makeWater(wet.filter(isSea), 0.6, 'sea-water', (_t, d) => seaWater(d));

    this.buildThinIce();
    this.buildGates();
    this.buildTangles();
    this.buildKelp();
    this.buildCloudSkirt(tiles);
    this.group.add(
      buildFrostDecor({
        width: this.width,
        depth: this.depth,
        height: (i, j) => this.get(i, j),
        kind: (i, j) => this.kind[j * this.width + i],
        wet: (i, j) => this.water[j * this.width + i] === 1,
        frost: (i, j) => this.isFrostTile(i, j),
        layout: this.layout,
      }),
    );
  }

  /**
   * One thin pale slab per thin-sheet tile, with no column under it, and a frame
   * and cracks on top so it reads as something you could fall through. What it
   * is depends on who built the tile: Underroot's is a leaf mat (green-amber,
   * dark green frame), Saltmere's is salt crust (white with a faint pink-grey
   * tint, pale grey frame, no blue glow), anything else is see-through ice
   * with a white frame.
   */
  private buildThinIce(): void {
    if (this.iceTiles.length === 0) return;
    const looks = {
      ice: { tint: 0xa8dcff, frame: 0xffffff },
      leaf: { tint: 0xc4c25a, frame: 0x2f5a28 },
      salt: { tint: 0xf0e4e6, frame: 0xaaa5a9 },
      sun: { tint: 0xd9b27a, frame: 0x7a4a22 },
    };
    const lookOf = (k: number): keyof typeof looks => {
      const owner = this.ownerAt(k % this.width, Math.floor(k / this.width));
      if (owner.startsWith('sunveld')) return 'sun';
      return owner === 'underroot' ? 'leaf' : owner === 'saltmere' ? 'salt' : 'ice';
    };
    const brittle = (k: number) => this.sheet[k] === BRITTLE_SPEED;
    const slab = new THREE.BoxGeometry(1, 1, 1);
    const build = (tiles: number[], mat: THREE.Material, name: string) => {
      if (tiles.length === 0) return;
      const mesh = new THREE.InstancedMesh(slab, mat, tiles.length);
      mesh.name = name;
      const cracks = new THREE.InstancedMesh(
        crackGeometry(),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }),
        tiles.length,
      );
      cracks.name = `${name}-cracks`;
      tiles.forEach((k, n) => {
        this.iceSlot.set(k, { slab: mesh, cracks, slot: n });
        this.iceRot.set(k, Math.floor(hash(k % this.width, Math.floor(k / this.width), 21) * 4) * (Math.PI / 2));
        const look = brittle(k) ? { tint: 0xf6dfae, frame: 0x2e1a08 } : looks[lookOf(k)];
        mesh.setColorAt(n, new THREE.Color(look.tint));
        cracks.setColorAt(n, new THREE.Color(look.frame));
      });
      this.group.add(mesh, cracks);
    };
    build(
      this.iceTiles.filter((k) => !brittle(k) && lookOf(k) !== 'salt' && lookOf(k) !== 'sun'),
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x2c5f86, transparent: true, opacity: 0.6 }),
      'thin-ice',
    );
    build(
      this.iceTiles.filter((k) => !brittle(k) && lookOf(k) === 'salt'),
      new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 }),
      'salt-crust',
    );
    // Sun crust: solid baked ochre with a dark cracked frame, no glow.
    build(
      this.iceTiles.filter((k) => !brittle(k) && lookOf(k) === 'sun'),
      new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 }),
      'sun-crust',
    );
    build(
      this.iceTiles.filter(brittle),
      new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x6b3f10, transparent: true, opacity: 0.85 }),
      'brittle',
    );
    for (const k of this.iceTiles) this.showIce(k);
  }

  /**
   * Each tangle tile is a low brown weave of thin boxes with one pale, see-through
   * strand rising 8 to 10 above it, so the wall nothing can fly over still reads
   * as going up out of sight without hiding what is inside. The strands cast no
   * shadow. Look only: nothing here collides.
   */
  private buildTangles(): void {
    const tiles: number[] = [];
    for (let k = 0; k < this.tangle.length; k++) if (this.tangle[k] > 0) tiles.push(k);
    if (tiles.length === 0) return;
    const WEAVE = 4;
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const weave = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial(), tiles.length * WEAVE);
    // Thorn threads are faint red-brown instead of pale straw.
    const strands = new THREE.InstancedMesh(
      unit,
      new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false }),
      tiles.length,
    );
    weave.name = 'tangle-weave';
    strands.name = 'tangle-strands';
    const m = new THREE.Matrix4();
    const rot = new THREE.Matrix4();
    const c = new THREE.Color();
    tiles.forEach((k, n) => {
      const i = k % this.width;
      const j = Math.floor(k / this.width);
      const h = this.height[k];
      const thorn = this.ownerAt(i, j).startsWith('sunveld');
      for (let w = 0; w < WEAVE; w++) {
        const r = hash(i, j, 40 + w);
        // Long thin boxes laid crosswise at slightly different heights and angles.
        m.makeRotationY(r * Math.PI).multiply(rot.makeScale(0.95, 0.12, 0.14));
        m.setPosition(i + 0.5 + (hash(i, j, 50 + w) - 0.5) * 0.3, h + 0.1 + w * 0.12, j + 0.5 + (hash(i, j, 60 + w) - 0.5) * 0.3);
        weave.setMatrixAt(n * WEAVE + w, m);
        // Sunveld's tangle is red-brown thorn.
        if (thorn) c.setHSL(0.015 + r * 0.02, 0.6, 0.2 + hash(i, j, 70 + w) * 0.08);
        else c.setHSL(0.07 + r * 0.03, 0.45, 0.22 + hash(i, j, 70 + w) * 0.1);
        weave.setColorAt(n * WEAVE + w, c);
      }
      const len = 8 + hash(i, j, 80) * 2;
      m.makeScale(0.035, len, 0.035);
      m.setPosition(i + 0.15 + hash(i, j, 90) * 0.7, h + len / 2, j + 0.15 + hash(i, j, 100) * 0.7);
      strands.setMatrixAt(n, m);
      strands.setColorAt(n, c.setHex(thorn ? 0xb0654a : 0xd8c7a0));
    });
    weave.castShadow = true;
    this.group.add(weave, strands);
  }

  /**
   * A kelp mat floats on the water and hangs `kelp` below it: a low, wet, dark
   * green weave of crossed thin boxes at the surface, and a few thin fronds
   * hanging down to the mat's depth. Deep mats are darker. Look only: nothing
   * here collides, and nothing rises above the water.
   */
  private buildKelp(): void {
    const tiles: number[] = [];
    for (let k = 0; k < this.kelp.length; k++) if (this.kelp[k] > 0) tiles.push(k);
    if (tiles.length === 0) return;
    const WEAVE = 4;
    const FRONDS = 4;
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const mats = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial(), tiles.length * WEAVE);
    const fronds = new THREE.InstancedMesh(unit, new THREE.MeshLambertMaterial(), tiles.length * FRONDS);
    mats.name = 'kelp-mats';
    fronds.name = 'kelp-fronds';
    const m = new THREE.Matrix4();
    const rot = new THREE.Matrix4();
    const c = new THREE.Color();
    tiles.forEach((k, n) => {
      const i = k % this.width;
      const j = Math.floor(k / this.width);
      const top = this.waterTop[k];
      const deep = this.kelp[k] >= KELP_DEEP;
      for (let w = 0; w < WEAVE; w++) {
        const r = hash(i, j, 110 + w);
        // Flat strips laid crosswise, just proud of the water.
        m.makeRotationY((w / WEAVE) * Math.PI + r * 0.4).multiply(rot.makeScale(0.96, 0.07, 0.17));
        m.setPosition(i + 0.5 + (hash(i, j, 120 + w) - 0.5) * 0.2, top + 0.04 + w * 0.025, j + 0.5 + (hash(i, j, 130 + w) - 0.5) * 0.2);
        mats.setMatrixAt(n * WEAVE + w, m);
        c.setHSL(0.36 + r * 0.04, 0.5, (deep ? 0.1 : 0.17) + hash(i, j, 140 + w) * 0.04);
        mats.setColorAt(n * WEAVE + w, c);
      }
      for (let f = 0; f < FRONDS; f++) {
        const len = this.kelp[k] * (0.8 + hash(i, j, 150 + f) * 0.2);
        m.makeScale(0.07, len, 0.07);
        m.setPosition(
          i + 0.2 + (f % 2) * 0.6 + (hash(i, j, 160 + f) - 0.5) * 0.15,
          top - len / 2,
          j + 0.2 + Math.floor(f / 2) * 0.6 + (hash(i, j, 170 + f) - 0.5) * 0.15,
        );
        fronds.setMatrixAt(n * FRONDS + f, m);
        c.setHSL(0.33 + hash(i, j, 180 + f) * 0.05, 0.55, (deep ? 0.14 : 0.24) + hash(i, j, 190 + f) * 0.04);
        fronds.setColorAt(n * FRONDS + f, c);
      }
    });
    mats.receiveShadow = true;
    this.group.add(mats, fronds);
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

/** A frosted rim round the tile and a star of cracks across it, as flat strips. */
function crackGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const strip = (x0: number, z0: number, x1: number, z1: number, w: number): void => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const g = new THREE.BoxGeometry(len, 0.012, w);
    g.rotateY(-Math.atan2(z1 - z0, x1 - x0));
    g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    parts.push(g);
  };
  // The rim: wide and soft on the inside edge of the tile.
  const e = 0.46;
  strip(-e - 0.03, -e, e + 0.03, -e, 0.055);
  strip(-e - 0.03, e, e + 0.03, e, 0.055);
  strip(-e, -e, -e, e, 0.055);
  strip(e, -e, e, e, 0.055);
  // Cracks fan out from a point off the middle, and fork.
  const cx = -0.08;
  const cz = 0.05;
  const rays: [number, number, number, number][] = [
    [cx, cz, 0.3, -0.28],
    [cx, cz, 0.4, 0.22],
    [cx, cz, -0.1, 0.4],
    [cx, cz, -0.4, -0.12],
    [cx, cz, -0.2, -0.4],
    [0.3, -0.28, 0.42, -0.4],
    [0.3, -0.28, 0.14, -0.42],
    [0.4, 0.22, 0.33, 0.4],
    [-0.4, -0.12, -0.45, 0.14],
    [-0.1, 0.4, -0.3, 0.45],
  ];
  for (const [a, b, c, d] of rays) strip(a, b, c, d, 0.03);
  return mergeGeometries(parts) as THREE.BufferGeometry;
}
