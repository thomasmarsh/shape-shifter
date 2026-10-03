import { EnemySpot, Island, Kind, PuzzleSpot, Spot, TreeSpot } from '../layout';
import { scatterTrees } from './scatter';

// The tutorial island: a meadow, a hill, a pond and a bluff, plus the resting
// cloud halfway across the gap to the next island.

export const meadow: Island = {
  id: 'meadow',
  name: 'Meadow Island',
  build(t) {
    // Main island: a low meadow in the west, a plateau one step up to the east.
    t.ellipse(
      23,
      22,
      19.5,
      16.5,
      (i, j) => {
        const plateau = i >= 17;
        t.set(i, j, plateau ? 3 : 2, Kind.Grass);
      },
      0.14,
    );

    // The hill in the north, in three jumpable terraces.
    const onIsland = (i: number, j: number) => t.get(i, j) > 0;
    t.ellipse(22, 12, 7, 5, (i, j) => onIsland(i, j) && t.set(i, j, 4, Kind.Grass), 0.1);
    t.ellipse(22, 12, 5, 3.6, (i, j) => onIsland(i, j) && t.set(i, j, 5, Kind.Stone), 0.1);
    t.ellipse(22, 12, 3.2, 2.3, (i, j) => onIsland(i, j) && t.set(i, j, 6, Kind.Stone));

    // The training ground: packed dirt where the tester bad guys wait.
    t.rect(19, 22, 25, 28, (i, j) => t.set(i, j, 3, Kind.Dirt));

    // A worn path from the spawn point, up the ledge, to the training ground.
    t.rect(11, 27, 18, 28, (i, j) => t.set(i, j, i >= 17 ? 3 : 2, Kind.Dirt));

    // The pond, with a sandy shore and a little islet in the middle.
    t.ellipse(32, 27, 6.2, 5.6, (i, j) => onIsland(i, j) && t.set(i, j, 3, Kind.Sand), 0.12);
    t.ellipse(32, 27, 4.8, 4.2, (i, j) => {
      if (!onIsland(i, j)) return;
      t.set(i, j, 1.5, Kind.Sand);
      t.setWater(i, j, true);
    });
    t.ellipse(32.5, 27.5, 1.9, 1.9, (i, j) => {
      t.set(i, j, 3, Kind.Grass);
      t.setWater(i, j, false);
    });

    // The bluff on the east edge: the place to take off from.
    t.rect(38, 18, 43, 25, (i, j) => onIsland(i, j) && t.set(i, j, 4, Kind.Stone));

    // A resting cloud halfway across the gap.
    t.ellipse(52, 22, 3.1, 3.1, (i, j) => t.set(i, j, 3, Kind.Cloud));

    const spawn = { x: 10.5, z: 27.5 };
    const checkpoints = [
      { id: 'meadow', x: 12.5, z: 25.5 },
      { id: 'middle', x: 29.5, z: 17.5 },
      { id: 'bluff', x: 39.5, z: 20.5 },
    ];
    const puzzles: PuzzleSpot[] = [
      { id: 'grove', speaker: { x: 22.5, z: 33.5 }, candle: { x: 24.5, z: 34.5 }, melody: [0, 2, 4] },
      { id: 'hilltop', speaker: { x: 21.5, z: 11.5 }, candle: { x: 23.5, z: 12.5 }, melody: [4, 2, 5, 0] },
      { id: 'islet', speaker: { x: 32.5, z: 26.5 }, candle: { x: 33.5, z: 28.5 }, melody: [0, 1, 2, 4, 7] },
    ];
    const enemies: EnemySpot[] = [
      { x: 21.5, z: 24.0, tester: true },
      { x: 23.5, z: 26.5, tester: true },
      // One guard on the hill's lower terrace, two on the pond's south shore.
      // The north side of the pond is left open as the safe way in.
      { x: 17.0, z: 14.5, tester: false },
      { x: 31.5, z: 32.5, tester: false },
      { x: 36.5, z: 30.5, tester: false },
    ];
    const bread = [
      { id: 'meadow', x: 13.5, z: 31.5, amount: 5 },
      { id: 'north', x: 31.5, z: 15.5, amount: 5 },
      { id: 'south', x: 36.5, z: 33.5, amount: 5 },
    ];
    const boulders = [
      { x: 19.5, z: 12.5 },
      { x: 24.5, z: 10.5 },
      { x: 16.5, z: 20.5 },
      { x: 36.5, z: 17.5 },
    ];

    // A wall of trees hides the first puzzle from the training ground. It is
    // open on the camera's side so you can see it once you walk around.
    const grove: [number, number][] = [
      [19, 31], [20, 31], [21, 31], [22, 31], [23, 31], [24, 31], [25, 31],
      [26, 31], [27, 32], [27, 33], [27, 34], [26, 35],
    ];
    const trees: TreeSpot[] = grove.map(([i, j]) => ({ x: i + 0.5, z: j + 0.5, kind: 'regular' }));

    // Scatter the rest, keeping clear of anything the player needs to reach.
    const keepClear: (Spot & { r: number })[] = [
      { ...spawn, r: 3 },
      ...checkpoints.map((c) => ({ ...c, r: 2.5 })),
      ...puzzles.flatMap((p) => [
        { ...p.speaker, r: 2.6 },
        { ...p.candle, r: 2.6 },
      ]),
      ...enemies.map((e) => ({ ...e, r: 2.5 })),
      ...bread.map((b) => ({ ...b, r: 1.5 })),
      ...boulders.map((b) => ({ ...b, r: 1.5 })),
      { x: 22.5, z: 25.5, r: 5.5 }, // training ground
      { x: 16.5, z: 27.5, r: 2.5 }, // the first ledge to hop up
    ];
    trees.push(
      ...scatterTrees(t, {
        kind: 'regular',
        density: 0.075,
        area: { i0: 0, j0: 0, i1: 46, j1: 46 },
        keepClear,
        existing: trees,
      }),
    );

    return { spawn, checkpoints, puzzles, enemies, bread, trees, boulders };
  },
};
