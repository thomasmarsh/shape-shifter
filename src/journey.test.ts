import { describe, expect, it } from 'vitest';
import { NOTES } from './audio';
import { FormId, lightsNeeded } from './forms';
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

const L0: FormId[] = ['human'];
const L1: FormId[] = ['human', 'fairy'];
const L2: FormId[] = ['human', 'fairy', 'orangutan'];
const L3: FormId[] = ['human', 'fairy', 'orangutan', 'bunny'];
const L4: FormId[] = [...L3, 'wolf'];

describe('the journey', () => {
  it('level 0: a human cannot leave the meadow island', () => {
    expect(explore(world, spawn, L0, 'max').canStand(arrival('tanglewood'))).toBe(false);
  });

  it('level 1: a fairy crosses to Tanglewood, but cannot reach Highcrag or beyond', () => {
    expect(explore(world, spawn, L1, 'easy').canStand(arrival('tanglewood'))).toBe(true);
    const r = explore(world, spawn, L1, 'max');
    let checked = 0;
    for (let j = 0; j < world.depth; j++) {
      for (let i = 123; i < world.width; i++) {
        if (world.isVoid(i + 0.5, j + 0.5)) continue;
        checked++;
        expect(r.has(i, j), `tile ${i},${j}`).toBe(false);
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('level 2: an orangutan reaches Highcrag, but nobody gets to Frostfang', () => {
    const from = standSpot('far-island');
    expect(explore(world, from, L2, 'easy').canStand(arrival('highcrag'))).toBe(true);
    expect(explore(world, spawn, L2, 'max').canStand(arrival('frostfang'))).toBe(false);
  });

  it('level 3: a bunny climbs the Giant Stair to Frostfang', () => {
    expect(explore(world, arrival('highcrag'), L3, 'easy').canStand(arrival('frostfang'))).toBe(true);
  });

  it('level 3: the four forms reach nothing of the run past the frozen lake, nor Underroot', () => {
    for (const [name, from] of [['the Frostfang arrival', arrival('frostfang')], ['the world spawn', spawn]] as const) {
      const r = explore(world, from, L3, 'max');
      let checked = 0;
      for (let j = 0; j < world.depth; j++) {
        for (let i = 274; i < world.width; i++) {
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
    expect(explore(world, arrival('frostfang'), L4, 'easy').canStand(arrival('underroot'))).toBe(true);
  });
});

describe('the journey through Underroot', () => {
  const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);
  const L5: FormId[] = [...L4, 'ant'];
  const from = arrival('underroot');

  it('level 4: the five forms on max reach no tangle, nothing at x >= 426, and not Saltmere', () => {
    const r = explore(world, from, L4, 'max');
    let checked = 0;
    for (let j = 0; j < world.depth; j++) {
      for (let i = 0; i < world.width; i++) {
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
    const r = explore(world, from, L4, 'easy');
    const ids = layout.puzzles.filter((p) => p.id.startsWith('ur-'));
    expect(ids).toHaveLength(5);
    for (const p of ids) {
      expect(r.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(r.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
  });

  it('level 5: all six forms on easy reach Saltmere; without the ant or the fairy, not even at the limit', () => {
    expect(explore(world, from, L5, 'easy').canStand(arrival('saltmere'))).toBe(true);
    expect(explore(world, from, without(L5, 'ant'), 'max').canStand(arrival('saltmere')), 'no ant').toBe(false);
    expect(explore(world, from, without(L5, 'fairy'), 'max').canStand(arrival('saltmere')), 'no fairy').toBe(false);
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

  it('gives each island exactly the lights its level needs', () => {
    expect(puzzlesOn('meadow')).toHaveLength(lightsNeeded(0));
    expect(puzzlesOn('tanglewood')).toHaveLength(lightsNeeded(1));
    expect(puzzlesOn('highcrag')).toHaveLength(lightsNeeded(2));
    expect(puzzlesOn('frostfang')).toHaveLength(lightsNeeded(3));
    expect(puzzlesOn('underroot')).toHaveLength(lightsNeeded(4));
    expect(
      puzzlesOn('meadow').length +
        puzzlesOn('tanglewood').length +
        puzzlesOn('highcrag').length +
        puzzlesOn('frostfang').length +
        puzzlesOn('underroot').length,
    ).toBe(layout.puzzles.length);
  });

  it('keeps each puzzle on one island: speaker and candle', () => {
    for (const island of ['meadow', 'tanglewood', 'highcrag', 'frostfang', 'underroot']) {
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
