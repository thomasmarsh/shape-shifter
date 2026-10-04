import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';

// More physical routes on Coilstone, driven by a real Player: the Tooth's and the
// Thicket's tangle rings and the Coil walked downhill.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const inRing = (p: Pilot) => p.x > 966 && p.x < 969 && p.z > 44 && p.z < 47;

describe('Coilstone the Tooth', () => {
  it('lets an Ant walk through the ring to the candle', () => {
    const p = new Pilot(world, 'ant', at(970, 47));
    expect(p.walk(at(967, 44), { seconds: 30 }), p.describe()).toBe(true);
    expect(p.fell).toBe(false);
    expect(p.canUse({ x: 967.5, z: 45.5 }), p.describe()).toBe(true);
  });

  it('keeps a Human out of the ring', () => {
    const p = new Pilot(world, 'human', at(970, 47));
    p.walk(at(967, 44), { seconds: 15 });
    expect(inRing(p), p.describe()).toBe(false);
    expect(p.canUse({ x: 967.5, z: 45.5 })).toBe(false);
  });
});

describe('Coilstone the Thicket', () => {
  it('lets an Ant in, then an Orangutan climb the banyan and leap to the candle rock', () => {
    const ant = new Pilot(world, 'ant', at(1080, 48));
    expect(ant.walk(at(1085, 48), { seconds: 30 }), ant.describe()).toBe(true);
    expect(ant.fell).toBe(false);
    const p = new Pilot(world, 'orangutan', { x: ant.x, z: ant.z });
    expect(p.climb(at(1086, 48)), p.describe()).toBe(true);
    expect(p.hop(at(1090, 48)), p.describe()).toBe(true);
    expect(p.fell).toBe(false);
    expect(p.y).toBeCloseTo(18, 1);
    expect(p.canUse({ x: 1091.5, z: 48.5 }), p.describe()).toBe(true);
  });
});

describe('Coilstone the Coil downhill', () => {
  it('lets a Snake walk from the Serpent\'s Head down to the Foot', () => {
    const p = new Pilot(world, 'snake', at(1121, 31));
    expect(p.walk(at(1098, 30), { seconds: 30 }), p.describe()).toBe(true);
    expect(p.fell).toBe(false);
    expect(p.y).toBeCloseTo(12, 1);
  });
});
