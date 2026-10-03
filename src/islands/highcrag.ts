import { EnemySpot, Island, Kind, PuzzleSpot, TreeSpot } from '../layout';

// Island 3: Highcrag. Five candles, most of them needing several shapes in a
// row. The valley floor is h5; everything else is a ledge, pillar or rock in
// the sky, placed so each form has exactly one job:
//   Human +1, Fairy +2/+3 (from the last ground stood on, a treetop counts),
//   Bunny +4, Orangutan up the great trees (ground + 5).
// The way off the island is the Giant's Stair, which only the Bunny can climb.
// There are no trees except the great ones listed here.
//
// Fairy arithmetic that shaped the heights below. She rises 3.65 above the
// last thing she stood on (speakers, candles and checkpoints cannot be stood
// on). So from the valley (5) her ceiling is 8.65, from the prow 10.65, from a
// cover wall (7) 10.65. Everything that only the orangutan may reach sits above
// the ceiling of anything the fairy can stand on near it: the orangutan rocks
// are 13 and the trunks are based at 7 (tops 12), so no fairy can land on a
// treetop and fly on from there.
const VALLEY = 5;
/** Ground under a tree the fairy must not be able to land on (top 12). */
const TREE_BASE = 7;
/** A step between the valley and a tree base, so a human can climb up. */
const SKIRT = 6;
/** The orangutan-only rocks: above anything a fairy reaches without a tree. */
const ROCK = 13;

/** A flat block of ground, bounds inclusive. */
function slab(
  t: Parameters<Island['build']>[0],
  i0: number,
  j0: number,
  i1: number,
  j1: number,
  h: number,
  kind: Kind = Kind.Stone,
): void {
  t.rect(i0, j0, i1, j1, (i, j) => t.set(i, j, h, kind));
}

/** Empty sky. */
function sky(t: Parameters<Island['build']>[0], i0: number, j0: number, i1: number, j1: number): void {
  t.rect(i0, j0, i1, j1, (i, j) => t.clear(i, j));
}

