import { EnemySpot, HintZone, Island, Kind, PuzzleSpot, Terrain } from '../layout';
import { buildEast } from './saltmere-east';
import { nibbleRow } from './underroot-east';

// Island 6: Saltmere. This file is the west half (everything at x < 584): the
// landing, the hub and four candles, every one of them a sea pickle on a bed 4
// deep, so each ends with a Human dive. The east half (x >= 584) is built by
// `buildEast` in saltmere-east.ts and merged at the end of `build` below.
//
// The hub is sand at height 38, the lowest and flat ground of the island.
//   Tide Pool (sm-tide):   Human, a fight and then the first dive.
//   Driftwood Nest (sm-nest): Ant in through a ring of tangle, Bunny up a block,
//                          Human down to the pickle.
//   Salt Stair (sm-salt):  Wolf up a stair of salt crust over the sky to Salt
//                          Rock (hub + 6), Ant into a second ring, Human down.
//   The Stack (sm-stack):  Human fights for the speaker, hop-then-fly up to a
//                          pool on top (hub + 4, 7 tiles of sky), Human down.
// Everything raised is a launch pad: no trees, no boulders.
export const HUB = 38;
/** A pool dug into ground of height H has its water 0.3 under H and its bed 4 under the water. */
export const LEVEL_DROP = 0.3;
export const DEPTH = 4;
/** The Salt Stair climbs this much per tile. */
const RISE = 0.25;
const ROCK = 44;
const STACK = 42;

/** Top of the Salt Stair's crust at tile row j: 38.25 at z 45 up to 44 at z 22. */
export const stairTop = (j: number): number => HUB + RISE * (46 - j);

function slab(t: Terrain, i0: number, j0: number, i1: number, j1: number, h: number, kind: Kind): void {
  t.rect(i0, j0, i1, j1, (i, j) => t.set(i, j, h, kind));
}

/** Dig a pool: ground of `rim` with water 0.3 under it and a bed 4 under the water. */
function pool(t: Terrain, i0: number, j0: number, i1: number, j1: number, rim: number, bed = rim - LEVEL_DROP - DEPTH): void {
  t.rect(i0, j0, i1, j1, (i, j) => {
    t.set(i, j, bed, Kind.Sand);
    t.setWater(i, j, true, rim - LEVEL_DROP);
  });
}

/** A closed ring of tangle round the box, one tile thick. */
function ring(t: Terrain, i0: number, j0: number, i1: number, j1: number): void {
  t.rect(i0, j0, i1, j0, (i, j) => t.setTangle(i, j));
  t.rect(i0, j1, i1, j1, (i, j) => t.setTangle(i, j));
  t.rect(i0, j0, i0, j1, (i, j) => t.setTangle(i, j));
  t.rect(i1, j0, i1, j1, (i, j) => t.setTangle(i, j));
}

