import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';

// Physical routes that carry a player to Coilstone's candles, driven by a real Player.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];

describe('Coilstone the Stair', () => {
  it('lets a Wolf run up the Stair to the Table, then hop-then-fly to the Spire and use the candle', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'wolf', at(1065, 58));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.sprint(at(1065, 26), { done: () => p.y > 17.9 }), where('up the Stair')).toBe(true);
      // The speaker stands on the Table at (1065.5, 27.5): walk round it on the west side.
      expect(p.walk(at(1063, 29), { seconds: 10 }), where('round the speaker')).toBe(true);
      expect(p.walk(at(1063, 24), { seconds: 10 }), where('to the north edge')).toBe(true);
      expect(p.y, where('on the Table')).toBeCloseTo(18, 6);
      p.breathe();
      p.shift('bunny');
      expect(p.hopThenFly(at(1065, 15), { edge, seconds: 20 }), where('across')).toBe(true);
      expect(p.y, where('on the Spire')).toBeCloseTo(22, 6);
      expect(p.canUse({ x: 1065.5, z: 14.5 }), where('candle')).toBe(true);
    }
  });
});

describe('Coilstone the Sunken Court', () => {
  it('lets a Mermaid swim in under the kelp ring and surface inside', () => {
    const p = new Pilot(world, 'mermaid', at(1006, 49));
    expect(p.swim(at(1012, 49), { under: true, seconds: 20 }), p.describe()).toBe(true);
    expect(p.surface(), p.describe()).toBe(true);
    expect(p.x).toBeGreaterThan(1011);
    expect(p.x).toBeLessThan(1013.5);
  });

  it('lets a Bunny hop from the islet onto the terrace', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'bunny', at(1015, 49));
      expect(p.hop(at(1019, 49), { edge, seconds: 10 }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(16, 6);
    }
  });
});

describe('Coilstone the Colonnade', () => {
  it('lets an Orangutan climb the first tree, leap to the second and reach the rock, then a Fairy fly to the pillar', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'orangutan', at(1012, 38));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.climb(at(1012, 34)), where('T1')).toBe(true);
      expect(p.leapTo(at(1012, 31), { edge }), where('T2')).toBe(true);
      expect(p.hop(at(1012, 28), { edge, seconds: 8 }), where('rock')).toBe(true);
      expect(p.y, where('on the rock')).toBeCloseTo(19, 6);
      // The speaker stands on the rock at (1012.5, 27.5): walk round it on the west side.
      expect(p.walk(at(1010, 27), { seconds: 10 }), where('round the speaker')).toBe(true);
      p.shift('fairy');
      p.rest();
      expect(p.fly(at(1011, 15), { seconds: 15 }), where('pillar')).toBe(true);
      expect(p.y, where('on the pillar')).toBeCloseTo(22, 6);
    }
  });
});

describe('Coilstone the Bridge', () => {
  it('lets a rested Cheetah sprint it east to west over the gap', () => {
    for (const edge of [0.5, 0.25, 0.05]) {
      const p = new Pilot(world, 'cheetah', at(1070, 5));
      expect(p.sprint(at(1021, 5), { edge, seconds: 10 }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.fell, `edge ${edge}`).toBe(false);
    }
  });
});
