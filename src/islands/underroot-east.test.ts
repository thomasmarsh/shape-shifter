import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { exploreCached as explore } from '../explorecache';
import { Kind } from '../layout';
import { World } from '../world';
import { buildEast, rootTop } from './underroot-east';

// The east half of Underroot (x 385 to 479): the Root Grove, the Spire, the Root
// Wall and Yard, the Long Root, the Crown and the way on to Saltmere.

const world = new World();
const { layout } = world;

const east = (s: { x: number }) => s.x >= 385 && s.x < 480;
const respawn = (c: { x: number; z: number }) => ({ x: c.x - 1, z: c.z + 1 });
const EAST_START = { x: 388.5, z: 52.5 };
const BOUGH = { x: 409.5, z: 35.5 };
const SPIRE = { x: 419.5, z: 34.5 };
const SALTMERE = layout.arrivals.find((a) => a.id === 'saltmere')!;
const WEST_ARRIVAL = layout.arrivals.find((a) => a.id === 'underroot');

const FIVE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf'];
const SIX: FormId[] = [...FIVE, 'ant'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);

const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const ground = (i: number, j: number) => world.groundAt(i + 0.5, j + 0.5);
const isVoid = (i: number, j: number) => world.isVoid(i + 0.5, j + 0.5);
const eastCheckpoints = layout.checkpoints.filter(east);
const eastBread = layout.bread.filter(east);
const eastEnemies = layout.enemies.filter(east);
const eastTrees = layout.trees.filter(east);

/** Every tile of Underroot's east half (x 385 to 479) that is not void. */
const tiles: [number, number][] = [];
/** Every tile of Saltmere and beyond (x >= 486) that is not void. */
const saltmereTiles: [number, number][] = [];
for (let j = 0; j < world.depth; j++) {
  for (let i = 385; i < world.width; i++) if (!isVoid(i, j)) (i < 480 ? tiles : i >= 486 ? saltmereTiles : []).push([i, j]);
}
const inBox = (i: number, j: number, i0: number, j0: number, i1: number, j1: number) =>
  i >= i0 && i <= i1 && j >= j0 && j <= j1;
const yardTiles = tiles.filter(([i, j]) => inBox(i, j, 429, 47, 437, 57));
const crownTiles = tiles.filter(([i, j]) => inBox(i, j, 471, 49, 477, 55));
const tangleTiles = tiles.filter(([i, j]) => world.isTangle(i + 0.5, j + 0.5));

const reachedAny = (r: ReturnType<typeof explore>, list: [number, number][]) => list.filter(([i, j]) => r.has(i, j));

describe('Underroot east with the shapes of level 5', () => {
  const five = explore(world, EAST_START, FIVE, 'easy');
  const six = explore(world, EAST_START, SIX, 'easy');

  it('lets five forms solve the two candles and reach the east hub', () => {
    for (const id of ['ur-grove', 'ur-spire']) {
      expect(five.canUse(puzzle(id).speaker), `${id} speaker`).toBe(true);
      expect(five.canUse(puzzle(id).candle), `${id} candle`).toBe(true);
    }
    for (const c of eastCheckpoints.filter((q) => q.id === 'ur-grove' || q.id === 'ur-wall')) {
      expect(five.canStand(respawn(c)), `checkpoint ${c.id}`).toBe(true);
    }
    for (const b of eastBread.filter((q) => q.id === 'ur-grove' || q.id === 'ur-wall')) {
      expect(five.canStand(b), `bread ${b.id}`).toBe(true);
    }
  });

  it('lets six forms reach the Yard, the Crown, every respawn spot, all bread and Saltmere', () => {
    expect(eastCheckpoints.map((c) => c.id)).toEqual(['ur-grove', 'ur-wall', 'ur-yard', 'ur-crown']);
    const saltmere = layout.checkpoints.find((c) => c.id === 'saltmere')!;
    for (const c of [...eastCheckpoints, saltmere]) expect(six.canStand(respawn(c)), `checkpoint ${c.id}`).toBe(true);
    expect(eastBread).toHaveLength(4);
    for (const b of eastBread) expect(six.canStand(b), `bread ${b.id}`).toBe(true);
    expect(reachedAny(six, yardTiles).length).toBeGreaterThan(80);
    expect(reachedAny(six, crownTiles).length).toBeGreaterThan(40);
    expect(six.canStand(SALTMERE), 'Saltmere arrival').toBe(true);
  });
});

