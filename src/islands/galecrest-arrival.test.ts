import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { Island, Kind, Terrain } from '../layout';
import { World } from '../world';
import { ISLANDS } from './index';
import { WINDBREAK } from './galecrest';
import { exploreIn, reachedAny, respawnOf, solidTiles } from './testkit';

// Arriving from Hollowfen's east rim, nobody reaches the Yard and what lies beyond (x >= 1363) except
// under the Windbreak, through the Sluice's six hollow tiles (x 1361..1362, z 29..31): with those tiles
// made plain wall, an explore from the rim, and one from the Court, reach no solid tile at x >= 1363.

const TEN: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake', 'axolotl'];
const RANGE = { x0: 1260, x1: 1480 };
const RIM = { x: 1327.5, z: 30.5 };
const COURT = respawnOf({ x: 1350.5, z: 30.5 });
const HUB = respawnOf({ x: 1405.5, z: 22.5 });

const real = new World();
const walled = new World(
  ISLANDS.map((isl): Island =>
    isl.id !== 'galecrest'
      ? isl
      : {
          ...isl,
          build(t: Terrain) {
            const layout = isl.build(t);
            for (let i = 1361; i <= 1362; i++) {
              for (let j = 29; j <= 31; j++) {
                t.clear(i, j);
                t.setWater(i, j, false);
                t.set(i, j, WINDBREAK, Kind.Quartz);
              }
            }
            return layout;
          },
        },
  ),
);

describe('Galecrest arrival', () => {
  it('is reached from Hollowfen\'s rim in the real world', () => {
    expect(exploreIn(real, RANGE)(RIM, TEN, 'max').canStand(HUB)).toBe(true);
  });

  it('has no way to x >= 1363 without the Sluice, from the rim or from the Court', () => {
    const east = solidTiles(walled, { x0: 1363, x1: RANGE.x1 });
    expect(east.length).toBeGreaterThan(0);
    const explore = exploreIn(walled, RANGE);
    for (const [name, from] of [['rim', RIM], ['Court', COURT]] as const) {
      const r = explore(from, TEN, 'max');
      expect(reachedAny(r, east).slice(0, 10), `reached tiles at x >= 1363 from the ${name}`).toEqual([]);
      expect(r.canStand(HUB), `hub from the ${name}`).toBe(false);
    }
    // the walled world still has the Court to stand in
    expect(explore(RIM, TEN, 'max').canStand(COURT)).toBe(true);
  });
});
