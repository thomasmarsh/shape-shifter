import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';

// Physical routes of Hollowfen's west half, driven by a real Player.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];

describe('Hollowfen landing', () => {
  it('lands a hop-then-fly from the Serpent\'s Head on the Landing', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'bunny', at(1128, 30));
      expect(p.hopThenFly(at(1160, 30), { edge, seconds: 25 }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(4, 6);
    }
  });
});

describe('Hollowfen the Reed Pool', () => {
  it('lets a Mermaid dive from the shore to the pickle and use it', () => {
    const p = new Pilot(world, 'mermaid', at(1205, 52));
    expect(p.swim(at(1205, 50), { seconds: 10 }), p.describe()).toBe(true);
    expect(p.dive(at(1206, 44), { seconds: 20 }), p.describe()).toBe(true);
    expect(p.canUse({ x: 1206.5, z: 43.5 }), p.describe()).toBe(true);
  });
});

describe('Hollowfen the Reed Ring', () => {
  it('lets an Ant through the ring, then a Bunny hop onto the terrace', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'ant', at(1211, 54));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      // The speaker stands at (1217.5, 54.5): walk round it on the south side.
      expect(p.walk(at(1221, 57), { seconds: 15 }), where('through the ring')).toBe(true);
      expect(p.x, where('inside')).toBeGreaterThan(1215);
      p.breathe();
      p.shift('bunny');
      expect(p.hop(at(1223, 53), { edge, seconds: 10 }), where('terrace')).toBe(true);
      expect(p.y, where('on the terrace')).toBeCloseTo(16, 6);
      expect(p.canUse({ x: 1224.5, z: 52.5 }), where('candle')).toBe(true);
    }
  });
});

describe('Hollowfen the Heron Road', () => {
  it('lets an Orangutan climb the first tree, leap to the second and reach the rock, then a Fairy fly to the pillar', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'orangutan', at(1212, 38));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.climb(at(1212, 34)), where('T1')).toBe(true);
      expect(p.leapTo(at(1212, 31), { edge }), where('T2')).toBe(true);
      expect(p.hop(at(1212, 28), { edge, seconds: 8 }), where('rock')).toBe(true);
      expect(p.y, where('on the rock')).toBeCloseTo(19, 6);
      // The speaker stands on the rock at (1212.5, 27.5): walk round it on the west side.
      expect(p.walk(at(1210, 27), { seconds: 10 }), where('round the speaker')).toBe(true);
      p.shift('fairy');
      p.rest();
      expect(p.fly(at(1211, 15), { seconds: 15 }), where('pillar')).toBe(true);
      expect(p.y, where('on the pillar')).toBeCloseTo(22, 6);
    }
  });
});
