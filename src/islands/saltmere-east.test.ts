import { describe, expect, it } from 'vitest';
import { FormId, KELP_DEEP, KELP_LOW } from '../forms';
import { exploreCached as explore } from '../explorecache';
import { Kind } from '../layout';
import { World } from '../world';
import { buildEast, COVE, DEEP_BED, HUB, LEVEL, RING, ROAD } from './saltmere-east';

// The east half of Saltmere (x >= 584): the Mere, Palm Key behind its ring of low
// kelp, and the Deep Road to Pearl Rock under deep kelp.
//
// The Bunny, the Wolf and the Ant are not needed by anything here: the Key needs
// the Human (under the kelp), the Orangutan (the palm road) and the Fairy (the
// flight to Pickle Rock), and the way off needs only the Mermaid.

const world = new World();
const { layout } = world;

const east = (s: { x: number }) => s.x >= 584 && s.x < 700;
const respawn = (c: { x: number; z: number }) => ({ x: c.x - 1, z: c.z + 1 });
const BEACH = { x: 582.5, z: 52.5 };
const LOOKOUT = { x: 598.5, z: 33.5 };
const RIM = { x: 611.5, z: 33.5 };
const PEARL_ARRIVAL = layout.arrivals.find((a) => a.id === 'sm-pearl')!;

const SIX: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant'];
const SEVEN: FormId[] = [...SIX, 'mermaid'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);

const puzzle = layout.puzzles.find((p) => p.id === 'sm-key')!;
const ground = (i: number, j: number) => world.groundAt(i + 0.5, j + 0.5);
const isVoid = (i: number, j: number) => world.isVoid(i + 0.5, j + 0.5);
const eastCheckpoints = layout.checkpoints.filter(east);
const eastBread = layout.bread.filter(east);
const eastEnemies = layout.enemies.filter(east);
const eastTrees = layout.trees.filter(east);
const checkpoint = (id: string) => layout.checkpoints.find((c) => c.id === id)!;

/** Every tile of the east half that is not void. */
const tiles: [number, number][] = [];
for (let j = 0; j < world.depth; j++) {
  for (let i = 584; i < world.width; i++) if (!isVoid(i, j)) tiles.push([i, j]);
}
const inBox = (i: number, j: number, i0: number, j0: number, i1: number, j1: number) =>
  i >= i0 && i <= i1 && j >= j0 && j <= j1;
const inRing = (i: number, j: number) => inBox(i, j, RING.i0, RING.j0, RING.i1, RING.j1);
const insideTiles = tiles.filter(([i, j]) => inRing(i, j));
const outsideTiles = tiles.filter(([i, j]) => !inRing(i, j));
const lookoutTiles = tiles.filter(([i, j]) => inBox(i, j, 595, 31, 602, 36));
const rockTiles = tiles.filter(([i, j]) => inBox(i, j, 611, 31, 615, 35));
const roadTiles = tiles.filter(([i, j]) => inBox(i, j, ROAD.i0, ROAD.j0, ROAD.i1, ROAD.j1));
const coveTiles = tiles.filter(([i, j]) => inBox(i, j, COVE.i0, COVE.j0, COVE.i1, COVE.j1));
const pearlTiles = tiles.filter(([i]) => i >= 659);
const kelpTiles = tiles.filter(([i, j]) => world.isKelp(i + 0.5, j + 0.5));
const lowMats = kelpTiles.filter(([i, j]) => world.kelpDepthAt(i + 0.5, j + 0.5) === KELP_LOW);
const deepMats = kelpTiles.filter(([i, j]) => world.kelpDepthAt(i + 0.5, j + 0.5) === KELP_DEEP);

const reachedAny = (r: ReturnType<typeof explore>, list: [number, number][]) => list.filter(([i, j]) => r.has(i, j));
const bedDepth = (i: number, j: number) => world.waterLevelAt(i + 0.5, j + 0.5) - ground(i, j);

