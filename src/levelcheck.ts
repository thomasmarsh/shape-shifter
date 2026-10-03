import { FORMS, FormId, PHYSICS as MOVER } from './forms';
import type { Spot, World } from './world';

// An abstract reachability solver over tiles, so level designs can be checked
// automatically: "this candle can be reached with these forms" and "this place
// cannot be reached without that form". It never runs the real physics. It
// models each tile as one standing surface and asks which hops, flights and
// climbs lead from one surface to another.
//
// Two profiles: 'easy' is what an average player does reliably (use it to prove
// a route exists); 'max' is a generous physical upper bound (use it to prove a
// route does not exist). Bad guys are ignored.
//
// Thin ice (see ICE_SPEED in forms.ts) is checked as if every sheet were whole.
// It holds only a runner, so only the wolf can step onto it, and nobody can
// stand still on it.
//
// Hop-then-fly is a move of its own: with a Bunny and a Fairy, a Bunny shifts at
// the top of her hop and keeps that height. Because of it, every raised thing
// (a ledge, a wall top, a treetop) is a launch pad for the rest of the level.

export type Profile = 'easy' | 'max';

/** The numbers the checker owns: how forgiving each profile is. */
const MARGINS = {
  /** Extra height over the jump apex that still counts as a hop up. */
  hopSlack: { easy: 0.1, max: 0.35 },
  /** Share of the physical range an average player lands reliably. */
  hopRange: { easy: 0.75 },
  hopRangeMax: 0.6, // added to the physical range for 'max'
  /** The fairy's flight: highest climb, and how far she travels. */
  fly: {
    // She keeps rising a little past the ceiling before the climb stops.
    up: { easy: MOVER.flyCeiling, max: MOVER.flyCeiling + 0.65 },
    reach: { easy: 9, max: 16 },
    perDrop: { easy: 0.5, max: 0.85 },
  },
  /** How far a thing (speaker, candle) can be used from. */
  useDistance: 1.6,
  useHeight: 1.5,
  /** The orangutan can grab a trunk if it arrives above the trunk's base minus this. */
  climbSlack: 0.3,
  /** Float heights in water: the tile's water level minus this. */
  float: { human: 0.8, fairy: 0.25 },
  /**
   * Hop-then-fly: a bunny shifts to a fairy at the top of a full hop and keeps
   * that height. Measured with the real physics on flat ground (see
   * routes.test.ts): she hovers at the hop's apex plus a little (+4.5) until
   * her energy runs out 16.3 tiles from the start, then glides down and lands
   * 20.6 tiles away at the starting height. All distances are centre to centre
   * from a standing start; taking off at the very edge of the tile adds up to
   * about a tile (the pilot's best flat gap is 21 tiles of sky).
   */
  hopFly: {
    /** Where she stops hovering, and how far she glides per unit of height still to lose. */
    hover: 16.3,
    glidePerHeight: 0.955,
    /** The hover height the glide is measured from. */
    hoverHeight: 4.5,
    /**
     * Height she can land on above the bunny's apex. Easy: none (she hovers a
     * touch above the apex, but a player cannot count on it). Max: the 0.35
     * walk-up step lets her drift onto a ledge above her feet, plus 0.2. The
     * real ceiling is about +4.85 (measured +4.80). Keep the total under 5.0:
     * great trees stand 5.0 high and must stay Orangutan-only.
     */
    up: { easy: 0, max: MOVER.step + 0.2 },
    /**
     * Easy: the share of the measured range a player gets reliably. Max: tiles
     * added to it, for the body radius (0.3) touching the far edge, and slack.
     */
    rangeShare: 0.75,
    rangeExtra: 1.5,
  },
};

/** Tile middles are this much further apart than the gap between the squares, at most. */
const CENTRE_EXTRA = Math.SQRT2;

/** Forms that move by jumping; their speed and jump come from FORMS. */
const JUMPERS = ['human', 'orangutan', 'bunny', 'wolf'] as const;
type Jumper = (typeof JUMPERS)[number];

/** What the checker says about hop-then-fly for a launch from `a` to a target, for tests. */
export function hopFlyLimits(profile: Profile): {
  /** How far above the launch surface she can land. */
  up: number;
  /** Largest gap between the two squares, when the target is `rise` above the launch surface. */
  range(rise: number): number;
} {
  const h = MARGINS.hopFly;
  const apex = jumpOf('bunny').v ** 2 / (2 * MOVER.gravity);
  const centre = (rise: number): number => h.hover + h.glidePerHeight * Math.max(0, h.hoverHeight - rise);
  return {
    up: apex + h.up[profile],
    range: (rise) =>
      profile === 'easy' ? h.rangeShare * centre(rise) - CENTRE_EXTRA : centre(rise) + h.rangeExtra,
  };
}

