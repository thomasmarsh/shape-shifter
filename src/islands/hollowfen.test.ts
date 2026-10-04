import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { World } from '../world';
import { LANDING, rampTop } from './hollowfen';
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

// The west half of Hollowfen (x 1160 to 1235): the Landing, the Ramp, the hub and
// three candles (the Reed Pool, the Reed Ring, the Heron Road).

const world = new World();
const { layout } = world;

const west = (s: { x: number }) => s.x >= 1160 && s.x < 1236;
const explore = exploreIn(world, { x0: 1125, x1: 1267 });
const exploreFromCoilstone = exploreIn(world, { x0: 1100, x1: 1267 }); // Coilstone's last respawn spot lies west of x 1125
const CORAL_END = { x: 1121.5, z: 31.5 }; // Coilstone's last respawn spot
const HUB = respawn({ x: 1198.5, z: 22.5 });

const NINE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);

const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const westCheckpoints = layout.checkpoints.filter(west);
const westBread = layout.bread.filter(west);
const westEnemies = layout.enemies.filter(west);
const westPuzzles = layout.puzzles.filter((p) => west(p.speaker));
const westHints = layout.hints.filter(west);

const tiles = solidTiles(world, { x0: 1154, x1: 1236 });
const landing = tiles.filter(([i, j]) => inBox(i, j, 1154, 25, 1169, 36));
const terrace = tiles.filter(([i, j]) => inBox(i, j, 1223, 51, 1226, 54));
const ringInside = tiles.filter(([i, j]) => inBox(i, j, 1215, 48, 1227, 60));
const pillar = tiles.filter(([i, j]) => inBox(i, j, 1211, 14, 1213, 16));

describe('Hollowfen west: layout', () => {
  it('has three puzzles and four checkpoints in the west', () => {
    expect(westPuzzles.map((p) => p.id)).toEqual(['hf-pool', 'hf-ring', 'hf-road']);
    expect(westCheckpoints.map((c) => c.id)).toEqual(['hollowfen', 'hf-hub', 'hf-ring', 'hf-rim']);
  });

  it('climbs the Ramp in steps a Human walks', () => {
    for (let i = 1170; i < 1194; i++) expect(rampTop(i + 1) - rampTop(i)).toBeLessThanOrEqual(0.35);
    expect(rampTop(1169)).toBe(LANDING);
    expect(rampTop(1194)).toBe(12);
  });
});

describe('Hollowfen west: arrival', () => {
  it('lets the nine from Coilstone stand on the Landing and on the hub checkpoint on easy', () => {
    const r = exploreFromCoilstone(CORAL_END, NINE, 'easy');
    expect(reachedAny(r, landing).length).toBeGreaterThan(30);
    expect(r.canStand(respawn({ x: 1198.5, z: 22.5 }))).toBe(true);
  });
});

describe('Hollowfen west: the candles', () => {
  const all = explore(HUB, NINE, 'easy');
  const max = (forms: FormId[]) => explore(HUB, forms, 'max');

  it('lets the nine use every speaker and candle, stand on every respawn spot and reach all bread', () => {
    for (const p of westPuzzles) {
      expect(all.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(all.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
    for (const c of westCheckpoints) expect(all.canStand(respawn(c)), `checkpoint ${c.id}`).toBe(true);
    expect(westBread).toHaveLength(3);
    for (const b of westBread) expect(all.canStand(b), `bread ${b.id}`).toBe(true);
  });

  it('keeps the Reed Pool candle from every set without the Mermaid', () => {
    expect(max(without(NINE, 'mermaid')).canUse(puzzle('hf-pool').candle)).toBe(false);
  });

  it('closes the Reed Ring, and keeps its candle from every set without the Ant or the Bunny', () => {
    expectClosedRing((i, j) => world.isTangle(i + 0.5, j + 0.5), [1221, 54], [1213, 46, 1229, 62], 13 * 13);
    expect(max(without(NINE, 'ant')).canUse(puzzle('hf-ring').candle)).toBe(false);
    expect(reachedAny(max(without(NINE, 'ant')), ringInside).slice(0, 3)).toEqual([]);
    expect(max(without(NINE, 'bunny')).canUse(puzzle('hf-ring').candle)).toBe(false);
    expect(reachedAny(max(without(NINE, 'bunny')), terrace).slice(0, 3)).toEqual([]);
  });

  it('keeps the Heron Road candle from every set without the Orangutan or the Fairy', () => {
    expect(max(without(NINE, 'orangutan')).canUse(puzzle('hf-road').candle)).toBe(false);
    expect(max(without(NINE, 'fairy')).canUse(puzzle('hf-road').candle)).toBe(false);
    expect(reachedAny(max(without(NINE, 'fairy')), pillar).slice(0, 3)).toEqual([]);
  });
});

describe('Hollowfen west: the Gap', () => {
  it('keeps the nine without the Cheetah from standing at x >= 1236', () => {
    const x = explore(HUB, without(NINE, 'cheetah'), 'max');
    const east = solidTiles(world, { x0: 1236, x1: 1267 });
    expect(reachedAny(x, east).slice(0, 3)).toEqual([]);
  });
});

describe('Hollowfen west things', () => {
  const things = () =>
    [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
    ].filter(west);

  it('stand on real ground, and the pickle in water', () => {
    const pickle = puzzle('hf-pool').candle;
    expectOnRealGround(world, things(), (s) => s.x === pickle.x && s.z === pickle.z);
    expect(world.isWater(pickle.x, pickle.z)).toBe(true);
  });

  it('keeps checkpoints from guards and respawn spots from archers', () => {
    expectCheckpointsAwayFromGuards(world, westCheckpoints, westEnemies);
    expectArchersAwayFromRespawns(world, westCheckpoints, westEnemies.filter((e) => e.kind === 'archer'));
  });

  it('keeps every bad guy 10 tiles from the Reed Ring', () => {
    for (const e of westEnemies) {
      const dx = Math.max(1214 - e.x, 0, e.x - 1229);
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

  it('lets the nine on easy reach the Landing from every respawn spot', () => {
    expectWayOut(explore, westCheckpoints, respawn({ x: 1164.5, z: 30.5 }), NINE, 'easy');
  }, 30000);
});
