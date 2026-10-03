import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { explore } from '../levelcheck';
import { World } from '../world';
import { fallsTop, pierTop, runTop } from './frostfang-run';

// Frostfang is one island built from two files: the hub and the five candles in
// frostfang.ts (x < 243), the lake and the Wolf's exit run in frostfang-run.ts
// (x >= 243). These tests check each half and then the island as a whole.

const world = new World();
const { layout } = world;

const WEST_END = 243;
const west = (s: { x: number }) => s.x >= 203 && s.x < WEST_END;
const east = (s: { x: number }) => s.x >= WEST_END;
/** Everything of Frostfang: Underroot's stub sits south of the last run, from z = 46. */
const onIsland = (s: { x: number; z: number }) => s.x >= 200 && !(s.x >= 298 && s.z >= 46);
const respawn = (c: { x: number; z: number }) => ({ x: c.x - 1, z: c.z + 1 });

/** The real arrival, where Highcrag's last step drops you. */
const START = { x: 208.5, z: 40.5 };
const SHORE = { x: 243.5, z: 29.5 };
const GLACIER = { x: 277.5, z: 30.5 };
const UPPER = { x: 279.5, z: 20.5 };
const BROW = { x: 279.5, z: 11.5 };
const LAST_ROCK = { x: 304.5, z: 11.5 };
const UNDERROOT = layout.arrivals.find((a) => a.id === 'underroot')!;

const FOUR: FormId[] = ['human', 'fairy', 'orangutan', 'bunny'];
const FIVE: FormId[] = [...FOUR, 'wolf'];
const fourWithout = (f: FormId): FormId[] => FOUR.filter((x) => x !== f);
const fiveWithout = (f: FormId): FormId[] => FIVE.filter((x) => x !== f);

const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const ground = (i: number, j: number) => world.groundAt(i + 0.5, j + 0.5);
const IDS = ['ff-steps', 'ff-needle', 'ff-road', 'ff-under', 'ff-fang'];
const islandCheckpoints = layout.checkpoints.filter(onIsland);
const hubCheckpoints = islandCheckpoints.filter((c) => west(c) && c.id.startsWith('ff-'));
const westBread = layout.bread.filter((b) => b.id.startsWith('ff-') && west(b));
const eastCheckpoints = layout.checkpoints.filter(east);
const eastBread = layout.bread.filter(east);

/** Every tile at x >= 243 that is not void. */
const eastTiles: [number, number][] = [];
for (let j = 0; j < world.depth; j++) {
  for (let i = WEST_END; i < world.width; i++) {
    if (!world.isVoid(i + 0.5, j + 0.5)) eastTiles.push([i, j]);
  }
}

/** How many tiles of a box (bounds inclusive) were reached. */
function boxReached(r: ReturnType<typeof explore>, i0: number, j0: number, i1: number, j1: number): number {
  let n = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (r.has(i, j)) n++;
  return n;
}

describe('Frostfang with the four forms of level 3', () => {
  const r = explore(world, START, FOUR, 'easy');

  it('lets all five puzzles be solved', () => {
    for (const id of IDS) {
      expect(r.canUse(puzzle(id).speaker), `${id} speaker`).toBe(true);
      expect(r.canUse(puzzle(id).candle), `${id} candle`).toBe(true);
    }
  });

  it('reaches every checkpoint respawn spot and every piece of bread', () => {
    expect(hubCheckpoints).toHaveLength(2);
    for (const c of hubCheckpoints) expect(r.canStand({ x: c.x - 1, z: c.z + 1 }), `checkpoint ${c.id}`).toBe(true);
    expect(westBread).toHaveLength(5);
    for (const b of westBread) expect(r.canStand(b), `bread ${b.id}`).toBe(true);
  });

  it('gives the island exactly five puzzles and five distinct melodies of six notes', () => {
    const mine = layout.puzzles.filter((p) => p.id.startsWith('ff-'));
    expect(mine.map((p) => p.id)).toEqual(IDS);
    const seen = new Set(layout.puzzles.filter((p) => !p.id.startsWith('ff-')).map((p) => p.melody.join()));
    for (const p of mine) {
      expect(p.melody, p.id).toHaveLength(6);
      expect(new Set(p.melody).size, p.id).toBe(6);
      for (const n of p.melody) expect(n).toBeLessThan(8);
      expect(seen.has(p.melody.join()), `${p.id} repeats a melody`).toBe(false);
      seen.add(p.melody.join());
    }
  });
});

