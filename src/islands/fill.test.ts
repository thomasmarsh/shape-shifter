import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { World } from '../world';
import {
  expectArchersAwayFromRespawns,
  expectCheckpointsAwayFromGuards,
  expectOnRealGround,
  expectSeenFromCamera,
  expectUniqueIds,
  exploreIn,
  respawnOf,
} from './testkit';

// What fill.ts, hollowfen-fill.ts and galecrest-fill.ts put on the two flat
// hubs, and Coilstone's and Sunveld's cities. The rectangles and bad guys below are copied from those files, so a
// change there shows up here.

const world = new World();
const { layout } = world;

type Rect = [number, number, number, number];
type Pos = { x: number; z: number; kind?: string };

const NINE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake'];
const TEN: FormId[] = [...NINE, 'axolotl'];
const EIGHT: FormId[] = NINE.filter((f) => f !== 'snake');

interface Island {
  name: string;
  range: { x0: number; x1: number };
  x0: number;
  x1: number;
  forms: FormId[];
  start: string;
  farStart: string;
  split: number;
  breadPrefix: string;
  ponds: Rect[];
  dells: Rect[];
  thickets: Rect[];
  fillEnemies: Pos[];
  fillBread: string[];
  fillHints: string[];
  hub: number;
  /** Bread on a holt's stone: only the Axolotl reaches it, so holt.test.ts proves it and this file leaves it out. */
  holtBread: string[];
  rings: Rect[];
  wayOff: { x: number; z: number };
  lanes: Rect[];
  /** Fill bad guys the camera does not see (hidden behind higher ground), by position. */
  unseen?: string[];
}

