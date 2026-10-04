import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';

// Physical routes of Galecrest's west half, driven by a real Player.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];

describe('Galecrest arrival', () => {
  it('lands a hop-then-fly from Hollowfen\'s rim in the Court', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'bunny', { x: 1328.5, z: 30.5 });
      expect(p.hopThenFly(at(1353, 26), { edge, seconds: 25 }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y, `edge ${edge}`).toBeCloseTo(5, 6);
    }
  });

  it('keeps a Bunny\'s hop-then-fly from the Court west of the Windbreak', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'bunny', at(1355, 26));
      p.hopThenFly(at(1365, 26), { edge, seconds: 15 });
      expect(p.x, `edge ${edge}: ${p.describe()}`).toBeLessThan(1361);
    }
  });

  it('lets an Axolotl swim under the Windbreak, hidden, and climb out onto the Yard', () => {
    const p = new Pilot(world, 'axolotl', at(1355, 30));
    expect(p.swim(at(1358, 30), { seconds: 15 }), p.describe()).toBe(true);
    expect(p.swim(at(1360, 30), { under: true, seconds: 20 }), p.describe()).toBe(true);
    expect(p.swim(at(1361, 30), { under: true, seconds: 20 }), p.describe()).toBe(true);
    expect(p.player.hidden, p.describe()).toBe(true);
    expect(p.swim(at(1364, 30), { under: true, seconds: 20 }), p.describe()).toBe(true);
    expect(p.surface(), p.describe()).toBe(true);
    expect(p.hop(at(1368, 30), { seconds: 10 }), p.describe()).toBe(true);
    expect(p.x).toBeGreaterThan(1367);
    expect(p.y).toBeCloseTo(5, 1);
  });
});

describe('Galecrest the Tarn', () => {
  it('lets a Mermaid dive from the shore to the pickle and use it', () => {
    const p = new Pilot(world, 'mermaid', at(1412, 52));
    expect(p.swim(at(1412, 50), { seconds: 10 }), p.describe()).toBe(true);
    expect(p.dive(at(1413, 44), { seconds: 20 }), p.describe()).toBe(true);
    expect(p.canUse({ x: 1413.5, z: 43.5 }), p.describe()).toBe(true);
  });
});

describe('Galecrest the Gorse Ring', () => {
  it('lets an Ant through the ring, then a Bunny hop onto the terrace', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'ant', at(1418, 54));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      // The speaker stands at (1424.5, 54.5): walk round it on the south side.
      expect(p.walk(at(1428, 57), { seconds: 15 }), where('through the ring')).toBe(true);
      expect(p.x, where('inside')).toBeGreaterThan(1422);
      p.breathe();
      p.shift('bunny');
      expect(p.hop(at(1430, 53), { edge, seconds: 10 }), where('terrace')).toBe(true);
      expect(p.y, where('on the terrace')).toBeCloseTo(16, 6);
      expect(p.canUse({ x: 1431.5, z: 52.5 }), where('candle')).toBe(true);
    }
  });
});

describe('Galecrest the Pine Road', () => {
  it('lets an Orangutan climb the first tree, leap to the second and reach the rock, then a Fairy fly to the pillar', () => {
    for (const edge of EDGES) {
      const p = new Pilot(world, 'orangutan', at(1419, 38));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.climb(at(1419, 34)), where('T1')).toBe(true);
      expect(p.leapTo(at(1419, 31), { edge }), where('T2')).toBe(true);
      expect(p.hop(at(1419, 28), { edge, seconds: 8 }), where('rock')).toBe(true);
      expect(p.y, where('on the rock')).toBeCloseTo(19, 6);
      // The speaker stands on the rock at (1419.5, 27.5): walk round it on the west side.
      expect(p.walk(at(1417, 27), { seconds: 10 }), where('round the speaker')).toBe(true);
      p.shift('fairy');
      p.rest();
      expect(p.fly(at(1418, 15), { seconds: 15 }), where('pillar')).toBe(true);
      expect(p.y, where('on the pillar')).toBeCloseTo(22, 6);
    }
  });
});
