import { describe, expect, it } from 'vitest';
import { FormId, KELP_DEEP, KELP_LOW } from './forms';
import { Island, Kind, TREE_BLOCK, World } from './world';
import { explore } from './levelcheck';

const world = new World();
const { layout } = world;

// The meadow's own things; later islands have their own tests.
const MEADOW_PUZZLES = ['grove', 'hilltop', 'islet'];
const MEADOW_CHECKPOINTS = ['meadow', 'middle', 'bluff'];
const MEADOW_BREAD = ['meadow', 'north', 'south'];
/** The meadow (x 0-62) and the next island's first columns: see levelcheck.range.test.ts. */
const NEAR = { x0: 0, x1: 125 };

describe('the real world', () => {
  it('lets a human on easy reach everything on the meadow island', () => {
    const r = explore(world, layout.spawn, ['human'], 'easy', NEAR);
    for (const p of layout.puzzles.filter((k) => MEADOW_PUZZLES.includes(k.id))) {
      expect(r.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(r.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
    for (const id of MEADOW_CHECKPOINTS) {
      const c = layout.checkpoints.find((k) => k.id === id)!;
      // Respawn happens one tile to the south-west of the pedestal.
      expect(r.canStand({ x: c.x - 1, z: c.z + 1 }), `checkpoint ${id}`).toBe(true);
    }
    for (const b of layout.bread.filter((k) => MEADOW_BREAD.includes(k.id))) {
      expect(r.canStand(b), `bread ${b.id}`).toBe(true);
    }
  });

  it('keeps a human, even at the limit, off the resting cloud and the next island', () => {
    const r = explore(world, layout.spawn, ['human'], 'max', NEAR);
    expect(r.canStand({ x: 52.5, z: 22.5 })).toBe(false);
    const arrival = layout.arrivals.find((a) => a.id === 'tanglewood')!;
    expect(r.canStand(arrival)).toBe(false);
  });

  it('lets a human who can turn into a fairy cross the gap', () => {
    const r = explore(world, layout.spawn, ['human', 'fairy'], 'easy', NEAR);
    expect(r.canStand({ x: 52.5, z: 22.5 })).toBe(true);
    const arrival = layout.arrivals.find((a) => a.id === 'tanglewood')!;
    expect(r.canStand(arrival)).toBe(true);
  });
});

// A flat island at height 2 with one regular tree and one great tree.
const treeIsland: Island = {
  id: 'trees',
  name: 'Trees',
  build(t) {
    t.rect(0, 0, 20, 30, (i, j) => t.set(i, j, 2, Kind.Grass));
    return {
      spawn: { x: 2.5, z: 15.5 },
      trees: [
        { x: 3.5, z: 5.5, kind: 'regular' },
        { x: 3.5, z: 25.5, kind: 'great' },
      ],
    };
  },
};

// A flat island cut in two by a wall, one tile thick, of the given height.
function wallIsland(height: number): Island {
  return {
    id: 'wall',
    name: 'Wall',
    build(t) {
      t.rect(0, 0, 20, 30, (i, j) => t.set(i, j, 2, Kind.Grass));
      t.rect(10, 0, 10, 30, (i, j) => t.set(i, j, 2 + height, Kind.Stone));
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

const trees = new World([treeIsland]);
const treeStart = trees.layout.spawn;
const otherSide = { x: 14.5, z: 15.5 };

function crosses(height: number, form: 'human' | 'bunny'): boolean {
  const w = new World([wallIsland(height)]);
  return explore(w, w.layout.spawn, [form], 'max').canStand(otherSide);
}

describe('forms on a test island', () => {
  it('keeps a fairy off the top of both kinds of tree', () => {
    const r = explore(trees, treeStart, ['fairy'], 'max');
    expect(r.canStand({ x: 3.5, z: 5.5 })).toBe(false);
    expect(r.canStand({ x: 3.5, z: 25.5 })).toBe(false);
  });

  it('lets an orangutan climb both', () => {
    const r = explore(trees, treeStart, ['orangutan'], 'max');
    expect(r.canStand({ x: 3.5, z: 5.5 })).toBe(true);
    expect(r.canStand({ x: 3.5, z: 25.5 })).toBe(true);
  });

  it('keeps a human off both trees, and a bunny off the great one', () => {
    const human = explore(trees, treeStart, ['human'], 'max');
    expect(human.canStand({ x: 3.5, z: 5.5 })).toBe(false);
    expect(human.canStand({ x: 3.5, z: 25.5 })).toBe(false);
    const bunny = explore(trees, treeStart, ['bunny'], 'max');
    expect(bunny.canStand({ x: 3.5, z: 25.5 })).toBe(false);
  });

  it('lets a bunny clear a wall 4 high but not 5', () => {
    expect(crosses(4, 'bunny')).toBe(true);
    expect(crosses(5, 'bunny')).toBe(false);
  });

  it('lets a human clear a wall 1 high but not 2', () => {
    expect(crosses(1, 'human')).toBe(true);
    expect(crosses(2, 'human')).toBe(false);
  });
});

// ---- thin ice ----------------------------------------------------------

const FLOOR = 2;
const bank = { x: 2.5, z: 15.5 };
const farBank = { x: 45.5, z: 15.5 };
const onIce = { x: 20.5, z: 15.5 };

/**
 * A bank (tiles 0-9), a thin-ice bridge 30 tiles long (10-39) over sky and a
 * far bank (40-50), all in rows 14-16. Optional extras stand off the bridge
 * (one at a time, so they cannot be stepping stones for each other):
 *  - `bunnyPillar`: row 11, 4 high, two empty rows from the bridge (only a
 *    bunny hops that, and the bank is too far from it);
 *  - `fairyPillar`: row 11, 2 high (a fairy flies up it from the bridge);
 *  - `peg`: a lump 1.4 high in row 17, which a wolf cannot hop onto on easy.
 *    With `pegBeside: 'ground'` the tile of the bridge next to it is ordinary.
 */
function bridge(extra: 'none' | 'bunnyPillar' | 'fairyPillar' | 'peg', pegBeside: 'ice' | 'ground' = 'ice'): World {
  return new World([
    {
      id: 'bridge',
      name: 'Bridge',
      build(t) {
        t.rect(0, 14, 9, 16, (i, j) => t.set(i, j, FLOOR, Kind.Snow));
        t.rect(40, 14, 50, 16, (i, j) => t.set(i, j, FLOOR, Kind.Snow));
        const plain = extra === 'peg' && pegBeside === 'ground';
        t.rect(10, 14, 39, 16, (i, j) => {
          if (plain && i === 19 && j === 16) t.set(i, j, FLOOR, Kind.Snow);
          else t.setThinIce(i, j, FLOOR);
        });
        if (extra === 'bunnyPillar') t.set(20, 11, FLOOR + 4, Kind.Stone);
        if (extra === 'fairyPillar') t.set(25, 11, FLOOR + 2, Kind.Stone);
        if (extra === 'peg') {
          t.set(19, 17, FLOOR + 1.4, Kind.Stone);
        }
        return { spawn: bank };
      },
    },
  ]);
}
const ice = bridge('none');
const pillarBunny = { x: 20.5, z: 11.5 };
const pillarFairy = { x: 25.5, z: 11.5 };
const peg = { x: 19.5, z: 17.5 };

describe('thin ice', () => {
  const others = ['human', 'fairy', 'orangutan', 'bunny'] as const;

  it('is ground for a set with the wolf, and the whole bridge is crossed', () => {
    for (const profile of ['easy', 'max'] as const) {
      const r = explore(ice, bank, ['human', 'wolf'], profile);
      expect(r.canStand(onIce), profile).toBe(true);
      expect(r.canStand(farBank), profile).toBe(true);
    }
  });

  it('cannot be entered without the wolf, even at the limit', () => {
    for (const profile of ['easy', 'max'] as const) {
      const r = explore(ice, bank, others, profile);
      expect(r.has(10, 15), profile).toBe(false);
      expect(r.canStand(onIce), profile).toBe(false);
      expect(r.canStand(farBank), profile).toBe(false);
    }
  });

  it('does not count an ice tile as a place to stand and use something from', () => {
    // The peg is 1.4 above the bridge, beside it: close enough to use from an
    // ice tile, but a wolf cannot hop onto it.
    const w = bridge('peg');
    const r = explore(w, bank, ['wolf'], 'easy');
    expect(r.canStand({ x: 19.5, z: 16.5 })).toBe(true);
    expect(r.canStand(peg)).toBe(false);
    expect(r.canUse(peg)).toBe(false);
    // The same, with ordinary ground where the ice was: now it can be used.
    const control = explore(bridge('peg', 'ground'), bank, ['wolf'], 'easy');
    expect(control.canUse(peg)).toBe(true);
  });

  it('lets only a wolf (and a flying fairy) leave the ice on easy', () => {
    // Bunny: the pillar 4 high is a hop from the bridge, but nobody on easy
    // can stand there to hop.
    const w = bridge('bunnyPillar');
    expect(explore(w, bank, ['wolf', 'bunny'], 'easy').canStand(onIce)).toBe(true);
    expect(explore(w, bank, ['wolf', 'bunny'], 'easy').canStand(pillarBunny)).toBe(false);
    // A fairy dropped through the ice flaps away: the pillar 2 high.
    const f = bridge('fairyPillar');
    expect(explore(f, bank, ['wolf', 'fairy'], 'easy').canStand(pillarFairy)).toBe(true);
    // Not from the bank: the pillar is too far to fly to from there.
    expect(explore(f, bank, ['fairy'], 'easy').canStand(pillarFairy)).toBe(false);
    // The wolf alone cannot get up either pillar.
    expect(explore(w, bank, ['wolf'], 'easy').canStand(pillarBunny)).toBe(false);
    expect(explore(f, bank, ['wolf'], 'easy').canStand(pillarFairy)).toBe(false);
  });

  it('lets every form in the set leave the ice at the limit', () => {
    const w = bridge('bunnyPillar');
    expect(explore(w, bank, ['wolf', 'bunny'], 'max').canStand(pillarBunny)).toBe(true);
    // ... but only from the ice: the bunny cannot reach it from the bank.
    expect(explore(w, bank, ['bunny'], 'max').canStand(pillarBunny)).toBe(false);
    expect(explore(w, bank, ['wolf'], 'max').canStand(pillarBunny)).toBe(false);
  });

  it('is not disturbed by ice that is already broken in the world', () => {
    ice.breakIce([onIce]);
    expect(explore(ice, bank, ['wolf'], 'easy').canStand(farBank)).toBe(true);
    ice.resetIce();
  });

  it('knows the wolf and the cheetah, and still refuses forms it does not know', () => {
    expect(() => explore(ice, bank, ['wolf'], 'easy')).not.toThrow();
    expect(() => explore(ice, bank, ['cheetah'], 'easy')).not.toThrow();
    expect(() => explore(ice, bank, ['snake'], 'easy')).toThrow(/snake/);
  });

  it('is crossed by a cheetah as well as by a wolf', () => {
    for (const profile of ['easy', 'max'] as const) {
      expect(explore(ice, bank, ['cheetah'], profile).canStand(farBank), profile).toBe(true);
    }
  });
});

// ---- the cheetah: gaps, brittle sheets and timed gates -----------------------

/** A strip of ground in row 15 with `build` shaping it, and a spawn at its west end. */
function strip(build: (t: Parameters<Island['build']>[0]) => Partial<ReturnType<Island['build']>>): World {
  return new World([{ id: 'strip', name: 'Strip', build: (t) => ({ spawn: { x: 2.5, z: 15.5 }, ...build(t) }) }]);
}
const stripAt = (i: number) => ({ x: i + 0.5, z: 15.5 });
const ALL = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah'] as const;

describe('the cheetah on the flat', () => {
  /** Ground in tiles 0-19, then `gapTiles` of sky, then ground to tile 60. */
  const gapped = (gapTiles: number): World =>
    strip((t) => {
      t.rect(0, 14, 19, 16, (i, j) => t.set(i, j, FLOOR, Kind.Stone));
      t.rect(20 + gapTiles, 14, 60, 16, (i, j) => t.set(i, j, FLOOR, Kind.Stone));
      return {};
    });

  it('clears a gap of 6 on easy, and a gap of 7 only at the limit', () => {
    const six = gapped(6);
    const seven = gapped(7);
    const eight = gapped(8);
    expect(explore(six, stripAt(2), ['cheetah'], 'easy').canStand(stripAt(40))).toBe(true);
    expect(explore(seven, stripAt(2), ['cheetah'], 'easy').canStand(stripAt(40))).toBe(false);
    expect(explore(seven, stripAt(2), ['cheetah'], 'max').canStand(stripAt(40))).toBe(true);
    expect(explore(eight, stripAt(2), ['cheetah'], 'max').canStand(stripAt(40))).toBe(false);
  });

  it('is faster than the wolf and the human over the same gap', () => {
    for (const form of ['human', 'wolf'] as const) {
      expect(explore(gapped(6), stripAt(2), [form], 'max').canStand(stripAt(40)), form).toBe(false);
    }
  });
});

describe('brittle sheets', () => {
  /** A bank (0-9), a brittle bridge (10-39) and a far bank (40-50). */
  const brittleBridge = strip((t) => {
    t.rect(0, 14, 9, 16, (i, j) => t.set(i, j, FLOOR, Kind.Snow));
    t.rect(40, 14, 50, 16, (i, j) => t.set(i, j, FLOOR, Kind.Snow));
    t.rect(10, 14, 39, 16, (i, j) => t.setBrittle(i, j, FLOOR));
    return {};
  });

  it('cannot be entered by a wolf, even at the limit, but a cheetah crosses it', () => {
    for (const profile of ['easy', 'max'] as const) {
      expect(explore(brittleBridge, stripAt(2), ['human', 'wolf'], profile).has(10, 15), profile).toBe(false);
      const r = explore(brittleBridge, stripAt(2), ['wolf', 'cheetah'], profile);
      expect(r.canStand(stripAt(20)), profile).toBe(true);
      expect(r.canStand(stripAt(45)), profile).toBe(true);
    }
  });

  it('is not a place to use something from', () => {
    expect(explore(brittleBridge, stripAt(2), ['cheetah'], 'easy').canUse(stripAt(20))).toBe(false);
  });
});

describe('timed gates', () => {
  /**
   * Ground in tiles 0-`len`; a plate at tile 5 that opens `seconds` of gate at
   * tile `gateAt`. The strip is one tile wide, so the gate is the only way on.
   */
  const gated = (gateAt: number, seconds: number, len = 60): World =>
    strip((t) => {
      t.rect(0, 15, len, 15, (i, j) => t.set(i, j, FLOOR, Kind.Stone));
      t.setGate(gateAt, 15, 'g');
      return { plates: [{ x: 5.5, z: 15.5, gate: 'g', seconds }] };
    });

  it('opens for a cheetah 30 tiles from its plate with 3.6 s, and for nothing without it', () => {
    const w = gated(34, 3.6);
    expect(explore(w, stripAt(2), ['cheetah'], 'easy').canStand(stripAt(50))).toBe(true);
    const slow = ALL.filter((f) => f !== 'cheetah');
    for (const profile of ['easy', 'max'] as const) {
      // The wolf needs 4.3 s for it.
      expect(explore(w, stripAt(2), slow, profile).canStand(stripAt(50)), profile).toBe(false);
      expect(explore(w, stripAt(2), slow, profile).canStand(stripAt(20)), `${profile} before the gate`).toBe(true);
    }
  });

  it('keeps 0.4 s in hand on easy', () => {
    const w = gated(34, 3.3);
    expect(explore(w, stripAt(2), ['cheetah'], 'easy').canStand(stripAt(50))).toBe(false);
    expect(explore(w, stripAt(2), ['cheetah'], 'max').canStand(stripAt(50))).toBe(true);
  });

  it('opens for every form when the plate is 2 tiles from the gate and gives 3 s', () => {
    const w = gated(7, 3);
    for (const form of ALL) {
      for (const profile of ['easy', 'max'] as const) {
        expect(explore(w, stripAt(2), [form], profile).canStand(stripAt(50)), `${form} ${profile}`).toBe(true);
      }
    }
  });

  it('is a wall nothing flies, hops or walks over while no form can beat the clock', () => {
    const w = gated(7, 0.1);
    for (const profile of ['easy', 'max'] as const) {
      expect(explore(w, stripAt(2), ALL, profile).canStand(stripAt(8)), profile).toBe(false);
      expect(explore(w, stripAt(2), ALL, profile).canStand(stripAt(50)), profile).toBe(false);
    }
  });

  it('is a fixed point: opening one gate can reach the plate of the next', () => {
    const chain = strip((t) => {
      t.rect(0, 15, 60, 15, (i, j) => t.set(i, j, FLOOR, Kind.Stone));
      t.setGate(10, 15, 'a');
      t.setGate(40, 15, 'b');
      return {
        plates: [
          { x: 5.5, z: 15.5, gate: 'a', seconds: 3 },
          { x: 20.5, z: 15.5, gate: 'b', seconds: 3 },
        ],
      };
    });
    expect(explore(chain, stripAt(2), ['cheetah'], 'easy').canStand(stripAt(55))).toBe(true);
    // An ant opens the first gate (6 tiles in 3 s) and reaches the second plate, but not the second gate.
    expect(explore(chain, stripAt(2), ['ant'], 'max').canStand(stripAt(20))).toBe(true);
    expect(explore(chain, stripAt(2), ['ant'], 'max').canStand(stripAt(50))).toBe(false);
  });
});

// ---- hop-then-fly --------------------------------------------------------

/** A platform (tiles 0-19) and a ledge `rise` higher starting `gap` tiles of sky past it. */
function gapIsland(gap: number, rise: number): Island {
  return {
    id: 'gap',
    name: 'Gap',
    build(t) {
      t.rect(0, 12, 19, 18, (i, j) => t.set(i, j, FLOOR, Kind.Stone));
      t.rect(20 + gap, 12, 60, 18, (i, j) => t.set(i, j, FLOOR + rise, Kind.Stone));
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

function crossesGap(forms: readonly FormId[], profile: 'easy' | 'max', gap: number, rise: number): boolean {
  const w = new World([gapIsland(gap, rise)]);
  return explore(w, { x: 2.5, z: 15.5 }, forms, profile).canStand({ x: 20 + gap + 0.5, z: 15.5 });
}

describe('hop-then-fly', () => {
  it('reaches a ledge 4 high across a 6-tile gap on easy with a bunny and a fairy', () => {
    expect(crossesGap(['bunny', 'fairy'], 'easy', 6, 4)).toBe(true);
  });

  it('is out of reach for either alone, or with a human, even at the limit', () => {
    for (const forms of [['bunny'], ['fairy'], ['human', 'bunny'], ['human', 'fairy'], ['human', 'orangutan']] as const) {
      expect(crossesGap(forms, 'max', 6, 4), forms.join('+')).toBe(false);
    }
  });

  it('flies a long way on the flat, but not forever', () => {
    expect(crossesGap(['bunny', 'fairy'], 'easy', 12, 0)).toBe(true);
    expect(crossesGap(['bunny', 'fairy'], 'easy', 20, 0)).toBe(false);
    expect(crossesGap(['bunny', 'fairy'], 'max', 20, 0)).toBe(true);
    expect(crossesGap(['bunny', 'fairy'], 'max', 26, 0)).toBe(false);
  });

  it('does not reach higher than about the bunny hop', () => {
    expect(crossesGap(['bunny', 'fairy'], 'max', 6, 5.5)).toBe(false);
    expect(crossesGap(['bunny', 'fairy'], 'max', 6, 4.9)).toBe(true);
    expect(crossesGap(['bunny', 'fairy'], 'easy', 6, 4.6)).toBe(false);
  });

  it('is blocked by a wall in the way, like a flight', () => {
    const w = new World([
      {
        id: 'wall',
        name: 'Wall',
        build(t) {
          gapIsland(10, 0).build(t);
          t.rect(25, 12, 25, 18, (i, j) => t.set(i, j, FLOOR + 9, Kind.Stone));
          return { spawn: { x: 2.5, z: 15.5 } };
        },
      },
    ]);
    // The wall is 9 high and runs the whole width, so nothing gets over it.
    expect(explore(w, { x: 2.5, z: 15.5 }, ['bunny', 'fairy'], 'max').canStand({ x: 35.5, z: 15.5 })).toBe(false);
  });
});

describe('water at its own height', () => {
  /** A bank at 15, a pond (surface 14.7, bed 12.5) and a ledge across it `ledge` high. */
  function pondWorld(ledge: number): World {
    return new World([
      {
        id: 'pond',
        name: 'Pond',
        build(t) {
          t.rect(0, 12, 19, 18, (i, j) => t.set(i, j, 15, Kind.Snow));
          t.rect(40, 12, 50, 18, (i, j) => t.set(i, j, ledge, Kind.Stone));
          t.rect(20, 12, 39, 18, (i, j) => {
            t.set(i, j, 12.5, Kind.Sand);
            t.setWater(i, j, true, 14.7);
          });
          return { spawn: { x: 2.5, z: 15.5 } };
        },
      },
    ]);
  }
  const across = { x: 45.5, z: 15.5 };

  it('uses the float height of that pond as its surface', () => {
    // A human floats at 13.9: a ledge 1.2 above that is a hop, 1.7 is not.
    const w = pondWorld(15.1);
    expect(explore(w, w.layout.spawn, ['human'], 'easy').canStand(across)).toBe(true);
    const high = pondWorld(15.6);
    expect(explore(high, high.layout.spawn, ['human'], 'max').canStand(across)).toBe(false);
  });

  it('leaves the old ponds at the default level', () => {
    const real = new World();
    let wet = 0;
    for (let j = 0; j < real.depth; j++) {
      for (let i = 0; i < 486; i++) {
        if (!real.isWater(i + 0.5, j + 0.5)) continue;
        wet++;
        expect(real.waterLevelAt(i + 0.5, j + 0.5)).toBe(real.waterLevel);
      }
    }
    expect(wet).toBeGreaterThan(0);
  });
});

describe('great trees stay for the orangutan', () => {
  it('keeps a human, fairy and bunny off a great pine top on open flat ground, even at the limit', () => {
    const w = new World([
      {
        id: 'pine',
        name: 'Pine',
        build(t) {
          t.rect(0, 0, 40, 40, (i, j) => t.set(i, j, 15, Kind.Snow));
          return { spawn: { x: 5.5, z: 20.5 }, trees: [{ x: 20.5, z: 20.5, kind: 'greatPine' }] };
        },
      },
    ]);
    const r = explore(w, w.layout.spawn, ['human', 'fairy', 'bunny'], 'max');
    expect(w.solidAt(20.5, 20.5)).toBe(15 + TREE_BLOCK.greatPine);
    expect(r.canStand({ x: 20.5, z: 20.5 })).toBe(false);
    expect(r.canStand({ x: 5.5, z: 20.5 })).toBe(true);
  });
});

describe('the search keeps its results', () => {
  // Tile counts recorded from the checker before it was sped up. Humans cannot
  // leave their island, so these do not depend on the later islands. If one
  // changes, a "faster" search changed what it finds: do not just update the number.
  const cases: { name: string; from: { x: number; z: number }; profile: 'easy' | 'max'; tiles: number }[] = [
    { name: 'the meadow', from: { x: world.layout.spawn.x, z: world.layout.spawn.z }, profile: 'easy', tiles: 966 },
    { name: 'the meadow at the limit', from: { x: world.layout.spawn.x, z: world.layout.spawn.z }, profile: 'max', tiles: 971 },
    { name: 'Tanglewood', from: { x: 63.5, z: 24.5 }, profile: 'easy', tiles: 1448 },
    { name: 'Tanglewood at the limit', from: { x: 63.5, z: 24.5 }, profile: 'max', tiles: 1448 },
    { name: 'Highcrag', from: { x: 129.5, z: 28.5 }, profile: 'easy', tiles: 986 },
    { name: 'Highcrag at the limit', from: { x: 129.5, z: 28.5 }, profile: 'max', tiles: 986 },
  ];
  for (const c of cases) {
    it(`reaches the same ${c.tiles} tiles for a human on ${c.name}`, () => {
      expect(explore(world, c.from, ['human'], c.profile).tiles).toBe(c.tiles);
    });
  }
});

// ---- root tangles ------------------------------------------------------

type Terrain = Parameters<Island['build']>[0];

/** A world from one island; `build` shapes it. Tiles are on rows 10-30 unless said. */
const tinyWorld = (build: (t: Terrain) => void): World =>
  new World([{ id: 'tiny', name: 'Tiny', build: (t) => (build(t), { spawn: { x: 2.5, z: 20.5 } }) }]);

const OLD_FORMS: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf'];

describe('root tangles', () => {
  // A pad (tiles 30-32, rows 19-21) in a 4-connected ring of tangle, with a
  // pillar 4 high (a bunny hops it) outside the ring to launch glides from.
  // Without the tangle the same pad is open, so the ring is what keeps them out.
  const ring = (tangled: boolean): World =>
    tinyWorld((t) => {
    t.rect(0, 15, 40, 25, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
    t.rect(25, 19, 25, 21, (i, j) => t.set(i, j, FLOOR + 4, Kind.Stone));
    if (tangled) t.rect(28, 17, 34, 23, (i, j) => t.setTangle(i, j));
    t.rect(30, 19, 32, 21, (i, j) => (t.clear(i, j), t.set(i, j, FLOOR, Kind.Sand)));
  });
  const ringed = ring(true);
  const pad = { x: 31.5, z: 20.5 };
  const start = { x: 2.5, z: 20.5 };

  it('keeps every old form out of a ringed pad, but lets the Ant in', () => {
    expect(explore(ring(false), start, OLD_FORMS, 'max').canStand(pad)).toBe(true);
    const old = explore(ringed, start, OLD_FORMS, 'max');
    expect(old.canStand(pad)).toBe(false);
    expect(old.has(29, 20)).toBe(false);
    expect(explore(ringed, start, ['ant'], 'easy').canStand(pad)).toBe(true);
  });

  // A 1-wide tangle bridge over sky, climbing 0.25 a tile, then a far side.
  const LEN = 30;
  const climbing = tinyWorld((t) => {
    t.rect(0, 18, 9, 22, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
    for (let n = 0; n < LEN; n++) {
      t.set(10 + n, 20, FLOOR + 0.25 * (n + 1), Kind.Bark);
      t.setTangle(10 + n, 20);
    }
    t.rect(10 + LEN, 18, 20 + LEN, 22, (i, j) => t.set(i, j, FLOOR + 0.25 * LEN + 0.25, Kind.Moss));
  });
  const far = { x: 15 + LEN + 0.5, z: 20.5 };

  it('lets the Ant cross a tangle bridge that climbs, and nobody else', () => {
    expect(explore(climbing, start, ['ant'], 'easy').canStand(far)).toBe(true);
    const old = explore(climbing, start, OLD_FORMS, 'max');
    expect(old.has(10, 20)).toBe(false);
    expect(old.canStand(far)).toBe(false);
  });

  it('does not let the Ant hop from a tangle, but hops from plain ground', () => {
    // Ground, a tangle strip (or more ground), then 1 tile of sky, then a landing, in a row of ground.
    const gapWorld = (tangled: boolean): World =>
      tinyWorld((t) => {
        t.rect(0, 20, 12, 20, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
        if (tangled) t.rect(10, 20, 12, 20, (i, j) => t.setTangle(i, j));
        t.set(14, 20, FLOOR, Kind.Grass);
      });
    const land = { x: 14.5, z: 20.5 };
    expect(explore(gapWorld(false), start, ['ant'], 'max').canStand(land)).toBe(true);
    expect(explore(gapWorld(true), start, ['ant'], 'max').canStand(land)).toBe(false);
  });
});

// ---- water: diving, kelp and the Mermaid ---------------------------------

const SIX: FormId[] = [...OLD_FORMS, 'ant'];
const SHORE = 3; // 0.3 above the default water level, 2.7
const LEVEL = 2.7;

/** Land at SHORE from tile 0 on, with water cut in by `lake`. */
const waterWorld = (lake: (t: Terrain, pool: (i0: number, j0: number, i1: number, j1: number, depth: number) => void) => void): World =>
  tinyWorld((t) => {
    t.rect(0, 10, 60, 30, (i, j) => t.set(i, j, SHORE, Kind.Grass));
    lake(t, (i0, j0, i1, j1, depth) =>
      t.rect(i0, j0, i1, j1, (i, j) => {
        t.set(i, j, LEVEL - depth, Kind.Sand);
        t.setWater(i, j, true);
      }),
    );
  });

describe('diving and the Mermaid', () => {
  // Two stretches of lake, 4 and 6 deep, with a thing on each bed.
  const lake = waterWorld((_t, pool) => {
    pool(10, 15, 19, 25, 4);
    pool(20, 15, 39, 25, 6);
  });
  const shallow = { x: 13.5, z: 20.5 };
  const deep = { x: 30.5, z: 20.5 };
  const start = { x: 2.5, z: 20.5 };

  it('lets only the Human use a thing on a bed 4 deep, and only the Mermaid one 6 deep', () => {
    for (const profile of ['easy', 'max'] as const) {
      for (const f of SIX) {
        expect(explore(lake, start, [f], profile).canUse(shallow), `${f} ${profile} 4 deep`).toBe(f === 'human');
        expect(explore(lake, start, [f], profile).canUse(deep), `${f} ${profile} 6 deep`).toBe(false);
      }
      expect(explore(lake, start, SIX, profile).canUse(deep), `six ${profile}`).toBe(false);
      expect(explore(lake, start, [...SIX, 'mermaid'], profile).canUse(deep), `mermaid ${profile}`).toBe(true);
    }
  });

  // A lake of depth 8 with a 3 by 3 pool inside a ring of kelp one tile thick, and a rock in the middle.
  const ringWorld = (kelp: number): World =>
    waterWorld((t, pool) => {
      pool(10, 12, 50, 28, 8);
      t.set(30, 20, SHORE, Kind.Stone);
      t.setWater(30, 20, false);
      t.rect(28, 18, 32, 22, (i, j) => {
        if (i === 28 || i === 32 || j === 18 || j === 22) t.setKelp(i, j, kelp);
      });
    });
  const inside: [number, number][] = [];
  for (let j = 19; j <= 21; j++) for (let i = 29; i <= 31; i++) inside.push([i, j]);
  const reachedInside = (r: ReturnType<typeof explore>): number => inside.filter(([i, j]) => r.has(i, j)).length;

  it('keeps the six old forms out of a deep kelp ring, even at the limit, and lets the Mermaid in', () => {
    const w = ringWorld(KELP_DEEP);
    expect(reachedInside(explore(w, start, SIX, 'max'))).toBe(0);
    const r = explore(w, start, [...SIX, 'mermaid'], 'easy');
    expect(reachedInside(r)).toBe(inside.length);
    expect(r.canStand({ x: 30.5, z: 20.5 })).toBe(true);
  });

  it('lets only the Human into a low kelp ring', () => {
    const w = ringWorld(KELP_LOW);
    expect(reachedInside(explore(w, start, ['human'], 'easy'))).toBe(inside.length);
    expect(reachedInside(explore(w, start, SIX.filter((f) => f !== 'human'), 'max'))).toBe(0);
  });

  it('has the Mermaid hop only from the water, and climb out onto a low shore', () => {
    // A one-tile gap of sky between two grassy banks: a Human crosses it, the Mermaid on land cannot.
    const gap = tinyWorld((t) => {
      t.rect(0, 15, 9, 25, (i, j) => t.set(i, j, SHORE, Kind.Grass));
      t.rect(11, 15, 20, 25, (i, j) => t.set(i, j, SHORE, Kind.Grass));
    });
    expect(explore(gap, { x: 2.5, z: 20.5 }, ['human'], 'max').canStand({ x: 15.5, z: 20.5 })).toBe(true);
    expect(explore(gap, { x: 2.5, z: 20.5 }, ['mermaid'], 'max').canStand({ x: 15.5, z: 20.5 })).toBe(false);

    // A lake between two banks: she walks down into it and hops out onto the far shore.
    const across = waterWorld((_t, pool) => pool(10, 10, 19, 30, 3));
    const r = explore(across, start, ['mermaid'], 'easy');
    expect(r.canStand({ x: 25.5, z: 20.5 })).toBe(true);
  });
});
