import { KELP_DEEP, KELP_LOW } from '../forms';
import { EnemySpot, HintZone, IslandLayout, Kind, PuzzleSpot, Terrain, TreeSpot } from '../layout';

// Island 6, east half: everything of Saltmere at x >= 584. The west half
// (saltmere.ts) calls `buildEast` and merges what it returns.
//
//   E0 the Mere: a lagoon of shallow water (level 0.3 under the beach) that
//      everyone can swim.
//   E1 Palm Key (Human, Orangutan, Fairy): a box of the Mere walled by a closed
//      ring of low kelp. Only a Human gets in, by swimming under. Inside is a
//      islet, a road of great palms to the Lookout (a fight), and a flight to
//      Pickle Rock, whose pickle lies in a deep pool only a diver can use.
//   E2 the Deep Road and Pearl Rock (Mermaid): 36 tiles of water over open sky,
//      roofed with deep kelp. Only a body that dives below the mat travels it.
// Everything raised is a launch pad. No boulders and no trees but three great
// palms.

/** The hub's height: the height of the west half's beach. */
export const HUB = 38;
/** The water level of the whole Mere: a floater's jump gets out onto the hub. */
export const LEVEL = 37.7;
export const SHALLOW = 35.7;
/** Under a low mat and for 2 tiles beside it: deep enough for a Human under it. */
export const MAT_BED = 32.7;
/** The Deep and the road. */
export const DEEP_BED = 30.6; // 7.1 deep: heights are float32, so 30.7 would fall just short of 7

/** The ring's box (inclusive). */
export const RING = { i0: 589, j0: 27, i1: 619, j1: 52 };
/** The road (inclusive): 3 wide, 36 long. */
export const ROAD = { i0: 623, j0: 54, i1: 658, j1: 56 };
export const COVE = { i0: 659, j0: 54, i1: 662, j1: 56 };
export const PEARL = { i0: 659, j0: 50, i1: 671, j1: 60 };

/** Chebyshev distance of a tile to the ring's mats (0 on the ring). */
function ringDistance(i: number, j: number): number {
  const { i0, j0, i1, j1 } = RING;
  const inside = i >= i0 && i <= i1 && j >= j0 && j <= j1;
  if (inside) return Math.min(i - i0, i1 - i, j - j0, j1 - j);
  return Math.max(i0 - i, 0, i - i1, j0 - j, 0, j - j1);
}

function slab(t: Terrain, i0: number, j0: number, i1: number, j1: number, h: number, kind: Kind): void {
  t.rect(i0, j0, i1, j1, (i, j) => {
    t.setWater(i, j, false);
    t.set(i, j, h, kind);
  });
}

