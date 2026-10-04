import { describe, expect, it } from 'vitest';
import type { FormId } from './forms';
import { Pilot } from './pilot';
import { Island, Kind, World } from './world';

// The Axolotl's hollows with the real player physics (see pilot.ts): a pool 4 deep
// (columns 10 to 30) with a row of three hollow tiles across it (columns 18 to 20).

const BANK = 6;
const LEVEL = 6;
const at = (i: number, j = 15) => ({ x: i + 0.5, z: j + 0.5 });

const pool = new World([
  {
    id: 'pool',
    name: 'Pool',
    build(t) {
      t.rect(0, 10, 40, 20, (i, j) => t.set(i, j, BANK, Kind.Grass));
      t.rect(10, 10, 30, 20, (i, j) => {
        t.set(i, j, LEVEL - 4, Kind.Sand);
        t.setWater(i, j, true, LEVEL);
      });
      t.rect(18, 10, 20, 20, (i, j) => t.setHollow(i, j));
      return { spawn: at(2) };
    },
  } as Island,
]);

describe('Axolotl route: the hollow row', () => {
  it('swims under the three hollows and surfaces on the far side', () => {
    const p = new Pilot(pool, 'axolotl', at(13));
    p.swim(at(16));
    expect(p.swim(at(23), { under: true, seconds: 20 }), p.describe()).toBe(true);
    expect(p.x).toBeGreaterThan(22);
    expect(p.surface(), p.describe()).toBe(true);
  });

  it('stops the others at the first hollow', () => {
    for (const form of ['mermaid', 'human', 'snake', 'ant'] as FormId[]) {
      const p = new Pilot(pool, form, at(13));
      p.swim(at(23), { under: true, seconds: 10 });
      expect(p.x, form).toBeLessThan(18.1);
    }
  });
});
