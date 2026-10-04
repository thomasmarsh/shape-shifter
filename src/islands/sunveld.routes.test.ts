import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';
import { MESA, PILLAR } from './sunveld';

// Physical routes of Sunveld's west half, driven by a real Player.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];
function eachEdge(route: (edge: number) => void): void {
  for (const edge of EDGES) route(edge);
}
const CANDLE = {
  hole: at(723, 32),
  oxbow: at(752, 25),
  table: at(795, 14),
};

describe('Sunveld landing', () => {
  it('lands a hop-then-fly from Pearl Rock on Sunveld', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(670, 56));
      expect(p.hopThenFly(at(702, 56), { edge, seconds: 25 }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(16, 6);
    });
  });
});

describe('Sunveld Watering Hole', () => {
  it('lets a Human dive but not reach the candle, and a Mermaid use it from the bed', () => {
    const h = new Pilot(world, 'human', at(719, 32));
    expect(h.walk(at(719, 32))).toBe(true);
    expect(h.swim(at(722, 32)), h.describe()).toBe(true);
    expect(h.dive(CANDLE.hole), h.describe()).toBe(true);
    expect(h.canUse(CANDLE.hole), 'human at its floor').toBe(false);
    const m = new Pilot(world, 'mermaid', at(719, 32));
    expect(m.swim(at(722, 32)), m.describe()).toBe(true);
    expect(m.dive(CANDLE.hole), m.describe()).toBe(true);
    expect(m.canUse(CANDLE.hole), 'mermaid at the bed').toBe(true);
  });
});

describe('Sunveld Oxbow', () => {
  it('lets a Mermaid swim under the kelp and out onto the islet', () => {
    const m = new Pilot(world, 'mermaid', at(748, 41));
    expect(m.swim(at(743, 33), { under: true }), m.describe()).toBe(true);
    expect(m.swim(at(743, 29)), m.describe()).toBe(true);
    expect(m.hop(at(743, 27), { seconds: 10 }), m.describe()).toBe(true);
    expect(m.y).toBeCloseTo(16, 6);
  });

  it('keeps a Human out: it cannot swim through the mat', () => {
    const h = new Pilot(world, 'human', at(748, 41));
    expect(h.swim(at(743, 29), { seconds: 12 }), 'human').toBe(false);
    expect(h.z, 'human').toBeGreaterThan(36);
  });

  it('lets a Bunny on the islet hop onto the terrace, but not a Human', () => {
    const b = new Pilot(world, 'bunny', at(743, 28));
    expect(b.hop(at(743, 26), { seconds: 10 }), b.describe()).toBe(true);
    expect(b.y).toBeCloseTo(20, 6);
    const h = new Pilot(world, 'human', at(743, 28));
    expect(h.hop(at(743, 26), { seconds: 10 }), 'human').toBe(false);
  });

  it('lands a hop-then-fly from the terrace on the spire', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'bunny', at(744, 25));
      expect(p.hopThenFly(at(752, 26), { edge, seconds: 14 }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(24, 6);
      expect(p.canUse(CANDLE.oxbow), p.describe()).toBe(true);
    }
  });

  it('keeps a Bunny alone and a Fairy alone off the spire', () => {
    eachEdge((edge) => {
      const b = new Pilot(world, 'bunny', at(744, 25));
      expect(b.hop(at(752, 26), { edge, seconds: 8 }), `bunny edge ${edge}`).toBe(false);
    });
    const f = new Pilot(world, 'fairy', at(744, 25));
    expect(f.fly(at(752, 26), { seconds: 12 }), 'fairy').toBe(false);
  });
});

describe('Sunveld Crust Stair and the Red Table', () => {
  it('lets a Wolf sprint up the stair onto the mesa and back down, never slower than 6', () => {
    const w = new Pilot(world, 'wolf', at(764, 29));
    expect(w.sprint(at(792, 29)), w.describe()).toBe(true);
    expect(w.y).toBeCloseTo(MESA, 6);
    expect(w.minIceSpeed).toBeGreaterThanOrEqual(6);
    const down = new Pilot(world, 'wolf', at(793, 29));
    expect(down.sprint(at(764, 29)), down.describe()).toBe(true);
    expect(down.y).toBeCloseTo(16, 6);
    expect(down.minIceSpeed).toBeGreaterThanOrEqual(6);
  });

  it('stops a Bunny and a Human who try the stair', () => {
    const b = new Pilot(world, 'bunny', at(764, 29));
    expect(b.sprint(at(792, 29), { seconds: 12 }), 'bunny').toBe(false);
    expect(b.y, 'bunny').toBeLessThan(MESA - 4);
    const h = new Pilot(world, 'human', at(764, 29));
    expect(h.walk(at(792, 29), { seconds: 12 }), 'human').toBe(false);
    expect(h.y, 'human').toBeLessThan(MESA - 4);
  });

  it('lets an Ant walk through the thorn to the speaker and the bread', () => {
    const a = new Pilot(world, 'ant', at(796, 33));
    expect(a.walk(at(796, 29), { seconds: 30 }), a.describe()).toBe(true);
    expect(a.y).toBeCloseTo(MESA, 6);
    expect(a.canUse({ x: 796.5, z: 28.5 })).toBe(true);
  });

  it('keeps a Human out of the thorn', () => {
    const h = new Pilot(world, 'human', at(796, 33));
    expect(h.walk(at(796, 29), { seconds: 10 }), 'human').toBe(false);
  });

  it('lets a Fairy fly from the mesa edge to the pillar and use the candle', () => {
    const f = new Pilot(world, 'fairy', at(795, 24));
    expect(f.fly(at(795, 15), { seconds: 12 }), f.describe()).toBe(true);
    expect(f.canUse(CANDLE.table), f.describe()).toBe(true);
  });

  it('keeps a Fairy from the ground off the pillar', () => {
    const f = new Pilot(world, 'fairy', at(795, 22));
    expect(f.fly(at(795, 15), { seconds: 12 }), 'fairy from the ground').toBe(false);
    expect(f.peak, 'fairy').toBeLessThan(PILLAR - 0.3);
  });
});