/** Shape the east half of Saltmere (x >= 584) and return what stands on it. */
export function buildEast(t: Terrain): IslandLayout {
  // ---- E0: the Mere ---------------------------------------------------------
  const deep = (i: number, j: number) => i >= 614 && i <= 622 && j >= 53 && j <= 57;
  const lake = (i: number, j: number, bed: number) => {
    t.set(i, j, bed, Kind.Sand);
    t.setWater(i, j, true, LEVEL);
  };
  const bedAt = (i: number, j: number) => (deep(i, j) ? DEEP_BED : ringDistance(i, j) <= 2 ? MAT_BED : SHALLOW);
  const wet = (i0: number, j0: number, i1: number, j1: number) =>
    t.rect(i0, j0, i1, j1, (i, j) => lake(i, j, bedAt(i, j)));
  wet(RING.i0, RING.j0, RING.i1, RING.j1);
  wet(584, 40, 588, 58);
  wet(584, 53, 622, 58);

  // ---- E1: Palm Key ---------------------------------------------------------
  for (let i = RING.i0; i <= RING.i1; i++) {
    for (const j of [RING.j0, RING.j1]) t.setKelp(i, j, KELP_LOW);
  }
  for (let j = RING.j0; j <= RING.j1; j++) {
    for (const i of [RING.i0, RING.i1]) t.setKelp(i, j, KELP_LOW);
  }
  slab(t, 593, 43, 599, 48, HUB, Kind.Sand); // the islet
  slab(t, 597, 40, 597, 40, HUB + 1, Kind.Stone); // T2's pillar
  slab(t, 599, 38, 599, 38, HUB + 2, Kind.Stone); // T3's pillar, its top is 45
  slab(t, 595, 31, 602, 36, 46, Kind.Stone); // the Lookout: last treetop + 1
  // Pickle Rock: Lookout + 3 across exactly 8 tiles of water, a rim round a pool.
  slab(t, 611, 31, 615, 35, 49, Kind.Stone);
  t.rect(612, 32, 614, 34, (i, j) => {
    t.set(i, j, 44.7, Kind.Stone);
    t.setWater(i, j, true, 48.7);
  });

  // ---- E2: the Deep Road and Pearl Rock -------------------------------------
  for (let i = ROAD.i0; i <= ROAD.i1; i++) {
    for (let j = ROAD.j0; j <= ROAD.j1; j++) {
      lake(i, j, DEEP_BED);
      t.setKelp(i, j, KELP_DEEP);
    }
  }
  slab(t, PEARL.i0, PEARL.j0, PEARL.i1, PEARL.j1, HUB, Kind.Sand);
  slab(t, 670, 50, 671, 60, HUB, Kind.Stone);
  t.rect(COVE.i0, COVE.j0, COVE.i1, COVE.j1, (i, j) => lake(i, j, DEEP_BED));

  // ---- Things ---------------------------------------------------------------
  const trees: TreeSpot[] = [
    { x: 597.5, z: 43.5, kind: 'greatPalm' }, // T1, on the islet
    { x: 597.5, z: 40.5, kind: 'greatPalm' }, // T2
    { x: 599.5, z: 38.5, kind: 'greatPalm' }, // T3
  ];

  const puzzles: PuzzleSpot[] = [
    { id: 'sm-key', speaker: { x: 596.5, z: 32.5 }, candle: { x: 613.5, z: 33.5 }, melody: [3, 6, 1, 4, 7, 2] },
  ];

  const checkpoints = [
    { id: 'sm-key', x: 594.5, z: 46.5 },
    { id: 'sm-pearl', x: 667.5, z: 56.5 },
  ];

  const enemies: EnemySpot[] = [
    { x: 600.5, z: 33.5, tester: false },
    { x: 601.5, z: 31.5, tester: false, kind: 'archer', minLevel: 3 },
  ];

  const bread = [
    { id: 'sm-key', x: 598.5, z: 47.5, amount: 5 },
    { id: 'sm-lookout', x: 598.5, z: 35.5, amount: 5 },
    { id: 'sm-pearl', x: 668.5, z: 52.5, amount: 10 },
  ];

  const hints: HintZone[] = [
    {
      id: 'sm-mere',
      x: 585.5,
      z: 50,
      r: 3.5,
      text: 'A mat of kelp floats on the water. Nothing gets over it. A Human can swim under it: just swim in.',
    },
    { id: 'sm-key', x: 596, z: 45.5, r: 3, text: 'A road of great palms over the water.' },
    { id: 'sm-lookout', x: 601, z: 34, r: 3, text: 'Too far to jump. Not too far to fly.' },
    { id: 'sm-pickle-rock', x: 613.5, z: 35.5, r: 2.5, text: 'The pool is deep. Be a Human and dive.' },
    {
      id: 'sm-deep-locked',
      x: 616.5,
      z: 55.5,
      r: 4,
      maxLevel: 5,
      text: 'Dark water, and kelp hanging deep. Too deep for anything you can become. Yet.',
    },
    {
      id: 'sm-deep',
      x: 616.5,
      z: 55.5,
      r: 4,
      minLevel: 6,
      text: 'Become the Mermaid and swim under the deep kelp. Keep to the middle: the sky is on both sides.',
    },
  ];

  const arrivals = [
    {
      id: 'sm-pearl',
      x: 666.5,
      z: 55.5,
      radius: 3,
      eyebrow: 'To be continued',
      title: 'Pearl Rock',
      html: '<p>Six islands crossed, seven shapes learned.</p><p class="soft">The way on from here is still being built.</p>',
    },
  ];

  return { trees, puzzles, checkpoints, enemies, bread, hints, arrivals };
}