describe('Frostfang needs every shape', () => {
  /** Reach with these forms at the limit, and say whether speaker / candle can be used. */
  const can = (forms: FormId[], id: string) => {
    const r = explore(world, START, forms, 'max');
    return { speaker: r.canUse(puzzle(id).speaker), candle: r.canUse(puzzle(id).candle) };
  };

  it('Snow Steps: nothing without the bunny', () => {
    expect(can(fourWithout('bunny'), 'ff-steps')).toEqual({ speaker: false, candle: false });
  });

  it('Needle: no candle without the bunny or without the fairy, but a human uses the speaker', () => {
    expect(can(fourWithout('bunny'), 'ff-needle').candle, 'no bunny').toBe(false);
    expect(can(fourWithout('fairy'), 'ff-needle').candle, 'no fairy').toBe(false);
    expect(can(['human'], 'ff-needle').speaker, 'human alone').toBe(true);
    expect(can(['human'], 'ff-needle').candle, 'human alone').toBe(false);
  });

  it('Pine Road: nothing without the orangutan, and no candle without the bunny', () => {
    expect(can(fourWithout('orangutan'), 'ff-road')).toEqual({ speaker: false, candle: false });
    expect(can(fourWithout('bunny'), 'ff-road').candle, 'no bunny').toBe(false);
  });

  it('Undercliff: no candle without the fairy, and a human uses the speaker', () => {
    expect(can(fourWithout('fairy'), 'ff-under').candle, 'no fairy').toBe(false);
    expect(can(['human'], 'ff-under').speaker, 'human alone').toBe(true);
  });

  it('Undercliff: only the orangutan gets back up from the shelf', () => {
    const shelf = { x: 223.5, z: 49.5 };
    const stuck = explore(world, shelf, fourWithout('orangutan'), 'max');
    expect(boxReached(stuck, 203, 22, 242, 47), 'hub tiles without the orangutan').toBe(0);
    const out = explore(world, shelf, FOUR, 'easy');
    expect(out.canStand({ x: 231.5, z: 47.5 }), 'hub rim above the pine').toBe(true);
    expect(out.canStand(START), 'the landing').toBe(true);
    // The candle rock is no way out either.
    const rock = explore(world, { x: 223.5, z: 61.5 }, fourWithout('orangutan'), 'max');
    expect(boxReached(rock, 203, 22, 242, 47), 'hub tiles from the candle rock').toBe(0);
  });

  it('Fang: nothing without the bunny, the fairy or the orangutan', () => {
    for (const f of ['bunny', 'fairy', 'orangutan'] as const) {
      expect(can(fourWithout(f), 'ff-fang'), `without ${f}`).toEqual({ speaker: false, candle: false });
    }
  });
});

describe('Frostfang east, with all five forms on easy', () => {
  const r = explore(world, SHORE, FIVE, 'easy');

  it('reaches every stop of the run and the arrival at Underroot', () => {
    expect(r.canStand(GLACIER), 'Glacier').toBe(true);
    expect(r.canStand(UPPER), 'upper glacier').toBe(true);
    expect(r.canStand(BROW), 'Brow').toBe(true);
    expect(r.canStand(LAST_ROCK), 'Last Rock').toBe(true);
    expect(r.canStand(UNDERROOT), 'Underroot arrival').toBe(true);
  });

  it('reaches every checkpoint respawn spot and every piece of bread', () => {
    expect(eastCheckpoints.length).toBeGreaterThanOrEqual(5);
    for (const c of eastCheckpoints) expect(r.canStand(respawn(c)), `checkpoint ${c.id}`).toBe(true);
    expect(eastBread.length).toBeGreaterThanOrEqual(3);
    for (const b of eastBread) expect(r.canStand(b), `bread ${b.id}`).toBe(true);
  });
});