describe('Saltmere east with six shapes', () => {
  const six = explore(world, BEACH, SIX, 'easy');

  it('lets six forms use the speaker and the pickle and reach the Key and the Lookout', () => {
    expect(six.canUse(puzzle.speaker), 'speaker').toBe(true);
    expect(six.canUse(puzzle.candle), 'pickle').toBe(true);
    expect(six.canStand(respawn(checkpoint('sm-key'))), 'respawn spot').toBe(true);
    for (const id of ['sm-key', 'sm-lookout']) {
      const b = eastBread.find((q) => q.id === id)!;
      expect(six.canStand(b), `bread ${id}`).toBe(true);
    }
  });

  it('keeps six forms off the Deep Road, the cove and Pearl Rock', () => {
    expect(reachedAny(six, roadTiles).slice(0, 3), 'road').toEqual([]);
    expect(reachedAny(six, coveTiles).slice(0, 3), 'cove').toEqual([]);
    expect(reachedAny(six, pearlTiles).slice(0, 3), 'Pearl Rock').toEqual([]);
  });
});

describe('Saltmere east needs the Human, the Orangutan and the Fairy', () => {
  it('keeps everything inside the ring out of reach without the human', () => {
    const r = explore(world, BEACH, without(SIX, 'human'), 'max');
    expect(reachedAny(r, insideTiles).slice(0, 3)).toEqual([]);
  });

  it('keeps the Lookout, Pickle Rock and the speaker out of reach without the orangutan', () => {
    const r = explore(world, BEACH, without(SIX, 'orangutan'), 'max');
    expect(reachedAny(r, lookoutTiles).slice(0, 3), 'Lookout').toEqual([]);
    expect(reachedAny(r, rockTiles).slice(0, 3), 'Pickle Rock').toEqual([]);
    expect(r.canUse(puzzle.speaker), 'speaker').toBe(false);
  });

  it('keeps Pickle Rock out of reach without the fairy', () => {
    const r = explore(world, BEACH, without(SIX, 'fairy'), 'max');
    expect(reachedAny(r, rockTiles).slice(0, 3)).toEqual([]);
    expect(r.canUse(puzzle.candle)).toBe(false);
  });

  it('cannot use the pickle when floating only (no human), even from the rim', () => {
    const r = explore(world, RIM, without(SIX, 'human'), 'max');
    expect(r.canUse(puzzle.candle)).toBe(false);
  });
});

describe('Saltmere east is sealed', () => {
  const noHuman = without(SIX, 'human');

  it('keeps five forms without the human inside the ring, from the Lookout', () => {
    const r = explore(world, LOOKOUT, noHuman, 'max');
    expect(reachedAny(r, lookoutTiles).length).toBeGreaterThan(30);
    expect(reachedAny(r, outsideTiles).slice(0, 3)).toEqual([]);
  });

  it('keeps five forms without the human inside the ring, from Pickle Rock', () => {
    const r = explore(world, RIM, noHuman, 'max');
    expect(reachedAny(r, rockTiles).length).toBeGreaterThan(10);
    expect(reachedAny(r, outsideTiles).slice(0, 3)).toEqual([]);
  });

  it('closes the ring of kelp, joined edge to edge', () => {
    // Flood from inside over every tile that is not kelp, diagonals included: a
    // diagonal-only join would let the flood leak out.
    const seen = new Set<string>(['594,46']);
    const todo: [number, number][] = [[594, 46]];
    while (todo.length > 0) {
      const [i, j] = todo.pop()!;
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const a = i + di;
          const b = j + dj;
          if (seen.has(`${a},${b}`) || world.isKelp(a + 0.5, b + 0.5)) continue;
          expect(inRing(a, b), `the flood leaked to (${a}, ${b})`).toBe(true);
          seen.add(`${a},${b}`);
          todo.push([a, b]);
        }
      }
    }
    expect(seen.size).toBe((RING.i1 - RING.i0 - 1) * (RING.j1 - RING.j0 - 1));
    expect(lowMats).toHaveLength(2 * (RING.i1 - RING.i0 + 1) + 2 * (RING.j1 - RING.j0 - 1));
    for (const [i, j] of lowMats) {
      expect(i === RING.i0 || i === RING.i1 || j === RING.j0 || j === RING.j1, `(${i}, ${j}) is on the ring`).toBe(true);
    }
  });
});

