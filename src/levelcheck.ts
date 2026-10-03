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
  /** Float heights in water: waterLevel minus this. */
  float: { human: 0.8, fairy: 0.25 },
};

/** Forms that move by jumping; their speed and jump come from FORMS. */
const JUMPERS = ['human', 'orangutan', 'bunny'] as const;
type Jumper = (typeof JUMPERS)[number];

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
    if (f !== 'human' && f !== 'fairy' && f !== 'orangutan' && f !== 'bunny') {
      throw new Error(`levelcheck does not know how to move as ${f}`);
    }
  }
  const can = new Set(forms);

  // ---- surfaces ----------------------------------------------------------

  const tileIndex = (i: number, j: number): number => j * width + i;
  const onGrid = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < width && j < depth;
  const exists = (i: number, j: number): boolean => onGrid(i, j) && !world.isVoid(i + 0.5, j + 0.5);

  /** Height of the surface a form stands on in this tile. */
  const surface = (i: number, j: number, form: FormId): number => {
    const top = world.solidAt(i + 0.5, j + 0.5);
    if (!world.isWater(i + 0.5, j + 0.5)) return top;
    return Math.max(top, world.waterLevel - MARGINS.float[form === 'fairy' ? 'fairy' : 'human']);
  };

  // Highest and lowest surface anywhere bound how far any move could reach.
  let high = -Infinity;
  let low = Infinity;
  for (let j = 0; j < depth; j++) {
    for (let i = 0; i < width; i++) {
      if (!exists(i, j)) continue;
      high = Math.max(high, surface(i, j, 'human'));
      low = Math.min(low, surface(i, j, 'human'), surface(i, j, 'fairy'));
    }
  }
  const maxDrop = Number.isFinite(high) ? high - low : 0;

  // ---- move rules --------------------------------------------------------

  const g = MOVER.gravity;
  const apexOf = (j: Jumper): number => jumpOf(j).v ** 2 / (2 * g);
  const hopUp = (j: Jumper): number => apexOf(j) + MARGINS.hopSlack[profile];
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

  /** The farthest any move of a form can reach, to limit the search window. */
  const windowOf = (form: FormId): number => {
    if (form === 'fairy') return flyRange(maxDrop);
    return hopRange(form as Jumper, maxDrop);
  };

  /** Gap between the two unit squares of tiles A and B. */
  const gap = (ai: number, aj: number, bi: number, bj: number): number =>
    Math.hypot(Math.max(0, Math.abs(bi - ai) - 1), Math.max(0, Math.abs(bj - aj) - 1));

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
      (i === ai && j === aj) || (i === bi && j === bj) || world.solidAt(i + 0.5, j + 0.5) <= limit;
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

  const reach = (i: number, j: number, height: number): void => {
    const k = tileIndex(i, j);
    if (reached[k]) return;
    reached[k] = 1;
    stood[k] = height;
    count++;
    queue.push(k);
  };

  const fi = Math.floor(from.x);
  const fj = Math.floor(from.z);
  if (exists(fi, fj)) reach(fi, fj, surface(fi, fj, forms[0] ?? 'human'));

  const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let head = 0; head < queue.length; head++) {
    const ai = queue[head] % width;
    const aj = Math.floor(queue[head] / width);

    for (const form of can) {
      const a = surface(ai, aj, form);

      // Walking: every form, to a neighbour that is at most a step higher.
      for (const [di, dj] of NEIGHBOURS) {
        const bi = ai + di;
        const bj = aj + dj;
        if (!exists(bi, bj) || reached[tileIndex(bi, bj)]) continue;
        const b = surface(bi, bj, form);
        if (b - a <= MOVER.step) reach(bi, bj, b);
      }

      const w = Math.ceil(windowOf(form)) + 1;
      for (let bj = Math.max(0, aj - w); bj <= Math.min(depth - 1, aj + w); bj++) {
        for (let bi = Math.max(0, ai - w); bi <= Math.min(width - 1, ai + w); bi++) {
          if (!exists(bi, bj) || reached[tileIndex(bi, bj)]) continue;
          const b = surface(bi, bj, form);
          const d = a - b;
          const D = gap(ai, aj, bi, bj);

          if (form === 'fairy') {
            // She does not jump: she flaps up, then glides.
            if (b - a <= flyUp && D <= flyRange(d) && lineClear(ai, aj, bi, bj, a + flyUp)) reach(bi, bj, b);
            continue;
          }

          const jumper = form as Jumper;
          if (b - a <= hopUp(jumper) && D <= hopRange(jumper, d) && lineClear(ai, aj, bi, bj, a + apexOf(jumper))) {
            reach(bi, bj, b);
            continue;
          }

          // The orangutan grabs a trunk in mid-air if it arrives above its base.
          if (form === 'orangutan' && world.treeAt(bi + 0.5, bj + 0.5) > 0) {
            const base = world.groundAt(bi + 0.5, bj + 0.5);
            if (a < base - MARGINS.climbSlack) continue;
            const next = Math.abs(bi - ai) + Math.abs(bj - aj) === 1;
            if (next || (D <= hopRange('orangutan', a - base) && lineClear(ai, aj, bi, bj, a + apexOf('orangutan')))) {
              reach(bi, bj, b);
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
      const ground = world.groundAt(spot.x, spot.z);
      const r = Math.ceil(MARGINS.useDistance);
      const ci = Math.floor(spot.x);
      const cj = Math.floor(spot.z);
      for (let j = cj - r; j <= cj + r; j++) {
        for (let i = ci - r; i <= ci + r; i++) {
          if (!onGrid(i, j) || !reached[tileIndex(i, j)]) continue;
          if (Math.hypot(i + 0.5 - spot.x, j + 0.5 - spot.z) > MARGINS.useDistance) continue;
          if (Math.abs(stood[tileIndex(i, j)] - ground) < MARGINS.useHeight) return true;
        }
      }
      return false;
    },
  };
}
