import { EnemySpot, HintZone, IslandLayout, Kind, PuzzleSpot, Spot, Terrain, TreeSpot } from '../layout';

// The east half of Coilstone (x >= 1031): the Rift and the brittle Bridge over
// it, the east hub with the Stair and the Thicket, and the Snake's way off: the
// Foot, the Coil and the Serpent's Head. coilstone.ts calls `buildCoilstoneEast`
// and merges the result.

/** The low landing a hop-then-fly from Sunset Rock comes down on. */
export const LANDING = 6;
/** All ordinary ground, on both sides of the Rift. */
export const HUB = 12;
/** The top of the Serpent's Head, 7.5 above the hub: out of every old form's reach. */
export const MESA = 19.5;
/** A burrow rises this much from one hole tile to the next: too much for the Ant, not for the Snake. */
export const COIL_RISE = 0.75;
/** The Table, the Spire and the Thicket's rock: raised things in the open, launch pads. */
const TABLE = 18;
const SPIRE = 22;
const ROCK = 18;

/** A flat block of one kind. */
export function slab(t: Terrain, i0: number, j0: number, i1: number, j1: number, h: number, kind: Kind): void {
  t.rect(i0, j0, i1, j1, (i, j) => t.set(i, j, h, kind));
}

export function buildCoilstoneEast(t: Terrain): IslandLayout {
  // ---- Shared: the east hub and the mesa ------------------------------------
  // The Rift (x 1031..1060) stays open sky.
  slab(t, 1061, 0, 1103, 62, HUB, Kind.Slate);
  slab(t, 1104, 14, 1129, 48, MESA, Kind.Basalt);

  // ---- E1: the Bridge (the Cheetah's run, both ways) -----------------------------
  // 30 tiles of brittle crust over the Rift with a gap of 4, as Sunveld's first run.
  t.rect(1031, 4, 1060, 6, (i, j) => {
    if (i >= 1044 && i <= 1047) return;
    t.setBrittle(i, j, HUB);
  });

  // ---- E2: the east hub - dressed, and keeping x 1061..1076, z 4..6 clear ------
  t.rect(1061, 0, 1103, 62, (i, j) => {
    const h = t.hash(i, j);
    if (h < 0.1) t.set(i, j, HUB, Kind.Lichen);
    else if (h > 0.94) t.set(i, j, HUB, Kind.Basalt);
  });

  // ---- C4: the Stair (the Wolf, then hop-then-fly), going north ---------------
  // Run-up z 55..62 on hub ground. 24 thin sheets z 54..31 climb 0.25 a tile, 12.25 to 18.
  for (let j = 54; j >= 31; j--) {
    t.rect(1064, j, 1066, j, (i) => t.setThinIce(i, j, HUB + 0.25 * (55 - j)));
  }
  slab(t, 1062, 24, 1068, 30, TABLE, Kind.Basalt); // the Table, with the speaker
  slab(t, 1064, 14, 1066, 16, SPIRE, Kind.Basalt); // the Spire, with the candle; gap z 17..23

  // ---- C5: the Thicket (a fight, the Ant, the Orangutan) ---------------------------
  const RING = { i0: 1082, j0: 40, i1: 1096, j1: 56 };
  t.rect(RING.i0, RING.j0, RING.i1, RING.j1, (i, j) => {
    if (i === RING.i0 || i === RING.i1 || j === RING.j0 || j === RING.j1) t.setTangle(i, j);
  });
  slab(t, 1088, 46, 1092, 50, ROCK, Kind.Basalt); // treetop 17, +1, one empty tile (x 1087) between

  // ---- The Foot: hub ground before the mesa ---------------------------------------
  slab(t, 1084, 20, 1094, 28, HUB, Kind.Lichen);

  // ---- The Coil: a burrow of hole tiles along z 30 ----------------------------------
  // Three flat mouth tiles, then ten tiles rising COIL_RISE a tile into the mesa.
  for (let i = 1102; i <= 1114; i++) {
    t.set(i, 30, i <= 1104 ? HUB : HUB + COIL_RISE * (i - 1104), Kind.Basalt);
    t.setTangle(i, 30, 0.35);
  }

  const checkpoints: (Spot & { id: string })[] = [
    { id: 'cs-far', x: 1066.5, z: 10.5 },
    { id: 'cs-foot', x: 1088.5, z: 24.5 },
    { id: 'cs-end', x: 1122.5, z: 30.5 },
  ];

  const puzzles: PuzzleSpot[] = [
    {
      id: 'cs-stair',
      speaker: { x: 1065.5, z: 27.5 },
      candle: { x: 1065.5, z: 14.5 },
      melody: [6, 1, 4, 7, 2, 5],
    },
    {
      id: 'cs-thicket',
      speaker: { x: 1074.5, z: 48.5 },
      candle: { x: 1091.5, z: 48.5 },
      melody: [5, 3, 0, 6, 4, 1],
    },
  ];

  const enemies: EnemySpot[] = [
    // The foot of the Stair, off the run-up lane (x 1064..1066, z 55..62).
    { x: 1071.5, z: 57.5, tester: false },
    { x: 1071.5, z: 60.5, tester: false },
    // The speaker of the Thicket: one heavy, one light, 10 tiles from the ring.
    { x: 1071.5, z: 45.5, tester: false, kind: 'sword', minLevel: 7 },
    { x: 1071.5, z: 52.5, tester: false, kind: 'blade', minLevel: 7 },
    // The Foot: two heavy guards before the burrow.
    { x: 1098.5, z: 28.5, tester: false, kind: 'sword', minLevel: 7 },
    { x: 1098.5, z: 32.5, tester: false, kind: 'sword', minLevel: 7 },
  ];

  const bread: NonNullable<IslandLayout['bread']> = [
    { id: 'cs-e-bread-1', x: 1068.5, z: 8.5, amount: 1 },
    { id: 'cs-e-bread-2', x: 1085.5, z: 52.5, amount: 1 },
    { id: 'cs-e-bread-3', x: 1093.5, z: 50.5, amount: 1 },
    { id: 'cs-e-bread-4', x: 1124.5, z: 28.5, amount: 1 },
  ];

  const trees: TreeSpot[] = [{ x: 1086.5, z: 48.5, kind: 'greatBanyan' }];

  const hints: HintZone[] = [
    { id: 'cs-e-bridge', x: 1066.5, z: 8.5, r: 4, text: 'The pale stone over the Rift holds only the fastest, and a gap breaks the run.' },
    { id: 'cs-e-stair', x: 1065.5, z: 58.5, r: 4, text: 'Old slabs climb to a table. Run, and do not stop.' },
    { id: 'cs-e-thicket', x: 1078.5, z: 48.5, r: 4, text: 'A weave of fallen stone walls the Thicket in. Something small fits through.' },
    { id: 'cs-e-foot', x: 1090.5, z: 28.5, r: 4, text: 'They look west. Something low could come up behind them.' },
    { id: 'cs-e-coil', x: 1100.5, z: 30.5, r: 3, text: 'A burrow into the Serpent. Only the low and the sure-footed go in.' },
  ];

  return {
    trees,
    puzzles,
    checkpoints,
    enemies,
    bread,
    hints,
  };
}
