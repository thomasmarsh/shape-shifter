import { EnemySpot, HintZone, IslandLayout, Kind, PuzzleSpot, Spot, Terrain, TreeSpot } from '../layout';
import { slab } from './coilstone-east';

// The east half of Hollowfen (x >= 1236): the Gap and the brittle Bridge over
// it, the east hub with the Stair and the Mound, and the Axolotl's way off: the
// Well, a lake ringed by hollows around the Last Stone. hollowfen.ts calls
// `buildHollowfenEast` and merges the result.

/** The low landing a hop-then-fly from the Serpent's Head comes down on. */
export const LANDING = 4;
/** All ordinary ground, on both sides of the Gap. */
export const HUB = 12;
/** The top of the Mound, 7.5 above the hub: out of every flyer's reach. */
export const MOUND = 19.5;
/** A burrow rises this much from one hole tile to the next: too much for the Ant and the Axolotl, not for the Snake. */
export const BURROW_RISE = 0.75;
/** The Well's water: its level is 0.3 under the hub, its bed 4 under the level. */
export const WELL_LEVEL = 11.7;
export const WELL_BED = 7.7;
/** The Table and the Spire: raised things in the open, launch pads. */
const TABLE = 18;
const SPIRE = 22;

export function buildHollowfenEast(t: Terrain): IslandLayout {
  // ---- Shared: the east hub ---------------------------------------------------
  // The Gap (x 1236..1265) stays open sky.
  slab(t, 1266, 0, 1329, 62, HUB, Kind.Sedge);

  // ---- The Bridge (the Cheetah's run) ------------------------------------------
  // 30 tiles of brittle crust over the Gap with a gap of 4, as Coilstone's. x 1266..1282, z 3..7 stays clear.
  t.rect(1236, 4, 1265, 6, (i, j) => {
    if (i >= 1249 && i <= 1252) return;
    t.setBrittle(i, j, HUB);
  });

  // ---- The east hub, dressed with peat, keeping the run-off clear ------------------
  t.rect(1266, 0, 1329, 62, (i, j) => {
    if (t.hash(i, j) < 0.1) t.set(i, j, HUB, Kind.Peat);
  });

  // ---- C4: the Stair (a runner, then hop, then fly), going north --------------------
  for (let j = 54; j >= 31; j--) {
    t.rect(1269, j, 1271, j, (i) => t.setThinIce(i, j, HUB + 0.25 * (55 - j)));
  }
  slab(t, 1267, 24, 1273, 30, TABLE, Kind.Chalk); // the Table, with the speaker
  slab(t, 1269, 14, 1271, 16, SPIRE, Kind.Chalk); // the Spire, with the candle; gap z 17..23

  // ---- C5: the Mound (the Snake's burrow) -----------------------------------------
  slab(t, 1297, 36, 1316, 52, MOUND, Kind.Chalk);
  for (let i = 1294; i <= 1306; i++) {
    t.set(i, 44, i <= 1296 ? HUB : HUB + BURROW_RISE * (i - 1296), Kind.Chalk);
    t.setTangle(i, 44, 0.35);
  }

  // ---- The Well: a lake ringed by hollows around the Last Stone -----------------------
  t.rect(1306, 8, 1324, 26, (i, j) => {
    t.set(i, j, WELL_BED, Kind.Chalk);
    t.setWater(i, j, true, WELL_LEVEL);
  });
  for (let j = 9; j <= 25; j++) {
    for (let i = 1307; i <= 1323; i++) {
      if (i < 1309 || i > 1321 || j < 11 || j > 23) t.setHollow(i, j);
    }
  }
  t.rect(1311, 13, 1319, 21, (i, j) => t.setWater(i, j, false));
  slab(t, 1311, 13, 1319, 21, HUB, Kind.Chalk); // the Last Stone

  const checkpoints: (Spot & { id: string })[] = [
    { id: 'hf-far', x: 1271.5, z: 10.5 },
    { id: 'hf-foot', x: 1284.5, z: 36.5 },
    { id: 'hf-well', x: 1300.5, z: 18.5 },
    { id: 'hf-end', x: 1315.5, z: 17.5 },
  ];

  const puzzles: PuzzleSpot[] = [
    {
      id: 'hf-stair',
      speaker: { x: 1270.5, z: 27.5 },
      candle: { x: 1270.5, z: 14.5 },
      melody: [7, 2, 5, 0, 3, 6],
    },
    {
      id: 'hf-mound',
      speaker: { x: 1312.5, z: 40.5 },
      candle: { x: 1312.5, z: 49.5 },
      melody: [6, 0, 3, 7, 1, 4],
    },
  ];

  const enemies: EnemySpot[] = [
    // The foot of the Stair, off the run-up lane (x 1269..1271, z 55..62).
    { x: 1276.5, z: 57.5, tester: false },
    { x: 1276.5, z: 60.5, tester: false },
    // The Mound's foot: two heavy guards before the burrow's mouth.
    { x: 1291.5, z: 42.5, tester: false, kind: 'sword', minLevel: 7 },
    { x: 1291.5, z: 46.5, tester: false, kind: 'sword', minLevel: 7 },
  ];

  const bread: NonNullable<IslandLayout['bread']> = [
    { id: 'hf-e-bread-1', x: 1269.5, z: 8.5, amount: 1 },
    { id: 'hf-e-bread-2', x: 1274.5, z: 52.5, amount: 1 },
    { id: 'hf-e-bread-3', x: 1288.5, z: 40.5, amount: 1 },
    { id: 'hf-e-bread-4', x: 1317.5, z: 19.5, amount: 1 },
  ];

  const trees: TreeSpot[] = [];

  const hints: HintZone[] = [
    { id: 'hf-e-bridge', x: 1270.5, z: 8.5, r: 4, text: 'The pale stone over the Gap holds only the fastest, and a gap breaks the run.' },
    { id: 'hf-e-stair', x: 1270.5, z: 58.5, r: 4, text: 'Thin sheets climb out of the fen to a table. Run, and do not stop.' },
    { id: 'hf-e-foot', x: 1287.5, z: 44.5, r: 4, text: 'The herons look west. Something low could come up behind them.' },
    { id: 'hf-e-burrow', x: 1294.5, z: 44.5, r: 3, text: 'A burrow into the Mound. Only the low and the sure-footed go in.' },
    { id: 'hf-e-well', x: 1302.5, z: 18.5, r: 4, text: 'A stone roof lies low over the bed of the well. Something small that dives slips under.' },
    { id: 'hf-e-end', x: 1315.5, z: 19.5, r: 3, text: 'The sedge ends here. The way on is not built yet.' },
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
