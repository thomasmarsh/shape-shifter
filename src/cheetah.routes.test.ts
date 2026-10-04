import { describe, expect, it } from 'vitest';
import { expectGatesTimed, expectPlatesOnRealGround } from './islands/testkit';
import { Pilot } from './pilot';
import { Kind, World } from './world';

// The Cheetah's routes with the real player physics (see pilot.ts), on small
// hand-built worlds: brittle sheets, breath and timed gates. Each world is a
// strip of rows 14-16 with the spawn at its west end.

const at = (i: number, j = 15) => ({ x: i + 0.5, z: j + 0.5 });
const FLOOR = 2;

/** Ground (`bank`) and brittle runs: `[from, to]` pairs of tile columns, inclusive. */
function strip(bank: [number, number][], brittle: [number, number][]): World {
  return new World([
    {
      id: 'strip',
      name: 'Strip',
      build(t) {
        for (const [a, b] of bank) t.rect(a, 14, b, 16, (i, j) => t.set(i, j, FLOOR, Kind.Snow));
        for (const [a, b] of brittle) t.rect(a, 14, b, 16, (i, j) => t.setBrittle(i, j, FLOOR));
        return { spawn: at(2) };
      },
    },
  ]);
}

describe('Cheetah route 1: the brittle run', () => {
  // A bank, 20 brittle tiles, a gap of 5, 20 more, and a far bank: 40 tiles of sheet.
  const run = strip([[0, 9], [55, 70]], [[10, 29], [35, 54]]);

  it('sprints the 40 brittle tiles and jumps the 5-tile gap in them', () => {
    for (const edge of [0.5, 0.25, 0.05]) {
      const p = new Pilot(run, 'cheetah', at(3));
      expect(p.sprint(at(60), { edge, seconds: 10 }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.fell, `edge ${edge}`).toBe(false);
      expect(p.minIceSpeed, `edge ${edge}`).toBeGreaterThanOrEqual(9);
    }
  });

  it('drops a Wolf on the same run: it breaks the first brittle tile', () => {
    const p = new Pilot(run, 'wolf', at(3));
    p.sprint(at(60), { edge: 0.25, seconds: 8 });
    expect(p.fell).toBe(true);
    expect(p.x).toBeLessThan(35);
  });
});

describe('Cheetah route 2: breath', () => {
  it('fails a 90-tile brittle run for lack of breath', () => {
    const w = strip([[0, 9], [100, 110]], [[10, 99]]);
    const p = new Pilot(w, 'cheetah', at(3));
    expect(p.sprint(at(105), { seconds: 15 })).toBe(false);
    expect(p.reason).toMatch(/winded/);
    expect(p.player.winded).toBe(true);
  });

  it('makes two 40-tile runs with breathe() between them', () => {
    const w = strip([[0, 9], [50, 59], [100, 110]], [[10, 49], [60, 99]]);
    const p = new Pilot(w, 'cheetah', at(3));
    expect(p.sprint(at(54), { seconds: 10 }), p.describe()).toBe(true);
    expect(p.player.breath).toBeLessThan(5);
    expect(p.breathe(), 'breathe').toBe(true);
    expect(p.player.breath).toBeCloseTo(8, 5);
    expect(p.sprint(at(105), { seconds: 10 }), p.describe()).toBe(true);
    expect(p.fell).toBe(false);
    expect(p.reason).toBeNull();
  });

  it('does not refill on a run with no rest between the two', () => {
    const w = strip([[0, 9], [50, 59], [100, 110]], [[10, 49], [60, 99]]);
    const p = new Pilot(w, 'cheetah', at(3));
    expect(p.sprint(at(54), { seconds: 10 })).toBe(true);
    expect(p.sprint(at(105), { seconds: 10 })).toBe(false);
    expect(p.reason).toMatch(/winded/);
  });
});

describe('Cheetah route 3: a timed gate', () => {
  /** Ground in tiles 0-60, a plate at tile 5 and a gate across the strip at tile 34, 30 tiles on. */
  const gated = (seconds: number): World =>
    new World([
      {
        id: 'gated',
        name: 'Gated',
        build(t) {
          t.rect(0, 14, 60, 16, (i, j) => t.set(i, j, FLOOR, Kind.Stone));
          t.rect(34, 14, 34, 16, (i, j) => t.setGate(i, j, 'g'));
          return { spawn: at(2), plates: [{ ...at(5), gate: 'g', seconds }] };
        },
      },
    ]);

  it('lets a Cheetah run the 30 tiles in 3.6 s, from a human start on the plate', () => {
    const w = gated(3.6);
    const p = new Pilot(w, 'human', at(2));
    expect(p.runGate(at(5), at(45)), p.describe()).toBe(true);
    expect(p.x).toBeGreaterThan(44);
  });

  it('stops a Wolf at the shut gate: 4.3 s is too slow', () => {
    const w = gated(3.6);
    const p = new Pilot(w, 'human', at(2));
    expect(p.runGate(at(5), at(45), { form: 'wolf' })).toBe(false);
    expect(p.x).toBeLessThan(34);
    expect(w.isClosedGate(34.5, 15.5)).toBe(true);
  });

  it('shuts again after the Cheetah is through', () => {
    const w = gated(3.6);
    const p = new Pilot(w, 'human', at(2));
    expect(p.runGate(at(5), at(45))).toBe(true);
    p.wait(1);
    expect(w.isClosedGate(34.5, 15.5)).toBe(true);
  });

  it('is timed for the Cheetah and not the Wolf by the test kit, and refuses other times', () => {
    const fair = gated(3.6);
    expectGatesTimed(fair, fair.layout.plates);
    expectPlatesOnRealGround(fair, fair.layout.plates);
    for (const seconds of [3.1, 4.2]) {
      const w = gated(seconds);
      expect(() => expectGatesTimed(w, w.layout.plates), `${seconds} s`).toThrow(/plate g/);
    }
  });
});
