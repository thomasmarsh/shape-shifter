import { KELP_DEEP, SNAPPER_LEVEL } from '../forms';
import { EnemySpot, HintZone, Island, Kind, PuzzleSpot, Terrain } from '../layout';
import { buildSunveldEast } from './sunveld-east';
import { fillSunveld } from './sunveld-fill';
import { nibbleRow } from './underroot-east';

// Island 7: Sunveld. This file is the west half (everything at x < 820). The
// east half (x >= 820) is built by `buildSunveldEast` in sunveld-east.ts and
// merged at the end of `build` below.

/** All ordinary ground west of the Red Wall, the Yard and the low Kopje. Flat. */
export const BASE = 16;
/** The escarpment and the Red Wall. Nothing stands on it. */
export const WALL = 31;
/** The Red Table's top, the pillar north of it, Grove Rock and Pier Rock. */
export const MESA = 22;
export const PILLAR = 25;
export const GROVE = 23;
export const PIER_ROCK = 24;
/** A Bunny hop above BASE. */
export const TERRACE = BASE + 4;
/** Water lies 0.3 under its rim, so every form can jump out. */
export const LEVEL = BASE - 0.3;

/** A pool bed 4 under the water (a Human dives it), a deep bed 8 under (the Mermaid only), and under a deep mat. */
export const POOL_BED = LEVEL - 4;
export const DEEP_BED = LEVEL - 8;
export const MAT_BED = LEVEL - 7.1;
/** The Crust Stair climbs this much per tile, from x 766 to MESA at x 789. */
const RISE = 0.25;

/** Top of the Crust Stair's sheet at tile column i: 16.25 at x 766 up to 22 at x 789. */
export const crustTop = (i: number): number => BASE + RISE * (i - 765);

function slab(t: Terrain, i0: number, j0: number, i1: number, j1: number, h: number, kind: Kind): void {
  t.rect(i0, j0, i1, j1, (i, j) => {
    t.setWater(i, j, false);
    t.set(i, j, h, kind);
  });
}

function lake(t: Terrain, i0: number, j0: number, i1: number, j1: number, bed: number): void {
  t.rect(i0, j0, i1, j1, (i, j) => {
    t.set(i, j, bed, Kind.Sand);
    t.setWater(i, j, true, LEVEL);
  });
}

/** The border of the box, one tile thick and closed. */
function border(i0: number, j0: number, i1: number, j1: number, put: (i: number, j: number) => void): void {
  for (let i = i0; i <= i1; i++) {
    put(i, j0);
    put(i, j1);
  }
  for (let j = j0; j <= j1; j++) {
    put(i0, j);
    put(i1, j);
  }
}

