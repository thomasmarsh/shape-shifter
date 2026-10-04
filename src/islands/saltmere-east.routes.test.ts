import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';

// Physical routes of Saltmere's east half, driven by a real Player.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];
function eachEdge(route: (edge: number) => void): void {
  for (const edge of EDGES) route(edge);
}
const PICKLE = { x: 613.5, z: 33.5 };

describe('Saltmere Palm Key: the ring of kelp', () => {
  it('lets a human swim under the west side of the ring, come up inside and get out onto the islet', () => {
    const p = new Pilot(world, 'human', at(582, 46));
    const where = (what: string) => `${what}: ${p.describe()}`;
    expect(p.swim(at(586, 46)), where('swim to the ring')).toBe(true);
    expect(p.swim(at(591, 46), { under: true }), where('under the mat')).toBe(true);
    expect(p.surface(), where('surface inside')).toBe(true);
    expect(p.swim(at(592, 46)), where('swim on')).toBe(true);
    expect(p.hop(at(593, 46)), where('onto Palm Key')).toBe(true);
    expect(p.y).toBeCloseTo(38, 6);
    expect(p.fell).toBe(false);
  });

  it('keeps a wolf and a bunny that swim at the ring outside', () => {
    for (const form of ['wolf', 'bunny'] as const) {
      const p = new Pilot(world, form, at(586, 46));
      expect(p.swim(at(594, 46), { seconds: 10 }), form).toBe(false);
      expect(p.x, form).toBeLessThan(589);
    }
  });

  it('keeps a fairy that flies at the ring, and a hop-then-fly from the beach, outside', () => {
    const f = new Pilot(world, 'fairy', at(586, 46));
    expect(f.fly(at(594, 46), { seconds: 10 }), 'fairy').toBe(false);
    expect(f.x, 'fairy').toBeLessThan(589);
    eachEdge((edge) => {
      const b = new Pilot(world, 'bunny', at(582, 46));
      expect(b.hopThenFly(at(594, 46), { edge, seconds: 14 }), `bunny edge ${edge}`).toBe(false);
      expect(b.x, `bunny edge ${edge}`).toBeLessThan(589);
    });
  });
});

describe('Saltmere Palm Key: the palm road', () => {
  it('lets an orangutan climb T1, leap to T2 and T3 and hop onto the Lookout', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'orangutan', at(597, 46));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.climb(at(597, 43)), where('T1')).toBe(true);
      expect(p.leapTo(at(597, 40), { edge }), where('T2')).toBe(true);
      expect(p.leapTo(at(599, 38), { edge }), where('T3')).toBe(true);
      expect(p.hop(at(599, 36), { edge }), where('Lookout')).toBe(true);
      expect(p.y).toBeCloseTo(46, 6);
    });
  });
});

describe('Saltmere Pickle Rock', () => {
  it('lets a fairy fly from the Lookout to the rim', () => {
    const p = new Pilot(world, 'fairy', at(602, 33));
    expect(p.fly(at(611, 33)), p.describe()).toBe(true);
    expect(p.y).toBeCloseTo(49, 6);
  });

  it('keeps a bunny\'s hop from the Lookout off the rock', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(602, 33));
      expect(p.hop(at(611, 33), { edge, seconds: 8 }), `edge ${edge}`).toBe(false);
    });
  });

  it('lets a human walk into the pool, dive and use the pickle, but not float', () => {
    const p = new Pilot(world, 'human', at(611, 33));
    expect(p.swim(at(612, 33)), p.describe()).toBe(true);
    expect(p.swim(at(613, 32)), p.describe()).toBe(true);
    expect(p.canUse(PICKLE), 'floating').toBe(false);
    expect(p.dive(PICKLE), p.describe()).toBe(true);
    expect(p.canUse(PICKLE), 'dived').toBe(true);
  });
});

describe('Saltmere Deep Road', () => {
  it('lets a mermaid swim the whole road under the kelp and get out onto Pearl Rock', () => {
    const p = new Pilot(world, 'mermaid', at(582, 55));
    const where = (what: string) => `${what}: ${p.describe()}`;
    expect(p.walk(at(584, 55)), where('into the Mere')).toBe(true);
    expect(p.swim(at(618, 55)), where('to the Deep')).toBe(true);
    const before = p.time;
    expect(p.swim(at(659, 55), { under: true, seconds: 20 }), where('the road')).toBe(true);
    // About 5 s of game time for 41 tiles at 8 tiles a second.
    expect(p.time - before, 'seconds').toBeLessThan(8);
    expect(p.swim(at(660, 55), { under: true }), where('out from under the mat')).toBe(true);
    expect(p.surface(), where('surface in the cove')).toBe(true);
    expect(p.swim(at(662, 55)), where('across the cove')).toBe(true);
    expect(p.hop(at(664, 55)), where('onto Pearl Rock')).toBe(true);
    expect(p.y).toBeCloseTo(38, 6);
    expect(p.fell).toBe(false);
  });

  it('lets her swim it back to the beach', () => {
    const p = new Pilot(world, 'mermaid', at(661, 55));
    const where = (what: string) => `${what}: ${p.describe()}`;
    expect(p.swim(at(657, 55), { under: true }), where('into the road')).toBe(true);
    expect(p.swim(at(621, 55), { under: true, seconds: 20 }), where('the road')).toBe(true);
    expect(p.surface(), where('surface in the Deep')).toBe(true);
    expect(p.swim(at(584, 55), { seconds: 20 }), where('back to the beach')).toBe(true);
    expect(p.hop(at(582, 55)), where('onto the beach')).toBe(true);
    expect(p.y).toBeCloseTo(38, 6);
    expect(p.fell).toBe(false);
  });

  it('keeps a human that swims at the road\'s mouth out, dived or not', () => {
    for (const under of [false, true]) {
      const p = new Pilot(world, 'human', at(619, 55));
      expect(p.swim(at(630, 55), { under, seconds: 8 }), `under ${under}`).toBe(false);
      expect(p.x, `under ${under}`).toBeLessThan(623);
    }
  });
});
