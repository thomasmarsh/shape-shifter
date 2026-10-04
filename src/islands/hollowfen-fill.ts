import { IslandLayout, Kind, Terrain } from '../layout';
import { dell, holt, pond, thicket } from './fill';
import { HUB } from './hollowfen-east';

// What stands between Hollowfen's rooms: fen pools, peat cuts, reed beds and
// more herons. Nothing here is higher than the fen, so no candle's reach
// changes. Kept clear: the Bridge's run-up and run-off (z 3..7), ten tiles
// round the Reed Ring, the way to the east bank, and two long lanes for a
// runner: z 38..41 across the west fen and x 1300..1304 down the east one.

export function fillHollowfen(t: Terrain): IslandLayout {
  // ---- The west fen ---------------------------------------------------------------
  pond(t, 1200, 6, 1205, 10, HUB, Kind.Peat); // the Heron Pool, north-west
  pond(t, 1222, 20, 1229, 25, HUB, Kind.Peat); // the Eye
  dell(t, 1228, 32, 1234, 37, HUB, Kind.Peat); // a peat cut by the Gap
  dell(t, 1197, 57, 1205, 61, HUB, Kind.Peat); // and one south of the Reed Pool
  thicket(t, 1218, 16, 1219, 18, HUB);
  thicket(t, 1231, 14, 1233, 15, HUB);
  thicket(t, 1196, 12, 1197, 14, HUB);

  // ---- The east fen ---------------------------------------------------------------
  pond(t, 1284, 10, 1294, 15, HUB, Kind.Peat); // the Long Mere
  pond(t, 1283, 54, 1290, 59, HUB, Kind.Peat); // the South Pool
  dell(t, 1286, 22, 1293, 28, HUB, Kind.Peat);
  dell(t, 1319, 40, 1326, 46, HUB, Kind.Peat);
  thicket(t, 1280, 20, 1281, 23, HUB);
  thicket(t, 1296, 26, 1297, 28, HUB);
  thicket(t, 1320, 54, 1322, 55, HUB);
  const otter = holt(t, 1276, 41, HUB, Kind.Peat, Kind.Chalk); // the Holt: a stone only the Axolotl reaches

  return {
    enemies: [
      { x: 1203.5, z: 13.5, tester: false }, // by the Heron Pool
      { x: 1205.5, z: 3.5, tester: false },
      { x: 1226.5, z: 29.5, tester: false, kind: 'blade', minLevel: 7 }, // the camp between the Eye and the cut
      { x: 1231.5, z: 28.5, tester: false },
      { x: 1232.5, z: 30.5, tester: false },
      { x: 1233.5, z: 18.5, tester: false, kind: 'archer' }, // behind its reed bed
      { x: 1283.5, z: 17.5, tester: false, kind: 'blade', minLevel: 7 }, // two blades on the Long Mere's south bank
      { x: 1285.5, z: 19.5, tester: false, kind: 'blade', minLevel: 7 },
      { x: 1296.5, z: 5.5, tester: false, kind: 'archer' },
      { x: 1294.5, z: 57.5, tester: false }, // by the South Pool
      { x: 1322.5, z: 50.5, tester: false }, // east of the Mound
      { x: 1324.5, z: 52.5, tester: false },
    ],
    bread: [
      { id: 'hf-f-eye', x: 1225.5, z: 27.5, amount: 3 },
      { id: 'hf-f-mere', x: 1289.5, z: 8.5, amount: 3 },
      { id: 'hf-f-cut', x: 1322.5, z: 48.5, amount: 2 },
      { id: 'hf-f-holt', x: otter.i + 0.5, z: otter.j + 0.5, amount: 10 },
    ],
    hints: [
      { id: 'hf-f-eye', x: 1220.5, z: 28.5, r: 4, text: 'Fen pools and reed beds. The quick herons with thin blades outrun everything but the fastest runner, and no heron wades.' },
      { id: 'hf-e-mere', x: 1280.5, z: 14.5, r: 4, text: 'Two quick herons keep the far bank of the Long Mere. The water is a safe place; the open sedge is not.' },
      { id: 'hf-e-holt', x: 1274.5, z: 45.5, r: 3, text: 'A pool with a stone roof all round its middle, and bread on the stone inside. Something small that dives slips under.' },
    ],
  };
}
