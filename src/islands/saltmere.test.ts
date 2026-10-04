import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { exploreCached as explore } from '../explorecache';
import { Kind } from '../layout';
import { World } from '../world';
import { saltmere, stairTop } from './saltmere';

// The west half of Saltmere (x 486 to 583): the Strand and hub, the Tide Pool,
// the Driftwood Nest, the Salt Stair with Salt Rock, and the Stack.
// The Orangutan is not needed anywhere in the west half.

const world = new World();
const { layout } = world;

const west = (s: { x: number }) => s.x >= 486 && s.x < 584;
const respawn = (c: { x: number; z: number }) => ({ x: c.x - 1, z: c.z + 1 });
const START = { x: 492.5, z: 52.5 };
const HUB_MID = { x: 540.5, z: 52.5 };

const FIVE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf'];
const SIX: FormId[] = [...FIVE, 'ant'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);

const WEST_IDS = ['sm-tide', 'sm-nest', 'sm-salt', 'sm-stack'];
const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const ground = (i: number, j: number) => world.groundAt(i + 0.5, j + 0.5);
const isVoid = (i: number, j: number) => world.isVoid(i + 0.5, j + 0.5);
const westCheckpoints = layout.checkpoints.filter(west);
const westBread = layout.bread.filter(west);
const westEnemies = layout.enemies.filter(west);
const westPuzzles = layout.puzzles.filter((p) => west(p.speaker));
const westHints = layout.hints.filter(west);

const inBox = (i: number, j: number, i0: number, j0: number, i1: number, j1: number) =>
  i >= i0 && i <= i1 && j >= j0 && j <= j1;
/** Every tile of Saltmere's west half that is not void. */
const tiles: [number, number][] = [];
for (let j = 0; j < world.depth; j++) {
  for (let i = 486; i < 584; i++) if (!isVoid(i, j)) tiles.push([i, j]);
}
const nestLobe = tiles.filter(([i, j]) => inBox(i, j, 520, 33, 534, 45));
const nestInside = tiles.filter(([i, j]) => inBox(i, j, 521, 34, 533, 44));
const rock = tiles.filter(([i, j]) => inBox(i, j, 539, 8, 553, 21));
const rockInside = tiles.filter(([i, j]) => inBox(i, j, 542, 9, 550, 13));
const stack = tiles.filter(([i, j]) => inBox(i, j, 575, 34, 579, 38));
const tangleTiles = tiles.filter(([i, j]) => world.isTangle(i + 0.5, j + 0.5));
const reachedAny = (r: ReturnType<typeof explore>, list: [number, number][]) => list.filter(([i, j]) => r.has(i, j));
const dist = (a: [number, number][], b: [number, number][]) =>
  Math.min(...a.flatMap(([i, j]) => b.map(([p, q]) => Math.hypot(i - p, j - q))));