export const saltmere: Island = {
  id: 'saltmere',
  name: 'Saltmere',
  build(t) {
    // ---- W0: the Strand and the hub ----------------------------------------
    t.ellipse(491.5, 52, 5.2, 5, (i, j) => t.set(i, j, HUB, Kind.Sand));
    slab(t, 490, 46, 583, 58, HUB, Kind.Sand);
    // North edge straight at x 519..535 (the Nest), 543..549 (the Stair) and
    // 571..583 (the Stack and the beach); the last four columns of the south
    // edge stay whole. The landing's side (x < 498) stays whole.
    nibbleRow(t, 46, 498, 582, (i) => (i >= 519 && i <= 535) || (i >= 543 && i <= 549) || i >= 571, 61);
    nibbleRow(t, 58, 498, 579, () => false, 62);
    // Salt patches for the look; the height does not change.
    const patch = (cx: number, cz: number, rx: number, rz: number): void => {
      t.rect(490, 47, 583, 57, (i, j) => {
        if (t.get(i, j) !== HUB) return;
        const r = Math.hypot((i + 0.5 - cx) / rx, (j + 0.5 - cz) / rz) + (t.hash(i, j, 63) - 0.5) * 0.4;
        if (r < 1) t.set(i, j, HUB, Kind.Salt);
      });
    };
    patch(514, 55, 3.4, 1.8);
    patch(537, 49, 2.8, 1.5);
    patch(551, 55, 3.2, 1.8);
    patch(563, 48, 2.4, 1.3);
    patch(577, 53, 3, 1.8);
    patch(495, 56, 2, 1.1);

    // ---- W1: the Tide Pool --------------------------------------------------
    pool(t, 500, 49, 506, 55, HUB, HUB - LEVEL_DROP - 1); // the ring, 1 deep
    pool(t, 501, 50, 505, 54, HUB); // the middle, 4 deep

    // ---- W2: the Driftwood Nest ---------------------------------------------
    slab(t, 520, 33, 534, 45, HUB, Kind.Sand);
    ring(t, 520, 33, 534, 45);
    slab(t, 522, 35, 524, 36, HUB + 4, Kind.Stone);
    pool(t, 527, 38, 531, 42, HUB);

    // ---- W3: the Salt Stair and Salt Rock -----------------------------------
    t.rect(545, 22, 547, 45, (i, j) => t.setThinIce(i, j, stairTop(j)));
    slab(t, 539, 8, 553, 21, ROCK, Kind.Salt);
    ring(t, 541, 8, 551, 14);
    pool(t, 546, 10, 548, 12, ROCK);

    // ---- W4: the Stack -------------------------------------------------------
    slab(t, 575, 34, 579, 38, STACK, Kind.Stone);
    pool(t, 576, 35, 578, 37, STACK);

    // ---- Things --------------------------------------------------------------
    const checkpoints = [
      { id: 'saltmere', x: 492.5, z: 53.5 },
      { id: 'sm-mid', x: 538.5, z: 52.5 },
      { id: 'sm-east', x: 558.5, z: 52.5 },
      { id: 'sm-nest', x: 525.5, z: 42.5 },
      { id: 'sm-salt', x: 544.5, z: 12.5 },
    ];

    const puzzles: PuzzleSpot[] = [
      { id: 'sm-tide', speaker: { x: 508.5, z: 52.5 }, candle: { x: 503.5, z: 52.5 }, melody: [0, 2, 4, 5, 7, 3] },
      { id: 'sm-nest', speaker: { x: 522.5, z: 35.5 }, candle: { x: 529.5, z: 40.5 }, melody: [5, 3, 1, 7, 2, 6] },
      { id: 'sm-salt', speaker: { x: 543.5, z: 10.5 }, candle: { x: 547.5, z: 11.5 }, melody: [6, 4, 0, 3, 1, 5] },
      { id: 'sm-stack', speaker: { x: 572.5, z: 49.5 }, candle: { x: 577.5, z: 36.5 }, melody: [2, 7, 5, 1, 4, 0] },
    ];

    const guard = (x: number, z: number): EnemySpot => ({ x, z, tester: false });
    const archer = (x: number, z: number): EnemySpot => ({ x, z, tester: false, kind: 'archer', minLevel: 3 });
    const enemies: EnemySpot[] = [
      guard(500.5, 47.5),
      guard(506.5, 57.5),
      guard(569.5, 51.5),
      guard(574.5, 54.5),
      archer(578.5, 56.5),
    ];

    const bread = [
      { id: 'sm-strand', x: 489.5, z: 50.5, amount: 5 },
      { id: 'sm-nest', x: 522.5, z: 43.5, amount: 10 },
      { id: 'sm-salt', x: 550.5, z: 9.5, amount: 10 },
      { id: 'sm-east', x: 560.5, z: 49.5, amount: 5 },
    ];

    const hints: HintZone[] = [
      { id: 'sm-dive', x: 503.5, z: 52.5, r: 4.5, text: 'As a Human, hold <kbd>Shift</kbd> to dive. Let go to float back up.' },
      { id: 'sm-nest', x: 527, z: 47.5, r: 4, text: 'Driftwood, woven tight. Only an Ant gets through.' },
      {
        id: 'sm-nest-in',
        x: 525.5,
        z: 41,
        r: 3,
        text: 'An Ant has one heart. Eat here before you change shape. The speaker is up on the block.',
      },
      {
        id: 'sm-stair',
        x: 546.5,
        z: 47.5,
        r: 3.5,
        text: 'A stair of salt crust over the sky. It only holds something that runs and never stops.',
      },
      { id: 'sm-salt', x: 546.5, z: 18, r: 3.5, text: 'More woven driftwood. You know who fits.' },
      {
        id: 'sm-stack',
        x: 577,
        z: 47.5,
        r: 3.5,
        text: 'A pool on top of the stack. Too high to fly up to, too far to hop. Hop first, and change shape at the very top.',
      },
    ];

    const arrivals = [
      {
        id: 'saltmere',
        x: 491.5,
        z: 52,
        radius: 3.5,
        eyebrow: 'Island six',
        title: 'Saltmere',
        html: '<p>Sand, salt and deep water.</p><p class="soft">The lights here are <b>sea pickles</b>. They glow under the water.</p>',
      },
    ];

    // ---- The east half ------------------------------------------------------
    const east = buildEast(t);
    return {
      checkpoints: [...checkpoints, ...(east.checkpoints ?? [])],
      puzzles: [...puzzles, ...(east.puzzles ?? [])],
      enemies: [...enemies, ...(east.enemies ?? [])],
      bread: [...bread, ...(east.bread ?? [])],
      trees: east.trees ?? [],
      boulders: east.boulders ?? [],
      hints: [...hints, ...(east.hints ?? [])],
      arrivals: [...arrivals, ...(east.arrivals ?? [])],
    };
  },
};
