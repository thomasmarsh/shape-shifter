import { describe, expect, it } from 'vitest';
import { FORMS, FormId } from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
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
