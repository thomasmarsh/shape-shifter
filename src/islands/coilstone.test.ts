import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { World } from '../world';
import { LANDING, rampTop } from './coilstone';
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

// The west half of Coilstone (x 960 to 1030): the Landing, the Ramp, the hub and
// three candles (the Sunken Court, the Colonnade, the Tooth).
//
// The Mermaid's bubble column (R) picks the nearest bad guy within BUBBLE_AIM (7)
// tiles on the flat (x and z only) and bursts under it: the rule ignores walls
// and heights. The water shot (Q) is stopped by walls. The Sunken Court's guards
// stand in a cell walled on all four sides (see coilstone-court.test.ts), 1 to 3 tiles from the inner water.

const world = new World();
const { layout } = world;

const west = (s: { x: number }) => s.x >= 960 && s.x < 1031;
const explore = exploreIn(world, { x0: 925, x1: 1062 });
const SUNSET = respawn({ x: 931.5, z: 4.5 });
const HUB = respawn({ x: 1000.5, z: 18.5 });

const EIGHT: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);

const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const westCheckpoints = layout.checkpoints.filter(west);
const westBread = layout.bread.filter(west);
const westEnemies = layout.enemies.filter(west);
const westPuzzles = layout.puzzles.filter((p) => west(p.speaker));
const westHints = layout.hints.filter(west);

const tiles = solidTiles(world, { x0: 960, x1: 1031 });
const landing = tiles.filter(([i, j]) => inBox(i, j, 960, 0, 967, 9));
const islet = tiles.filter(([i, j]) => inBox(i, j, 1013, 47, 1021, 55));
const toothInside = tiles.filter(([i, j]) => inBox(i, j, 966, 44, 968, 46));
const tooth = tiles.filter(([i, j]) => inBox(i, j, 963, 41, 971, 49));
const pillar = tiles.filter(([i, j]) => inBox(i, j, 1011, 14, 1013, 16));

describe('Coilstone west: arrival', () => {
  it('lets a Bunny and a Fairy from Sunset Rock reach the Landing on easy', () => {
    const r = explore(SUNSET, ['bunny', 'fairy'], 'easy');
    expect(reachedAny(r, landing).length).toBeGreaterThan(30);
    expect(r.canStand(respawn({ x: 963.5, z: 4.5 }))).toBe(true);
  });

  it('gives Sunset Rock the Ramp as its only way up to the hub', () => {
    const r = explore(SUNSET, ['bunny', 'fairy'], 'max');
    // The hub is 6 above the Landing: nothing from Sunset Rock reaches it but by the Landing and the Ramp.
    expect(r.canStand({ x: 977.5, z: 5.5 })).toBe(true);
    expect(r.canStand({ x: 940.5, z: 5.5 })).toBe(false);
  });

  it('climbs the Ramp from the Landing to the hub in steps a Human walks', () => {
    for (let i = 968; i <= 987; i++) {
      expect(rampTop(i + 1) - rampTop(i)).toBeLessThanOrEqual(0.35);
    }
    expect(rampTop(967)).toBe(LANDING);
    expect(rampTop(987)).toBe(12);
  });
});

