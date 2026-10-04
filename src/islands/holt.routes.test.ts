import { describe, expect, it } from 'vitest';
import type { FormId } from '../forms';
import { Pilot } from '../pilot';
import { World } from '../world';

// The holts (holt() in fill.ts) with the real player physics: a pond 9 by 9, a ring of hollows 2 thick, a
// moat one tile wide and a single 1 by 1 stone at hub height in the middle. Only the Axolotl gets to the stone.

const world = new World();

const HOLTS = [
  { name: 'the Kettle on Galecrest', i0: 1408, j0: 15, hub: 12 },
  { name: 'the Lair on Sunveld', i0: 744, j0: 43, hub: 16 },
];

describe.each(HOLTS)('$name', ({ i0, j0, hub }) => {
  // (a, b) in tiles from the pond's north-west corner.
  const P = (a: number, b: number) => ({ x: i0 + a, z: j0 + b });
  const STONE = P(4.5, 4.5);

  it('lets a level 9 Axolotl walk to the pond, swim under the ring, jump onto the 1 by 1 stone from the moat, and get back out', () => {
    // From every height of the moat's west side, and with the jump started early, on time and late.
    for (const edge of [0.05, 0.25, 0.5]) {
      for (const dz of [0.1, 0.5, 0.9]) {
        const p = new Pilot(world, 'axolotl', P(-1.5, 4 + dz));
        const where = (what: string) => `edge ${edge}, row +${dz}: ${what}: ${p.describe()}`;
        expect(p.walk(P(-0.5, 4 + dz), { seconds: 10 }), where('to the shore')).toBe(true);
        expect(p.swim(P(0.3, 4 + dz), { seconds: 10 }), where('into the pond')).toBe(true);
        expect(p.swim(P(1.5, 4 + dz), { under: true, seconds: 30 }), where('under the ring')).toBe(true);
        expect(p.player.hidden, where('hidden under the roof')).toBe(true);
        expect(p.swim(P(3.8, 4 + dz), { under: true, seconds: 30 }), where('into the moat')).toBe(true);
        expect(p.surface(), where('up in the moat')).toBe(true);
        expect(p.player.hidden, where('not hidden in the moat')).toBe(false);
        expect(p.hop(STONE, { edge, seconds: 8 }), where('onto the stone')).toBe(true);
        expect(p.y, where('on the stone')).toBeCloseTo(hub, 1);
        expect(p.walk(STONE, { seconds: 5 }), where('on its middle')).toBe(true);
        // back: into the moat on the west side, under the ring and out onto the hub
        expect(p.walk(P(3.2, 4 + dz), { seconds: 6 }), where('off the stone')).toBe(true);
        expect(p.swim(P(2.6, 4 + dz), { under: true, seconds: 30 }), where('under the ring again')).toBe(true);
        expect(p.swim(P(0.4, 4 + dz), { under: true, seconds: 30 }), where('out from under')).toBe(true);
        expect(p.surface(), where('surface')).toBe(true);
        expect(p.hop(P(-1.5, 4 + dz), { seconds: 10 }), where('onto the hub')).toBe(true);
        expect(p.y, where('on the hub')).toBeCloseTo(hub, 1);
        expect(p.fell, where('no fall')).toBe(false);
      }
    }
  });

  it('lets the Axolotl reach the stone from the north, south and east sides of the moat too', () => {
    const sides = [
      { name: 'north', start: P(4.5, -1.5), shore: P(4.5, -0.5), pond: P(4.5, 0.3), under: P(4.5, 1.5), moat: P(4.5, 3.8) },
      { name: 'south', start: P(4.5, 10.5), shore: P(4.5, 9.5), pond: P(4.5, 8.7), under: P(4.5, 7.5), moat: P(4.5, 5.2) },
      { name: 'east', start: P(10.5, 4.5), shore: P(9.5, 4.5), pond: P(8.7, 4.5), under: P(7.5, 4.5), moat: P(5.2, 4.5) },
    ];
    for (const s of sides) {
      const p = new Pilot(world, 'axolotl', s.start);
      const where = (what: string) => `${s.name}: ${what}: ${p.describe()}`;
      expect(p.walk(s.shore, { seconds: 10 }), where('shore')).toBe(true);
      expect(p.swim(s.pond, { seconds: 10 }), where('pond')).toBe(true);
      expect(p.swim(s.under, { under: true, seconds: 30 }), where('under')).toBe(true);
      expect(p.swim(s.moat, { under: true, seconds: 30 }), where('moat')).toBe(true);
      expect(p.surface(), where('surface')).toBe(true);
      expect(p.hop(STONE, { seconds: 8 }), where('stone')).toBe(true);
      expect(p.y, where('height')).toBeCloseTo(hub, 1);
    }
  });

  it('keeps a Human and a Mermaid out: pushing at the ring from the outer water, on top and diving, they never get in', () => {
    const inside = (p: Pilot): boolean => p.x > i0 + 1.1 && p.x < i0 + 7.9 && p.z > j0 + 1.1 && p.z < j0 + 7.9;
    const starts = [P(0.5, 4.5), P(8.5, 4.5), P(4.5, 0.5), P(4.5, 8.5)];
    for (const form of ['human', 'mermaid'] as FormId[]) {
      for (const under of [false, true]) {
        for (const from of starts) {
          const p = new Pilot(world, form, from);
          for (let n = 0; n < 40; n++) {
            p.swim(STONE, { under, seconds: 0.5 });
            expect(inside(p), `${form}${under ? ' diving' : ''} from ${from.x},${from.z}: ${p.describe()}`).toBe(false);
          }
          // and they did push: they are at the ring, not stuck at the start
          expect(Math.hypot(p.x - STONE.x, p.z - STONE.z), `${form} reached the ring: ${p.describe()}`).toBeLessThan(4);
        }
      }
    }
  });
});
