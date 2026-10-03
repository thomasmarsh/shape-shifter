import { Kind, Spot, Terrain, TreeKind, TreeSpot } from '../layout';

// Sprinkles trees over an island's grass. The same hash always gives the same
// trees, so the island looks the same every time.

export interface ScatterOptions {
  kind: TreeKind;
  /** Chance that a grass tile gets a tree, from 0 to 1. */
  density: number;
  /** Tiles to look at, bounds inclusive. Keep it to one island's box. */
  area: { i0: number; j0: number; i1: number; j1: number };
  /** Circles to leave clear: spawn, checkpoints, anything the player must reach. */
  keepClear: readonly (Spot & { r: number })[];
  /** Trees already on this island; new ones keep their distance from these. */
  existing?: readonly Spot[];
  /** Grass higher than this stays bare. */
  maxHeight?: number;
  /** Change this so two islands do not get the same pattern. */
  seed?: number;
}

const SPACING = 1.5; // trees closer than this would merge into one clump

export function scatterTrees(t: Terrain, o: ScatterOptions): TreeSpot[] {
  const placed: Spot[] = [...(o.existing ?? [])];
  const out: TreeSpot[] = [];
  const maxHeight = o.maxHeight ?? 4;
  const seed = o.seed ?? 3;
  for (let j = o.area.j0; j <= o.area.j1; j++) {
    for (let i = o.area.i0; i <= o.area.i1; i++) {
      if (t.kindAt(i, j) !== Kind.Grass || t.get(i, j) > maxHeight) continue;
      if (t.hash(i, j, seed) > o.density) continue;
      const x = i + 0.5;
      const z = j + 0.5;
      if (o.keepClear.some((c) => Math.hypot(c.x - x, c.z - z) < c.r)) continue;
      if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < SPACING)) continue;
      // Keep trees off the very edge so nothing hangs over the sky.
      if (t.get(i - 1, j) < 0 || t.get(i + 1, j) < 0) continue;
      if (t.get(i, j - 1) < 0 || t.get(i, j + 1) < 0) continue;
      const spot = { x, z };
      placed.push(spot);
      out.push({ ...spot, kind: o.kind });
    }
  }
  return out;
}