describe('Frostfang east needs the Wolf', () => {
  for (const [name, at] of [['the shore', SHORE], ['the real arrival', START]] as const) {
    it(`keeps the four older forms off everything at x >= 274, from ${name}, at the limit`, () => {
      const r = explore(world, at, FOUR, 'max');
      const reached = eastTiles.filter(([i, j]) => i >= 274 && r.has(i, j));
      expect(reached.slice(0, 5)).toEqual([]);
    });
  }
});

describe('Frostfang east needs every form', () => {
  it('stops without the bunny at the Glacier, short of the upper glacier', () => {
    const r = explore(world, SHORE, fiveWithout('bunny'), 'max');
    expect(r.canStand(GLACIER), 'Glacier').toBe(true);
    expect(r.canStand(UPPER), 'upper glacier').toBe(false);
    expect(r.canStand(UNDERROOT), 'Underroot').toBe(false);
  });

  it('stops without the orangutan on the upper glacier, short of the Brow', () => {
    const r = explore(world, SHORE, fiveWithout('orangutan'), 'max');
    expect(r.canStand(UPPER), 'upper glacier').toBe(true);
    expect(r.canStand(BROW), 'Brow').toBe(false);
    expect(r.canStand(UNDERROOT), 'Underroot').toBe(false);
  });

  it('stops without the fairy on the Brow, short of Last Rock', () => {
    const r = explore(world, SHORE, fiveWithout('fairy'), 'max');
    expect(r.canStand(BROW), 'Brow').toBe(true);
    expect(r.canStand(LAST_ROCK), 'Last Rock').toBe(false);
    expect(r.canStand(UNDERROOT), 'Underroot').toBe(false);
  });

  it('stops without the wolf at the shore', () => {
    const r = explore(world, SHORE, FOUR, 'max');
    expect(r.canStand(GLACIER), 'Glacier').toBe(false);
    expect(r.canStand(UNDERROOT), 'Underroot').toBe(false);
  });

  it('does not let the human help: the guards and the archer are all it is for', () => {
    // The human has no move of its own here, so without it the run is still
    // possible; its job is to fight. Make sure there is something to fight.
    const guards = layout.enemies.filter((e) => east(e) && e.x < 285 && e.z > 15);
    expect(guards.some((e) => e.kind === 'archer')).toBe(true);
    expect(guards.some((e) => e.kind !== 'archer')).toBe(true);
  });

  it('keeps anyone who starts on Last Rock without the wolf off Underroot', () => {
    const r = explore(world, LAST_ROCK, fiveWithout('wolf'), 'max');
    expect(r.canStand(UNDERROOT), 'Underroot').toBe(false);
    expect(r.canStand({ x: 304.5, z: 28.5 }), 'the middle of the last run').toBe(false);
  });
});

