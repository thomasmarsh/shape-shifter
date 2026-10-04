import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { exploreIn } from './testkit';
import { Kind, World } from '../world';
import { matTop } from './underroot';

// Underroot is one island built from two files: the landing, the hub and three
// candles in underroot.ts (x <= 384), and the rest in underroot-east.ts. These
// tests cover the west half.

const world = new World();
// Underroot's columns and a margin for its neighbours; the explores see only these.
const explore = exploreIn(world, { x0: 259, x1: 520 });
const { layout } = world;

const west = (s: { x: number }) => s.x >= 299 && s.x < 385;
const respawn = (c: { x: number; z: number }) => ({ x: c.x - 1, z: c.z + 1 });
const START = { x: 304.5, z: 51.5 };
const HUB = 32;

const FIVE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf'];
const fiveWithout = (f: FormId): FormId[] => FIVE.filter((x) => x !== f);
const IDS = ['ur-mat', 'ur-pier', 'ur-glade'];

const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const ground = (i: number, j: number) => world.groundAt(i + 0.5, j + 0.5);
const checkpoints = layout.checkpoints.filter((c) => west(c) && (c.id === 'underroot' || c.id.startsWith('ur-')));
const breads = layout.bread.filter((b) => west(b) && b.id.startsWith('ur-'));
const guards = layout.enemies.filter(west);
const spotsOf = () => [
  ...layout.puzzles.filter((p) => IDS.includes(p.id)).flatMap((p) => [p.speaker, p.candle]),
  ...checkpoints.flatMap((c) => [c, respawn(c)]),
  ...breads,
  ...guards,
];

const rFive = explore(START, FIVE, 'easy');

describe('Underroot west with all five forms on easy', () => {
  it('lets the three west puzzles be solved', () => {
    for (const id of IDS) {
      expect(rFive.canUse(puzzle(id).speaker), `${id} speaker`).toBe(true);
      expect(rFive.canUse(puzzle(id).candle), `${id} candle`).toBe(true);
    }
  });

  it('reaches every west checkpoint respawn spot and every west bread', () => {
    expect(checkpoints.map((c) => c.id).sort()).toEqual(['underroot', 'ur-glade', 'ur-mat', 'ur-mid']);
    for (const c of checkpoints) expect(rFive.canStand(respawn(c)), `checkpoint ${c.id}`).toBe(true);
    expect(breads.map((b) => b.id).sort()).toEqual(['ur-clearing', 'ur-hub', 'ur-mat', 'ur-pier']);
    for (const b of breads) expect(rFive.canStand(b), `bread ${b.id}`).toBe(true);
  });

  it('has six distinct notes in each melody, none repeating another island', () => {
    const seen = new Set(layout.puzzles.filter((p) => !IDS.includes(p.id)).map((p) => p.melody.join()));
    for (const id of IDS) {
      const p = puzzle(id);
      expect(p.melody, id).toHaveLength(6);
      expect(new Set(p.melody).size, id).toBe(6);
      expect(seen.has(p.melody.join()), `${id} repeats a melody`).toBe(false);
      seen.add(p.melody.join());
    }
  });

  it('has the arrival card where Frostfang ends', () => {
    const a = layout.arrivals.find((x) => x.id === 'underroot')!;
    expect(a.title).toBe('Underroot');
    expect(Math.hypot(a.x - 304.5, a.z - 51)).toBeLessThan(a.radius);
  });
});

describe('Underroot west with the human alone', () => {
  it('solves the Clearing but nothing else', () => {
    const r = explore(START, ['human'], 'easy');
    expect(r.canUse(puzzle('ur-glade').speaker)).toBe(true);
    expect(r.canUse(puzzle('ur-glade').candle)).toBe(true);
    expect(r.canUse(puzzle('ur-mat').speaker)).toBe(false);
    expect(r.canUse(puzzle('ur-pier').speaker)).toBe(false);
  });
});

describe('Underroot west needs every shape', () => {
  const can = (forms: FormId[], id: string) => {
    const r = explore(START, forms, 'max');
    return { speaker: r.canUse(puzzle(id).speaker), candle: r.canUse(puzzle(id).candle) };
  };

  it('Mat Rock and Pier Rock need the wolf', () => {
    const r = explore(START, fiveWithout('wolf'), 'max');
    expect(can(fiveWithout('wolf'), 'ur-mat')).toEqual({ speaker: false, candle: false });
    expect(can(fiveWithout('wolf'), 'ur-pier')).toEqual({ speaker: false, candle: false });
    expect(r.canStand({ x: 335.5, z: 20.5 }), 'Mat Rock').toBe(false);
    expect(r.canStand({ x: 366.5, z: 16.5 }), 'Pier Rock').toBe(false);
  });

  it('the Mat Rock candle needs the bunny, its speaker does not', () => {
    const c = can(fiveWithout('bunny'), 'ur-mat');
    expect(c.candle).toBe(false);
    expect(c.speaker).toBe(true);
  });

  it('nothing on Pier Rock without the fairy', () => {
    expect(can(fiveWithout('fairy'), 'ur-pier')).toEqual({ speaker: false, candle: false });
  });

  it('the Pier needs no bunny', () => {
    const r = explore(START, fiveWithout('bunny'), 'easy');
    expect(r.canUse(puzzle('ur-pier').speaker)).toBe(true);
    expect(r.canUse(puzzle('ur-pier').candle)).toBe(true);
  });
});

