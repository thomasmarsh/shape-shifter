import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { Island, Terrain } from '../layout';
import { World } from '../world';
import { ISLANDS } from './index';
import { exploreIn, reachedAny, respawnOf, solidTiles } from './testkit';

// Arriving from Sunset Rock, nobody reaches the hub (x >= 988) except by the
// Landing and the Ramp (x 960..987, z 0..9): with those tiles cleared to sky, and
// the Tooth and its pier left standing, an explore from Sunset Rock's respawn
// spot reaches no tile at x >= 988.

const NINE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake'];
const RANGE = { x0: 925, x1: 1135 };
const SUNSET = respawnOf({ x: 931.5, z: 4.5 });
const HUB = respawnOf({ x: 1000.5, z: 18.5 });

const real = new World();
const cut = new World(
  ISLANDS.map((isl): Island =>
    isl.id !== 'coilstone'
      ? isl
      : {
          ...isl,
          build(t: Terrain) {
            const layout = isl.build(t);
            for (let i = 960; i <= 987; i++) for (let j = 0; j <= 9; j++) t.clear(i, j);
            return layout;
          },
        },
  ),
);

describe('Coilstone arrival', () => {
  it('is reached from Sunset Rock in the real world', () => {
    const r = exploreIn(real, RANGE)(SUNSET, NINE, 'max');
    expect(r.canStand(HUB)).toBe(true);
  });

  it('has no way to x >= 988 without the Landing and the Ramp', () => {
    expect(solidTiles(cut, { x0: 960, x1: 988 }).filter(([, j]) => j <= 9)).toEqual([]);
    const r = exploreIn(cut, RANGE)(SUNSET, NINE, 'max');
    const east = solidTiles(cut, { x0: 988, x1: RANGE.x1 });
    const hit = reachedAny(r, east);
    expect(hit.slice(0, 10), 'reached tiles at x >= 988').toEqual([]);
    expect(r.canStand(HUB)).toBe(false);
  });
});
