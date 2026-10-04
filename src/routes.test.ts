import { describe, expect, it } from 'vitest';
import { ICE_SPEED } from './forms';
import { explore, hopFlyLimits } from './levelcheck';
import { Pilot } from './pilot';
import { Island, Kind, World } from './world';

// The level checker (levelcheck.ts) is an abstraction. These tests prove the
// key moves of the real islands with the real player physics: a Player in the
// real World, steered by a scripted driver (pilot.ts), from a standing start to
// a standing end. Bad guys are not part of them.
//
// A route that works only with frame-perfect input is a level bug, so every
// jump is tried at three take-off points: 0.5, 0.25 and 0.05 tiles before the
// edge, which covers "anywhere in the last half tile".

const world = new World();
const { layout } = world;

const arrival = (id: string) => layout.arrivals.find((a) => a.id === id)!;
/** The middle of tile (i, j). */
const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const EDGES = [0.5, 0.25, 0.05];

/** Run a route once for each take-off point, with a fresh pilot each time. */
function eachEdge(route: (edge: number) => void): void {
  for (const edge of EDGES) route(edge);
}

// ---- Tanglewood ------------------------------------------------------------

describe('Route 1: Meadow to Tanglewood, as a fairy', () => {
  it('flies bluff - resting cloud - the landing', () => {
    const p = new Pilot(world, 'fairy', at(41, 22));
    expect(p.fly(at(51, 21)), `to the cloud: ${p.describe()}`).toBe(true);
    expect(p.rest(), 'rest on the cloud').toBe(true);
    expect(p.fly(at(64, 22)), `to the landing: ${p.describe()}`).toBe(true);
    const a = arrival('tanglewood');
    expect(Math.hypot(a.x - p.x, a.z - p.z)).toBeLessThan(a.radius);
  });
});

describe('Route 2: the Tanglewood lake', () => {
  const pillar = at(81, 40);

  it('lets a fairy take off from the launch rock onto the pillar by the candle', () => {
    const p = new Pilot(world, 'fairy', at(79, 40));
    expect(p.fly(pillar), p.describe()).toBe(true);
    expect(p.y).toBeCloseTo(world.groundAt(pillar.x, pillar.z), 6);
  });

  it('keeps her off the pillar when she takes off from the ordinary islet ground', () => {
    // Straight east along the south edge of the islet, so she never brushes
    // the launch rock (a fairy that steps on the rock IS taking off from it).
    for (const i of [77, 78, 79]) {
      const p = new Pilot(world, 'fairy', at(i, 41));
      expect(p.fly(at(81, 41), { seconds: 4 }), `from ${i},41`).toBe(false);
      // She never got high enough: ground (3) + the ceiling (3) + a little.
      expect(p.peak, `from ${i},41`).toBeLessThan(world.groundAt(81.5, 41.5) - 0.3);
    }
  });
});

describe('Route 3: the Tanglewood Keep', () => {
  const plateau = at(88, 17);
  const tower = at(84, 13);

  it('lets a fairy fly from the base ground onto the plateau', () => {
    const p = new Pilot(world, 'fairy', at(88, 22));
    expect(p.fly(plateau), p.describe()).toBe(true);
  });

  it('lets a fairy fly from the launch stone onto the tower', () => {
    const p = new Pilot(world, 'fairy', at(86, 15));
    expect(p.fly(tower), p.describe()).toBe(true);
    expect(p.y).toBeCloseTo(9, 6);
  });

  it('keeps her off the tower when she takes off from the plateau floor', () => {
    for (const [i, j] of [[85, 13], [85, 15], [85, 16], [86, 13], [88, 18], [90, 14], [91, 19]]) {
      const p = new Pilot(world, 'fairy', at(i, j));
      expect(p.fly(tower, { seconds: 4 }), `from ${i},${j}`).toBe(false);
      expect(p.peak, `from ${i},${j}`).toBeLessThan(9 - 0.3);
    }
  });

  it('keeps a human off the plateau', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'human', at(88, 22));
      expect(p.hop(plateau, { edge, seconds: 6 }), `edge ${edge}`).toBe(false);
    });
  });
});

describe('Route 4: the Tanglewood sky stairs, as a fairy', () => {
  const s2 = at(82, 56);
  const s3 = at(69, 57);
  const dais = at(79, 55);

  it('goes shore - S1 - S2 - S3, resting to full energy on each', () => {
    const p = new Pilot(world, 'fairy', at(89, 49));
    expect(p.fly(at(90, 55)), `to S1: ${p.describe()}`).toBe(true);
    expect(p.rest(), 'rest on S1').toBe(true);
    expect(p.fly(s2), `to S2: ${p.describe()}`).toBe(true);
    expect(p.rest(), 'rest on S2').toBe(true);
    expect(p.fly(s3), `to S3: ${p.describe()}`).toBe(true);
    expect(p.rest(), 'rest on S3').toBe(true);
    // And back: S3 to the dais on S2, where the candle is.
    expect(p.fly(dais), `to the dais: ${p.describe()}`).toBe(true);
  });

  it('does not let her fly from the mainland straight to S2', () => {
    for (const [i, j] of [[83, 49], [85, 49], [88, 49], [86, 50]]) {
      const p = new Pilot(world, 'fairy', at(i, j));
      expect(p.fly(s2, { seconds: 4 }), `from ${i},${j}`).toBe(false);
    }
  });
});

