import { describe, expect, it } from 'vitest';
import { FORMS, FormId } from './forms';
import { Island, Kind, World } from './world';
import { explore, glideLimits, Profile } from './levelcheck';

type Terrain = Parameters<Island['build']>[0];

const tinyWorld = (build: (t: Terrain) => void): World =>
  new World([{ id: 'tiny', name: 'Tiny', build: (t) => (build(t), { spawn: { x: 2.5, z: 22.5 } }) }]);

const ALL = FORMS.map((f) => f.id);
const NOT_HUMAN = ALL.filter((f) => f !== 'human');
const RANGE = { x0: 0, x1: 100 };
const start = { x: 2.5, z: 22.5 };
const at = (col: number) => ({ x: col + 0.5, z: 22.5 });
const reaches = (w: World, forms: readonly FormId[], profile: Profile, wings: boolean, col: number): boolean =>
  explore(w, start, forms, profile, RANGE, wings).canStand(at(col));

/** A pad of columns 0-4 at `pad`, a rock of columns `rock` (3 wide) at `ground`, with whatever `extra` adds across the sky between. */
const world = (pad: number, rock: number, ground: number, extra: (t: Terrain) => void = () => {}): World =>
  tinyWorld((t) => {
    t.rect(0, 20, 4, 24, (i, j) => t.set(i, j, pad, Kind.Stone));
    t.rect(rock, 20, rock + 2, 24, (i, j) => t.set(i, j, ground, Kind.Stone));
    extra(t);
  });

describe('the wings', () => {
  it('has numbers a Human can glide with', () => {
    expect(glideLimits('easy').ratio).toBeLessThan(glideLimits('max').ratio);
    expect(glideLimits('max').lift).toBeLessThanOrEqual(1.2);
  });

  const far = world(12, 46, 1);
  it('lets only the Human cross 41 tiles of sky from a height of 12', () => {
    expect(reaches(far, ALL, 'max', false, 47)).toBe(false);
    expect(reaches(far, ['human'], 'easy', true, 47)).toBe(true);
    expect(reaches(far, NOT_HUMAN, 'max', true, 47)).toBe(false);
  });

  it('never rises: a rock 2 higher is out of reach', () => {
    expect(reaches(world(12, 8, 14), ['human'], 'max', true, 9)).toBe(false);
    expect(reaches(world(12, 8, 11), ['human'], 'max', true, 9)).toBe(true);
  });

  it('carries easy further than max across the same drop', () => {
    const six = world(12, 35, 6);
    expect(reaches(six, ['human'], 'easy', true, 36)).toBe(true);
    expect(reaches(world(12, 45, 6), ['human'], 'max', true, 46)).toBe(true);
    expect(reaches(world(12, 55, 6), ['human'], 'max', true, 56)).toBe(false);
  });

  const wall = (h: number, from: number, to: number) => (t: Terrain) => t.rect(20, from, 20, to, (i, j) => t.set(i, j, h, Kind.Stone));
  it('is blocked by a wall higher than the glide, not by a lower one', () => {
    expect(reaches(world(12, 46, 1, wall(30, 0, 63)), ['human'], 'max', true, 47)).toBe(false);
    expect(reaches(world(12, 46, 1, wall(8, 0, 63)), ['human'], 'easy', true, 47)).toBe(true);
  });

  it('steers round a tall wall on max', () => {
    expect(reaches(world(12, 46, 1, wall(30, 0, 40)), ['human'], 'max', true, 47)).toBe(true);
  });

  it('is blocked by a line of tangle', () => {
    const tangled = world(12, 46, 1, (t) => t.rect(20, 0, 20, 63, (i, j) => t.setTangle(i, j)));
    expect(reaches(tangled, ['human'], 'max', true, 47)).toBe(false);
  });

  it('opens from water or a thin sheet never', () => {
    const lake = tinyWorld((t) => {
      t.rect(0, 20, 4, 24, (i, j) => {
        t.set(i, j, 10, Kind.Sand);
        t.setWater(i, j, true, 12);
      });
      t.rect(30, 20, 32, 24, (i, j) => t.set(i, j, 0, Kind.Stone));
    });
    const sheet = tinyWorld((t) => {
      t.rect(0, 20, 4, 24, (i, j) => t.setThinIce(i, j, 12));
      t.rect(30, 20, 32, 24, (i, j) => t.set(i, j, 0, Kind.Stone));
    });
    for (const profile of ['easy', 'max'] as const) {
      expect(reaches(lake, ['human'], profile, true, 31), `water ${profile}`).toBe(false);
      expect(reaches(sheet, ['human'], profile, true, 31), `sheet ${profile}`).toBe(false);
    }
    expect(reaches(world(12, 30, 0), ['human'], 'easy', true, 31)).toBe(true);
  });
});

describe('the wings off', () => {
  const real = new World();
  const hollowfen = { x0: 1125, x1: 1336 };
  const from = { x: 1163.5, z: 31.5 };
  const forms: FormId[] = ['human', 'fairy', 'bunny'];

  it('reach exactly what the search reached before', () => {
    const plain = explore(real, from, forms, 'easy', hollowfen);
    const off = explore(real, from, forms, 'easy', hollowfen, false);
    expect(off.tiles).toBe(plain.tiles);
  });

  it('costs under a second to explore 300 columns with wings', () => {
    const t0 = performance.now();
    const r = explore(real, from, forms, 'max', { x0: 1100, x1: 1400 }, true);
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(r.tiles).toBeGreaterThan(explore(real, from, forms, 'max', { x0: 1100, x1: 1400 }).tiles - 1);
  });
});
