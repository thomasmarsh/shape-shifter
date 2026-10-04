import { KELP_DEEP } from '../forms';
import { EnemySpot, HintZone, Island, IslandLayout, Kind, PuzzleSpot, Terrain, TreeSpot } from '../layout';
import { buildCoilstoneEast, HUB, LANDING, slab } from './coilstone-east';

// Coilstone: a ruined stone city on a cloud, split by the Rift. This file builds
// the west half (x 960..1030): the Landing, the Ramp, the North Court, the hub
// and three candles (the Sunken Court, the Colonnade, the Tooth). The east half
// (x >= 1031) is built by `buildCoilstoneEast` in coilstone-east.ts and merged
// at the end.

export { HUB, LANDING } from './coilstone-east';

/** The Ramp climbs this much a tile, from the Landing up to the hub. */
const RAMP_RISE = 0.3;
/** The Ramp's height at column i (x 968..987): 6.3 at its foot, 12 at its top. */
export const rampTop = (i: number): number => Math.round((LANDING + RAMP_RISE * (i - 967)) * 100) / 100;

function ramp(t: Terrain): void {
  t.rect(968, 2, 987, 8, (i, j) => t.set(i, j, rampTop(i), Kind.Slate));
}

/** The Sunken Court's water: its level is 0.3 under the hub, its bed 7.1 under the level (deep kelp). */
export const COURT_LEVEL = 11.7;
export const COURT_BED = 4.6;
/** The Sunken Court's terrace (the Bunny's +4) and the Colonnade's rock and pillar. */
export const TERRACE = 16;
/** The wall of the guards' cell: above the reach of every form (a hop then fly from the terrace tops 20.93). */
export const PARAPET = 21.5;
export const COL_ROCK = 19;
export const COL_PILLAR = 22;

/** Every tile of the box except the inner box: a band of the given thickness. */
function band(i0: number, j0: number, i1: number, j1: number, w: number, f: (i: number, j: number) => void): void {
  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) if (i < i0 + w || i > i1 - w || j < j0 + w || j > j1 - w) f(i, j);
  }
}

/** C1: the Sunken Court, a lake x 1008..1026, z 42..60 with a kelp ring and an islet. */
function sunkenCourt(t: Terrain): void {
  t.rect(1008, 42, 1026, 60, (i, j) => {
    t.set(i, j, COURT_BED, Kind.Basalt);
    t.setWater(i, j, true, COURT_LEVEL);
  });
  band(1009, 43, 1025, 59, 2, (i, j) => t.setKelp(i, j, KELP_DEEP)); // the ring, 2 thick
  t.rect(1013, 47, 1021, 55, (i, j) => t.setWater(i, j, false));
  slab(t, 1013, 47, 1021, 55, HUB, Kind.Slate); // the islet
  slab(t, 1018, 47, 1021, 50, TERRACE, Kind.Lichen); // the terrace with the candle
  // The guards' cell, at the islet's north-west corner: a floor x 1014, z 47..48 inside a closed wall ring
  // x 1013..1015, z 46..49, one tile thick (its north row stands on the inner water's edge).
  // It stands 9.5 over the islet, above a hop then fly from the terrace (20.93): no one stands on it or flies in,
  // and a water shot stops at it. Only the bubble column, which ignores walls, reaches the guards.
  band(1013, 46, 1015, 49, 1, (i, j) => {
    t.setWater(i, j, false);
    t.set(i, j, PARAPET, Kind.Basalt);
  });
}

/** C2: the Colonnade, a great-tree road north to a rock and across to a pillar. */
function colonnade(t: Terrain): void {
  slab(t, 1012, 31, 1012, 31, HUB + 1, Kind.Basalt); // T2's pillar
  slab(t, 1010, 25, 1014, 29, COL_ROCK, Kind.Lichen); // the rock: T2's top (18) + 1
  slab(t, 1011, 14, 1013, 16, COL_PILLAR, Kind.Basalt); // the pillar: rock + 3 across 8 tiles
}

/** C3: the Tooth and its pier. The pier runs west: 16 sheets, 8 of sky, the Tooth. */
function tooth(t: Terrain): void {
  slab(t, 963, 41, 971, 49, HUB, Kind.Basalt);
  t.rect(980, 44, 995, 46, (i, j) => t.setThinIce(i, j, HUB));
  band(965, 43, 969, 47, 1, (i, j) => t.setTangle(i, j)); // a ring of tangle around 3 by 3
}

