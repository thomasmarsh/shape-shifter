import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { World } from '../world';
import {
  expectArchersAwayFromRespawns,
  expectCheckpointsAwayFromGuards,
  expectClosedRing,
  expectGatesTimed,
  expectMelodies,
  expectNoneOn,
  expectOnRealGround,
  expectPlatesOnRealGround,
  expectSeenFromCamera,
  expectUniqueIds,
  expectWayOut,
  exploreIn,
  inBox,
  reachedAny,
  respawnOf as respawn,
  solidTiles,
} from './testkit';

// The east half of Sunveld (x >= 820): the Umbrella Grove, the Kraal, the Red
// Wall with its timed gate, and the Cheetah's run over brittle crust.

const world = new World();
const { layout } = world;

const east = (s: { x: number }) => s.x >= 820 && s.x < 960;
const RANGE = { x0: 660, x1: 960 };
const explore = exploreIn(world, RANGE);

const SIX: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant'];
const SEVEN: FormId[] = [...SIX, 'mermaid'];
const EIGHT: FormId[] = [...SEVEN, 'cheetah'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);

const checkpoint = (id: string) => layout.checkpoints.find((c) => c.id === id)!;
const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
// A checkpoint is a post nobody stands in: claims start from its respawn spot.
const SV_EAST = respawn(checkpoint('sv-east'));
const HOME = { x: 824.5, z: 52.5 };
const YARD = respawn(checkpoint('sv-yard'));
const ground = (i: number, j: number) => world.groundAt(i + 0.5, j + 0.5);
const isVoid = (i: number, j: number) => world.isVoid(i + 0.5, j + 0.5);
const TERRACE_SPOT = { x: 931.5, z: 46.5 };

const eastCheckpoints = layout.checkpoints.filter(east);
const eastEnemies = layout.enemies.filter(east);
const eastTrees = layout.trees.filter(east);
const tiles = solidTiles(world, { x0: 820, x1: world.width });
const box = (i0: number, j0: number, i1: number, j1: number) => tiles.filter(([i, j]) => inBox(i, j, i0, j0, i1, j1));
const groveRock = box(826, 28, 834, 36);
const pierRock = box(859, 31, 861, 33);
const ring = { i0: 836, j0: 42, i1: 856, j1: 54 };
const insideRing = tiles.filter(([i, j]) => inBox(i, j, ring.i0 + 1, ring.j0 + 1, ring.i1 - 1, ring.j1 - 1));
const eastOfWall = tiles.filter(([i]) => i >= 870);
const wallHigh = tiles.filter(([i, j]) => ground(i, j) >= 31);
const kopje = box(923, 50, 940, 60);
const sunsetRock = box(925, 0, 937, 7);

const grove = puzzle('sv-grove');
const kraal = puzzle('sv-kraal');
const PLATE = layout.plates.find((p) => p.x < 850)!;

describe('Sunveld east: the Umbrella Grove', () => {
  it('keeps Grove Rock out of reach without the Orangutan', () => {
    const r = explore(SV_EAST, without(SEVEN, 'orangutan'), 'max');
    expect(reachedAny(r, groveRock).slice(0, 3)).toEqual([]);
    expect(r.canUse(grove.speaker), 'speaker').toBe(false);
  });

  it('keeps the candle out of reach without the Wolf or without the Fairy', () => {
    for (const f of ['wolf', 'fairy'] as FormId[]) {
      const r = explore(SV_EAST, without(SEVEN, f), 'max');
      expect(reachedAny(r, pierRock).slice(0, 3), `without ${f}`).toEqual([]);
      expect(r.canUse(grove.candle), `without ${f}`).toBe(false);
    }
  });

  it('lets the full set use the speaker and the candle', () => {
    const r = explore(SV_EAST, SEVEN, 'easy');
    expect(r.canUse(grove.speaker), 'speaker').toBe(true);
    expect(r.canUse(grove.candle), 'candle').toBe(true);
  });
});

describe('Sunveld east: the Kraal', () => {
  it('closes the ring of thorn, joined edge to edge', () => {
    expectClosedRing(
      (i, j) => world.isTangle(i + 0.5, j + 0.5),
      [838, 44],
      [ring.i0, ring.j0, ring.i1, ring.j1],
      (ring.i1 - ring.i0 - 1) * (ring.j1 - ring.j0 - 1),
    );
  });

  it('keeps everybody but the Ant out of the ring', () => {
    const r = explore(SV_EAST, without(SEVEN, 'ant'), 'max');
    expect(reachedAny(r, insideRing).slice(0, 3)).toEqual([]);
  });

  it('keeps the speaker out of reach without the Orangutan', () => {
    const r = explore(SV_EAST, without(SEVEN, 'orangutan'), 'max');
    expect(r.canUse(kraal.speaker)).toBe(false);
  });

  it('keeps the candle out of reach without the Bunny or without the Fairy', () => {
    for (const f of ['bunny', 'fairy'] as FormId[]) {
      const r = explore(SV_EAST, without(SEVEN, f), 'max');
      expect(r.canUse(kraal.candle), `without ${f}`).toBe(false);
    }
  });

  it('lets the full set use the speaker and the candle', () => {
    const r = explore(SV_EAST, SEVEN, 'easy');
    expect(r.canUse(kraal.speaker), 'speaker').toBe(true);
    expect(r.canUse(kraal.candle), 'candle').toBe(true);
    expect(r.canStand(respawn(checkpoint('sv-kraal'))), 'respawn spot').toBe(true);
  });
});

