import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { World } from '../world';
import {
  expectArchersAwayFromRespawns,
  expectCheckpointsAwayFromGuards,
  expectMelodies,
  expectNoneOn,
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

// The east half of Galecrest (x >= 1443): the Bridge over the Gap, the Stair,
// the Crag, and the way off, which takes wings: Kestrel Rock.

const world = new World();
const { layout } = world;

const east = (s: { x: number }) => s.x >= 1443 && s.x < 1590;
const RANGE = { x0: 1402, x1: 1590 };
const explore = exploreIn(world, RANGE);

const NINE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake'];
const TEN: FormId[] = [...NINE, 'axolotl'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);

const checkpoint = (id: string) => layout.checkpoints.find((c) => c.id === id)!;
const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const WEST = { x: 1403.5, z: 30.5 };
const FAR = respawn(checkpoint('gc-far'));
const EDGE = respawn(checkpoint('gc-edge'));
const END = respawn(checkpoint('gc-end'));

const eastCheckpoints = layout.checkpoints.filter(east);
const eastEnemies = layout.enemies.filter(east);
const tiles = solidTiles(world, RANGE);
const box = (i0: number, j0: number, i1: number, j1: number) => tiles.filter(([i, j]) => inBox(i, j, i0, j0, i1, j1));
const beyondBridge = tiles.filter(([i]) => i >= 1473);
const cragTop = box(1504, 36, 1523, 52).filter(([i, j]) => !(j === 44 && i <= 1513)); // the burrow has its own check
const offHub = tiles.filter(([i]) => i >= 1531);

const stair = puzzle('gc-stair');
const crag = puzzle('gc-crag');

describe('Galecrest east: the layout', () => {
  it('has two puzzles and four checkpoints in the east', () => {
    expect(layout.puzzles.filter((p) => east(p.speaker)).map((p) => p.id)).toEqual(['gc-stair', 'gc-crag']);
    expect(eastCheckpoints.map((c) => c.id)).toEqual(['gc-far', 'gc-foot', 'gc-edge', 'gc-end']);
  });
});

describe('Galecrest east: the Gap', () => {
  it('lets the nine on easy cross the Bridge from the west hub to gc-far', () => {
    expect(explore(WEST, NINE, 'easy').canStand(FAR)).toBe(true);
  });

  it('keeps the eight without the Cheetah, at the limit, off every tile east of the Gap', () => {
    const r = explore(WEST, without(NINE, 'cheetah'), 'max');
    expect(reachedAny(r, beyondBridge).slice(0, 3)).toEqual([]);
  });
});

describe('Galecrest east: the Stair', () => {
  it('lets the nine on easy use the speaker and the candle', () => {
    const r = explore(FAR, NINE, 'easy');
    expect(r.canUse(stair.speaker), 'speaker').toBe(true);
    expect(r.canUse(stair.candle), 'candle').toBe(true);
  });

  it('keeps the candle out of reach, at the limit, without the Bunny or the Fairy', () => {
    for (const f of ['bunny', 'fairy'] as FormId[]) {
      expect(explore(FAR, without(NINE, f), 'max').canUse(stair.candle), `without ${f}`).toBe(false);
    }
  });

  it('keeps the candle out of reach, at the limit, without a runner: the Cheetah runs the thin sheets as well as the Wolf', () => {
    expect(explore(FAR, without(without(NINE, 'wolf'), 'cheetah'), 'max').canUse(stair.candle)).toBe(false);
    expect(explore(FAR, without(NINE, 'wolf'), 'max').canUse(stair.candle), 'the Cheetah alone does it').toBe(true);
  });
});

describe('Galecrest east: the Crag', () => {
  it('lets the nine on easy use the speaker and the candle', () => {
    const r = explore(FAR, NINE, 'easy');
    expect(r.canUse(crag.speaker), 'speaker').toBe(true);
    expect(r.canUse(crag.candle), 'candle').toBe(true);
  });

  it('keeps everyone but the Snake off the top and away from both, at the limit', () => {
    const r = explore(FAR, without(NINE, 'snake'), 'max');
    expect(reachedAny(r, cragTop).slice(0, 3), 'crag top').toEqual([]);
    expect(r.canUse(crag.speaker), 'speaker').toBe(false);
    expect(r.canUse(crag.candle), 'candle').toBe(false);
  });
});

describe('Galecrest east: the way off', () => {
  it('keeps the ten on max, without wings, from every tile at x >= 1531', () => {
    const r = explore(EDGE, TEN, 'max');
    expect(reachedAny(r, offHub).slice(0, 3)).toEqual([]);
    expect(r.canStand(END), 'gc-end').toBe(false);
  });

  it('lets the Human alone, with wings, on easy stand on gc-end', () => {
    expect(explore(EDGE, ['human'], 'easy', true).canStand(END)).toBe(true);
  });

  it('keeps the nine without the Human, with wings, on max off gc-end', () => {
    const r = explore(EDGE, without(NINE, 'human'), 'max', true);
    expect(reachedAny(r, offHub).slice(0, 3)).toEqual([]);
    expect(r.canStand(END), 'gc-end').toBe(false);
  });
});
describe('Galecrest east fairness', () => {
  it('keeps every east checkpoint 7 tiles from a guard at about its height', () => {
    expect(eastEnemies).toHaveLength(4);
    expectCheckpointsAwayFromGuards(world, eastCheckpoints, eastEnemies);
  });

  it('keeps every archer 11.5 tiles from a respawn spot, unless it is 7.5 higher or lower', () => {
    expectArchersAwayFromRespawns(world, eastCheckpoints, layout.enemies.filter((e) => e.kind === 'archer'));
  });

  it('gives every sword minLevel 7', () => {
    for (const e of eastEnemies.filter((q) => q.kind === 'sword')) expect(e.minLevel, `(${e.x}, ${e.z})`).toBe(7);
  });

  it('keeps the Bridge run-off clear and puts nothing on a hole, crust or water', () => {
    const things = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
      ...layout.trees,
    ].filter(east);
    expect(things.length).toBeGreaterThanOrEqual(20);
    expectNoneOn('hole', things, (s) => world.isTangle(s.x, s.z) || world.isHollow(s.x, s.z));
    expectNoneOn('crust', things, (s) => world.isThinIce(s.x, s.z));
    expectNoneOn('run-off', things, (s) => s.x >= 1473 && s.x < 1490 && s.z >= 3 && s.z < 8);
  });
});

