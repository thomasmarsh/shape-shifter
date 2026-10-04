import { describe, expect, it } from 'vitest';
import { PHYSICS } from './forms';
import type { FormId } from './forms';
import { Pilot } from './pilot';
import { Island, Kind, World } from './world';

// The Snake's burrow with the real player physics (see pilot.ts): a flat hole tile
// (column 20), then six (columns 21 to 26) rising 0.75 a tile, then a plateau. The checker's rules for
// it are in levelcheck.snake.test.ts.

const FLOOR = 2;
const at = (i: number, j = 15) => ({ x: i + 0.5, z: j + 0.5 });

const burrow = new World([
  {
    id: 'burrow',
    name: 'Burrow',
    build(t) {
      t.rect(0, 12, 19, 18, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
      for (let n = 0; n < 7; n++) {
        t.rect(20 + n, 12, 20 + n, 18, (i, j) => {
          t.set(i, j, FLOOR + 0.75 * n, Kind.Grass);
          t.setTangle(i, j, PHYSICS.holeGap);
        });
      }
      t.rect(27, 12, 36, 18, (i, j) => t.set(i, j, FLOOR + 4.5, Kind.Grass));
      return { spawn: at(2) };
    },
  } as Island,
]);

const top = at(30);

describe('Snake route: the stepped burrow', () => {
  it('walks up all six rises to the top', () => {
    const p = new Pilot(burrow, 'snake', at(5));
    expect(p.walk(top, { seconds: 20 }), p.describe()).toBe(true);
    expect(p.fell).toBe(false);
    expect(p.y).toBeGreaterThan(FLOOR + 4.4);
  });

  it('leaves an Ant at the first rise', () => {
    const p = new Pilot(burrow, 'ant', at(5));
    p.walk(top, { seconds: 15 });
    expect(p.x).toBeGreaterThan(20.3);
    expect(p.x).toBeLessThan(21);
    expect(p.y).toBeLessThan(FLOOR + 0.1);
  });

  it('keeps a Human out', () => {
    for (const form of ['human', 'wolf'] as FormId[]) {
      const p = new Pilot(burrow, form, at(5));
      p.walk(top, { seconds: 10 });
      expect(p.x, form).toBeLessThan(20);
    }
  });
});
