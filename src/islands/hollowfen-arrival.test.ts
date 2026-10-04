import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { Island, Terrain } from '../layout';
import { World } from '../world';
import { ISLANDS } from './index';
import { exploreIn, reachedAny, respawnOf, solidTiles } from './testkit';

// Arriving from Coilstone's last respawn spot, nobody reaches the hub (x >= 1195) except by the
// Landing and the Ramp (x 1154..1194, z 25..36): with those tiles cleared to sky, an explore
// from the Serpent's Head reaches no tile at x >= 1195.

const TEN: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake', 'axolotl'];
const RANGE = { x0: 1100, x1: 1336 };
const HEAD = { x: 1121.5, z: 31.5 };
const HUB = respawnOf({ x: 1198.5, z: 22.5 });

const real = new World();
const cut = new World(
  ISLANDS.map((isl): Island =>
    isl.id !== 'hollowfen'
      ? isl
      : {
          ...isl,
          build(t: Terrain) {
            const layout = isl.build(t);
            for (let i = 1154; i <= 1194; i++) for (let j = 25; j <= 36; j++) t.clear(i, j);
            return layout;
          },
        },
  ),
);

describe('Hollowfen arrival', () => {
  it('is reached from the Serpent\'s Head in the real world', () => {
    expect(exploreIn(real, RANGE)(HEAD, TEN, 'max').canStand(HUB)).toBe(true);
  });

  it('has no way to x >= 1195 without the Landing and the Ramp', () => {
    expect(solidTiles(cut, { x0: 1154, x1: 1195 }).filter(([, j]) => j >= 25 && j <= 36)).toEqual([]);
    const r = exploreIn(cut, RANGE)(HEAD, TEN, 'max');
    const east = solidTiles(cut, { x0: 1195, x1: RANGE.x1 });
    expect(east.length).toBeGreaterThan(0);
    expect(reachedAny(r, east).slice(0, 10), 'reached tiles at x >= 1195').toEqual([]);
    expect(r.canStand(HUB)).toBe(false);
  });
});
