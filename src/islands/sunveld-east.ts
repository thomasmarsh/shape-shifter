import { EnemySpot, HintZone, IslandLayout, Kind, PlateSpot, PuzzleSpot, Terrain, TreeSpot } from '../layout';

// Island 7, east half: everything of Sunveld at x >= 820. The west half
// (sunveld.ts) calls `buildSunveldEast` and merges what it returns.
//
//   Shared   ground (x 820..866), the escarpment and the Red Wall.
//   E1 the Umbrella Grove (Orangutan, Human, Wolf, Fairy): an acacia road to
//      Grove Rock (a fight), a thin pier, and a flight to Pier Rock.
//   E2 the Kraal (Ant, Orangutan, Bunny, Fairy): a ring of thorn, a tree, a
//      ledge and a spire.
//   E3 the Gate: a plate 31 tiles from the gate in the Red Wall. Only the Cheetah.
//   E4 the Yard, E5 the Crust, E6 the Kopje and its Terrace, E7 the High Crust
//      and E8 Sunset Rock: the Cheetah's run over open sky on brittle crust.
// Everything raised west of the wall stays at 25 or lower, or inside a sealed
// ring, so the wall is always 6 above whatever can stand next to it.

// The heights below are redeclared from sunveld.ts, which this file must not
// import (it imports this one).
const BASE = 16;
const WALL = 31;
const GROVE = 23;
const PIER_ROCK = 24;
const TERRACE = BASE + 4;
const LEVEL = BASE - 0.3;

function slab(t: Terrain, i0: number, j0: number, i1: number, j1: number, h: number, kind: Kind): void {
  t.rect(i0, j0, i1, j1, (i, j) => {
    t.setWater(i, j, false);
    t.set(i, j, h, kind);
  });
}

