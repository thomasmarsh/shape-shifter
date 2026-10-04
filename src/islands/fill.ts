import { Kind, Terrain } from '../layout';

// Things that fill a flat hub without changing who reaches what. Anything
// raised is a launch pad for a hop, then a flight, so nothing here stands
// higher than the hub: a pond and a dell are dips, and a thicket is a tangle,
// which has no top. Each one may only be cut into plain hub ground, and throws
// if a tile is anything else, so a room is never overwritten by accident.

function plain(t: Terrain, i: number, j: number, hub: number, what: string): void {
  if (t.get(i, j) !== hub) throw new Error(`${what} at ${i}, ${j}: not plain hub ground`);
}

/** A pond: water 0.3 under the hub and 4 deep, as deep as a Human dives. Bad guys stay out of it. */
export function pond(t: Terrain, i0: number, j0: number, i1: number, j1: number, hub: number, bed: Kind): void {
  t.rect(i0, j0, i1, j1, (i, j) => plain(t, i, j, hub, 'pond'));
  t.rect(i0, j0, i1, j1, (i, j) => {
    t.set(i, j, hub - 4.3, bed);
    t.setWater(i, j, true, hub - 0.3);
  });
}

/** A dell: a dip two walking steps deep (0.3, then 0.6), at least 3 by 3. Everything walks through it. */
export function dell(t: Terrain, i0: number, j0: number, i1: number, j1: number, hub: number, kind: Kind): void {
  t.rect(i0, j0, i1, j1, (i, j) => plain(t, i, j, hub, 'dell'));
  t.rect(i0, j0, i1, j1, (i, j) => {
    const rim = i === i0 || i === i1 || j === j0 || j === j1;
    t.set(i, j, hub - (rim ? 0.3 : 0.6), kind);
  });
}

/** A thicket: a clump of tangle. A wall for bad guys and arrows, and for every form but the Ant. */
export function thicket(t: Terrain, i0: number, j0: number, i1: number, j1: number, hub: number): void {
  t.rect(i0, j0, i1, j1, (i, j) => {
    plain(t, i, j, hub, 'thicket');
    t.setTangle(i, j);
  });
}

/** A holt is this many tiles on a side. */
export const HOLT_SIZE = 9;

/**
 * A holt: a pond 9 by 9 with a ring of hollows 2 thick inside its outer row of water, and inside the ring
 * a moat one tile wide round a single stone at hub height. The ring has no top, so only the Axolotl gets
 * to the stone: it swims under the roof, comes up in the moat and jumps out. Returns the stone's tile.
 */
export function holt(t: Terrain, i0: number, j0: number, hub: number, bed: Kind, stone: Kind): { i: number; j: number } {
  const i1 = i0 + HOLT_SIZE - 1;
  const j1 = j0 + HOLT_SIZE - 1;
  pond(t, i0, j0, i1, j1, hub, bed);
  t.rect(i0 + 1, j0 + 1, i1 - 1, j1 - 1, (i, j) => {
    if (i < i0 + 3 || i > i1 - 3 || j < j0 + 3 || j > j1 - 3) t.setHollow(i, j);
  });
  const i = i0 + 4;
  const j = j0 + 4;
  t.setWater(i, j, false);
  t.set(i, j, hub, stone);
  return { i, j };
}
