import { IslandLayout, Kind, Terrain } from '../layout';
import { HUB } from './coilstone-east';
import { dell, holt, pond, thicket } from './fill';

// What stands between Coilstone's rooms: cisterns, sunk floors, heaps of
// fallen stone and more guards. Nothing here is higher than the city floor, so
// no candle's reach changes. Kept clear: the Bridge's run-up and run-off
// (z 3..7), the run to the pier, ten tiles round the Thicket, the Foot, and
// two long lanes for a runner: z 38..41 across the west city and x 1081..1083
// down the east one.

export function fillCoilstone(t: Terrain): IslandLayout {
  // ---- The west city --------------------------------------------------------------
  pond(t, 997, 8, 1003, 12, HUB, Kind.Basalt); // the Cistern, at the top of the ramp
  pond(t, 1020, 28, 1027, 34, HUB, Kind.Basalt); // the Font
  dell(t, 997, 29, 1003, 33, HUB, Kind.Basalt); // a sunk floor
  dell(t, 1022, 14, 1028, 18, HUB, Kind.Basalt);
  thicket(t, 1005, 20, 1006, 22, HUB);
  thicket(t, 1006, 30, 1007, 32, HUB);
  thicket(t, 1028, 24, 1029, 26, HUB);

  // ---- The east city --------------------------------------------------------------
  pond(t, 1074, 28, 1079, 34, HUB, Kind.Basalt); // the Basin
  dell(t, 1072, 14, 1078, 19, HUB, Kind.Basalt);
  dell(t, 1097, 54, 1102, 60, HUB, Kind.Basalt);
  thicket(t, 1080, 9, 1081, 11, HUB);
  thicket(t, 1096, 12, 1097, 14, HUB);
  thicket(t, 1076, 58, 1077, 60, HUB);
  const vault = holt(t, 1084, 3, HUB, Kind.Basalt, Kind.Lichen); // the Vault: a stone only the Axolotl reaches

  return {
    enemies: [
      { x: 1004.5, z: 10.5, tester: false }, // by the Cistern
      { x: 1006.5, z: 13.5, tester: false },
      { x: 1024.5, z: 36.5, tester: false, kind: 'blade', minLevel: 7 }, // the camp south of the Font
      { x: 1026.5, z: 26.5, tester: false },
      { x: 1028.5, z: 38.5, tester: false, kind: 'archer' },
      { x: 1088.5, z: 13.5, tester: false, kind: 'blade', minLevel: 7 }, // two blades on the Vault's south bank
      { x: 1090.5, z: 14.5, tester: false, kind: 'blade', minLevel: 7 },
      { x: 1095.5, z: 3.5, tester: false },
      { x: 1099.5, z: 5.5, tester: false, kind: 'archer' },
      { x: 1076.5, z: 22.5, tester: false }, // between the sunk floor and the Basin
      { x: 1079.5, z: 26.5, tester: false },
    ],
    bread: [
      { id: 'cs-f-font', x: 1018.5, z: 32.5, amount: 3 },
      { id: 'cs-f-basin', x: 1081.5, z: 31.5, amount: 2 },
      { id: 'cs-f-vault', x: vault.i + 0.5, z: vault.j + 0.5, amount: 10 },
    ],
    hints: [
      { id: 'cs-f-font', x: 1016.5, z: 31.5, r: 4, text: 'Cisterns, sunk floors and heaps of fallen stone. The guards with thin blades outrun everything but the fastest runner, and none of them wades.' },
      { id: 'cs-e-vault', x: 1082.5, z: 7.5, r: 3, text: 'A cistern with a stone roof all round its middle, and bread on the stone inside. Nothing you are yet fits under it: come back when you are smaller. Two quick blades keep its south bank.' },
    ],
  };
}
