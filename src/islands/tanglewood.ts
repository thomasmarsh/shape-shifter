import { EnemySpot, HintZone, Island, Kind, PuzzleSpot, Spot, Terrain, TreeSpot } from '../layout';
import { scatterTrees } from './scatter';

// The second island: Tanglewood. Four candles, each teaching a different way
// to use the fairy (and when to turn back into a human), plus a grove of great
// trees and a chain of tree-pillars out over the void that only the Orangutan
// can use to leave.
//
// Heights are absolute; the island's base ground is 3. At level 1 a human
// hops +1, a fairy rises about +3 above the last ground she stood on, and
// nothing else gets higher. The tests in tanglewood.test.ts keep each of these
// intents honest.

const BASE = 3;

/** Ground under a raised great tree (top 12) and the height of the Lookout beside it. */
const LADDER_BASE = 7;
const LADDER_TOP = 12;

/** A box of tiles, bounds inclusive. */
interface Box {
  i0: number;
  j0: number;
  i1: number;
  j1: number;
}

const box = (i0: number, j0: number, i1: number, j1: number): Box => ({ i0, j0, i1, j1 });

/** Lay a one or two tile wide dirt path along a straight line, on existing base grass only. */
function dirtPath(t: Terrain, x0: number, z0: number, x1: number, z1: number): void {
  const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0)));
  for (let s = 0; s <= steps; s++) {
    const i = Math.round(x0 + ((x1 - x0) * s) / steps);
    const j = Math.round(z0 + ((z1 - z0) * s) / steps);
    for (const [di, dj] of [[0, 0], [0, 1]]) {
      if (t.kindAt(i + di, j + dj) === Kind.Grass && t.get(i + di, j + dj) === BASE) {
        t.set(i + di, j + dj, BASE, Kind.Dirt);
      }
    }
  }
}

// The places whose surroundings must stay free of scattered trees.
const KEEP = box(82, 12, 92, 20);
const LOOKOUT = box(104, 17, 107, 20);
const OVERLOOK = box(106, 32, 107, 40);
const PROMONTORY = box(108, 26, 111, 28);
const LAKE_SHORE = box(70, 33, 86, 47);
const MARSH_SHORE = box(94, 30, 108, 42);

