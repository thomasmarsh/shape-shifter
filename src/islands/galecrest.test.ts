import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { World } from '../world';
import { rampTop, SLUICE_BED, SLUICE_LEVEL, WINDBREAK } from './galecrest';
import { LANDING } from './galecrest-east';
import {
  expectArchersAwayFromRespawns,
  expectCheckpointsAwayFromGuards,
  expectClosedRing,
  expectMelodies,
  expectOnRealGround,
  expectSeenFromCamera,
  expectUniqueIds,
  expectWayOut,
  exploreIn,
  inBox,
  reachedAny,
  respawnOf as respawn,
  solidTiles,
} from './testkit';

// The west half of Galecrest (x 1347 to 1442): the Court, the Windbreak and the
// Sluice, the Yard, the Ramp, the hub and three candles (the Tarn, the Gorse Ring,
// the Pine Road).

const world = new World();
const { layout } = world;

const west = (s: { x: number }) => s.x >= 1347 && s.x < 1443;
const explore = exploreIn(world, { x0: 1300, x1: 1480 });
const RIM = { x: 1327.5, z: 30.5 }; // Hollowfen's east rim
const HUB = respawn({ x: 1405.5, z: 22.5 });
const COURT = respawn({ x: 1350.5, z: 30.5 });

const NINE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake'];
const TEN: FormId[] = [...NINE, 'axolotl'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);

const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const westCheckpoints = layout.checkpoints.filter(west);
const westBread = layout.bread.filter(west);
const westEnemies = layout.enemies.filter(west);
const westPuzzles = layout.puzzles.filter((p) => west(p.speaker));
const westHints = layout.hints.filter(west);

const tiles = solidTiles(world, { x0: 1347, x1: 1443 });
const terrace = tiles.filter(([i, j]) => inBox(i, j, 1430, 51, 1433, 54));
const ringInside = tiles.filter(([i, j]) => inBox(i, j, 1422, 48, 1434, 60));
const pillar = tiles.filter(([i, j]) => inBox(i, j, 1418, 14, 1420, 16));
const yard = tiles.filter(([i, j]) => inBox(i, j, 1363, 24, 1376, 37) && !world.isWater(i + 0.5, j + 0.5));
const beyond = tiles.filter(([i]) => i >= 1363);
const windbreak = tiles.filter(([i, j]) => (i === 1361 || i === 1362) && !world.isHollow(i + 0.5, j + 0.5));

describe('Galecrest west: layout', () => {
  it('has three puzzles and four checkpoints in the west', () => {
    expect(westPuzzles.map((p) => p.id)).toEqual(['gc-tarn', 'gc-ring', 'gc-road']);
    expect(westCheckpoints.map((c) => c.id)).toEqual(['galecrest', 'gc-hub', 'gc-ring', 'gc-rim']);
  });

  it('climbs the Ramp in steps a Human walks', () => {
    for (let i = 1377; i < 1401; i++) expect(rampTop(i + 1) - rampTop(i)).toBeLessThanOrEqual(0.35);
    expect(rampTop(1377) - LANDING).toBeLessThanOrEqual(0.35);
    expect(rampTop(1401)).toBe(12);
  });
});

describe('Galecrest west: arrival', () => {
  it('lets a Bunny and a Fairy from Hollowfen\'s rim stand in the Court on easy', () => {
    const r = explore(RIM, ['bunny', 'fairy'], 'easy');
    expect(r.canStand(COURT)).toBe(true);
  });

  it('makes every tile of the Windbreak a wall at 18 or a hollow', () => {
    for (let i = 1361; i <= 1362; i++) {
      for (let j = 0; j <= 63; j++) {
        const hollow = world.isHollow(i + 0.5, j + 0.5);
        expect(hollow || world.groundAt(i + 0.5, j + 0.5) === WINDBREAK, `(${i}, ${j})`).toBe(true);
      }
    }
    for (let i = 1361; i <= 1362; i++) expect(world.isWater(i + 0.5, 30.5) && world.isHollow(i + 0.5, 30.5)).toBe(true);
    expect(SLUICE_LEVEL - SLUICE_BED).toBeGreaterThan(3.9);
  });

  it('keeps the nine without the Axolotl behind the Windbreak, and the ten off it, on max', () => {
    const x = explore(COURT, without(NINE, 'axolotl'), 'max');
    expect(reachedAny(x, beyond).slice(0, 3)).toEqual([]);
    const ten = explore(COURT, TEN, 'max');
    expect(reachedAny(ten, windbreak).slice(0, 3)).toEqual([]);
  });

  it('lets the ten on easy reach the Yard and the hub checkpoint', () => {
    const r = explore(COURT, TEN, 'easy');
    expect(reachedAny(r, yard).length).toBeGreaterThan(30);
    expect(r.canStand(HUB)).toBe(true);
  });
});

