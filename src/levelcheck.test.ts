import { describe, expect, it } from 'vitest';
import { Island, Kind, World } from './world';
import { explore } from './levelcheck';

const world = new World();
const { layout } = world;

// The meadow's own things; later islands have their own tests.
const MEADOW_PUZZLES = ['grove', 'hilltop', 'islet'];
const MEADOW_CHECKPOINTS = ['meadow', 'middle', 'bluff'];
const MEADOW_BREAD = ['meadow', 'north', 'south'];

describe('the real world', () => {
  it('lets a human on easy reach everything on the meadow island', () => {
    const r = explore(world, layout.spawn, ['human'], 'easy');
    for (const p of layout.puzzles.filter((k) => MEADOW_PUZZLES.includes(k.id))) {
      expect(r.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(r.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
    for (const id of MEADOW_CHECKPOINTS) {
      const c = layout.checkpoints.find((k) => k.id === id)!;
      // Respawn happens one tile to the south-west of the pedestal.
      expect(r.canStand({ x: c.x - 1, z: c.z + 1 }), `checkpoint ${id}`).toBe(true);
    }
    for (const b of layout.bread.filter((k) => MEADOW_BREAD.includes(k.id))) {
      expect(r.canStand(b), `bread ${b.id}`).toBe(true);
    }
  });

  it('keeps a human, even at the limit, off the resting cloud and the next island', () => {
    const r = explore(world, layout.spawn, ['human'], 'max');
    expect(r.canStand({ x: 52.5, z: 22.5 })).toBe(false);
    const arrival = layout.arrivals.find((a) => a.id === 'tanglewood')!;
    expect(r.canStand(arrival)).toBe(false);
  });

  it('lets a human who can turn into a fairy cross the gap', () => {
    const r = explore(world, layout.spawn, ['human', 'fairy'], 'easy');
    expect(r.canStand({ x: 52.5, z: 22.5 })).toBe(true);
    const arrival = layout.arrivals.find((a) => a.id === 'tanglewood')!;
    expect(r.canStand(arrival)).toBe(true);
  });
});

// A flat island at height 2 with one regular tree and one great tree.
const treeIsland: Island = {
  id: 'trees',
  name: 'Trees',
  build(t) {
    t.rect(0, 0, 20, 30, (i, j) => t.set(i, j, 2, Kind.Grass));
    return {
      spawn: { x: 2.5, z: 15.5 },
      trees: [
        { x: 3.5, z: 5.5, kind: 'regular' },
        { x: 3.5, z: 25.5, kind: 'great' },
      ],
    };
  },
};

// A flat island cut in two by a wall, one tile thick, of the given height.
function wallIsland(height: number): Island {
  return {
    id: 'wall',
    name: 'Wall',
    build(t) {
      t.rect(0, 0, 20, 30, (i, j) => t.set(i, j, 2, Kind.Grass));
      t.rect(10, 0, 10, 30, (i, j) => t.set(i, j, 2 + height, Kind.Stone));
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

const trees = new World([treeIsland]);
const treeStart = trees.layout.spawn;
const otherSide = { x: 14.5, z: 15.5 };

function crosses(height: number, form: 'human' | 'bunny'): boolean {
  const w = new World([wallIsland(height)]);
  return explore(w, w.layout.spawn, [form], 'max').canStand(otherSide);
}

describe('forms on a test island', () => {
  it('keeps a fairy off the top of both kinds of tree', () => {
    const r = explore(trees, treeStart, ['fairy'], 'max');
    expect(r.canStand({ x: 3.5, z: 5.5 })).toBe(false);
    expect(r.canStand({ x: 3.5, z: 25.5 })).toBe(false);
  });

  it('lets an orangutan climb both', () => {
    const r = explore(trees, treeStart, ['orangutan'], 'max');
    expect(r.canStand({ x: 3.5, z: 5.5 })).toBe(true);
    expect(r.canStand({ x: 3.5, z: 25.5 })).toBe(true);
  });

  it('keeps a human off both trees, and a bunny off the great one', () => {
    const human = explore(trees, treeStart, ['human'], 'max');
    expect(human.canStand({ x: 3.5, z: 5.5 })).toBe(false);
    expect(human.canStand({ x: 3.5, z: 25.5 })).toBe(false);
    const bunny = explore(trees, treeStart, ['bunny'], 'max');
    expect(bunny.canStand({ x: 3.5, z: 25.5 })).toBe(false);
  });

  it('lets a bunny clear a wall 4 high but not 5', () => {
    expect(crosses(4, 'bunny')).toBe(true);
    expect(crosses(5, 'bunny')).toBe(false);
  });

  it('lets a human clear a wall 1 high but not 2', () => {
    expect(crosses(1, 'human')).toBe(true);
    expect(crosses(2, 'human')).toBe(false);
  });
});
