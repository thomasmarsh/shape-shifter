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

// The east half of Coilstone (x >= 1031): the Bridge over the Rift, the Stair,
// the Thicket, and the Snake's way off: the Foot, the Coil and the Serpent's Head.

const world = new World();
const { layout } = world;

const east = (s: { x: number }) => s.x >= 1031 && s.x < 1136;
// Explores that start west of the Rift see from x 1000; the others from the Rift's west edge.
const FROM_WEST = { x0: 1000, x1: 1136 };
const RANGE = { x0: 1029, x1: 1136 };
const exploreWest = exploreIn(world, FROM_WEST);
const explore = exploreIn(world, RANGE);

const SIX: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant'];
const SEVEN: FormId[] = [...SIX, 'mermaid'];
const EIGHT: FormId[] = [...SEVEN, 'cheetah'];
const NINE: FormId[] = [...EIGHT, 'snake'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);

const checkpoint = (id: string) => layout.checkpoints.find((c) => c.id === id)!;
const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const RIM = { x: 1021.5, z: 11.5 }; // the respawn spot of cs-rim
const FAR = respawn(checkpoint('cs-far'));
const FOOT = respawn(checkpoint('cs-foot'));
const END = respawn(checkpoint('cs-end'));

const eastCheckpoints = layout.checkpoints.filter(east);
const eastEnemies = layout.enemies.filter(east);
const tiles = solidTiles(world, { x0: 1031, x1: 1136 });
const box = (i0: number, j0: number, i1: number, j1: number) => tiles.filter(([i, j]) => inBox(i, j, i0, j0, i1, j1));
const mesaTop = box(1104, 14, 1129, 48).filter(([i, j]) => !(j === 30 && i <= 1114)); // the Coil has its own check
const east1061 = tiles.filter(([i]) => i >= 1061);
const holes = tiles.filter(([i, j]) => world.isTangle(i + 0.5, j + 0.5) && world.tangleGapAt(i + 0.5, j + 0.5) > 0.3);
const mouth = [
  [1102, 30],
  [1103, 30],
  [1104, 30],
];
const ring = { i0: 1082, j0: 40, i1: 1096, j1: 56 };
const insideRing = box(ring.i0 + 1, ring.j0 + 1, ring.i1 - 1, ring.j1 - 1);

const stair = puzzle('cs-stair');
const thicket = puzzle('cs-thicket');

describe('Coilstone east: the Rift', () => {
  it('lets the eight on easy cross the Bridge from the west rim to cs-far', () => {
    expect(exploreWest(RIM, EIGHT, 'easy').canStand(FAR)).toBe(true);
  });

  it('keeps the seven without the Cheetah, at the limit, off every tile east of the Rift', () => {
    const r = exploreWest(RIM, SEVEN, 'max');
    expect(reachedAny(r, east1061).slice(0, 3)).toEqual([]);
  });
});

describe('Coilstone east: the Stair', () => {
  it('lets the eight on easy use the speaker and the candle', () => {
    const r = explore(FAR, EIGHT, 'easy');
    expect(r.canUse(stair.speaker), 'speaker').toBe(true);
    expect(r.canUse(stair.candle), 'candle').toBe(true);
  });

  it('keeps the candle out of reach, at the limit, without the Bunny or the Fairy', () => {
    for (const f of ['bunny', 'fairy'] as FormId[]) {
      expect(explore(FAR, without(EIGHT, f), 'max').canUse(stair.candle), `without ${f}`).toBe(false);
    }
  });

  it('keeps the candle out of reach, at the limit, without a runner: the Cheetah runs the thin sheets as well as the Wolf', () => {
    expect(explore(FAR, without(without(EIGHT, 'wolf'), 'cheetah'), 'max').canUse(stair.candle)).toBe(false);
    expect(explore(FAR, without(EIGHT, 'wolf'), 'max').canUse(stair.candle), 'the Cheetah alone does it').toBe(true);
  });
});

