import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';

// Physical routes of Saltmere's west half, driven by a real Player.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];
function eachEdge(route: (edge: number) => void): void {
  for (const edge of EDGES) route(edge);
}
const PICKLE = {
  tide: at(503, 52),
  nest: at(529, 40),
  salt: at(547, 11),
  stack: at(577, 36),
};

describe('Saltmere Tide Pool', () => {
  it('lets a Human walk in from the sand, dive to the pickle and use it', () => {
    const p = new Pilot(world, 'human', at(498, 52));
    expect(p.walk(at(499, 52)), p.describe()).toBe(true);
    expect(p.swim(at(502, 52)), p.describe()).toBe(true);
    expect(p.canUse(PICKLE.tide), 'floating').toBe(false);
    expect(p.dive(PICKLE.tide), p.describe()).toBe(true);
    expect(p.canUse(PICKLE.tide), 'at the bottom').toBe(true);
  });

  it('keeps a Wolf holding Shift from ever using the pickle', () => {
    const w = new Pilot(world, 'wolf', at(498, 52));
    w.swim(PICKLE.tide, { under: true });
    expect(w.canUse(PICKLE.tide)).toBe(false);
    w.swim(at(503, 53), { under: true });
    expect(w.canUse(PICKLE.tide)).toBe(false);
  });
});

describe('Saltmere Driftwood Nest', () => {
  it('lets an Ant walk from the hub through the ring to the inside', () => {
    const p = new Pilot(world, 'ant', at(527, 48));
    expect(p.walk(at(526, 41), { seconds: 30 }), p.describe()).toBe(true);
    expect(p.y).toBeCloseTo(38, 6);
  });

  it('keeps a Human, a Fairy at her ceiling and a hop-then-fly out', () => {
    const h = new Pilot(world, 'human', at(525, 48));
    expect(h.walk(at(525, 41), { seconds: 10 }), 'human').toBe(false);
    expect(h.z, 'human').toBeGreaterThan(46);
    eachEdge((edge) => {
      const b = new Pilot(world, 'bunny', at(525, 48));
      expect(b.hopThenFly(at(525, 41), { edge, seconds: 14 }), `bunny edge ${edge}`).toBe(false);
      expect(b.z, `bunny edge ${edge}`).toBeGreaterThan(46);
    });
    const f = new Pilot(world, 'fairy', at(525, 48));
    expect(f.fly(at(525, 41), { seconds: 10 }), 'fairy').toBe(false);
    expect(f.z, 'fairy').toBeGreaterThan(46);
  });

  it('lets a Bunny inside hop onto the block and use the speaker, but not a Human', () => {
    const speaker = at(522, 35);
    const b = new Pilot(world, 'bunny', at(523, 40));
    expect(b.hop(at(523, 36), { seconds: 10 }), b.describe()).toBe(true);
    expect(b.y).toBeCloseTo(42, 6);
    expect(b.canUse(speaker)).toBe(true);
    const h = new Pilot(world, 'human', at(523, 40));
    expect(h.hop(at(523, 36), { seconds: 10 }), 'human').toBe(false);
    expect(h.y, 'human').toBeLessThan(40);
  });

  it('lets a Human inside dive to the pickle', () => {
    const p = new Pilot(world, 'human', at(525, 40));
    expect(p.swim(at(528, 40)), p.describe()).toBe(true);
    expect(p.dive(PICKLE.nest), p.describe()).toBe(true);
    expect(p.canUse(PICKLE.nest)).toBe(true);
  });
});

describe('Saltmere Salt Stair', () => {
  it('lets a Wolf sprint up the whole stair onto Salt Rock and back down, never slower than 6', () => {
    const w = new Pilot(world, 'wolf', at(546, 52));
    expect(w.sprint(at(546, 18)), w.describe()).toBe(true);
    expect(w.y).toBeCloseTo(44, 6);
    expect(w.minIceSpeed).toBeGreaterThanOrEqual(6);
    const down = new Pilot(world, 'wolf', at(546, 18));
    expect(down.sprint(at(546, 52)), down.describe()).toBe(true);
    expect(down.y).toBeCloseTo(38, 6);
    expect(down.minIceSpeed).toBeGreaterThanOrEqual(6);
  });

  it('drops a Bunny and a Human who try the stair', () => {
    const b = new Pilot(world, 'bunny', at(546, 50));
    expect(b.sprint(at(546, 18), { seconds: 12 }), 'bunny').toBe(false);
    expect(b.fell, 'bunny').toBe(true);
    const h = new Pilot(world, 'human', at(546, 50));
    expect(h.walk(at(546, 18), { seconds: 12 }), 'human').toBe(false);
    expect(h.fell, 'human').toBe(true);
  });

  it('lets an Ant walk through the rock\'s ring and a Human dive to its pickle', () => {
    const a = new Pilot(world, 'ant', at(545, 17));
    expect(a.walk(at(545, 9), { seconds: 30 }), a.describe()).toBe(true);
    expect(a.y).toBeCloseTo(44, 6);
    const h = new Pilot(world, 'human', at(545, 11));
    expect(h.swim({ x: 546.8, z: 11.5 }), h.describe()).toBe(true);
    expect(h.dive(PICKLE.salt), h.describe()).toBe(true);
    expect(h.canUse(PICKLE.salt)).toBe(true);
  });
});

describe('Saltmere Stack', () => {
  it('lands a hop-then-fly from the hub\'s north edge on the Stack\'s rim', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(577, 46));
      expect(p.hopThenFly(at(577, 38), { edge }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(42, 6);
    });
  });

  it('keeps a Fairy alone and a Bunny alone off it', () => {
    const f = new Pilot(world, 'fairy', at(577, 46));
    expect(f.fly(at(577, 38), { seconds: 12 }), 'fairy').toBe(false);
    expect(f.peak, 'fairy').toBeLessThan(42 - 0.3);
    eachEdge((edge) => {
      const b = new Pilot(world, 'bunny', at(577, 46));
      expect(b.hop(at(577, 38), { edge, seconds: 8 }), `bunny edge ${edge}`).toBe(false);
    });
  });

  it('lets a Human on the rim walk into the pool, dive and use the pickle', () => {
    // The pool is 3 wide with the pickle in the middle: swim in to the pickle's side, clear of the rim.
    const p = new Pilot(world, 'human', at(575, 36));
    expect(p.walk(at(575, 36))).toBe(true);
    expect(p.swim({ x: 576.8, z: 36.5 }), p.describe()).toBe(true);
    expect(p.dive(PICKLE.stack), p.describe()).toBe(true);
    expect(p.canUse(PICKLE.stack), p.describe()).toBe(true);
  });
});
