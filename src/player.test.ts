import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { FORMS, FormId, ICE_REGROW, ICE_SPEED, ICE_STUMBLE, KELP_DEEP, KELP_LOW } from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
import { Pilot } from './pilot';
import { Player } from './player';
import { Island, Kind, TreeSpot, World } from './world';

describe('Player', () => {
  it('can be built and placed without a browser', () => {
    const world = new World();
    const player = new Player(world, new Particles(), {
      onFell: () => {},
      onDied: () => {},
      onAte: () => {},
      onHome: () => {},
    });
    player.place(world.layout.spawn.x, world.layout.spawn.z);
    expect(player.pos.y).toBe(world.groundAt(world.layout.spawn.x, world.layout.spawn.z));
    expect(player.onGround).toBe(true);
  });
});

// ---- a player in a tiny world, driven by a fake keyboard ---------------

const FLOOR = 2; // height of the flat ground in every test island
const DT = 1 / 60;

/** Keys the test is holding or tapping, and a walking direction in world terms. */
class Pad implements Controls {
  down = new Set<string>();
  tapped = new Set<string>();
  /** Walk direction on the ground plane: x is east, z is south. */
  dir = { x: 0, z: 0 };

  held(code: string): boolean {
    return this.down.has(code) || this.tapped.has(code);
  }
  hit(code: string): boolean {
    return this.tapped.has(code);
  }
  move(): { x: number; y: number } {
    // The inverse of the camera mapping in Player.moveAround.
    return { x: (this.dir.x + this.dir.z) * Math.SQRT1_2, y: (this.dir.x - this.dir.z) * Math.SQRT1_2 };
  }
  anyMoveHit(): boolean {
    return false;
  }
}