describe('Coilstone west: the candles', () => {
  const all = explore(HUB, EIGHT, 'easy');
  const max = (forms: FormId[]) => explore(HUB, forms, 'max');

  it('lets the eight use every speaker and candle, stand on every respawn spot and reach all bread', () => {
    expect(westPuzzles.map((p) => p.id)).toEqual(['cs-court', 'cs-colonnade', 'cs-tooth']);
    for (const p of westPuzzles) {
      expect(all.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(all.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
    expect(westCheckpoints.map((c) => c.id)).toEqual(['coilstone', 'cs-hub', 'cs-court', 'cs-rim']);
    for (const c of westCheckpoints) expect(all.canStand(respawn(c)), `checkpoint ${c.id}`).toBe(true);
    expect(westBread).toHaveLength(4); // was 3: the fill adds cs-f-font (the Vault's bread is in the east, and only the Axolotl reaches it)
    for (const b of westBread) expect(all.canStand(b), `bread ${b.id}`).toBe(true);
  });

  it('keeps the Sunken Court candle from every set without the Mermaid or without the Bunny', () => {
    expect(max(without(EIGHT, 'mermaid')).canUse(puzzle('cs-court').candle)).toBe(false);
    expect(reachedAny(max(without(EIGHT, 'mermaid')), islet).slice(0, 3)).toEqual([]);
    expect(max(without(EIGHT, 'bunny')).canUse(puzzle('cs-court').candle)).toBe(false);
  });

  it('keeps the Colonnade candle from every set without the Orangutan or without the Fairy', () => {
    expect(max(without(EIGHT, 'orangutan')).canUse(puzzle('cs-colonnade').candle)).toBe(false);
    expect(max(without(EIGHT, 'fairy')).canUse(puzzle('cs-colonnade').candle)).toBe(false);
    expect(reachedAny(max(without(EIGHT, 'fairy')), pillar).slice(0, 3)).toEqual([]);
  });

  it('keeps the Tooth candle from every set without the Wolf, the Fairy or the Ant', () => {
    // The Cheetah also runs the pier, so the Wolf is missed only when the Cheetah is gone too.
    expect(max(without(without(EIGHT, 'wolf'), 'cheetah')).canUse(puzzle('cs-tooth').candle), 'without wolf').toBe(false);
    for (const f of ['fairy', 'ant'] as const) {
      expect(max(without(EIGHT, f)).canUse(puzzle('cs-tooth').candle), `without ${f}`).toBe(false);
    }
    expect(reachedAny(max(without(EIGHT, 'ant')), toothInside).slice(0, 3)).toEqual([]);
    expect(reachedAny(max(without(without(EIGHT, 'wolf'), 'cheetah')), tooth).slice(0, 3)).toEqual([]);
  });

  it('closes the kelp ring and the Tooth ring, joined edge to edge', () => {
    expectClosedRing((i, j) => world.isKelp(i + 0.5, j + 0.5), [1017, 51], [1011, 45, 1023, 57], 13 * 13);
    expectClosedRing((i, j) => world.isTangle(i + 0.5, j + 0.5), [967, 45], [966, 44, 968, 46], 3 * 3);
  });
});

describe('Coilstone west: the Rift', () => {
  it('keeps the eight from standing at x >= 1061 from the hub without the Cheetah', () => {
    const x = explore(HUB, without(EIGHT, 'cheetah'), 'max');
    for (let j = 0; j < 64; j++) for (let i = 1061; i < 1062; i++) expect(x.canStand({ x: i + 0.5, z: j + 0.5 }), `(${i}, ${j})`).toBe(false);
  });
});

describe('Coilstone west things', () => {
  const things = () =>
    [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
    ].filter(west);

  it('stand on real ground, and in water nowhere', () => {
    expectOnRealGround(world, things());
  });

  it('keeps checkpoints from guards and respawn spots from archers', () => {
    expectCheckpointsAwayFromGuards(world, westCheckpoints, westEnemies);
    expectArchersAwayFromRespawns(world, westCheckpoints, westEnemies.filter((e) => e.kind === 'archer'));
  });

  it('keeps the Sunken Court guards within the bubble column range of inner water, and no bad guy on the Tooth', () => {
    const inner = tiles.filter(([i, j]) => inBox(i, j, 1011, 45, 1023, 57) && world.isWater(i + 0.5, j + 0.5));
    for (const e of westEnemies.filter((g) => inBox(g.x, g.z, 1013, 47, 1021, 55))) {
      const d = Math.min(...inner.map(([i, j]) => Math.hypot(e.x - (i + 0.5), e.z - (j + 0.5))));
      expect(d, `guard (${e.x}, ${e.z}) from inner water`).toBeLessThanOrEqual(7);
    }
    for (const e of westEnemies) {
      expect(inBox(e.x, e.z, 963, 41, 972, 50), `enemy (${e.x}, ${e.z}) on the Tooth`).toBe(false);
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
  });

  it('lets the eight on easy reach the Landing from every respawn spot', () => {
    expectWayOut(explore, westCheckpoints, respawn({ x: 963.5, z: 4.5 }), EIGHT, 'easy');
  }, 30000);
});