describe('Route 5: the Tanglewood exit, as an orangutan', () => {
  // Each stop is a tree trunk; the Lookout is stone between two of them.
  const GROVE = [[100, 25], [101, 22], [102, 19]];
  const TO_PROMONTORY = [[106, 23], [108, 25], [110, 27]];
  const CHAIN = [[113, 27], [116, 26], [119, 27], [122, 28]];

  it('climbs from the first grove tree to the prow of Highcrag, in under 20 trees', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'orangutan', at(98, 25));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      let most = 0;
      let climbed = 0;
      const tree = (i: number, j: number, how: 'climb' | 'leap'): void => {
        const ok = how === 'climb' ? p.climb(at(i, j)) : p.leapTo(at(i, j), { edge });
        expect(ok, where(`tree ${i},${j}`)).toBe(true);
        climbed++;
        most = Math.max(most, p.player.treesClimbed);
      };
      tree(GROVE[0][0], GROVE[0][1], 'climb');
      for (const [i, j] of GROVE.slice(1)) tree(i, j, 'leap');

      // Over to the Lookout, which is real ground, and off it to the next tree.
      expect(p.hop(at(105, 18), { edge }), where('the Lookout')).toBe(true);
      expect(p.player.treesClimbed).toBe(0);
      for (const [i, j] of [...TO_PROMONTORY, ...CHAIN]) tree(i, j, 'leap');

      // And down onto the prow.
      expect(p.hop(at(126, 28), { edge }), where('the prow')).toBe(true);
      expect(p.y).toBeCloseTo(7, 6);
      expect(climbed).toBe(GROVE.length + TO_PROMONTORY.length + CHAIN.length);
      expect(climbed).toBeLessThan(20);
      expect(most).toBeLessThan(20);
    });
  });
});

// ---- Highcrag --------------------------------------------------------------

describe('Route 6: the Highcrag canopy road, as an orangutan', () => {
  const TREES = [[137, 28], [140, 27], [143, 29], [146, 28], [149, 30], [151, 30]];

  it('goes from the prow to Camp Rock', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'orangutan', at(129, 28));
      for (const [i, j] of TREES) {
        expect(p.leapTo(at(i, j), { edge }), `edge ${edge}: tree ${i},${j}: ${p.describe()}`).toBe(true);
      }
      const rock = at(155, 29);
      expect(p.hop(rock, { edge }), `edge ${edge}: Camp Rock: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(world.groundAt(rock.x, rock.z), 6);
      expect(p.player.treesClimbed).toBe(0);
    });
  });
});

describe('Route 7: the Highcrag North Cap', () => {
  const cap = at(151, 11);

  it('lets an orangutan climb the rim tree, shift to a fairy on its top and fly onto the cap', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'orangutan', at(148, 22));
      expect(p.leapTo(at(152, 21), { edge }), `edge ${edge}: rim tree: ${p.describe()}`).toBe(true);
      p.shift('fairy');
      expect(p.fly(cap), `edge ${edge}: the cap: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(13, 6);
    });
  });

  it('keeps a fairy who takes off from the valley rim off the cap', () => {
    for (const x of [141, 146, 156, 160]) {
      const p = new Pilot(world, 'fairy', at(x, 21));
      expect(p.fly(cap, { seconds: 4 }), `from ${x}`).toBe(false);
      expect(p.peak, `from ${x}`).toBeLessThan(13 - 0.3);
    }
  });
});

