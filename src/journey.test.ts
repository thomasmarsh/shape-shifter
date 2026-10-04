import { describe, expect, it } from 'vitest';
import { NOTES } from './audio';
import { FormId, KELP_DEEP, lightsNeeded } from './forms';
import { exploreCached as explore } from './explorecache';
import { World } from './world';

// The whole game as a chain of gates: each form set reaches the next island,
// and no earlier set does. Uses the level checker on the real world.

const world = new World();
const { layout } = world;
const spawn = layout.spawn;

const arrival = (id: string) => layout.arrivals.find((a) => a.id === id)!;
const checkpoint = (id: string) => layout.checkpoints.find((c) => c.id === id)!;
/** Where a player coming across lands: one tile south-west of the checkpoint. */
const standSpot = (id: string) => ({ x: checkpoint(id).x - 1, z: checkpoint(id).z + 1 });

/**
 * Columns a search looks at (see levelcheck.range.test.ts: an island plus a margin
 * of 40 gives the whole world's answer). A claim that nothing past a barrier is
 * reached needs only the barrier plus a margin: a reach moves at most about 21
 * tiles at a time, so if the columns up to the margin are empty, so is the rest.
 */
const cols = (x0: number, x1: number) => ({ x0, x1 });

const L0: FormId[] = ['human'];
const L1: FormId[] = ['human', 'fairy'];
const L2: FormId[] = ['human', 'fairy', 'orangutan'];
const L3: FormId[] = ['human', 'fairy', 'orangutan', 'bunny'];
const L4: FormId[] = [...L3, 'wolf'];