describe('Sunveld east: the Red Wall', () => {
  it('keeps the level-6 set off everything east of the wall, and off the wall, at the limit', () => {
    const r = explore(SV_EAST, SEVEN, 'max');
    expect(reachedAny(r, eastOfWall).slice(0, 3), 'east of the wall').toEqual([]);
    expect(reachedAny(r, wallHigh).slice(0, 3), 'wall height').toEqual([]);
  });

  it('lets the Cheetah on easy stand on Sunset Rock, through the gate', () => {
    const r = explore(SV_EAST, EIGHT, 'easy');
    expect(r.canStand(YARD), 'yard').toBe(true);
    expect(r.canStand(respawn(checkpoint('sv-kopje'))), 'kopje').toBe(true);
    expect(r.canStand(TERRACE_SPOT), 'terrace').toBe(true);
    expect(r.canStand(respawn(checkpoint('sv-end'))), 'sv-end').toBe(true);
    expect(reachedAny(r, sunsetRock).length).toBeGreaterThan(50);
  });

  it('needs the Cheetah for the gate: the Wolf alone does not make it', () => {
    const r = explore(SV_EAST, SEVEN, 'max');
    expect(r.canStand(YARD)).toBe(false);
  });

  it('keeps the level-6 set from the Yard off the Kopje, and from the Terrace off Sunset Rock', () => {
    const fromYard = explore(YARD, SEVEN, 'max');
    expect(reachedAny(fromYard, kopje).slice(0, 3), 'kopje').toEqual([]);
    const fromTerrace = explore(TERRACE_SPOT, SEVEN, 'max');
    expect(reachedAny(fromTerrace, sunsetRock).slice(0, 3), 'sunset rock').toEqual([]);
  });

  it('times the gate: 0.4 s to spare for the Cheetah, too little for the Wolf', () => {
    expectGatesTimed(world, layout.plates.filter(east));
    expect(PLATE.seconds).toBe(3.8);
  });

  it('puts a return plate in the Yard that anyone can use', () => {
    const r = explore(YARD, EIGHT, 'easy');
    expect(r.canStand(HOME)).toBe(true);
    const human = explore(YARD, ['human'], 'easy');
    expect(human.canStand(HOME), 'a Human walks back').toBe(true);
  });
});

describe('Sunveld east fairness', () => {
  it('keeps every east checkpoint 7 tiles from a guard post at about its height', () => {
    expect(eastEnemies).toHaveLength(7);
    expectCheckpointsAwayFromGuards(world, eastCheckpoints, eastEnemies);
  });

  it('keeps every archer 11.5 tiles from a respawn spot, unless it is 7.5 higher or lower', () => {
    expectArchersAwayFromRespawns(world, eastCheckpoints, layout.enemies.filter((e) => e.kind === 'archer'));
  });

  it('gives every sword and blade minLevel 7, and puts no bad guy in the Kraal or on the crust', () => {
    for (const e of eastEnemies.filter((q) => q.kind === 'sword' || q.kind === 'blade')) {
      expect(e.minLevel, `(${e.x}, ${e.z})`).toBe(7);
    }
    for (const e of eastEnemies) {
      expect(inBox(Math.floor(e.x), Math.floor(e.z), ring.i0 - 9, ring.j0 - 9, 848, ring.j1 + 9), `(${e.x}, ${e.z}) near the thorn`).toBe(false);
    }
  });

  it('puts no thing on thorn, crust or gate', () => {
    const things = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
      ...layout.trees,
      ...layout.arrivals,
    ].filter(east);
    expect(things.length).toBeGreaterThan(25);
    expectNoneOn('thorn', things, (s) => world.isTangle(s.x, s.z));
    expectNoneOn('gate', things, (s) => world.isGate(s.x, s.z));
    expectNoneOn('crust', things, (s) => world.isThinIce(s.x, s.z));
  });
});

describe('Sunveld east way out', () => {
  it('lets the level-6 set get from the respawn spot of every checkpoint west of the wall to sv-east', () => {
    expectWayOut(explore, eastCheckpoints.filter((c) => c.x < 860), HOME, SEVEN, 'easy');
  });

  it('lets the Cheetah get from every respawn spot beyond the wall back to sv-east', () => {
    expectWayOut(explore, eastCheckpoints.filter((c) => c.x > 860), HOME, EIGHT, 'easy');
  });
});