const ISLANDS: Island[] = [
  {
    name: 'Hollowfen',
    range: { x0: 1150, x1: 1336 },
    x0: 1154,
    x1: 1329,
    forms: NINE,
    start: 'hf-hub',
    farStart: 'hf-far',
    split: 1266,
    breadPrefix: 'hf-f-',
    ponds: [
      [1200, 6, 1205, 10],
      [1222, 20, 1229, 25],
      [1284, 10, 1294, 15],
      [1283, 54, 1290, 59],
    ],
    dells: [
      [1228, 32, 1234, 37],
      [1197, 57, 1205, 61],
      [1286, 22, 1293, 28],
      [1319, 40, 1326, 46],
    ],
    thickets: [
      [1218, 16, 1219, 18],
      [1231, 14, 1233, 15],
      [1196, 12, 1197, 14],
      [1280, 20, 1281, 23],
      [1296, 26, 1297, 28],
      [1320, 54, 1322, 55],
    ],
    fillEnemies: [
      { x: 1203.5, z: 13.5 },
      { x: 1205.5, z: 3.5 },
      { x: 1226.5, z: 29.5, kind: 'blade' },
      { x: 1231.5, z: 28.5 },
      { x: 1232.5, z: 30.5 },
      { x: 1233.5, z: 18.5, kind: 'archer' },
      { x: 1283.5, z: 17.5, kind: 'blade' },
      { x: 1285.5, z: 19.5, kind: 'blade' },
      { x: 1296.5, z: 5.5, kind: 'archer' },
      { x: 1294.5, z: 57.5 },
      { x: 1322.5, z: 50.5 },
      { x: 1324.5, z: 52.5 },
    ],
    fillBread: ['hf-f-eye', 'hf-f-mere', 'hf-f-cut', 'hf-f-holt'], // hf-f-holt is new with the Holt
    fillHints: ['hf-f-eye', 'hf-e-mere', 'hf-e-holt'], // hf-e-holt is new with the Holt
    hub: 12,
    holtBread: ['hf-f-holt'],
    rings: [[1214, 47, 1228, 61]],
    wayOff: { x: 1327.5, z: 30.5 },
    lanes: [
      [1219, 3, 1235, 7],
      [1266, 3, 1282, 7],
      [1195, 38, 1235, 41],
      [1300, 28, 1304, 35],
    ],
  },
  {
    name: 'Galecrest',
    range: { x0: 1300, x1: 1590 },
    x0: 1347,
    x1: 1582,
    forms: TEN,
    start: 'gc-hub',
    farStart: 'gc-far',
    split: 1473,
    breadPrefix: 'gc-f-',
    ponds: [
      [1403, 2, 1407, 6],
      [1431, 26, 1438, 32],
      [1490, 20, 1499, 26],
      [1512, 6, 1519, 11],
      [1489, 55, 1495, 59],
    ],
    dells: [
      [1432, 14, 1439, 19],
      [1404, 57, 1412, 61],
      [1486, 9, 1492, 14],
      [1514, 16, 1522, 21],
    ],
    thickets: [
      [1403, 9, 1405, 10],
      [1425, 16, 1427, 17],
      [1438, 42, 1439, 44],
      [1502, 12, 1503, 15],
      [1524, 8, 1525, 10],
      [1526, 56, 1527, 58],
    ],
    fillEnemies: [
      { x: 1409.5, z: 12.5 },
      { x: 1411.5, z: 5.5 },
      { x: 1434.5, z: 36.5, kind: 'blade' },
      { x: 1436.5, z: 34.5, kind: 'blade' },
      { x: 1440.5, z: 22.5, kind: 'archer' },
      { x: 1496.5, z: 14.5, kind: 'blade' },
      { x: 1498.5, z: 16.5, kind: 'blade' },
      { x: 1497.5, z: 12.5 },
      { x: 1521.5, z: 13.5, kind: 'archer' },
      { x: 1512.5, z: 14.5 },
      { x: 1510.5, z: 24.5, kind: 'sword' },
      { x: 1500.5, z: 58.5 },
      { x: 1498.5, z: 60.5 },
    ],
    fillBread: ['gc-f-mirror', 'gc-f-wind', 'gc-f-north', 'gc-f-kettle', 'gc-f-cauldron'], // the last two are new with the holts
    fillHints: ['gc-f-mirror', 'gc-e-wind', 'gc-f-kettle', 'gc-e-cauldron'], // the last two are new with the holts
    hub: 12,
    holtBread: ['gc-f-kettle', 'gc-f-cauldron'],
    rings: [[1421, 47, 1435, 61]],
    wayOff: { x: 1527.5, z: 29.5 },
    lanes: [
      [1426, 3, 1442, 7],
      [1473, 3, 1489, 7],
      [1402, 38, 1442, 40], // row 41 holds the roof of the Tarn's cell at x 1411..1415
      [1507, 0, 1511, 35],
    ],
  },
  {
    name: 'Coilstone',
    range: { x0: 930, x1: 1136 },
    x0: 960,
    x1: 1129,
    forms: NINE,
    start: 'cs-hub',
    farStart: 'cs-far',
    split: 1061,
    breadPrefix: 'cs-f-',
    ponds: [
      [997, 8, 1003, 12],
      [1020, 28, 1027, 34],
      [1074, 28, 1079, 34],
    ],
    dells: [
      [997, 29, 1003, 33],
      [1022, 14, 1028, 18],
      [1072, 14, 1078, 19],
      [1097, 54, 1102, 60],
    ],
    thickets: [
      [1005, 20, 1006, 22],
      [1006, 30, 1007, 32],
      [1028, 24, 1029, 26],
      [1080, 9, 1081, 11],
      [1096, 12, 1097, 14],
      [1076, 58, 1077, 60],
    ],
    fillEnemies: [
      { x: 1004.5, z: 10.5 },
      { x: 1006.5, z: 13.5 },
      { x: 1024.5, z: 36.5, kind: 'blade' },
      { x: 1026.5, z: 26.5 },
      { x: 1028.5, z: 38.5, kind: 'archer' },
      { x: 1088.5, z: 13.5, kind: 'blade' },
      { x: 1090.5, z: 14.5, kind: 'blade' },
      { x: 1095.5, z: 3.5 },
      { x: 1099.5, z: 5.5, kind: 'archer' },
      { x: 1076.5, z: 22.5 },
      { x: 1079.5, z: 26.5 },
    ],
    fillBread: ['cs-f-font', 'cs-f-basin', 'cs-f-vault'],
    fillHints: ['cs-f-font', 'cs-e-vault'],
    hub: 12,
    holtBread: ['cs-f-vault'],
    rings: [[1082, 40, 1096, 56]],
    wayOff: { x: 1101.5, z: 30.5 },
    lanes: [
      [1014, 3, 1030, 7],
      [1061, 3, 1077, 7],
      [996, 38, 1030, 41],
      [1081, 12, 1083, 39],
    ],
  },
  {
    name: 'Sunveld',
    range: { x0: 670, x1: 960 },
    x0: 700,
    x1: 940,
    forms: EIGHT,
    start: 'sv-mid',
    farStart: 'sv-mid', // one bank, no Gap: the split below is past the island, so the west explore serves everywhere
    split: 100000,
    breadPrefix: 'sv-f-',
    ponds: [
      [704, 22, 711, 27],
      [722, 44, 729, 49],
      [770, 14, 777, 19],
      [800, 42, 808, 47],
      [806, 14, 813, 19],
      [840, 14, 848, 19],
    ],
    dells: [
      [702, 34, 708, 39],
      [756, 44, 762, 49],
      [782, 16, 788, 21],
      [786, 44, 792, 49],
      [808, 26, 814, 31],
      [852, 20, 858, 25],
    ],
    thickets: [
      [713, 30, 714, 32],
      [716, 44, 717, 46],
      [738, 46, 739, 48],
      [768, 40, 769, 42],
      [797, 50, 798, 52],
      [822, 24, 823, 26],
      [851, 36, 852, 38],
    ],
    fillEnemies: [
      { x: 712.5, z: 20.5 },
      { x: 714.5, z: 24.5 },
      { x: 731.5, z: 42.5 },
      { x: 726.5, z: 52.5, kind: 'blade' },
      { x: 770.5, z: 22.5 },
      { x: 775.5, z: 21.5 },
      { x: 795.5, z: 44.5 },
      { x: 804.5, z: 50.5, kind: 'blade' },
      { x: 806.5, z: 52.5, kind: 'blade' },
      { x: 812.5, z: 40.5 },
      { x: 845.5, z: 22.5 },
      { x: 842.5, z: 24.5, kind: 'blade' },
      { x: 850.5, z: 16.5, kind: 'archer' },
    ],
    fillBread: ['sv-f-pan', 'sv-f-plain', 'sv-f-north', 'sv-f-lair'],
    fillHints: ['sv-f-pan', 'sv-f-plain', 'sv-f-lair'],
    hub: 16,
    holtBread: ['sv-f-lair'],
    rings: [
      [794, 26, 799, 31],
      [836, 42, 856, 54],
    ],
    wayOff: { x: 838.5, z: 57.5 },
    lanes: [
      [712, 55, 859, 58], // z 54 is the Kraal's last ring row (x 836..856): not a lane tile, so the lane starts at 55
      [816, 10, 819, 53],
    ],
  },
];

