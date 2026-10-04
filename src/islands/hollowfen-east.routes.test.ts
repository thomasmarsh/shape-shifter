import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';

// Physical routes of Hollowfen's east half, driven by a real Player.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];

describe('Hollowfen the Mound', () => {
  it('lets a Snake walk from the Mound\'s foot up the burrow to the top', () => {
    const p = new Pilot(world, 'snake', at(1292, 44));
    expect(p.walk(at(1310, 44), { seconds: 30 }), p.describe()).toBe(true);
    expect(p.fell).toBe(false);
    expect(p.y).toBeCloseTo(19.5, 1);
  });

  it('stops an Ant and an Axolotl at the first rise', () => {
    for (const form of ['ant', 'axolotl'] as const) {
      const p = new Pilot(world, form, at(1292, 44));
      p.walk(at(1310, 44), { seconds: 20 });
      expect(p.x, form).toBeGreaterThan(1296.3);
      expect(p.x, form).toBeLessThan(1298);
      expect(p.y, form).toBeLessThan(12.1);
    }
  });
});

describe('Hollowfen the Bridge', () => {
  it('lets a rested Cheetah sprint it west to east over the gap', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'cheetah', at(1226, 5));
      expect(p.sprint(at(1275, 5), { edge, seconds: 10 }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.fell, `edge ${edge}`).toBe(false);
      expect(p.minIceSpeed, `edge ${edge}`).toBeGreaterThanOrEqual(9);
    }
  });
});

describe('Hollowfen the Stair', () => {
  it('lets a Wolf run up the Stair to the Table, then hop-then-fly to the Spire and use the candle', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'wolf', at(1270, 58));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.sprint(at(1270, 26), { done: () => p.y > 17.9 }), where('up the Stair')).toBe(true);
      // The speaker stands on the Table at (1270.5, 27.5): walk round it on the west side.
      expect(p.walk(at(1268, 29), { seconds: 10 }), where('round the speaker')).toBe(true);
      expect(p.walk(at(1268, 24), { seconds: 10 }), where('to the north edge')).toBe(true);
      expect(p.y, where('on the Table')).toBeCloseTo(18, 6);
      p.breathe();
      p.shift('bunny');
      expect(p.hopThenFly(at(1270, 15), { edge, seconds: 20 }), where('across')).toBe(true);
      expect(p.y, where('on the Spire')).toBeCloseTo(22, 6);
      expect(p.canUse({ x: 1270.5, z: 14.5 }), where('candle')).toBe(true);
    }
  });
});

describe('Hollowfen the Well', () => {
  it('lets an Axolotl swim from the west shore under the hollow ring to the Last Stone, and back', () => {
    const p = new Pilot(world, 'axolotl', at(1303, 17));
    p.swim(at(1306, 17));
    expect(p.swim(at(1310, 17), { under: true, seconds: 20 }), p.describe()).toBe(true);
    expect(p.surface(), p.describe()).toBe(true);
    // The float is 0.8 under the level: climbing out onto the stone is a jump.
    expect(p.hop(at(1314, 19), { seconds: 10 }), p.describe()).toBe(true);
    expect(p.y).toBeCloseTo(12, 1);
    // and back
    expect(p.swim(at(1310, 17), { seconds: 10 }), p.describe()).toBe(true);
    expect(p.swim({ x: 1306.3, z: 17.5 }, { under: true, seconds: 20 }), p.describe()).toBe(true);
    expect(p.surface(), p.describe()).toBe(true);
    expect(p.hop(at(1302, 17), { seconds: 10 }), p.describe()).toBe(true);
    expect(p.x).toBeLessThan(1305);
  });
});