describe('Route 8: the Highcrag Spire', () => {
  it('goes fairy - orangutan - fairy up the three tiers', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'fairy', at(160, 25));
      expect(p.fly(at(166, 27)), `tier 1: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(8, 6);
      p.shift('orangutan');
      expect(p.climb(at(165, 24)), `tier 1 tree: ${p.describe()}`).toBe(true);
      expect(p.hop(at(168, 24), { edge }), `edge ${edge}: tier 2: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(14, 6);
      p.shift('fairy');
      expect(p.fly(at(170, 23)), `tier 3: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(17, 6);
    });
  });
});

describe('Route 9: the Highcrag Lonely Rock', () => {
  it('goes fairy to the islet, then orangutan up the tree, to the pillar tree and the candle rock', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'fairy', at(137, 41));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.fly(at(130, 45)), where('the islet')).toBe(true);
      p.shift('orangutan');
      expect(p.leapTo(at(127, 49), { edge }), where('islet tree')).toBe(true);
      expect(p.hop(at(130, 49), { edge }), where('the crag')).toBe(true);
      expect(p.y).toBeCloseTo(13, 6);
      expect(p.leapTo(at(130, 53), { edge }), where('pillar tree')).toBe(true);
      expect(p.hop(at(129, 55), { edge }), where('the candle rock')).toBe(true);
      expect(p.y).toBeCloseTo(15, 6);
    });
  });

  it('keeps a human and an orangutan on the mainland', () => {
    for (const form of ['human', 'orangutan'] as const) {
      eachEdge((edge) => {
        const p = new Pilot(world, form, at(137, 41));
        expect(p.hop(at(131, 44), { edge, seconds: 6 }), `${form}, edge ${edge}`).toBe(false);
      });
    }
  });
});

describe('Route 10: the Highcrag Split Mesa', () => {
  it('goes orangutan up the tree onto the mesa, then fairy from its south edge to the sky pillar', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'orangutan', at(138, 43));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.leapTo(at(140, 43), { edge }), where('mesa tree')).toBe(true);
      expect(p.hop(at(143, 43), { edge }), where('the mesa')).toBe(true);
      expect(p.y).toBeCloseTo(13, 6);
      expect(p.walk(at(145, 46)), where('the south edge')).toBe(true);
      p.shift('fairy');
      expect(p.fly(at(144, 54)), where('the sky pillar')).toBe(true);
      expect(p.y).toBeCloseTo(16, 6);
    });
  });
});

describe('Route 11: the Highcrag exit, as a bunny', () => {
  const CAUSEWAY = at(170, 40);
  const STEPS = [at(188, 40), at(192, 40), at(196, 40)];

  it('hops up the three stair steps and across to Frostfang', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(185, 40));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      STEPS.forEach((step, n) => {
        expect(p.hop(step, { edge }), where(`step ${n + 1}`)).toBe(true);
        expect(p.y).toBeCloseTo(world.groundAt(step.x, step.z), 6);
      });
      const a = arrival('frostfang');
      expect(p.hop({ x: a.x - 2.5, z: a.z }, { edge }), where('Frostfang')).toBe(true);
      expect(Math.hypot(a.x - p.x, a.z - p.z)).toBeLessThan(a.radius);
    });
  });

  it('hops over a cover wall', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', CAUSEWAY);
      expect(p.hop(at(175, 39), { edge }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(5, 6);
    });
  });

  it('keeps a human on its own side of a cover wall', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'human', CAUSEWAY);
      expect(p.hop(at(175, 39), { edge, seconds: 6 }), `edge ${edge}`).toBe(false);
    });
  });

  it('hops onto an archer pillar', () => {
    eachEdge((edge) => {
      const north = new Pilot(world, 'bunny', at(175, 38));
      expect(north.hop(at(175, 35), { edge }), `north, edge ${edge}: ${north.describe()}`).toBe(true);
      expect(north.y).toBeCloseTo(9, 6);
      const south = new Pilot(world, 'bunny', at(180, 42));
      expect(south.hop(at(180, 44), { edge }), `south, edge ${edge}: ${south.describe()}`).toBe(true);
      expect(south.y).toBeCloseTo(9, 6);
    });
  });

  it('keeps a fairy who is on the first step off the second', () => {
    // Step 1 is 9, step 2 is 13: one flight short, from anywhere on step 1.
    for (const i of [187, 189, 190]) {
      const p = new Pilot(world, 'fairy', at(i, 40));
      expect(p.fly(STEPS[1], { seconds: 4 }), `from ${i}`).toBe(false);
      expect(p.peak, `from ${i}`).toBeLessThan(13 - 0.3);
    }
  });

  it('keeps a human off the first stair step', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'human', at(185, 40));
      expect(p.hop(STEPS[0], { edge, seconds: 6 }), `edge ${edge}`).toBe(false);
    });
  });
});

describe('Nobody can stand on a candle, a speaker or a checkpoint', () => {
  it('keeps a fairy off the lake candle even from the launch rock', () => {
    const candle = layout.puzzles.find((q) => q.id === 'tw-lake')!.candle;
    const p = new Pilot(world, 'fairy', at(79, 40));
    expect(p.fly(candle, { seconds: 4 })).toBe(false);
    expect(p.player.pos.y).toBeLessThan(world.groundAt(candle.x, candle.z) + 1);
  });

  it('keeps a human from walking onto a checkpoint', () => {
    const c = layout.checkpoints.find((k) => k.id === 'tw-cross')!;
    const p = new Pilot(world, 'human', { x: c.x - 1, z: c.z + 1 });
    expect(p.walk(c, { seconds: 4 })).toBe(false);
  });
});

// ---- Winter Wolf and hop-then-fly -------------------------------------------

/** A platform (tiles 0-19) and a ledge `rise` higher that starts `gap` tiles of sky past it. */
function gapIsland(gap: number, rise: number): Island {
  return {
    id: 'gap',
    name: 'Gap',
    build(t) {
      t.rect(0, 10, 19, 20, (i, j) => t.set(i, j, 2, Kind.Stone));
      t.rect(20 + gap, 10, 70, 20, (i, j) => t.set(i, j, 2 + rise, Kind.Stone));
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

const launch = { x: 19.5, z: 15.5 };
const landing = (gap: number) => ({ x: 20 + gap + 0.5, z: 15.5 });

/** Building a World costs milliseconds and a plain stone island never changes, so each (gap, rise) is built once. */
const gapWorlds = new Map<string, World>();
function gapWorld(gap: number, rise: number): World {
  const key = `${gap},${rise}`;
  let w = gapWorlds.get(key);
  if (!w) gapWorlds.set(key, (w = new World([gapIsland(gap, rise)])));
  return w;
}

/** Does a bunny make it across with a hop-then-fly, taking off `edge` tiles from the rim? */
function hopFlies(gap: number, rise: number, edge: number): boolean {
  const p = new Pilot(gapWorld(gap, rise), 'bunny', launch);
  return p.hopThenFly(landing(gap), { edge });
}

/** The widest gap (in tiles of sky) she crosses at this rise. */
function widestGap(rise: number, edge: number): number {
  for (let gap = 40; gap >= 1; gap--) if (hopFlies(gap, rise, edge)) return gap;
  return 0;
}

describe('Route 12: hop-then-fly, with the real physics', () => {
  it('lands on a ledge 4 high across 6 tiles of sky that neither a bunny nor a fairy can do alone', () => {
    eachEdge((edge) => {
      expect(hopFlies(6, 4, edge), `hop-then-fly, edge ${edge}`).toBe(true);
    });
    const w = new World([gapIsland(6, 4)]);
    const bunny = new Pilot(w, 'bunny', launch);
    expect(bunny.hop(landing(6), { edge: 0.05 }), 'bunny alone').toBe(false);
    const fairy = new Pilot(w, 'fairy', launch);
    expect(fairy.fly(landing(6), { seconds: 12 }), 'fairy alone').toBe(false);
  });

  it('is what the checker says: easy and max with both forms reach it, max with one does not', () => {
    const w = new World([gapIsland(6, 4)]);
    const from = w.layout.spawn;
    const target = landing(6);
    expect(explore(w, from, ['bunny', 'fairy'], 'easy').canStand(target)).toBe(true);
    expect(explore(w, from, ['bunny', 'fairy'], 'max').canStand(target)).toBe(true);
    expect(explore(w, from, ['bunny'], 'max').canStand(target)).toBe(false);
    expect(explore(w, from, ['fairy'], 'max').canStand(target)).toBe(false);
  });

  it('is never farther than the checker allows at max, and never nearer than easy promises', () => {
    const easy = hopFlyLimits('easy');
    const max = hopFlyLimits('max');
    for (const rise of [0, 1, 2, 3, 4, 4.5]) {
      // Reliable: from the middle of the take-off tile (edge 0.5). The limit:
      // from the very rim (edge 0.05).
      const reliable = widestGap(rise, 0.5);
      const limit = widestGap(rise, 0.05);
      expect(reliable, `rise ${rise}`).toBeGreaterThan(0);
      expect(easy.range(rise), `easy, rise ${rise}`).toBeLessThan(reliable);
      expect(max.range(rise), `max, rise ${rise}`).toBeGreaterThan(limit);
    }
  });

  it('is never higher than the checker allows at max, and never lower than easy promises', () => {
    let top = 0;
    let rim = 0;
    for (let rise = 3; rise <= 6; rise += 0.05) {
      if (hopFlies(6, rise, 0.5)) top = rise;
      if (hopFlies(6, rise, 0.05)) rim = rise;
    }
    expect(top).toBeGreaterThan(4);
    expect(hopFlyLimits('easy').up).toBeLessThan(Math.min(top, rim));
    expect(hopFlyLimits('max').up).toBeGreaterThan(Math.max(top, rim));
  });
});

describe('Route 13: the Winter Wolf on thin ice', () => {
  /** A bank, a thin-ice bridge `len` tiles long over sky, and a far bank. */
  const bridge = (len: number): World =>
    new World([
      {
        id: 'bridge',
        name: 'Bridge',
        build(t) {
          t.rect(0, 10, 9, 20, (i, j) => t.set(i, j, 2, Kind.Snow));
          t.rect(10 + len, 10, 40 + len, 20, (i, j) => t.set(i, j, 2, Kind.Snow));
          t.rect(10, 10, 9 + len, 20, (i, j) => t.setThinIce(i, j, 2));
          return { spawn: { x: 2.5, z: 15.5 } };
        },
      },
    ]);

  it('walk() to a target past the ice keeps the wolf at full speed to the far bank', () => {
    const w = bridge(14);
    const p = new Pilot(w, 'wolf', at(3, 15));
    expect(p.walk(at(30, 15)), p.describe()).toBe(true);
    expect(p.y).toBe(2);
    for (let i = 10; i < 24; i++) expect(w.isIceIntact(i + 0.5, 15.5), `tile ${i}`).toBe(true);
  });

  it('hop() runs over it too, and a bunny cannot do the same walk', () => {
    const w = bridge(14);
    expect(new Pilot(w, 'wolf', at(3, 15)).hop(at(30, 15))).toBe(true);
    const bunny = new Pilot(w, 'bunny', at(3, 15));
    expect(bunny.walk(at(30, 15), { seconds: 6 })).toBe(false);
    expect(bunny.fell).toBe(true);
  });

  it('resets the ice when a pilot is made, so tests can share one world', () => {
    const w = bridge(14);
    new Pilot(w, 'human', at(9, 15)).walk(at(12, 15), { seconds: 3 });
    expect(w.isIceIntact(10.5, 15.5)).toBe(false);
    new Pilot(w, 'wolf', at(3, 15));
    expect(w.isIceIntact(10.5, 15.5)).toBe(true);
  });
});

describe('Route 14: great trees stay Orangutan-only, even for hop-then-fly', () => {
  it('never gets a bunny onto a great pine top', () => {
    let peak = -Infinity;
    for (const gap of [2, 3, 5]) {
      for (const edge of EDGES) {
        const w = new World([
          {
            id: 'pine',
            name: 'Pine',
            build(t) {
              t.rect(0, 10, 19, 20, (i, j) => t.set(i, j, 2, Kind.Snow));
              // The tree stands on a one-tile pedestal of the same ground.
              t.set(20 + gap, 15, 2, Kind.Snow);
              return { spawn: { x: 2.5, z: 15.5 }, trees: [{ x: 20 + gap + 0.5, z: 15.5, kind: 'greatPine' }] };
            },
          },
        ]);
        const p = new Pilot(w, 'bunny', launch);
        const ok = p.hopThenFly({ x: 20 + gap + 0.5, z: 15.5 }, { edge });
        peak = Math.max(peak, p.peak);
        expect(ok, `gap ${gap}, edge ${edge}`).toBe(false);
      }
    }
    // The real ceiling: +4.5 hover, a bit more at the very top. A great pine is +5.
    expect(peak - 2, 'highest her feet got above the launch ground').toBeLessThan(5 - 0.1);
  });
});

// ---- Frostfang, west half ---------------------------------------------------

describe('Route 15: the Frostfang Snow Steps', () => {
  it('lets a bunny hop from the hub up to the terrace, and a human not', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(210, 24));
      expect(p.hop(at(210, 19), { edge }), `bunny, edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(19, 6);
      const h = new Pilot(world, 'human', at(210, 24));
      expect(h.hop(at(210, 19), { edge, seconds: 6 }), `human, edge ${edge}`).toBe(false);
    });
  });

  it('lets a bunny hop over the wall, and a human not', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(210, 18));
      expect(p.hop(at(210, 14), { edge }), `bunny, edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(19, 6);
      const h = new Pilot(world, 'human', at(210, 18));
      expect(h.hop(at(210, 14), { edge, seconds: 6 }), `human, edge ${edge}`).toBe(false);
    });
  });
});

describe('Route 16: the Frostfang Needle, hop then fly', () => {
  // The speaker (211.5, 46.5) is solid and stands on the rim, so go past it
  // along the west column of the Needle.
  const needle = at(210, 56);

  it('lands a hop-then-fly from the rim on the Needle', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(210, 44));
      expect(p.hopThenFly(needle, { edge }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(19, 6);
    });
  });

  it('keeps a bunny alone and a fairy alone off it', () => {
    eachEdge((edge) => {
      const b = new Pilot(world, 'bunny', at(210, 44));
      expect(b.hop(needle, { edge, seconds: 8 }), `bunny, edge ${edge}`).toBe(false);
    });
    const f = new Pilot(world, 'fairy', at(210, 46));
    expect(f.fly(needle, { seconds: 10 }), 'fairy').toBe(false);
    expect(f.peak, 'fairy').toBeLessThan(19 - 0.3);
  });
});

describe('Route 17: the Frostfang Pine Road', () => {
  const TREES = [at(236, 49), at(238, 51), at(239, 53), at(237, 55)];

  it('lets an orangutan climb the first pine, leap along the road and hop onto Owl Rock', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'orangutan', at(236, 43));
      const where = (what: string) => `edge ${edge}: ${what}: ${p.describe()}`;
      expect(p.climb(at(236, 46)), where('T1')).toBe(true);
      TREES.forEach((tree, n) => expect(p.leapTo(tree, { edge }), where(`T${n + 2}`)).toBe(true));
      expect(p.hop(at(237, 57), { edge }), where('Owl Rock')).toBe(true);
      expect(p.y).toBeCloseTo(25, 6);
    });
  });

  it('lets a bunny hop from Owl Rock up to the candle step', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(239, 58));
      expect(p.hop(at(241, 58), { edge }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(29, 6);
    });
  });
});

describe('Route 18: the Frostfang Undercliff', () => {
  it('lets a human walk off the rim and land on the shelf', () => {
    const p = new Pilot(world, 'human', at(225, 44));
    expect(p.walk(at(225, 50)), p.describe()).toBe(true);
    expect(p.y).toBeCloseTo(9, 6);
  });

  it('lets a fairy fly from the shelf to the candle rock and back', () => {
    const p = new Pilot(world, 'fairy', at(223, 53));
    expect(p.fly(at(223, 61)), `out: ${p.describe()}`).toBe(true);
    expect(p.y).toBeCloseTo(9, 6);
    expect(p.rest(), 'rest').toBe(true);
    expect(p.fly(at(223, 53)), `back: ${p.describe()}`).toBe(true);
  });

  it('lets an orangutan climb the pine and hop onto the hub', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'orangutan', at(231, 51));
      expect(p.climb(at(231, 48)), `edge ${edge}: pine: ${p.describe()}`).toBe(true);
      expect(p.hop(at(231, 46), { edge }), `edge ${edge}: hub: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(15, 6);
    });
  });

  it('keeps a bunny on the shelf off the hub', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(225, 50));
      expect(p.hop(at(225, 46), { edge, seconds: 8 }), `edge ${edge}`).toBe(false);
      expect(p.peak, `edge ${edge}`).toBeLessThan(15 - 0.3);
    });
  });
});