export const coilstone: Island = {
  id: 'coilstone',
  name: 'Coilstone',
  build(t) {
    // ---- Shared ground: the Landing, the Ramp, the North Court, the hub ---------
    slab(t, 960, 0, 967, 9, LANDING, Kind.Slate);
    ramp(t);
    slab(t, 988, 0, 1030, 13, HUB, Kind.Slate);
    slab(t, 996, 14, 1030, 62, HUB, Kind.Slate);

    slab(t, 1000, 24, 1004, 28, HUB, Kind.Lichen);
    slab(t, 1020, 20, 1026, 23, HUB, Kind.Lichen);
    slab(t, 1000, 34, 1003, 38, HUB, Kind.Basalt);
    sunkenCourt(t);
    colonnade(t);
    tooth(t);

    const checkpoints = [
      { id: 'coilstone', x: 963.5, z: 4.5 },
      { id: 'cs-hub', x: 1000.5, z: 18.5 },
      { id: 'cs-court', x: 1005.5, z: 50.5 },
      { id: 'cs-rim', x: 1022.5, z: 10.5 },
    ];
    const puzzles: PuzzleSpot[] = [
      { id: 'cs-court', speaker: { x: 1021.5, z: 51.5 }, candle: { x: 1020.5, z: 48.5 }, melody: [0, 3, 6, 1, 4, 7] },
      { id: 'cs-colonnade', speaker: { x: 1012.5, z: 27.5 }, candle: { x: 1012.5, z: 14.5 }, melody: [1, 4, 0, 5, 2, 6] },
      { id: 'cs-tooth', speaker: { x: 970.5, z: 48.5 }, candle: { x: 967.5, z: 45.5 }, melody: [2, 5, 1, 7, 3, 0] },
    ];
    const enemies: EnemySpot[] = [
      { x: 1014.5, z: 47.5, tester: false }, // the Sunken Court's guards, inside the walled cell
      { x: 1014.5, z: 48.5, tester: false },
      { x: 1008.5, z: 36.5, tester: false }, // the Colonnade's, at the foot of T1
      { x: 1015.5, z: 36.5, tester: false },
    ];
    const bread: NonNullable<IslandLayout['bread']> = [
      { id: 'cs-tooth', x: 968.5, z: 46.5, amount: 10 },
      { id: 'cs-court', x: 1003.5, z: 56.5, amount: 5 },
      { id: 'cs-colonnade', x: 1012.5, z: 20.5, amount: 5 },
    ];
    const trees: TreeSpot[] = [
      { x: 1012.5, z: 34.5, kind: 'greatBanyan' }, // T1
      { x: 1012.5, z: 31.5, kind: 'greatBanyan' }, // T2, on its pillar
    ];
    const hints: HintZone[] = [
      { id: 'cs-ramp', x: 976, z: 5, r: 4, text: 'Old stone, climbing. The city sits above the cloud.' },
      { id: 'cs-colonnade', x: 1012, z: 38, r: 3, text: 'Two great trees in a line. Climb the first and leap.' },
      { id: 'cs-court', x: 1005.5, z: 47, r: 4, text: 'Kelp seals the water, and guards stand behind a wall. Bubbles rise where walls do not stop them.' },
      { id: 'cs-pier', x: 1000, z: 45, r: 3, text: 'The slabs are thin. Run and do not stop, then fly.' },
    ];

    const arrivals = [
      {
        id: 'coilstone',
        x: 963.5,
        z: 4,
        radius: 3.5,
        eyebrow: 'Island eight',
        title: 'Coilstone',
        html: '<p>Old dark stone, split down the middle.</p><p class="soft">Somebody built this, long ago, and something small still lives in the cracks.</p>',
      },
    ];

    // ---- The east half --------------------------------------------------------
    const east = buildCoilstoneEast(t);
    return {
      checkpoints: [...checkpoints, ...(east.checkpoints ?? [])],
      puzzles: [...puzzles, ...(east.puzzles ?? [])],
      enemies: [...enemies, ...(east.enemies ?? [])],
      bread: [...bread, ...(east.bread ?? [])],
      trees: [...trees, ...(east.trees ?? [])],
      hints: [...hints, ...(east.hints ?? [])],
      arrivals: [...arrivals, ...(east.arrivals ?? [])],
      plates: [...(east.plates ?? [])],
    };
  },
};
