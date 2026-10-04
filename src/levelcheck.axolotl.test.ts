import { describe, expect, it } from 'vitest';
import { FORMS, FormId, KELP_DEEP } from './forms';
import { Island, Kind, World } from './world';
import { explore } from './levelcheck';

type Terrain = Parameters<Island['build']>[0];

const tinyWorld = (build: (t: Terrain) => void): World =>
  new World([{ id: 'tiny', name: 'Tiny', build: (t) => (build(t), { spawn: { x: 2.5, z: 20.5 } }) }]);

const ALL = FORMS.map((f) => f.id);
const NINE = ALL.filter((f) => f !== 'axolotl');
const FLOOR = 2;
const SHORE = 3;
const LEVEL = 2.7;
const start = { x: 2.5, z: 20.5 };
const RANGE = { x0: 0, x1: 70 };
const run = (w: World, forms: readonly FormId[], profile: 'easy' | 'max', spot: { x: number; z: number }) =>
  explore(w, start, forms, profile, RANGE).canUse(spot);

/** Land at SHORE on rows 10-30, a lake across columns 10-39 (all rows, so it is sealed) `depth` deep, `roof` over columns 20-22. */
const lake = (depth: number, roof: (t: Terrain, i: number, j: number) => void): World =>
  tinyWorld((t) => {
    t.rect(0, 10, 60, 30, (i, j) => t.set(i, j, SHORE, Kind.Grass));
    t.rect(10, 10, 39, 30, (i, j) => {
      t.set(i, j, LEVEL - depth, Kind.Sand);
      t.setWater(i, j, true);
    });
    t.rect(20, 10, 22, 30, (i, j) => roof(t, i, j));
  });
const far = { x: 45.5, z: 20.5 };

describe('the Axolotl under a hollow', () => {
  const hollow = lake(8, (t, i, j) => t.setHollow(i, j));

  it('alone reaches a candle behind a row of hollows, on both profiles', () => {
    for (const profile of ['easy', 'max'] as const) {
      expect(run(hollow, ['axolotl'], profile, far), `axolotl ${profile}`).toBe(true);
      for (const f of NINE) expect(run(hollow, [f], profile, far), `${f} ${profile}`).toBe(false);
    }
    expect(run(hollow, NINE, 'max', far), 'nine').toBe(false);
    expect(run(hollow, ALL, 'max', far), 'ten').toBe(true);
  });

  it('lets deep kelp through to the Mermaid and the Axolotl alike', () => {
    const kelp = lake(8, (t, i, j) => t.setKelp(i, j, KELP_DEEP));
    expect(run(kelp, ['mermaid'], 'easy', far)).toBe(true);
    expect(run(kelp, ['axolotl'], 'easy', far)).toBe(true);
    expect(run(kelp, ['human'], 'max', far)).toBe(false);
  });

  it('uses a thing on a bed 8 deep, like the Mermaid', () => {
    const open = lake(8, () => {});
    const bed = { x: 15.5, z: 20.5 };
    expect(run(open, ['axolotl'], 'easy', bed)).toBe(true);
    expect(run(open, ['mermaid'], 'easy', bed)).toBe(true);
    expect(run(open, ['human'], 'max', bed)).toBe(false);
  });

  it('stands, and uses a thing, under a hollow only as the Axolotl', () => {
    const under = { x: 21.5, z: 20.5 };
    expect(explore(hollow, start, ['axolotl'], 'easy', RANGE).canStand(under)).toBe(true);
    expect(run(hollow, ['axolotl'], 'easy', under)).toBe(true);
    for (const f of NINE) expect(explore(hollow, start, [f], 'max', RANGE).canStand(under), f).toBe(false);
  });

  it('hops from under no hollow', () => {
    // Water to column 22, a sky tile, then land: the Axolotl hops it from open water, not from a hollow.
    const hopWorld = (roofed: boolean): World =>
      tinyWorld((t) => {
        t.rect(0, 10, 9, 30, (i, j) => t.set(i, j, SHORE, Kind.Grass));
        t.rect(10, 20, 22, 20, (i, j) => {
          t.set(i, j, LEVEL - 8, Kind.Sand);
          t.setWater(i, j, true);
        });
        if (roofed) t.rect(21, 20, 22, 20, (i, j) => t.setHollow(i, j));
        t.rect(24, 20, 30, 20, (i, j) => t.set(i, j, SHORE, Kind.Grass));
      });
    const land = { x: 25.5, z: 20.5 };
    expect(explore(hopWorld(false), start, ['axolotl'], 'max', RANGE).canStand(land)).toBe(true);
    expect(explore(hopWorld(true), start, ['axolotl'], 'max', RANGE).canStand(land)).toBe(false);
  });
});

describe('the Axolotl on land', () => {
  /** A strip of ground, `mid` laid in columns 10-14, then far ground (at `rise` above) from column 15. */
  const strip = (mid: (t: Terrain, i: number) => void, rise = 0): World =>
    tinyWorld((t) => {
      t.rect(0, 20, 9, 20, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
      for (let i = 10; i <= 14; i++) mid(t, i);
      t.rect(15, 20, 25, 20, (i, j) => t.set(i, j, FLOOR + rise, Kind.Grass));
    });
  const land = { x: 18.5, z: 20.5 };
  const passes = (w: World, f: FormId): boolean => explore(w, start, [f], 'max', RANGE).canStand(land);
  const tangled = (gap: number) =>
    strip((t, i) => (t.set(i, 20, FLOOR, Kind.Grass), t.setTangle(i, 20, gap)));

  it('fits a hole, not a root tangle', () => {
    const hole = tangled(0.35);
    for (const f of ['axolotl', 'snake', 'ant'] as const) expect(passes(hole, f), `${f} hole`).toBe(true);
    expect(passes(hole, 'human')).toBe(false);
    const roots = tangled(0.25);
    expect(passes(roots, 'ant')).toBe(true);
    for (const f of ['axolotl', 'snake'] as const) expect(passes(roots, f), `${f} roots`).toBe(false);
  });

  it('is stopped by a 0.75 rise inside a hole (its step is 0.35)', () => {
    const rising = strip((t, i) => (t.set(i, 20, FLOOR + (i < 12 ? 0 : 0.75), Kind.Grass), t.setTangle(i, 20, 0.35)), 0.75);
    expect(passes(rising, 'axolotl')).toBe(false);
    expect(passes(rising, 'snake')).toBe(true);
  });

  it('holds no thin or brittle sheet and does not fly', () => {
    const thin = strip((t, i) => t.setThinIce(i, 20, FLOOR));
    const brittle = strip((t, i) => t.setBrittle(i, 20, FLOOR));
    expect(passes(thin, 'wolf')).toBe(true);
    expect(passes(thin, 'axolotl')).toBe(false);
    expect(passes(brittle, 'cheetah')).toBe(true);
    expect(passes(brittle, 'axolotl')).toBe(false);
    const sky = strip(() => {});
    expect(passes(sky, 'fairy')).toBe(true);
    expect(passes(sky, 'axolotl')).toBe(false);
  });

  it('jumps no higher than the Human', () => {
    for (const rise of [0.9, 1.1, 1.3, 1.5]) {
      const w = strip((t, i) => t.set(i, 20, FLOOR + rise, Kind.Stone));
      expect(passes(w, 'axolotl'), `rise ${rise}`).toBe(passes(w, 'human'));
    }
    const w = strip((t, i) => t.set(i, 20, FLOOR + 1.5, Kind.Stone));
    expect(passes(w, 'axolotl')).toBe(false);
  });
});
