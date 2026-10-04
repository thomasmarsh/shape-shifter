import { expect } from 'vitest';
import type { FormId } from '../forms';
import { reachesAny, type Profile, type Reach, type XRange } from '../levelcheck';
import { exploreCached } from '../explorecache';
import type { PlateSpot } from '../layout';
import type { Spot, World } from '../world';

// Checks every island's tests repeat. Each takes the world (and the things)
// and fails with a message that names the thing and the tile.

export type Tile = [number, number];
interface Placed extends Spot {
  id?: string;
}

/** Where a player respawns at a checkpoint: one tile west and one south. */
export const respawnOf = (c: Spot): Spot => ({ x: c.x - 1, z: c.z + 1 });

export const inBox = (i: number, j: number, i0: number, j0: number, i1: number, j1: number): boolean =>
  i >= i0 && i <= i1 && j >= j0 && j <= j1;

/** Every tile in the columns [x0, x1) that is not void. */
export function solidTiles(world: World, { x0, x1 }: XRange): Tile[] {
  const tiles: Tile[] = [];
  for (let j = 0; j < world.depth; j++) {
    for (let i = x0; i < Math.min(x1, world.width); i++) if (!world.isVoid(i + 0.5, j + 0.5)) tiles.push([i, j]);
  }
  return tiles;
}

/**
 * An explore that sees only the island's columns (see `explore`), sharing results
 * inside one test file. Give the island's own x range plus a margin for its neighbours.
 */
export function exploreIn(world: World, range: XRange) {
  const explore = (from: Spot, forms: readonly FormId[], profile: Profile): Reach =>
    exploreCached(world, from, forms, profile, range);
  /** Can `from` reach a tile of one of the goals? Stops at the first (see `reachesAny`); not cached. */
  explore.reachesAny = (from: Spot, forms: readonly FormId[], profile: Profile, goals: readonly Spot[]): boolean =>
    reachesAny(world, from, forms, profile, goals, range);
  return explore;
}

/** The tiles of `list` that `reach` reaches. */
export const reachedAny = (reach: Reach, list: Tile[]): Tile[] => list.filter(([i, j]) => reach.has(i, j));

/**
 * A ring that `blocks` seals: flooding from the seed over every tile that is not
 * blocked, diagonals included (a diagonal-only join leaks), stays in the box and
 * covers exactly `size` tiles.
 */
export function expectClosedRing(
  blocks: (i: number, j: number) => boolean,
  seed: Tile,
  box: [number, number, number, number],
  size: number,
): void {
  const seen = new Set<string>([`${seed[0]},${seed[1]}`]);
  const todo: Tile[] = [seed];
  while (todo.length > 0) {
    const [i, j] = todo.pop()!;
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const a = i + di;
        const b = j + dj;
        if (seen.has(`${a},${b}`) || blocks(a, b)) continue;
        expect(inBox(a, b, ...box), `the flood leaked to (${a}, ${b})`).toBe(true);
        seen.add(`${a},${b}`);
        todo.push([a, b]);
      }
    }
  }
  expect(seen.size, 'tiles inside the ring').toBe(size);
}

/** No checkpoint within `min` tiles of a guard post at about its height (within `band`). Every enemy that is not an archer is a guard. */
export function expectCheckpointsAwayFromGuards(
  world: World,
  checkpoints: (Placed & { id: string })[],
  enemies: (Spot & { kind?: string })[],
  min = 7,
  band = 3,
): void {
  const guards = enemies.filter((e) => e.kind !== 'archer');
  for (const c of checkpoints) {
    for (const e of guards) {
      if (Math.abs(world.groundAt(e.x, e.z) - world.groundAt(c.x, c.z)) > band) continue;
      expect(Math.hypot(e.x - c.x, e.z - c.z), `${c.id} vs guard (${e.x}, ${e.z})`).toBeGreaterThanOrEqual(min);
    }
  }
}

/** No archer within `min` tiles of a respawn spot, unless it is `band` or more higher or lower. */
export function expectArchersAwayFromRespawns(
  world: World,
  checkpoints: (Spot & { id: string })[],
  archers: Spot[],
  min = 11.5,
  band = 7.5,
): void {
  for (const c of checkpoints) {
    const spot = respawnOf(c);
    for (const a of archers) {
      if (Math.abs(world.groundAt(a.x, a.z) - world.groundAt(spot.x, spot.z)) >= band) continue;
      expect(Math.hypot(a.x - spot.x, a.z - spot.z), `${c.id} vs archer (${a.x}, ${a.z})`).toBeGreaterThanOrEqual(min);
    }
  }
}

/** Every spot has ground, and is in water only if `inWater` says it should be. */
export function expectOnRealGround(world: World, spots: Spot[], inWater: (s: Spot) => boolean = () => false): void {
  for (const s of spots) {
    expect(world.groundAt(s.x, s.z), `(${s.x}, ${s.z}) ground`).toBeGreaterThan(0);
    expect(world.isWater(s.x, s.z), `(${s.x}, ${s.z}) water`).toBe(inWater(s));
  }
}