export const highcrag: Island = {
  id: 'highcrag',
  name: 'Highcrag',
  build(t) {
    // The body: a wide grassy valley.
    t.ellipse(152, 30, 20, 22, (i, j) => t.set(i, j, VALLEY, Kind.Grass), 0.1);

    // The ravine cuts the north of the valley away: its north rim is z=21.
    sky(t, 130, 0, 176, 20);

    // The prow: the arrival ledge, jutting west toward island 2's last tree
    // pillar, which stands at (122,28) two tiles from its west edge.
    slab(t, 125, 26, 134, 30, 7);

    // ---- Candle 1, Camp Rock: the canopy road (Orangutan) ---------------
    // A line of great trees leads from the prow, over a crowded camp, to the
    // rock. Each tree is at most two empty tiles from the next.
    slab(t, 153, 27, 157, 32, ROCK);
    // The camp floor: a raised terrace under the trees, with a half step
    // around it. The orangutan hops from the prow straight onto a trunk.
    slab(t, 135, 24, 152, 33, SKIRT, Kind.Grass);
    slab(t, 136, 25, 151, 32, TREE_BASE, Kind.Grass);

    // ---- Candle 2, Split Mesa: climb, fight, fly ------------------------
    slab(t, 142, 40, 149, 46, ROCK);
    // The mesa tree stands on a small raised patch, for the same reason.
    slab(t, 139, 41, 141, 45, SKIRT, Kind.Grass);
    slab(t, 140, 42, 141, 44, TREE_BASE, Kind.Grass);
    // A pillar standing free in the sky south of the island. Make sure no
    // valley tiles creep within two tiles of it.
    sky(t, 142, 52, 147, 57);
    slab(t, 144, 54, 145, 55, ROCK + 3);

    // ---- Candle 3, Lonely Rock: fly, then climb -------------------------
    // Keep the sky between the valley's south-west shore and the islet at five
    // tiles or more (edge to edge), too far for anything but the fairy.
    for (let j = 39; j <= 52; j++) {
      const rise = Math.max(0, 44 - (j + 1)); // tiles north of the islet's north edge
      const reach = Math.sqrt(Math.max(0, 25 - rise * rise)); // sky east of its east edge
      const edge = j >= 44 ? 138 : Math.ceil(132 + reach) - 1;
      sky(t, 132, j, edge, j);
    }
    slab(t, 125, 44, 131, 50, VALLEY, Kind.Grass);
    // The islet's tree stands on a raised patch too (and the guard does not).
    slab(t, 125, 47, 128, 50, SKIRT, Kind.Grass);
    slab(t, 126, 48, 128, 50, TREE_BASE, Kind.Grass);
    slab(t, 129, 48, 131, 50, ROCK); // the crag
    slab(t, 130, 53, 130, 53, 9); // the pillar a great tree stands on
    slab(t, 129, 55, 131, 57, 15); // the candle rock

    // ---- Candle 4, the North Cap: take off from a treetop ---------------
    slab(t, 145, 7, 159, 12, ROCK);
    // The rim tree stands on a raised patch too: a fairy on the spire's first
    // tier could otherwise reach its top and the cap.
    slab(t, 150, 21, 154, 23, SKIRT, Kind.Grass);
    slab(t, 151, 21, 153, 22, TREE_BASE, Kind.Grass);
    slab(t, 157, 7, 158, 8, ROCK + 2); // the dais

    // ---- Candle 5, the Spire: every step a different shape --------------
    // Tier 1 is 8 (valley +3, fairy only): a fairy standing on a cover wall (9)
    // would otherwise reach the tree's top at 12 and from there tier 2.
    slab(t, 164, 22, 171, 29, 8); // tier 1
    slab(t, 167, 22, 171, 26, 14); // tier 2
    slab(t, 170, 22, 171, 23, 17); // tier 3

    // ---- The exit: Archers' Causeway and the Giant's Stair --------------
    slab(t, 168, 38, 186, 42, VALLEY, Kind.Dirt);
    // Cover walls to slalom through (a bunny hops straight over).
    slab(t, 173, 38, 173, 40, VALLEY + 2);
    slab(t, 178, 40, 178, 42, VALLEY + 2);
    slab(t, 183, 38, 183, 40, VALLEY + 2);
    // Archer pillars, one tile of sky from the causeway: a bunny hop up from
    // the causeway floor, and within the archers' notice range of it.
    slab(t, 175, 35, 176, 36, VALLEY + 4);
    slab(t, 180, 44, 181, 45, VALLEY + 4);
    // Each step is four higher than the last: bunny only.
    slab(t, 187, 38, 190, 42, 9);
    slab(t, 191, 38, 194, 42, 13);
    slab(t, 195, 38, 198, 42, 17);

    const great = (i: number, j: number): TreeSpot => ({ x: i + 0.5, z: j + 0.5, kind: 'great' });
    const trees: TreeSpot[] = [
      // The canopy road to Camp Rock.
      great(137, 28), great(140, 27), great(143, 29), great(146, 28), great(149, 30), great(151, 30),
      great(140, 43), // the mesa's ladder
      great(127, 49), // the islet's way up to the crag
      great(130, 53), // the pillar tree between crag and candle rock
      great(152, 21), // the rim tree to take off from, toward the cap
      great(165, 24), // on tier 1: the only way to tier 2
    ];

    const checkpoints = [
      { id: 'hc-prow', x: 130.5, z: 27.5 },
      { id: 'hc-south', x: 139.5, z: 37.5 },
      { id: 'hc-north', x: 155.5, z: 23.5 },
      { id: 'hc-east', x: 160.5, z: 34.5 },
      { id: 'hc-stair', x: 170.5, z: 39.5 },
    ];

    const puzzles: PuzzleSpot[] = [
      { id: 'hc-camp', speaker: { x: 153.5, z: 28.5 }, candle: { x: 155.5, z: 31.5 }, melody: [4, 7, 5, 2, 0] },
      { id: 'hc-mesa', speaker: { x: 146.5, z: 41.5 }, candle: { x: 145.5, z: 55.5 }, melody: [0, 3, 5, 7, 6, 4] },
      { id: 'hc-rock', speaker: { x: 130.5, z: 48.5 }, candle: { x: 130.5, z: 56.5 }, melody: [5, 3, 1, 2, 4, 6] },
      { id: 'hc-cap', speaker: { x: 152.5, z: 8.5 }, candle: { x: 158.5, z: 7.5 }, melody: [7, 4, 5, 2, 3, 0] },
      { id: 'hc-spire', speaker: { x: 168.5, z: 22.5 }, candle: { x: 171.5, z: 22.5 }, melody: [1, 3, 0, 5, 7, 6] },
    ];

    const guard = (x: number, z: number): EnemySpot => ({ x, z, tester: false });
    const archer = (x: number, z: number): EnemySpot => ({ x, z, tester: false, kind: 'archer', minLevel: 3 });
    const enemies: EnemySpot[] = [
      // Camp Rock: a crowd under the canopy.
      guard(144.5, 26.5), guard(146.5, 31.5), guard(149.5, 28.0),
      // The mesa.
      guard(144.5, 42.5), guard(147.5, 44.5),
      // Lonely Rock: beside where the fairy lands.
      guard(127.5, 46.0),
      // The cap.
      guard(149.5, 9.5), guard(155.5, 10.5),
      // The spire: tier 1 and tier 2.
      guard(166.5, 27.5), guard(169.5, 25.5),
      // The causeway.
      archer(175.5, 35.5), archer(180.5, 44.5), archer(184.5, 41.5),
    ];

    const bread = [
      { id: 'hc-camp', x: 156.5, z: 28.5, amount: 5 },
      { id: 'hc-rock', x: 126.5, z: 44.5, amount: 5 },
      { id: 'hc-cap', x: 146.5, z: 11.5, amount: 5 },
      { id: 'hc-spire', x: 170.5, z: 28.5, amount: 5 },
      { id: 'hc-causeway', x: 171.5, z: 41.5, amount: 5 },
    ];

    // A handful of rocks in open valley, well away from any ledge.
    const boulders = [
      { x: 160.5, z: 40.5 },
      { x: 148.5, z: 36.5 },
      { x: 152.5, z: 49.5 },
      { x: 135.5, z: 37.5 },
      { x: 163.5, z: 45.5 },
    ];

    const hints = [
      { id: 'hc-prow', x: 129, z: 28, r: 3, text: 'The trees ahead make a road in the sky. The camp below is too crowded to fight.' },
      { id: 'hc-mesa', x: 139.5, z: 42, r: 3.5, text: 'Three shapes for one candle: climb, fight, fly.' },
      { id: 'hc-rock', x: 139, z: 47, r: 3, text: 'Too far to jump, and no trees on the way. But there is a tree waiting on the other side.' },
      {
        id: 'hc-ravine',
        x: 152,
        z: 23,
        r: 4,
        text: 'Too wide to jump and too high to fly up to. But a fairy rises three steps above wherever she last stood - even a treetop.',
      },
      { id: 'hc-spire', x: 163, z: 30, r: 3.5, text: 'The spire: every step up needs a different shape.' },
      {
        id: 'hc-stair-locked',
        x: 184,
        z: 40,
        r: 4,
        maxLevel: 2,
        text: 'Steps for a giant. Nothing you can become jumps this high. Yet.',
      },
      { id: 'hc-stair', x: 184, z: 40, r: 4, minLevel: 3, text: 'Hold <kbd>Space</kbd> as a Bunny to hop up the giant steps.' },
      {
        id: 'hc-archers',
        x: 171,
        z: 40,
        r: 3,
        minLevel: 3,
        text: 'Archers! Arrows cannot pass through walls. Keep moving, and hop over what you cannot walk around.',
      },
    ];

    const arrivals = [
      {
        id: 'highcrag',
        x: 128.5,
        z: 28.5,
        radius: 2.5,
        eyebrow: 'New island',
        title: 'Highcrag',
        html: '<p>Five candle lights are hidden up here, and the next form waiting is the <b>Bunny</b>.</p><p class="soft">You will need every shape you know, sometimes for a single candle.</p>',
      },
    ];

    return { checkpoints, puzzles, enemies, bread, trees, boulders, hints, arrivals };
  },
};