describe('Galecrest west: the candles', () => {
  const all = explore(HUB, TEN, 'easy');
  const max = (forms: FormId[]) => explore(HUB, forms, 'max');

  it('lets the ten use every speaker and candle, stand on every respawn spot and reach all bread', () => {
    for (const p of westPuzzles) {
      expect(all.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(all.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
    for (const c of westCheckpoints) expect(all.canStand(respawn(c)), `checkpoint ${c.id}`).toBe(true);
    expect(westBread).toHaveLength(4);
    for (const b of westBread) expect(all.canStand(b), `bread ${b.id}`).toBe(true);
  });

  it('keeps the Tarn candle from every set without the Mermaid', () => {
    expect(max(without(NINE, 'mermaid')).canUse(puzzle('gc-tarn').candle)).toBe(false);
  });

  it('closes the Gorse Ring, and keeps its candle from every set without the Ant or the Bunny', () => {
    expectClosedRing((i, j) => world.isTangle(i + 0.5, j + 0.5), [1428, 54], [1420, 46, 1436, 62], 13 * 13);
    expect(max(without(NINE, 'ant')).canUse(puzzle('gc-ring').candle)).toBe(false);
    expect(reachedAny(max(without(NINE, 'ant')), ringInside).slice(0, 3)).toEqual([]);
    expect(max(without(NINE, 'bunny')).canUse(puzzle('gc-ring').candle)).toBe(false);
    expect(reachedAny(max(without(NINE, 'bunny')), terrace).slice(0, 3)).toEqual([]);
  });

  it('keeps the Pine Road candle from every set without the Orangutan or the Fairy', () => {
    expect(max(without(NINE, 'orangutan')).canUse(puzzle('gc-road').candle)).toBe(false);
    expect(max(without(NINE, 'fairy')).canUse(puzzle('gc-road').candle)).toBe(false);
    expect(reachedAny(max(without(NINE, 'fairy')), pillar).slice(0, 3)).toEqual([]);
  });
});

describe('Galecrest west: the Gap', () => {
  it('keeps the nine without the Cheetah from standing at x >= 1443', () => {
    const x = explore(HUB, without(NINE, 'cheetah'), 'max');
    const east = solidTiles(world, { x0: 1443, x1: 1480 });
    expect(reachedAny(x, east).slice(0, 3)).toEqual([]);
  });
});


// A Snapper stands in water, kelp-free and a tile from the pool's edge; its pool is the water it can reach.
const snapperOk = (world: World, e: { x: number; z: number }) => {
  const i = Math.floor(e.x), j = Math.floor(e.z);
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    expect(world.isWater(i + di + 0.5, j + dj + 0.5), `snapper (${e.x}, ${e.z}) near ${i + di},${j + dj}`).toBe(true);
  }
  expect(world.isKelp(e.x, e.z), `snapper (${e.x}, ${e.z}) kelp`).toBe(false);
};
const poolOf = (world: World, e: { x: number; z: number }) => {
  const seen = new Set<string>([`${Math.floor(e.x)},${Math.floor(e.z)}`]);
  const todo: [number, number][] = [[Math.floor(e.x), Math.floor(e.z)]];
  while (todo.length) {
    const [i, j] = todo.pop()!;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${i + di},${j + dj}`;
      if (!seen.has(k) && world.isWater(i + di + 0.5, j + dj + 0.5)) { seen.add(k); todo.push([i + di, j + dj]); }
    }
  }
  return [...seen].map((k) => k.split(',').map(Number) as [number, number]);
};
const noTangleNear = (world: World, e: { x: number; z: number }) => {
  for (const [i, j] of poolOf(world, e)) for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    expect(world.isTangle(i + di + 0.5, j + dj + 0.5), `tangle at ${i + di},${j + dj} touches the pool of snapper (${e.x}, ${e.z})`).toBe(false);
  }
};
describe('Galecrest west things', () => {
  const things = () =>
    [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
    ].filter(west);

  it('stand on real ground, and the pickle in water', () => {
    const pickle = puzzle('gc-tarn').candle;
    const snappers = westEnemies.filter((e) => e.kind === 'snapper');
    expect(snappers.length).toBe(2);
    expectOnRealGround(world, things(), (s) => (s.x === pickle.x && s.z === pickle.z) || snappers.includes(s as never));
    for (const e of snappers) snapperOk(world, e);
    expect(world.isWater(pickle.x, pickle.z)).toBe(true);
  });

  it('keeps checkpoints from guards and respawn spots from archers', () => {
    expectCheckpointsAwayFromGuards(world, westCheckpoints, westEnemies);
    expectArchersAwayFromRespawns(world, westCheckpoints, westEnemies.filter((e) => e.kind === 'archer'));
  });

  it('keeps every bad guy 10 tiles from the Gorse Ring', () => {
    for (const e of westEnemies) {
      if (e.kind === 'snapper') {
        noTangleNear(world, e); // a Snapper never leaves its pool, so it cannot reach a one-heart Ant
        continue;
      }
      const dx = Math.max(1421 - e.x, 0, e.x - 1436);
      const dz = Math.max(47 - e.z, 0, e.z - 62);
      expect(Math.hypot(dx, dz), `guard (${e.x}, ${e.z})`).toBeGreaterThanOrEqual(10);
    }
  });

  it('has no id clash, distinct melodies and every thing seen from the camera', () => {
    expectUniqueIds(westCheckpoints, westBread, westPuzzles, westHints);
    expectMelodies(westPuzzles, layout.puzzles);
    for (const p of westPuzzles) expect([0, 1, 2], p.id).toContain(p.melody[0]);
    for (const p of westPuzzles) {
      expectSeenFromCamera(world, `${p.id} speaker`, p.speaker.x, p.speaker.z);
      expectSeenFromCamera(world, `${p.id} candle`, p.candle.x, p.candle.z);
    }
    for (const c of westCheckpoints) expectSeenFromCamera(world, `checkpoint ${c.id}`, c.x, c.z);
  });

  it('lets the ten on easy reach the Court from every respawn spot', () => {
    expectWayOut(explore, westCheckpoints, COURT, TEN, 'easy');
  }, 30000);
});
