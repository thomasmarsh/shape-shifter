import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';

// Physical routes of Galecrest's east half, driven by a real Player.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];

describe('Galecrest the Crag', () => {
  it('lets a Snake walk from the Crag\'s foot up the burrow to the top', () => {
    const p = new Pilot(world, 'snake', at(1499, 44));
    expect(p.walk(at(1517, 44), { seconds: 30 }), p.describe()).toBe(true);
    expect(p.fell).toBe(false);
    expect(p.y).toBeCloseTo(19.5, 1);
  });

  it('stops an Ant and an Axolotl at the first rise', () => {
    for (const form of ['ant', 'axolotl'] as const) {
      const p = new Pilot(world, form, at(1499, 44));
      p.walk(at(1517, 44), { seconds: 20 });
      expect(p.x, form).toBeGreaterThan(1503.3);
      expect(p.x, form).toBeLessThan(1505);
      expect(p.y, form).toBeLessThan(12.1);
    }
  });
});

describe('Galecrest the Bridge', () => {
  it('lets a rested Cheetah sprint it west to east over the gap', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'cheetah', at(1433, 5));
      expect(p.sprint(at(1482, 5), { edge, seconds: 10 }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.fell, `edge ${edge}`).toBe(false);
      expect(p.minIceSpeed, `edge ${edge}`).toBeGreaterThanOrEqual(9);
    }
  });
});

describe('Galecrest the Stair', () => {
  it('lets a Wolf run up the Stair to the Table, then hop-then-fly to the Spire and use the candle', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'wolf', at(1477, 58));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.sprint(at(1477, 26), { done: () => p.y > 17.9 }), where('up the Stair')).toBe(true);
      // The speaker stands on the Table at (1477.5, 27.5): walk round it on the west side.
      expect(p.walk(at(1475, 29), { seconds: 10 }), where('round the speaker')).toBe(true);
      expect(p.walk(at(1475, 24), { seconds: 10 }), where('to the north edge')).toBe(true);
      expect(p.y, where('on the Table')).toBeCloseTo(18, 6);
      p.breathe();
      p.shift('bunny');
      expect(p.hopThenFly(at(1477, 15), { edge, seconds: 20 }), where('across')).toBe(true);
      expect(p.y, where('on the Spire')).toBeCloseTo(22, 6);
      expect(p.canUse({ x: 1477.5, z: 14.5 }), where('candle')).toBe(true);
    }
  });
});

describe('Galecrest the wings', () => {
  const glideFrom = (level: number, form: 'human' | 'bunny', start: { x: number; z: number }) => {
    const p = new Pilot(world, form, start);
    p.player.level = level;
    return p;
  };
  const ROCK = { x: 1577.5, z: 31.5 };

  it('lets a Human of level 10 glide from the hub\'s east edge onto Kestrel Rock', () => {
    const p = glideFrom(10, 'human', { x: 1526.5, z: 30.5 });
    expect(p.glide(ROCK, { seconds: 30 }), p.describe()).toBe(true);
    expect(p.fell).toBe(false);
    expect(p.y).toBeCloseTo(1, 1);
  });

  it('does not carry a Human of level 9', () => {
    const p = glideFrom(9, 'human', { x: 1526.5, z: 30.5 });
    p.glide(ROCK, { seconds: 30 });
    expect(p.standingOn(ROCK), p.describe()).toBe(false);
  });

  it('does not carry a Bunny\'s hop-then-fly', () => {
    const p = glideFrom(10, 'bunny', { x: 1526.5, z: 30.5 });
    p.hopThenFly(ROCK, { seconds: 30 });
    expect(p.standingOn(ROCK), p.describe()).toBe(false);
  });

  it('lets a Human of level 10 glide from the top of the Crag onto Kestrel Rock', () => {
    const p = glideFrom(10, 'human', { x: 1521.5, z: 40.5 });
    expect(p.y).toBeCloseTo(19.5, 1);
    expect(p.glide(ROCK, { seconds: 30 }), p.describe()).toBe(true);
    expect(p.y).toBeCloseTo(1, 1);
  });
});