describe('Coilstone east: the Thicket', () => {
  it('closes the ring of tangle, joined edge to edge', () => {
    expectClosedRing(
      (i, j) => world.isTangle(i + 0.5, j + 0.5),
      [ring.i0 + 1, ring.j0 + 1],
      [ring.i0, ring.j0, ring.i1, ring.j1],
      (ring.i1 - ring.i0 - 1) * (ring.j1 - ring.j0 - 1),
    );
  });

  it('lets the eight on easy use the speaker and the candle', () => {
    const r = explore(FAR, EIGHT, 'easy');
    expect(r.canUse(thicket.speaker), 'speaker').toBe(true);
    expect(r.canUse(thicket.candle), 'candle').toBe(true);
  });

  it('keeps the candle out of reach, at the limit, without the Ant or the Orangutan', () => {
    for (const f of ['ant', 'orangutan'] as FormId[]) {
      const r = explore(FAR, without(EIGHT, f), 'max');
      expect(r.canUse(thicket.candle), `without ${f}`).toBe(false);
    }
    const noAnt = explore(FAR, without(EIGHT, 'ant'), 'max');
    expect(reachedAny(noAnt, insideRing).slice(0, 3), 'inside the ring').toEqual([]);
  });
});

describe('Coilstone east: the Serpent\'s Head', () => {
  it('keeps the eight off the mesa top at the limit, and off every hole but the Ant on the three flat mouth tiles', () => {
    const r = explore(FAR, EIGHT, 'max');
    expect(reachedAny(r, mesaTop).slice(0, 3), 'mesa top').toEqual([]);
    const inHoles = reachedAny(r, holes).filter(([i, j]) => !mouth.some(([a, b]) => a === i && b === j));
    expect(inHoles.slice(0, 3), 'holes').toEqual([]);
    expect(r.canStand(END), 'cs-end').toBe(false);
  });

  it('lets the Snake with the eight reach cs-end on easy, and walk back down to the Foot', () => {
    expect(explore(FAR, NINE, 'easy').canStand(END), 'up').toBe(true);
    expect(explore(END, NINE, 'easy').canStand(FOOT), 'down').toBe(true);
  });
});

describe('Coilstone east fairness', () => {
  it('keeps every east checkpoint 7 tiles from a guard at about its height', () => {
    expect(eastEnemies).toHaveLength(6);
    expectCheckpointsAwayFromGuards(world, eastCheckpoints, eastEnemies);
  });

  it('keeps every archer 11.5 tiles from a respawn spot, unless it is 7.5 higher or lower', () => {
    expectArchersAwayFromRespawns(world, eastCheckpoints, layout.enemies.filter((e) => e.kind === 'archer'));
  });

  it('gives every sword and blade minLevel 7, and keeps the Thicket guards 10 tiles from the ring', () => {
    for (const e of eastEnemies.filter((q) => q.kind === 'sword' || q.kind === 'blade')) {
      expect(e.minLevel, `(${e.x}, ${e.z})`).toBe(7);
    }
    for (const e of eastEnemies.filter((q) => q.x < 1080)) {
      expect(inBox(Math.floor(e.x), Math.floor(e.z), ring.i0 - 9, ring.j0 - 9, ring.i1 + 9, ring.j1 + 9), `(${e.x}, ${e.z}) near the ring`).toBe(false);
    }
  });

  it('keeps the Bridge run-off clear and puts nothing on tangle or crust', () => {
    const things = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
      ...layout.trees,
    ].filter(east);
    expect(things.length).toBeGreaterThan(20);
    expectNoneOn('tangle', things, (s) => world.isTangle(s.x, s.z));
    expectNoneOn('crust', things, (s) => world.isThinIce(s.x, s.z));
    expectNoneOn('run-off', things, (s) => s.x >= 1061 && s.x < 1077 && s.z >= 4 && s.z < 7);
  });
});

describe('Coilstone east things', () => {
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
    for (const c of eastCheckpoints) expect(c.id.startsWith('cs-')).toBe(true);
    for (const h of layout.hints.filter(east)) expect(h.id.startsWith('cs-e-'), h.id).toBe(true);
    const mine = [stair, thicket];
    expectMelodies(mine, layout.puzzles);
    for (const p of mine) expect([5, 6, 7], p.id).toContain(p.melody[0]);
  });

  it('shows every thing to the camera', () => {
    for (const p of [stair, thicket]) {
      expectSeenFromCamera(world, `${p.id} speaker`, p.speaker.x, p.speaker.z);
      expectSeenFromCamera(world, `${p.id} candle`, p.candle.x, p.candle.z);
    }
    for (const c of eastCheckpoints) expectSeenFromCamera(world, c.id, c.x, c.z);
  });

  it('lets the nine on easy get from every respawn spot back to cs-far', () => {
    expectWayOut(explore, eastCheckpoints, FAR, NINE, 'easy');
  });
});
