import { SNAPPER_LEVEL } from '../forms';
import { EnemySpot, HintZone, Island, IslandLayout, Kind, PuzzleSpot, Spot, Terrain, TreeSpot } from '../layout';
import { slab } from './coilstone-east';
import { buildHollowfenEast, HUB, LANDING } from './hollowfen-east';
import { fillHollowfen } from './hollowfen-fill';

// Hollowfen, the ninth island (x 1160..1329): a fen of sedge, peat and still
// water, cut in two by the Gap. You land low and walk up a ramp. This file is
// the west half (x 1160..1235): the Landing, the Ramp, the hub and three
// candles (the Reed Pool, the Reed Ring, the Heron Road). The east half is in
// hollowfen-east.ts.

export { HUB, LANDING } from './hollowfen-east';

/** The Ramp climbs this much a tile, from the Landing up to the hub. */
const RAMP_RISE = 0.32;
/** The Ramp's height at column i (x 1170..1194): 4.32 at its foot, 12 at its top. */
export const rampTop = (i: number): number => Math.round((LANDING + RAMP_RISE * (i - 1169)) * 100) / 100;

/** The Reed Pool's water: its level is 0.3 under the hub, its bed 8 under the level (only the Mermaid reaches it). */
export const POOL_LEVEL = 11.7;
export const POOL_BED = 3.7;
/** The Reed Ring's terrace (the Bunny's +4), the Heron Road's rock and pillar. */
export const TERRACE = 16;
export const ROAD_ROCK = 19;
export const ROAD_PILLAR = 22;

function ramp(t: Terrain): void {
  t.rect(1170, 27, 1194, 33, (i, j) => t.set(i, j, rampTop(i), Kind.Peat));
}

/** C1: the Reed Pool, x 1199..1207, z 42..50, a deep square of still water. */
function reedPool(t: Terrain): void {
  t.rect(1199, 42, 1207, 50, (i, j) => {
    t.set(i, j, POOL_BED, Kind.Peat);
    t.setWater(i, j, true, POOL_LEVEL);
  });
}

/** C2: the Reed Ring, a closed ring of root tangle on the border of x 1214..1228, z 47..61, round a Chalk terrace. */
function reedRing(t: Terrain): void {
  for (let j = 47; j <= 61; j++) {
    for (let i = 1214; i <= 1228; i++) if (i === 1214 || i === 1228 || j === 47 || j === 61) t.setTangle(i, j);
  }
  slab(t, 1223, 51, 1226, 54, TERRACE, Kind.Chalk);
}

/** C3: the Heron Road, a great-tree road north to a rock and across to a pillar. */
function heronRoad(t: Terrain): void {
  slab(t, 1212, 31, 1212, 31, HUB + 1, Kind.Chalk); // T2's pillar
  slab(t, 1210, 25, 1214, 29, ROAD_ROCK, Kind.Chalk); // the rock: T2's top (18) + 1
  slab(t, 1211, 14, 1213, 16, ROAD_PILLAR, Kind.Chalk); // the pillar: rock + 3 across 8 tiles
}

export const hollowfen: Island = {
  id: 'hollowfen',
  name: 'Hollowfen',
  build(t) {
    // ---- Shared ground: the Landing, the Ramp, the hub ---------------------------
    // The Landing is 6 tiles wider to the west than the brief (x 1154): from the Serpent's Head (east edge 1129) the nine on easy fall short of x 1160.
    slab(t, 1154, 25, 1169, 36, LANDING, Kind.Peat);
    ramp(t);
    slab(t, 1195, 0, 1235, 62, HUB, Kind.Sedge);

    reedPool(t);
    reedRing(t);
    heronRoad(t);

    const checkpoints: (Spot & { id: string })[] = [
      { id: 'hollowfen', x: 1164.5, z: 30.5 },
      { id: 'hf-hub', x: 1198.5, z: 22.5 },
      { id: 'hf-ring', x: 1210.5, z: 54.5 },
      { id: 'hf-rim', x: 1222.5, z: 10.5 },
    ];
    const puzzles: PuzzleSpot[] = [
      { id: 'hf-pool', speaker: { x: 1203.5, z: 52.5 }, candle: { x: 1206.5, z: 43.5 }, melody: [1, 5, 3, 6, 0, 7] },
      { id: 'hf-ring', speaker: { x: 1217.5, z: 54.5 }, candle: { x: 1224.5, z: 52.5 }, melody: [0, 7, 4, 1, 6, 3] },
      { id: 'hf-road', speaker: { x: 1212.5, z: 27.5 }, candle: { x: 1212.5, z: 14.5 }, melody: [2, 0, 5, 7, 3, 1] },
    ];
    const enemies: EnemySpot[] = [
      { x: 1199.5, z: 53.5, tester: false }, // the Reed Pool's guards, by the speaker
      { x: 1200.5, z: 54.5, tester: false },
      { x: 1201.5, z: 48.5, tester: false, kind: 'snapper', minLevel: SNAPPER_LEVEL }, // two Snappers in the Reed Pool
      { x: 1205.5, z: 46.5, tester: false, kind: 'snapper', minLevel: SNAPPER_LEVEL },
      { x: 1208.5, z: 36.5, tester: false }, // the Heron Road's, at the foot of T1
      { x: 1215.5, z: 36.5, tester: false },
    ];
    const bread: NonNullable<IslandLayout['bread']> = [
      { id: 'hf-pool', x: 1197.5, z: 49.5, amount: 5 },
      { id: 'hf-ring', x: 1216.5, z: 58.5, amount: 10 },
      { id: 'hf-road', x: 1212.5, z: 20.5, amount: 5 },
    ];
    const trees: TreeSpot[] = [
      { x: 1212.5, z: 34.5, kind: 'great' }, // T1
      { x: 1212.5, z: 31.5, kind: 'great' }, // T2, on its pillar
    ];
    const hints: HintZone[] = [
      { id: 'hf-ramp', x: 1182, z: 30, r: 4, text: 'Wet peat, climbing. The fen lies above the landing.' },
      { id: 'hf-pool', x: 1203.5, z: 46, r: 4, text: 'The pool goes down a long way. Heron guards keep the speaker. Something pink waits at the bottom.' },
      { id: 'hf-ring', x: 1210.5, z: 54, r: 3, text: 'A ring of reed roots, closed. Something small could slip through.' },
      { id: 'hf-road', x: 1212, z: 38, r: 3, text: 'Two great trees stand in a line, past the herons. Climb the first and leap.' },
    ];
    const arrivals: NonNullable<IslandLayout['arrivals']> = [
      {
        id: 'hollowfen',
        x: 1164.5,
        z: 30,
        radius: 3.5,
        eyebrow: 'Island nine',
        title: 'Hollowfen',
        html: '<p>Sedge, reeds and still water.</p><p class="soft">The pools here go down a long way, and something pink is looking up.</p>',
      },
    ];

    // ---- The east half --------------------------------------------------------
    const east = buildHollowfenEast(t);
    // ---- What stands between the rooms (after both halves are built) ----------
    const fill = fillHollowfen(t);
    return {
      checkpoints: [...checkpoints, ...(east.checkpoints ?? [])],
      puzzles: [...puzzles, ...(east.puzzles ?? [])],
      enemies: [...enemies, ...(east.enemies ?? []), ...(fill.enemies ?? [])],
      bread: [...bread, ...(east.bread ?? []), ...(fill.bread ?? [])],
      trees: [...trees, ...(east.trees ?? [])],
      hints: [...hints, ...(east.hints ?? []), ...(fill.hints ?? [])],
      arrivals: [...arrivals, ...(east.arrivals ?? [])],
    };
  },
};
