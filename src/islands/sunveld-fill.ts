import { IslandLayout, Kind, Terrain } from '../layout';
import { dell, holt, pond, thicket } from './fill';

// What stands between Sunveld's rooms: pans of water, dry wallows, clumps of
// thorn and more bad guys. Nothing here is higher than the valley floor, so no
// candle's reach changes. Kept clear: the south of the valley (z 55..59, the
// Cheetah's run from the plate to the gate), the run-up to the Crust Stair,
// ten tiles round the Kraal and the Red Table, and a lane down x 816..819.

/** The valley floor, as BASE in sunveld.ts (which imports this file). */
const BASE = 16;

export function fillSunveld(t: Terrain): IslandLayout {
  // ---- West and south of the Oxbow ----------------------------------------------------------
  pond(t, 704, 22, 711, 27, BASE, Kind.Sand); // the Pan
  pond(t, 722, 44, 729, 49, BASE, Kind.Sand); // the Wallow
  dell(t, 702, 34, 708, 39, BASE, Kind.Clay);
  thicket(t, 713, 30, 714, 32, BASE);
  thicket(t, 716, 44, 717, 46, BASE);
  thicket(t, 738, 46, 739, 48, BASE);
  dell(t, 756, 44, 762, 49, BASE, Kind.Clay);
  const lair = holt(t, 744, 43, BASE, Kind.Sand, Kind.Clay); // the Lair: a stone only the Axolotl reaches

  // ---- The Plain, between the Oxbow and the Grove ---------------------------------
  pond(t, 770, 14, 777, 19, BASE, Kind.Sand); // the North Pan
  pond(t, 800, 42, 808, 47, BASE, Kind.Sand); // the Long Pan
  pond(t, 806, 14, 813, 19, BASE, Kind.Sand);
  dell(t, 782, 16, 788, 21, BASE, Kind.Clay);
  dell(t, 786, 44, 792, 49, BASE, Kind.Clay);
  dell(t, 808, 26, 814, 31, BASE, Kind.Clay);
  thicket(t, 768, 40, 769, 42, BASE);
  thicket(t, 797, 50, 798, 52, BASE);

  // ---- East, north of the pier ----------------------------------------------------
  pond(t, 840, 14, 848, 19, BASE, Kind.Sand); // the Grove Pan
  dell(t, 852, 20, 858, 25, BASE, Kind.Clay);
  thicket(t, 822, 24, 823, 26, BASE);
  thicket(t, 851, 36, 852, 38, BASE);

  return {
    enemies: [
      { x: 712.5, z: 20.5, tester: false }, // by the Pan
      { x: 714.5, z: 24.5, tester: false },
      { x: 731.5, z: 42.5, tester: false },
      { x: 726.5, z: 52.5, tester: false, kind: 'blade', minLevel: 7 },
      { x: 770.5, z: 22.5, tester: false }, // south of the North Pan
      { x: 775.5, z: 21.5, tester: false },
      { x: 795.5, z: 44.5, tester: false },
      { x: 804.5, z: 50.5, tester: false, kind: 'blade', minLevel: 7 }, // two blades south of the Long Pan
      { x: 806.5, z: 52.5, tester: false, kind: 'blade', minLevel: 7 },
      { x: 812.5, z: 40.5, tester: false },
      { x: 845.5, z: 22.5, tester: false }, // by the Grove Pan
      { x: 842.5, z: 24.5, tester: false, kind: 'blade', minLevel: 7 }, // east of Grove Rock's shadow: at x 838.5 the rock hid it
      { x: 850.5, z: 16.5, tester: false, kind: 'archer' },
    ],
    bread: [
      { id: 'sv-f-pan', x: 708.5, z: 29.5, amount: 3 },
      { id: 'sv-f-plain', x: 804.5, z: 40.5, amount: 3 },
      { id: 'sv-f-north', x: 844.5, z: 12.5, amount: 2 },
      { id: 'sv-f-lair', x: lair.i + 0.5, z: lair.j + 0.5, amount: 10 },
    ],
    hints: [
      { id: 'sv-f-pan', x: 712.5, z: 27.5, r: 4, text: 'Pans of water, dry wallows and clumps of thorn in the grass. No bad guy wades: the water is a safe place.' },
      { id: 'sv-f-plain', x: 798.5, z: 46.5, r: 4, minLevel: 7, text: 'Two quick ones with thin blades keep the Plain. They outrun everything but the fastest runner.' },
      { id: 'sv-f-lair', x: 742.5, z: 47.5, r: 3, text: 'A pan with a stone roof all round its middle, and bread on the stone inside. Nothing you are yet fits under it. Come back when you are smaller.' },
    ],
  };
}
