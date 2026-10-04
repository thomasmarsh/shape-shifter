import { fitsUnderKelp, FORMS, FormId, PHYSICS as MOVER } from './forms';
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
// It holds only a runner, so only the wolf or the cheetah can step onto it, and
// nobody can stand still on it. A brittle sheet (BRITTLE_SPEED) takes only the
// cheetah: the wolf breaks it at once.
//
// A timed gate (see `setGate` in layout.ts) is a wall with no top for every form
// while it is shut, like a tangle for a form that does not fit. It opens for a reach when one of
// its plates is reached and some form in the set can run from the plate to the
// far side of the gate in time (the straight-line distance, deliberately
// optimistic: the pilot proves real routes; 'easy' keeps 0.4 s in hand). Open, its
// tiles are plain ground for the whole set, which can open further gates in turn.
// Nothing can be used from a gate tile and nobody can stop on one.
//
// A root tangle (see `setTangle` in layout.ts) has a gap: plain ground for a body
// no taller than it (the Ant in a 0.25 tangle; the Ant and the Snake in a 0.35
// hole), and a wall as tall as NO_STAND for every other form: none walks, hops,
// flies or hop-then-flies onto one, and none can pass a flight line over one. A
// form that fits walks on and off, and can land on one, but cannot hop from one.
// A ring of tangle must be 4-connected (no diagonal-only joins), because the 'max'
// profile lets a flight line pass through the corner where two tiles touch.
//
// A form walks up at most its own step (the Snake's is 1.0, the rest 0.35), on
// both profiles: that is exact physics, not skill. The Snake moves like a slow
// Human, floats, does not dive and holds no sheet of thin ice.
//
// A kelp mat (see `setKelp` in layout.ts) is a wall like a tangle for every form
// that does not fit under it (dive - height < depth): no walking, hopping,
// flying or hop-then-flying onto one, and no flight or hop line over one. A form
// that fits walks or swims in from any side and can land on one, but cannot hop
// from one. Out of a mat it swims on to any water tile of about the same level,
// or onto land no higher than a step above its ceiling under the mat.
//
// The Mermaid walks like anyone, floats like the Human and hops (with her land
// speed, since in the air she moves at that) only from a water tile. Diving
// shows only in `canUse`: from a water tile a thing can be used from any depth
// the forms there can dive to.
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
  /**
   * The cheetah's hop range, as an offset from the ideal range 2sv/g. It runs at
   * full speed from the first frame, so a player gets nearly all of it: measured
   * with the real player, a gap of 6 always clears and 7 only from within 0.3 tiles
   * of the edge (the other forms' margins would say 4 and 6).
   */
  cheetahHop: { easy: -0.3, max: 0.7 },
  /** Seconds a plate's gate must stay open beyond the run, on 'easy'. */
  gateSlack: { easy: 0.4, max: 0 },
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
const JUMPERS = ['human', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake'] as const;
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

/** Columns of the world to search: tiles with x0 <= i < x1. Nothing outside is read or allocated. */
export interface XRange {
  x0: number;
  x1: number;
}

/**
 * Everything reachable from `from`. With `range` the search sees only those
 * columns (the rest of the world is sky), so it costs in proportion to the
 * range. Inside the range the answer is the same as the whole world's as long
 * as nothing reachable inside needs a path through the columns left out.
 */
export function explore(world: World, from: Spot, forms: readonly FormId[], profile: Profile, range?: XRange): Reach {
  return run(world, from, forms, profile, range);
}

/**
 * Can `from` reach a tile that holds one of the `goals`? The search stops at the
 * first such tile, which is sound because the reached set only grows: whatever
 * is reached part way is reached in the end. If no goal is found it has run to
 * the end, so a false is as good as `explore`'s.
 *
 * To check a set of starts against one target, give each start the target plus
 * every start already known to get there as goals. Reaching a tile is closed
 * under moves (opening a gate only adds moves), so a start that reaches a good
 * start's tile reaches everything that one does, the target included.
 */
export function reachesAny(
  world: World,
  from: Spot,
  forms: readonly FormId[],
  profile: Profile,
  goals: readonly Spot[],
  range?: XRange,
): boolean {
  const r = run(world, from, forms, profile, range, goals);
  return goals.some((g) => r.canStand(g));
}

function run(
  world: World,
  from: Spot,
  forms: readonly FormId[],
  profile: Profile,
  range?: XRange,
  goals?: readonly Spot[],
): Reach {
  const { depth } = world;
  const ox = range ? Math.max(0, range.x0) : 0;
  const width = (range ? Math.min(world.width, range.x1) : world.width) - ox;
  if (width <= 0) throw new Error('explore: the x range holds no columns');
  // From here on `i` is a column relative to `ox`; the world is asked with `i + ox`.
  for (const f of forms) {
    if (f !== 'fairy' && !(JUMPERS as readonly FormId[]).includes(f)) {
      throw new Error(`levelcheck does not know how to move as ${f}`);
    }
  }
  const can = new Set(forms);

  // ---- timed gates ---------------------------------------------------------

  // Find each gate's tiles (in this range) by opening its plates one at a time,
  // then hold every gate open while the world is read, so a gate tile reads as the
  // plain ground under it. `shut` says which gate tiles the search treats as walls.
  const plates = world.layout.plates;
  const gateIds = [...new Set(plates.map((p) => p.gate))];
  const HELD_OPEN = 1e9;
  const gates: { tiles: number[]; plates: { k: number; seconds: number }[]; open: boolean }[] = [];
  const shut = new Uint8Array(width * depth);
  const gateTile = new Uint8Array(width * depth);
  if (gateIds.length > 0) {
    world.resetGates();
    for (const id of gateIds) {
      world.pressPlate(id, HELD_OPEN);
      const tiles: number[] = [];
      for (let j = 0; j < depth; j++) {
        for (let i = 0; i < width; i++) {
          if (world.isGate(i + ox + 0.5, j + 0.5) && !world.isClosedGate(i + ox + 0.5, j + 0.5)) tiles.push(j * width + i);
        }
      }
      world.resetGates();
      const own = plates
        .filter((p) => p.gate === id && Math.floor(p.x) >= ox && Math.floor(p.x) < ox + width && p.z >= 0 && p.z < depth)
        .map((p) => ({ k: Math.floor(p.z) * width + (Math.floor(p.x) - ox), seconds: p.seconds }));
      gates.push({ tiles, plates: own, open: false });
    }
    for (const id of gateIds) world.pressPlate(id, HELD_OPEN);
    for (const g of gates) for (const k of g.tiles) shut[k] = 1;
  }
  // A gate with no plate at all stays shut for good.
  for (let j = 0; j < depth; j++) {
    for (let i = 0; i < width; i++) {
      if (!world.isGate(i + ox + 0.5, j + 0.5)) continue;
      gateTile[j * width + i] = 1;
      if (world.isClosedGate(i + ox + 0.5, j + 0.5)) shut[j * width + i] = 1;
    }
  }

  // ---- surfaces ----------------------------------------------------------

  const tileIndex = (i: number, j: number): number => j * width + i;
  const onGrid = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < width && j < depth;

  // Read the world once. The search below asks about the same tiles millions of
  // times, so it works from these flat arrays and never calls the world again.
  /** The tile has something to stand on (thin ice counts, a hole does not). */
  const exists = new Uint8Array(width * depth);
  /** The tile is a thin-ice sheet, whole or broken (brittle or not). */
  const ice = new Uint8Array(width * depth);
  /** The tile is a brittle sheet. */
  const brittle = new Uint8Array(width * depth);
  /** The gap of the root tangle on the tile (a body no taller fits), 0 if none. */
  const tangle = new Float64Array(width * depth);
  /** The tile is a water tile (not frozen). */
  const wet = new Uint8Array(width * depth);
  /** How far below the surface the kelp mat on the tile hangs, 0 if none. */
  const kelp = new Float64Array(width * depth);
  /** The water level of a water tile. */
  const level = new Float64Array(width * depth);
  /** Height of the surface a human, orangutan, bunny, wolf or mermaid stands on (floating in water). */
  const surfaceHuman = new Float64Array(width * depth);
  /** The same for the fairy, who floats a little higher. */
  const surfaceFairy = new Float64Array(width * depth);
  /** How tall the tree block on the tile is, 0 if none. */
  const tree = new Float64Array(width * depth);
  /** Bare ground under the tile (no trees or speakers). */
  const ground = new Float64Array(width * depth);
  const antHeight = FORMS.find((f) => f.id === 'ant')!.height;
  const def = new Map(FORMS.map((f) => [f.id, f]));

  for (let j = 0; j < depth; j++) {
    for (let i = 0; i < width; i++) {
      const k = tileIndex(i, j);
      const x = i + ox + 0.5;
      const z = j + 0.5;
      const isIce = world.isThinIce(x, z);
      const iceTop = world.iceTopAt(x, z);
      // Surfaces ignore kelp (anyone who can be there stands at the float height);
      // who may be on a mat is decided by `fitsMat` below.
      const tAnt = Math.max(world.solidAt(x, z, antHeight, Infinity), iceTop);
      tangle[k] = world.tangleGapAt(x, z);
      kelp[k] = world.kelpDepthAt(x, z);
      wet[k] = world.isWater(x, z) ? 1 : 0;
      level[k] = world.waterLevelAt(x, z);
      ice[k] = isIce ? 1 : 0;
      brittle[k] = world.isBrittle(x, z) ? 1 : 0;
      exists[k] = isIce || !world.isVoid(x, z) ? 1 : 0;
      tree[k] = world.treeAt(x, z);
      ground[k] = world.groundAt(x, z);
      if (isIce || !world.isWater(x, z)) {
        surfaceHuman[k] = tAnt;
        surfaceFairy[k] = tAnt;
      } else {
        const level = world.waterLevelAt(x, z);
        surfaceHuman[k] = Math.max(tAnt, level - MARGINS.float.human);
        surfaceFairy[k] = Math.max(tAnt, level - MARGINS.float.fairy);
      }
    }
  }

  /** Is the tile a tangle too low for this form? A tangle is plain ground for a body that fits its gap. */
  const shutOut = (form: FormId, k: number): boolean => tangle[k] > 0 && def.get(form)!.height > tangle[k];

  /** Can this form be on the tile at all? Kelp only takes a body that fits under it. */
  const fitsMat = (form: FormId, k: number): boolean => {
    if (kelp[k] === 0) return true;
    const d = def.get(form)!;
    return fitsUnderKelp(d.height, d.dive, kelp[k]);
  };

  /** Solid height of every tile for a form, thin ice whole: what a flight or hop line must clear. */
  const topsByForm = new Map<FormId, Float64Array>();
  const topsOf = (form: FormId): Float64Array => {
    let tops = topsByForm.get(form);
    if (!tops) {
      const { height, dive } = def.get(form)!;
      tops = new Float64Array(width * depth);
      for (let j = 0; j < depth; j++) {
        for (let i = 0; i < width; i++) {
          tops[tileIndex(i, j)] = Math.max(world.solidAt(i + ox + 0.5, j + 0.5, height, dive), world.iceTopAt(i + ox + 0.5, j + 0.5));
        }
      }
      topsByForm.set(form, tops);
    }
    return tops;
  };

  /** Can this form be on the sheet of tile k? Thin ice takes the wolf or cheetah, brittle only the cheetah. */
  const holds = (form: FormId, k: number): boolean =>
    form === 'cheetah' || (form === 'wolf' && brittle[k] === 0);

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

  // Lowest existing surface per x column, with a sparse table for range minima.
  const buildMin = (surf: Float64Array): Float64Array[] => {
    const col = new Float64Array(width).fill(Infinity);
    for (let j = 0; j < depth; j++) {
      for (let i = 0; i < width; i++) {
        const k = tileIndex(i, j);
        if (exists[k] && surf[k] < col[i]) col[i] = surf[k];
      }
    }
    const levels = [col];
    for (let len = 2; len <= width; len *= 2) {
      const prev = levels[levels.length - 1];
      const next = new Float64Array(width - len + 1);
      for (let i = 0; i < next.length; i++) next[i] = Math.min(prev[i], prev[i + len / 2]);
      levels.push(next);
    }
    return levels;
  };
  const minHuman = buildMin(surfaceHuman);
  const minFairy = buildMin(surfaceFairy);
  /** Lowest existing surface in columns [i0, i1] (both inside the grid). */
  const lowestIn = (levels: Float64Array[], i0: number, i1: number): number => {
    const lv = 31 - Math.clz32(i1 - i0 + 1);
    return Math.min(levels[lv][i0], levels[lv][i1 - (1 << lv) + 1]);
  };

  /**
   * Skip list over the tiles: `skipTo[k]` leads to the first tile at or after k that
   * can still be a target, that is one that exists and is not reached yet. The
   * scan for targets steps over empty sky and reached tiles for free, in the same
   * order, so the answers are the same.
   */
  const skipTo = new Int32Array(width * depth + 1);
  const unreachedFrom = (k: number): number => {
    let r = k;
    while (skipTo[r] !== r) r = skipTo[r];
    while (skipTo[k] !== r) {
      const up = skipTo[k];
      skipTo[k] = r;
      k = up;
    }
    return r;
  };

  // ---- move rules --------------------------------------------------------

  const g = MOVER.gravity;
  const apexOf = (j: Jumper): number => jumpOf(j).v ** 2 / (2 * g);
  /** How far a hop reaches when the target is `d` lower (negative: higher). */
  const hopRange = (j: Jumper, d: number): number => {
    const { v, s } = jumps[j];
    const root = v * v + 2 * g * d;
    if (root < 0) return -Infinity;
    const r = (s * (v + Math.sqrt(root))) / g;
    if (j === 'cheetah') return r + MARGINS.cheetahHop[profile];
    return profile === 'easy' ? MARGINS.hopRange.easy * r : r + MARGINS.hopRangeMax;
  };
  const flyUp = MARGINS.fly.up[profile];
  const flyRange = (d: number): number =>
    MARGINS.fly.reach[profile] + MARGINS.fly.perDrop[profile] * Math.max(0, d);

  // Each jumper's numbers, worked out once rather than for every candidate.
  const jumps = {} as Record<Jumper, { v: number; s: number; apex: number; up: number }>;
  for (const j of JUMPERS) {
    const { v, s } = jumpOf(j);
    jumps[j] = { v, s, apex: apexOf(j), up: apexOf(j) + MARGINS.hopSlack[profile] };
  }
  const hopFly = can.has('bunny') && can.has('fairy') ? hopFlyLimits(profile) : null;

  /**
   * The farthest any move of a form can reach from a tile whose surface is `a`,
   * to limit the search window. A drop can be no deeper than down to the lowest
   * surface, so this is tighter than using the world's highest point.
   *
   * Soundness of the local bound: let w0 be the window from the world's lowest
   * surface. Every target lies within w0 of the tile, so its surface is at least
   * the lowest existing surface in the columns [ai - w0, ai + w0] (all rows),
   * call it lowLocal >= the global low. Reach grows with the drop, so the
   * farthest move of any target is at most the range computed with drop
   * a - lowLocal, which is <= w0. The tile itself is in those columns, so
   * lowLocal is finite and <= a.
   */
  const rangeFor = (form: FormId, a: number, low: number): number => {
    if (form === 'fairy') return flyRange(a - low);
    const drop = a - low;
    const hop = hopRange(form as Jumper, drop);
    // The combined move is her farthest, and it has no drop-off, so use the flat range.
    return form === 'bunny' && hopFly ? Math.max(hop, hopFly.range(-drop)) : hop;
  };
  const windowOf = (form: FormId, a: number, ai: number): number => {
    const levels = form === 'fairy' ? minFairy : minHuman;
    const w0 = Math.ceil(rangeFor(form, a, form === 'fairy' ? lowFairy : lowHuman)) + 1;
    const lo = Math.max(0, ai - w0);
    const hi = Math.min(width - 1, ai + w0);
    const low = lowestIn(levels, lo, hi);
    return Math.min(w0, Math.ceil(rangeFor(form, a, low)) + 1);
  };

  /**
   * Is the straight line between two tile centres free of anything taller than
   * `limit`? Tiles the line only touches at a corner count in the easy profile
   * (be careful) but not in max (be generous).
   */
  const lineClear = (
    tops: Float64Array,
    ai: number,
    aj: number,
    bi: number,
    bj: number,
    limit: number,
  ): boolean => {
    const dx = bi - ai;
    const dz = bj - aj;
    const eps = 1e-9;
    const check = (i: number, j: number): boolean =>
      (i === ai && j === aj) ||
      (i === bi && j === bj) ||
      !onGrid(i, j) ||
      (!shut[tileIndex(i, j)] && tops[tileIndex(i, j)] <= limit);
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

  // Goal tiles end the search as soon as one is reached (see `reachesAny`).
  const goalTile = new Uint8Array(goals ? width * depth : 0);
  let found = false;
  for (const g of goals ?? []) {
    const gi = Math.floor(g.x) - ox;
    const gj = Math.floor(g.z);
    if (onGrid(gi, gj)) goalTile[tileIndex(gi, gj)] = 1;
  }

  const reach = (k: number, height: number): void => {
    if (reached[k]) return;
    if (goals && goalTile[k]) found = true;
    reached[k] = 1;
    skipTo[k] = k + 1;
    stood[k] = height;
    count++;
    queue.push(k);
  };

  /** One full search from `from` with the gates as they are now. */
  const search = (): void => {
    reached.fill(0);
    for (let k = 0; k < width * depth; k++) skipTo[k] = exists[k] ? k : k + 1;
    skipTo[width * depth] = width * depth;
    count = 0;
    queue.length = 0;
    const fi = Math.floor(from.x) - ox;
    const fj = Math.floor(from.z);
    if (onGrid(fi, fj) && exists[tileIndex(fi, fj)]) reach(tileIndex(fi, fj), surface(tileIndex(fi, fj), forms[0] ?? 'human'));

    const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (let head = 0; head < queue.length && !found; head++) {
      const ak = queue[head];
      const ai = ak % width;
      const aj = Math.floor(ak / width);

      const onIce = ice[ak] === 1;
      for (const form of can) {
        if (found) break;
        // Only a body that fits the gap stands in a tangle, so nobody else moves from one.
        if (shutOut(form, ak)) continue;
        if (!fitsMat(form, ak)) continue;
        // Nobody can stand on thin ice, so leaving it takes a runner's moves; in
        // 'easy' that is the wolf, plus a fairy who has dropped through and
        // flaps away. 'max' lets every form leave, since a shift and a jump in
        // the same frame is physically possible.
        if (onIce && profile === 'easy' && form !== 'wolf' && form !== 'cheetah' && form !== 'fairy') continue;
        // The wolf breaks a brittle sheet the moment it is on it.
        if (brittle[ak] && profile === 'easy' && form === 'wolf') continue;
        const a = surface(ak, form);
        const surfaces = form === 'fairy' ? surfaceFairy : surfaceHuman;

        // Walking: every form, to a neighbour that is at most its own step higher.
        const stepUp = def.get(form)!.step ?? MOVER.step;
        for (const [di, dj] of NEIGHBOURS) {
          const bi = ai + di;
          const bj = aj + dj;
          if (!onGrid(bi, bj)) continue;
          const bk = tileIndex(bi, bj);
          if (!exists[bk] || reached[bk] || shut[bk]) continue;
          if (shutOut(form, bk)) continue;
          if (!fitsMat(form, bk)) continue;
          // Only a runner can step onto thin ice (a brittle sheet takes only the cheetah).
          if (ice[bk] && !holds(form, bk)) continue;
          if (onIce && profile === 'easy' && form === 'fairy') continue;
          const b = surfaces[bk];
          if (kelp[ak] > 0) {
            // Out from under a mat: swim on to water of about the same level, or
            // climb out onto land no more than a step above the mat's underside.
            const out = wet[bk]
              ? Math.abs(level[bk] - level[ak]) <= MOVER.step
              : b <= level[ak] - kelp[ak] - def.get(form)!.height + MOVER.step;
            if (out) reach(bk, b);
          } else if (b - a <= stepUp) reach(bk, b);
        }

        // Nobody hops from under a mat, and the Mermaid hops only from the water.
        if (kelp[ak] > 0 || (form === 'mermaid' && !wet[ak])) continue;
        // Whoever fits a tangle walks out of it but cannot hop from one.
        if (tangle[ak] > 0) continue;
        const tops = topsOf(form);

        // Per-form numbers for this tile, worked out once for the whole window.
        const jump = form === 'fairy' ? null : jumps[form as Jumper];
        const w = windowOf(form, a, ai);
        const j0 = Math.max(0, aj - w);
        const j1 = Math.min(depth - 1, aj + w);
        const i0 = Math.max(0, ai - w);
        const i1 = Math.min(width - 1, ai + w);
        // The highest a target can be and still be reached by any move of this form.
        const canFlyFrom = a + flyUp;
        const hopFlyUp = form === 'bunny' && hopFly ? hopFly.up : -Infinity;
        const highestHop = jump ? Math.max(jump.up, hopFlyUp) : flyUp;

        // Every move but the orangutan's trunk grab needs a gap no wider than the
        // window less one, so a row further off in z is only searched that far in x.
        const isOrangutan = form === 'orangutan';
        const circular = !isOrangutan;
        const reachW = (w - 1) * (w - 1);

        for (let bj = j0; bj <= j1; bj++) {
          let rowI0 = i0;
          let rowI1 = i1;
          if (circular) {
            const dz = Math.max(0, Math.abs(bj - aj) - 1);
            const half = Math.floor(Math.sqrt(reachW - dz * dz)) + 1;
            rowI0 = Math.max(i0, ai - half);
            rowI1 = Math.min(i1, ai + half);
          }
          const rowBase = bj * width;
          for (let bk = unreachedFrom(rowBase + rowI0); bk <= rowBase + rowI1; bk = unreachedFrom(bk + 1)) {
            const bi = bk - rowBase;
            if (shut[bk]) continue;
            // The cheapest test first: too high for every move of this form.
            if ((jump ? surfaces[bk] - a > highestHop : surfaces[bk] > canFlyFrom) && !(isOrangutan && tree[bk] > 0)) continue;
            if (ice[bk] && !holds(form, bk)) continue;
            if (shutOut(form, bk)) continue;
            if (!fitsMat(form, bk)) continue;
            const b = surfaces[bk];

            if (form === 'fairy') {
              // She does not jump: she flaps up, then glides.
              if (b > canFlyFrom) continue;
              const fx = Math.max(0, Math.abs(bi - ai) - 1);
              const fz = Math.max(0, Math.abs(bj - aj) - 1);
              const fr = flyRange(a - b);
              if (fx * fx + fz * fz <= fr * fr + 1e-6 && Math.hypot(fx, fz) <= fr && lineClear(tops, ai, aj, bi, bj, canFlyFrom)) reach(bk, b);
              continue;
            }

            // Orangutans can also grab trunks, which need no height check here.
            const treeHere = form === 'orangutan' && tree[bk] > 0;
            if (b - a > highestHop && !treeHere) continue;
            const gx = Math.max(0, Math.abs(bi - ai) - 1);
            const gz = Math.max(0, Math.abs(bj - aj) - 1);
            const g2 = gx * gx + gz * gz;
            const d = a - b;

            const jumper = jump!;
            // Most candidates are too far: a squared compare (with room to spare for
            // rounding) rules them out before the exact distance is taken.
            const hopR = b - a <= jumper.up ? hopRange(form as Jumper, d) : -Infinity;
            const hopFlyR = form === 'bunny' && hopFly && b - a <= hopFly.up ? hopFly.range(b - a) : -Infinity;
            if (g2 <= hopR * hopR + 1e-6 && Math.hypot(gx, gz) <= hopR && lineClear(tops, ai, aj, bi, bj, a + jumper.apex)) {
              reach(bk, b);
              continue;
            }

            // Hop-then-fly: a bunny turns into a fairy at the top of her hop and
            // keeps that height. It starts from any surface a bunny can hop from.
            if (
              form === 'bunny' &&
              hopFly &&
              b - a <= hopFly.up &&
              g2 <= hopFlyR * hopFlyR + 1e-6 &&
              Math.hypot(gx, gz) <= hopFlyR &&
              lineClear(tops, ai, aj, bi, bj, a + hopFly.up)
            ) {
              reach(bk, b);
              continue;
            }

            // The orangutan grabs a trunk in mid-air if it arrives above its base.
            if (treeHere) {
              const base = ground[bk];
              if (a < base - MARGINS.climbSlack) continue;
              const next = Math.abs(bi - ai) + Math.abs(bj - aj) === 1;
              if (next || (Math.hypot(gx, gz) <= hopRange('orangutan', a - base) && lineClear(tops, ai, aj, bi, bj, a + jumper.apex))) {
                reach(bk, b);
              }
            }
          }
        }
      }
    }
  };

  // Opening a gate only adds moves, so search again until no further gate opens.
  const openGates = (): boolean => {
    let any = false;
    for (const g of gates) {
      if (g.open) continue;
      const far = (k: number): { x: number; z: number } => ({ x: (k % width) + 0.5, z: Math.floor(k / width) + 0.5 });
      for (const plate of g.plates) {
        if (!reached[plate.k]) continue;
        const p = far(plate.k);
        const d = Math.max(...g.tiles.map((t) => Math.hypot(far(t).x - p.x, far(t).z - p.z))) + 1;
        const slack = MARGINS.gateSlack[profile];
        let fast = false;
        for (const f of can) if (d / def.get(f)!.speed <= plate.seconds - slack) fast = true;
        if (!fast) continue;
        g.open = true;
        for (const k of g.tiles) shut[k] = 0;
        any = true;
        break;
      }
    }
    return any;
  };
  do search();
  while (!found && openGates());
  world.resetGates();

  /**
   * From a reached water tile the feet can be anywhere between the float height
   * and the depth a form can dive to (or the bed): a thing is in reach if its
   * ground is within `useHeight` of that span. Under a mat the top of the span
   * is the mat's underside less the body.
   */
  const usableFromWater = (k: number, thingGround: number): boolean => {
    for (const form of can) {
      if (!fitsMat(form, k)) continue;
      const d = def.get(form)!;
      const high = kelp[k] > 0 ? Math.min(stood[k], level[k] - kelp[k] - d.height) : stood[k];
      const low = Math.min(high, Math.max(ground[k], level[k] - d.dive));
      if (thingGround > low - MARGINS.useHeight && thingGround < high + MARGINS.useHeight) return true;
    }
    return false;
  };

  return {
    tiles: count,
    has: (i, j) => onGrid(i - ox, j) && reached[tileIndex(i - ox, j)] === 1,
    canStand: (spot) => {
      const i = Math.floor(spot.x) - ox;
      const j = Math.floor(spot.z);
      return onGrid(i, j) && reached[tileIndex(i, j)] === 1;
    },
    canUse: (spot) => {
      const spotGround = world.groundAt(spot.x, spot.z);
      const r = Math.ceil(MARGINS.useDistance);
      const ci = Math.floor(spot.x) - ox;
      const cj = Math.floor(spot.z);
      for (let j = cj - r; j <= cj + r; j++) {
        for (let i = ci - r; i <= ci + r; i++) {
          if (!onGrid(i, j) || !reached[tileIndex(i, j)]) continue;
          const k = tileIndex(i, j);
          // Nobody can stand still on thin ice, so nothing can be used from it.
          if (ice[k] || gateTile[k]) continue;
          if (Math.hypot(i + ox + 0.5 - spot.x, j + 0.5 - spot.z) > MARGINS.useDistance) continue;
          if (wet[k] ? usableFromWater(k, spotGround) : Math.abs(stood[k] - spotGround) < MARGINS.useHeight) return true;
        }
      }
      return false;
    },
  };
}