/** Flat ground 100 by 30, with `extra` shaping it further and `trees` standing on it. */
function island(extra: (t: Parameters<Island['build']>[0]) => void = () => {}, trees: TreeSpot[] = []): Island {
  return {
    id: 'test',
    name: 'Test',
    build(t) {
      t.rect(0, 0, 100, 30, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
      extra(t);
      return { spawn: { x: 2.5, z: 15.5 }, trees };
    },
  };
}

/** A ledge `h` high that starts at tile `from` and runs on east. */
const ledge =
  (from: number, h: number) =>
  (t: Parameters<Island['build']>[0]): void =>
    t.rect(from, 0, 100, 30, (i, j) => t.set(i, j, FLOOR + h, Kind.Stone));

class Rig {
  readonly world: World;
  readonly player: Player;
  readonly pad = new Pad();

  constructor(form: FormId, isl: Island, start = { x: 6.5, z: 15.5 }) {
    this.world = new World([isl]);
    this.player = new Player(this.world, new Particles(), {
      onFell: () => {},
      onDied: () => {},
      onAte: () => {},
      onHome: () => {},
    });
    const index = FORMS.findIndex((f) => f.id === form);
    this.player.level = FORMS[index].level;
    if (index !== 0) expect(this.player.shiftTo(index)).toBe(true);
    this.player.hearts = this.player.form.maxHearts;
    this.player.place(start.x, start.z);
  }

  frame(): void {
    this.player.update(DT, this.pad, []);
    this.pad.tapped.clear();
  }

  /** Run until `done` is true, for at most `max` frames. Returns whether it got there. */
  until(done: () => boolean, max = 600): boolean {
    for (let n = 0; n < max; n++) {
      if (done()) return true;
      this.frame();
    }
    return done();
  }

  frames(n: number): void {
    for (let k = 0; k < n; k++) this.frame();
  }

  /**
   * Walk east, hopping every time we are on the ground (and holding Space
   * throughout). Returns the highest ground we stood on.
   */
  hopEast(max = 600): number {
    this.pad.dir = { x: 1, z: 0 };
    this.pad.down.add('Space');
    let best = -Infinity;
    for (let n = 0; n < max; n++) {
      if (this.player.onGround) {
        this.pad.tapped.add('Space');
        best = Math.max(best, this.player.pos.y);
      }
      this.frame();
    }
    return best;
  }

  get tile(): { i: number; j: number } {
    return { i: Math.floor(this.player.pos.x), j: Math.floor(this.player.pos.z) };
  }
}

/** Can this form get up onto a ledge `h` high that starts at tile 10? */
function getsOnto(form: FormId, h: number): boolean {
  const rig = new Rig(form, island(ledge(10, h)));
  return rig.hopEast() > FLOOR + h - 1e-6;
}

const great = (x: number): TreeSpot => ({ x: x + 0.5, z: 15.5, kind: 'great' });
const regular = (x: number): TreeSpot => ({ x: x + 0.5, z: 15.5, kind: 'regular' });

/** Push east until the orangutan has grabbed a trunk. */
function pushIntoTree(rig: Rig): void {
  rig.pad.dir = { x: 1, z: 0 };
  expect(rig.until(() => rig.player.climbing)).toBe(true);
}

/** Let go of the stick and let the climb finish. */
function finishClimb(rig: Rig): void {
  rig.pad.dir = { x: 0, z: 0 };
  expect(rig.until(() => !rig.player.climbing && rig.player.onGround)).toBe(true);
}

describe('Shifting', () => {
  it('lets go of a trunk mid-climb', () => {
    const rig = new Rig('orangutan', island(() => {}, [great(10)]));
    rig.player.level = 3;
    pushIntoTree(rig);
    rig.frames(10);
    expect(rig.player.climbing).toBe(true);
    rig.player.shiftTo(3);
    expect(rig.player.climbing).toBe(false);
    rig.pad.dir = { x: 0, z: 0 };
    rig.frames(120);
    expect(rig.player.pos.y).toBeCloseTo(FLOOR, 6);
  });
});

describe('Human', () => {
  it('jumps onto a ledge 1 high but not 2', () => {
    expect(getsOnto('human', 1)).toBe(true);
    expect(getsOnto('human', 2)).toBe(false);
  });
});

describe('Fairy', () => {
  it('flies onto a ledge 3 high but not 4', () => {
    expect(getsOnto('fairy', 3)).toBe(true);
    expect(getsOnto('fairy', 4)).toBe(false);
  });

  it('cannot get onto a regular tree from flat ground', () => {
    const rig = new Rig('fairy', island(() => {}, [regular(10)]));
    rig.hopEast();
    expect(rig.tile.i).toBeLessThan(10);
  });
});

describe('Orangutan', () => {
  it('climbs a great tree to exactly its top and stands on it', () => {
    const rig = new Rig('orangutan', island(() => {}, [great(10)]));
    pushIntoTree(rig);
    expect(rig.player.treesClimbed).toBe(1);
    finishClimb(rig);
    expect(rig.player.pos.y).toBeCloseTo(FLOOR + 5, 6);
    expect(rig.tile).toEqual({ i: 10, j: 15 });
    expect(rig.player.pos.x).toBeCloseTo(10.5, 6);
  });

  it('does not grab a trunk it only brushes past', () => {
    const rig = new Rig('orangutan', island(() => {}, [great(10)]), { x: 9.0, z: 20.5 });
    rig.pad.dir = { x: 0, z: -1 };
    rig.frames(10);
    // Walking north along the trunk's side for a few frames: no climb.
    rig.pad.dir = { x: 1, z: 0 };
    rig.frames(5);
    expect(rig.player.climbing).toBe(false);
  });

  it('lets go when steered away from the trunk', () => {
    const rig = new Rig('orangutan', island(() => {}, [great(10)]));
    pushIntoTree(rig);
    rig.frames(20);
    expect(rig.player.climbing).toBe(true);
    rig.pad.dir = { x: -1, z: 0 };
    rig.frames(2);
    expect(rig.player.climbing).toBe(false);
    rig.frames(120);
    expect(rig.player.pos.y).toBeCloseTo(FLOOR, 6);
  });

  it('jumps from one great treetop to a second one two empty tiles away', () => {
    const rig = new Rig('orangutan', island(() => {}, [great(10), great(13)]));
    pushIntoTree(rig);
    finishClimb(rig);
    // Run east and jump just before the edge, then stop when we land.
    rig.pad.dir = { x: 1, z: 0 };
    rig.until(() => rig.player.pos.x > 11.2);
    rig.pad.tapped.add('Space');
    rig.frame();
    expect(rig.until(() => rig.player.onGround)).toBe(true);
    rig.pad.dir = { x: 0, z: 0 };
    rig.frames(30);
    expect(rig.tile.i).toBe(13);
    expect(rig.player.pos.y).toBeCloseTo(FLOOR + 5, 6);
  });

  it('jumps from a great treetop onto a ledge 6 high one empty tile away', () => {
    const rig = new Rig('orangutan', island(ledge(12, 6), [great(10)]));
    pushIntoTree(rig);
    finishClimb(rig);
    rig.pad.dir = { x: 1, z: 0 };
    rig.until(() => rig.player.pos.x > 11.2);
    rig.pad.tapped.add('Space');
    rig.frames(120);
    expect(rig.player.pos.x).toBeGreaterThan(12.3);
    expect(rig.player.pos.y).toBeCloseTo(FLOOR + 6, 6);
  });

  it('counts each new tree, and starts again after touching the ground', () => {
    // A regular tree at 10 and a great one right behind it.
    const rig = new Rig('orangutan', island(() => {}, [regular(10), great(11)]));
    pushIntoTree(rig);
    expect(rig.player.treesClimbed).toBe(1);
    finishClimb(rig);
    pushIntoTree(rig);
    expect(rig.player.treesClimbed).toBe(2);
    finishClimb(rig);
    expect(rig.player.meter!.label).toBe('Climbing: 18 trees left');
    // Back down: onto the lower tree, which is not the ground...
    rig.pad.dir = { x: -1, z: 0 };
    rig.until(() => rig.tile.i === 10 && rig.player.onGround);
    expect(rig.player.treesClimbed).toBe(2);
    // ...and then off it, onto the ground.
    rig.until(() => rig.tile.i === 8 && rig.player.onGround);
    expect(rig.player.treesClimbed).toBe(0);
    expect(rig.player.meter!.label).toBe('Climbing: 20 trees left');
  });

  it('refuses the 21st tree in a row', () => {
    // A regular tree, then a great tree every third tile with regular ones
    // between: each great tree is a step up from the one before it, and the
    // regular ones are wide enough to come down onto without touching the ground.
    const trees: TreeSpot[] = [regular(10)];
    for (let k = 0; k < 21; k++) trees.push(great(11 + 3 * k), regular(12 + 3 * k), regular(13 + 3 * k));
    const rig = new Rig('orangutan', island(() => {}, trees));
    rig.pad.dir = { x: 1, z: 0 };
    rig.frames(4000);
    expect(rig.player.treesClimbed).toBe(20);
    expect(rig.player.climbing).toBe(false);
    // Stuck on a lower tree in front of the 21st, which is a great one.
    const stuck = rig.tile.i;
    expect(rig.world.treeAt(stuck + 0.5, 15.5)).toBe(4);
    expect(rig.world.treeAt(stuck + 1.5, 15.5)).toBe(5);
    expect(rig.player.pos.y).toBeCloseTo(FLOOR + 4, 6);
    expect(rig.player.meter).toMatchObject({ label: 'Too tired to climb - touch the ground', tired: true });
    rig.frames(120);
    expect(rig.tile.i).toBe(stuck);
  });
});

describe('Bunny', () => {
  it('hops onto a ledge 4 high with Space held, but not 5', () => {
    expect(getsOnto('bunny', 4)).toBe(true);
    expect(getsOnto('bunny', 5)).toBe(false);
  });

  it('hops only a little on a tap', () => {
    // A one-frame tap is the smallest hop there is; a quick tap of a few
    // frames is still enough to get up a ledge 1 high.
    const peak = (heldFrames: number): number => {
      const rig = new Rig('bunny', island());
      rig.pad.tapped.add('Space');
      let top = 0;
      for (let n = 0; n < 90; n++) {
        if (n > 0 && n < heldFrames) rig.pad.down.add('Space');
        else rig.pad.down.delete('Space');
        rig.frame();
        top = Math.max(top, rig.player.pos.y - FLOOR);
      }
      return top;
    };
    expect(peak(1)).toBeGreaterThan(0.3);
    expect(peak(1)).toBeLessThan(2);
    expect(peak(4)).toBeGreaterThan(1 - 0.35);
    expect(peak(4)).toBeLessThan(2);
  });
});

// ---- the Winter Wolf and thin ice --------------------------------------

/**
 * A start bank (tiles 0 to 9) and a far bank (24 on) with a 14-tile bridge of
 * thin ice between them, tiles 10 to 23. Over 'sky' the bridge hangs in the
 * air; over 'water' there is a pond bed 1.5 high under it. With a `slope` the
 * bridge climbs that much per tile and the far bank is a step above its end.
 */
function iceBridge(over: 'sky' | 'water', slope = 0): Island {
  const top = (i: number): number => FLOOR + slope * (i - 9);
  return {
    id: 'bridge',
    name: 'Bridge',
    build(t) {
      t.rect(0, 10, 9, 20, (i, j) => t.set(i, j, FLOOR, Kind.Snow));
      t.rect(24, 10, 40, 20, (i, j) => t.set(i, j, top(23) + slope, Kind.Snow));
      t.rect(10, 10, 23, 20, (i, j) => {
        if (over === 'water') {
          t.set(i, j, 1.5, Kind.Sand);
          t.setWater(i, j, true);
        }
        t.setThinIce(i, j, top(i));
      });
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

const ICE_START = { x: 6.5, z: 15.5 };
const east = { x: 1, z: 0 };

describe('Winter Wolf', () => {
  it('is the fastest form so far, and unlocks at level 4', () => {
    expect(FORMS.find((f) => f.id === 'wolf')!.speed).toBe(7);
    expect(FORMS.filter((f) => f.playable && f.id !== 'wolf' && f.id !== 'cheetah').every((f) => f.speed < ICE_SPEED)).toBe(true);
    const world = new World([island()]);
    const player = new Player(world, new Particles(), { onFell: () => {}, onDied: () => {}, onAte: () => {}, onHome: () => {} });
    player.level = 3;
    expect(player.canShiftTo(4)).toBe('locked');
    player.level = 4;
    expect(player.canShiftTo(4)).toBe('ok');
    expect(player.shiftTo(4)).toBe(true);
    expect(player.form.id).toBe('wolf');
  });

  it('really runs 7 tiles a second', () => {
    const rig = new Rig('wolf', island());
    rig.pad.dir = east;
    rig.frames(60);
    expect(rig.player.pos.x - 6.5).toBeCloseTo(7, 1);
  });
});

describe('Thin ice', () => {
  it('holds a running wolf across 14 tiles over sky', () => {
    const rig = new Rig('wolf', iceBridge('sky'), ICE_START);
    rig.pad.dir = east;
    expect(rig.until(() => rig.player.pos.x > 27)).toBe(true);
    expect(rig.player.pos.y).toBe(FLOOR);
    expect(rig.player.onGround).toBe(true);
    for (let i = 10; i < 24; i++) expect(rig.world.isIceIntact(i + 0.5, 15.5), `tile ${i}`).toBe(true);
    expect(rig.player.iceRun).toBeGreaterThan(12);
  });

  it('holds a running wolf across 14 tiles over water, with no swimming', () => {
    const rig = new Rig('wolf', iceBridge('water'), ICE_START);
    rig.pad.dir = east;
    let swam = false;
    expect(
      rig.until(() => {
        swam = swam || rig.player.swimming;
        return rig.player.pos.x > 27;
      }),
    ).toBe(true);
    expect(swam).toBe(false);
    expect(rig.player.pos.y).toBe(FLOOR);
  });

  it('lets a wolf run up a ramp of 0.25 a tile, like stairs', () => {
    const rig = new Rig('wolf', iceBridge('sky', 0.25), ICE_START);
    rig.pad.dir = east;
    expect(rig.until(() => rig.player.pos.x > 27)).toBe(true);
    expect(rig.player.pos.y).toBeCloseTo(FLOOR + 0.25 * 15, 6);
    expect(rig.world.isIceIntact(23.5, 15.5)).toBe(true);
  });

  it('gives way under a human, orangutan, bunny and fairy on the first tile, over sky', () => {
    for (const form of ['human', 'orangutan', 'bunny', 'fairy'] as const) {
      const rig = new Rig(form, iceBridge('sky'), ICE_START);
      rig.pad.dir = east;
      expect(rig.until(() => !rig.world.isIceIntact(10.5, 15.5), 120), form).toBe(true);
      expect(rig.player.pos.x, form).toBeLessThan(11);
      expect(rig.player.onGround, form).toBe(false);
      if (form !== 'fairy') {
        expect(rig.until(() => rig.player.pos.y < FLOOR - 3), form).toBe(true);
      }
    }
  });

  it('leaves them swimming over water', () => {
    for (const form of ['human', 'orangutan', 'bunny', 'fairy'] as const) {
      const rig = new Rig(form, iceBridge('water'), ICE_START);
      rig.pad.dir = east;
      expect(rig.until(() => !rig.world.isIceIntact(10.5, 15.5), 120), form).toBe(true);
      // Keep walking: she steps onto the next tile and drops in too.
      rig.frames(120);
      rig.pad.dir = { x: 0, z: 0 };
      rig.frames(30);
      expect(rig.player.swimming, form).toBe(true);
      expect(rig.player.pos.y, form).toBeLessThan(rig.world.waterLevel);
    }
  });

  it('lets a fairy that dropped through flap away from the height she fell from', () => {
    const rig = new Rig('fairy', iceBridge('sky'), ICE_START);
    rig.pad.dir = east;
    expect(rig.until(() => !rig.world.isIceIntact(10.5, 15.5), 120)).toBe(true);
    rig.pad.down.add('Space');
    let peak = -Infinity;
    for (let n = 0; n < 60; n++) {
      rig.frame();
      peak = Math.max(peak, rig.player.pos.y);
    }
    expect(peak).toBeGreaterThan(FLOOR);
    expect(rig.player.pos.y).toBeGreaterThan(FLOOR + 1);
  });

  it('breaks under a wolf that stops, after the stumble allowance', () => {
    const rig = new Rig('wolf', iceBridge('sky'), ICE_START);
    rig.pad.dir = east;
    expect(rig.until(() => rig.player.pos.x > 14)).toBe(true);
    rig.pad.dir = { x: 0, z: 0 };
    const stumble = Math.floor(ICE_STUMBLE / DT);
    rig.frames(stumble - 1);
    expect(rig.world.isIceIntact(14.5, 15.5)).toBe(true);
    expect(rig.until(() => !rig.world.isIceIntact(14.5, 15.5), 12)).toBe(true);
    expect(rig.player.onGround).toBe(false);
  });

  it('survives a single slow frame', () => {
    const rig = new Rig('wolf', iceBridge('sky'), ICE_START);
    rig.pad.dir = east;
    expect(rig.until(() => rig.player.pos.x > 14)).toBe(true);
    rig.pad.dir = { x: 0, z: 0 };
    rig.frame();
    rig.pad.dir = east;
    expect(rig.until(() => rig.player.pos.x > 27)).toBe(true);
    expect(rig.player.pos.y).toBe(FLOOR);
  });

  it('does not let a bunny skip across by hopping again at every landing', () => {
    const rig = new Rig('bunny', iceBridge('sky'), ICE_START);
    rig.pad.dir = east;
    rig.pad.down.add('Space');
    let brokeOnLanding = false;
    let reached = false;
    for (let n = 0; n < 900; n++) {
      if (rig.player.onGround) rig.pad.tapped.add('Space');
      const wasAir = !rig.player.onGround;
      rig.frame();
      const broken = [...Array(14).keys()].some((k) => !rig.world.isIceIntact(10.5 + k, 15.5));
      if (broken && wasAir && !brokeOnLanding) {
        brokeOnLanding = true;
        // The tile went from under her in the same frame she touched it.
        expect(rig.player.onGround).toBe(false);
      }
      if (rig.player.pos.x > 25 && rig.player.pos.y > FLOOR - 0.5) reached = true;
    }
    expect(brokeOnLanding).toBe(true);
    expect(reached).toBe(false);
  });

  it('grows back after ICE_REGROW, but not while the player is in its column, and all at once on resetIce', () => {
    const rig = new Rig('human', iceBridge('water'), ICE_START);
    rig.pad.dir = east;
    expect(rig.until(() => rig.player.swimming, 240)).toBe(true);
    rig.pad.dir = { x: 0, z: 0 };
    // Treading water in a column: still broken well after the regrowth time.
    const here = { x: rig.player.pos.x, z: rig.player.pos.z };
    rig.frames(Math.round((ICE_REGROW + 2) / DT));
    expect(rig.player.swimming).toBe(true);
    expect(rig.world.isIceIntact(here.x, here.z)).toBe(false);
    // Swim back to the bank, and it grows back as soon as she is clear.
    rig.pad.dir = { x: -1, z: 0 };
    expect(rig.until(() => rig.world.isIceIntact(here.x, here.z), 600)).toBe(true);
    expect(rig.player.pos.x + 0.3).toBeLessThan(Math.floor(here.x) + 0.01);

    // And it takes ICE_REGROW when nobody is near.
    const s = rig.world;
    s.breakIce([{ x: 20.5, z: 15.5 }]);
    rig.pad.dir = { x: 0, z: 0 };
    rig.frames(Math.round((ICE_REGROW - 0.5) / DT));
    expect(s.isIceIntact(20.5, 15.5)).toBe(false);
    rig.frames(Math.round(1 / DT));
    expect(s.isIceIntact(20.5, 15.5)).toBe(true);

    s.breakIce([{ x: 21.5, z: 15.5 }, { x: 22.5, z: 15.5 }]);
    s.resetIce();
    expect(s.isIceIntact(21.5, 15.5) && s.isIceIntact(22.5, 15.5)).toBe(true);
  });

  it('lets a wolf jump over and onto thin ice, and keeps its speed on landing', () => {
    const rig = new Rig('wolf', iceBridge('sky'), ICE_START);
    rig.pad.dir = east;
    // Hop all the way across: airborne is fine, and every landing keeps steering.
    for (let n = 0; n < 600 && rig.player.pos.x < 27; n++) {
      if (rig.player.onGround) rig.pad.tapped.add('Space');
      rig.frame();
    }
    expect(rig.player.pos.x).toBeGreaterThan(27);
    expect(rig.until(() => rig.player.onGround)).toBe(true);
    expect(rig.player.pos.y).toBe(FLOOR);
  });
});

// ---- a high pond ---------------------------------------------------------

const SHORE = 15;
const LEVEL = 14.7;

/**
 * A bank (tiles 0-19) and a far bank (40 on) at height 15, with a pond between
 * (20-39): bed 12.5, surface 14.7. With `ice` there is a sheet of thin ice at
 * 15 over the whole pond.
 */
function highPond(ice: boolean): Island {
  return {
    id: 'pond',
    name: 'Pond',
    build(t) {
      t.rect(0, 10, 19, 20, (i, j) => t.set(i, j, SHORE, Kind.Snow));
      t.rect(40, 10, 60, 20, (i, j) => t.set(i, j, SHORE, Kind.Snow));
      t.rect(20, 10, 39, 20, (i, j) => {
        t.set(i, j, 12.5, Kind.Sand);
        t.setWater(i, j, true, LEVEL);
        if (ice) t.setThinIce(i, j, SHORE);
      });
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

describe('Water at its own height', () => {
  it('floats a human at 13.9, and lets them jump out onto the shore', () => {
    const rig = new Rig('human', highPond(false), { x: 17.5, z: 15.5 });
    expect(rig.world.waterLevelAt(25.5, 15.5)).toBe(LEVEL);
    rig.pad.dir = east;
    expect(rig.until(() => rig.player.swimming, 240)).toBe(true);
    rig.pad.dir = { x: 0, z: 0 };
    rig.frames(30);
    expect(rig.player.pos.y).toBeCloseTo(LEVEL - 0.8, 6);
    // Back to the shore: jump at the bank, pressing on.
    rig.pad.dir = { x: -1, z: 0 };
    let out = false;
    for (let n = 0; n < 600 && !out; n++) {
      if (rig.player.onGround) rig.pad.tapped.add('Space');
      rig.frame();
      out = rig.player.pos.y >= SHORE - 1e-6 && rig.player.onGround && !rig.player.swimming;
    }
    expect(out).toBe(true);
  });

  it('floats a fairy at 14.45, and she can take off from it', () => {
    const rig = new Rig('fairy', highPond(false), { x: 17.5, z: 15.5 });
    rig.pad.dir = east;
    expect(rig.until(() => rig.player.swimming, 240)).toBe(true);
    rig.pad.dir = { x: 0, z: 0 };
    rig.frames(30);
    expect(rig.player.pos.y).toBeCloseTo(LEVEL - 0.25, 6);
    rig.pad.down.add('Space');
    rig.frames(30);
    expect(rig.player.pos.y).toBeGreaterThan(LEVEL + 0.5);
  });

  it('drops a human through thin ice over it, to swim at 13.9', () => {
    const rig = new Rig('human', highPond(true), { x: 17.5, z: 15.5 });
    rig.pad.dir = east;
    expect(rig.until(() => !rig.world.isIceIntact(20.5, 15.5), 120)).toBe(true);
    rig.frames(120);
    rig.pad.dir = { x: 0, z: 0 };
    rig.frames(30);
    expect(rig.player.swimming).toBe(true);
    expect(rig.player.pos.y).toBeCloseTo(LEVEL - 0.8, 6);
  });

  it('lets a wolf run across the ice over it', () => {
    const rig = new Rig('wolf', highPond(true), { x: 17.5, z: 15.5 });
    rig.pad.dir = east;
    expect(rig.until(() => rig.player.pos.x > 42, 600)).toBe(true);
    expect(rig.player.pos.y).toBe(SHORE);
    expect(rig.player.swimming).toBe(false);
  });
});

// ---- root tangles --------------------------------------------------------

/** A wall of tangle 3 tiles thick (tiles 20-22) across every row. */
const tangleWall = (t: Parameters<Island['build']>[0]): void =>
  t.rect(20, 0, 22, 30, (i, j) => t.setTangle(i, j));

describe('Root tangles', () => {
  it('let the Ant walk through a 3-tile corridor, and stop a Human', () => {
    const ant = new Rig('ant', island(tangleWall));
    ant.pad.dir = east;
    expect(ant.until(() => ant.player.pos.x > 24)).toBe(true);
    expect(ant.player.pos.y).toBe(FLOOR);

    const human = new Rig('human', island(tangleWall));
    human.pad.dir = east;
    human.frames(600);
    expect(human.player.pos.x).toBeLessThan(20 - 0.3 + 1e-6);
  });

  it('cannot be flown over by a Fairy, or hopped, or landed on by a Bunny', () => {
    const fairy = new Rig('fairy', island(tangleWall));
    fairy.pad.dir = east;
    fairy.pad.down.add('Space');
    fairy.frames(900);
    expect(fairy.player.pos.x).toBeLessThan(20);

    const bunny = new Rig('bunny', island(tangleWall));
    bunny.hopEast(900);
    expect(bunny.player.pos.x).toBeLessThan(20);

    const pilot = new Pilot(new World([island(tangleWall)]), 'bunny', { x: 10.5, z: 15.5 });
    expect(pilot.hopThenFly({ x: 25.5, z: 15.5 })).toBe(false);
    expect(pilot.x).toBeLessThan(20);
    // A pilot can also be an Ant and walk over the tangle.
    const walker = new Pilot(new World([island(tangleWall)]), 'ant', { x: 10.5, z: 15.5 });
    expect(walker.walk({ x: 25.5, z: 15.5 }, { seconds: 20 })).toBe(true);
  });

  it('keep the Ant from jumping, and from shifting, until it is fully out', () => {
    const rig = new Rig('ant', island(tangleWall), { x: 21.5, z: 15.5 });
    const human = FORMS.findIndex((f) => f.id === 'human');
    rig.pad.tapped.add('Space');
    rig.frames(30);
    expect(rig.player.pos.y).toBe(FLOOR);
    expect(rig.player.onGround).toBe(true);
    expect(rig.player.canShiftTo(human)).toBe('cramped');
    expect(rig.player.shiftTo(human)).toBe(false);

    // Out on the west side: still cramped while any corner touches the tangle.
    rig.pad.dir = { x: -1, z: 0 };
    expect(rig.until(() => rig.player.pos.x < 20 + 0.3 - 0.01 && rig.player.pos.x > 19.9)).toBe(true);
    expect(rig.player.canShiftTo(human)).toBe('cramped');
    expect(rig.until(() => !rig.player.inTangle)).toBe(true);
    rig.pad.dir = { x: 0, z: 0 };
    expect(rig.player.canShiftTo(human)).toBe('ok');
    rig.pad.tapped.add('Space');
    rig.frame();
    expect(rig.player.pos.y).toBeGreaterThan(FLOOR);
    expect(rig.player.shiftTo(human)).toBe(true);
  });

  it('leave the Ant a slow walker and a Human-like jumper elsewhere', () => {
    const ant = FORMS.find((f) => f.id === 'ant')!;
    expect(ant.speed).toBeLessThan(ICE_SPEED);
    expect(ant.jump).toBe(FORMS[0].jump);
  });

  it('unlocks the Ant at level 5, the form after the Wolf', () => {
    const idx = FORMS.findIndex((f) => f.id === 'ant');
    expect(FORMS[idx].level).toBe(5);
    const player = new Player(new World([island()]), new Particles(), { onFell: () => {}, onDied: () => {}, onAte: () => {}, onHome: () => {} });
    player.level = 4;
    expect(player.canShiftTo(idx)).toBe('locked');
    player.level = 5;
    expect(player.canShiftTo(idx)).toBe('ok');
  });
});

// ---- water: diving, the Mermaid and kelp ---------------------------------

const WATER = 2.7; // the default water level
const BANK = 3; // a bank 0.3 above it
const WEST = { x: -1, z: 0 };
const EAST = { x: 1, z: 0 };

/**
 * Banks at BANK with a lake cut into them (tiles 10 to 49 by rows 5 to 25),
 * `depth` deep, `shape` adding to it.
 */
function lake(depth: number, shape: (t: Parameters<Island['build']>[0]) => void = () => {}): Island {
  return {
    id: 'lake',
    name: 'Lake',
    build(t) {
      t.rect(0, 0, 70, 30, (i, j) => t.set(i, j, BANK, Kind.Grass));
      t.rect(10, 5, 49, 25, (i, j) => {
        t.set(i, j, WATER - depth, Kind.Sand);
        t.setWater(i, j, true);
      });
      shape(t);
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

const IN_LAKE = { x: 14.5, z: 15.5 };
const formIndex = (id: FormId): number => FORMS.findIndex((f) => f.id === id);
const floatOf = (form: FormId): number => WATER - (form === 'fairy' ? 0.25 : 0.8);

describe('Diving', () => {
  it('takes a Human down exactly 4 below the surface in a pool 6 deep, and back up on letting go', () => {
    const rig = new Rig('human', lake(6), IN_LAKE);
    expect(rig.player.pos.y).toBeCloseTo(floatOf('human'), 9);
    rig.pad.down.add('ShiftRight');
    expect(rig.until(() => rig.player.submerged)).toBe(true);
    expect(rig.player.swimming).toBe(true);
    expect(rig.player.onGround).toBe(false);
    rig.frames(120);
    expect(rig.player.pos.y).toBeCloseTo(WATER - 4, 5);
    rig.pad.down.delete('ShiftRight');
    rig.frames(120);
    expect(rig.player.pos.y).toBeCloseTo(floatOf('human'), 9);
    expect(rig.player.submerged).toBe(false);
    expect(rig.player.onGround).toBe(true);
  });

  it('stops a Human on a bed 3 deep at the bed', () => {
    const rig = new Rig('human', lake(3), IN_LAKE);
    rig.pad.down.add('ShiftLeft');
    rig.frames(120);
    expect(rig.player.pos.y).toBeCloseTo(WATER - 3, 5);
  });

  it('lets the Human use a thing on a bed 4 deep only when dived', () => {
    // Pool 6 deep with a stretch of bed 4 deep on the east side.
    const world = new World([lake(6, (t) => t.rect(20, 5, 49, 25, (i, j) => t.set(i, j, WATER - 4, Kind.Sand)))]);
    const thing = { x: 25.5, z: 15.5 };
    const pilot = new Pilot(world, 'human', IN_LAKE);
    expect(pilot.swim({ x: 23.5, z: 15.5 })).toBe(true);
    expect(pilot.canUse(thing)).toBe(false);
    expect(pilot.dive({ x: 23.5, z: 15.5 })).toBe(true);
    expect(pilot.y).toBeCloseTo(WATER - 4, 5);
    expect(pilot.canUse(thing)).toBe(true);
    expect(pilot.surface()).toBe(true);
    expect(pilot.canUse(thing)).toBe(false);
  });

  it('leaves every other old form at its float height with Shift held', () => {
    for (const form of ['fairy', 'orangutan', 'bunny', 'wolf', 'ant'] as const) {
      const rig = new Rig(form, lake(6), IN_LAKE);
      rig.pad.down.add('ShiftLeft');
      rig.frames(60);
      expect(rig.player.pos.y, form).toBeCloseTo(floatOf(form), 9);
      expect(rig.player.submerged, form).toBe(false);
    }
  });

  it('keeps the old swimming speeds', () => {
    for (const form of FORMS.filter((f) => ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant'].includes(f.id))) {
      expect(form.swim, form.id).toBeCloseTo(form.speed * (form.id === 'fairy' ? 0.5 : 0.55), 9);
      const rig = new Rig(form.id, lake(6), IN_LAKE);
      rig.frame();
      rig.pad.dir = EAST;
      const x = rig.player.pos.x;
      rig.frames(30);
      expect(rig.player.pos.x - x, form.id).toBeCloseTo(form.swim * 0.5, 6);
    }
  });
});

describe('Mermaid', () => {
  const swordHits = (rig: Rig): number[] => {
    const hits: number[] = [];
    const dummy = {
      pos: new THREE.Vector3(rig.player.pos.x + 1, rig.player.pos.y, rig.player.pos.z),
      alive: true,
      takeHit: (damage: number) => hits.push(damage),
    };
    rig.pad.tapped.add('KeyJ');
    for (let n = 0; n < 30; n++) {
      rig.player.update(DT, rig.pad, [dummy]);
      rig.pad.tapped.clear();
    }
    return hits;
  };

  it('is playable, dives without limit and reaches a bed 8 deep', () => {
    expect(FORMS[formIndex('mermaid')].playable).toBe(true);
    const rig = new Rig('mermaid', lake(8), IN_LAKE);
    rig.pad.down.add('ShiftLeft');
    rig.frames(120);
    expect(rig.player.pos.y).toBeCloseTo(WATER - 8, 5);
    rig.pad.down.delete('ShiftLeft');
    rig.frames(120);
    expect(rig.player.pos.y).toBeCloseTo(floatOf('mermaid'), 9);
  });

  it('swims 8 tiles a second and walks 1.2', () => {
    const rig = new Rig('mermaid', lake(6), IN_LAKE);
    rig.frame();
    rig.pad.dir = EAST;
    const x = rig.player.pos.x;
    rig.frames(30);
    expect(rig.player.pos.x - x).toBeCloseTo(4, 6);
    const land = new Rig('mermaid', lake(6), { x: 3.5, z: 15.5 });
    land.pad.dir = EAST;
    land.frames(60);
    expect(land.player.pos.x - 3.5).toBeCloseTo(1.2, 6);
  });

  it('cannot jump on land, but can jump out of the water onto a bank 0.3 above it', () => {
    const rig = new Rig('mermaid', lake(6), { x: 3.5, z: 15.5 });
    rig.pad.tapped.add('Space');
    rig.frames(30);
    expect(rig.player.pos.y).toBe(BANK);

    // At the west edge of the lake, facing the bank.
    const out = new Rig('mermaid', lake(6), { x: 10.5, z: 15.5 });
    out.frame();
    out.pad.dir = WEST;
    out.pad.tapped.add('Space');
    out.frames(120);
    expect(out.player.pos.x).toBeLessThan(10);
    expect(out.player.pos.y).toBeCloseTo(BANK, 9);
    expect(out.player.onGround).toBe(true);
  });

  it('swings the sword only while swimming, for the full damage of the tier', () => {
    expect(swordHits(new Rig('mermaid', lake(6), { x: 3.5, z: 15.5 }))).toEqual([]);
    const wet = new Rig('mermaid', lake(6), IN_LAKE);
    wet.frame();
    expect(swordHits(wet)).toEqual([4]);
  });
});

describe('Kelp', () => {
  // A band of kelp 5 tiles wide across the whole lake.
  const mat = (depth: number) => lake(8, (t) => t.rect(20, 5, 24, 25, (i, j) => t.setKelp(i, j, depth)));
  const BAND_WEST = 20 - 0.3; // the body stops this far from the mat's west edge

  const pushEast = (rig: Rig, frames = 400): number => {
    rig.pad.dir = EAST;
    rig.frames(frames);
    return rig.player.pos.x;
  };

  it('is a wall to a floating and a dived Human and to a flying Fairy', () => {
    for (const dived of [false, true]) {
      const rig = new Rig('human', mat(KELP_DEEP), IN_LAKE);
      if (dived) rig.pad.down.add('ShiftLeft');
      expect(pushEast(rig, 600), `human dived ${dived}`).toBeLessThanOrEqual(BAND_WEST + 1e-6);
    }
    const fairy = new Rig('fairy', mat(KELP_DEEP), IN_LAKE);
    fairy.pad.down.add('Space');
    expect(pushEast(fairy, 600)).toBeLessThanOrEqual(BAND_WEST + 1e-6);
  });

  it('is a wall to a hop-then-fly', () => {
    const open = lake(8, (t) => t.rect(20, 5, 24, 25, (i, j) => t.setKelp(i, j, 0)));
    const target = { x: 28.5, z: 15.5 };
    const free = new Pilot(new World([open]), 'bunny', { x: 5.5, z: 15.5 });
    expect(free.hopThenFly(target, { seconds: 30 })).toBe(true);
    const pilot = new Pilot(new World([mat(KELP_DEEP)]), 'bunny', { x: 5.5, z: 15.5 });
    expect(pilot.hopThenFly(target, { seconds: 30 })).toBe(false);
    expect(pilot.x).toBeLessThan(20);
  });

  it('lets the Mermaid swim under it, held there with no surfacing and no shifting', () => {
    const rig = new Rig('mermaid', mat(KELP_DEEP), IN_LAKE);
    const ceiling = WATER - KELP_DEEP - FORMS[formIndex('mermaid')].height;
    rig.pad.dir = EAST;
    expect(rig.until(() => rig.player.inKelp && rig.player.pos.y <= ceiling + 1e-9)).toBe(true);
    expect(rig.player.pos.y).toBeCloseTo(ceiling, 9);
    // Space does nothing: no jumping, and nothing lifts her above the mat.
    rig.pad.down.add('Space');
    rig.pad.tapped.add('Space');
    rig.frames(10);
    expect(rig.player.inKelp).toBe(true);
    expect(rig.player.pos.y).toBeCloseTo(ceiling, 9);
    expect(rig.player.canShiftTo(0)).toBe('cramped');
    expect(rig.player.shiftTo(0)).toBe(false);
    rig.pad.down.clear();
    expect(rig.until(() => rig.player.pos.x > 28, 300)).toBe(true);
    rig.pad.dir = { x: 0, z: 0 };
    rig.frames(120);
    expect(rig.player.pos.y).toBeCloseTo(floatOf('mermaid'), 9);
  });

  it('lets a Human through a low mat by ducking, and walls out everyone else', () => {
    const human = new Rig('human', mat(KELP_LOW), IN_LAKE);
    const ceiling = WATER - KELP_LOW - FORMS[0].height;
    human.pad.dir = EAST;
    expect(human.until(() => human.player.inKelp && human.player.pos.y <= ceiling + 1e-9)).toBe(true);
    expect(human.until(() => human.player.pos.x > 28, 600)).toBe(true);
    for (const form of ['wolf', 'bunny', 'fairy', 'ant', 'orangutan'] as const) {
      const rig = new Rig(form, mat(KELP_LOW), IN_LAKE);
      if (form === 'fairy') rig.pad.down.add('Space');
      expect(pushEast(rig, 600), form).toBeLessThanOrEqual(BAND_WEST + 1e-6);
    }
  });
});

describe('Pilot in water', () => {
  // A strait 3 wide and 40 long between banks, with 12 tiles of deep kelp in it.
  const strait = (): World =>
    new World([
      {
        id: 'strait',
        name: 'Strait',
        build(t) {
          t.rect(0, 0, 70, 30, (i, j) => t.set(i, j, BANK, Kind.Grass));
          t.rect(10, 14, 49, 16, (i, j) => {
            t.set(i, j, WATER - 8, Kind.Sand);
            t.setWater(i, j, true);
          });
          t.rect(20, 14, 31, 16, (i, j) => t.setKelp(i, j, KELP_DEEP));
          return { spawn: { x: 2.5, z: 15.5 } };
        },
      },
    ]);
  const far = { x: 40.5, z: 15.5 };

  it('has the Mermaid swim under the channel and come out the far side', () => {
    const pilot = new Pilot(strait(), 'mermaid', { x: 12.5, z: 15.5 });
    expect(pilot.swim(far, { under: true })).toBe(true);
    expect(pilot.surface()).toBe(true);
    expect(pilot.x).toBeGreaterThan(32);
  });

  it('keeps a Human out of it', () => {
    const pilot = new Pilot(strait(), 'human', { x: 12.5, z: 15.5 });
    expect(pilot.swim(far, { seconds: 20 })).toBe(false);
    expect(pilot.swim(far, { seconds: 20, under: true })).toBe(false);
    expect(pilot.x).toBeLessThan(20);
  });
});

// ---- the north and south edges of the grid ------------------------------

describe('the edges of the grid', () => {
  /** Ground only on the west end of a full-depth strip, so the rest is void. */
  const strip = (z0: number, z1: number): Island => ({
    id: 'strip',
    name: 'Strip',
    build(t) {
      t.rect(0, z0, 20, z1, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
      return { spawn: { x: 2.5, z: z0 + 0.5 } };
    },
  });

  it('stops a Fairy flying north at z 0.5 or south at z 63.5, inside the grid', () => {
    for (const [z, dir] of [
      [0.5, -1],
      [63.5, 1],
    ] as const) {
      const rig = new Rig('fairy', strip(0, 63), { x: 6.5, z });
      rig.pad.down.add('Space');
      rig.pad.dir = { x: 0, z: dir };
      rig.frames(120);
      expect(rig.player.pos.z, `z ${z}`).toBeGreaterThanOrEqual(0);
      expect(rig.player.pos.z, `z ${z}`).toBeLessThan(64);
    }
  });

  it('still lets a Human walk off ground at z 60 into void at z 61 and fall', () => {
    const rig = new Rig('human', strip(0, 60), { x: 6.5, z: 60.5 });
    rig.pad.dir = { x: 0, z: 1 };
    expect(rig.until(() => rig.player.pos.y < FLOOR - 3, 240)).toBe(true);
    expect(rig.player.pos.z).toBeGreaterThan(61);
    expect(rig.player.pos.z).toBeLessThan(64);
  });
});
