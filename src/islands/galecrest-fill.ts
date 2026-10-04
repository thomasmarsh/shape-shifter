import { IslandLayout, Kind, Terrain } from '../layout';
import { dell, holt, pond, thicket } from './fill';
import { HUB } from './galecrest-east';

// What stands between Galecrest's rooms: small tarns, scree hollows, gorse
// and more guards than anywhere before. Nothing here is higher than the heath,
// so no candle's reach changes. Kept clear: the Bridge's run-up and run-off
// (z 3..7), ten tiles round the Gorse Ring, the heath's east edge by `gc-edge`,
// and two long lanes for a runner: z 38..40 across the west heath and
// x 1507..1511 down the east one.

export function fillGalecrest(t: Terrain): IslandLayout {
  // ---- The west heath -------------------------------------------------------------
  pond(t, 1403, 2, 1407, 6, HUB, Kind.Scree); // a tarn in the north-west corner
  pond(t, 1431, 26, 1438, 32, HUB, Kind.Scree); // the Mirror
  dell(t, 1432, 14, 1439, 19, HUB, Kind.Scree);
  dell(t, 1404, 57, 1412, 61, HUB, Kind.Scree);
  thicket(t, 1403, 9, 1405, 10, HUB);
  thicket(t, 1425, 16, 1427, 17, HUB);
  thicket(t, 1438, 42, 1439, 44, HUB);
  const west = holt(t, 1408, 15, HUB, Kind.Scree, Kind.Quartz); // the Kettle: a stone only the Axolotl reaches

  // ---- The east heath -------------------------------------------------------------
  pond(t, 1490, 20, 1499, 26, HUB, Kind.Scree); // the Wind Tarn
  pond(t, 1512, 6, 1519, 11, HUB, Kind.Scree); // the North Tarn
  pond(t, 1489, 55, 1495, 59, HUB, Kind.Scree); // the South Tarn
  dell(t, 1486, 9, 1492, 14, HUB, Kind.Scree);
  dell(t, 1514, 16, 1522, 21, HUB, Kind.Scree);
  thicket(t, 1502, 12, 1503, 15, HUB);
  thicket(t, 1524, 8, 1525, 10, HUB);
  thicket(t, 1526, 56, 1527, 58, HUB);
  const east = holt(t, 1485, 43, HUB, Kind.Scree, Kind.Quartz); // and the Cauldron, east of the Gap

  return {
    enemies: [
      { x: 1409.5, z: 12.5, tester: false }, // the north-west corner
      { x: 1411.5, z: 5.5, tester: false },
      { x: 1434.5, z: 36.5, tester: false, kind: 'blade', minLevel: 7 }, // two blades south of the Mirror
      { x: 1436.5, z: 34.5, tester: false, kind: 'blade', minLevel: 7 },
      { x: 1440.5, z: 22.5, tester: false, kind: 'archer' },
      { x: 1496.5, z: 14.5, tester: false, kind: 'blade', minLevel: 7 }, // the camp north of the Wind Tarn
      { x: 1498.5, z: 16.5, tester: false, kind: 'blade', minLevel: 7 },
      { x: 1497.5, z: 12.5, tester: false },
      { x: 1521.5, z: 13.5, tester: false, kind: 'archer' }, // between the North Tarn and its hollow
      { x: 1512.5, z: 14.5, tester: false },
      { x: 1510.5, z: 24.5, tester: false, kind: 'sword', minLevel: 7 },
      { x: 1500.5, z: 58.5, tester: false }, // by the South Tarn
      { x: 1498.5, z: 60.5, tester: false },
    ],
    bread: [
      { id: 'gc-f-mirror', x: 1429.5, z: 29.5, amount: 3 },
      { id: 'gc-f-wind', x: 1494.5, z: 28.5, amount: 3 },
      { id: 'gc-f-north', x: 1516.5, z: 4.5, amount: 2 },
      { id: 'gc-f-kettle', x: west.i + 0.5, z: west.j + 0.5, amount: 10 },
      { id: 'gc-f-cauldron', x: east.i + 0.5, z: east.j + 0.5, amount: 10 },
    ],
    hints: [
      { id: 'gc-f-mirror', x: 1426.5, z: 30.5, r: 4, text: 'Tarns, gorse and hollows in the scree. The guards with thin blades outrun everything but the fastest runner, and none of them wades.' },
      { id: 'gc-e-wind', x: 1487.5, z: 18.5, r: 4, text: 'A camp on the open heath. Run it only as the fastest, or go by the water.' },
      { id: 'gc-f-kettle', x: 1406.5, z: 19.5, r: 3, text: 'A tarn with a stone roof all round its middle, and bread on the stone inside. Something small that dives slips under.' },
      { id: 'gc-e-cauldron', x: 1483.5, z: 47.5, r: 3, text: 'Another roofed tarn. Under the roof nothing can follow, and nothing can see.' },
    ],
  };
}