describe('Sunveld east things', () => {
  it('stand on real ground', () => {
    const spots = [
      ...layout.puzzles.flatMap((p) => [p.speaker]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
      ...layout.trees,
    ].filter(east);
    expectOnRealGround(world, spots);
  });

  it('puts both candles on dry stone, and the plates on real ground', () => {
    for (const p of [grove, kraal]) expect(world.isWater(p.candle.x, p.candle.z)).toBe(false);
    expect(layout.plates.filter(east)).toHaveLength(2);
    expectPlatesOnRealGround(world, layout.plates.filter(east));
  });

  it('has no id clash and its own ids', () => {
    expectUniqueIds(eastCheckpoints, layout.bread.filter(east), layout.puzzles.filter((p) => east(p.speaker)), layout.hints);
    for (const c of eastCheckpoints) expect(c.id.startsWith('sv-')).toBe(true);
  });

  it('gives each puzzle a melody of six different notes unlike any other, starting 5, 6 or 7', () => {
    const mine = [grove, kraal];
    expectMelodies(mine, layout.puzzles);
    for (const p of mine) expect([5, 6, 7], p.id).toContain(p.melody[0]);
  });

  it('has three great acacias and no boulders', () => {
    expect(eastTrees).toHaveLength(3);
    for (const t of eastTrees) expect(t.kind).toBe('greatAcacia');
    expect(layout.boulders.filter(east)).toEqual([]);
  });
});

describe('Sunveld east from the game camera', () => {
  it('hides no speaker, candle, checkpoint, bread or tree', () => {
    const spots = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints,
      ...layout.bread,
      ...layout.trees,
    ].filter(east);
    expect(spots.length).toBeGreaterThan(15);
    for (const s of spots) expectSeenFromCamera(world, 'thing', s.x, s.z);
  });
});

describe('Sunveld east geometry the design leans on', () => {
  it('lays flat ground at 16, the wall and the escarpment at 31', () => {
    for (let j = 10; j <= 60; j += 5) {
      for (let i = 820; i <= 866; i += 6) {
        if (!inBox(i, j, 826, 28, 834, 36) && !inBox(i, j, 836, 42, 856, 54) && !inBox(i, j, 859, 46, 864, 53)) expect(ground(i, j), `(${i}, ${j})`).toBe(16);
      }
    }
    for (let j = 0; j < 64; j += 7) for (const i of [867, 868, 869]) expect(ground(i, j), `(${i}, ${j})`).toBe(31);
    for (let i = 820; i <= 866; i += 9) expect(ground(i, 4)).toBe(31);
  });

  it('stands no ground above 25 west of the wall outside the Kraal', () => {
    for (const [i, j] of tiles) {
      if (i >= 867 || ground(i, j) <= 25 || ground(i, j) >= 31) continue;
      expect(inBox(i, j, ring.i0, ring.j0, ring.i1, ring.j1), `(${i}, ${j}) at ${ground(i, j)}`).toBe(true);
    }
  });

  it('rises one a tree on the pillar, to Grove Rock at the last treetop + 1 behind an empty tile', () => {
    expect(ground(830, 41)).toBe(16);
    expect(ground(830, 38)).toBe(17);
    expect(ground(830, 38) + 5).toBe(22);
    expect(ground(826, 28)).toBe(23);
    expect(ground(830, 37)).toBe(16);
  });

  it('makes the pier flat at Grove Rock height, 8 tiles of sky to Pier Rock, 1 higher', () => {
    expect(world.isThinIce(835.5, 32.5)).toBe(true);
    expect(world.isThinIce(850.5, 32.5)).toBe(true);
    for (let i = 851; i <= 858; i++) expect(world.isThinIce(i + 0.5, 32.5) || ground(i, 32) > 0 && !isVoid(i, 32), `tile ${i}`).toBe(ground(i, 32) === 16);
    expect(ground(859, 32)).toBe(24);
  });

  it('puts the Kraal ledge 1 over the tree and the spire 4 over the ledge across 7 tiles', () => {
    expect(ground(843, 49)).toBe(22);
    expect(ground(841, 50) + 5).toBe(21);
    expect(ground(842, 50)).toBe(16);
    expect(ground(854, 50)).toBe(26);
    for (let i = 847; i <= 853; i++) expect(ground(i, 50), `tile ${i}`).toBe(16);
  });

  it('opens the gate to the Yard, with the crust 40 long (gap 4) and the High Crust 36 long (gap 5)', () => {
    for (let i = 883; i <= 922; i++) {
      const gap = i >= 900 && i <= 903;
      expect(world.isThinIce(i + 0.5, 55.5), `crust ${i}`).toBe(!gap);
    }
    for (let j = 8; j <= 43; j++) {
      const gap = j >= 24 && j <= 28;
      expect(world.isThinIce(931.5, j + 0.5), `high crust ${j}`).toBe(!gap);
    }
    expect(ground(927, 44)).toBe(20);
    expect(ground(925, 0)).toBe(20);
  });
});
