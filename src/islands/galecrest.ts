import { SNAPPER_LEVEL } from '../forms';
import { EnemySpot, HintZone, Island, IslandLayout, Kind, PuzzleSpot, Spot, Terrain, TreeSpot } from '../layout';
import { slab } from './coilstone-east';
import { buildGalecrestEast, HUB, LANDING } from './galecrest-east';

// Galecrest, the tenth island (x 1347..1582): a windy heath of heather, scree
// and quartz, cut in two by the Gap. You land low in the Court, west of the
// Windbreak, a wall across the whole island that only the Axolotl passes (under
// it, through the Sluice). This file is the west half (x 1347..1442): the
// Court, the Windbreak and the Sluice, the Yard, the Ramp, the hub and three
// candles (the Tarn, the Gorse Ring, the Pine Road). The east half is in
// galecrest-east.ts.

export { HUB, LANDING } from './galecrest-east';

/** The Windbreak's top: above a hop, then a flight, from the hub (12 + 4.93). */
export const WINDBREAK = 18;
/** The Sluice's water: its level is 0.3 under the Court, its bed 4 under the level. */
export const SLUICE_LEVEL = 4.7;
export const SLUICE_BED = 0.7;

/** The Ramp climbs this much a tile, from the Yard up to the hub. */
const RAMP_RISE = 0.28;
/** The Ramp's height at column i (x 1377..1401): 5.28 at its foot, 12 at its top. */
export const rampTop = (i: number): number => Math.round((LANDING + RAMP_RISE * (i - 1376)) * 100) / 100;

/** The Tarn's water: its level is 0.3 under the hub, its bed 8 under the level (too deep for the Human). */
export const TARN_LEVEL = 11.7;
export const TARN_BED = 3.7;
/** The Gorse Ring's terrace (the Bunny's +4), the Pine Road's rock and pillar. */
export const TERRACE = 16;
export const ROAD_ROCK = 19;
export const ROAD_PILLAR = 22;

/**
 * The arrival: the Court (x 1347..1360), the Windbreak (x 1361..1362, all of z)
 * and the Yard behind it (x 1363..1376). The Sluice is a channel of water on
 * z 29..31 from the Court to the Yard, roofed with hollows where it passes
 * under the wall, so the wall and the hollows make one closed line.
 */
function arrival(t: Terrain): void {
  slab(t, 1347, 24, 1360, 37, LANDING, Kind.Scree);
  slab(t, 1361, 0, 1362, 63, WINDBREAK, Kind.Quartz);
  slab(t, 1363, 24, 1376, 37, LANDING, Kind.Scree);
  t.rect(1357, 29, 1366, 31, (i, j) => {
    t.set(i, j, SLUICE_BED, Kind.Scree);
    t.setWater(i, j, true, SLUICE_LEVEL);
    if (i === 1361 || i === 1362) t.setHollow(i, j);
  });
}

function ramp(t: Terrain): void {
  t.rect(1377, 27, 1401, 33, (i, j) => t.set(i, j, rampTop(i), Kind.Scree));
}

/** C1: the Tarn, x 1406..1414, z 42..50, a deep square of cold water. */
function tarn(t: Terrain): void {
  t.rect(1406, 42, 1414, 50, (i, j) => {
    t.set(i, j, TARN_BED, Kind.Scree);
    t.setWater(i, j, true, TARN_LEVEL);
  });
}

/** C2: the Gorse Ring, a closed ring of tangle on the border of x 1421..1435, z 47..61, round a Quartz terrace. */
function gorseRing(t: Terrain): void {
  for (let j = 47; j <= 61; j++) {
    for (let i = 1421; i <= 1435; i++) if (i === 1421 || i === 1435 || j === 47 || j === 61) t.setTangle(i, j);
  }
  slab(t, 1430, 51, 1433, 54, TERRACE, Kind.Quartz);
}

/** C3: the Pine Road, a great-tree road north to a rock and across to a pillar. */
function pineRoad(t: Terrain): void {
  slab(t, 1419, 31, 1419, 31, HUB + 1, Kind.Quartz); // T2's pillar
  slab(t, 1417, 25, 1421, 29, ROAD_ROCK, Kind.Quartz); // the rock: T2's top (18) + 1
  slab(t, 1418, 14, 1420, 16, ROAD_PILLAR, Kind.Quartz); // the pillar: rock + 3 across 8 tiles
}

