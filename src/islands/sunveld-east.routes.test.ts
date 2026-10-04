import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';

// Physical routes of Sunveld's east half, driven by a real Player.

const world = new World();

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];
function eachEdge(route: (edge: number) => void): void {
  for (const edge of EDGES) route(edge);
}

describe('Sunveld Umbrella Grove', () => {
  it('lets an orangutan climb T1, leap to T2 and hop onto Grove Rock', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'orangutan', at(830, 45));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.climb(at(830, 41)), where('T1')).toBe(true);
      expect(p.leapTo(at(830, 38), { edge }), where('T2')).toBe(true);
      expect(p.hop(at(830, 36), { edge }), where('Grove Rock')).toBe(true);
      expect(p.y).toBeCloseTo(23, 6);
    });
  });

  it('lets a wolf run the pier and turn into a fairy that flies to Pier Rock', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'wolf', at(830, 32));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.sprint(at(835, 32), { seconds: 5 }), where('onto the pier')).toBe(true);
      expect(p.runThenFly(at(850, 32), () => p.x >= 850.2, at(859, 32)), where('fly')).toBe(true);
      expect(p.y).toBeCloseTo(24, 6);
    });
  });
});

describe('Sunveld Kraal', () => {
  it('lets an ant in on the west side, an orangutan climb to the ledge and a bunny and fairy reach the spire', () => {
    const a = new Pilot(world, 'ant', at(833, 48));
    expect(a.walk(at(839, 48)), a.describe()).toBe(true);
    eachEdge((edge) => {
      const p = new Pilot(world, 'orangutan', at(841, 48));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.climb(at(841, 50)), where('tree')).toBe(true);
      expect(p.leapTo(at(844, 50), { edge }) || p.hop(at(843, 50), { edge }), where('ledge')).toBe(true);
      expect(p.y).toBeCloseTo(22, 6);
    });
    eachEdge((edge) => {
      const b = new Pilot(world, 'bunny', at(846, 50));
      expect(b.hopThenFly(at(855, 51), { edge }), `bunny edge ${edge}: ${b.describe()}`).toBe(true);
      expect(b.y).toBeCloseTo(26, 6);
    });
  });

  it('keeps a human at the thorn', () => {
    const p = new Pilot(world, 'human', at(833, 48));
    expect(p.walk(at(839, 48), { seconds: 8 })).toBe(false);
    expect(p.x).toBeLessThan(836);
  });
});

describe('Sunveld Red Wall: the whole way off', () => {
  const PLATE = at(838, 57);
  const YARD = at(878, 55);
  const CRUST_END = at(924, 55);
  // The checkpoint at (931.5, 4.5) is a post: end beside it.
  const SUNSET = at(930, 5);

  it('runs the whole way with real breath', () => {
    const p = new Pilot(world, 'human', at(836, 57));
    const where = (what: string) => `${what}: ${p.describe()} ${p.reason ?? ''}`;
    expect(p.runGate(PLATE, at(871, 57), { seconds: 6 }), where('gate')).toBe(true);
    expect(p.sprint(YARD, { seconds: 5 }), where('yard')).toBe(true);
    expect(p.breathe(), where('breath in the yard')).toBe(true);
    expect(p.sprint(CRUST_END, { edge: 0.25, seconds: 10 }), where('crust')).toBe(true);
    expect(p.y).toBeCloseTo(16, 6);
    p.shift('bunny');
    expect(p.hop(at(930, 47), { seconds: 8 }) || p.walk(at(930, 47), { seconds: 8 }), where('terrace')).toBe(true);
    p.shift('cheetah');
    expect(p.y).toBeCloseTo(20, 6);
    expect(p.breathe(), where('breath on the terrace')).toBe(true);
    expect(p.sprint(at(931, 9), { edge: 0.25, seconds: 10 }), where('high crust')).toBe(true);
    expect(p.sprint(SUNSET, { seconds: 5 }), where('sunset rock')).toBe(true);
    expect(p.y).toBeCloseTo(20, 6);
    expect(p.fell).toBe(false);
  });

  it('does not make the gate as a wolf', () => {
    const p = new Pilot(world, 'human', at(836, 57));
    expect(p.runGate(PLATE, at(871, 57), { form: 'wolf', seconds: 8 })).toBe(false);
  });

  it('does not make the gate sprint and the crust without a rest', () => {
    const p = new Pilot(world, 'human', at(836, 57));
    expect(p.runGate(PLATE, at(871, 57), { seconds: 6 })).toBe(true);
    expect(p.sprint(CRUST_END, { edge: 0.25, seconds: 12 })).toBe(false);
    expect(p.reason).toMatch(/winded/);
  });
});
