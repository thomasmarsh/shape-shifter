import { describe, expect, it } from 'vitest';
import { explore } from '../levelcheck';
import { World } from '../world';

const world = new World();
const { layout } = world;

const PROW = { x: 129.5, z: 28.5 };
const NORTH_PILLAR = { x: 175.5, z: 35.5 };
const SOUTH_PILLAR = { x: 180.5, z: 44.5 };
const IDS = ['hc-camp', 'hc-mesa', 'hc-rock', 'hc-cap', 'hc-spire'];
const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const highcragCheckpoints = layout.checkpoints.filter((c) => c.id.startsWith('hc-'));
const highcragBread = layout.bread.filter((b) => b.id.startsWith('hc-'));

const THREE = ['human', 'fairy', 'orangutan'] as const;
const FOUR = [...THREE, 'bunny'] as const;

/** Every tile of a box (bounds inclusive) is not reached. */
function boxReached(r: ReturnType<typeof explore>, i0: number, j0: number, i1: number, j1: number): number {
  let n = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (r.has(i, j)) n++;
  return n;
}

describe('Highcrag with the three forms of level 2', () => {
  const r = explore(world, PROW, THREE, 'easy');

  it('lets all five puzzles be solved', () => {
    for (const id of IDS) {
      expect(r.canUse(puzzle(id).speaker), `${id} speaker`).toBe(true);
      expect(r.canUse(puzzle(id).candle), `${id} candle`).toBe(true);
    }
  });

  it('reaches every checkpoint respawn spot and every piece of bread', () => {
    for (const c of highcragCheckpoints) {
      expect(r.canStand({ x: c.x - 1, z: c.z + 1 }), `checkpoint ${c.id}`).toBe(true);
    }
    for (const b of highcragBread) expect(r.canStand(b), `bread ${b.id}`).toBe(true);
  });

  it('reaches the causeway', () => {
    expect(r.canStand({ x: 185.5, z: 40.5 })).toBe(true);
  });
});

describe('Highcrag things', () => {
  const onHighcrag = (s: { x: number }) => s.x >= 123 && s.x < 200;

  it('stand on real ground, never in the sky', () => {
    const spots = [
      ...layout.puzzles.flatMap((p) => [p.speaker, p.candle]),
      ...layout.checkpoints.flatMap((c) => [c, { x: c.x - 1, z: c.z + 1 }]),
      ...layout.bread,
      ...layout.enemies,
      ...layout.trees,
      ...layout.boulders,
    ].filter(onHighcrag);
    expect(spots.length).toBeGreaterThan(40);
    for (const s of spots) expect(world.groundAt(s.x, s.z), `(${s.x}, ${s.z})`).toBeGreaterThan(0);
  });

  it('keeps every enemy off pedestals, trees and boulders', () => {
    const blocked = (x: number, z: number) => world.solidAt(x, z) > world.groundAt(x, z);
    for (const e of layout.enemies.filter(onHighcrag)) expect(blocked(e.x, e.z), `(${e.x}, ${e.z})`).toBe(false);
  });
});

describe('Highcrag needs every shape', () => {
  it('keeps a human and fairy off the candles that need the orangutan, at the limit', () => {
    const r = explore(world, PROW, ['human', 'fairy'], 'max');
    for (const id of IDS) {
      expect(r.canUse(puzzle(id).speaker), `${id} speaker`).toBe(false);
      expect(r.canUse(puzzle(id).candle), `${id} candle`).toBe(false);
    }
  });

  it('keeps a human and orangutan from the fairy-only places', () => {
    const r = explore(world, PROW, ['human', 'orangutan'], 'max');
    expect(r.canUse(puzzle('hc-mesa').candle)).toBe(false);
    expect(boxReached(r, 125, 44, 131, 50), 'Lonely Rock islet').toBe(0);
    expect(r.canUse(puzzle('hc-cap').speaker)).toBe(false);
    expect(boxReached(r, 164, 22, 171, 29), 'Spire tier 1').toBe(0);
  });

  it('keeps the three forms off the giant steps and Frostfang', () => {
    const r = explore(world, PROW, THREE, 'max');
    expect(r.canStand({ x: 192.5, z: 40.5 }), 'second step').toBe(false);
    expect(r.canStand({ x: 196.5, z: 40.5 }), 'third step').toBe(false);
    const arrival = layout.arrivals.find((a) => a.id === 'frostfang')!;
    expect(r.canStand(arrival), 'frostfang').toBe(false);
  });

  it('lets the bunny up the giant steps, onto the archer pillars and over to Frostfang', () => {
    const r = explore(world, PROW, FOUR, 'easy');
    expect(r.canStand(NORTH_PILLAR), 'north archer pillar').toBe(true);
    expect(r.canStand(SOUTH_PILLAR), 'south archer pillar').toBe(true);
    expect(r.canStand({ x: 188.5, z: 40.5 }), 'first step').toBe(true);
    expect(r.canStand({ x: 192.5, z: 40.5 }), 'second step').toBe(true);
    expect(r.canStand({ x: 196.5, z: 40.5 }), 'third step').toBe(true);
    const arrival = layout.arrivals.find((a) => a.id === 'frostfang')!;
    expect(r.canStand(arrival), 'frostfang').toBe(true);
  });

  it('keeps a lone fairy on the valley floor off every high place', () => {
    const r = explore(world, { x: 136.5, z: 33.5 }, ['fairy'], 'max');
    expect(r.canStand({ x: 155.5, z: 29.5 }), 'Camp Rock').toBe(false);
    expect(r.canStand({ x: 146.5, z: 43.5 }), 'mesa').toBe(false);
    expect(r.canStand({ x: 152.5, z: 9.5 }), 'cap').toBe(false);
    expect(r.canStand({ x: 130.5, z: 49.5 }), 'crag').toBe(false);
    expect(r.canStand({ x: 169.5, z: 24.5 }), 'Spire tier 2').toBe(false);
  });

  it('cannot be reached from island 2 by a human and a fairy', () => {
    // Island 2 is built by someone else. Start on its bare east shore (the
    // brief's (110.5, 27.5) can be a tree pillar top), or on its west side if
    // that tile is not ordinary low ground.
    const shore = { x: 111.5, z: 27.5 };
    const flat = Number.isFinite(world.solidAt(shore.x, shore.z)) && world.solidAt(shore.x, shore.z) <= 4;
    const r = explore(world, flat ? shore : { x: 63.5, z: 24.5 }, ['human', 'fairy'], 'max');
    expect(boxReached(r, 123, 0, 219, 63), 'anything on Highcrag').toBe(0);
  });
});

describe('Highcrag Lonely Rock', () => {
  it('keeps the mainland at least five tiles (edge to edge) from the islet', () => {
    // The islet is x 125-131, z 44-50. Only a fairy may cross the gap.
    for (let j = 30; j < 62; j++) {
      for (let i = 132; i < 175; i++) {
        if (!(world.groundAt(i + 0.5, j + 0.5) > 0)) continue;
        const gapX = i - 132;
        const gapZ = j < 44 ? 44 - (j + 1) : j > 50 ? j - 51 : 0;
        expect(Math.hypot(gapX, gapZ), `tile (${i}, ${j})`).toBeGreaterThanOrEqual(5);
      }
    }
  });
});