/** Every plate stands on ordinary ground: dry, and not on a sheet, a gate, a tangle or a mat. */
export function expectPlatesOnRealGround(world: World, plates: PlateSpot[]): void {
  expectOnRealGround(world, plates);
  for (const p of plates) {
    const where = `plate ${p.gate} at (${p.x}, ${p.z})`;
    expect(world.isThinIce(p.x, p.z), `${where} on a sheet`).toBe(false);
    expect(world.isGate(p.x, p.z), `${where} on a gate`).toBe(false);
    expect(world.isTangle(p.x, p.z), `${where} on a tangle`).toBe(false);
    expect(world.isKelp(p.x, p.z), `${where} on kelp`).toBe(false);
  }
}

/** The centres of the tiles of gate `id`, found by holding its plate down for a moment. */
function gateTiles(world: World, id: string): Tile[] {
  const tiles: Tile[] = [];
  world.resetGates();
  world.pressPlate(id, 1e9);
  for (let j = 0; j < world.depth; j++) {
    for (let i = 0; i < world.width; i++) {
      if (world.isGate(i + 0.5, j + 0.5) && !world.isClosedGate(i + 0.5, j + 0.5)) tiles.push([i, j]);
    }
  }
  world.resetGates();
  return tiles;
}

/**
 * Each plate that sets a Cheetah a task (the straight run from its tile to the
 * far side of its gate is 10 tiles or more) gives the Cheetah 0.4 s to spare at
 * speed 10 and the Wolf too little even with 0.4 s to spare at speed 7.
 */
export function expectGatesTimed(world: World, plates: PlateSpot[]): void {
  const CHEETAH = 10;
  const WOLF = 7;
  const SLACK = 0.4;
  for (const p of plates) {
    const tiles = gateTiles(world, p.gate);
    expect(tiles.length, `plate ${p.gate} at (${p.x}, ${p.z}) has a gate`).toBeGreaterThan(0);
    const d = Math.max(...tiles.map(([i, j]) => Math.hypot(i + 0.5 - p.x, j + 0.5 - p.z))) + 1;
    if (d < 10) continue;
    const where = `plate ${p.gate} at (${p.x}, ${p.z}): ${d.toFixed(1)} tiles in ${p.seconds} s`;
    expect(d / CHEETAH, `${where}: too little time for the Cheetah`).toBeLessThanOrEqual(p.seconds - SLACK);
    expect(d / WOLF, `${where}: the Wolf would make it`).toBeGreaterThan(p.seconds + SLACK);
  }
}

/** No spot on a tile `bad` names (tangle, crust, kelp). */
export function expectNoneOn(what: string, spots: Spot[], bad: (s: Spot) => boolean): void {
  for (const s of spots) expect(bad(s), `(${s.x}, ${s.z}) ${what}`).toBe(false);
}

/** Within each list, no two things share an id. */
export function expectUniqueIds(...lists: { id: string }[][]): void {
  for (const list of lists) {
    const ids = list.map((x) => x.id);
    const clash = ids.find((id, n) => ids.indexOf(id) !== n);
    expect(clash, `id ${clash} appears twice`).toBeUndefined();
  }
}

/**
 * Each melody is six different notes 0..7, no two of the island's puzzles share
 * one, and none repeats a melody of the `earlier` puzzles.
 */
export function expectMelodies(
  puzzles: { id: string; melody: readonly number[] }[],
  earlier: { id: string; melody: readonly number[] }[],
): void {
  for (const p of puzzles) {
    expect(new Set(p.melody).size, `${p.id} notes`).toBe(6);
    expect(p.melody.length, `${p.id} length`).toBe(6);
    for (const n of p.melody) expect(n >= 0 && n <= 7 && Number.isInteger(n), `${p.id} note ${n}`).toBe(true);
  }
  expect(new Set(puzzles.map((p) => p.melody.join(','))).size, 'melodies of this island differ').toBe(puzzles.length);
  const used = new Map(earlier.filter((p) => !puzzles.includes(p)).map((p) => [p.melody.join(','), p.id]));
  for (const p of puzzles) expect(used.get(p.melody.join(',')), `${p.id} repeats a melody`).toBeUndefined();
}

/**
 * The game camera looks from the north-east down to the south-west, so the thing
 * at (x, z) with surface `y` is hidden if ground on the line behind it rises
 * faster than the view does.
 */
export function expectSeenFromCamera(world: World, what: string, x: number, z: number, y = world.groundAt(x, z)): void {
  for (let k = 0.25; k <= 30; k += 0.25) {
    expect(world.groundAt(x - k, z + k), `${what} (${x}, ${z}) hidden at k=${k}`).toBeLessThanOrEqual(y + 0.9 + 1.12 * k);
  }
}

/**
 * From the respawn spot of each checkpoint `forms` on `profile` can stand on `target`: it is no trap.
 * Each search stops at the target or at any earlier respawn spot that is known to
 * get there, which proves the same thing: whatever reaches that spot's tile reaches
 * all it reaches (see `reachesAny`).
 */
export function expectWayOut(
  reach: ReturnType<typeof exploreIn>,
  checkpoints: (Spot & { id: string })[],
  target: Spot,
  forms: readonly FormId[],
  profile: Profile,
): void {
  const goals: Spot[] = [target];
  for (const c of checkpoints) {
    const spot = respawnOf(c);
    const out = reach.reachesAny(spot, forms, profile, goals);
    expect(out, `way out from ${c.id}`).toBe(true);
    goals.push(spot);
  }
}