/** Shape the east half of Sunveld (x >= 820) and return what stands on it. */
export function buildSunveldEast(t: Terrain): IslandLayout {
  // ---- Shared: ground, escarpment, the Red Wall -----------------------------
  slab(t, 820, 10, 866, 60, BASE, Kind.Straw);
  slab(t, 820, 0, 866, 9, WALL, Kind.Clay);
  slab(t, 867, 0, 869, 63, WALL, Kind.Clay);

  // ---- E1: the Umbrella Grove -----------------------------------------------
  slab(t, 830, 38, 830, 38, BASE + 1, Kind.Clay); // T2's pillar, its top is 22
  slab(t, 826, 28, 834, 36, GROVE, Kind.Clay); // Grove Rock: T2's top + 1
  t.rect(835, 31, 850, 33, (i, j) => t.setThinIce(i, j, GROVE)); // the pier
  slab(t, 859, 31, 861, 33, PIER_ROCK, Kind.Clay);

  // ---- E2: the Kraal --------------------------------------------------------
  for (let i = 836; i <= 856; i++) for (const j of [42, 54]) t.setTangle(i, j);
  for (let j = 43; j <= 53; j++) for (const i of [836, 856]) t.setTangle(i, j);
  slab(t, 843, 49, 846, 52, 22, Kind.Clay); // the ledge: the tree's top (21) + 1
  slab(t, 854, 49, 856, 52, 26, Kind.Clay); // the spire: ledge + 4 across 7 tiles; wide enough to land beside the candle

  // ---- E3: the Gate ---------------------------------------------------------
  t.rect(867, 57, 869, 58, (i, j) => {
    t.set(i, j, BASE, Kind.Straw);
    t.setGate(i, j, 'sv-gate');
  });
  // The Gate Pond lets a Mermaid strike the guards from the water.
  t.rect(859, 46, 864, 53, (i, j) => {
    t.set(i, j, LEVEL - 4, Kind.Sand);
    t.setWater(i, j, true, LEVEL);
  });

  // ---- E4: the Yard ---------------------------------------------------------
  slab(t, 870, 50, 882, 60, BASE, Kind.Straw);

  // ---- E5: the Crust (run 1): 40 tiles with a gap of 4 ----------------------
  t.rect(883, 54, 922, 56, (i, j) => {
    if (i >= 900 && i <= 903) return;
    t.setBrittle(i, j, BASE);
  });

  // ---- E6: the Kopje and its Terrace ----------------------------------------
  slab(t, 923, 50, 940, 60, BASE, Kind.Straw);
  slab(t, 927, 44, 935, 49, TERRACE, Kind.Clay);

  // ---- E7: the High Crust (run 2): 36 tiles with a gap of 5 -----------------
  t.rect(930, 8, 932, 43, (i, j) => {
    if (j >= 24 && j <= 28) return;
    t.setBrittle(i, j, TERRACE);
  });

  // ---- E8: Sunset Rock ------------------------------------------------------
  slab(t, 925, 0, 937, 7, TERRACE, Kind.Clay);

  // ---- Things ---------------------------------------------------------------
  const trees: TreeSpot[] = [
    { x: 830.5, z: 41.5, kind: 'greatAcacia' }, // T1
    { x: 830.5, z: 38.5, kind: 'greatAcacia' }, // T2, on its pillar
    { x: 841.5, z: 50.5, kind: 'greatAcacia' }, // the Kraal's tree
  ];

  const puzzles: PuzzleSpot[] = [
    {
      id: 'sv-grove',
      speaker: { x: 830.5, z: 30.5 },
      candle: { x: 860.5, z: 32.5 },
      melody: [5, 2, 7, 0, 3, 6],
    },
    {
      id: 'sv-kraal',
      speaker: { x: 845.5, z: 51.5 },
      candle: { x: 854.5, z: 50.5 },
      melody: [6, 1, 4, 7, 0, 3],
    },
  ];

  const checkpoints = [
    { id: 'sv-east', x: 823.5, z: 50.5 },
    { id: 'sv-kraal', x: 839.5, z: 45.5 },
    { id: 'sv-yard', x: 881.5, z: 59.5 },
    { id: 'sv-kopje', x: 925.5, z: 58.5 },
    { id: 'sv-end', x: 931.5, z: 4.5 },
  ];

  const enemies: EnemySpot[] = [
    { x: 828.5, z: 29.5, tester: false },
    { x: 832.5, z: 29.5, tester: false },
    { x: 862.5, z: 56.5, tester: false, kind: 'sword', minLevel: 7 },
    { x: 864.5, z: 59.5, tester: false, kind: 'sword', minLevel: 7 },
    { x: 860.5, z: 58.5, tester: false, kind: 'blade', minLevel: 7 },
    { x: 937.5, z: 57.5, tester: false, kind: 'sword', minLevel: 7 },
    { x: 938.5, z: 52.5, tester: false, kind: 'blade', minLevel: 7 },
  ];

  const bread = [
    { id: 'sv-east', x: 824.5, z: 49.5, amount: 5 },
    { id: 'sv-kraal', x: 840.5, z: 46.5, amount: 5 },
    { id: 'sv-yard', x: 880.5, z: 59.5, amount: 10 },
    { id: 'sv-kopje', x: 926.5, z: 57.5, amount: 10 },
    { id: 'sv-end', x: 932.5, z: 3.5, amount: 10 },
  ];

  const plates: PlateSpot[] = [
    { x: 838.5, z: 57.5, gate: 'sv-gate', seconds: 3.8 },
    { x: 875.5, z: 59.5, gate: 'sv-gate', seconds: 4.2 },
  ];

  const hints: HintZone[] = [
    {
      id: 'sv-e-road',
      x: 830.5,
      z: 44,
      r: 3,
      text: 'A road of great acacias. Climb the first and leap.',
    },
    {
      id: 'sv-e-pier',
      x: 834,
      z: 32,
      r: 3,
      text: 'The crust is thin. Run and do not stop, then fly.',
    },
    {
      id: 'sv-e-kraal',
      x: 838,
      z: 40,
      r: 4,
      text: 'The thorns let only the smallest through. Go in on the west side.',
    },
    {
      id: 'sv-e-plate',
      x: 838.5,
      z: 55,
      r: 3,
      text: 'Step on the plate and the gate in the Red Wall opens, for a moment. Only the fastest reaches it in time.',
    },
    {
      id: 'sv-e-yard',
      x: 878,
      z: 56,
      r: 4,
      minLevel: 7,
      text: 'Catch your breath. The crust is long, and a winded Cheetah is slow.',
    },
    {
      id: 'sv-e-crust',
      x: 884.5,
      z: 55,
      r: 2.5,
      text: 'Too brittle even for a Wolf. Only the fastest holds it.',
    },
    {
      id: 'sv-e-terrace',
      x: 931,
      z: 46.5,
      r: 3.5,
      minLevel: 7,
      text: 'Catch your breath before the High Crust.',
    },
  ];

  const arrivals = [
    {
      id: 'sv-end',
      x: 931.5,
      z: 4.5,
      radius: 3,
      eyebrow: 'To be continued',
      title: 'Sunset Rock',
      html: '<p>Seven shapes learned, and the fastest of them all.</p><p class="soft">The way on from here is still being built.</p>',
    },
  ];

  return {
    trees,
    puzzles,
    checkpoints,
    enemies,
    bread,
    hints,
    arrivals,
    plates,
  };
}