describe('Underroot east needs every shape', () => {
  const can = (forms: FormId[], id: string, profile: 'easy' | 'max') => {
    const r = explore(world, EAST_START, forms, profile);
    return { speaker: r.canUse(puzzle(id).speaker), candle: r.canUse(puzzle(id).candle) };
  };

  it('uses nothing of the Grove or the Spire without the orangutan', () => {
    for (const id of ['ur-grove', 'ur-spire']) {
      expect(can(without(FIVE, 'orangutan'), id, 'max'), id).toEqual({ speaker: false, candle: false });
    }
  });

  it('reaches the Grove speaker but no candle without the fairy', () => {
    expect(can(without(FIVE, 'fairy'), 'ur-grove', 'max')).toEqual({ speaker: true, candle: false });
    expect(can(without(FIVE, 'fairy'), 'ur-spire', 'max').candle).toBe(false);
  });

  it('solves the Grove without the bunny, but not the Spire candle, even at the limit', () => {
    expect(can(without(FIVE, 'bunny'), 'ur-grove', 'easy')).toEqual({ speaker: true, candle: true });
    expect(can(without(FIVE, 'bunny'), 'ur-spire', 'max').candle).toBe(false);
  });
});

describe('Underroot east needs the Ant', () => {
  const nothingBeyond = (from: { x: number; z: number }, forms: FormId[]) => {
    const r = explore(world, from, forms, 'max');
    expect(reachedAny(r, yardTiles).slice(0, 3), 'Yard').toEqual([]);
    expect(reachedAny(r, tangleTiles).slice(0, 3), 'tangle').toEqual([]);
    expect(reachedAny(r, crownTiles).slice(0, 3), 'Crown').toEqual([]);
    expect(reachedAny(r, saltmereTiles).slice(0, 3), 'Saltmere').toEqual([]);
  };

  it('keeps five forms out from the east hub, at the limit', () => nothingBeyond(EAST_START, FIVE));
  it('keeps five forms out from Bough Rock, at the limit', () => nothingBeyond(BOUGH, FIVE));
  it('keeps five forms out from the Spire, at the limit', () => nothingBeyond(SPIRE, FIVE));
  it('keeps six forms minus the ant out, at the limit', () => nothingBeyond(EAST_START, without(SIX, 'ant')));

  it('keeps six forms minus the fairy off Saltmere, at the limit', () => {
    const r = explore(world, EAST_START, without(SIX, 'fairy'), 'max');
    expect(r.canStand(SALTMERE)).toBe(false);
    expect(reachedAny(r, saltmereTiles).slice(0, 3)).toEqual([]);
  });
});

describe('Underroot east tangles', () => {
  it('closes the ring round the Yard, joined edge to edge', () => {
    // Flood from the middle of the Yard over every non-tangle tile, diagonals
    // included: if the ring has a diagonal-only join, the flood leaks out.
    const seen = new Set<string>(['433,52']);
    const todo: [number, number][] = [[433, 52]];
    while (todo.length > 0) {
      const [i, j] = todo.pop()!;
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const a = i + di;
          const b = j + dj;
          if (seen.has(`${a},${b}`) || world.isTangle(a + 0.5, b + 0.5)) continue;
          expect(inBox(a, b, 429, 47, 437, 57), `the flood leaked to (${a}, ${b})`).toBe(true);
          seen.add(`${a},${b}`);
          todo.push([a, b]);
        }
      }
    }
    expect(seen.size).toBe(9 * 11);
  });

  it('has no wall tangle thinner than 3 and the root only at z 51..53', () => {
    for (let j = 46; j <= 58; j++) for (let i = 426; i <= 428; i++) expect(world.isTangle(i + 0.5, j + 0.5)).toBe(true);
    for (const [i, j] of tangleTiles) {
      if (i >= 439) expect(inBox(i, j, 439, 51, 470, 53)).toBe(true);
    }
  });

  it('puts no thing, tree or enemy on a tangle, and no checkpoint stand or respawn spot either', () => {
    const things = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
      ...layout.trees,
    ].filter(east);
    expect(things.length).toBeGreaterThan(20);
    for (const s of things) expect(world.isTangle(s.x, s.z), `(${s.x}, ${s.z})`).toBe(false);
  });
});

