import { describe, expect, it } from 'vitest';
import { EEL, FormId, WARDEN } from '../forms';
import { Kind } from '../layout';
import { World } from '../world';
import {
  expectCheckpointsAwayFromGuards,
  expectOnRealGround,
  expectSeenFromCamera,
  expectUniqueIds,
  expectWayOut,
  exploreIn,
  respawnOf as respawn,
  solidTiles,
} from './testkit';
import { CLIMB, DEEP, EAST_STAIR, inDeep, NORTH_STAIR, RIM, RING, STAIR_TOP, STEPS } from './cinderhold';

// Cinderhold: the Landing, the Climb, the Ring with its Lid over the Deep, and
// the two Stairs. A new World has the lid shut; `down` has it dropped once.

const shut = new World();
const down = new World();
down.dropLid();
const { layout } = shut;

const RANGE = { x0: 1560, x1: 1700 };
const exploreShut = exploreIn(shut, RANGE);
const exploreDown = exploreIn(down, RANGE);

const TEN: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake', 'axolotl'];

const checkpoint = (id: string) => layout.checkpoints.find((c) => c.id === id)!;
const ROCK = respawn(checkpoint('gc-end'));
const LAND = respawn(checkpoint('cinderhold'));
const RING_SPOT = respawn(checkpoint('ch-ring'));
const mine = (s: { x: number }) => s.x >= 1592 && s.x < 1700;

const here = solidTiles(shut, { x0: 1592, x1: 1700 });
const lake = here.filter(([i, j]) => inDeep(i, j));
const ringTiles = here.filter(([i, j]) => i >= RING.i0 && i <= RING.i1 && j >= RING.j0 && j <= RING.j1);
const southStairTop = { x: 1679.5, z: 31.5 };
const northStairTop = { x: 1644.5, z: 1.5 };
const WARDEN_POST = layout.enemies.find((e) => e.kind === 'warden')!;
const EEL_POST = layout.enemies.find((e) => e.kind === 'eel')!;
const items = [...layout.bread.filter(mine), ...layout.checkpoints.filter(mine), ...layout.hints.filter(mine), ...layout.arrivals.filter(mine)];

describe('Cinderhold: arrival from Kestrel Rock', () => {
  it('lets the Human and the Fairy on easy stand on the Landing, the Ring, the Lid and both Stair tops', () => {
    const r = exploreShut(ROCK, ['human', 'fairy'], 'easy');
    for (const s of [LAND, RING_SPOT, { x: 1645.5, z: 30.5 }, northStairTop, southStairTop]) expect(r.canStand(s), `(${s.x}, ${s.z})`).toBe(true);
  });

  it('keeps the Human alone, even with wings on max, off Cinderhold', () => {
    const r = exploreShut(ROCK, ['human'], 'max', true);
    for (const [i, j] of here) expect(r.has(i, j), `tile ${i},${j}`).toBe(false);
  });

  it('lets all ten on easy stand on the Landing', () => {
    expect(exploreShut(ROCK, TEN, 'easy').canStand(LAND)).toBe(true);
  });
});

describe('Cinderhold: the lid shut', () => {
  it('has no water at all in x 1592..1700', () => {
    for (const [i, j] of here) expect(shut.isWater(i + 0.5, j + 0.5), `tile ${i},${j}`).toBe(false);
  });

  it('has 872 lid tiles, each at 6 and reached by the Human on easy', () => {
    const r = exploreShut(LAND, ['human'], 'easy');
    expect(lake.length).toBe(872);
    for (const [i, j] of lake) {
      expect(shut.isLid(i + 0.5, j + 0.5), `lid ${i},${j}`).toBe(true);
      expect(shut.groundAt(i + 0.5, j + 0.5), `height ${i},${j}`).toBeCloseTo(6, 5);
      expect(r.has(i, j), `reach ${i},${j}`).toBe(true);
    }
  });

  it('lets the Human from the Landing reach every Ring tile and both Stair tops', () => {
    const r = exploreShut(LAND, ['human'], 'easy');
    expect(ringTiles.length).toBe(1656);
    expect(ringTiles.filter(([i, j]) => !r.has(i, j))).toEqual([]);
    expect(r.canStand(northStairTop)).toBe(true);
    expect(r.canStand(southStairTop)).toBe(true);
  });

  for (const form of TEN) {
    it(`${form} alone on easy from the Ring ${form === 'mermaid' ? 'walks the Ring and the Lid but stands on no Stair' : 'stands on both Stair tops'}`, () => {
      const r = exploreShut(RING_SPOT, [form], 'easy');
      expect(r.canStand({ x: 1645.5, z: 30.5 })).toBe(true);
      expect(r.canStand(northStairTop), 'north top').toBe(form !== 'mermaid');
      expect(r.canStand(southStairTop), 'east top').toBe(form !== 'mermaid');
    });
  }
});

