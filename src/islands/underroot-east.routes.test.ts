import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';

// Physical routes of Underroot's east half, driven by a real Player.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];
function eachEdge(route: (edge: number) => void): void {
  for (const edge of EDGES) route(edge);
}

describe('Underroot Root Grove: the great trees', () => {
  it('lets an orangutan climb T1, T2, T3 and hop onto Grove Rock', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'orangutan', at(393, 49));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.climb(at(393, 46)), where('T1')).toBe(true);
      expect(p.leapTo(at(393, 43), { edge }), where('T2')).toBe(true);
      expect(p.leapTo(at(395, 41), { edge }), where('T3')).toBe(true);
      expect(p.hop(at(395, 39), { edge }), where('Grove Rock')).toBe(true);
      expect(p.y).toBeCloseTo(40, 6);
    });
  });

  it('keeps a bunny\'s hop-then-fly and a fairy from the hub off Grove Rock', () => {
    eachEdge((edge) => {
      const b = new Pilot(world, 'bunny', at(397, 47));
      expect(b.hopThenFly(at(397, 38), { edge, seconds: 14 }), `bunny edge ${edge}: ${b.describe()}`).toBe(false);
    });
    const f = new Pilot(world, 'fairy', at(397, 47));
    expect(f.fly(at(397, 38), { seconds: 10 }), 'fairy').toBe(false);
    expect(f.peak, 'fairy').toBeLessThan(40 - 0.3);
  });
});

describe('Underroot Bough Rock and the Spire', () => {
  it('lets a fairy fly from Grove Rock to Bough Rock', () => {
    const p = new Pilot(world, 'fairy', at(398, 35));
    expect(p.fly(at(407, 35)), p.describe()).toBe(true);
    expect(p.y).toBeCloseTo(43, 6);
  });

  it('keeps a fairy alone from Bough Rock off the Spire', () => {
    const f = new Pilot(world, 'fairy', at(410, 35));
    expect(f.fly(at(419, 35), { seconds: 12 }), 'fairy').toBe(false);
    expect(f.peak, 'fairy').toBeLessThan(47 - 0.3);
  });

  it('lands a hop-then-fly from Bough Rock on the Spire', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(410, 35));
      expect(p.hopThenFly(at(419, 35), { edge }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(47, 6);
    });
  });
});

describe('Underroot Root Wall and Yard', () => {
  it('lets an Ant walk from beside the Wall through it into the Yard', () => {
    const p = new Pilot(world, 'ant', at(424, 52));
    expect(p.walk(at(431, 52), { seconds: 20 }), p.describe()).toBe(true);
    expect(p.y).toBeCloseTo(32, 6);
  });

  it('keeps a human, a fairy at her ceiling and a bunny\'s hop-then-fly out', () => {
    const h = new Pilot(world, 'human', at(424, 52));
    expect(h.walk(at(433, 52), { seconds: 10 }), 'human').toBe(false);
    expect(h.x, 'human').toBeLessThan(426);
    eachEdge((edge) => {
      const b = new Pilot(world, 'bunny', at(424, 52));
      expect(b.hopThenFly(at(433, 52), { edge, seconds: 14 }), `bunny edge ${edge}`).toBe(false);
      expect(b.x, `bunny edge ${edge}`).toBeLessThan(426);
    });
    const f = new Pilot(world, 'fairy', at(424, 52));
    expect(f.fly(at(433, 52), { seconds: 10 }), 'fairy').toBe(false);
    expect(f.x, 'fairy').toBeLessThan(426);
  });
});

describe('Underroot Long Root and Crown', () => {
  it('lets an Ant walk the whole root from the Yard to the Crown without falling', () => {
    const p = new Pilot(world, 'ant', at(436, 52));
    expect(p.walk(at(474, 52), { seconds: 30 }), p.describe()).toBe(true);
    expect(p.fell).toBe(false);
    expect(p.y).toBeCloseTo(40, 6);
  });

  it('keeps a fairy that flies at the root off it', () => {
    const f = new Pilot(world, 'fairy', at(473, 52));
    expect(f.fly(at(465, 52), { seconds: 10 }), 'fairy').toBe(false);
    expect(world.isTangle(f.x, f.z), 'on the root').toBe(false);
    expect(f.x, 'fairy').toBeGreaterThan(470);
  });
});

describe('Underroot to Saltmere', () => {
  it('lets a fairy fly from the Crown to Saltmere', () => {
    const p = new Pilot(world, 'fairy', at(477, 52));
    expect(p.fly(at(491, 52)), p.describe()).toBe(true);
    expect(p.y).toBeCloseTo(38, 6);
  });

  it('keeps a bunny that hops and a wolf that runs off the Crown away', () => {
    eachEdge((edge) => {
      const b = new Pilot(world, 'bunny', at(476, 52));
      expect(b.hop(at(487, 52), { edge, seconds: 8 }), `bunny edge ${edge}`).toBe(false);
      const w = new Pilot(world, 'wolf', at(473, 52));
      expect(w.sprint(at(487, 52), { edge, seconds: 8 }), `wolf edge ${edge}`).toBe(false);
    });
  });
});