describe('Saltmere west with the shapes of level 6', () => {
  const six = explore(world, START, SIX, 'easy');

  it('lets six forms use every speaker and pickle, stand on every respawn spot and reach all bread', () => {
    expect(westPuzzles.map((p) => p.id)).toEqual(WEST_IDS);
    for (const p of westPuzzles) {
      expect(six.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(six.canUse(p.candle), `${p.id} pickle`).toBe(true);
    }
    expect(westCheckpoints.map((c) => c.id)).toEqual(['saltmere', 'sm-mid', 'sm-east', 'sm-nest', 'sm-salt']);
    for (const c of westCheckpoints) expect(six.canStand(respawn(c)), `checkpoint ${c.id}`).toBe(true);
    expect(westBread).toHaveLength(4);
    for (const b of westBread) expect(six.canStand(b), `bread ${b.id}`).toBe(true);
  });
});

describe('Saltmere west needs every shape', () => {
  const r = (forms: FormId[]) => explore(world, START, forms, 'max');

  it('uses no pickle without the human (a speaker may be)', () => {
    const x = r(without(SIX, 'human'));
    for (const id of WEST_IDS) expect(x.canUse(puzzle(id).candle), id).toBe(false);
  });

  it('enters neither ring and uses nothing of the Nest or Salt Rock without the ant', () => {
    const x = r(without(SIX, 'ant'));
    expect(reachedAny(x, nestInside).slice(0, 3), 'Nest').toEqual([]);
    expect(reachedAny(x, rockInside).slice(0, 3), 'Salt Rock ring').toEqual([]);
    for (const id of ['sm-nest', 'sm-salt']) {
      expect(x.canUse(puzzle(id).speaker), `${id} speaker`).toBe(false);
      expect(x.canUse(puzzle(id).candle), `${id} pickle`).toBe(false);
    }
  });

  it('cannot use the Nest speaker without the bunny, and reaches no tile of the Stack', () => {
    const x = r(without(SIX, 'bunny'));
    expect(x.canUse(puzzle('sm-nest').speaker)).toBe(false);
    expect(reachedAny(x, stack).slice(0, 3), 'Stack').toEqual([]);
  });

  it('reaches no tile of the Stack without the fairy', () => {
    expect(reachedAny(r(without(SIX, 'fairy')), stack).slice(0, 3)).toEqual([]);
  });

  it('reaches no tile of Salt Rock without the wolf', () => {
    expect(reachedAny(r(without(SIX, 'wolf')), rock).slice(0, 3)).toEqual([]);
  });

  it('reaches the Stack and Salt Rock with everyone (the checks above mean something)', () => {
    const x = r(SIX);
    expect(reachedAny(x, stack).length).toBeGreaterThan(10);
    expect(reachedAny(x, rock).length).toBeGreaterThan(100);
  });
  // The orangutan is not needed anywhere in the west half.
});

describe('Saltmere west rings', () => {
  const closed = (seedI: number, seedJ: number, box: [number, number, number, number], size: number) => {
    // Flood over every non-tangle tile, diagonals included: a diagonal-only join leaks.
    const seen = new Set<string>([`${seedI},${seedJ}`]);
    const todo: [number, number][] = [[seedI, seedJ]];
    while (todo.length > 0) {
      const [i, j] = todo.pop()!;
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const a = i + di;
          const b = j + dj;
          if (seen.has(`${a},${b}`) || world.isTangle(a + 0.5, b + 0.5)) continue;
          expect(inBox(a, b, ...box), `the flood leaked to (${a}, ${b})`).toBe(true);
          seen.add(`${a},${b}`);
          todo.push([a, b]);
        }
      }
    }
    expect(seen.size).toBe(size);
  };

  it('closes the Nest ring, joined edge to edge', () => closed(525, 40, [521, 34, 533, 44], 13 * 11));
  it('closes the Salt Rock ring, joined edge to edge', () => closed(546, 11, [542, 9, 550, 13], 9 * 5));

  it('keeps the Nest, from inside, to the Nest, even for five forms at the limit', () => {
    const r = explore(world, respawn({ x: 525.5, z: 42.5 }), FIVE, 'max');
    const out = reachedAny(r, tiles.filter(([i, j]) => !inBox(i, j, 521, 34, 533, 44)));
    expect(out.slice(0, 3)).toEqual([]);
    expect(reachedAny(r, nestInside).length).toBeGreaterThan(20);
  });

  it('has tangle only on the two rings, one tile thick', () => {
    for (const [i, j] of tangleTiles) {
      const nest = inBox(i, j, 520, 33, 534, 45) && !inBox(i, j, 521, 34, 533, 44);
      const salt = inBox(i, j, 541, 8, 551, 14) && !inBox(i, j, 542, 9, 550, 13);
      expect(nest || salt, `(${i}, ${j})`).toBe(true);
    }
    expect(tangleTiles).toHaveLength(2 * (15 + 13) - 4 + (2 * (11 + 7) - 4));
  });
});