describe('Underroot west way out', () => {
  it('lets five forms reach the arrival from every west checkpoint', () => {
    for (const c of checkpoints) {
      const r = explore(respawn(c), FIVE, 'easy');
      expect(r.canStand(START), `from ${c.id}`).toBe(true);
    }
  });
});

describe('Underroot west things', () => {
  it('stand on real ground, never in the sky, on thin ice, in water or in a tangle', () => {
    const spots = spotsOf();
    expect(spots.length).toBeGreaterThan(20);
    for (const s of spots) {
      expect(world.groundAt(s.x, s.z), `(${s.x}, ${s.z})`).toBeGreaterThan(0);
      expect(world.isThinIce(s.x, s.z), `(${s.x}, ${s.z}) thin ice`).toBe(false);
      expect(world.isWater(s.x, s.z), `(${s.x}, ${s.z}) water`).toBe(false);
      expect(world.isTangle(s.x, s.z), `(${s.x}, ${s.z}) tangle`).toBe(false);
    }
  });

  it('has no id clash among its things', () => {
    for (const items of [layout.checkpoints, layout.bread, layout.hints, layout.puzzles, layout.arrivals]) {
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('has no trees or boulders at x <= 384, and no snow or ice tile', () => {
    expect(layout.trees.filter((t) => t.x >= 299 && t.x <= 385)).toEqual([]);
    expect(layout.boulders.filter((b) => b.x >= 299 && b.x <= 385)).toEqual([]);
    const kinds = (world as unknown as { kind: Uint8Array }).kind;
    for (let j = 0; j < world.depth; j++) {
      for (let i = 299; i <= 384; i++) {
        if (world.isVoid(i + 0.5, j + 0.5)) continue;
        const k = kinds[j * world.width + i];
        expect(k === Kind.Snow || k === Kind.Ice, `(${i}, ${j})`).toBe(false);
      }
    }
  });

  it('has no ground west of the hub in Frostfang\'s sky', () => {
    // (Frostfang's Last Rock ends at x = 306 for z <= 14; its last run is thin ice at x 303..305.)
    for (let j = 0; j < 46; j++) for (let i = 307; i < 329; i++) expect(world.isVoid(i + 0.5, j + 0.5), `(${i}, ${j})`).toBe(true);
    for (let j = 15; j < 46; j++) expect(world.isVoid(306.5, j + 0.5), `(306, ${j})`).toBe(true);
  });
});

describe('Underroot west guards', () => {
  it('stand clear of pedestals', () => {
    for (const e of guards) expect(world.solidAt(e.x, e.z), `(${e.x}, ${e.z})`).toBe(world.groundAt(e.x, e.z));
  });
});

describe('Underroot west respawns', () => {
  it('keeps every checkpoint at least 7 tiles from a guard post at about its height', () => {
    for (const c of checkpoints) {
      for (const e of guards) {
        if (Math.abs(world.groundAt(e.x, e.z) - world.groundAt(c.x, c.z)) > 3) continue;
        expect(Math.hypot(e.x - c.x, e.z - c.z), `${c.id} vs guard (${e.x}, ${e.z})`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('keeps every archer 11.5 tiles from a respawn spot, unless it is 7.5 higher or lower', () => {
    const archers = guards.filter((e) => e.kind === 'archer');
    expect(archers).toHaveLength(1);
    for (const c of checkpoints) {
      const spot = respawn(c);
      for (const a of archers) {
        if (Math.abs(world.groundAt(a.x, a.z) - world.groundAt(spot.x, spot.z)) >= 7.5) continue;
        expect(Math.hypot(a.x - spot.x, a.z - spot.z), `${c.id} vs archer (${a.x}, ${a.z})`).toBeGreaterThanOrEqual(11.5);
      }
    }
  });
});

describe('Underroot west from the game camera', () => {
  // A tile k tiles toward the camera (south-west) hides a spot if it is higher
  // than the line of sight: the spot's height + 0.9 + 1.12 k.
  const seen = (what: string, x: number, z: number): void => {
    const y = world.groundAt(x, z);
    for (let k = 0.25; k <= 30; k += 0.25) {
      expect(world.groundAt(x - k, z + k), `${what} (${x}, ${z}) hidden at k=${k}`).toBeLessThanOrEqual(y + 0.9 + 1.12 * k);
    }
  };

  it('hides no speaker, candle, checkpoint or bread', () => {
    const spots = [
      ...layout.puzzles.filter((p) => IDS.includes(p.id)).flatMap((p) => [p.speaker, p.candle]),
      ...checkpoints,
      ...breads,
    ];
    expect(spots.length).toBeGreaterThan(12);
    for (const s of spots) seen('thing', s.x, s.z);
  });

  it('does not hide the ends of the lane or of the pier', () => {
    for (const [what, i, j] of [
      ['first lane tile', 335, 45],
      ['last lane tile', 335, 22],
      ['first pier tile', 342, 16],
      ['last pier tile', 355, 16],
    ] as const) {
      seen(what, i + 0.5, j + 0.5);
    }
  });
});

describe('Underroot west geometry the design leans on', () => {
  const top = (i: number, j: number): number => world.iceTopAt(i + 0.5, j + 0.5);

  it('has a flat hub at 32, the lowest ground of the west half, with straight edges where needed', () => {
    let tiles = 0;
    for (let j = 46; j <= 58; j++) {
      for (let i = 306; i <= 384; i++) {
        if (world.isVoid(i + 0.5, j + 0.5)) continue;
        tiles++;
        expect(ground(i, j), `(${i}, ${j})`).toBe(HUB);
      }
    }
    expect(tiles).toBeGreaterThan(900);
    for (let i = 331; i <= 339; i++) expect(ground(i, 46), `north edge x=${i}`).toBe(HUB);
    for (let i = 350; i <= 364; i++) expect(ground(i, 46), `north edge x=${i}`).toBe(HUB);
    for (let j = 46; j <= 58; j++) expect(ground(384, j), `x=384 z=${j}`).toBe(HUB);
    for (let i = 306; i <= 384; i++) {
      let deep = 0;
      for (let j = 46; j <= 58; j++) if (!world.isVoid(i + 0.5, j + 0.5)) deep++;
      expect(deep, `depth at x=${i}`).toBeGreaterThanOrEqual(10);
    }
    for (let j = 0; j < world.depth; j++) {
      for (let i = 299; i <= 384; i++) {
        const g = ground(i, j);
        if (Number.isFinite(g)) expect(g, `(${i}, ${j})`).toBeGreaterThanOrEqual(HUB);
      }
    }
  });

  it('Lane: climbs a quarter a tile and ends level with Mat Rock', () => {
    expect(matTop(45)).toBe(32.25);
    expect(matTop(22)).toBe(38);
    for (const i of [334, 335, 336]) {
      for (let j = 22; j <= 45; j++) {
        expect(top(i, j), `(${i}, ${j})`).toBe(matTop(j));
        expect(world.isThinIce(i + 0.5, j + 0.5)).toBe(true);
      }
      expect(ground(i, 21)).toBe(matTop(22));
    }
    for (const j of [30, 40]) {
      expect(world.isVoid(333.5, j + 0.5)).toBe(true);
      expect(world.isVoid(337.5, j + 0.5)).toBe(true);
    }
  });

  it('Mat Rock is hub + 6 and 24 tiles of sky from the hub; the step is +4', () => {
    expect(ground(335, 21)).toBe(HUB + 6);
    expect(ground(335, 12)).toBe(HUB + 6);
    expect(ground(329, 12) - ground(331, 12)).toBe(4);
    expect(ground(330, 13)).toBe(ground(335, 15) + 4);
    for (let j = 22; j <= 45; j++) expect(world.isVoid(332.5, j + 0.5), `sky z=${j}`).toBe(true);
  });

  it('Pier: level with Mat Rock, 8 tiles of sky, Pier Rock 3 above it and 22 tiles from Mat Rock', () => {
    for (let i = 342; i <= 355; i++) for (const j of [15, 16, 17]) expect(top(i, j), `(${i}, ${j})`).toBe(ground(335, 16));
    expect(top(355, 16)).toBe(38);
    for (let i = 356; i <= 363; i++) expect(world.isVoid(i + 0.5, 16.5), `sky x=${i}`).toBe(true);
    expect(ground(364, 16)).toBe(top(355, 16) + 3);
    expect(364 - 342, 'tiles from Mat Rock (x 341) to Pier Rock (x 364), edge to edge').toBeGreaterThanOrEqual(22);
    expect(364 - 342).toBe(22);
  });

  it('Clearing: hub height, off the hub\'s north edge', () => {
    for (let j = 37; j <= 45; j++) for (let i = 350; i <= 364; i++) expect(ground(i, j), `(${i}, ${j})`).toBe(HUB);
  });
});
