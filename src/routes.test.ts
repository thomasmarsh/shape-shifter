import { describe, expect, it } from 'vitest';
import { Pilot } from './pilot';
import { World } from './world';

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