describe('Frostfang things', () => {
  it('stand on real ground, never in the sky, on thin ice or in water', () => {
    const spots = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
      ...layout.trees,
    ].filter(onIsland);
    expect(spots.length).toBeGreaterThan(45);
    expect(spots.some(west), 'the west half is there').toBe(true);
    expect(spots.some(east), 'the east half is there').toBe(true);
    for (const s of spots) {
      expect(world.groundAt(s.x, s.z), `(${s.x}, ${s.z})`).toBeGreaterThan(0);
      expect(world.isThinIce(s.x, s.z), `(${s.x}, ${s.z}) thin ice`).toBe(false);
      expect(world.isWater(s.x, s.z), `(${s.x}, ${s.z}) water`).toBe(false);
    }
  });

  it('keeps every enemy off pedestals and trees', () => {
    const blocked = (x: number, z: number) => world.solidAt(x, z) > world.groundAt(x, z);
    for (const e of layout.enemies.filter(onIsland)) expect(blocked(e.x, e.z), `(${e.x}, ${e.z})`).toBe(false);
  });

  it('keeps guards and archers off the hub', () => {
    for (const e of layout.enemies.filter(west)) expect(world.groundAt(e.x, e.z), `(${e.x}, ${e.z})`).not.toBe(15);
  });

  it('has seven trees in the west half, all great pines', () => {
    const trees = layout.trees.filter(west);
    expect(trees).toHaveLength(7);
    for (const t of trees) expect(t.kind, `(${t.x}, ${t.z})`).toBe('greatPine');
  });

  it('has exactly eight trees on the whole island, all great pines, and no boulders', () => {
    const trees = layout.trees.filter((t) => t.x >= 200);
    expect(trees).toHaveLength(8);
    for (const t of trees) expect(t.kind, `(${t.x}, ${t.z})`).toBe('greatPine');
    expect(layout.boulders.filter((b) => b.x >= 200)).toHaveLength(0);
  });

  it('has no tree in the east half but the one great pine, by the upper glacier', () => {
    const trees = layout.trees.filter(east);
    expect(trees).toHaveLength(1);
    expect(trees[0].kind).toBe('greatPine');
    expect(Math.floor(trees[0].x)).toBe(278);
    expect(Math.floor(trees[0].z)).toBe(17);
  });

  it('has no puzzles in the east half', () => {
    expect(layout.puzzles.filter((p) => east(p.speaker) || east(p.candle))).toEqual([]);
  });

  it('has no id clash among its things, and every checkpoint is listed in the README', () => {
    for (const items of [layout.checkpoints, layout.bread, layout.hints, layout.puzzles, layout.arrivals]) {
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
    expect(islandCheckpoints.map((c) => c.id)).toContain('ff-lake');
    for (const c of islandCheckpoints) expect(readme, `checkpoint ${c.id} in the README`).toContain(`\`${c.id}\``);
  });

  it('meets the hub and the shore at the same height', () => {
    for (let j = 24; j <= 39; j++) {
      expect(ground(242, j), `hub edge z=${j}`).toBe(15);
      expect(ground(243, j), `shore z=${j}`).toBe(15);
    }
  });
});

