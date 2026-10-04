import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { World } from '../world';
import {
  expectArchersAwayFromRespawns,
  expectCheckpointsAwayFromGuards,
  expectClosedRing,
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

// The east half of Hollowfen (x >= 1236): the Bridge over the Gap, the Stair,
// the Mound, and the Axolotl's way off: the Well and the Last Stone.

const world = new World();
const { layout } = world;

const east = (s: { x: number }) => s.x >= 1236 && s.x < 1336;
const RANGE = { x0: 1195, x1: 1336 };
const explore = exploreIn(world, RANGE);

const NINE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake'];
const TEN: FormId[] = [...NINE, 'axolotl'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);

const checkpoint = (id: string) => layout.checkpoints.find((c) => c.id === id)!;
const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const WEST = { x: 1196.5, z: 30.5 };
const FAR = respawn(checkpoint('hf-far'));
const WELL = respawn(checkpoint('hf-well'));
const END = respawn(checkpoint('hf-end'));

const eastCheckpoints = layout.checkpoints.filter(east);
const eastEnemies = layout.enemies.filter(east);
const tiles = solidTiles(world, RANGE);
const box = (i0: number, j0: number, i1: number, j1: number) => tiles.filter(([i, j]) => inBox(i, j, i0, j0, i1, j1));
const beyondBridge = tiles.filter(([i]) => i >= 1266);
const moundTop = box(1297, 36, 1316, 52).filter(([i, j]) => !(j === 44 && i <= 1306)); // the burrow has its own check
const lastStone = box(1311, 13, 1319, 21);

const stair = puzzle('hf-stair');
const mound = puzzle('hf-mound');

describe('Hollowfen east: the layout', () => {
  it('has two puzzles and four checkpoints in the east', () => {
    expect(layout.puzzles.filter((p) => east(p.speaker)).map((p) => p.id)).toEqual(['hf-stair', 'hf-mound']);
    expect(eastCheckpoints.map((c) => c.id)).toEqual(['hf-far', 'hf-foot', 'hf-well', 'hf-end']);
  });
});

describe('Hollowfen east: the Gap', () => {
  it('lets the nine on easy cross the Bridge from the west hub to hf-far', () => {
    expect(explore(WEST, NINE, 'easy').canStand(FAR)).toBe(true);
  });

  it('keeps the eight without the Cheetah, at the limit, off every tile east of the Gap', () => {
    const r = explore(WEST, without(NINE, 'cheetah'), 'max');
    expect(reachedAny(r, beyondBridge).slice(0, 3)).toEqual([]);
  });
});

describe('Hollowfen east: the Stair', () => {
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

describe('Hollowfen east: the Mound', () => {
  it('lets the nine on easy use the speaker and the candle', () => {
    const r = explore(FAR, NINE, 'easy');
    expect(r.canUse(mound.speaker), 'speaker').toBe(true);
    expect(r.canUse(mound.candle), 'candle').toBe(true);
  });

  it('keeps everyone but the Snake off the top and away from both, at the limit', () => {
    const r = explore(FAR, without(NINE, 'snake'), 'max');
    expect(reachedAny(r, moundTop).slice(0, 3), 'mound top').toEqual([]);
    expect(r.canUse(mound.speaker), 'speaker').toBe(false);
    expect(r.canUse(mound.candle), 'candle').toBe(false);
  });
});

describe('Hollowfen east: the Well', () => {
  it('closes the hollow ring, joined edge to edge', () => {
    expectClosedRing((i, j) => world.isHollow(i + 0.5, j + 0.5), [1315, 17], [1309, 11, 1321, 23], 13 * 13);
  });

  it('keeps the nine off the Last Stone at the limit', () => {
    const r = explore(FAR, NINE, 'max');
    expect(reachedAny(r, lastStone).slice(0, 3)).toEqual([]);
    expect(r.canStand(END), 'hf-end').toBe(false);
  });

  it('lets the ten on easy reach hf-end', () => {
    expect(explore(FAR, TEN, 'easy').canStand(END)).toBe(true);
  });

  it('lets the Axolotl alone swim out to the Last Stone and back', () => {
    expect(explore(WELL, ['axolotl'], 'easy').canStand(END), 'out').toBe(true);
    expect(explore(END, ['axolotl'], 'easy').canStand(WELL), 'back').toBe(true);
  });
});

describe('Hollowfen east fairness', () => {
  it('keeps every east checkpoint 7 tiles from a guard at about its height', () => {
    expect(eastEnemies).toHaveLength(4);
    expectCheckpointsAwayFromGuards(world, eastCheckpoints, eastEnemies);
  });

  it('keeps every archer 11.5 tiles from a respawn spot, unless it is 7.5 higher or lower', () => {
    expectArchersAwayFromRespawns(world, eastCheckpoints, layout.enemies.filter((e) => e.kind === 'archer'));
  });

  it('gives every sword minLevel 7, and keeps every guard 8 tiles from the Well', () => {
    for (const e of eastEnemies.filter((q) => q.kind === 'sword')) expect(e.minLevel, `(${e.x}, ${e.z})`).toBe(7);
    for (const e of eastEnemies) {
      expect(inBox(Math.floor(e.x), Math.floor(e.z), 1306 - 8, 8 - 8, 1324 + 8, 26 + 8), `(${e.x}, ${e.z}) near the Well`).toBe(false);
    }
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
    expectNoneOn('run-off', things, (s) => s.x >= 1266 && s.x < 1283 && s.z >= 3 && s.z < 8);
  });
});

describe('Hollowfen east things', () => {
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
    for (const c of eastCheckpoints) expect(c.id.startsWith('hf-')).toBe(true);
    for (const h of layout.hints.filter(east)) expect(h.id.startsWith('hf-e-'), h.id).toBe(true);
    const mine = [stair, mound];
    expectMelodies(mine, layout.puzzles);
    for (const p of mine) expect([5, 6, 7], p.id).toContain(p.melody[0]);
  });

  it('shows every thing to the camera', () => {
    for (const p of [stair, mound]) {
      expectSeenFromCamera(world, `${p.id} speaker`, p.speaker.x, p.speaker.z);
      expectSeenFromCamera(world, `${p.id} candle`, p.candle.x, p.candle.z);
    }
    for (const c of eastCheckpoints) expectSeenFromCamera(world, c.id, c.x, c.z);
  });

  it('lets the ten on easy get from every respawn spot back to hf-far', () => {
    expectWayOut(explore, eastCheckpoints, FAR, TEN, 'easy');
  });
});
