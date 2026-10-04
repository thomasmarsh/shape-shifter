import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { World } from '../world';
import { HOLT_SIZE } from './fill';
import { expectClosedRing, expectSeenFromCamera, exploreIn, respawnOf } from './testkit';

// The five holts (holt() in fill.ts): a pond 9 by 9 with a ring of hollows 2 thick, a moat one tile wide
// inside it and one stone at hub height in the middle with bread on it (10). The ring has no top, so
// only the Axolotl gets to the stone. Everything here is searched on one wide explore per set.

const world = new World();
const { layout } = world;

const NINE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake'];
const EIGHT: FormId[] = NINE.filter((f) => f !== 'snake');
const TEN: FormId[] = [...NINE, 'axolotl'];

interface Holt {
  name: string;
  i0: number;
  j0: number;
  hub: number;
  bread: string;
  start: string;
  range: { x0: number; x1: number };
  /** The form set the island's own rooms use (none of them has the Axolotl). */
  forms: FormId[];
  /** Every island form but the Axolotl: all ten minus the Axolotl, for the islands whose own list is shorter. */
  allButAxolotl: boolean;
}

const HOLLOWFEN = { x0: 1150, x1: 1336 };
const GALECREST = { x0: 1300, x1: 1590 };
const HOLTS: Holt[] = [
  { name: 'the Holt', i0: 1276, j0: 41, hub: 12, bread: 'hf-f-holt', start: 'hf-far', range: HOLLOWFEN, forms: NINE, allButAxolotl: false },
  { name: 'the Kettle', i0: 1408, j0: 15, hub: 12, bread: 'gc-f-kettle', start: 'gc-hub', range: GALECREST, forms: NINE, allButAxolotl: false },
  { name: 'the Cauldron', i0: 1485, j0: 43, hub: 12, bread: 'gc-f-cauldron', start: 'gc-far', range: GALECREST, forms: NINE, allButAxolotl: false },
  { name: 'the Vault', i0: 1084, j0: 3, hub: 12, bread: 'cs-f-vault', start: 'cs-far', range: { x0: 930, x1: 1136 }, forms: NINE, allButAxolotl: true },
  { name: 'the Lair', i0: 744, j0: 43, hub: 16, bread: 'sv-f-lair', start: 'sv-mid', range: { x0: 670, x1: 960 }, forms: EIGHT, allButAxolotl: true },
];

const centre = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const moatOf = (h: Holt): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = h.i0 + 3; i <= h.i0 + 5; i++) for (let j = h.j0 + 3; j <= h.j0 + 5; j++) out.push([i, j]);
  return out;
};

for (const h of HOLTS) {
  describe(`${h.name}: a holt only the Axolotl reaches`, () => {
    const bread = layout.bread.find((b) => b.id === h.bread)!;
    const stone = { i: h.i0 + 4, j: h.j0 + 4 };
    const start = respawnOf(layout.checkpoints.find((c) => c.id === h.start)!);
    const explore = exploreIn(world, h.range);
    const moat = moatOf(h);

    it('has bread on the stone, in the middle of the pond', () => {
      expect(bread, `bread ${h.bread}`).toBeDefined();
      expect(bread.amount).toBe(10);
      expect(Math.floor(bread.x)).toBe(stone.i);
      expect(Math.floor(bread.z)).toBe(stone.j);
      expect(world.groundAt(bread.x, bread.z)).toBe(h.hub);
      expect(world.isWater(bread.x, bread.z)).toBe(false);
    });

    it('seals the moat with a ring of hollows, and nothing in the holt is higher than the hub', () => {
      const hollow = (i: number, j: number) => {
        const { x, z } = centre(i, j);
        return world.isHollow(x, z);
      };
      for (let i = h.i0; i < h.i0 + HOLT_SIZE; i++) {
        for (let j = h.j0; j < h.j0 + HOLT_SIZE; j++) {
          const { x, z } = centre(i, j);
          const ring = [1, 2, 6, 7];
          const inRing =
            (ring.includes(i - h.i0) && j - h.j0 >= 1 && j - h.j0 <= 7) || (ring.includes(j - h.j0) && i - h.i0 >= 1 && i - h.i0 <= 7);
          expect(hollow(i, j), `hollow at ${i},${j}`).toBe(inRing);
          expect(world.groundAt(x, z), `height at ${i},${j}`).toBeLessThanOrEqual(h.hub);
        }
      }
      expectClosedRing(hollow, [stone.i, stone.j], [h.i0 + 3, h.j0 + 3, h.i0 + 5, h.j0 + 5], 9);
    });

    it('is seen from the camera, stone and bread', () => {
      expectSeenFromCamera(world, `${h.name} stone`, bread.x, bread.z);
    });

    it('keeps every set without the Axolotl off the stone and the moat on max', () => {
      const sets = h.allButAxolotl && h.forms !== NINE ? [h.forms, NINE] : [h.forms];
      for (const forms of sets) {
        const reach = explore(start, forms, 'max');
        expect(reach.canStand(bread), `${forms.length} forms stand on the stone`).toBe(false);
        for (const [i, j] of moat) expect(reach.has(i, j), `${forms.length} forms reach moat ${i},${j}`).toBe(false);
      }
    });

    it('lets the Axolotl reach the stone on easy, and find the way back out to the checkpoint', () => {
      const reach = explore(start, TEN, 'easy');
      expect(reach.canStand(bread), 'the ten stand on the stone').toBe(true);
      expect(explore.reachesAny(bread, ['axolotl'], 'easy', [start]), 'the Axolotl gets back out').toBe(true);
    });
  });
}
