import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';

// Physical routes of Coilstone's west half, driven by a real Player.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];
function eachEdge(route: (edge: number) => void): void {
  for (const edge of EDGES) route(edge);
}

describe('Coilstone landing', () => {
  it('lands a hop-then-fly from Sunset Rock on the Landing', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(936, 5));
      expect(p.hopThenFly(at(960, 5), { edge, seconds: 25 }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(6, 6);
    });
  });
});

describe('Coilstone Tooth', () => {
  it('lets a wolf run the pier west and turn into a fairy that flies to the Tooth', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'wolf', at(1004, 45));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.sprint(at(994, 45), { seconds: 5 }), where('onto the pier')).toBe(true);
      expect(p.runThenFly(at(980, 45), () => p.x <= 980.8, at(971, 45)), where('fly')).toBe(true);
      expect(p.y).toBeCloseTo(12, 6);
    });
  });
});
