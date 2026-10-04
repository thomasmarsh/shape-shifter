import { BOSS_LEVEL } from '../forms';
import { EnemySpot, HintZone, Island, IslandLayout, Kind, Spot } from '../layout';

// Cinderhold, the last island (x 1592..1681): ash, black glass and one arena,
// the Ring. It has no candles. You land low, 9 tiles of sky east of Kestrel
// Rock, and walk up the Climb into the Ring. The Warden stands in the middle,
// on a floor of black stone that fills the Ring but for a walk of ash four
// tiles wide round it: the Lid. Under the Lid is the Deep, a lake 4 deep, and
// in it the Eel. The Lid drops when the Warden is beaten (see the
// bosses' contract in forms.ts). Two Stairs stand on the Ring's north and east
// sides, with steps 1 high: a bad guy cannot climb them, and from their tops
// the wings carry a Human anywhere in the Ring.

/** The Landing: low enough and near enough for a Fairy from Kestrel Rock (1). */
export const LANDING = { i0: 1592, j0: 25, i1: 1603, j1: 36, h: 1 };
/** The Climb: 18 tiles of ramp from the Landing up to the Ring. */
export const CLIMB = { i0: 1604, j0: 27, i1: 1621, j1: 34 };
/** The Ring: the arena's floor, with a low rim round it. */
export const RING = { i0: 1622, j0: 14, i1: 1667, j1: 49, h: 6 };
/** The rim is higher than a walking step, so nobody walks off the Ring by accident. */
export const RIM = RING.h + 0.6;
/**
 * The Deep: a lake under the Lid, a rectangle with round corners that leaves
 * a walk of ash 4 tiles wide inside the rim (x 1627..1662, z 19..44).
 */
export const DEEP = { x: 1645, z: 32, rx: 18, rz: 13, level: RING.h - 0.3, bed: RING.h - 4.3 };
/** The Stairs: steps 1 high and 2 deep, six of them, to a top 6 above the Ring. */
export const STEPS = 6;
export const STAIR_TOP = RING.h + STEPS;
/** The North Stair climbs north from the Ring's north side. */
export const NORTH_STAIR = { i0: 1641, i1: 1648, top: { j0: 0, j1: 3 } };
/** The East Stair climbs east from the Ring's east side. */
export const EAST_STAIR = { j0: 28, j1: 35, top: { i0: 1678, i1: 1681 } };

/** True for a tile of the Deep. */
export const inDeep = (i: number, j: number): boolean =>
  ((i + 0.5 - DEEP.x) / DEEP.rx) ** 4 + ((j + 0.5 - DEEP.z) / DEEP.rz) ** 4 <= 1;