describe('Saltmere west fairness for a one-heart Ant', () => {
  it('keeps every enemy post 11.5 tiles from every tile of the Nest lobe and Salt Rock', () => {
    expect(westEnemies).toHaveLength(5);
    for (const e of westEnemies) {
      for (const [i, j] of [...nestLobe, ...rock]) {
        expect(Math.hypot(e.x - (i + 0.5), e.z - (j + 0.5)), `enemy (${e.x}, ${e.z}) vs (${i}, ${j})`).toBeGreaterThanOrEqual(11.5);
      }
    }
  });

  it('puts no thing, enemy, checkpoint stand or respawn spot on a tangle or on crust', () => {
    const things = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
    ].filter(west);
    expect(things.length).toBeGreaterThan(25);
    for (const s of things) {
      expect(world.isTangle(s.x, s.z), `(${s.x}, ${s.z}) tangle`).toBe(false);
      expect(world.isThinIce(s.x, s.z), `(${s.x}, ${s.z}) crust`).toBe(false);
    }
  });

  it('keeps every west checkpoint 7 tiles from a guard post at about its height', () => {
    for (const c of westCheckpoints) {
      for (const e of westEnemies) {
        if (Math.abs(world.groundAt(e.x, e.z) - world.groundAt(c.x, c.z)) > 3) continue;
        expect(Math.hypot(e.x - c.x, e.z - c.z), `${c.id} vs guard (${e.x}, ${e.z})`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('keeps every archer 11.5 tiles from a respawn spot, unless it is 7.5 higher or lower', () => {
    const archers = westEnemies.filter((e) => e.kind === 'archer');
    expect(archers).toHaveLength(1);
    for (const c of westCheckpoints) {
      const spot = respawn(c);
      for (const a of archers) {
        if (Math.abs(world.groundAt(a.x, a.z) - world.groundAt(spot.x, spot.z)) >= 7.5) continue;
        expect(Math.hypot(a.x - spot.x, a.z - spot.z), `${c.id} vs archer (${a.x}, ${a.z})`).toBeGreaterThanOrEqual(11.5);
      }
    }
  });
});

describe('Saltmere west way out', () => {
  it('lets six forms on easy reach the hub from the respawn spots off the hub (the hub is flat)', () => {
    for (const c of westCheckpoints.filter((q) => q.id === 'sm-east' || q.id === 'sm-nest' || q.id === 'sm-salt')) {
      expect(explore(world, respawn(c), SIX, 'easy').canStand(HUB_MID), `from ${c.id}`).toBe(true);
    }
  }, 20000);
});

describe('Saltmere west things', () => {
  it('stand on real ground', () => {
    const spots = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, respawn(c)]),
      ...layout.bread,
      ...layout.enemies,
    ].filter(west);
    const pickles = westPuzzles.map((p) => p.candle);
    for (const s of spots) {
      expect(world.groundAt(s.x, s.z), `(${s.x}, ${s.z})`).toBeGreaterThan(0);
      // Only a pickle is in water.
      expect(world.isWater(s.x, s.z), `(${s.x}, ${s.z}) water`).toBe(pickles.includes(s as never));
    }
  });

  it('has no id clash among its things', () => {
    for (const list of [westCheckpoints, westBread, westPuzzles]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    const hints = westHints.map((h) => h.id);
    expect(new Set(hints).size).toBe(hints.length);
  });

  it('gives the four puzzles six different notes each, and different melodies', () => {
    for (const p of westPuzzles) expect(new Set(p.melody).size, p.id).toBe(6);
    expect(new Set(westPuzzles.map((p) => p.melody.join(','))).size).toBe(4);
    // None repeats a melody of an earlier island (the brief's sm-nest melody clashed with ff-under).
    const others = new Set(layout.puzzles.filter((p) => !westPuzzles.includes(p) && p.speaker.x < 584).map((p) => p.melody.join(',')));
    for (const p of westPuzzles) expect(others.has(p.melody.join(',')), p.id).toBe(false);
  });

  it('has no trees and no boulders', () => {
    expect(layout.trees.filter(west)).toEqual([]);
    expect(layout.boulders.filter(west)).toEqual([]);
  });

  it('uses only sand, salt and stone', () => {
    const kinds = new Set<number>();
    new World([
      {
        id: 'scratch',
        name: 'Scratch',
        build(t) {
          const built = saltmere.build({
            ...t,
            set(i, j, h, k) {
              kinds.add(k);
              t.set(i, j, h, k);
            },
          });
          return { ...built, spawn: START };
        },
      },
    ]);
    expect([...kinds].sort()).toEqual([Kind.Sand, Kind.Stone, Kind.Salt].sort());
  });
});

describe('Saltmere west from the game camera', () => {
  const seen = (what: string, x: number, z: number, y = world.groundAt(x, z)): void => {
    for (let k = 0.25; k <= 30; k += 0.25) {
      expect(world.groundAt(x - k, z + k), `${what} (${x}, ${z}) hidden at k=${k}`).toBeLessThanOrEqual(y + 0.9 + 1.12 * k);
    }
  };

  it('hides no speaker, pickle, checkpoint or bread', () => {
    const plain = [...westPuzzles.map((p) => p.speaker), ...westCheckpoints, ...westBread];
    expect(plain.length).toBeGreaterThan(12);
    for (const s of plain) seen('thing', s.x, s.z);
    // A pickle is seen through the water, from the surface.
    for (const p of westPuzzles) seen('pickle', p.candle.x, p.candle.z, world.waterLevelAt(p.candle.x, p.candle.z));
  });
});

describe('Saltmere west geometry the design leans on', () => {
  const allVoid = (i0: number, j0: number, i1: number, j1: number) => {
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (!isVoid(i, j)) return false;
    return true;
  };
  const flat = (i0: number, j0: number, i1: number, j1: number, h: number) => {
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) expect(ground(i, j), `(${i}, ${j})`).toBe(h);
  };
  /** A pool: its water 0.3 under the rim, the bed 4 under the water around the pickle. */
  const poolOk = (p: { x: number; z: number }, rim: number) => {
    expect(world.isWater(p.x, p.z)).toBe(true);
    expect(world.waterLevelAt(p.x, p.z)).toBeCloseTo(rim - 0.3, 4);
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      expect(world.groundAt(p.x + dx, p.z + dz), 'bed').toBeCloseTo(rim - 4.3, 4);
    }
  };

  it('keeps the landing as the old tests need it', () => {
    for (let j = 49; j <= 55; j++) for (let i = 478; i <= 485; i++) expect(isVoid(i, j), `(${i}, ${j})`).toBe(true);
    expect(ground(486, 52)).toBe(38);
    expect(world.groundAt(layout.arrivals.find((a) => a.id === 'saltmere')!.x, 52)).toBe(38);
  });

  it('has a hub at 38 that is at least 11 deep everywhere from the landing to x 583', () => {
    for (let i = 498; i <= 583; i++) {
      let run = 0;
      for (let j = 46; j <= 58; j++) if (!isVoid(i, j)) run++;
      // Pools and the lobe's neighbours keep their own heights; the rest is the hub.
      expect(run, `column ${i}`).toBeGreaterThanOrEqual(11);
    }
    flat(510, 47, 517, 57, 38);
    flat(552, 47, 570, 57, 38);
    // The straight stretches of the north edge, and the last four columns of the south edge.
    for (const i of [...Array(17).keys()].map((k) => 519 + k).concat([543, 544, 545, 546, 547, 548, 549], [571, 572, 573, 574, 575, 576, 577, 578, 579, 580, 581, 582, 583])) {
      expect(isVoid(i, 46), `north edge ${i}`).toBe(false);
    }
    for (let i = 580; i <= 583; i++) expect(isVoid(i, 58), `south edge ${i}`).toBe(false);
  });

  it('digs the pools 0.3 under their rims and 4 deep round the pickle', () => {
    poolOk(puzzle('sm-tide').candle, 38);
    poolOk(puzzle('sm-nest').candle, 38);
    poolOk(puzzle('sm-salt').candle, 44);
    poolOk(puzzle('sm-stack').candle, 42);
    // The Tide Pool's outer ring is 1 deep.
    expect(world.groundAt(500.5, 52.5)).toBeCloseTo(36.7, 4);
    expect(world.waterLevelAt(500.5, 52.5)).toBeCloseTo(37.7, 4);
  });

  it('climbs the stair 0.25 a tile over open sky from 38.25 to 44, level with Salt Rock', () => {
    for (let j = 22; j <= 45; j++) {
      for (const i of [545, 546, 547]) {
        expect(world.isThinIce(i + 0.5, j + 0.5), `(${i}, ${j}) crust`).toBe(true);
      }
      for (const i of [543, 544, 548, 549]) expect(isVoid(i, j) && !world.isThinIce(i + 0.5, j + 0.5), `(${i}, ${j}) sky`).toBe(true);
      expect(stairTop(j)).toBeCloseTo(38 + 0.25 * (46 - j), 9);
    }
    expect(stairTop(45)).toBeCloseTo(38.25, 9);
    expect(stairTop(22)).toBeCloseTo(44, 9);
    for (let j = 8; j <= 21; j++) for (let i = 539; i <= 553; i++) if (!inBox(i, j, 546, 10, 548, 12)) expect(ground(i, j)).toBe(44);
  });

  it('puts the Stack at hub + 4 across exactly 7 tiles of sky, 22 tiles from Salt Rock', () => {
    for (let j = 34; j <= 38; j++) for (let i = 575; i <= 579; i++) if (!inBox(i, j, 576, 35, 578, 37)) expect(ground(i, j)).toBe(42);
    expect(allVoid(575, 39, 579, 45)).toBe(true);
    expect(isVoid(574, 36) && isVoid(580, 36) && isVoid(577, 33)).toBe(true);
    expect(ground(577, 46)).toBe(38);
    expect(dist(stack, rock)).toBeGreaterThanOrEqual(22);
  });

  it('keeps the Nest block 4 over the hub', () => {
    flat(522, 35, 524, 36, 42);
    expect(world.groundAt(522.5, 35.5)).toBeGreaterThanOrEqual(42);
  });
});
