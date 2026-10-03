import { EnemySpot, HintZone, IslandLayout, Kind, PuzzleSpot, Terrain, TreeSpot } from '../layout';

// Island 5, east half: everything of Underroot at x >= 385. The west half
// (underroot.ts) calls `buildEast` and merges what it returns.
//
// The hub's east end (the gate guards) leads to two candles and then the way
// on, which only the Ant can walk:
//   E1 the Root Grove (Orangutan, Human, Fairy): a road of great trees over the
//      sky to Grove Rock, a fight, then a fairy flight to Bough Rock's candle.
//   E2 the Spire (Bunny, then Fairy): too high to fly up to, too far to hop.
//   E3 the Root Wall and the Yard (Ant): a room of root tangle only the Ant
//      can enter, and a safe one.
//   E4 the Long Root (Ant): a tangle over open sky climbing 0.25 a tile to the
//      Crown, where no other form can follow.
//   E5 a Fairy's glide down to Saltmere, the next island.
// Everything raised is a launch pad. No boulders and no trees but three great
// ones.

/** The hub's height: the lowest ground of Underroot. */
const HUB = 32;
/** The Long Root climbs this much per tile. */
const RISE = 0.25;
const CROWN = 40;

/** Top of the Long Root at tile column i. */
export const rootTop = (i: number): number => HUB + RISE * (i - 438);

/** A flat block of ground, bounds inclusive. */
function slab(t: Terrain, i0: number, j0: number, i1: number, j1: number, h: number, kind: Kind): void {
  t.rect(i0, j0, i1, j1, (i, j) => t.set(i, j, h, kind));
}

/** Shape the east half of Underroot and return what stands on it. */
export function buildEast(t: Terrain): IslandLayout {
  // ---- E0: the hub's east end ----------------------------------------------
  slab(t, 385, 46, 425, 58, HUB, Kind.Moss);
  // Nibble the north and south edges (the north edge stays straight at x 390..396
  // for the first great tree), keeping the band at least 11 deep.
  for (let i = 386; i <= 424; i++) {
    if (i < 390 || i > 396) if (t.hash(i, 46, 31) > 0.55) t.clear(i, 46);
    if (t.hash(i, 58, 32) > 0.55) t.clear(i, 58);
  }

  // ---- E1: the Root Grove --------------------------------------------------
  slab(t, 393, 43, 393, 43, HUB + 1, Kind.Stone); // T2's pillar
  slab(t, 395, 41, 395, 41, HUB + 2, Kind.Stone); // T3's pillar, its top is 39
  slab(t, 391, 33, 398, 39, 40, Kind.Bark); // Grove Rock: one empty tile past T3, +1
  slab(t, 407, 33, 411, 36, 43, Kind.Stone); // Bough Rock: +3 over 8 tiles of sky

  // ---- E2: the Spire -------------------------------------------------------
  slab(t, 419, 34, 420, 35, 47, Kind.Stone); // +4 over 7 tiles of sky

  // ---- E3: the Root Wall and the Yard --------------------------------------
  slab(t, 426, 46, 438, 58, HUB, Kind.Moss);
  t.rect(426, 46, 428, 58, (i, j) => t.setTangle(i, j));
  t.rect(426, 46, 438, 46, (i, j) => t.setTangle(i, j));
  t.rect(426, 58, 438, 58, (i, j) => t.setTangle(i, j));
  t.rect(438, 46, 438, 58, (i, j) => t.setTangle(i, j));

  // ---- E4: the Long Root and the Crown -------------------------------------
  for (let i = 439; i <= 470; i++) {
    t.set(i, 52, rootTop(i), Kind.Bark);
    t.setTangle(i, 52);
  }
  for (const i0 of [448, 459]) {
    t.rect(i0, 51, i0 + 2, 53, (i, j) => {
      t.set(i, j, rootTop(i), Kind.Bark);
      t.setTangle(i, j);
    });
  }
  slab(t, 471, 49, 477, 55, CROWN, Kind.Bark);

  // ---- Things --------------------------------------------------------------
  const trees: TreeSpot[] = [
    { x: 393.5, z: 46.5, kind: 'great' }, // T1, on the hub
    { x: 393.5, z: 43.5, kind: 'great' }, // T2
    { x: 395.5, z: 41.5, kind: 'great' }, // T3
  ];

  const puzzles: PuzzleSpot[] = [
    { id: 'ur-grove', speaker: { x: 392.5, z: 34.5 }, candle: { x: 410.5, z: 33.5 }, melody: [4, 1, 6, 0, 3, 7] },
    { id: 'ur-spire', speaker: { x: 408.5, z: 36.5 }, candle: { x: 420.5, z: 34.5 }, melody: [7, 3, 1, 5, 0, 2] },
  ];

  const checkpoints = [
    { id: 'ur-grove', x: 389.5, z: 51.5 },
    { id: 'ur-wall', x: 421.5, z: 52.5 },
    { id: 'ur-yard', x: 433.5, z: 52.5 },
    { id: 'ur-crown', x: 474.5, z: 53.5 },
  ];

  const archer = (x: number, z: number): EnemySpot => ({ x, z, tester: false, kind: 'archer', minLevel: 3 });
  const enemies: EnemySpot[] = [
    { x: 406.5, z: 50.5, tester: false },
    { x: 409.5, z: 54.5, tester: false },
    archer(404.5, 56.5),
    { x: 396.5, z: 36.5, tester: false },
    archer(397.5, 33.5),
  ];

  const bread = [
    { id: 'ur-wall', x: 419.5, z: 49.5, amount: 5 },
    { id: 'ur-grove', x: 394.5, z: 38.5, amount: 5 },
    { id: 'ur-yard', x: 431.5, z: 49.5, amount: 10 },
    { id: 'ur-crown', x: 472.5, z: 50.5, amount: 10 },
  ];

  const hints: HintZone[] = [
    { id: 'ur-grove', x: 393.5, z: 48.5, r: 3.5, text: 'A road of great trees over the sky.' },
    { id: 'ur-bough', x: 397, z: 35, r: 3, text: 'Too far to jump. Not too far to fly.' },
    {
      id: 'ur-spire',
      x: 410,
      z: 35,
      r: 2.5,
      text: 'Too high to fly up to, too far to hop. Hop first, and change shape at the very top.',
    },
    {
      id: 'ur-wall-locked',
      x: 423,
      z: 52.5,
      r: 4,
      maxLevel: 4,
      text: 'Woven roots. Too tight for anything you can become. Yet.',
    },
    {
      id: 'ur-wall',
      x: 423,
      z: 52.5,
      r: 4,
      minLevel: 5,
      text: 'Become the Ant and walk in. Nothing can follow you through the roots.',
    },
    {
      id: 'ur-yard',
      x: 433.5,
      z: 52.5,
      r: 3.5,
      minLevel: 5,
      text: 'An Ant has one heart. Eat here before you change shape. The long root is the way on.',
    },
    {
      id: 'ur-root',
      x: 437,
      z: 52.5,
      r: 2,
      minLevel: 5,
      text: 'No jumping and no changing shape inside the roots. Walk straight.',
    },
    { id: 'ur-crown', x: 475, z: 52, r: 3, text: 'One short flight to the next island.' },
  ];

  return { trees, puzzles, checkpoints, enemies, bread, hints };
}
