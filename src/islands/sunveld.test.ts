import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { Kind } from '../layout';
import { World } from '../world';
import { BASE, sunveld, DEEP_BED, LEVEL, MAT_BED, MESA, PILLAR, TERRACE, WALL, crustTop } from './sunveld';
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

// The west half of Sunveld (x 700 to 819): the landing, the Watering Hole, the
// Oxbow and the Red Table. The Cheetah is not needed anywhere in the west half.

const world = new World();
const { layout } = world;

const west = (s: { x: number }) => s.x >= 700 && s.x < 820;
// Sunveld's columns with Pearl Rock (x 659..671) for the arrival claim.
const explore = exploreIn(world, { x0: 620, x1: 960 });
const START = respawn({ x: 708.5, z: 52.5 });
const PEARL = respawn({ x: 667.5, z: 56.5 });

const SEVEN: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);

const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const ground = (i: number, j: number) => world.groundAt(i + 0.5, j + 0.5);
const isVoid = (i: number, j: number) => world.isVoid(i + 0.5, j + 0.5);
const westCheckpoints = layout.checkpoints.filter(west);
const westBread = layout.bread.filter(west);
const westEnemies = layout.enemies.filter(west);
const westPuzzles = layout.puzzles.filter((p) => west(p.speaker));
const westHints = layout.hints.filter(west);

const tiles = solidTiles(world, { x0: 700, x1: 820 });
const mesa = tiles.filter(([i, j]) => inBox(i, j, 790, 24, 801, 35));
const mesaInside = tiles.filter(([i, j]) => inBox(i, j, 795, 27, 798, 30));
const islet = tiles.filter(([i, j]) => inBox(i, j, 740, 22, 746, 28));
const ringInside = tiles.filter(([i, j]) => inBox(i, j, 738, 16, 758, 34));
const hole = tiles.filter(([i, j]) => inBox(i, j, 720, 30, 726, 34));