export const cinderhold: Island = {
  id: 'cinderhold',
  name: 'Cinderhold',
  build(t): IslandLayout {
    // ---- The Landing and the Climb ----------------------------------------------
    t.rect(LANDING.i0, LANDING.j0, LANDING.i1, LANDING.j1, (i, j) => t.set(i, j, LANDING.h, Kind.Ash));
    const rise = (RING.h - LANDING.h) / (CLIMB.i1 - CLIMB.i0 + 1);
    t.rect(CLIMB.i0, CLIMB.j0, CLIMB.i1, CLIMB.j1, (i, j) => t.set(i, j, LANDING.h + (i - CLIMB.i0 + 1) * rise, Kind.Ash));

    // ---- The Ring, its rim and the two Stairs -----------------------------------
    const northStair = (i: number): boolean => i >= NORTH_STAIR.i0 && i <= NORTH_STAIR.i1;
    const eastStair = (j: number): boolean => j >= EAST_STAIR.j0 && j <= EAST_STAIR.j1;
    const climb = (j: number): boolean => j >= CLIMB.j0 && j <= CLIMB.j1;
    t.rect(RING.i0, RING.j0, RING.i1, RING.j1, (i, j) => {
      const edge = i === RING.i0 || i === RING.i1 || j === RING.j0 || j === RING.j1;
      const open = (i === RING.i0 && climb(j)) || (j === RING.j0 && northStair(i)) || (i === RING.i1 && eastStair(j));
      if (edge && !open) t.set(i, j, RIM, Kind.Obsidian);
      else t.set(i, j, RING.h, Kind.Ash);
    });
    for (let s = 1; s < STEPS; s++) {
      // Step s is two tiles deep and s above the Ring.
      const out = 2 * s - 1;
      t.rect(NORTH_STAIR.i0, RING.j0 - out - 1, NORTH_STAIR.i1, RING.j0 - out, (i, j) => t.set(i, j, RING.h + s, Kind.Obsidian));
      t.rect(RING.i1 + out, EAST_STAIR.j0, RING.i1 + out + 1, EAST_STAIR.j1, (i, j) => t.set(i, j, RING.h + s, Kind.Obsidian));
    }
    t.rect(NORTH_STAIR.i0, NORTH_STAIR.top.j0, NORTH_STAIR.i1, NORTH_STAIR.top.j1, (i, j) => t.set(i, j, STAIR_TOP, Kind.Obsidian));
    t.rect(EAST_STAIR.top.i0, EAST_STAIR.j0, EAST_STAIR.top.i1, EAST_STAIR.j1, (i, j) => t.set(i, j, STAIR_TOP, Kind.Obsidian));

    // ---- The Deep, under its Lid ------------------------------------------------
    t.rect(RING.i0, RING.j0, RING.i1, RING.j1, (i, j) => {
      if (!inDeep(i, j)) return;
      t.set(i, j, DEEP.bed, Kind.Coral);
      t.setWater(i, j, true, DEEP.level);
      t.setLid(i, j, RING.h);
    });

    const checkpoints: (Spot & { id: string })[] = [
      { id: 'cinderhold', x: 1595.5, z: 30.5 },
      { id: 'ch-ring', x: 1612.5, z: 30.5 }, // on the Climb: farther from the Deep than the Eel spits
    ];
    const enemies: EnemySpot[] = [
      { x: 1645.5, z: 30.5, tester: false, kind: 'warden', minLevel: BOSS_LEVEL }, // on the Lid, looking west at the Climb
      { x: 1645.5, z: 34.5, tester: false, kind: 'eel', minLevel: BOSS_LEVEL }, // under it
    ];
    const bread: NonNullable<IslandLayout['bread']> = [
      { id: 'ch-landing', x: 1598.5, z: 33.5, amount: 10 },
      { id: 'ch-nw', x: 1626.5, z: 17.5, amount: 5 },
      { id: 'ch-se', x: 1663.5, z: 46.5, amount: 5 },
      { id: 'ch-north', x: 1644.5, z: 1.5, amount: 5 },
      { id: 'ch-east', x: 1680.5, z: 31.5, amount: 5 },
    ];
    const hints: HintZone[] = [
      { id: 'ch-landing', x: 1599.5, z: 30.5, r: 3, text: 'Ash underfoot, and no candle anywhere. Something waits at the top of the Climb.' },
      { id: 'ch-ring', x: 1625.5, z: 29.5, r: 3, text: 'When the red ring shows round the Warden, walk out of the ring, then strike while it stands still. Two Stairs, north and east, are too tall for it: rest there.' },
      { id: 'ch-lid', x: 1625.5, z: 36.5, r: 3, text: 'The black floor rings hollow. Under it is water, as deep as a Human dives. What swims there is quick: swim sideways when it glows.' },
      { id: 'ch-north', x: 1644.5, z: 16.5, r: 3, text: 'Steps too tall for the Warden, but not for its rocks. The top, between the beacons, is out of reach of what spits from the lake, and from it wings carry you anywhere in the Ring.' },
      { id: 'ch-east', x: 1665.5, z: 31.5, r: 3, text: 'Steps too tall for the Warden, but not for its rocks. The top, between the beacons, is out of reach of what spits from the lake, and from it wings carry you anywhere in the Ring.' },
    ];
    const arrivals: NonNullable<IslandLayout['arrivals']> = [
      {
        id: 'cinderhold',
        x: 1595.5,
        z: 30,
        radius: 3.5,
        eyebrow: 'The last island',
        title: 'Cinderhold',
        html: '<p>Ash, black glass and one great ring of stone.</p><p class="soft">No candles burn here. Two things guard the end of the sky: one walks, and one swims.</p>',
      },
    ];
    return { checkpoints, puzzles: [], enemies, bread, trees: [], hints, arrivals };
  },
};
