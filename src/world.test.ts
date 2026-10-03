import { describe, expect, it } from 'vitest';
import { NOTES } from './audio';
import { ICE_REGROW } from './forms';
import { Island, Kind, NO_STAND, TANGLE_GAP, TREE_BLOCK, World } from './world';

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

  it('is 510 by 64 tiles with the meadow where it always was', () => {
    expect(world.width).toBe(510);
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

// A small island with a strip of thin ice at height 3.5 beside it: tile 10
// over sky, tile 11 over a water tile (a pond bed at height 1).
const iceyIsland: Island = {
  id: 'icey',
  name: 'Icey',
  build(t) {
    t.rect(2, 2, 6, 6, (i, j) => t.set(i, j, 3, Kind.Grass));
    t.set(11, 4, 1, Kind.Sand);
    t.setWater(11, 4, true);
    t.setThinIce(10, 4, 3.5);
    t.setThinIce(11, 4, 3.5);
    return { spawn: { x: 3.5, z: 3.5 } };
  },
};

describe('thin ice', () => {
  const sky = { x: 10.5, z: 4.5 };
  const pond = { x: 11.5, z: 4.5 };

  it('is solid ground at its height while whole, over sky and over water', () => {
    const w = new World([iceyIsland]);
    for (const s of [sky, pond]) {
      expect(w.solidAt(s.x, s.z)).toBe(3.5);
      expect(w.groundAt(s.x, s.z)).toBe(3.5);
      expect(w.solidUnder(s.x, s.z, 0.3)).toBe(3.5);
      expect(w.isVoid(s.x, s.z)).toBe(false);
      expect(w.isWater(s.x, s.z)).toBe(false);
      expect(w.isThinIce(s.x, s.z)).toBe(true);
    }
  });

  it('leaves the tile underneath unchanged, so broken ice is sky or water again', () => {
    const w = new World([iceyIsland]);
    w.breakIce([sky, pond]);
    expect(w.solidAt(sky.x, sky.z)).toBe(-Infinity);
    expect(w.isVoid(sky.x, sky.z)).toBe(true);
    expect(w.isWater(pond.x, pond.z)).toBe(true);
    expect(w.groundAt(pond.x, pond.z)).toBe(1);
    // Still thin ice, just not whole.
    expect(w.isThinIce(sky.x, sky.z)).toBe(true);
    expect(w.isIceIntact(sky.x, sky.z)).toBe(false);
  });

  it('counts for the island bounds, and a plain tile is not thin ice', () => {
    const w = new World([iceyIsland]);
    expect(w.bounds[0].i1).toBe(11);
    expect(w.isThinIce(3.5, 3.5)).toBe(false);
  });

  it('grows back ICE_REGROW seconds after breaking, but not under the player', () => {
    const w = new World([iceyIsland]);
    w.breakIce([sky]);
    const away = { x: 30, z: 30 };
    w.stepIce(ICE_REGROW - 0.1, away.x, away.z, 0.3);
    expect(w.isIceIntact(sky.x, sky.z)).toBe(false);
    // Someone is in the column, even only just: it waits.
    w.stepIce(0.2, sky.x + 0.65, sky.z, 0.3);
    expect(w.isIceIntact(sky.x, sky.z)).toBe(false);
    w.stepIce(0.01, sky.x + 0.8, sky.z, 0.3);
    expect(w.isIceIntact(sky.x, sky.z)).toBe(true);
    expect(w.solidAt(sky.x, sky.z)).toBe(3.5);
  });

  it('comes back all at once on resetIce', () => {
    const w = new World([iceyIsland]);
    w.breakIce([sky, pond]);
    w.resetIce();
    expect(w.isIceIntact(sky.x, sky.z)).toBe(true);
    expect(w.isIceIntact(pond.x, pond.z)).toBe(true);
  });

  it('names its whole tiles under a footprint, but not ones far below the feet', () => {
    const w = new World([iceyIsland]);
    // Standing on the seam of the two tiles.
    expect(w.iceHolding(11, 4.5, 0.3, 3.5)).toHaveLength(2);
    expect(w.iceHolding(11, 4.5, 0.3, 6)).toHaveLength(0);
    w.breakIce([sky]);
    expect(w.iceHolding(11, 4.5, 0.3, 3.5)).toEqual([pond]);
  });
});

describe('root tangles', () => {
  const world = new World([
    {
      id: 'tangly',
      name: 'Tangly',
      build(t) {
        t.rect(2, 2, 8, 6, (i, j) => t.set(i, j, 3, Kind.Moss));
        t.setTangle(5, 4);
        t.setTangle(6, 4, 0.5);
        t.setTangle(7, 4);
        t.clear(7, 4);
        t.set(7, 4, 3, Kind.Bark);
        return { spawn: { x: 3.5, z: 3.5 } };
      },
    },
  ]);

  it('is a wall to anything taller than the gap and plain ground to the rest', () => {
    expect(world.isTangle(5.5, 4.5)).toBe(true);
    expect(world.tangleGapAt(5.5, 4.5)).toBe(TANGLE_GAP);
    expect(world.tangleGapAt(6.5, 4.5)).toBe(0.5);
    expect(world.solidAt(5.5, 4.5)).toBeGreaterThanOrEqual(NO_STAND);
    expect(world.solidAt(5.5, 4.5, 0.3)).toBeGreaterThanOrEqual(NO_STAND);
    expect(world.solidAt(5.5, 4.5, 0.2)).toBe(3);
    expect(world.solidUnder(5.5, 4.5, 0.3, 0.2)).toBe(3);
    expect(world.solidUnder(5.5, 3.9, 0.3)).toBeGreaterThanOrEqual(NO_STAND);
    expect(world.groundAt(5.5, 4.5)).toBe(3);
    // A gap of 0.5 lets a taller body in too, up to its own height.
    expect(world.solidAt(6.5, 4.5, 0.4)).toBe(3);
    expect(world.solidAt(6.5, 4.5, 0.6)).toBeGreaterThanOrEqual(NO_STAND);
  });

  it('is removed by clear, and Moss and Bark are ordinary ground', () => {
    expect(world.isTangle(7.5, 4.5)).toBe(false);
    expect(world.solidAt(7.5, 4.5)).toBe(3);
    expect(world.solidAt(3.5, 3.5)).toBe(3);
  });
});