describe('Sunveld west with the shapes of level 6', () => {
  const all = explore(START, SEVEN, 'easy');

  it('lets seven forms use every speaker and candle, stand on every respawn spot and reach all bread', () => {
    expect(westPuzzles.map((p) => p.id)).toEqual(['sv-hole', 'sv-table', 'sv-oxbow']);
    for (const p of westPuzzles) {
      expect(all.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(all.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
    expect(westCheckpoints.map((c) => c.id)).toEqual(['sunveld', 'sv-mid', 'sv-table']);
    for (const c of westCheckpoints) expect(all.canStand(respawn(c)), `checkpoint ${c.id}`).toBe(true);
    expect(westBread).toHaveLength(3);
    for (const b of westBread) expect(all.canStand(b), `bread ${b.id}`).toBe(true);
  });

  it('lets the level-6 set stand on the landing from Pearl Rock', () => {
    const r = explore(PEARL, SEVEN.filter((f) => f !== 'mermaid'), 'easy');
    expect(r.canStand(START)).toBe(true);
  });
});

describe('Sunveld west: the Watering Hole', () => {
  it('lets a Human alone use the speaker', () => {
    expect(explore(START, ['human'], 'easy').canUse(puzzle('sv-hole').speaker)).toBe(true);
  });
  it('keeps the candle from every set without the Mermaid, and gives it to her', () => {
    expect(explore(START, without(SEVEN, 'mermaid'), 'max').canUse(puzzle('sv-hole').candle)).toBe(false);
    expect(explore(START, SEVEN, 'easy').canUse(puzzle('sv-hole').candle)).toBe(true);
  });
});

describe('Sunveld west: the Red Table', () => {
  const r = (forms: FormId[]) => explore(START, forms, 'max');
  it('keeps everyone off the mesa without the Wolf', () => {
    expect(reachedAny(r(without(SEVEN, 'wolf')), mesa).slice(0, 3)).toEqual([]);
  });
  it('keeps the speaker from every set without the Ant', () => {
    expect(r(without(SEVEN, 'ant')).canUse(puzzle('sv-table').speaker)).toBe(false);
    expect(reachedAny(r(without(SEVEN, 'ant')), mesaInside).slice(0, 3)).toEqual([]);
  });
  it('keeps the candle from every set without the Fairy', () => {
    expect(r(without(SEVEN, 'fairy')).canUse(puzzle('sv-table').candle)).toBe(false);
  });
  it('gives the full set the mesa, the speaker and the candle', () => {
    const x = explore(START, SEVEN, 'easy');
    expect(reachedAny(x, mesa).length).toBeGreaterThan(100);
    expect(x.canUse(puzzle('sv-table').speaker)).toBe(true);
    expect(x.canUse(puzzle('sv-table').candle)).toBe(true);
  });
  it('closes the thorn ring, joined edge to edge', () => {
    expectClosedRing((i, j) => world.isTangle(i + 0.5, j + 0.5), [796, 28], [795, 27, 798, 30], 4 * 4);
  });
});

describe('Sunveld west: the Oxbow', () => {
  const r = (forms: FormId[]) => explore(START, forms, 'max');
  it('closes the kelp ring, joined edge to edge', () => {
    expectClosedRing((i, j) => world.isKelp(i + 0.5, j + 0.5), [743, 25], [738, 16, 758, 34], 21 * 19);
  });
  it('keeps everyone inside the ring without the Mermaid', () => {
    expect(reachedAny(r(without(SEVEN, 'mermaid')), ringInside).slice(0, 3)).toEqual([]);
  });
  it('keeps the speaker from every set without the Bunny', () => {
    expect(r(without(SEVEN, 'bunny')).canUse(puzzle('sv-oxbow').speaker)).toBe(false);
  });
  it('keeps the candle from every set without the Bunny or without the Fairy', () => {
    expect(r(without(SEVEN, 'bunny')).canUse(puzzle('sv-oxbow').candle)).toBe(false);
    expect(r(without(SEVEN, 'fairy')).canUse(puzzle('sv-oxbow').candle)).toBe(false);
  });
  it('gives the full set the islet, the speaker and the candle', () => {
    const x = explore(START, SEVEN, 'easy');
    expect(reachedAny(x, islet).length).toBeGreaterThan(30);
    expect(x.canUse(puzzle('sv-oxbow').speaker)).toBe(true);
    expect(x.canUse(puzzle('sv-oxbow').candle)).toBe(true);
  });
  it('lets the Mermaid alone reach the islet from the shore', () => {
    expect(reachedAny(explore(START, ['mermaid', 'human'], 'easy'), islet).length).toBeGreaterThan(30);
  });
});

describe('Sunveld west: nothing climbs the wall', () => {
  it('lets the level-6 set on max stand on nothing at wall height or at x >= 870', () => {
    const x = explore(START, SEVEN, 'max');
    const high = tiles.filter(([i, j]) => ground(i, j) > 25 && x.canStand({ x: i + 0.5, z: j + 0.5 }));
    expect(high.slice(0, 3)).toEqual([]);
    expect(Math.max(...reachedAny(x, tiles).map(([i, j]) => ground(i, j)))).toBeLessThanOrEqual(25);
    for (let j = 0; j < 64; j++) for (let i = 870; i < 960; i++) expect(x.canStand({ x: i + 0.5, z: j + 0.5 }), `(${i}, ${j})`).toBe(false);
  });
});

describe('Sunveld west fairness for a one-heart Ant', () => {
  it('has no enemy on the mesa and none within 9 tiles of the thorn ring', () => {
    for (const e of westEnemies) {
      expect(inBox(e.x, e.z, 790, 24, 802, 36), `enemy (${e.x}, ${e.z}) on the mesa`).toBe(false);
      expect(Math.hypot(e.x - 796.5, e.z - 28.5), `enemy (${e.x}, ${e.z})`).toBeGreaterThanOrEqual(9);
    }
  });

  it('puts no thing, enemy, checkpoint stand or respawn spot on a tangle, crust or kelp', () => {
    const things = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
    ].filter(west);
    expect(things.length).toBeGreaterThan(14);
    expectNoneOn('tangle', things, (s) => world.isTangle(s.x, s.z));
    expectNoneOn('crust', things, (s) => world.isThinIce(s.x, s.z));
    expectNoneOn('kelp', things, (s) => world.isKelp(s.x, s.z));
  });

  it('keeps every west checkpoint 7 tiles from a guard post at about its height', () => {
    expectCheckpointsAwayFromGuards(world, westCheckpoints, westEnemies);
  });

  it('has no archer, and keeps the respawn spots clear of any anyway', () => {
    expect(westEnemies.filter((e) => e.kind === 'archer')).toEqual([]);
    expectArchersAwayFromRespawns(world, westCheckpoints, []);
  });

  it('gives no sword or blade without minLevel 7', () => {
    for (const e of westEnemies) if (e.kind === 'sword' || e.kind === 'blade') expect(e.minLevel).toBe(7);
  });
});

describe('Sunveld west way out', () => {
  it('lets the level-6 set on easy reach the landing from every respawn spot', () => {
    expectWayOut(explore, westCheckpoints, START, without(SEVEN, 'mermaid'), 'easy');
  }, 30000);
});


// A Snapper stands in water, kelp-free and a tile from the pool's edge; its pool is the water it can reach.
const snapperOk = (world: World, e: { x: number; z: number }) => {
  const i = Math.floor(e.x), j = Math.floor(e.z);
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
    expect(world.isWater(i + di + 0.5, j + dj + 0.5), `snapper (${e.x}, ${e.z}) near ${i + di},${j + dj}`).toBe(true);
  }
  expect(world.isKelp(e.x, e.z), `snapper (${e.x}, ${e.z}) kelp`).toBe(false);
};
describe('Sunveld west things', () => {
  it('stand on real ground', () => {
    const spots = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
    ].filter(west);
    const candles = [puzzle('sv-hole').candle];
    const snappers = spots.filter((s) => (s as { kind?: string }).kind === 'snapper');
    expect(snappers.length).toBe(1);
    expectOnRealGround(world, spots, (s) => candles.includes(s as never) || snappers.includes(s));
    for (const e of snappers) snapperOk(world, e);
  });

  it('has no id clash among its things', () => {
    expectUniqueIds(westCheckpoints, westBread, westPuzzles, westHints);
  });

  it('gives the three puzzles six different notes each, starting on 0, 1 or 2', () => {
    expect(westPuzzles).toHaveLength(3);
    expectMelodies(westPuzzles, layout.puzzles);
    for (const p of westPuzzles) expect([0, 1, 2], p.id).toContain(p.melody[0]);
  });

  it('has no trees and no boulders', () => {
    expect(layout.trees.filter(west)).toEqual([]);
    expect(layout.boulders.filter(west)).toEqual([]);
  });

  it('has the five hints and the arrival card', () => {
    expect(westHints.map((h) => h.id)).toEqual(['sv-hole', 'sv-oxbow', 'sv-crust', 'sv-thorn', 'sv-pillar']);
    const card = layout.arrivals.find((a) => a.id === 'sunveld')!;
    expect(card.title).toBe('Sunveld');
    expect(card.eyebrow).toBe('Island seven');
  });
});