export const tanglewood: Island = {
  id: 'tanglewood',
  name: 'Tanglewood',
  build(t) {
    const onIsland = (i: number, j: number): boolean => t.get(i, j) > 0;

    // The landing, exactly as the first build had it: saves depend on it.
    t.ellipse(68, 22, 6.6, 6.2, (i, j) => t.set(i, j, BASE, Kind.Grass), 0.14);
    t.ellipse(69.5, 20.5, 2.6, 2.4, (i, j) => t.set(i, j, 4, Kind.Grass));

    // The main body of the island, joined on to the landing without changing it.
    t.ellipse(
      88,
      30,
      24,
      21,
      (i, j) => {
        if (!onIsland(i, j)) t.set(i, j, BASE, Kind.Grass);
      },
      0.12,
    );

    // The south-east coast is cut back to x = 107. Island 3 has low ground
    // near (125, 43), and a fairy would otherwise glide straight over to it.
    t.rect(108, 31, 115, 52, (i, j) => t.clear(i, j));

    // Worn paths: from the landing to a crossroads, then hints of the way to
    // the Keep (north-east) and the Lake (south).
    dirtPath(t, 66, 23, 76, 26);
    dirtPath(t, 76, 26, 84, 21);
    dirtPath(t, 76, 26, 78, 33);

    // ---- Zone A - the Lake (south-west) ------------------------------------
    // Teaches taking off from higher ground. A human swims out (guards cannot
    // follow) and solves the puzzle on the islet; the candle sits on a pillar a
    // fairy can only reach from the launch rock.
    t.ellipse(78, 40, 7.5, 6.5, (i, j) => onIsland(i, j) && t.set(i, j, BASE, Kind.Sand));
    t.ellipse(78, 40, 6, 5, (i, j) => {
      if (!onIsland(i, j)) return;
      t.set(i, j, 1.5, Kind.Sand);
      t.setWater(i, j, true);
    });
    t.rect(77, 39, 79, 41, (i, j) => {
      t.set(i, j, BASE, Kind.Grass);
      t.setWater(i, j, false);
    });
    t.set(79, 40, 4, Kind.Stone); // the launch rock
    t.rect(81, 40, 82, 41, (i, j) => {
      t.set(i, j, 7, Kind.Stone); // the pillar, with water all round it
      t.setWater(i, j, false);
    });

    // ---- Zone B - the Keep (north, centre) ---------------------------------
    // A stone plateau two steps up on every side: a fairy flutters up, shifts
    // to human to fight and solve, then flies from the launch stone to the tower.
    t.rect(82, 12, 92, 20, (i, j) => t.set(i, j, 5, Kind.Stone));
    t.rect(83, 13, 91, 19, (i, j) => t.set(i, j, 5, Kind.Dirt)); // the inner court
    t.set(86, 15, 6, Kind.Stone); // the launch stone, in the open court
    t.rect(82, 12, 84, 14, (i, j) => t.set(i, j, 9, Kind.Stone)); // the tower, far from the grove

    // ---- Zone C - the Watchers' Marsh (east, centre) -----------------------
    // Swim in with watchers behind you and hide as a fairy, or sneak down the
    // east coast and glide in from the Overlook.
    t.ellipse(101, 36, 7, 6, (i, j) => onIsland(i, j) && t.set(i, j, BASE, Kind.Sand));
    t.ellipse(101, 36, 5.5, 4.5, (i, j) => {
      if (!onIsland(i, j)) return;
      t.set(i, j, 1.5, Kind.Sand);
      t.setWater(i, j, true);
    });
    t.rect(100, 35, 102, 37, (i, j) => {
      t.set(i, j, BASE, Kind.Grass); // the mound
      t.setWater(i, j, false);
    });
    t.rect(102, 35, 102, 36, (i, j) => t.set(i, j, 5, Kind.Stone)); // the dais
    t.rect(106, 32, 107, 40, (i, j) => {
      t.set(i, j, 6, Kind.Stone); // the Overlook, on the east bank
      t.setWater(i, j, false);
    });

    // ---- Zone D - the Sky Stairs (off the south coast, heading west) -------
    // Fairy stamina and stealth: three stepping stones in the sky.
    t.ellipse(90.5, 56, 2.4, 2.4, (i, j) => t.set(i, j, 5, Kind.Cloud)); // S1, a resting cloud
    t.rect(77, 54, 83, 60, (i, j) => t.set(i, j, 7, Kind.Grass)); // S2
    t.rect(79, 54, 80, 55, (i, j) => t.set(i, j, 9, Kind.Stone)); // S2's dais, out of a guard's reach
    t.rect(66, 55, 69, 58, (i, j) => t.set(i, j, 10, Kind.Stone)); // S3, the long flight

    // ---- Zone E - the Great Grove and the exit (north-east and east) -------
    // Orangutan country. The Lookout is only reachable from a great treetop.
    t.rect(108, 26, 111, 28, (i, j) => t.set(i, j, BASE, Kind.Grass)); // the promontory, the last real ground
    // A fairy CAN land on a ground-level great tree if she starts from the
    // Keep tower or the Overlook, so the gate is a ladder: the next tree up
    // stands on a stub of rock, so its top is more than a fairy can climb from
    // a ground-level treetop (8 + 3.65 < 12). The Orangutan only has to arrive
    // above the trunk's base (7), so it walks straight on.
    t.rect(104, 17, 107, 20, (i, j) => t.set(i, j, LADDER_TOP, Kind.Stone)); // the Lookout
    t.set(102, 19, LADDER_BASE, Kind.Stone); // stub under the launch tree
    t.set(108, 25, LADDER_BASE, Kind.Stone);
    t.set(110, 27, LADDER_BASE, Kind.Stone);
    // The exit chain: single-tile pillars over the void, each fully taken by a tree.
    // They are on the same ladder, so the tops are out of a fairy's reach.
    for (const [i, j] of [[113, 27], [116, 26], [119, 27], [122, 28]]) t.set(i, j, LADDER_BASE, Kind.Stone);

    // ---- things --------------------------------------------------------------

    const checkpoints = [
      { id: 'far-island', x: 64.5, z: 23.5 },
      { id: 'tw-cross', x: 77.5, z: 24.5 },
      { id: 'tw-south', x: 90.5, z: 46.5 },
      { id: 'tw-grove', x: 96.5, z: 21.5 },
    ];

    const puzzles: PuzzleSpot[] = [
      { id: 'tw-lake', speaker: { x: 77.5, z: 39.5 }, candle: { x: 82.5, z: 40.5 }, melody: [0, 4, 2, 7] },
      { id: 'tw-keep', speaker: { x: 84.5, z: 18.5 }, candle: { x: 83.5, z: 12.5 }, melody: [7, 5, 4, 2, 0] },
      { id: 'tw-marsh', speaker: { x: 100.5, z: 36.5 }, candle: { x: 102.5, z: 35.5 }, melody: [2, 3, 4, 6, 7] },
      { id: 'tw-stairs', speaker: { x: 67.5, z: 56.5 }, candle: { x: 80.5, z: 54.5 }, melody: [0, 2, 4, 5, 7, 6] },
    ];

    const enemies: EnemySpot[] = [
      { x: 83.5, z: 28.5, tester: false }, // the first fight on the island
      { x: 73.5, z: 34.5, tester: false }, // lake, north-west shore
      { x: 88.5, z: 14.5, tester: false }, // keep
      { x: 89.5, z: 17.5, tester: false }, // keep
      { x: 93.5, z: 36.5, tester: false }, // marsh watchers
      { x: 99.5, z: 28.5, tester: false },
      { x: 101.5, z: 44.5, tester: false },
      { x: 81.5, z: 58.5, tester: false }, // sky stairs, on S2
      { x: 103.5, z: 22.5, tester: false }, // under the canopy route
      { x: 106.5, z: 25.5, tester: false },
    ];

    const bread = [
      { id: 'tw-landing', x: 70.5, z: 19.5, amount: 5 },
      { id: 'tw-keep', x: 90.5, z: 19.5, amount: 5 },
      { id: 'tw-marsh', x: 106.5, z: 38.5, amount: 5 },
      { id: 'tw-s3', x: 68.5, z: 57.5, amount: 5 },
      { id: 'tw-lookout', x: 105.5, z: 18.5, amount: 10 },
    ];

    const boulders = [
      { x: 72.5, z: 30.5 },
      { x: 84.5, z: 29.5 },
      { x: 94.5, z: 43.5 },
      { x: 98.5, z: 14.5 },
      { x: 69.5, z: 40.5 },
    ];

    // Great trees: the canopy route, the launch tree and the exit chain.
    const greatSpots: [number, number][] = [
      [100, 25], [101, 22], [102, 19], // up to the Lookout
      [106, 23], [108, 25], [110, 27], // onward to the promontory
      [113, 27], [116, 26], [119, 27], [122, 28], // out over the void
    ];
    const great: TreeSpot[] = greatSpots.map(([i, j]) => ({ x: i + 0.5, z: j + 0.5, kind: 'great' }));

    // Scatter ordinary trees on the base grass, away from everything that matters.
    const circles: (Spot & { r: number })[] = [
      ...checkpoints.flatMap((c) => [
        { ...c, r: 2.5 },
        { x: c.x - 1, z: c.z + 1, r: 2.5 }, // where you stand after respawning
      ]),
      ...puzzles.flatMap((p) => [
        { ...p.speaker, r: 2.5 },
        { ...p.candle, r: 2.5 },
      ]),
      ...enemies.map((e) => ({ ...e, r: 2.5 })),
      ...bread.map((b) => ({ ...b, r: 2.5 })),
      ...boulders.map((b) => ({ ...b, r: 2.5 })),
      ...great.map((g) => ({ ...g, r: 4 })),
    ];
    const clearBoxes: { b: Box; m: number }[] = [
      { b: KEEP, m: 4 },
      { b: LOOKOUT, m: 4 },
      { b: OVERLOOK, m: 4 },
      { b: PROMONTORY, m: 4 },
      { b: LAKE_SHORE, m: 1 },
      { b: MARSH_SHORE, m: 1 },
    ];
    const nearPath = (x: number, z: number): boolean => {
      for (let j = Math.floor(z) - 1; j <= Math.floor(z) + 1; j++) {
        for (let i = Math.floor(x) - 1; i <= Math.floor(x) + 1; i++) {
          if (t.kindAt(i, j) === Kind.Dirt && t.get(i, j) === BASE) return true;
        }
      }
      return false;
    };
    const scattered = scatterTrees(t, {
      kind: 'regular',
      density: 0.05,
      area: { i0: 60, j0: 8, i1: 115, j1: 52 },
      keepClear: circles,
      existing: great,
      seed: 7,
    }).filter(
      (s) =>
        !nearPath(s.x, s.z) &&
        !clearBoxes.some(({ b, m }) => s.x > b.i0 - m && s.x < b.i1 + 1 + m && s.z > b.j0 - m && s.z < b.j1 + 1 + m),
    );
    const trees: TreeSpot[] = [...great, ...scattered];

    const hints: HintZone[] = [
      {
        id: 'tw-hearts',
        x: 66,
        z: 22,
        r: 4.5,
        text: 'You arrived as a fairy with 3 hearts. Shifting back to Human does not bring hearts back: eat bread with <kbd>F</kbd>.',
      },
      {
        id: 'tw-swim',
        x: 75,
        z: 35,
        r: 4,
        text: 'Bad guys cannot swim. If a fight goes badly, the water is a safe place.',
      },
      {
        id: 'tw-launch',
        x: 78.5,
        z: 40.5,
        r: 2.5,
        text: 'A fairy can only rise about three steps above the last ground she stood on. Take off from the highest spot you can find.',
      },
      {
        id: 'tw-keep',
        x: 87,
        z: 23,
        r: 3.5,
        text: 'A stone keep, two steps high. Too tall to jump, but not too tall to fly. Fairies cannot fight, so be ready to shift.',
      },
      {
        id: 'tw-marsh',
        x: 95.5,
        z: 33,
        r: 4,
        text: 'Three watchers guard this marsh. Fight them, slip around them, or hide in a fairy home with <kbd>Q</kbd> until they give up.',
      },
      {
        id: 'tw-stairs',
        x: 90.5,
        z: 48.5,
        r: 3,
        text: 'Stepping stones in the sky. Rest on each one until your flying energy is full.',
      },
      {
        id: 'tw-stairs-guard',
        x: 80,
        z: 57,
        r: 4,
        form: 'fairy',
        text: 'Out of energy with a bad guy coming? Press <kbd>Q</kbd> for a fairy home, or flutter up somewhere he cannot reach.',
      },
      {
        id: 'tw-grove',
        x: 100,
        z: 23,
        r: 4,
        maxLevel: 1,
        text: 'Great trees. Too tall to fly onto. Something that climbs could use them.',
      },
      {
        id: 'tw-grove-climb',
        x: 100,
        z: 23,
        r: 4,
        minLevel: 2,
        text: 'As an Orangutan, walk into a great tree to climb it, then jump from treetop to treetop. Bad guys cannot follow.',
      },
      {
        id: 'tw-exit',
        x: 109.5,
        z: 27,
        r: 3,
        minLevel: 2,
        text: 'The trees march out over the sky toward the next island. Twenty trees is your limit before you must touch the ground.',
      },
    ];

    return {
      checkpoints,
      puzzles,
      enemies,
      bread,
      trees,
      boulders,
      hints,
      arrivals: [
        {
          id: 'tanglewood',
          x: 66,
          z: 22,
          radius: 4,
          eyebrow: 'New island',
          title: 'Tanglewood',
          html: `<p>You made it across! Four candle lights are hidden here.</p>
       <p class="soft">Bad guys guard some of them, and fairies cannot fight. Plan when to shift.</p>`,
        },
      ],
    };
  },
};
