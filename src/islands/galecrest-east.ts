import { EnemySpot, HintZone, IslandLayout, Kind, PuzzleSpot, Spot, Terrain, TreeSpot } from '../layout';
import { slab } from './coilstone-east';

// The east half of Galecrest (x >= 1443): the Gap and the brittle Bridge over
// it, the east hub with the Stair and the Crag, and the way off, which takes
// wings: from the hub's east edge the sky is open for 43 tiles, down to Kestrel
// Rock. galecrest.ts calls `buildGalecrestEast` and merges the result.

/** The low court a hop-then-fly from Hollowfen's east rim comes down on. */
export const LANDING = 5;
/** All ordinary ground, on both sides of the Gap. */
export const HUB = 12;
/** The top of the Crag, 7.5 above the hub: out of every flyer's reach. */
export const CRAG = 19.5;
/** A burrow rises this much from one hole tile to the next: too much for the Ant and the Axolotl, not for the Snake. */
export const BURROW_RISE = 0.75;
/** Kestrel Rock, far out and far down: 11 under the hub, so only a glide carries that far. */
export const END_ROCK = 1;
/** The Table and the Spire: raised things in the open, launch pads. */
const TABLE = 18;
const SPIRE = 22;

export function buildGalecrestEast(t: Terrain): IslandLayout {
  // ---- Shared: the east hub ---------------------------------------------------
  // The Gap (x 1443..1472) stays open sky.
  slab(t, 1473, 0, 1530, 62, HUB, Kind.Heather);

  // ---- The Bridge (the Cheetah's run) ------------------------------------------
  // 30 tiles of brittle crust over the Gap with a gap of 4, as Coilstone's. x 1473..1489, z 3..7 stays clear.
  t.rect(1443, 4, 1472, 6, (i, j) => {
    if (i >= 1456 && i <= 1459) return;
    t.setBrittle(i, j, HUB);
  });

  // ---- The east hub, dressed with scree, keeping the run-off clear ----------------
  t.rect(1473, 0, 1530, 62, (i, j) => {
    if (t.hash(i, j) < 0.1) t.set(i, j, HUB, Kind.Scree);
  });

  // ---- C4: the Stair (a runner, then hop, then fly), going north --------------------
  for (let j = 54; j >= 31; j--) {
    t.rect(1476, j, 1478, j, (i) => t.setThinIce(i, j, HUB + 0.25 * (55 - j)));
  }
  slab(t, 1474, 24, 1480, 30, TABLE, Kind.Quartz); // the Table, with the speaker
  slab(t, 1476, 14, 1478, 16, SPIRE, Kind.Quartz); // the Spire, with the candle; gap z 17..23

  // ---- C5: the Crag (the Snake's burrow) ------------------------------------------
  slab(t, 1504, 36, 1523, 52, CRAG, Kind.Quartz);
  for (let i = 1501; i <= 1513; i++) {
    t.set(i, 44, i <= 1503 ? HUB : HUB + BURROW_RISE * (i - 1503), Kind.Quartz);
    t.setTangle(i, 44, 0.35);
  }

  // ---- The way off: Kestrel Rock, 43 tiles of sky east of the hub and 11 down ----------
  slab(t, 1574, 26, 1582, 34, END_ROCK, Kind.Quartz);

  const checkpoints: (Spot & { id: string })[] = [
    { id: 'gc-far', x: 1478.5, z: 10.5 },
    { id: 'gc-foot', x: 1491.5, z: 36.5 },
    { id: 'gc-edge', x: 1527.5, z: 29.5 },
    { id: 'gc-end', x: 1578.5, z: 30.5 },
  ];

  const puzzles: PuzzleSpot[] = [
    {
      id: 'gc-stair',
      speaker: { x: 1477.5, z: 27.5 },
      candle: { x: 1477.5, z: 14.5 },
      melody: [6, 3, 7, 1, 5, 0],
    },
    {
      id: 'gc-crag',
      speaker: { x: 1519.5, z: 40.5 },
      candle: { x: 1519.5, z: 49.5 },
      melody: [5, 0, 4, 3, 6, 7],
    },
  ];

  const enemies: EnemySpot[] = [
    // The foot of the Stair, off the run-up lane (x 1476..1478, z 55..62).
    { x: 1483.5, z: 57.5, tester: false },
    { x: 1483.5, z: 60.5, tester: false },
    // The Crag's foot: two heavy guards before the burrow's mouth.
    { x: 1498.5, z: 42.5, tester: false, kind: 'sword', minLevel: 7 },
    { x: 1498.5, z: 46.5, tester: false, kind: 'sword', minLevel: 7 },
  ];

  const bread: NonNullable<IslandLayout['bread']> = [
    { id: 'gc-e-bread-1', x: 1476.5, z: 8.5, amount: 1 },
    { id: 'gc-e-bread-2', x: 1481.5, z: 52.5, amount: 1 },
    { id: 'gc-e-bread-3', x: 1495.5, z: 40.5, amount: 1 },
    { id: 'gc-e-bread-4', x: 1580.5, z: 32.5, amount: 1 },
  ];

  const trees: TreeSpot[] = [];

  const hints: HintZone[] = [
    { id: 'gc-e-bridge', x: 1477.5, z: 8.5, r: 4, text: 'The pale quartz over the Gap holds only the fastest, and a gap breaks the run.' },
    { id: 'gc-e-stair', x: 1477.5, z: 58.5, r: 4, text: 'Thin flakes of quartz climb off the heath to a table. Run, and do not stop.' },
    { id: 'gc-e-foot', x: 1494.5, z: 44.5, r: 4, text: 'The kestrels look west. Something low could come up behind them.' },
    { id: 'gc-e-burrow', x: 1501.5, z: 44.5, r: 3, text: 'A burrow into the Crag. Only the low and the sure-footed go in.' },
    { id: 'gc-e-edge', x: 1527.5, z: 32.5, r: 4, text: 'The heath ends at the sky. A rock lies far out and far down, too far for a hop and a flight. Wings would glide it.' },
    { id: 'gc-e-end', x: 1578.5, z: 32.5, r: 3, text: 'The wind drops here. The way on is not built yet.' },
  ];

  return {
    trees,
    puzzles,
    checkpoints,
    enemies,
    bread,
    hints,
  };
}
