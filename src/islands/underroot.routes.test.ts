import { describe, expect, it } from 'vitest';
import { ICE_SPEED } from '../forms';
import { Pilot } from '../pilot';
import { World } from '../world';

// Physical routes of Underroot's west half, with the real player physics in the
// real World, steered by a scripted pilot (pilot.ts). Every jump is tried at three
// take-off points (0.5, 0.25 and 0.05 tiles before the edge), as in routes.test.ts.

const world = new World();

/** The middle of tile (i, j). */
const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];
function eachEdge(route: (edge: number) => void): void {
  for (const edge of EDGES) route(edge);
}

const LANE = [334, 335, 336];
const PIER = [15, 16, 17];
const PIER_ROCK = at(366, 16);
const MAT_ROCK_EAST = [at(340, 15), at(340, 16), at(340, 17)];

describe('Route 26: the Leaf Mats lane, as a wolf', () => {
  it('runs from the hub to Mat Rock on each of the three columns, never below full speed', () => {
    for (const i of LANE) {
      const p = new Pilot(world, 'wolf', at(i, 49));
      expect(p.sprint(at(i, 21)), `column ${i}: ${p.describe()}`).toBe(true);
      expect(p.y, `column ${i}`).toBe(38);
      expect(p.minIceSpeed, `column ${i}`).toBeGreaterThanOrEqual(ICE_SPEED);
      expect(p.fell, `column ${i}`).toBe(false);
    }
  });
});

describe('Route 27: everyone else on the lane', () => {
  const matRock = at(335, 21);

  it('breaks the lane under a human, a bunny and a fairy who walk onto it', () => {
    for (const form of ['human', 'bunny', 'fairy'] as const) {
      const p = new Pilot(world, form, at(335, 47));
      p.walk(matRock, { seconds: 25 });
      expect(p.standingOn(matRock), `${form}: ${p.describe()}`).toBe(false);
      expect(p.fell, form).toBe(true);
    }
  });

  it('keeps a fairy from the hub edge, and a bunny hopping then flying from it, off Mat Rock', () => {
    for (const i of LANE) {
      const f = new Pilot(world, 'fairy', at(i, 46));
      f.fly(matRock, { seconds: 12 });
      expect(f.standingOn(matRock), `fairy from ${i}: ${f.describe()}`).toBe(false);
      expect(f.peak, `fairy from ${i}`).toBeLessThan(38 - 0.3);
    }
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(335, 49));
      p.hopThenFly(matRock, { edge, seconds: 12 });
      expect(p.standingOn(matRock), `bunny edge ${edge}: ${p.describe()}`).toBe(false);
    });
  });
});

describe('Route 28: the step, as a bunny', () => {
  const from = at(330, 15);
  const to = at(330, 13);

  it('hops from Mat Rock onto the step', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', from);
      expect(p.hop(to, { edge }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBe(42);
    });
  });

  it('keeps a wolf and a fairy off it', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'wolf', from);
      expect(p.hop(to, { edge, seconds: 6 }), `wolf edge ${edge}`).toBe(false);
    });
    for (const [i, j] of [[330, 16], [331, 15], [333, 17]]) {
      const f = new Pilot(world, 'fairy', at(i, j));
      expect(f.fly(to, { seconds: 6 }), `fairy from ${i},${j}`).toBe(false);
      expect(f.peak, `fairy from ${i},${j}`).toBeLessThan(42);
    }
  });
});

describe('Route 29: run, then fly - the Leaf Pier and Pier Rock', () => {
  const sky = at(362, 16);

  it('lets a wolf sprint the pier, shift to a fairy near its end and land on Pier Rock', () => {
    // The pier's ice ends at x = 356; shift anywhere in its last two tiles.
    for (const shiftX of [354.0, 354.5, 355.0, 355.5, 355.9]) {
      for (const j of PIER) {
        const p = new Pilot(world, 'wolf', at(336, j));
        const ok = p.runThenFly(sky, () => p.x >= shiftX, PIER_ROCK, { seconds: 14 });
        expect(ok, `row ${j}, shift at ${shiftX}: ${p.describe()}`).toBe(true);
        expect(p.y, `row ${j}, shift at ${shiftX}`).toBe(41);
        expect(p.player.form.id).toBe('fairy');
      }
    }
  });

  it('keeps a fairy who takes off from the east edge of Mat Rock off Pier Rock', () => {
    for (const s of MAT_ROCK_EAST) {
      const p = new Pilot(world, 'fairy', s);
      p.fly(PIER_ROCK, { seconds: 10 });
      expect(p.standingOn(PIER_ROCK), `from z ${s.z}: ${p.describe()}`).toBe(false);
    }
  });

  it('keeps a bunny that hops off the east edge of Mat Rock, then flies, off Pier Rock', () => {
    for (const s of MAT_ROCK_EAST) {
      eachEdge((edge) => {
        const p = new Pilot(world, 'bunny', s);
        p.hopThenFly(PIER_ROCK, { edge, seconds: 14 });
        expect(p.standingOn(PIER_ROCK), `from z ${s.z}, edge ${edge}: ${p.describe()}`).toBe(false);
      });
    }
  });

  it('keeps a wolf that runs off the end of the pier off Pier Rock', () => {
    const p = new Pilot(world, 'wolf', at(336, 16));
    expect(p.sprint(PIER_ROCK, { seconds: 10 }), p.describe()).toBe(false);
    expect(p.standingOn(PIER_ROCK)).toBe(false);
    expect(p.fell).toBe(true);
  });

  it('keeps a wolf that jumps off the end of the pier off Pier Rock', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'wolf', at(336, 16));
      expect(p.sprint(PIER_ROCK, { edge, seconds: 10 }), `edge ${edge}: ${p.describe()}`).toBe(false);
      expect(p.fell, `edge ${edge}`).toBe(true);
    });
  });
});