describe('Underroot east fairness for a one-heart Ant', () => {
  it('keeps every enemy post 11.5 tiles from every tile at x >= 426', () => {
    expect(eastEnemies).toHaveLength(5);
    for (const e of eastEnemies) {
      for (const [i, j] of tiles) {
        if (i < 426) continue;
        expect(Math.hypot(e.x - (i + 0.5), e.z - (j + 0.5)), `enemy (${e.x}, ${e.z}) vs (${i}, ${j})`).toBeGreaterThanOrEqual(11.5);
      }
    }
  });

  it('keeps every east checkpoint 7 tiles from a guard post at about its height', () => {
    for (const c of eastCheckpoints) {
      for (const e of eastEnemies) {
        if (Math.abs(world.groundAt(e.x, e.z) - world.groundAt(c.x, c.z)) > 3) continue;
        expect(Math.hypot(e.x - c.x, e.z - c.z), `${c.id} vs guard (${e.x}, ${e.z})`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('keeps every archer 11.5 tiles from a respawn spot, unless it is 7.5 higher or lower', () => {
    const archers = eastEnemies.filter((e) => e.kind === 'archer');
    expect(archers).toHaveLength(2);
    for (const c of eastCheckpoints) {
      const spot = respawn(c);
      for (const a of archers) {
        if (Math.abs(world.groundAt(a.x, a.z) - world.groundAt(spot.x, spot.z)) >= 7.5) continue;
        expect(Math.hypot(a.x - spot.x, a.z - spot.z), `${c.id} vs archer (${a.x}, ${a.z})`).toBeGreaterThanOrEqual(11.5);
      }
    }
  });
});

describe('Underroot east way out', () => {
  it('lets six forms on easy walk back to the west half from every respawn spot', () => {
    const goal = WEST_ARRIVAL ?? EAST_START;
    for (const c of eastCheckpoints.filter((q) => q.id !== 'saltmere')) {
      const r = explore(world, respawn(c), SIX, 'easy');
      expect(r.canStand(goal), `from ${c.id}`).toBe(true);
    }
  });
});

describe('Underroot east things', () => {
  it('stand on real ground', () => {
    const spots = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
      ...layout.trees,
    ].filter(east);
    for (const s of spots) {
      expect(world.groundAt(s.x, s.z), `(${s.x}, ${s.z})`).toBeGreaterThan(0);
      expect(world.isWater(s.x, s.z), `(${s.x}, ${s.z}) water`).toBe(false);
    }
  });

  it('has no id clash among its things', () => {
    for (const list of [eastCheckpoints, eastBread, layout.puzzles.filter((p) => east(p.speaker))]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    const hints = layout.hints.filter(east).map((h) => h.id);
    expect(new Set(hints).size).toBe(hints.length);
  });

  it('has exactly three trees, all great, and no boulders', () => {
    expect(eastTrees).toHaveLength(3);
    for (const t of eastTrees) expect(t.kind).toBe('great');
    expect(layout.boulders.filter(east)).toEqual([]);
  });

  it('uses no snow and no ice, only moss, bark and stone', () => {
    // Rebuild the east half on a scratch world through a terrain that records the kinds.
    const kinds = new Set<number>();
    new World([
      {
        id: 'scratch',
        name: 'Scratch',
        build(t) {
          const built = buildEast({
            ...t,
            set(i, j, h, k) {
              kinds.add(k);
              t.set(i, j, h, k);
            },
          });
          return { ...built, spawn: EAST_START };
        },
      },
    ]);
    expect(kinds.has(Kind.Snow)).toBe(false);
    expect(kinds.has(Kind.Ice)).toBe(false);
    expect([...kinds].sort()).toEqual([Kind.Stone, Kind.Moss, Kind.Bark].sort());
  });
});

describe('Underroot east from the game camera', () => {
  const seen = (what: string, x: number, z: number): void => {
    const y = world.groundAt(x, z);
    for (let k = 0.25; k <= 30; k += 0.25) {
      expect(world.groundAt(x - k, z + k), `${what} (${x}, ${z}) hidden at k=${k}`).toBeLessThanOrEqual(y + 0.9 + 1.12 * k);
    }
  };

  it('hides no speaker, candle, checkpoint, bread or great tree', () => {
    const spots = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints,
      ...layout.bread,
      ...layout.trees,
    ].filter(east);
    expect(spots.length).toBeGreaterThan(14);
    for (const s of spots) seen('thing', s.x, s.z);
  });

  it('does not hide the ends of the Long Root', () => {
    seen('first root tile', 439.5, 52.5);
    seen('last root tile', 470.5, 52.5);
  });
});

describe('Underroot east geometry the design leans on', () => {
  const allVoid = (i0: number, j0: number, i1: number, j1: number) => {
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (!isVoid(i, j)) return false;
    return true;
  };
  const flat = (i0: number, j0: number, i1: number, j1: number, h: number) => {
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) expect(ground(i, j), `(${i}, ${j})`).toBe(h);
  };

  it('rises one a tree on the pillars, to Grove Rock at the last treetop + 1 and hub + 8', () => {
    expect(ground(393, 46)).toBe(32);
    expect(ground(393, 43)).toBe(33);
    expect(ground(395, 41)).toBe(34);
    expect(ground(395, 41) + 5).toBe(39);
    flat(391, 33, 398, 39, 40);
    expect(isVoid(395, 40), 'one empty tile past the last tree').toBe(true);
    expect(ground(391, 33)).toBe(ground(395, 41) + 5 + 1);
    expect(ground(391, 33)).toBe(32 + 8);
    expect(world.treeAt(393.5, 43.5)).toBe(5);
  });

  it('puts Bough Rock 3 over Grove Rock across exactly 8 tiles of sky', () => {
    flat(407, 33, 411, 36, 43);
    expect(allVoid(399, 33, 406, 36)).toBe(true);
    expect(ground(407, 33) - ground(398, 35)).toBe(3);
  });

  it('puts the Spire 4 over Bough Rock across exactly 7 tiles of sky', () => {
    flat(419, 34, 420, 35, 47);
    expect(allVoid(412, 34, 418, 35)).toBe(true);
    expect(ground(419, 34) - ground(411, 34)).toBe(4);
    expect(isVoid(418, 34) && isVoid(421, 34)).toBe(true);
  });

  it('builds the Wall and the Yard at hub height, joined to the hub', () => {
    flat(426, 46, 438, 58, 32);
    flat(425, 46, 425, 58, 32);
  });

  it('climbs the root 0.25 a tile over open sky and ends level with the Crown', () => {
    for (let i = 439; i <= 470; i++) {
      expect(ground(i, 52)).toBeCloseTo(rootTop(i), 6);
      if (i > 439) expect(ground(i, 52) - ground(i - 1, 52)).toBeCloseTo(0.25, 6);
      const knot = (i >= 448 && i <= 450) || (i >= 459 && i <= 461);
      for (const j of [51, 53]) {
        if (knot) expect(world.isTangle(i + 0.5, j + 0.5)).toBe(true);
        else expect(isVoid(i, j), `(${i}, ${j}) is sky`).toBe(true);
      }
      for (const j of [50, 54]) expect(isVoid(i, j), `(${i}, ${j}) is sky`).toBe(true);
    }
    expect(ground(470, 52)).toBeCloseTo(40, 6);
    flat(471, 49, 477, 55, 40);
  });

  it('keeps the Crown at least 30 tiles from the Spire and from the Yard', () => {
    const dist = (a: [number, number][], b: [number, number][]) =>
      Math.min(...a.flatMap(([i, j]) => b.map(([p, q]) => Math.hypot(i - p, j - q))));
    const spire = tiles.filter(([i, j]) => inBox(i, j, 419, 34, 420, 35));
    expect(dist(crownTiles, spire)).toBeGreaterThanOrEqual(30);
    expect(dist(crownTiles, yardTiles)).toBeGreaterThanOrEqual(30);
  });

  it('puts Saltmere 2 below the Crown across exactly 8 tiles of sky', () => {
    expect(allVoid(478, 49, 485, 55)).toBe(true);
    expect(ground(486, 52)).toBe(38);
    expect(ground(477, 52) - ground(486, 52)).toBe(2);
    expect(world.groundAt(SALTMERE.x, SALTMERE.z)).toBe(38);
  });
});