/** Jump speed and ground speed of a form, as the player really has them. */
function jumpOf(j: Jumper): { v: number; s: number } {
  const f = FORMS.find((d) => d.id === j)!;
  return { v: f.jump, s: f.speed };
}

export interface Reach {
  /** The tile containing `spot` is a reached surface. */
  canStand(spot: Spot): boolean;
  /** A thing at `spot` can be used from some reached surface. */
  canUse(spot: Spot): boolean;
  /** How many surfaces were reached. */
  readonly tiles: number;
  has(i: number, j: number): boolean;
}

export function explore(world: World, from: Spot, forms: readonly FormId[], profile: Profile): Reach {
  const { width, depth } = world;
  for (const f of forms) {
    if (f !== 'human' && f !== 'fairy' && f !== 'orangutan' && f !== 'bunny' && f !== 'wolf') {
      throw new Error(`levelcheck does not know how to move as ${f}`);
    }
  }
  const can = new Set(forms);

  // ---- surfaces ----------------------------------------------------------

  const tileIndex = (i: number, j: number): number => j * width + i;
  const onGrid = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < width && j < depth;

  // Read the world once. The search below asks about the same tiles millions of
  // times, so it works from these flat arrays and never calls the world again.
  /** The tile has something to stand on (thin ice counts, a hole does not). */
  const exists = new Uint8Array(width * depth);
  /** The tile is a thin-ice sheet, whole or broken. */
  const ice = new Uint8Array(width * depth);
  /** Solid height of the tile with every thin-ice sheet counted as whole. */
  const top = new Float64Array(width * depth);
  /** Height of the surface a human, orangutan, bunny or wolf stands on (floating in water). */
  const surfaceHuman = new Float64Array(width * depth);
  /** The same for the fairy, who floats a little higher. */
  const surfaceFairy = new Float64Array(width * depth);
  /** How tall the tree block on the tile is, 0 if none. */
  const tree = new Float64Array(width * depth);
  /** Bare ground under the tile (no trees or speakers). */
  const ground = new Float64Array(width * depth);

  for (let j = 0; j < depth; j++) {
    for (let i = 0; i < width; i++) {
      const k = tileIndex(i, j);
      const x = i + 0.5;
      const z = j + 0.5;
      const isIce = world.isThinIce(x, z);
      const t = Math.max(world.solidAt(x, z), world.iceTopAt(x, z));
      ice[k] = isIce ? 1 : 0;
      exists[k] = isIce || !world.isVoid(x, z) ? 1 : 0;
      top[k] = t;
      tree[k] = world.treeAt(x, z);
      ground[k] = world.groundAt(x, z);
      if (isIce || !world.isWater(x, z)) {
        surfaceHuman[k] = t;
        surfaceFairy[k] = t;
      } else {
        const level = world.waterLevelAt(x, z);
        surfaceHuman[k] = Math.max(t, level - MARGINS.float.human);
        surfaceFairy[k] = Math.max(t, level - MARGINS.float.fairy);
      }
    }
  }

  /** Height of the surface a form stands on in this tile. */
  const surface = (k: number, form: FormId): number => (form === 'fairy' ? surfaceFairy[k] : surfaceHuman[k]);

  // The lowest surface of each kind anywhere bounds how far a drop can go.
  let lowHuman = Infinity;
  let lowFairy = Infinity;
  for (let k = 0; k < width * depth; k++) {
    if (!exists[k]) continue;
    lowHuman = Math.min(lowHuman, surfaceHuman[k]);
    lowFairy = Math.min(lowFairy, surfaceFairy[k]);
  }

  /** Gap between the two unit squares of tiles A and B. */
  const gap = (ai: number, aj: number, bi: number, bj: number): number =>
    Math.hypot(Math.max(0, Math.abs(bi - ai) - 1), Math.max(0, Math.abs(bj - aj) - 1));

  // ---- move rules --------------------------------------------------------

  const g = MOVER.gravity;
  const apexOf = (j: Jumper): number => jumpOf(j).v ** 2 / (2 * g);
  /** How far a hop reaches when the target is `d` lower (negative: higher). */
  const hopRange = (j: Jumper, d: number): number => {
    const { v, s } = jumpOf(j);
    const root = v * v + 2 * g * d;
    if (root < 0) return -Infinity;
    const r = (s * (v + Math.sqrt(root))) / g;
    return profile === 'easy' ? MARGINS.hopRange.easy * r : r + MARGINS.hopRangeMax;
  };
  const flyUp = MARGINS.fly.up[profile];
  const flyRange = (d: number): number =>
    MARGINS.fly.reach[profile] + MARGINS.fly.perDrop[profile] * Math.max(0, d);

  // Each jumper's numbers, worked out once rather than for every candidate.
  const jumps = new Map<Jumper, { v: number; s: number; apex: number; up: number }>();
  for (const j of JUMPERS) {
    const { v, s } = jumpOf(j);
    jumps.set(j, { v, s, apex: apexOf(j), up: apexOf(j) + MARGINS.hopSlack[profile] });
  }
  const hopFly = can.has('bunny') && can.has('fairy') ? hopFlyLimits(profile) : null;

  /**
   * The farthest any move of a form can reach from a tile whose surface is `a`,
   * to limit the search window. A drop can be no deeper than down to the lowest
   * surface, so this is tighter than using the world's highest point.
   */
  const windowOf = (form: FormId, a: number): number => {
    if (form === 'fairy') return flyRange(a - lowFairy);
    const drop = a - lowHuman;
    const hop = hopRange(form as Jumper, drop);
    // The combined move is her farthest, and it has no drop-off, so use the flat range.
    return form === 'bunny' && hopFly ? Math.max(hop, hopFly.range(-drop)) : hop;
  };

  /**
   * Is the straight line between two tile centres free of anything taller than
   * `limit`? Tiles the line only touches at a corner count in the easy profile
   * (be careful) but not in max (be generous).
   */
  const lineClear = (ai: number, aj: number, bi: number, bj: number, limit: number): boolean => {
    const dx = bi - ai;
    const dz = bj - aj;
    const eps = 1e-9;
    const check = (i: number, j: number): boolean =>
      (i === ai && j === aj) || (i === bi && j === bj) || !onGrid(i, j) || top[tileIndex(i, j)] <= limit;
    // Walk the grid along the line, tile by tile.
    let i = ai;
    let j = aj;
    const stepI = Math.sign(dx);
    const stepJ = Math.sign(dz);
    let tI = dx === 0 ? Infinity : 0.5 / Math.abs(dx);
    let tJ = dz === 0 ? Infinity : 0.5 / Math.abs(dz);
    const dI = dx === 0 ? Infinity : 1 / Math.abs(dx);
    const dJ = dz === 0 ? Infinity : 1 / Math.abs(dz);
    while (i !== bi || j !== bj) {
      if (Math.abs(tI - tJ) < eps) {
        // Exactly through a corner: the two side tiles are only touched.
        if (profile === 'easy' && (!check(i + stepI, j) || !check(i, j + stepJ))) return false;
        i += stepI;
        j += stepJ;
        tI += dI;
        tJ += dJ;
      } else if (tI < tJ) {
        i += stepI;
        tI += dI;
      } else {
        j += stepJ;
        tJ += dJ;
      }
      if (!check(i, j)) return false;
    }
    return true;
  };

  // ---- the search --------------------------------------------------------

  const reached = new Uint8Array(width * depth);
  const stood = new Float32Array(width * depth);
  let count = 0;
  const queue: number[] = [];

  const reach = (k: number, height: number): void => {
    if (reached[k]) return;
    reached[k] = 1;
    stood[k] = height;
    count++;
    queue.push(k);
  };

  const fi = Math.floor(from.x);
  const fj = Math.floor(from.z);
  if (onGrid(fi, fj) && exists[tileIndex(fi, fj)]) reach(tileIndex(fi, fj), surface(tileIndex(fi, fj), forms[0] ?? 'human'));

  const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let head = 0; head < queue.length; head++) {
    const ak = queue[head];
    const ai = ak % width;
    const aj = Math.floor(ak / width);

    const onIce = ice[ak] === 1;
    for (const form of can) {
      // Nobody can stand on thin ice, so leaving it takes a runner's moves; in
      // 'easy' that is the wolf, plus a fairy who has dropped through and
      // flaps away. 'max' lets every form leave, since a shift and a jump in
      // the same frame is physically possible.
      if (onIce && profile === 'easy' && form !== 'wolf' && form !== 'fairy') continue;
      const a = surface(ak, form);
      const surfaces = form === 'fairy' ? surfaceFairy : surfaceHuman;

      // Walking: every form, to a neighbour that is at most a step higher.
      for (const [di, dj] of NEIGHBOURS) {
        const bi = ai + di;
        const bj = aj + dj;
        if (!onGrid(bi, bj)) continue;
        const bk = tileIndex(bi, bj);
        if (!exists[bk] || reached[bk]) continue;
        // Only a runner can step onto thin ice; a fairy on it cannot walk off.
        if (ice[bk] && form !== 'wolf') continue;
        if (onIce && profile === 'easy' && form === 'fairy') continue;
        const b = surfaces[bk];
        if (b - a <= MOVER.step) reach(bk, b);
      }

      // Per-form numbers for this tile, worked out once for the whole window.
      const jump = form === 'fairy' ? null : jumps.get(form as Jumper)!;
      const w = Math.ceil(windowOf(form, a)) + 1;
      const j0 = Math.max(0, aj - w);
      const j1 = Math.min(depth - 1, aj + w);
      const i0 = Math.max(0, ai - w);
      const i1 = Math.min(width - 1, ai + w);
      // The highest a target can be and still be reached by any move of this form.
      const canFlyFrom = a + flyUp;
      const hopFlyUp = form === 'bunny' && hopFly ? hopFly.up : -Infinity;
      const highestHop = jump ? Math.max(jump.up, hopFlyUp) : flyUp;

      for (let bj = j0; bj <= j1; bj++) {
        for (let bi = i0; bi <= i1; bi++) {
          const bk = tileIndex(bi, bj);
          if (reached[bk] || !exists[bk]) continue;
          if (ice[bk] && form !== 'wolf') continue;
          const b = surfaces[bk];

          if (form === 'fairy') {
            // She does not jump: she flaps up, then glides.
            if (b > canFlyFrom) continue;
            const D = gap(ai, aj, bi, bj);
            if (D <= flyRange(a - b) && lineClear(ai, aj, bi, bj, canFlyFrom)) reach(bk, b);
            continue;
          }

          // Orangutans can also grab trunks, which need no height check here.
          const treeHere = form === 'orangutan' && tree[bk] > 0;
          if (b - a > highestHop && !treeHere) continue;
          const D = gap(ai, aj, bi, bj);
          const d = a - b;

          const jumper = jump!;
          if (b - a <= jumper.up && D <= hopRange(form as Jumper, d) && lineClear(ai, aj, bi, bj, a + jumper.apex)) {
            reach(bk, b);
            continue;
          }

          // Hop-then-fly: a bunny turns into a fairy at the top of her hop and
          // keeps that height. It starts from any surface a bunny can hop from.
          if (
            form === 'bunny' &&
            hopFly &&
            b - a <= hopFly.up &&
            D <= hopFly.range(b - a) &&
            lineClear(ai, aj, bi, bj, a + hopFly.up)
          ) {
            reach(bk, b);
            continue;
          }

          // The orangutan grabs a trunk in mid-air if it arrives above its base.
          if (treeHere) {
            const base = ground[bk];
            if (a < base - MARGINS.climbSlack) continue;
            const next = Math.abs(bi - ai) + Math.abs(bj - aj) === 1;
            if (next || (D <= hopRange('orangutan', a - base) && lineClear(ai, aj, bi, bj, a + jumper.apex))) {
              reach(bk, b);
            }
          }
        }
      }
    }
  }

  return {
    tiles: count,
    has: (i, j) => onGrid(i, j) && reached[tileIndex(i, j)] === 1,
    canStand: (spot) => {
      const i = Math.floor(spot.x);
      const j = Math.floor(spot.z);
      return onGrid(i, j) && reached[tileIndex(i, j)] === 1;
    },
    canUse: (spot) => {
      const spotGround = world.groundAt(spot.x, spot.z);
      const r = Math.ceil(MARGINS.useDistance);
      const ci = Math.floor(spot.x);
      const cj = Math.floor(spot.z);
      for (let j = cj - r; j <= cj + r; j++) {
        for (let i = ci - r; i <= ci + r; i++) {
          if (!onGrid(i, j) || !reached[tileIndex(i, j)]) continue;
          // Nobody can stand still on thin ice, so nothing can be used from it.
          if (ice[tileIndex(i, j)]) continue;
          if (Math.hypot(i + 0.5 - spot.x, j + 0.5 - spot.z) > MARGINS.useDistance) continue;
          if (Math.abs(stood[tileIndex(i, j)] - spotGround) < MARGINS.useHeight) return true;
        }
      }
      return false;
    },
  };
}
