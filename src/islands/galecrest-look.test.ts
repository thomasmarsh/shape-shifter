import { describe, expect, it } from 'vitest';
import { Kind } from '../layout';
import { World } from '../world';

const world = new World();

const OWN = [Kind.Heather, Kind.Scree, Kind.Quartz];

/** Every ground kind found on the tiles of x0..x1, with how many tiles of each. */
function kindsIn(x0: number, x1: number): Map<Kind, number> {
  const found = new Map<Kind, number>();
  for (let i = x0; i < x1; i++) {
    for (let j = 0; j < world.depth; j++) {
      const k = world.kindAt(i + 0.5, j + 0.5);
      if (k !== Kind.Void) found.set(k, (found.get(k) ?? 0) + 1);
    }
  }
  return found;
}

describe('Galecrest look', () => {
  const mine = kindsIn(1347, 1590);

  it('uses only its own three kinds on any tile (and cloud)', () => {
    for (const k of mine.keys()) expect([...OWN, Kind.Cloud], `kind ${k}`).toContain(k);
  });

  it('uses all three of its own kinds', () => {
    for (const k of OWN) expect(mine.get(k) ?? 0, `kind ${k}`).toBeGreaterThan(0);
  });

  it('lends none of its kinds to an earlier island', () => {
    const before = kindsIn(0, 1347);
    for (const k of OWN) expect(before.has(k), `kind ${k}`).toBe(false);
  });

  it('has only great trees', () => {
    const trees = world.layout.trees.filter((t) => t.x >= 1347 && t.x < 1590);
    expect(trees.length).toBeGreaterThan(0);
    for (const t of trees) expect(t.kind).toBe('greatPine');
  });
});
