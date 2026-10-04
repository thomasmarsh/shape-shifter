import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';

// Physical routes of Coilstone's east half, driven by a real Player.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });

describe('Coilstone the Coil', () => {
  it('lets a Snake walk from the Foot up the burrow to the top of the Serpent\'s Head', () => {
    const p = new Pilot(world, 'snake', at(1098, 30));
    expect(p.walk(at(1120, 30), { seconds: 30 }), p.describe()).toBe(true);
    expect(p.fell).toBe(false);
    expect(p.y).toBeCloseTo(19.5, 1);
  });

  it('stops an Ant at the first rise', () => {
    const p = new Pilot(world, 'ant', at(1098, 30));
    p.walk(at(1120, 30), { seconds: 20 });
    expect(p.x).toBeGreaterThan(1104.3);
    expect(p.x).toBeLessThan(1106);
    expect(p.y).toBeLessThan(12.1);
  });
});

describe('Coilstone the Bridge', () => {
  it('lets a rested Cheetah sprint it west to east over the gap', () => {
    for (const edge of [0.5, 0.25, 0.05]) {
      const p = new Pilot(world, 'cheetah', at(1021, 5));
      expect(p.sprint(at(1070, 5), { edge, seconds: 10 }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.fell, `edge ${edge}`).toBe(false);
      expect(p.minIceSpeed, `edge ${edge}`).toBeGreaterThanOrEqual(9);
    }
  });
});