describe('Saltmere east needs the Mermaid to leave', () => {
  const nothingOfTheRoad = (r: ReturnType<typeof explore>) => {
    expect(reachedAny(r, roadTiles).slice(0, 3), 'road').toEqual([]);
    expect(reachedAny(r, coveTiles).slice(0, 3), 'cove').toEqual([]);
    expect(reachedAny(r, pearlTiles).slice(0, 3), 'Pearl Rock').toEqual([]);
  };

  it('keeps six forms off the road, from the beach, at the limit', () => nothingOfTheRoad(explore(world, BEACH, SIX, 'max')));
  it('keeps six forms off the road, from the Lookout, at the limit', () => nothingOfTheRoad(explore(world, LOOKOUT, SIX, 'max')));
  it('keeps six forms off the road, from Pickle Rock, at the limit', () => nothingOfTheRoad(explore(world, RIM, SIX, 'max')));

  it('lets seven forms stand on Pearl Rock', () => {
    const r = explore(world, BEACH, SEVEN, 'easy');
    expect(r.canStand(respawn(checkpoint('sm-pearl'))), 'respawn spot').toBe(true);
    expect(r.canStand(PEARL_ARRIVAL), 'arrival').toBe(true);
  });

  it('needs only her: seven forms minus any one of the others still get there', () => {
    for (const f of SIX) {
      const r = explore(world, BEACH, without(SEVEN, f), 'easy');
      expect(r.canStand(respawn(checkpoint('sm-pearl'))), `without ${f}`).toBe(true);
      expect(r.canStand(PEARL_ARRIVAL), `without ${f}`).toBe(true);
    }
  });
});

