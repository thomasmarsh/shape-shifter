import type { FormId } from './forms';

// The shared vocabulary of the world: tile kinds, where things go, and the
// small API an island module uses to shape its ground. world.ts re-exports all
// of this. It lives here so island modules never have to import world.ts
// (which imports them).

export const enum Kind {
  Void = 0,
  Grass,
  Sand,
  Stone,
  Cloud,
  Dirt,
  /** Ordinary ground with a white top, for the cold islands. */
  Snow,
  /** Ordinary ground with a pale blue top. Not the thin kind: see `setThinIce`. */
  Ice,
  /** Ordinary ground with a deep green-teal top, for the roots. Behaves like Grass. */
  Moss,
  /** Ordinary ground with a warm brown top, for the roots. Behaves like Grass. */
  Bark,
  /** Ordinary ground with a white salt top. Behaves like Sand. */
  Salt,
  /** Ordinary ground with a dry golden top, for the savanna. Behaves like Grass. */
  Straw,
  /** Ordinary ground with a terracotta top, for the savanna. Behaves like Stone. */
  Clay,
  /** Ordinary ground with a cold blue-grey slate top, for the ruins. Behaves like Stone. */
  Slate,
  /** Ordinary ground with a dark basalt top, for the ruins. Behaves like Stone. */
  Basalt,
  /** Ordinary ground with a pale lichen top, for the ruins. Behaves like Stone. */
  Lichen,
}

/**
 * How big a gap a root tangle leaves, by default. A form fits when its height
 * (FormDef.height) is at most the gap: only the Ant (0.2) does.
 */
export const TANGLE_GAP = 0.25

export interface Spot {
  x: number;
  z: number;
}

/**
 * 'pine' and 'greatPine', 'palm' and 'greatPalm', 'acacia' and 'greatAcacia',
 * and 'greatBanyan'
 * climb and block exactly like 'regular' and 'great'.
 */
export type TreeKind =
  | 'regular'
  | 'great'
  | 'pine'
  | 'greatPine'
  | 'palm'
  | 'greatPalm'
  | 'acacia'
  | 'greatAcacia'
  | 'greatBanyan';

/**
 * How high a tree's solid block stands above the ground. A fairy can rise at
 * most about 3.65 above the ground she last stood on, so neither kind can be
 * landed on from flat ground: only the Orangutan gets up there.
 */
export const TREE_BLOCK: Record<TreeKind, number> = {
  regular: 4.0,
  great: 5.0,
  pine: 4.0,
  greatPine: 5.0,
  palm: 4.0,
  greatPalm: 5.0,
  acacia: 4.0,
  greatAcacia: 5.0,
  greatBanyan: 5.0,
};

export type TreeSpot = Spot & { kind: TreeKind };

export interface PuzzleSpot {
  id: string;
  speaker: Spot;
  candle: Spot;
  /** The melody, as indexes into NOTES. Every note in it must be different. */
  melody: number[];
}

export interface EnemySpot extends Spot {
  tester: boolean;
  kind?: 'regular' | 'archer' | 'sword' | 'blade';
  /** Only appears once the player has reached this level. */
  minLevel?: number;
}

/** A hint that shows while the player is near a place. */
export type HintZone = Spot & {
  id: string;
  /** How close you must be, in tiles. */
  r: number;
  text: string;
  minLevel?: number;
  maxLevel?: number;
  form?: FormId;
};

/** A place that is celebrated the first time you stand on it. */
export type Arrival = Spot & {
  id: string;
  radius: number;
  eyebrow: string;
  title: string;
  html: string;
};

/**
 * A pressure plate. Standing on it (in any form, on the ground) holds gate
 * `gate` open, and the gate stays open for `seconds` after you step off.
 */
export type PlateSpot = Spot & { gate: string; seconds: number };

export interface Layout {
  spawn: Spot;
  checkpoints: (Spot & { id: string })[];
  puzzles: PuzzleSpot[];
  enemies: EnemySpot[];
  bread: (Spot & { id: string; amount: number })[];
  trees: TreeSpot[];
  boulders: Spot[];
  hints: HintZone[];
  arrivals: Arrival[];
  plates: PlateSpot[];
}

/** What one island contributes to the Layout. World merges them in order. */
export type IslandLayout = Partial<Layout>;

/** What an island module is handed to shape its ground. */
export interface Terrain {
  set(i: number, j: number, h: number, kind: Kind): void;
  /** Top of the ground; -Infinity for sky. */
  get(i: number, j: number): number;
  kindAt(i: number, j: number): Kind;
  /** Back to empty sky. */
  clear(i: number, j: number): void;
  /** `level` is the height of the surface; it defaults to the world's usual 2.7. */
  setWater(i: number, j: number, wet: boolean, level?: number): void;
  /**
   * Lay a sheet of thin ice with its top at height `h` over whatever the tile
   * already is: empty sky or a water tile (the tile underneath is unchanged).
   * It holds only under a fast runner and breaks under anything else; see
   * ICE_SPEED in forms.ts. `h` may be fractional, so a row of tiles can climb
   * like stairs. `clear` removes it again.
   */
  setThinIce(i: number, j: number, h: number): void;
  /**
   * Like `setThinIce`, but a brittle sheet holds only under something moving
   * at BRITTLE_SPEED or more (see forms.ts). Only a fresh Cheetah has it.
   */
  setBrittle(i: number, j: number, h: number): void;
  /**
   * Mark a ground tile as part of the timed gate `id`. While no plate holds
   * the gate open it is a "no standing" column for every form, like a tangle
   * nobody fits through. It never closes on a body standing in it. `clear`
   * removes the mark.
   */
  setGate(i: number, j: number, id: string): void;
  /**
   * Mark an ordinary ground tile as a root tangle with a gap of `gap` (default
   * TANGLE_GAP). For any form taller than the gap it is a "no standing" column,
   * like a candle: nothing walks in, lands on it or flies over it. For a form
   * that fits (only the Ant today) it is plain ground. The tile keeps its one
   * height. `clear` removes the tangle again.
   */
  setTangle(i: number, j: number, gap?: number): void;
  /**
   * Lay a kelp mat on a water tile, hanging `depth` below the surface. A body
   * of height h that can dive d fits under it when d - h >= depth (see
   * KELP_LOW and KELP_DEEP in forms.ts). For anyone else the tile is a "no
   * standing" column, like a tangle. The tile must be water with at least
   * depth + 2 of water above its bed. `clear` removes the mat again.
   */
  setKelp(i: number, j: number, depth: number): void;
  /** Call `fn` for every tile in the box, bounds inclusive. */
  rect(i0: number, j0: number, i1: number, j1: number, fn: (i: number, j: number) => void): void;
  /** Call `fn` for every tile whose centre lies inside an ellipse. */
  ellipse(
    cx: number,
    cz: number,
    rx: number,
    rz: number,
    fn: (i: number, j: number, d: number) => void,
    wobble?: number,
  ): void;
  /** Deterministic noise in [0, 1) for a tile, so islands look the same every time. */
  hash(i: number, j: number, seed?: number): number;
}

export interface Island {
  /** Short key: 'meadow', 'tanglewood', ... */
  id: string;
  /** Shown to the player. */
  name: string;
  build(t: Terrain): IslandLayout;
}

/** Small deterministic hash so the islands look the same every time. */
export function hash(i: number, j: number, seed = 0): number {
  let n = (i * 374761393 + j * 668265263 + seed * 2147483647) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return ((n >>> 0) % 100000) / 100000;
}