describe('Galecrest east things', () => {
  it('stand on real ground', () => {
    const spots = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
      ...layout.trees,
    ].filter(east);
    expectOnRealGround(world, spots);
  });

  it('has its own ids, unique, and melodies of six notes that start with 5, 6 or 7', () => {
    expectUniqueIds(eastCheckpoints, layout.bread.filter(east), layout.puzzles.filter((p) => east(p.speaker)), layout.hints);
    for (const c of eastCheckpoints) expect(c.id.startsWith('gc-')).toBe(true);
    for (const h of layout.hints.filter(east)) expect(h.id.startsWith('gc-e-'), h.id).toBe(true);
    const mine = [stair, crag];
    expectMelodies(mine, layout.puzzles);
    for (const p of mine) expect([5, 6, 7], p.id).toContain(p.melody[0]);
  });

  it('shows every thing to the camera', () => {
    for (const p of [stair, crag]) {
      expectSeenFromCamera(world, `${p.id} speaker`, p.speaker.x, p.speaker.z);
      expectSeenFromCamera(world, `${p.id} candle`, p.candle.x, p.candle.z);
    }
    for (const c of eastCheckpoints) expectSeenFromCamera(world, c.id, c.x, c.z);
  });

  it('keeps every east hint to the island\'s own words', () => {
    for (const h of layout.hints.filter(east)) expect(h.text, h.id).not.toMatch(/sedge|reed|peat|chalk|fen\b|heron/i);
  });

  it('lets the ten on easy get from every respawn spot back to gc-far, but gc-end', () => {
    // gc-end is left out: its only way off is a fall, by decision (the game stops there for now).
    expectWayOut(explore, eastCheckpoints.filter((c) => c.id !== 'gc-end'), FAR, TEN, 'easy');
  });
});