describe('Frostfang respawns', () => {
  it('keeps every checkpoint at least 7 tiles from a guard post at about its height', () => {
    for (const c of islandCheckpoints) {
      for (const e of layout.enemies.filter(onIsland)) {
        if (Math.abs(world.groundAt(e.x, e.z) - world.groundAt(c.x, c.z)) > 3) continue;
        expect(Math.hypot(e.x - c.x, e.z - c.z), `${c.id} vs guard (${e.x}, ${e.z})`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('keeps every archer 11.5 tiles from a respawn spot, unless it is 7.5 higher or lower', () => {
    const archers = layout.enemies.filter((e) => onIsland(e) && e.kind === 'archer');
    expect(archers).toHaveLength(3);
    for (const c of islandCheckpoints) {
      const spot = respawn(c);
      for (const a of archers) {
        if (Math.abs(world.groundAt(a.x, a.z) - world.groundAt(spot.x, spot.z)) >= 7.5) continue;
        expect(Math.hypot(a.x - spot.x, a.z - spot.z), `${c.id} vs archer (${a.x}, ${a.z})`).toBeGreaterThanOrEqual(11.5);
      }
    }
  });
});

describe('Frostfang from the game camera', () => {
  // The camera sits south-west and looks north-east (game.ts: direction
  // (-1, 1.12, 1)). A tile k tiles toward the camera hides a spot if it is
  // higher than the line of sight: the spot's height + 0.9 + 1.12 k.
  const seen = (what: string, x: number, z: number): void => {
    const y = world.groundAt(x, z);
    for (let k = 0.25; k <= 30; k += 0.25) {
      expect(world.groundAt(x - k, z + k), `${what} (${x}, ${z}) hidden at k=${k}`).toBeLessThanOrEqual(y + 0.9 + 1.12 * k);
    }
  };

  it('hides no speaker, candle, checkpoint, bread or great pine', () => {
    const spots = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints,
      ...layout.bread,
      ...layout.trees,
    ].filter(onIsland);
    expect(spots.length).toBeGreaterThan(30);
    expect(spots.some(west), 'the west half is there').toBe(true);
    expect(spots.some(east), 'the east half is there').toBe(true);
    for (const s of spots) seen('thing', s.x, s.z);
  });

  it('does not hide the ends of the Falls, the pier or the last run', () => {
    for (const [what, i, j] of [
      ['first Falls tile', 246, 31],
      ['last Falls tile', 273, 31],
      ['first pier tile', 284, 11],
      ['last pier tile', 293, 11],
      ['first run tile', 304, 15],
      ['last run tile', 304, 45],
    ] as const) {
      seen(what, i + 0.5, j + 0.5);
    }
  });
});

describe('Frostfang as a whole island', () => {
  it('lets four forms from the real arrival reach nothing at x >= 274, even at the limit', () => {
    const r = explore(world, START, FOUR, 'max');
    const reached = eastTiles.filter(([i, j]) => i >= 274 && r.has(i, j));
    expect(reached.slice(0, 5)).toEqual([]);
  });

  it('lets five forms from the real arrival reach every thing, and Underroot', () => {
    const r = explore(world, START, FIVE, 'easy');
    for (const p of layout.puzzles.filter((q) => onIsland(q.speaker))) {
      expect(r.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(r.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
    expect(islandCheckpoints.length).toBe(7);
    for (const c of islandCheckpoints) expect(r.canStand(respawn(c)), `checkpoint ${c.id}`).toBe(true);
    const bread = layout.bread.filter(onIsland);
    expect(bread.length).toBe(9);
    for (const b of bread) expect(r.canStand(b), `bread ${b.id}`).toBe(true);
    expect(r.canStand(UNDERROOT), 'Underroot arrival').toBe(true);
  });

  it('keeps Underroot out of reach for five forms minus any one of the four that matter, even at the limit', () => {
    for (const f of ['bunny', 'orangutan', 'fairy', 'wolf'] as const) {
      const r = explore(world, START, fiveWithout(f), 'max');
      expect(r.canStand(UNDERROOT), `without the ${f}`).toBe(false);
    }
  });
});

describe('Frostfang geometry the design leans on', () => {
  const HUB = 15;

  it('is a hub with dips and no bumps, flat where the zones need it', () => {
    const tiles: [number, number][] = [];
    for (let j = 22; j <= 47; j++) {
      for (let i = 204; i <= 242; i++) {
        if (world.isVoid(i + 0.5, j + 0.5)) continue; // nibbled outline
        tiles.push([i, j]);
        expect(ground(i, j), `(${i}, ${j})`).toBeLessThanOrEqual(HUB);
        expect(ground(i, j), `(${i}, ${j})`).toBeGreaterThanOrEqual(HUB - 0.75);
      }
    }
    expect(tiles.length).toBeGreaterThan(900);
    // Neighbours are a quarter apart at most, so every dip walks without jumping.
    for (const [i, j] of tiles) {
      for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
        if (world.isVoid(i + di + 0.5, j + dj + 0.5) || ground(i + di, j + dj) > HUB || ground(i + di, j + dj) < HUB - 0.75) continue; // sky, a terrace or the shelf
        expect(Math.abs(ground(i, j) - ground(i + di, j + dj)), `(${i}, ${j}) to (${i + di}, ${j + dj})`).toBeLessThanOrEqual(0.25 + 1e-9);
      }
    }
    // There is real relief, with an ice floor in the tarn.
    expect(tiles.filter(([i, j]) => ground(i, j) < HUB).length).toBeGreaterThan(150); // measured: 212
    expect(ground(217, 31), 'tarn floor').toBe(HUB - 0.75);
    // Exactly 15 within 2 tiles of every zone edge, every thing and the landing.
    const keep = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, { x: c.x - 1, z: c.z + 1 }]),
      ...layout.bread,
      ...layout.trees,
      { x: 208, z: 40 },
    ].filter(west);
    for (const [i, j] of tiles) {
      const near = keep.some((k) => Math.hypot(k.x - (i + 0.5), k.z - (j + 0.5)) <= 2);
      const landing = Math.hypot((i + 0.5 - 208) / 5.2, (j + 0.5 - 40) / 5) < 1;
      if (near || landing || j <= 24 || j >= 45 || i >= 240) expect(ground(i, j), `(${i}, ${j})`).toBe(HUB);
    }
    for (let j = 24; j <= 39; j++) expect(ground(242, j), `east edge z=${j}`).toBe(HUB);
    for (const i of [209, 210, 211, 212, 213, 214, 216, 219, 220, 221, 222, 225, 230, 231, 232, 236, 238, 242]) {
      expect(ground(i, 47), `south rim x=${i}`).toBe(HUB);
    }
    for (let i = 206; i <= 214; i++) expect(ground(i, 22), `north edge x=${i}`).toBe(HUB);
    for (let i = 218; i <= 224; i++) expect(ground(i, 22), `north edge x=${i}`).toBe(HUB);
    // Nothing west of the landing, and nothing past the west half.
    for (let j = 0; j < world.depth; j++) {
      for (let i = 200; i <= 202; i++) expect(world.isVoid(i + 0.5, j + 0.5), `(${i}, ${j})`).toBe(true);
    }
  });

  it('Snow Steps: terrace is hub + 4, the wall terrace + 2, on the hub\'s north edge', () => {
    expect(ground(210, 20)).toBe(HUB + 4);
    expect(ground(210, 21)).toBe(HUB + 4);
    expect(ground(210, 16)).toBe(HUB + 6);
    expect(ground(210, 22)).toBe(HUB);
    for (const i of [206, 214]) expect(ground(i, 16)).toBe(HUB + 6);
  });

  it('Needle: hub + 4, 8 tiles of sky off the rim, and 17 tiles from Highcrag\'s top step', () => {
    expect(ground(211, 56)).toBe(HUB + 4);
    for (let j = 48; j <= 55; j++) expect(world.isVoid(211.5, j + 0.5), `sky z=${j}`).toBe(true);
    expect(56 - 48).toBe(8);
    // Edge to edge from the step (x 195..198, z 38..42): the needle starts at x 210, z 56.
    expect(Math.hypot(210 - 199, 56 - 43)).toBeGreaterThan(16);
    // The speaker is on the rim, the candle leaves five tiles to land on.
    expect(puzzle('ff-needle').speaker.z).toBe(46.5);
  });

  it('Pine Road: pillars rise one a tile, Owl Rock is the last treetop + 1, the step is +4', () => {
    const pillars = [[236, 49], [238, 51], [239, 53], [237, 55]].map(([i, j]) => ground(i, j));
    expect(pillars).toEqual([16, 17, 18, 19]);
    const tops = [HUB, ...pillars].map((h) => h + 5);
    expect(tops).toEqual([20, 21, 22, 23, 24]);
    expect(ground(238, 59)).toBe(tops[4] + 1);
    expect(ground(241, 57)).toBe(ground(238, 59) + 4);
    expect(world.isVoid(237.5, 56.5), 'one empty tile between T5 and Owl Rock').toBe(true);
  });

  it('Undercliff: the shelf is 6 under the hub, the candle rock 7 tiles of sky south of it', () => {
    expect(ground(225, 50)).toBe(HUB - 6);
    expect(ground(223, 61)).toBe(HUB - 6);
    for (let j = 54; j <= 60; j++) expect(world.isVoid(223.5, j + 0.5), `sky z=${j}`).toBe(true);
    const pine = layout.trees.find((t) => t.x === 231.5 && t.z === 48.5)!;
    expect(world.solidAt(pine.x, pine.z)).toBe(HUB - 6 + 5);
    expect(world.solidAt(pine.x, pine.z) + 1).toBe(HUB);
  });

  it('Fang: +4, +3 over 8 tiles of sky, a pine one tile under +1, then +4 over 6 tiles of sky', () => {
    expect(ground(220, 18)).toBe(HUB + 4);
    expect(ground(236, 15)).toBe(ground(220, 18) + 3);
    for (let i = 225; i <= 232; i++) expect(world.isVoid(i + 0.5, 17.5), `sky x=${i}`).toBe(true);
    expect(ground(236, 8)).toBe(world.solidAt(236.5, 13.5) + 1);
    expect(ground(236, 12), 'one tier-2 tile between the pine and tier 3').toBe(ground(236, 15));
    expect(ground(225, 6)).toBe(ground(236, 8) + 4);
    for (let i = 227; i <= 232; i++) expect(world.isVoid(i + 0.5, 6.5), `sky x=${i}`).toBe(true);
  });
});

describe('Frostfang east geometry', () => {
  const top = (x: number, z: number): number => world.groundAt(x + 0.5, z + 0.5);

  it('rises 0.25 a tile up the Falls and ends level with the Glacier', () => {
    for (const j of [31, 32]) {
      for (let i = 246; i <= 249; i++) expect(top(i, j)).toBe(15);
      for (let i = 250; i <= 273; i++) expect(top(i, j) - top(i - 1, j), `(${i}, ${j})`).toBeCloseTo(0.25, 6);
      expect(top(273, j)).toBe(21);
      expect(top(274, j)).toBe(21);
    }
    expect(fallsTop(273)).toBe(21);
  });

  it('has flat ice beside every row of the lane, so a swimmer can always jump out sideways', () => {
    // Ice higher than a jump out of the water (13.9 + 1.2) would wall in a
    // swimmer who fell in under an interior row, for good.
    for (const j of [31, 32]) {
      const side = j === 31 ? 30 : 33;
      for (let i = 246; i <= 273; i++) {
        expect(top(i, side), `(${i}, ${side})`).toBe(15);
        expect(world.isThinIce(i + 0.5, side + 0.5)).toBe(true);
        expect(world.isWater(i + 0.5, j + 0.5) || world.isThinIce(i + 0.5, j + 0.5), `(${i}, ${j}) over water`).toBe(true);
      }
    }
  });

  it('lays flat ice over the rest of the lake, over water', () => {
    for (const [i, j] of [[246, 26], [260, 29], [273, 37], [255, 34]]) {
      expect(top(i, j)).toBe(15);
      expect(world.isThinIce(i + 0.5, j + 0.5)).toBe(true);
    }
    // Under the ice there is water, at the lake's level.
    expect(world.waterLevelAt(260.5, 31.5)).toBeGreaterThan(14);
  });

  it('puts the Glacier at least 6 above the hub, rims and lake', () => {
    expect(top(277, 30) - 15).toBeGreaterThanOrEqual(6);
    expect(top(277, 30)).toBe(21);
  });

  it('puts the upper glacier 4 over the Glacier and the Brow 6 over the upper glacier', () => {
    expect(top(279, 20) - top(277, 30)).toBe(4);
    expect(top(279, 11) - top(279, 20)).toBe(6);
  });

  it('puts the pine one upper-glacier tile from the Brow, topping out 1 below it', () => {
    const [pine] = layout.trees.filter(east);
    const base = world.groundAt(pine.x, pine.z);
    expect(world.solidAt(pine.x, pine.z) - base).toBe(5);
    expect(top(278, 16)).toBe(base);
    expect(top(278, 15) - world.solidAt(pine.x, pine.z)).toBe(1);
  });

  it('ends the pier 3 below Last Rock, over eight tiles of sky', () => {
    expect(pierTop(293)).toBe(33);
    expect(pierTop(284)).toBe(31.25);
    for (let i = 284; i <= 293; i++) {
      for (const j of [10, 11, 12]) expect(world.iceTopAt(i + 0.5, j + 0.5), `(${i}, ${j})`).toBe(pierTop(i));
    }
    for (let i = 294; i <= 301; i++) expect(world.isVoid(i + 0.5, 11.5), `x ${i}`).toBe(true);
    expect(pierTop(293) + 3).toBe(top(302, 11));
    expect(top(302, 11) - top(283, 11), 'the Brow is +5 from Last Rock').toBe(5);
  });

  it('makes the leap 3 tiles, and ends the last run level with Underroot', () => {
    for (let j = 15; j <= 22; j++) expect(world.iceTopAt(304.5, j + 0.5), `z ${j}`).toBe(36);
    for (const j of [23, 24, 25]) expect(world.isVoid(304.5, j + 0.5), `z ${j}`).toBe(true);
    for (let j = 26; j <= 29; j++) expect(world.iceTopAt(304.5, j + 0.5), `z ${j}`).toBe(36);
    expect(runTop(30)).toBe(35.75);
    expect(world.iceTopAt(304.5, 45.5)).toBe(32);
    for (let j = 31; j <= 45; j++) {
      expect(world.iceTopAt(304.5, j - 0.5) - world.iceTopAt(304.5, j + 0.5), `z ${j}`).toBeCloseTo(0.25, 6);
    }
    for (const i of [303, 304, 305]) expect(top(i, 46), `x ${i}`).toBe(world.iceTopAt(304.5, 45.5));
  });
});
