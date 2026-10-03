import { EnemySpot, Island, Kind, PuzzleSpot, Spot, TreeSpot } from '../layout';
import { buildRun } from './frostfang-run';

// Island 4: Frostfang. This file is the west half (everything at x < 243): the
// hub and the five candles. The lake shore, the frozen lake and the Winter
// Wolf's exit run are the east half, built by `buildRun` in frostfang-run.ts and
// added at the end of `build` below.
//
// The player arrives with four forms (Human, Fairy, Orangutan, Bunny) and finds
// five candles, each placed so every form does the one thing only it can do:
//   Human +1 and the sword, Orangutan +1 and the great pines (ground + 5),
//   Bunny +4, Fairy +3 from the last ground she stood on (a treetop counts),
//   and the new trick: a Bunny that turns into a Fairy at the top of her hop
//   keeps that height (about +4.4 up, and 11 tiles across the flat reliably).
//
// Everything raised is a launch pad (a ledge, a wall top, a treetop), so the
// hub is never higher than 15 (its relief only dips), there are no boulders, and
// the only trees are the great pines (seven here, one in the east half). The
// camera sits south-west and looks north-east, so everything rises toward the
// north and east and nothing hides a thing that matters.
//
// The hub is a snowfield at height 15 with dips in it (never a bump). Around it,
// clockwise from the north-west: the Snow Steps, the Fang, the Pine Road, the
// Undercliff and the Needle. Its east edge (x = 242) meets the lake shore.
const HUB = 15;
/** The sunken trail across the hub, from the landing toward the lake past x = 243. */
const TRAIL: [number, number][] = [
  [213, 40], [218, 39], [224, 39.5], [230, 36], [235, 33], [240, 31],
];

/** A flat block of ground, bounds inclusive. */
function slab(
  t: Parameters<Island['build']>[0],
  i0: number,
  j0: number,
  i1: number,
  j1: number,
  h: number,
  kind: Kind = Kind.Snow,
): void {
  t.rect(i0, j0, i1, j1, (i, j) => t.set(i, j, h, kind));
}

/** Empty sky. */
function sky(t: Parameters<Island['build']>[0], i0: number, j0: number, i1: number, j1: number): void {
  t.rect(i0, j0, i1, j1, (i, j) => t.clear(i, j));
}