describe('Cinderhold: the lid down', () => {
  it('makes the 872 tiles water at 5.7 over a bed of 1.7', () => {
    for (const [i, j] of lake) {
      expect(down.isWater(i + 0.5, j + 0.5), `water ${i},${j}`).toBe(true);
      expect(down.waterLevelAt(i + 0.5, j + 0.5), `level ${i},${j}`).toBeCloseTo(5.7, 5);
      expect(down.groundAt(i + 0.5, j + 0.5), `bed ${i},${j}`).toBeCloseTo(1.7, 5);
    }
    expect(DEEP.level).toBeCloseTo(5.7, 5);
    expect(DEEP.bed).toBeCloseTo(1.7, 5);
  });

  for (const form of ['human', 'mermaid', 'axolotl', 'fairy', 'bunny', 'ant', 'snake'] as FormId[]) {
    it(`has every water tile for ${form} alone on easy, and all the dry ground it had`, () => {
      const r = exploreDown(RING_SPOT, [form], 'easy');
      const before = exploreShut(RING_SPOT, [form], 'easy');
      for (const [i, j] of lake) expect(r.has(i, j), `water ${i},${j}`).toBe(true);
      for (const [i, j] of here.filter(([a, b]) => !inDeep(a, b))) {
        if (before.has(i, j)) expect(r.has(i, j), `dry ${i},${j}`).toBe(true);
      }
    });
  }

  it('lets a swimmer who starts in the middle of the lake get out onto the Ring', () => {
    const r = exploreDown({ x: 1645.5, z: 32.5 }, ['human'], 'easy');
    expect(r.canStand({ x: 1626.5, z: 17.5 })).toBe(true);
    expect(r.canStand(RING_SPOT)).toBe(true);
  });

  it('puts nothing on a lid tile or in the water, shut or down', () => {
    for (const w of [shut, down]) {
      for (const s of items) {
        expect(w.isLid(s.x, s.z), `(${s.x}, ${s.z}) lid`).toBe(false);
        expect(w.isWater(s.x, s.z), `(${s.x}, ${s.z}) water`).toBe(false);
      }
    }
  });
});

describe('Cinderhold: the Stairs', () => {
  const north = (k: number) => shut.groundAt(1644.5, RING.j0 - 2 * k + 0.5);
  const east = (k: number) => shut.groundAt(RING.i1 + 2 * k - 0.5, 31.5);

  it('has steps each exactly 1 above the one before, taller than a bad guy steps and under the Human jump', () => {
    expect(STEPS).toBe(6);
    for (const [name, at] of [['north', north], ['east', east]] as const) {
      let prev = RING.h;
      for (let k = 1; k < STEPS; k++) {
        const h = at(k);
        expect(h - prev, `${name} step ${k}`).toBeCloseTo(1, 5);
        prev = h;
      }
    }
    expect(1).toBeGreaterThan(0.35);
    expect(1).toBeLessThan(1.2);
  });

  it('puts the tops 6 above the Ring', () => {
    expect(STAIR_TOP - RING.h).toBe(6);
    for (let j = NORTH_STAIR.top.j0; j <= NORTH_STAIR.top.j1; j++) expect(shut.groundAt(1644.5, j + 0.5)).toBeCloseTo(12, 5);
    for (let i = EAST_STAIR.top.i0; i <= EAST_STAIR.top.i1; i++) expect(shut.groundAt(i + 0.5, 31.5)).toBeCloseTo(12, 5);
  });

  it('has a rim 0.6 above the floor, open only at the Climb and the two Stairs', () => {
    expect(RIM - RING.h).toBeCloseTo(0.6, 5);
    const open = (i: number, j: number) =>
      (i === RING.i0 && j >= CLIMB.j0 && j <= CLIMB.j1) ||
      (j === RING.j0 && i >= NORTH_STAIR.i0 && i <= NORTH_STAIR.i1) ||
      (i === RING.i1 && j >= EAST_STAIR.j0 && j <= EAST_STAIR.j1);
    for (const [i, j] of ringTiles) {
      if (i !== RING.i0 && i !== RING.i1 && j !== RING.j0 && j !== RING.j1) continue;
      expect(shut.groundAt(i + 0.5, j + 0.5), `edge ${i},${j}`).toBeCloseTo(open(i, j) ? RING.h : RIM, 5);
    }
  });
});

