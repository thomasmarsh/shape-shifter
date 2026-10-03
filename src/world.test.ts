import { describe, expect, it } from 'vitest';
import { NOTES } from './audio';
import { Island, Kind, NO_STAND, TREE_BLOCK, World } from './world';

const tiny = (extra: Partial<ReturnType<Island['build']>> = {}, id = 'tiny'): Island => ({
  id,
  name: 'Tiny',
  build(t) {
    t.rect(2, 2, 6, 6, (i, j) => t.set(i, j, 3, Kind.Grass));
    return { spawn: { x: 3.5, z: 3.5 }, ...extra };
  },
});

describe('the default world', () => {
  const world = new World();
  const { layout } = world;

  it('is 220 by 64 tiles with the meadow where it always was', () => {
    expect(world.width).toBe(220);
    expect(world.depth).toBe(64);
    expect(layout.spawn).toEqual({ x: 10.5, z: 27.5 });
    expect(world.groundAt(10.5, 27.5)).toBe(2);
  });

  it('gives every melody distinct notes that exist', () => {
    for (const p of layout.puzzles) {
      expect(new Set(p.melody).size, p.id).toBe(p.melody.length);
      for (const n of p.melody) expect(NOTES[n], `${p.id} note ${n}`).toBeDefined();
    }
  });

  it('makes trees solid to the height of their kind', () => {
    expect(layout.trees.length).toBeGreaterThan(0);
    for (const t of layout.trees) {
      expect(world.treeAt(t.x, t.z)).toBe(TREE_BLOCK[t.kind]);
      expect(world.solidAt(t.x, t.z)).toBe(world.groundAt(t.x, t.z) + TREE_BLOCK[t.kind]);
    }
    expect(world.treeAt(10.5, 27.5)).toBe(0);
  });

  it('has a tanglewood arrival to cross to', () => {
    expect(layout.arrivals.map((a) => a.id)).toContain('tanglewood');
  });
});

describe('building from islands', () => {
  it('merges what every island places', () => {
    const w = new World([
      tiny({ checkpoints: [{ id: 'a', x: 4.5, z: 4.5 }] }),
      { id: 'b', name: 'B', build: () => ({ checkpoints: [{ id: 'b', x: 1, z: 1 }], hints: [] }) },
    ]);
    expect(w.layout.checkpoints.map((c) => c.id)).toEqual(['a', 'b']);
    expect(w.layout.puzzles).toEqual([]);
  });

  it('makes boulders solid', () => {
    const w = new World([tiny({ boulders: [{ x: 5.5, z: 5.5 }] })]);
    expect(w.solidAt(5.5, 5.5)).toBeCloseTo(3.9);
  });

  it('lets nothing stand on a speaker, candle or checkpoint', () => {
    const w = new World([
      tiny({
        checkpoints: [{ id: 'a', x: 4.5, z: 4.5 }],
        puzzles: [{ id: 'p', speaker: { x: 3.5, z: 5.5 }, candle: { x: 5.5, z: 3.5 }, melody: [0] }],
      }),
    ]);
    for (const s of [{ x: 4.5, z: 4.5 }, { x: 3.5, z: 5.5 }, { x: 5.5, z: 3.5 }]) {
      expect(w.solidAt(s.x, s.z), `${s.x},${s.z}`).toBeGreaterThanOrEqual(NO_STAND);
      expect(w.groundAt(s.x, s.z)).toBe(3);
    }
    // The ground next to them is untouched.
    expect(w.solidAt(4.5, 5.5)).toBe(3);
  });

  it('refuses a world with no spawn point', () => {
    expect(() => new World([{ id: 'x', name: 'X', build: () => ({}) }])).toThrow(/spawn/);
  });

  it('refuses two things with the same id', () => {
    const cp = { checkpoints: [{ id: 'same', x: 4.5, z: 4.5 }] };
    expect(() => new World([tiny(cp, 'one'), tiny(cp, 'two')])).toThrow(/same/);
  });
});