describe('the journey', () => {
  it('level 0: a human cannot leave the meadow island', () => {
    expect(explore(world, spawn, L0, 'max', cols(0, 125)).canStand(arrival('tanglewood'))).toBe(false);
  });

  it('level 1: a fairy crosses to Tanglewood, but cannot reach Highcrag or beyond', () => {
    expect(explore(world, spawn, L1, 'easy', cols(0, 125)).canStand(arrival('tanglewood'))).toBe(true);
    const range = cols(0, 165);
    const r = explore(world, spawn, L1, 'max', range);
    let checked = 0;
    for (let j = 0; j < world.depth; j++) {
      for (let i = 123; i < range.x1; i++) {
        if (world.isVoid(i + 0.5, j + 0.5)) continue;
        checked++;
        expect(r.has(i, j), `tile ${i},${j}`).toBe(false);
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('level 2: an orangutan reaches Highcrag, but nobody gets to Frostfang', () => {
    const from = standSpot('far-island');
    expect(explore(world, from, L2, 'easy', cols(60, 200)).canStand(arrival('highcrag'))).toBe(true);
    expect(explore(world, spawn, L2, 'max', cols(0, 250)).canStand(arrival('frostfang'))).toBe(false);
  });

  it('level 3: a bunny climbs the Giant Stair to Frostfang', () => {
    expect(explore(world, arrival('highcrag'), L3, 'easy', cols(123, 250)).canStand(arrival('frostfang'))).toBe(true);
  });

  it('level 3: the four forms reach nothing of the run past the frozen lake, nor Underroot', () => {
    for (const [name, from] of [['the Frostfang arrival', arrival('frostfang')], ['the world spawn', spawn]] as const) {
      const range = cols(200, 340);
      const r = explore(world, from, L3, 'max', range);
      let checked = 0;
      for (let j = 0; j < world.depth; j++) {
        for (let i = 274; i < range.x1; i++) {
          if (world.isVoid(i + 0.5, j + 0.5)) continue;
          checked++;
          expect(r.has(i, j), `from ${name}: tile ${i},${j}`).toBe(false);
        }
      }
      expect(checked, name).toBeGreaterThan(500);
      expect(r.canStand(arrival('underroot')), `from ${name}: Underroot`).toBe(false);
    }
  });

  it('level 4: with the Winter Wolf as well, all five forms run the lake and reach Underroot', () => {
    expect(explore(world, arrival('frostfang'), L4, 'easy', cols(200, 340)).canStand(arrival('underroot'))).toBe(true);
  });
});

describe('the journey through Underroot', () => {
  const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);
  const L5: FormId[] = [...L4, 'ant'];
  const from = arrival('underroot');

  it('level 4: the five forms on max reach no tangle, nothing at x >= 426, and not Saltmere', () => {
    const range = cols(299, 530);
    const r = explore(world, from, L4, 'max', range);
    let checked = 0;
    for (let j = 0; j < world.depth; j++) {
      for (let i = range.x0; i < range.x1; i++) {
        if (world.isVoid(i + 0.5, j + 0.5)) continue;
        if (world.isTangle(i + 0.5, j + 0.5)) expect(r.has(i, j), `tangle ${i},${j}`).toBe(false);
        if (i >= 426) expect(r.has(i, j), `tile ${i},${j}`).toBe(false);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(r.canStand(arrival('saltmere')), 'Saltmere').toBe(false);
  });

  it('level 4: the five forms on easy can use the speaker and the candle of all five Underroot puzzles', () => {
    const r = explore(world, from, L4, 'easy', cols(259, 520));
    const ids = layout.puzzles.filter((p) => p.id.startsWith('ur-'));
    expect(ids).toHaveLength(5);
    for (const p of ids) {
      expect(r.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(r.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
  });

  it('level 5: all six forms on easy reach Saltmere; without the ant or the fairy, not even at the limit', () => {
    const range = cols(299, 530);
    expect(explore(world, from, L5, 'easy', range).canStand(arrival('saltmere'))).toBe(true);
    expect(explore(world, from, without(L5, 'ant'), 'max', range).canStand(arrival('saltmere')), 'no ant').toBe(false);
    expect(explore(world, from, without(L5, 'fairy'), 'max', range).canStand(arrival('saltmere')), 'no fairy').toBe(
      false,
    );
  });
});

describe('the journey through Saltmere', () => {
  const L5: FormId[] = [...L4, 'ant'];
  const L6: FormId[] = [...L5, 'mermaid'];
  const from = arrival('saltmere');
  // Saltmere's own columns, from the margin before it to the start of the next island.
  const range = cols(446, 700);

  it('level 5: the six forms on easy can use the speaker and the candle of all five Saltmere puzzles', () => {
    const r = explore(world, from, L5, 'easy', range);
    const ids = layout.puzzles.filter((p) => p.id.startsWith('sm-'));
    expect(ids).toHaveLength(5);
    for (const p of ids) {
      expect(r.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(r.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
  });

  it('level 5: the six forms on max reach neither Pearl Rock nor any deep kelp tile', () => {
    const r = explore(world, from, L5, 'max', range);
    expect(r.canStand(arrival('sm-pearl')), 'Pearl Rock').toBe(false);
    let deep = 0;
    for (let j = 0; j < world.depth; j++) {
      for (let i = range.x0; i < range.x1; i++) {
        if (!world.isKelp(i + 0.5, j + 0.5) || world.kelpDepthAt(i + 0.5, j + 0.5) !== KELP_DEEP) continue;
        deep++;
        expect(r.has(i, j), `deep kelp ${i},${j}`).toBe(false);
      }
    }
    expect(deep).toBeGreaterThan(0);
  });

  it('level 6: the seven forms on easy reach Pearl Rock, and on max without the mermaid nobody does', () => {
    expect(explore(world, from, L6, 'easy', range).canStand(arrival('sm-pearl'))).toBe(true);
    expect(explore(world, from, L5, 'max', range).canStand(arrival('sm-pearl'))).toBe(false);
  });
});

describe('the journey through Sunveld', () => {
  const L6: FormId[] = [...L4, 'ant', 'mermaid'];
  const L7: FormId[] = [...L6, 'cheetah'];
  const from = standSpot('sunveld');
  // Sunveld's own columns, with Pearl Rock's margin on the west.
  const range = cols(620, 960);

  it('level 6: the seven forms on easy use all five Sunveld speakers and candles, and on max stand nowhere east of the Red Wall', () => {
    const r = explore(world, from, L6, 'easy', range);
    const ids = layout.puzzles.filter((p) => p.id.startsWith('sv-'));
    expect(ids).toHaveLength(5);
    for (const p of ids) {
      expect(r.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(r.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
    expect(explore(world, from, L6, 'max', range).canStand(standSpot('sv-end')), 'Sunset Rock').toBe(false);
  });

  it('level 7: with the cheetah the eight forms on easy stand at Sunset Rock', () => {
    expect(explore(world, from, L7, 'easy', range).canStand(standSpot('sv-end'))).toBe(true);
  });
});

describe('the journey through Coilstone', () => {
  const L7: FormId[] = [...L4, 'ant', 'mermaid', 'cheetah'];
  const L8: FormId[] = [...L7, 'snake'];
  const from = standSpot('coilstone');
  // The whole island, with Sunset Rock's margin on the west.
  const range = cols(925, 1136);
  const ids = ['cs-court', 'cs-colonnade', 'cs-tooth', 'cs-stair', 'cs-thicket'];

  it('level 7: the eight forms on easy use all five Coilstone speakers and candles, and on max stand nowhere on the mesa top', () => {
    const r = explore(world, from, L7, 'easy', range);
    for (const id of ids) {
      const p = layout.puzzles.find((q) => q.id === id)!;
      expect(r.canUse(p.speaker), `${id} speaker`).toBe(true);
      expect(r.canUse(p.candle), `${id} candle`).toBe(true);
    }
    expect(explore(world, from, L7, 'max', range).canStand(standSpot('cs-end')), 'the Serpent\'s Head').toBe(false);
  });

  it('level 8: with the snake the nine forms on easy stand at the Serpent\'s Head', () => {
    expect(explore(world, from, L8, 'easy', range).canStand(standSpot('cs-end'))).toBe(true);
  });
});

describe('the journey through Hollowfen', () => {
  const L8: FormId[] = [...L4, 'ant', 'mermaid', 'cheetah', 'snake'];
  const L9: FormId[] = [...L8, 'axolotl'];
  const from = standSpot('hollowfen');
  // The whole island, with the Serpent's Head's margin on the west.
  const range = cols(1125, 1336);
  const ids = ['hf-pool', 'hf-ring', 'hf-road', 'hf-stair', 'hf-mound'];

  it('level 8: the nine forms on easy use all five Hollowfen speakers and candles, and on max stand nowhere on the Last Stone', () => {
    const r = explore(world, from, L8, 'easy', range);
    for (const id of ids) {
      const p = layout.puzzles.find((q) => q.id === id)!;
      expect(r.canUse(p.speaker), `${id} speaker`).toBe(true);
      expect(r.canUse(p.candle), `${id} candle`).toBe(true);
    }
    expect(explore(world, from, L8, 'max', range).canStand(standSpot('hf-end')), 'the Last Stone').toBe(false);
  });

  it('level 9: with the Axolotl the ten forms on easy stand on the Last Stone', () => {
    expect(explore(world, from, L9, 'easy', range).canStand(standSpot('hf-end'))).toBe(true);
  });
});

describe('the candles', () => {
  /** Puzzles whose speaker stands on the given island. */
  const puzzlesOn = (island: string) => {
    const b = world.bounds.find((k) => k.id === island)!;
    return layout.puzzles.filter(
      (p) => p.speaker.x >= b.i0 && p.speaker.x < b.i1 + 1 && p.speaker.z >= b.j0 && p.speaker.z < b.j1 + 1,
    );
  };

  /** One row per island: the level a player is at when it starts, so the lights it holds. */
  const ISLANDS: [id: string, level: number][] = [
    ['meadow', 0],
    ['tanglewood', 1],
    ['highcrag', 2],
    ['frostfang', 3],
    ['underroot', 4],
    ['saltmere', 5],
    ['sunveld', 6],
    ['coilstone', 7],
    ['hollowfen', 8],
  ];

  it('gives each island exactly the lights its level needs', () => {
    expect(
      world.bounds.map((b) => b.id),
      'every island has a row in ISLANDS',
    ).toEqual(ISLANDS.map(([id]) => id));
    for (const [id, level] of ISLANDS) expect(puzzlesOn(id), id).toHaveLength(lightsNeeded(level));
    expect(ISLANDS.reduce((n, [id]) => n + puzzlesOn(id).length, 0)).toBe(layout.puzzles.length);
  });

  it('keeps each puzzle on one island: speaker and candle', () => {
    for (const [island] of ISLANDS) {
      const b = world.bounds.find((k) => k.id === island)!;
      for (const p of puzzlesOn(island)) {
        expect(p.candle.x, p.id).toBeGreaterThanOrEqual(b.i0);
        expect(p.candle.x, p.id).toBeLessThan(b.i1 + 1);
        expect(p.candle.z, p.id).toBeGreaterThanOrEqual(b.j0);
        expect(p.candle.z, p.id).toBeLessThan(b.j1 + 1);
      }
    }
  });

  it('has unique ids and playable melodies', () => {
    for (const [what, items] of [
      ['puzzle', layout.puzzles],
      ['checkpoint', layout.checkpoints],
      ['bread', layout.bread],
      ['hint', layout.hints],
      ['arrival', layout.arrivals],
    ] as const) {
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size, what).toBe(ids.length);
    }
    for (const p of layout.puzzles) {
      expect(new Set(p.melody).size, `${p.id} distinct`).toBe(p.melody.length);
      expect(p.melody.length, `${p.id} length`).toBeLessThanOrEqual(6);
      expect(p.melody.length, `${p.id} not empty`).toBeGreaterThan(0);
      for (const n of p.melody) expect(NOTES[n], `${p.id} note ${n}`).toBeDefined();
    }
  });
});
