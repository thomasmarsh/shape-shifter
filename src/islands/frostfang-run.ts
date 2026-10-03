import { EnemySpot, IslandLayout, Kind, Terrain, TreeSpot } from '../layout';

// Island 4, east half: the frozen lake, the Winter Wolf's exit run and the way
// on to Underroot. Everything here is at x >= 243; the hub and the five candles
// are the west half (frostfang.ts, x <= 242, hub height 15), and frostfang.ts
// calls `buildRun` to add this half to its own ground and things.
//
// The run is the Wolf's showcase, and every other form does its one job once:
//   1. The Frozen Falls (Wolf): thin ice over a lake, climbing 0.25 a tile to
//      the Glacier, +6 over the hub: out of reach of every other form.
//   2. The ice step (Bunny): the upper glacier is +4 over the Glacier.
//   3. The pine (Orangutan): the Brow is +6 over the upper glacier, and the one
//      great pine's top (+5) is the only way up. Human: the guards.
//   4. Run, then fly (Wolf, then Fairy): a ramp of thin ice over sky ends 3
//      below Last Rock and 8 tiles short of it. Only a fairy that shifts at the
//      end of the ice, at full height, gets across.
//   5. The last run (Wolf): thin ice again, with a 3-tile leap, down to Underroot.
// No boulders, and no trees except the one great pine.

/** Height of the west half's hub and of this half's shore. */
const HUB = 15;
/** Lake bed and the water's surface. */
const BED = 12.5;
const LEVEL = 14.7;
/** The Falls climb this much per tile. */
const RISE = 0.25;
/**
 * The lane's rows. The brief had it 4 wide (z 30..33), but a swimmer who falls
 * in under an interior row is walled in by ice higher than a jump out of the
 * water (13.9 + 1.2), forever. Two wide, every row of the lane has a flat
 * sheet (15) beside it, which a swimmer can jump onto and run off along.
 */
const LANE_Z0 = 31;
const LANE_Z1 = 32;

const GLACIER = 21;
const UPPER = 25;
const BROW = 31;
const LAST_ROCK = 36;

/** Top of the Falls' ice at tile column i (flat to x = 249, then climbing). */
export const fallsTop = (i: number): number => HUB + RISE * Math.max(0, i - 249);
/** Top of the pier's ice at column i: climbing to x = 291, then flat. */
export const pierTop = (i: number): number => BROW + RISE * (Math.min(i, 291) - 283);
/** Top of the last run's ice at row j: flat to z = 29, then descending to z = 45. */
export const runTop = (j: number): number => LAST_ROCK - RISE * Math.max(0, j - 29);

/** A flat block of ground, bounds inclusive. */
function slab(t: Terrain, i0: number, j0: number, i1: number, j1: number, h: number, kind: Kind): void {
  t.rect(i0, j0, i1, j1, (i, j) => t.set(i, j, h, kind));
}

/** Shape the east half of Frostfang and return what stands on it. */
export function buildRun(t: Terrain): IslandLayout {
  // ---- The shore and the frozen lake -------------------------------------
  slab(t, 243, 24, 245, 39, HUB, Kind.Snow);
  slab(t, 246, 25, 273, 25, HUB, Kind.Snow); // north rim
  slab(t, 246, 38, 273, 38, HUB, Kind.Snow); // south rim
  t.rect(246, 26, 273, 37, (i, j) => {
    t.set(i, j, BED, Kind.Sand);
    t.setWater(i, j, true, LEVEL);
    // The Falls: the lane, 2 wide, climbs. The rest of the sheet is flat.
    t.setThinIce(i, j, j >= LANE_Z0 && j <= LANE_Z1 ? fallsTop(i) : HUB);
  });

  // ---- Leg 1: the Glacier ------------------------------------------------
  slab(t, 274, 25, 281, 38, GLACIER, Kind.Ice);

  // ---- Leg 2: the ice step -----------------------------------------------
  slab(t, 274, 16, 283, 24, UPPER, Kind.Ice);

  // ---- Leg 3: the pine and the Brow --------------------------------------
  slab(t, 275, 8, 283, 15, BROW, Kind.Snow);

  // ---- Leg 4: the pier, the sky and Last Rock ----------------------------
  t.rect(284, 10, 293, 12, (i, j) => t.setThinIce(i, j, pierTop(i)));
  slab(t, 302, 8, 306, 14, LAST_ROCK, Kind.Stone);

  // ---- Leg 5: the last run -----------------------------------------------
  t.rect(303, 15, 305, 45, (i, j) => {
    if (j >= 23 && j <= 25) return; // the leap: empty sky
    t.setThinIce(i, j, runTop(j));
  });

  // ---- Things ------------------------------------------------------------
  const trees: TreeSpot[] = [{ x: 278.5, z: 17.5, kind: 'greatPine' }];

  const checkpoints = [
    { id: 'ff-lake', x: 244.5, z: 28.5 },
    { id: 'ff-glacier', x: 278.5, z: 35.5 },
    { id: 'ff-brow', x: 276.5, z: 9.5 },
    { id: 'ff-last', x: 305.5, z: 9.5 },
  ];

  const enemies: EnemySpot[] = [
    { x: 276.5, z: 21.5, tester: false },
    { x: 282.5, z: 23.5, tester: false, kind: 'archer', minLevel: 3 },
  ];

  const bread = [
    { id: 'ff-lake', x: 258.5, z: 25.5, amount: 5 },
    { id: 'ff-glacier', x: 277.5, z: 28.5, amount: 5 },
    { id: 'ff-brow', x: 280.5, z: 13.5, amount: 5 },
    { id: 'ff-last', x: 303.5, z: 12.5, amount: 5 },
  ];

  const hints = [
    {
      id: 'ff-lake-locked',
      x: 244,
      z: 31,
      r: 4,
      maxLevel: 3,
      text: 'Thin ice. It cracks under everything you can become. Yet.',
    },
    {
      id: 'ff-lake',
      x: 244,
      z: 31,
      r: 4,
      minLevel: 4,
      text: 'Run across as a Wolf and do not stop. If you fall in, swim back and try again.',
    },
    {
      id: 'ff-pier',
      x: 281,
      z: 11,
      r: 3,
      minLevel: 4,
      text: 'The ice ends in the sky. Run to the end and become something that flies, without stopping.',
    },
    { id: 'ff-last', x: 304.5, z: 11, r: 3, text: 'One more run. Jump the gap and keep running.' },
  ];

  return { checkpoints, enemies, bread, trees, hints };
}