export const galecrest: Island = {
  id: 'galecrest',
  name: 'Galecrest',
  build(t) {
    // ---- Shared ground: the arrival, the Ramp, the hub -----------------------------
    arrival(t);
    ramp(t);
    slab(t, 1402, 0, 1442, 62, HUB, Kind.Heather);

    tarn(t);
    gorseRing(t);
    pineRoad(t);

    const checkpoints: (Spot & { id: string })[] = [
      { id: 'galecrest', x: 1350.5, z: 30.5 },
      { id: 'gc-hub', x: 1405.5, z: 22.5 },
      { id: 'gc-ring', x: 1417.5, z: 54.5 },
      { id: 'gc-rim', x: 1429.5, z: 10.5 },
    ];
    const puzzles: PuzzleSpot[] = [
      { id: 'gc-tarn', speaker: { x: 1410.5, z: 52.5 }, candle: { x: 1413.5, z: 43.5 }, melody: [1, 0, 2, 4, 5, 6] },
      { id: 'gc-ring', speaker: { x: 1424.5, z: 54.5 }, candle: { x: 1431.5, z: 52.5 }, melody: [0, 4, 2, 6, 3, 5] },
      { id: 'gc-road', speaker: { x: 1419.5, z: 27.5 }, candle: { x: 1419.5, z: 14.5 }, melody: [2, 5, 7, 1, 0, 6] },
    ];
    const enemies: EnemySpot[] = [
      { x: 1358.5, z: 27.5, tester: false }, // the Court's guards, either side of the Sluice: the Axolotl hides from them under the wall
      { x: 1358.5, z: 33.5, tester: false },
      { x: 1406.5, z: 53.5, tester: false }, // the Tarn's guards, by the speaker
      { x: 1407.5, z: 54.5, tester: false },
      { x: 1408.5, z: 48.5, tester: false, kind: 'snapper', minLevel: SNAPPER_LEVEL }, // two Snappers in the Tarn
      { x: 1412.5, z: 46.5, tester: false, kind: 'snapper', minLevel: SNAPPER_LEVEL },
      { x: 1415.5, z: 36.5, tester: false }, // the Pine Road's, at the foot of T1
      { x: 1422.5, z: 36.5, tester: false },
    ];
    const bread: NonNullable<IslandLayout['bread']> = [
      { id: 'gc-yard', x: 1374.5, z: 34.5, amount: 5 },
      { id: 'gc-tarn', x: 1404.5, z: 49.5, amount: 5 },
      { id: 'gc-ring', x: 1423.5, z: 58.5, amount: 10 },
      { id: 'gc-road', x: 1419.5, z: 20.5, amount: 5 },
    ];
    const trees: TreeSpot[] = [
      { x: 1419.5, z: 34.5, kind: 'greatPine' }, // T1
      { x: 1419.5, z: 31.5, kind: 'greatPine' }, // T2, on its pillar
    ];
    const hints: HintZone[] = [
      { id: 'gc-court', x: 1353.5, z: 30.5, r: 3, text: 'A wall against the wind, too tall for anything that hops or flies. Water runs under it, beneath a low stone roof. Two guards watch the bank.' },
      { id: 'gc-sluice', x: 1357.5, z: 33.5, r: 2.5, text: 'Something small that dives slips under the roof, and nothing can follow it or see it there.' },
      { id: 'gc-ramp', x: 1389, z: 30, r: 4, text: 'Loose scree, climbing. The heath lies above the yard.' },
      { id: 'gc-tarn', x: 1410.5, z: 46, r: 4, text: 'The tarn goes down a long way, deeper than a Human dives. Guards keep the speaker.' },
      { id: 'gc-ring', x: 1417.5, z: 54, r: 3, text: 'A ring of gorse, closed. Something small could slip through.' },
      { id: 'gc-road', x: 1419, z: 38, r: 3, text: 'Two great pines stand in a line, past the guards. Climb the first and leap.' },
    ];
    const arrivals: NonNullable<IslandLayout['arrivals']> = [
      {
        id: 'galecrest',
        x: 1350.5,
        z: 30,
        radius: 3.5,
        eyebrow: 'Island ten',
        title: 'Galecrest',
        html: '<p>Heather, scree and a wind that never stops.</p><p class="soft">Whoever gets past the wall and lights five candles here will not need to walk off.</p>',
      },
    ];

    // ---- The east half --------------------------------------------------------
    const east = buildGalecrestEast(t);
    return {
      checkpoints: [...checkpoints, ...(east.checkpoints ?? [])],
      puzzles: [...puzzles, ...(east.puzzles ?? [])],
      enemies: [...enemies, ...(east.enemies ?? [])],
      bread: [...bread, ...(east.bread ?? [])],
      trees: [...trees, ...(east.trees ?? [])],
      hints: [...hints, ...(east.hints ?? [])],
      arrivals: [...arrivals, ...(east.arrivals ?? [])],
    };
  },
};