export const frostfang: Island = {
  id: 'frostfang',
  name: 'Frostfang',
  build(t) {
    // ---- Zone 0: the landing and the hub snowfield ----------------------
    // The landing is what Highcrag's top stair step (17) hops down onto.
    const landing: Spot[] = [];
    t.ellipse(208, 40, 5.2, 5, (i, j) => {
      t.set(i, j, HUB, Kind.Snow);
      landing.push({ x: i + 0.5, z: j + 0.5 });
    });
    // The hub itself: x 204..242, z 22..47, never higher than 15. Its outline is
    // nibbled where no zone needs the edge: the z=22 edge is needed for x 206..214
    // and 218..224, the z=47 edge for x 209..242 (except a few bits between zones),
    // the east edge x=242 for z 24..39.
    slab(t, 204, 22, 242, 47, HUB);
    sky(t, 204, 22, 205, 22);
    sky(t, 204, 23, 204, 23);
    sky(t, 241, 22, 242, 22);
    sky(t, 242, 23, 242, 23);
    sky(t, 204, 46, 205, 47);
    sky(t, 206, 47, 207, 47);
    const nibble = (i: number, j: number): void => t.clear(i, j);
    // West edge, away from the landing (z 35..45).
    for (let j = 24; j <= 33; j++) {
      if (t.hash(204, j, 11) > 0.45) nibble(204, j);
      if (t.hash(205, j, 12) > 0.82 && t.hash(204, j, 11) > 0.45) nibble(205, j);
    }
    // North edge between and beyond the zones (x 215..217 and 225..240).
    for (let i = 215; i <= 240; i++) {
      if ((i >= 218 && i <= 224) || i < 215) continue;
      if (t.hash(i, 22, 13) > 0.4) nibble(i, 22);
    }
    for (const i of [216, 226, 230, 235, 238]) nibble(i, 23);
    // South edge: a few bits between the Needle, the Undercliff and the Pine Road.
    for (const [i, j] of [[215, 47], [217, 47], [218, 47], [218, 46], [239, 47], [240, 47], [241, 47], [241, 46]]) nibble(i, j);
    // East edge below the shore (x=242 must stay straight for z 24..39).
    for (let j = 40; j <= 46; j++) {
      if (t.hash(242, j, 14) > 0.35) nibble(242, j);
      if (t.hash(241, j, 15) > 0.8 && t.hash(242, j, 14) > 0.35) nibble(241, j);
    }

    // ---- Zone 1, the Snow Steps: hop up, sword out, hop again ------------
    // Terrace A is hub + 4: only the Bunny gets up. A wall (terrace + 2) splits
    // it: a Human cannot climb it, a Bunny or Fairy can. The speaker and a guard
    // wait in the south part, the candle and an archer in the north part.
    slab(t, 206, 13, 214, 21, HUB + 4);
    slab(t, 206, 16, 214, 16, HUB + 6, Kind.Stone);

    // ---- Zone 2, the Needle: hop, then fly ------------------------------
    // A rock at hub + 4 (too high to fly up to), 8 tiles of sky south of the
    // rim (too far to hop). Its far side is 17 tiles (edge to edge) from
    // Highcrag's top step (x 195..198, z 38..42, height 17), so a Fairy alone
    // cannot reach it from there either.
    slab(t, 210, 56, 212, 57, HUB + 4, Kind.Stone);

    // ---- Zone 3, the Pine Road: climb, fight, hop ------------------------
    // Great pines on single-tile pillars in the sky, each pillar a tile higher
    // than the last (and the treetop five above that), so a Bunny's
    // hop-then-fly from the hub or from the first treetop cannot reach Owl Rock.
    slab(t, 236, 49, 236, 49, 16, Kind.Stone); // T2
    slab(t, 238, 51, 238, 51, 17, Kind.Stone); // T3
    slab(t, 239, 53, 239, 53, 18, Kind.Stone); // T4
    slab(t, 237, 55, 237, 55, 19, Kind.Stone); // T5, its top is 24
    // Owl Rock is 25: one empty tile past T5, and the Orangutan hops +1.
    slab(t, 237, 57, 242, 61, 25, Kind.Stone);
    // The candle step: Owl Rock + 4, Bunny only.
    slab(t, 241, 57, 242, 58, 29, Kind.Stone);

    // ---- Zone 4, the Undercliff: drop in, fight, fly, climb out ----------
    // A shelf 6 under the hub's south rim: nothing but a pine gets back up.
    slab(t, 221, 48, 233, 53, HUB - 6);
    // The candle rock is 7 tiles of sky south of the shelf: a Fairy flight.
    slab(t, 222, 61, 224, 62, HUB - 6, Kind.Stone);

    // ---- Zone 5, the Fang: every step a different shape ------------------
    slab(t, 218, 15, 224, 21, HUB + 4); // tier 1: +4 from the hub, Bunny
    slab(t, 233, 12, 239, 19, HUB + 7); // tier 2: +3 over 8 tiles of sky, Fairy
    slab(t, 233, 5, 239, 11, HUB + 13, Kind.Stone); // tier 3: above the pine top (27)
    slab(t, 224, 6, 226, 7, HUB + 17, Kind.Stone); // the tip: +4 over 6 tiles of sky

    const pine = (i: number, j: number): TreeSpot => ({ x: i + 0.5, z: j + 0.5, kind: 'greatPine' });
    const trees: TreeSpot[] = [
      pine(236, 46), // T1, on the hub
      pine(236, 49),
      pine(238, 51),
      pine(239, 53),
      pine(237, 55), // T5
      pine(231, 48), // the Undercliff's way out
      pine(236, 13), // on tier 2: the way to tier 3
    ];

    const checkpoints = [
      { id: 'frostfang', x: 209.5, z: 41.5 },
      { id: 'ff-north', x: 228.5, z: 24.5 },
      { id: 'ff-south', x: 229.5, z: 43.5 },
    ];

    const puzzles: PuzzleSpot[] = [
      { id: 'ff-steps', speaker: { x: 207.5, z: 18.5 }, candle: { x: 207.5, z: 14.5 }, melody: [2, 0, 4, 6, 1, 5] },
      { id: 'ff-needle', speaker: { x: 211.5, z: 46.5 }, candle: { x: 212.5, z: 57.5 }, melody: [6, 2, 7, 3, 0, 4] },
      { id: 'ff-road', speaker: { x: 238.5, z: 60.5 }, candle: { x: 242.5, z: 57.5 }, melody: [3, 6, 0, 1, 5, 2] },
      { id: 'ff-under', speaker: { x: 222.5, z: 51.5 }, candle: { x: 224.5, z: 61.5 }, melody: [5, 1, 3, 7, 2, 6] },
      { id: 'ff-fang', speaker: { x: 238.5, z: 8.5 }, candle: { x: 224.5, z: 6.5 }, melody: [0, 5, 2, 4, 7, 1] },
    ];

    const guard = (x: number, z: number): EnemySpot => ({ x, z, tester: false });
    const archer = (x: number, z: number): EnemySpot => ({ x, z, tester: false, kind: 'archer', minLevel: 3 });
    const enemies: EnemySpot[] = [
      // The Snow Steps: a guard by the speaker, an archer behind the wall.
      guard(211.5, 19.5),
      archer(213.5, 13.5),
      // Owl Rock.
      guard(241.5, 60.5),
      guard(237.5, 58.5),
      // The Undercliff.
      guard(225.5, 50.5),
      guard(228.5, 52.5),
      // The Fang's top tier.
      guard(236.5, 6.5),
      archer(238.5, 5.5),
    ];

    const bread = [
      { id: 'ff-steps', x: 210.5, z: 14.5, amount: 5 },
      { id: 'ff-hub', x: 222.5, z: 35.5, amount: 5 },
      { id: 'ff-owl', x: 239.5, z: 59.5, amount: 5 },
      { id: 'ff-under', x: 230.5, z: 51.5, amount: 5 },
      { id: 'ff-fang', x: 235.5, z: 17.5, amount: 5 },
    ];

    const hints = [
      { id: 'ff-steps', x: 210, z: 24, r: 4, text: 'Steps for a Bunny. But a Bunny cannot fight what waits on top.' },
      {
        id: 'ff-needle',
        x: 211.5,
        z: 44.5,
        r: 3.5,
        text: 'Too high to fly up to, too far to hop. Hop first, and change shape at the very top.',
      },
      { id: 'ff-road', x: 233, z: 43.5, r: 4, text: 'A road of pines over the sky.' },
      { id: 'ff-under', x: 225, z: 45, r: 4, text: 'Anyone can drop down there. Only a climber comes back up.' },
      { id: 'ff-fang', x: 221, z: 24, r: 3.5, text: 'The Fang: every step up needs a different shape.' },
    ];

    const arrivals = [
      {
        id: 'frostfang',
        x: 208,
        z: 40,
        radius: 3.5,
        eyebrow: 'New island',
        title: 'Frostfang',
        html: '<p>Five candle lights are hidden in the snow, and the next form waiting is the <b>Winter Wolf</b>.</p><p class="soft">The ice on the lake cracks under everything you can become, for now.</p>',
      },
    ];

    // ---- The hub's relief: downward only ---------------------------------
    // Raised ground is a launch pad, lowered ground is not (it can only reduce
    // what any form reaches), so the hub gets dips and never a bump. Depth is
    // counted in quarters: 0 is 15, 3 is 14.25 (the floor). Neighbours differ by
    // at most one quarter, so every dip can be walked without jumping.
    const keep: Spot[] = [
      ...puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...checkpoints.flatMap((c) => [c, { x: c.x - 1, z: c.z + 1 }]),
      ...bread,
      ...trees,
      ...landing,
    ];
    const depth = new Map<number, number>();
    const key = (i: number, j: number): number => j * 1000 + i;
    const tiles: [number, number][] = [];
    for (let j = 22; j <= 47; j++) for (let i = 204; i <= 242; i++) if (t.get(i, j) === HUB) tiles.push([i, j]);
    const forced = (i: number, j: number): boolean =>
      j <= 24 || j >= 45 || i >= 240 || keep.some((k) => Math.hypot(k.x - (i + 0.5), k.z - (j + 0.5)) <= 2.5);
    /** Distance from a tile centre to the nearest point of a line of waypoints. */
    const trailDistance = (x: number, z: number): number => {
      let best = Infinity;
      for (let n = 1; n < TRAIL.length; n++) {
        const [ax, az] = TRAIL[n - 1];
        const [bx, bz] = TRAIL[n];
        const len2 = (bx - ax) ** 2 + (bz - az) ** 2;
        const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / len2));
        best = Math.min(best, Math.hypot(x - (ax + u * (bx - ax)), z - (az + u * (bz - az))));
      }
      return best;
    };
    /** How deep an oval hollow is at a point: 0 outside, 1 at the rim, `most` at the middle. */
    const hollow = (x: number, z: number, cx: number, cz: number, rx: number, rz: number, most: number, i: number, j: number): number => {
      const r = Math.hypot((x - cx) / rx, (z - cz) / rz) + (t.hash(i, j, 21) - 0.5) * 0.16;
      if (r >= 1) return 0;
      return Math.max(1, Math.min(most, Math.ceil((1 - r) * most * 1.35)));
    };
    for (const [i, j] of tiles) {
      const x = i + 0.5;
      const z = j + 0.5;
      let d = 0;
      d = Math.max(d, hollow(x, z, 217, 31, 5, 4, 3, i, j)); // the frozen tarn
      d = Math.max(d, hollow(x, z, 233, 27, 3.6, 2.6, 2, i, j));
      d = Math.max(d, hollow(x, z, 222, 41, 4.6, 2.6, 2, i, j));
      d = Math.max(d, hollow(x, z, 209, 29, 3.4, 2.2, 2, i, j));
      const td = trailDistance(x, z);
      if (td < 1.3 + (t.hash(i, j, 22) - 0.5) * 0.6) d = Math.max(d, td < 0.55 && t.hash(i, j, 23) > 0.4 ? 2 : 1);
      depth.set(key(i, j), forced(i, j) ? 0 : d);
    }
    // Flatten toward the forced-flat places until every neighbour step is a quarter.
    for (let changed = true; changed; ) {
      changed = false;
      for (const [i, j] of tiles) {
        let d = depth.get(key(i, j))!;
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            const n = depth.get(key(i + di, j + dj));
            if (n !== undefined && d > n + 1) d = n + 1;
          }
        }
        if (d !== depth.get(key(i, j))) {
          depth.set(key(i, j), d);
          changed = true;
        }
      }
    }
    for (const [i, j] of tiles) {
      const d = depth.get(key(i, j))!;
      if (d > 0) t.set(i, j, HUB - 0.25 * d, d === 3 ? Kind.Ice : Kind.Snow);
    }
    // Flush patches of rock and ice for colour, at whatever height the ground is.
    const patch = (cx: number, cz: number, rx: number, rz: number, kind: Kind): void => {
      for (const [i, j] of tiles) {
        if (forced(i, j) || depth.get(key(i, j)) === 3) continue;
        const r = Math.hypot((i + 0.5 - cx) / rx, (j + 0.5 - cz) / rz) + (t.hash(i, j, 24) - 0.5) * 0.4;
        if (r < 1) t.set(i, j, t.get(i, j), kind);
      }
    };
    patch(225, 29, 2.4, 1.6, Kind.Stone);
    patch(236, 38, 2.2, 2, Kind.Ice);
    patch(213, 27, 1.8, 1.4, Kind.Stone);
    patch(229, 40, 2, 1.3, Kind.Stone);

    // ---- The east half: the shore, the frozen lake and the exit run ------
    const run = buildRun(t);
    return {
      checkpoints: [...checkpoints, ...(run.checkpoints ?? [])],
      puzzles,
      enemies: [...enemies, ...(run.enemies ?? [])],
      bread: [...bread, ...(run.bread ?? [])],
      trees: [...trees, ...(run.trees ?? [])],
      hints: [...hints, ...(run.hints ?? [])],
      arrivals,
    };
  },
};