describe('Sunveld west from the game camera', () => {
  it('hides no speaker, candle, checkpoint or bread', () => {
    const plain = [
      ...westPuzzles.map((p) => p.speaker),
      ...westPuzzles.filter((p) => p.id !== 'sv-hole').map((p) => p.candle),
      ...westCheckpoints,
      ...westBread,
    ];
    for (const s of plain) expectSeenFromCamera(world, 'thing', s.x, s.z);
    const c = puzzle('sv-hole').candle;
    expectSeenFromCamera(world, 'pickle', c.x, c.z, world.waterLevelAt(c.x, c.z));
  });
});

describe('Sunveld west geometry the design leans on', () => {
  const flat = (i0: number, j0: number, i1: number, j1: number, h: number) => {
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) expect(ground(i, j), `(${i}, ${j})`).toBe(h);
  };

  it('is flat straw at BASE from the landing to x 819, with the escarpment at WALL', () => {
    flat(700, 46, 716, 60, BASE);
    flat(770, 40, 784, 59, BASE);
    flat(712, 0, 819, 9, WALL);
    for (let j = 46; j <= 60; j++) for (let i = 700; i <= 716; i++) expect(isVoid(i, j), `(${i}, ${j})`).toBe(false);
  });

  it('puts nothing raised west of x 725 and nothing standable above 25 outside the escarpment', () => {
    for (const [i, j] of tiles) {
      if (j <= 9) continue;
      if (ground(i, j) > BASE + 0.4 && !world.isThinIce(i + 0.5, j + 0.5)) {
        expect(i, `(${i}, ${j}) raised`).toBeGreaterThanOrEqual(725);
        expect(ground(i, j), `(${i}, ${j})`).toBeLessThanOrEqual(25);
      }
    }
  });

  it('digs the Hole 8 under the water, and the Oxbow 7.1 under the mat', () => {
    for (const [i, j] of hole) expect(ground(i, j)).toBeCloseTo(DEEP_BED, 6);
    expect(world.waterLevelAt(723.5, 32.5)).toBeCloseTo(LEVEL, 6);
    for (let j = 12; j <= 38; j++) {
      for (let i = 734; i <= 762; i++) {
        if (inBox(i, j, 740, 22, 746, 28) || inBox(i, j, 752, 25, 753, 26)) continue;
        expect(ground(i, j), `(${i}, ${j})`).toBeCloseTo(MAT_BED, 6);
      }
    }
    expect(world.isKelp(737.5, 20.5)).toBe(true);
  });

  it('puts the terrace at 20 and the spire at 24, +4 across 7 tiles of water', () => {
    flat(742, 24, 744, 26, TERRACE);
    flat(752, 25, 753, 26, 24);
    for (const i of [745, 746, 747, 748, 749, 750, 751]) expect(world.isWater(i + 0.5, 25.5) || ground(i, 25) === BASE).toBe(true);
    flat(740, 22, 741, 28, BASE);
  });

  it('climbs the crust stair 0.25 a tile to the mesa, and puts the pillar +3 over 8 tiles', () => {
    for (let i = 766; i <= 789; i++) {
      for (const j of [28, 29, 30]) {
        expect(world.isThinIce(i + 0.5, j + 0.5), `(${i}, ${j})`).toBe(true);
        expect(ground(i, j)).toBeCloseTo(crustTop(i), 6);
      }
    }
    expect(crustTop(789)).toBeCloseTo(MESA, 9);
    flat(790, 24, 793, 35, MESA);
    flat(795, 14, 796, 15, PILLAR);
    flat(795, 16, 796, 23, BASE);
  });

  it('keeps the table, the speaker and the bread inside the thorn on the mesa', () => {
    for (const [i, j] of mesaInside) expect(ground(i, j)).toBe(MESA);
    expect(inBox(796, 28, 795, 27, 798, 30) && inBox(797, 29, 795, 27, 798, 30)).toBe(true);
  });

  it('uses straw and clay, sand for the beds', () => {
    const kinds = new Set<number>();
    new World([
      {
        id: 'scratch',
        name: 'Scratch',
        build(t) {
          const built = sunveld.build({
            ...t,
            set(i, j, h, k) {
              if (i < 820) kinds.add(k);
              t.set(i, j, h, k);
            },
          });
          return { ...built, spawn: START };
        },
      },
    ]);
    expect([...kinds].sort()).toEqual([Kind.Straw, Kind.Clay, Kind.Sand].sort());
  });
});