describe('Saltmere east beds', () => {
  const near = (list: [number, number][], i: number, j: number) =>
    list.some(([a, b]) => Math.abs(a - i) <= 2 && Math.abs(b - j) <= 2);

  it('keeps every water tile within 2 of a low mat at least 4.5 deep', () => {
    let checked = 0;
    for (const [i, j] of tiles) {
      if (!world.isWater(i + 0.5, j + 0.5) || !near(lowMats, i, j)) continue;
      checked++;
      expect(bedDepth(i, j), `(${i}, ${j})`).toBeGreaterThanOrEqual(4.5);
    }
    expect(checked).toBeGreaterThan(300);
  });

  it('keeps every water tile in the road\'s rows within 2 of its mats at least 6.5 deep', () => {
    let checked = 0;
    for (const [i, j] of tiles) {
      if (j < ROAD.j0 || j > ROAD.j1 || !world.isWater(i + 0.5, j + 0.5) || !near(deepMats, i, j)) continue;
      checked++;
      expect(bedDepth(i, j), `(${i}, ${j})`).toBeGreaterThanOrEqual(6.5);
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('Saltmere east fairness', () => {
  it('keeps every east checkpoint 7 tiles from a guard post at about its height', () => {
    expect(eastEnemies).toHaveLength(2);
    for (const c of eastCheckpoints) {
      for (const e of eastEnemies) {
        if (Math.abs(world.groundAt(e.x, e.z) - world.groundAt(c.x, c.z)) > 3) continue;
        expect(Math.hypot(e.x - c.x, e.z - c.z), `${c.id} vs guard (${e.x}, ${e.z})`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('keeps every archer 11.5 tiles from a respawn spot, unless it is 7.5 higher or lower', () => {
    const archers = layout.enemies.filter((e) => e.kind === 'archer');
    expect(archers.filter(east)).toHaveLength(1);
    for (const c of layout.checkpoints.filter((q) => q.x >= 540)) {
      const spot = respawn(c);
      for (const a of archers) {
        if (Math.abs(world.groundAt(a.x, a.z) - world.groundAt(spot.x, spot.z)) >= 7.5) continue;
        expect(Math.hypot(a.x - spot.x, a.z - spot.z), `${c.id} vs archer (${a.x}, ${a.z})`).toBeGreaterThanOrEqual(11.5);
      }
    }
  });

  it('puts no thing, enemy, checkpoint stand or respawn spot on a kelp mat', () => {
    const things = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
      ...layout.trees,
      ...layout.hints,
      ...layout.arrivals,
    ].filter(east);
    expect(things.length).toBeGreaterThan(20);
    for (const s of things) expect(world.isKelp(s.x, s.z), `(${s.x}, ${s.z})`).toBe(false);
  });
});

describe('Saltmere east way out', () => {
  it('lets six forms on easy get from the Key\'s respawn spot to the beach', () => {
    const r = explore(world, respawn(checkpoint('sm-key')), SIX, 'easy');
    expect(r.canStand(BEACH)).toBe(true);
  });

  it('lets seven forms on easy get from Pearl Rock\'s respawn spot to the beach', () => {
    const r = explore(world, respawn(checkpoint('sm-pearl')), SEVEN, 'easy');
    expect(r.canStand(BEACH)).toBe(true);
  });
});

describe('Saltmere east things', () => {
  it('stand on real ground, the pickle on its bed', () => {
    const spots = [
      ...layout.puzzles.flatMap((p) => [p.speaker]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
      ...layout.trees,
    ].filter(east);
    for (const s of spots) {
      expect(world.groundAt(s.x, s.z), `(${s.x}, ${s.z})`).toBeGreaterThan(0);
      expect(world.isWater(s.x, s.z), `(${s.x}, ${s.z}) water`).toBe(false);
    }
    expect(world.isWater(puzzle.candle.x, puzzle.candle.z)).toBe(true);
    expect(world.groundAt(puzzle.candle.x, puzzle.candle.z)).toBeCloseTo(44.7, 5);
    expect(world.waterLevelAt(puzzle.candle.x, puzzle.candle.z)).toBeCloseTo(48.7, 5);
  });

  it('has no id clash among its things', () => {
    for (const list of [eastCheckpoints, eastBread, layout.puzzles.filter((p) => east(p.speaker))]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    const hints = layout.hints.map((h) => h.id);
    expect(new Set(hints).size).toBe(hints.length);
    const all = [...layout.checkpoints, ...layout.bread, ...layout.puzzles].map((x) => x.id);
    expect(all.filter((id) => id.startsWith('sm-')).length).toBeGreaterThan(5);
  });

  it('has exactly three trees, all great palms, and no boulders', () => {
    expect(eastTrees).toHaveLength(3);
    for (const t of eastTrees) expect(t.kind).toBe('greatPalm');
    expect(layout.boulders.filter(east)).toEqual([]);
  });

  it('uses only sand and stone', () => {
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
          return { ...built, spawn: BEACH };
        },
      },
    ]);
    expect([...kinds].sort()).toEqual([Kind.Sand, Kind.Stone].sort());
  });
});

describe('Saltmere east from the game camera', () => {
  const seen = (what: string, x: number, z: number): void => {
    const y = world.groundAt(x, z);
    for (let k = 0.25; k <= 30; k += 0.25) {
      expect(world.groundAt(x - k, z + k), `${what} (${x}, ${z}) hidden at k=${k}`).toBeLessThanOrEqual(y + 0.9 + 1.12 * k);
    }
  };

  it('hides no speaker, pickle, checkpoint, bread or palm', () => {
    const spots = [
      ...layout.puzzles.flatMap((p) => [p.speaker]),
      ...layout.checkpoints,
      ...layout.bread,
      ...layout.trees,
    ].filter(east);
    expect(spots.length).toBeGreaterThan(8);
    for (const s of spots) seen('thing', s.x, s.z);
  });

  it('shows the pool of Pickle Rock from its surface, where the pickle shows through', () => {
    const { x, z } = puzzle.candle;
    const y = world.waterLevelAt(x, z);
    for (let k = 0.25; k <= 30; k += 0.25) {
      expect(world.groundAt(x - k, z + k), `pool hidden at k=${k}`).toBeLessThanOrEqual(y + 0.9 + 1.12 * k);
    }
  });
});

describe('Saltmere east geometry the design leans on', () => {
  const allVoid = (i0: number, j0: number, i1: number, j1: number) => {
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (!isVoid(i, j)) return false;
    return true;
  };
  const flat = (i0: number, j0: number, i1: number, j1: number, h: number) => {
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) expect(ground(i, j), `(${i}, ${j})`).toBe(h);
  };

  it('puts the Mere 0.3 under the beach', () => {
    expect(ground(583, 52)).toBe(HUB);
    expect(world.isWater(584.5, 52.5)).toBe(true);
    expect(HUB - world.waterLevelAt(584.5, 52.5)).toBeCloseTo(0.3, 6);
    expect(world.waterLevelAt(584.5, 52.5)).toBe(LEVEL);
  });

  it('rises one a tree on the pillars, to the Lookout at the last treetop + 1', () => {
    expect(ground(597, 43)).toBe(HUB);
    expect(ground(597, 40)).toBe(HUB + 1);
    expect(ground(599, 38)).toBe(HUB + 2);
    expect(ground(599, 38) + 5).toBe(45);
    flat(595, 31, 602, 36, 46);
    expect(ground(595, 31)).toBe(ground(599, 38) + 5 + 1);
    expect(world.isWater(599.5, 37.5), 'one empty row of water before the Lookout').toBe(true);
    expect(world.treeAt(599.5, 38.5)).toBe(5);
  });

  it('puts Pickle Rock 3 over the Lookout across exactly 8 tiles of water', () => {
    for (let j = 31; j <= 35; j++) {
      for (let i = 611; i <= 615; i++) {
        const pool = i >= 612 && i <= 614 && j >= 32 && j <= 34;
        expect(ground(i, j), `(${i}, ${j})`).toBe(pool ? ground(612, 32) : 49);
      }
    }
    for (let j = 31; j <= 35; j++) {
      for (let i = 603; i <= 610; i++) expect(world.isWater(i + 0.5, j + 0.5), `(${i}, ${j})`).toBe(true);
    }
    expect(ground(611, 33) - ground(602, 33)).toBe(3);
    expect(bedDepth(612, 33)).toBeCloseTo(4, 5);
  });

  it('lays the road 36 long and 3 wide over open sky, all deep kelp', () => {
    expect(roadTiles).toHaveLength(36 * 3);
    for (const [i, j] of roadTiles) {
      expect(world.kelpDepthAt(i + 0.5, j + 0.5), `(${i}, ${j})`).toBe(KELP_DEEP);
      expect(world.isWater(i + 0.5, j + 0.5)).toBe(true);
    }
    expect(deepMats).toHaveLength(36 * 3);
    for (let i = ROAD.i0; i <= ROAD.i1; i++) {
      for (const j of [ROAD.j0 - 2, ROAD.j0 - 1, ROAD.j1 + 1, ROAD.j1 + 2]) {
        expect(isVoid(i, j), `(${i}, ${j}) is sky`).toBe(true);
      }
    }
    expect(bedDepth(ROAD.i0, ROAD.j0)).toBeGreaterThanOrEqual(7);
    expect(ground(ROAD.i0, ROAD.j0)).toBeCloseTo(DEEP_BED, 5);
  });

  it('puts the cove at least 30 tiles from any open water, with no mat on it', () => {
    expect(coveTiles).toHaveLength(12);
    for (const [i, j] of coveTiles) {
      expect(world.isWater(i + 0.5, j + 0.5)).toBe(true);
      expect(world.isKelp(i + 0.5, j + 0.5)).toBe(false);
    }
    const open = tiles.filter(([i, j]) => world.isWater(i + 0.5, j + 0.5) && !world.isKelp(i + 0.5, j + 0.5));
    const farOpen = open.filter(([i, j]) => !coveTiles.some(([a, b]) => a === i && b === j));
    const dist = Math.min(...farOpen.flatMap(([i, j]) => coveTiles.map(([a, b]) => Math.hypot(i - a, j - b))));
    expect(dist).toBeGreaterThanOrEqual(30);
  });

  it('puts land on three sides of the cove', () => {
    for (let j = 54; j <= 56; j++) expect(ground(663, j)).toBe(HUB);
    for (let i = 659; i <= 662; i++) {
      expect(ground(i, 53)).toBe(HUB);
      expect(ground(i, 57)).toBe(HUB);
    }
    expect(allVoid(ROAD.i0, 50, ROAD.i1, 52)).toBe(true);
  });
});
