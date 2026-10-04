import { EnemySpot, Island, Kind, PuzzleSpot, Terrain } from '../layout';
import { buildEast, nibbleRow } from './underroot-east';

// Island 5: Underroot. This file is the west half (everything at x <= 384): the
// landing, the long hub and three candles. The east half (x >= 385) is built by
// `buildEast` in underroot-east.ts and merged at the end of `build` below.
//
// The hub is moss at height 32, the lowest ground of the island; everything else
// rises to the north and east (the camera looks north-east). Everything raised is
// a launch pad: no boulders, no ordinary trees, no bumps on the hub.
//   Leaf Mats (ur-mat):    Wolf up a lane of thin ice over sky, Human fights, Bunny hops.
//   Leaf Pier (ur-pier):   Wolf runs the pier, shifts to Fairy at its end, Human fights.
//   Clearing (ur-glade):   Human, a plain fight at hub height.
const HUB = 32;
/** The lane's ice climbs this much per tile. */
const RISE = 0.25;
const MAT = 38;
const PIER = 38;
const PIER_ROCK = 41;
const STEP = 42;

/** Top of the Leaf Mats' lane at tile row j: 32.25 at z 45 up to 38 at z 22. */
export const matTop = (j: number): number => HUB + RISE * (46 - j);

/** A flat block of ground, bounds inclusive. */
function slab(t: Terrain, i0: number, j0: number, i1: number, j1: number, h: number, kind: Kind): void {
  t.rect(i0, j0, i1, j1, (i, j) => t.set(i, j, h, kind));
}

export const underroot: Island = {
  id: 'underroot',
  name: 'Underroot',
  build(t) {
    // ---- Zone 0: the landing and the hub ----------------------------------
    t.ellipse(304.5, 51, 5.2, 5, (i, j) => t.set(i, j, HUB, Kind.Moss));
    slab(t, 306, 46, 384, 58, HUB, Kind.Moss);
    // Nibble the outline in runs where no zone needs the edge. The north edge stays
    // straight at x 331..339 (the lane) and 350..364 (the clearing); the south
    // edge loses one row at most, so the band stays at least 11 deep; x = 384 and
    // the landing's side (x < 310) stay whole.
    nibbleRow(t, 46, 310, 383, (i) => (i >= 331 && i <= 339) || (i >= 350 && i <= 364), 31);
    nibbleRow(t, 58, 310, 383, () => false, 33);
    // Flush patches of dirt and bark for colour.
    const patch = (cx: number, cz: number, rx: number, rz: number, kind: Kind): void => {
      t.rect(306, 47, 383, 57, (i, j) => {
        const r = Math.hypot((i + 0.5 - cx) / rx, (j + 0.5 - cz) / rz) + (t.hash(i, j, 34) - 0.5) * 0.4;
        if (r < 1) t.set(i, j, HUB, kind);
      });
    };
    patch(322, 54, 3, 1.8, Kind.Dirt);
    patch(337, 49, 2.6, 1.6, Kind.Bark);
    patch(352, 55, 3.2, 1.7, Kind.Dirt);
    patch(364, 50, 2.4, 1.5, Kind.Bark);
    patch(378, 54, 3, 1.8, Kind.Dirt);
    patch(313, 48, 2, 1.2, Kind.Bark);

    // ---- Zone 1: the Leaf Mats ---------------------------------------------
    // A lane of thin ice 3 wide over empty sky, climbing a quarter a tile to Mat
    // Rock (hub + 6, 24 tiles of sky from the hub). A step of +4 holds the candle.
    t.rect(334, 22, 336, 45, (i, j) => t.setThinIce(i, j, matTop(j)));
    slab(t, 329, 12, 341, 21, MAT, Kind.Bark);
    slab(t, 329, 12, 330, 13, STEP, Kind.Stone);

    // ---- Zone 2: the Leaf Pier ---------------------------------------------
    // A flat pier of thin ice, 8 tiles of sky, then a rock 3 above the pier's end.
    t.rect(342, 15, 355, 17, (i, j) => t.setThinIce(i, j, PIER));
    slab(t, 364, 13, 369, 19, PIER_ROCK, Kind.Stone);

    // ---- Zone 3: the Clearing ----------------------------------------------
    slab(t, 350, 37, 364, 45, HUB, Kind.Moss);

    const checkpoints = [
      { id: 'underroot', x: 305.5, z: 52.5 },
      { id: 'ur-glade', x: 343.5, z: 53.5 },
      { id: 'ur-mid', x: 372.5, z: 52.5 },
      { id: 'ur-mat', x: 331.5, z: 19.5 },
    ];

    const puzzles: PuzzleSpot[] = [
      { id: 'ur-mat', speaker: { x: 340.5, z: 20.5 }, candle: { x: 329.5, z: 12.5 }, melody: [1, 6, 3, 0, 7, 4] },
      { id: 'ur-pier', speaker: { x: 366.5, z: 18.5 }, candle: { x: 368.5, z: 13.5 }, melody: [7, 2, 5, 1, 4, 0] },
      { id: 'ur-glade', speaker: { x: 352.5, z: 43.5 }, candle: { x: 357.5, z: 37.5 }, melody: [0, 3, 6, 2, 5, 7] },
    ];

    const guard = (x: number, z: number): EnemySpot => ({ x, z, tester: false });
    const archer = (x: number, z: number): EnemySpot => ({ x, z, tester: false, kind: 'archer', minLevel: 3 });
    const enemies: EnemySpot[] = [guard(338.5, 19.5), guard(368.5, 17.5), guard(355.5, 41.5), guard(360.5, 42.5), archer(359.5, 38.5)];

    const bread = [
      { id: 'ur-hub', x: 318.5, z: 52.5, amount: 5 },
      { id: 'ur-mat', x: 333.5, z: 14.5, amount: 5 },
      { id: 'ur-pier', x: 365.5, z: 13.5, amount: 5 },
      { id: 'ur-clearing', x: 362.5, z: 44.5, amount: 5 },
    ];

    const hints = [
      { id: 'ur-mat-foot', x: 335, z: 47, r: 3.5, text: 'A path of thin leaves climbs into the sky. Only a runner stays on top.' },
      { id: 'ur-mat-step', x: 332, z: 15, r: 3, text: 'Too high for a Wolf. Something that hops.' },
      { id: 'ur-pier', x: 340, z: 16, r: 3, text: 'The leaves end in the sky. Run to the end and become something that flies, without stopping.' },
      { id: 'ur-pier-rock', x: 366.5, z: 16, r: 3, text: 'The only way down from here is to fall. It costs one heart.' },
      { id: 'ur-clearing', x: 357, z: 46.5, r: 3.5, text: 'Nothing clever here. Just a fight.' },
    ];

    const arrivals = [
      {
        id: 'underroot',
        x: 304.5,
        z: 51,
        radius: 3.5,
        eyebrow: 'New island',
        title: 'Underroot',
        html: '<p>Five candle lights hide among the roots, and the next form waiting is the <b>Ant</b>.</p><p class="soft">The woven roots are too tight for anything you can become, for now.</p>',
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