describe('Route 19: the Frostfang Fang', () => {
  const TIP = at(225, 7);

  it('goes bunny up to tier 1 and fairy across to tier 2', () => {
    eachEdge((edge) => {
      const b = new Pilot(world, 'bunny', at(220, 24));
      expect(b.hop(at(220, 20), { edge }), `bunny, edge ${edge}: ${b.describe()}`).toBe(true);
      expect(b.y).toBeCloseTo(19, 6);
    });
    const f = new Pilot(world, 'fairy', at(224, 17));
    expect(f.fly(at(234, 17)), f.describe()).toBe(true);
    expect(f.y).toBeCloseTo(22, 6);
  });

  it('lets an orangutan climb the pine and hop onto tier 3', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'orangutan', at(236, 16));
      expect(p.climb(at(236, 13)), `edge ${edge}: pine: ${p.describe()}`).toBe(true);
      expect(p.hop(at(236, 11), { edge }), `edge ${edge}: tier 3: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(28, 6);
    });
  });

  it('lands a hop-then-fly from tier 3 on the tip, which a fairy alone cannot reach', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(234, 7));
      expect(p.hopThenFly(TIP, { edge }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBeCloseTo(32, 6);
    });
    const f = new Pilot(world, 'fairy', at(234, 7));
    expect(f.fly(TIP, { seconds: 12 }), 'fairy').toBe(false);
    expect(f.peak, 'fairy').toBeLessThan(32 - 0.3);
  });
});

// ---- Frostfang, east half: the frozen lake and the exit run -------------------

const LANE = [31, 32];
const SHORE_X = 243;
const GLACIER_X = 277;
const LAKE_LEVEL = 14.7;
const PIER_Z = 11;

describe('Route 20: the Frozen Falls, as a wolf', () => {
  it('runs from the shore to the Glacier on every row of the lane, never below full speed', () => {
    for (const j of LANE) {
      const p = new Pilot(world, 'wolf', at(SHORE_X, j));
      expect(p.sprint(at(GLACIER_X, j)), `row ${j}: ${p.describe()}`).toBe(true);
      expect(p.y, `row ${j}`).toBe(21);
      expect(p.minIceSpeed, `row ${j}`).toBeGreaterThanOrEqual(ICE_SPEED);
      expect(p.player.swimming, `row ${j}`).toBe(false);
      expect(p.player.iceRun, `row ${j}`).toBeGreaterThan(26);
    }
  });

  it('keeps a wolf that stops halfway up in the lake, afloat and able to climb out', () => {
    for (const j of LANE) {
      const p = new Pilot(world, 'wolf', at(SHORE_X, j));
      expect(p.sprint(at(GLACIER_X, j), { done: () => p.x > 262 })).toBe(true);
      p.wait(1.5);
      expect(p.fell, `row ${j}: not out of the world`).toBe(false);
      expect(p.player.swimming, `row ${j}: ${p.describe()}`).toBe(true);
      // Floating 0.8 under the water's surface, wherever on the lake it is.
      expect(p.y, `row ${j}`).toBeCloseTo(world.waterLevelAt(p.x, p.z) - 0.8, 3);
      expect(world.waterLevelAt(p.x, p.z), `row ${j}`).toBeGreaterThanOrEqual(LAKE_LEVEL);
      // And back: swim out sideways onto the flat ice beside the lane (the
      // lane's walls are too high to jump), then run west along it to the shore.
      const side = { x: p.x, z: j === 31 ? 29.5 : 34.5 };
      expect(p.hop(side, { edge: 0.25, seconds: 10 }), `row ${j} onto the flat ice: ${p.describe()}`).toBe(true);
      expect(p.y, `row ${j} on the flat ice`).toBe(15);
      expect(p.sprint(at(SHORE_X, j), { seconds: 20 }), `row ${j} back to the shore: ${p.describe()}`).toBe(true);
      expect(p.y, `row ${j}`).toBe(15);
    }
  });
});

describe('Route 21: everyone else on the lake ice', () => {
  const glacier = at(GLACIER_X, 31);

  it('breaks through under a human, a bunny and a fairy who walk onto it, and none reaches the Glacier', () => {
    for (const form of ['human', 'bunny', 'fairy'] as const) {
      const p = new Pilot(world, form, at(SHORE_X, 31));
      expect(p.walk(glacier, { seconds: 25 }), form).toBe(false);
      expect(p.player.swimming, `${form}: ${p.describe()}`).toBe(true);
      expect(p.x, form).toBeLessThan(274);
      expect(p.y, form).toBeLessThan(15);
      expect(p.y, form).toBeCloseTo(world.waterLevelAt(p.x, p.z) - (form === 'fairy' ? 0.25 : 0.8), 3);
    }
  });

  it('does not let a bunny hop across, or a fairy fly across', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(SHORE_X, 31));
      expect(p.hop(glacier, { edge, seconds: 25 }), `bunny edge ${edge}`).toBe(false);
      expect(p.x, `bunny edge ${edge}`).toBeLessThan(274);
    });
    const f = new Pilot(world, 'fairy', at(SHORE_X, 31));
    expect(f.fly(glacier, { seconds: 25 }), `fairy: ${f.describe()}`).toBe(false);
    expect(f.x).toBeLessThan(274);
  });

  it('does not let anyone get across by hopping at every chance, not even from the water', () => {
    for (const form of ['human', 'orangutan', 'bunny'] as const) {
      for (const j of LANE) {
        const p = new Pilot(world, form, at(SHORE_X, j));
        expect(p.bounce(glacier, { seconds: 40 }), `${form} row ${j}`).toBe(false);
        expect(p.x, `${form} row ${j}: ${p.describe()}`).toBeLessThan(274);
      }
    }
  });

  it('does not let a fairy who takes off from the shore reach the Glacier, at the best of her flight', () => {
    // 31 tiles of ice and +6: her whole flight is 4.5 s of hovering.
    const p = new Pilot(world, 'fairy', at(245, 31));
    expect(p.fly(glacier, { seconds: 25 }), p.describe()).toBe(false);
  });
});

describe('Route 22: the ice step, as a bunny', () => {
  const from = at(277, 25);
  const to = at(277, 22);

  it('hops from the Glacier onto the upper glacier', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', from);
      expect(p.hop(to, { edge }), `edge ${edge}: ${p.describe()}`).toBe(true);
      expect(p.y).toBe(25);
    });
  });

  it('keeps a wolf and a fairy off it', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'wolf', from);
      expect(p.hop(to, { edge, seconds: 6 }), `wolf edge ${edge}`).toBe(false);
    });
    for (const [i, j] of [[277, 26], [278, 27], [275, 30]]) {
      const f = new Pilot(world, 'fairy', at(i, j));
      expect(f.fly(to, { seconds: 6 }), `fairy from ${i},${j}`).toBe(false);
      expect(f.peak, `fairy from ${i},${j}`).toBeLessThan(25);
    }
  });
});

describe('Route 23: the pine, as an orangutan', () => {
  const pine = at(278, 17);
  const brow = at(278, 13);

  it('climbs the pine and hops onto the Brow', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'orangutan', at(278, 20));
      expect(p.climb(pine), `edge ${edge}: climb: ${p.describe()}`).toBe(true);
      expect(p.y, 'on the treetop').toBe(30);
      expect(p.hop(brow, { edge }), `edge ${edge}: hop: ${p.describe()}`).toBe(true);
      expect(p.y).toBe(31);
    });
  });

  it('keeps the bunny, the wolf and the fairy off the Brow without the tree', () => {
    eachEdge((edge) => {
      for (const form of ['bunny', 'wolf', 'orangutan'] as const) {
        const p = new Pilot(world, form, at(279, 16));
        expect(p.hop(brow, { edge, seconds: 6 }), `${form} edge ${edge}`).toBe(false);
      }
      const b = new Pilot(world, 'bunny', at(279, 16));
      expect(b.hopThenFly(at(279, 11), { edge, seconds: 12 }), `hop-then-fly edge ${edge}: ${b.describe()}`).toBe(false);
    });
    const f = new Pilot(world, 'fairy', at(279, 16));
    expect(f.fly(brow, { seconds: 6 }), 'fairy').toBe(false);
  });
});

describe('Route 24: run, then fly - the pier and Last Rock', () => {
  const lastRock = at(304, 11);
  const sky = at(310, PIER_Z);

  it('lets a wolf sprint the pier, shift to a fairy near the end and land on Last Rock', () => {
    // The shift is made anywhere in the last two tiles of the ice.
    for (const shiftX of [291.5, 292.0, 292.5, 293.0, 293.5, 293.9]) {
      const p = new Pilot(world, 'wolf', at(277, PIER_Z));
      const ok = p.runThenFly(sky, () => p.x >= shiftX, lastRock, { seconds: 12 });
      expect(ok, `shift at ${shiftX}: ${p.describe()}`).toBe(true);
      expect(p.y, `shift at ${shiftX}`).toBe(36);
      expect(p.player.form.id).toBe('fairy');
    }
  });

  it('keeps a fairy who takes off from the Brow itself off Last Rock', () => {
    for (const z of [9, 11, 13]) {
      const p = new Pilot(world, 'fairy', at(283, z));
      p.fly(lastRock, { seconds: 8 });
      expect(p.standingOn(lastRock), `from z ${z}: ${p.describe()}`).toBe(false);
      expect(p.peak, `from z ${z}`).toBeLessThan(36 - 0.3);
    }
  });

  it('keeps a bunny that hops off the Brow, then flies, off Last Rock', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'bunny', at(282, 14));
      expect(p.hopThenFly(at(304, 12), { edge, seconds: 12 }), `edge ${edge}: ${p.describe()}`).toBe(false);
    });
  });

  it('keeps a wolf that just runs off the end of the ice off Last Rock', () => {
    const p = new Pilot(world, 'wolf', at(277, PIER_Z));
    expect(p.sprint(lastRock, { seconds: 8 }), p.describe()).toBe(false);
    expect(p.standingOn(lastRock)).toBe(false);
    expect(p.fell).toBe(true);
  });

  it('keeps a wolf that jumps off the end of the ice off Last Rock', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'wolf', at(277, PIER_Z));
      expect(p.sprint(lastRock, { edge, seconds: 8 }), `edge ${edge}: ${p.describe()}`).toBe(false);
      expect(p.fell, `edge ${edge}`).toBe(true);
    });
  });

  it('keeps a human, bunny and fairy off the pier', () => {
    for (const form of ['human', 'bunny', 'fairy'] as const) {
      const p = new Pilot(world, form, at(282, PIER_Z));
      p.walk(at(288, PIER_Z), { seconds: 10 });
      expect(p.fell || p.y < 30, `${form}: ${p.describe()}`).toBe(true);
    }
  });
});

describe('Route 25: the last run, as a wolf', () => {
  const start = at(304, 11);
  const target = at(304, 50);

  it('runs from Last Rock, jumps the leap, runs down the ramp and arrives at Underroot', () => {
    eachEdge((edge) => {
      const p = new Pilot(world, 'wolf', start);
      const ok = p.sprint(target, { edge, seconds: 12 });
      expect(ok, `edge ${edge}: ${p.describe()}`).toBe(true);
      const a = arrival('underroot');
      expect(Math.hypot(a.x - p.x, a.z - p.z), `edge ${edge}`).toBeLessThan(a.radius);
      expect(p.y, `edge ${edge}`).toBe(32);
      expect(p.minIceSpeed, `edge ${edge}`).toBeGreaterThanOrEqual(ICE_SPEED);
    });
  });

  it('drops a wolf that does not jump the leap', () => {
    const p = new Pilot(world, 'wolf', start);
    expect(p.sprint(target, { seconds: 8 }), p.describe()).toBe(false);
    expect(p.fell).toBe(true);
  });

  it('breaks under a wolf that stops on the way', () => {
    const p = new Pilot(world, 'wolf', start);
    expect(p.sprint(target, { done: () => p.z > 18, seconds: 6 })).toBe(true);
    p.wait(1);
    expect(p.fell || p.y < 30, p.describe()).toBe(true);
  });
});
