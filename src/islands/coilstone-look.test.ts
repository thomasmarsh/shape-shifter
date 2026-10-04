import { describe, expect, it } from 'vitest';
import { Kind } from '../layout';
import { World } from '../world';

const world = new World();

const OLD = [Kind.Grass, Kind.Sand, Kind.Stone, Kind.Dirt, Kind.Snow, Kind.Ice, Kind.Moss, Kind.Bark, Kind.Salt, Kind.Straw, Kind.Clay];
const OWN = [Kind.Slate, Kind.Basalt, Kind.Lichen];

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

describe('Coilstone look', () => {
  const mine = kindsIn(960, world.width);

  it('uses no earlier island look on any tile', () => {
    for (const k of OLD) expect(mine.has(k), `kind ${k}`).toBe(false);
  });

  it('uses all three of its own kinds, with the lichen accent kept sparse', () => {
    for (const k of OWN) expect(mine.get(k) ?? 0, `kind ${k}`).toBeGreaterThan(0);
    const total = [...mine.entries()].filter(([k]) => k !== Kind.Cloud).reduce((a, [, n]) => a + n, 0);
    expect((mine.get(Kind.Lichen) ?? 0) / total).toBeLessThan(0.2);
  });

  it('lends none of its kinds to an earlier island', () => {
    const before = kindsIn(0, 960);
    for (const k of OWN) expect(before.has(k), `kind ${k}`).toBe(false);
  });

  it('has only great banyans for trees', () => {
    const trees = world.layout.trees.filter((t) => t.x >= 960);
    expect(trees).toHaveLength(3);
    for (const t of trees) expect(t.kind).toBe('greatBanyan');
  });
});