describe('Cinderhold: fairness', () => {
  it('keeps both checkpoints farther than the Warden notices from its post', () => {
    for (const c of layout.checkpoints.filter(mine)) {
      expect(Math.hypot(c.x - WARDEN_POST.x, c.z - WARDEN_POST.z), c.id).toBeGreaterThan(WARDEN.notice);
    }
  });

  it('keeps both checkpoints farther than the Eel notices from every lake tile', () => {
    for (const c of layout.checkpoints.filter(mine)) {
      for (const [i, j] of lake) expect(Math.hypot(c.x - (i + 0.5), c.z - (j + 0.5)), `${c.id} vs ${i},${j}`).toBeGreaterThan(EEL.notice);
    }
  });

  it('keeps checkpoints away from the guards', () => {
    expectCheckpointsAwayFromGuards(shut, layout.checkpoints.filter(mine), layout.enemies.filter(mine));
  });

  it('puts bread, checkpoints and hints on real ground, with unique ids', () => {
    expectOnRealGround(shut, [...layout.bread.filter(mine), ...layout.checkpoints.filter(mine), ...layout.hints.filter(mine)]);
    expectUniqueIds(layout.bread, layout.checkpoints, layout.hints, layout.arrivals);
  });

  it('keeps bread, checkpoints and hints off the lid, on the ash walk or the Climb', () => {
    for (const t of items) expect(inDeep(Math.floor(t.x), Math.floor(t.z)), `${t.id ?? ''} (${t.x}, ${t.z})`).toBe(false);
  });

  it('has five bread, five hints, one arrival, two checkpoints and two bosses', () => {
    expect(layout.bread.filter(mine).length).toBe(5);
    expect(layout.hints.filter(mine).length).toBe(5);
    expect(layout.arrivals.filter(mine).length).toBe(1);
    expect(layout.checkpoints.filter(mine).length).toBe(2);
    expect(layout.enemies.filter(mine).map((e) => e.kind)).toEqual(['warden', 'eel']);
    expect(layout.puzzles.filter((p) => mine(p.speaker)).length).toBe(0);
  });

  it('gives a way out from both checkpoints to a spot in the Ring', () => {
    expectWayOut(exploreShut, layout.checkpoints.filter(mine), { x: 1626.5, z: 17.5 }, ['human'], 'easy');
  });

  it('shows checkpoints, bread and both boss posts to the camera with the lid shut', () => {
    for (const c of layout.checkpoints.filter(mine)) expectSeenFromCamera(shut, c.id, c.x, c.z);
    for (const b of layout.bread.filter(mine)) expectSeenFromCamera(shut, b.id, b.x, b.z);
    expectSeenFromCamera(shut, 'warden', WARDEN_POST.x, WARDEN_POST.z);
    expectSeenFromCamera(shut, 'eel post', EEL_POST.x, EEL_POST.z, 6);
    for (const [i, j] of ringTiles) expectSeenFromCamera(shut, 'ring tile', i + 0.5, j + 0.5);
  });

  it('shows a body 1 under the surface on every lake tile with the lid down', () => {
    for (const [i, j] of lake) expectSeenFromCamera(down, 'body', i + 0.5, j + 0.5, DEEP.level - 1);
  });
});

describe('Cinderhold: look', () => {
  const OWN = [Kind.Ash, Kind.Obsidian, Kind.Coral];
  const kindsIn = (x0: number, x1: number): Map<Kind, number> => {
    const found = new Map<Kind, number>();
    for (let i = x0; i < x1; i++) {
      for (let j = 0; j < shut.depth; j++) {
        const k = shut.kindAt(i + 0.5, j + 0.5);
        if (k !== Kind.Void) found.set(k, (found.get(k) ?? 0) + 1);
      }
    }
    return found;
  };
  const found = kindsIn(1592, 1700);

  it('uses only Ash, Obsidian and Coral', () => {
    for (const k of found.keys()) expect(OWN, `kind ${k}`).toContain(k);
  });

  it('uses all three', () => {
    for (const k of OWN) expect(found.get(k) ?? 0, `kind ${k}`).toBeGreaterThan(0);
  });

  it('lends none of them to an earlier island', () => {
    const before = kindsIn(0, 1590);
    for (const k of OWN) expect(before.has(k), `kind ${k}`).toBe(false);
  });

  it('has hints that use no other island words', () => {
    for (const h of layout.hints.filter(mine)) expect(h.text, h.id).not.toMatch(/crust|thorn|reed|gorse|heather|kelp/i);
  });
});

describe('Cinderhold: the way back', () => {
  it('lets a Fairy on easy from the Ring stand on Kestrel Rock', () => {
    expect(exploreShut(RING_SPOT, ['fairy'], 'easy').canStand(ROCK)).toBe(true);
  });
});
