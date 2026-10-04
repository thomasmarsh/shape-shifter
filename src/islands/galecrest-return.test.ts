import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { Kind } from '../layout';
import { World } from '../world';
import { RETURN, RETURN_RISE, RETURN_STEPS, RETURN_TOP } from './galecrest-east';
import { expectOnRealGround, expectSeenFromCamera, exploreIn, reachedAny, solidTiles } from './testkit';

// The Kestrel Steps: the way back from Kestrel Rock. Each step is 4 up, more than a
// Fairy rises (3.65 on max), so it takes a Bunny; the hub is then a glide away.

const world = new World();
const { layout } = world;
const RANGE = { x0: 1440, x1: 1700 };
const explore = exploreIn(world, RANGE);

const TEN: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake', 'axolotl'];
const ROCK = { x: 1577.5, z: 31.5 };
const HEATH = { x: 1526.5, z: 30.5 };
const PROFILES = ['easy', 'max'] as const;

const tiles = solidTiles(world, RANGE);
const inRect = (i: number, j: number, i0: number, j0: number, i1: number, j1: number) => i >= i0 && i <= i1 && j >= j0 && j <= j1;
const top: [number, number][] = [];
for (let i = RETURN.i0; i <= RETURN.i1; i++) for (let j = RETURN.j0; j <= RETURN.j1; j++) top.push([i, j]);
const stepTiles = tiles.filter(([i, j]) => inRect(i, j, RETURN.i0, RETURN.j0, RETURN.i1, 25));
const rock = tiles.filter(([i, j]) => inRect(i, j, 1574, 26, 1582, 34));
const hub = tiles.filter(([i]) => i >= 1473 && i <= 1530);
const cinderhold = tiles.filter(([i]) => i >= 1592 && i <= 1681);

describe('Galecrest return: the Kestrel Steps', () => {
  it('rise by five steps of 4 to a top of 21, all of scree', () => {
    expect([RETURN_STEPS, RETURN_RISE, RETURN_TOP]).toEqual([5, 4, 21]);
    const levels: [number, number, number][] = [[23, 25, 5], [20, 22, 9], [17, 19, 13], [14, 16, 17], [9, 13, 21]];
    for (const [j0, j1, h] of levels) {
      for (let j = j0; j <= j1; j++) {
        for (let i = RETURN.i0; i <= RETURN.i1; i++) {
          expect(world.groundAt(i + 0.5, j + 0.5), `height ${i},${j}`).toBeCloseTo(h, 5);
          expect(world.kindAt(i + 0.5, j + 0.5), `kind ${i},${j}`).toBe(Kind.Scree);
        }
      }
    }
    expect(top.length).toBe(25);
  });

  it('puts the hint and the bread on the top, on real ground and seen from the camera', () => {
    const hint = layout.hints.find((h) => h.id === 'gc-e-steps')!;
    const bread = layout.bread.find((b) => b.id === 'gc-e-bread-5')!;
    expectOnRealGround(world, [hint, bread]);
    for (const s of [hint, bread]) {
      expect(inRect(Math.floor(s.x), Math.floor(s.z), RETURN.i0, RETURN.j0, RETURN.i1, RETURN.j1)).toBe(true);
      expectSeenFromCamera(world, 'steps thing', s.x, s.z);
    }
  });

  it('hides no tile of the Rock or the Steps from the camera', () => {
    for (const [i, j] of [...rock, ...stepTiles]) expectSeenFromCamera(world, `tile ${i},${j}`, i + 0.5, j + 0.5);
  });
});

describe('Galecrest return: the way back takes the Bunny and the wings', () => {
  for (const profile of PROFILES) {
    it(`lets the Bunny alone reach all 25 top tiles from the Rock on ${profile}`, () => {
      const r = explore(ROCK, ['bunny'], profile);
      expect(top.filter(([i, j]) => !r.has(i, j))).toEqual([]);
    });

    it(`gives the ten without wings the top but none of the hub on ${profile}`, () => {
      const r = explore(ROCK, TEN, profile);
      expect(top.filter(([i, j]) => !r.has(i, j))).toEqual([]);
      expect(reachedAny(r, hub).slice(0, 3)).toEqual([]);
    });

    it(`gives every form but the Bunny, even with wings, no top and no hub on ${profile}`, () => {
      const r = explore(ROCK, TEN.filter((f) => f !== 'bunny'), profile, true);
      expect(reachedAny(r, top).slice(0, 3)).toEqual([]);
      expect(reachedAny(r, hub).slice(0, 3)).toEqual([]);
    });

    it(`lets the Human and the Bunny with wings reach the hub on ${profile}`, () => {
      const r = explore(ROCK, ['human', 'bunny'], profile, true);
      expect(reachedAny(r, hub).length).toBe(3178);
    });

    it(`keeps the forward gate shut to the ten without wings from the heath on ${profile}`, () => {
      const r = explore(HEATH, TEN, profile);
      expect(reachedAny(r, rock).slice(0, 3)).toEqual([]);
      expect(reachedAny(r, stepTiles).slice(0, 3)).toEqual([]);
      expect(reachedAny(r, cinderhold).slice(0, 3)).toEqual([]);
    });

    it(`lets the Human with wings from the heath land on the Rock on ${profile}`, () => {
      const r = explore(HEATH, ['human'], profile, true);
      expect(reachedAny(r, rock).length).toBe(80);
      expect(reachedAny(r, stepTiles).length).toBe(profile === 'max' ? 15 : 0);
    });
  }

  it('does not trap a player on the top: the Bunny alone hops back down to the Rock on easy', () => {
    const r = explore({ x: 1578.5, z: 11.5 }, ['bunny'], 'easy');
    expect(rock.filter(([i, j]) => !r.has(i, j)).length).toBeLessThanOrEqual(1);
    expect(r.canStand(ROCK)).toBe(true);
  });
});