export const sunveld: Island = {
  id: 'sunveld',
  name: 'Sunveld',
  build(t) {
    // ---- Shared ground: flat straw under the escarpment ------------------------
    slab(t, 700, 10, 819, 60, BASE, Kind.Straw);
    slab(t, 712, 0, 819, 9, WALL, Kind.Clay);
    // The south edge is ragged for the look; the landing and the Plain stay whole.
    nibbleRow(t, 60, 718, 819, (i) => i >= 770 && i <= 784, 71);

    // ---- W1: the Watering Hole ----------------------------------------------
    slab(t, 717, 25, 729, 37, BASE, Kind.Sand);
    lake(t, 720, 30, 726, 34, DEEP_BED);

    // ---- W2: the Oxbow --------------------------------------------------------
    lake(t, 734, 12, 762, 38, MAT_BED);
    border(737, 15, 759, 35, (i, j) => t.setKelp(i, j, KELP_DEEP));
    slab(t, 740, 22, 746, 28, BASE, Kind.Sand); // the islet
    slab(t, 742, 24, 744, 26, TERRACE, Kind.Clay);
    slab(t, 752, 25, 753, 26, 24, Kind.Clay); // the spire: terrace + 4 over 7 tiles of water

    // ---- W3: the Red Table ----------------------------------------------------
    t.rect(766, 28, 789, 30, (i, j) => t.setThinIce(i, j, crustTop(i)));
    slab(t, 790, 24, 801, 35, MESA, Kind.Clay);
    border(794, 26, 799, 31, (i, j) => t.setTangle(i, j));
    slab(t, 795, 14, 796, 15, PILLAR, Kind.Clay);

    // ---- Things -----------------------------------------------------------------
    const checkpoints = [
      { id: 'sunveld', x: 708.5, z: 52.5 },
      { id: 'sv-mid', x: 776.5, z: 52.5 },
      { id: 'sv-table', x: 792.5, z: 33.5 },
    ];

    const puzzles: PuzzleSpot[] = [
      { id: 'sv-hole', speaker: { x: 723.5, z: 27.5 }, candle: { x: 723.5, z: 32.5 }, melody: [0, 3, 5, 1, 6, 4] },
      { id: 'sv-table', speaker: { x: 796.5, z: 28.5 }, candle: { x: 795.5, z: 14.5 }, melody: [1, 4, 7, 2, 5, 3] },
      { id: 'sv-oxbow', speaker: { x: 743.5, z: 25.5 }, candle: { x: 752.5, z: 25.5 }, melody: [2, 6, 3, 7, 0, 4] },
    ];

    const guard = (x: number, z: number): EnemySpot => ({ x, z, tester: false });
    const enemies: EnemySpot[] = [
      guard(719.5, 26.5),
      guard(728.5, 26.5),
      { x: 721.5, z: 33.5, tester: false, kind: 'snapper', minLevel: SNAPPER_LEVEL }, // in the Watering Hole, by the pickle
    ];

    const bread = [
      { id: 'sv-landing', x: 710.5, z: 52.5, amount: 5 },
      { id: 'sv-mid', x: 778.5, z: 52.5, amount: 5 },
      { id: 'sv-table', x: 797.5, z: 29.5, amount: 10 },
    ];

    const hints: HintZone[] = [
      { id: 'sv-hole', x: 723.5, z: 32.5, r: 4.5, text: 'Too deep for a Human dive. Something swims lower.' },
      { id: 'sv-oxbow', x: 748.5, z: 38.5, r: 5, text: 'A mat of kelp across the whole oxbow. Only one shape swims under this.' },
      { id: 'sv-crust', x: 765.5, z: 29.5, r: 3.5, text: 'Thin crust: it holds only what runs and never stops.' },
      { id: 'sv-thorn', x: 796.5, z: 33.5, r: 3.5, text: 'Thorn, red and tight. Only an Ant gets through. Eat before you change shape.' },
      { id: 'sv-pillar', x: 795.5, z: 22.5, r: 3.5, text: 'The pillar is higher than the table and a long way off. Flight, then.' },
    ];

    const arrivals = [
      {
        id: 'sunveld',
        x: 708.5,
        z: 52,
        radius: 3.5,
        eyebrow: 'Island seven',
        title: 'Sunveld',
        html: '<p>Dry gold grass and red rock.</p><p class="soft">The valley is wide and the wall at its end is red.</p>',
      },
    ];

    // ---- The east half --------------------------------------------------------
    const east = buildSunveldEast(t);
    const fill = fillSunveld(t);
    return {
      checkpoints: [...checkpoints, ...(east.checkpoints ?? [])],
      puzzles: [...puzzles, ...(east.puzzles ?? [])],
      enemies: [...enemies, ...(east.enemies ?? []), ...(fill.enemies ?? [])],
      bread: [...bread, ...(east.bread ?? []), ...(fill.bread ?? [])],
      trees: [...(east.trees ?? [])],
      boulders: east.boulders ?? [],
      hints: [...hints, ...(east.hints ?? []), ...(fill.hints ?? [])],
      arrivals: [...arrivals, ...(east.arrivals ?? [])],
      plates: [...(east.plates ?? [])],
    };
  },
};