const tilesOf = ([i0, j0, i1, j1]: Rect): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) out.push([i, j]);
  return out;
};
const centre = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const outside = ({ x0, x1 }: { x0: number; x1: number }) => (s: { x: number }) => s.x >= x0 && s.x < x1;
const distToRect = (e: Pos, [i0, j0, i1, j1]: Rect) =>
  Math.hypot(Math.max(i0 - e.x, 0, e.x - (i1 + 1)), Math.max(j0 - e.z, 0, e.z - (j1 + 1)));

for (const isl of ISLANDS) {
  describe(`${isl.name}: the fill`, () => {
    const on = outside(isl);
    const checkpoints = layout.checkpoints.filter(on);
    const enemies = layout.enemies.filter(on);
    const bread = layout.bread.filter(on);
    const hints = layout.hints.filter(on);
    const fillEnemies = isl.fillEnemies.map((f) => {
      const e = enemies.find((x) => x.x === f.x && x.z === f.z);
      expect(e, `fill bad guy (${f.x}, ${f.z}) is in the layout`).toBeDefined();
      return e!;
    });
    const fillBread = bread.filter((b) => b.id.startsWith(isl.breadPrefix));
    const fillHints = hints.filter((h) => isl.fillHints.includes(h.id));
    const hub = respawnOf(checkpoints.find((c) => c.id === isl.start)!);
    const explore = exploreIn(world, isl.range);
    const lazy = <T>(f: () => T) => {
      let v: T | undefined;
      return () => (v ??= f());
    };
    const everyone = lazy(() => explore(hub, isl.forms, 'easy'));
    const far = respawnOf(checkpoints.find((c) => c.id === isl.farStart)!);
    const humanWest = lazy(() => explore(hub, ['human'], 'easy'));
    const humanEast = lazy(() => explore(far, ['human'], 'easy'));
    // The Human cannot cross the Gap, so each bank is searched from its own checkpoint.
    const human = (i: number) => (i >= isl.split ? humanEast() : humanWest());

    it('has the bad guys, bread and hints the fill lists', () => {
      expect(fillEnemies.length).toBe(isl.fillEnemies.length);
      expect(fillBread.map((b) => b.id).sort()).toEqual([...isl.fillBread].sort());
      expect(fillHints.length).toBe(isl.fillHints.length);
    });

    it('puts nothing higher than the hub, and each thing at its height', () => {
      for (const [i, j] of isl.ponds.flatMap(tilesOf)) {
        const { x, z } = centre(i, j);
        expect(world.groundAt(x, z), `pond ${i},${j}`).toBeLessThanOrEqual(isl.hub);
        expect(world.isWater(x, z), `pond ${i},${j} water`).toBe(true);
      }
      for (const r of isl.dells) {
        const [i0, j0, i1, j1] = r;
        for (const [i, j] of tilesOf(r)) {
          const { x, z } = centre(i, j);
          const rim = i === i0 || i === i1 || j === j0 || j === j1;
          expect(world.groundAt(x, z), `dell ${i},${j}`).toBeCloseTo(isl.hub - (rim ? 0.3 : 0.6), 5);
          expect(world.isWater(x, z), `dell ${i},${j} water`).toBe(false);
        }
      }
      for (const [i, j] of isl.thickets.flatMap(tilesOf)) {
        const { x, z } = centre(i, j);
        expect(world.groundAt(x, z), `thicket ${i},${j}`).toBe(isl.hub);
        expect(world.isTangle(x, z), `thicket ${i},${j} tangle`).toBe(true);
        expect(human(i).has(i, j), `Human stands on thicket ${i},${j}`).toBe(false);
      }
    });

    it('lets every form reach the fill bread, and the Human walk in and out of each dell', () => {
      // A holt's bread sits on a stone only the Axolotl reaches: holt.test.ts proves that.
      for (const b of fillBread.filter((x) => !isl.holtBread.includes(x.id))) {
        expect(everyone().canStand(b), `bread ${b.id}`).toBe(true);
      }
      for (const r of isl.dells) {
        for (const [i, j] of tilesOf(r)) expect(human(i).has(i, j), `Human on dell ${i},${j}`).toBe(true);
        const [i0, j0, i1, j1] = r;
        const mid = centre((i0 + i1) >> 1, (j0 + j1) >> 1);
        expect(explore.reachesAny(mid, ['human'], 'easy', [i0 >= isl.split ? far : hub]), `Human out of dell at ${r}`).toBe(true);
      }
    });

    it('keeps bad guys and bread on real, dry, tangle-free hub ground in view of the camera', () => {
      const spots = [...fillEnemies, ...fillBread];
      expectOnRealGround(world, spots);
      for (const s of spots) {
        expect(world.groundAt(s.x, s.z), `(${s.x}, ${s.z}) height`).toBe(isl.hub);
        expect(world.isTangle(s.x, s.z), `(${s.x}, ${s.z}) tangle`).toBe(false);
        if (!isl.unseen?.includes(`${s.x},${s.z}`)) expectSeenFromCamera(world, 'fill thing', s.x, s.z);
      }
    });

    it('keeps checkpoints from guards and respawn spots from archers', () => {
      expect(checkpoints.length).toBeGreaterThan(3);
      const ordinary = enemies.filter((e) => e.kind !== 'snapper');
      expectCheckpointsAwayFromGuards(world, checkpoints, ordinary);
      expectArchersAwayFromRespawns(world, checkpoints, enemies.filter((e) => e.kind === 'archer'));
    });

    it('makes every blade and sword minLevel 7', () => {
      const fast = fillEnemies.filter((e) => e.kind === 'blade' || e.kind === 'sword');
      expect(fast.length).toBeGreaterThan(0);
      for (const e of fast) expect(e.minLevel, `(${e.x}, ${e.z})`).toBe(7);
      for (const e of enemies.filter((x) => x.kind === 'blade' || x.kind === 'sword')) {
        expect(e.minLevel, `${e.kind} (${e.x}, ${e.z})`).toBe(7);
      }
    });

    it('keeps fill bad guys 10 tiles from the Ant ring and 12 from the way off', () => {
      for (const e of fillEnemies) {
        for (const ring of isl.rings) expect(distToRect(e, ring), `ring vs (${e.x}, ${e.z})`).toBeGreaterThanOrEqual(10);
        expect(Math.hypot(e.x - isl.wayOff.x, e.z - isl.wayOff.z), `way off vs (${e.x}, ${e.z})`).toBeGreaterThanOrEqual(12);
      }
    });

    it('leaves the runners lanes clear, flat hub ground', () => {
      const bad: string[] = [];
      for (const [i, j] of isl.lanes.flatMap(tilesOf)) {
        const { x, z } = centre(i, j);
        if (world.groundAt(x, z) !== isl.hub || world.isWater(x, z) || !human(i).has(i, j)) bad.push(`${i},${j}`);
      }
      expect(bad, 'lane tiles not clear').toEqual([]);
    });

    it('keeps thickets off water and the Ant ring, and ids unique', () => {
      for (const [i, j] of isl.thickets.flatMap(tilesOf)) {
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const { x, z } = centre(i + di, j + dj);
            expect(world.isWater(x, z), `thicket ${i},${j} touches water at ${i + di},${j + dj}`).toBe(false);
            const inRing = isl.rings.some(([ri0, rj0, ri1, rj1]) => i + di >= ri0 && i + di <= ri1 && j + dj >= rj0 && j + dj <= rj1);
            expect(inRing, `thicket ${i},${j} touches the ring at ${i + di},${j + dj}`).toBe(false);
          }
        }
      }
      expectUniqueIds(bread, hints);
    });
  });
}
