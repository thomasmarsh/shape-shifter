import { describe, expect, it } from 'vitest';
import { Arrows } from '../arrows';
import { Enemy } from '../enemy';
import { FORMS, FormId } from '../forms';
import type { Controls } from '../input';
import { Particles } from '../particles';
import { Pilot } from '../pilot';
import { Player } from '../player';
import { World } from '../world';

// The filled hubs with real physics: a real Player, the real blades, the real ground.

const world = new World();
const DT = 1 / 60;
type P = { x: number; z: number };
const at = (x: number, z: number): P => ({ x, z });
const dist = (a: P, b: P): number => Math.hypot(a.x - b.x, a.z - b.z);

class Pad implements Controls {
  down = new Set<string>();
  tapped = new Set<string>();
  dir = { x: 0, z: 0 };
  held(code: string): boolean {
    return this.down.has(code) || this.tapped.has(code);
  }
  hit(code: string): boolean {
    return this.tapped.has(code);
  }
  move(): { x: number; y: number } {
    return { x: (this.dir.x + this.dir.z) * Math.SQRT1_2, y: (this.dir.x - this.dir.z) * Math.SQRT1_2 };
  }
  anyMoveHit(): boolean {
    return false;
  }
}

class Rig {
  readonly player: Player;
  readonly pad = new Pad();
  readonly arrows: Arrows;
  readonly all: Enemy[] = [];
  time = 0;
  /** The hearts at the start, and the first time a heart was lost (or null). */
  maxHearts: number;
  firstHit: number | null = null;
  closest = Infinity;
  /** The first time a blade was within its reach (1.4) of the player, or null. */
  firstClose: number | null = null;

  constructor(form: FormId, level: number, start: P, spots: P[]) {
    const particles = new Particles();
    this.player = new Player(world, particles, { onFell: () => {}, onDied: () => {}, onAte: () => {}, onHome: () => {} });
    this.player.level = 10;
    const index = FORMS.findIndex((f) => f.id === form);
    if (index !== 0) expect(this.player.shiftTo(index)).toBe(true);
    this.player.level = level;
    this.player.hearts = this.player.form.maxHearts;
    this.maxHearts = this.player.hearts;
    this.player.place(start.x, start.z);
    this.arrows = new Arrows(world, particles);
    for (const s of spots) {
      const spot = world.layout.enemies.find((e) => e.x === s.x && e.z === s.z)!;
      expect(spot, `no bad guy at ${s.x}, ${s.z}`).toBeTruthy();
      const e = new Enemy(world, particles, this.arrows, { x: spot.x, z: spot.z }, spot);
      e.wake(level);
      this.all.push(e);
    }
  }

  get p() {
    return this.player.pos;
  }

  get blades(): Enemy[] {
    return this.all.filter((e) => e.kind === 'blade');
  }

  nearestBlade(): number {
    return Math.min(...this.blades.map((b) => dist(b.pos, this.p)));
  }

  step(): void {
    this.player.update(DT, this.pad, this.all);
    for (const e of this.all) e.update(DT, this.player, this.all);
    this.arrows.update(DT, this.player);
    this.pad.tapped.clear();
    this.time += DT;
    this.closest = Math.min(this.closest, this.nearestBlade());
    if (this.firstClose === null && this.nearestBlade() < 1.4) this.firstClose = this.time;
    if (this.firstHit === null && this.player.hearts < this.maxHearts) this.firstHit = this.time;
  }

  run(seconds: number, goal: (() => P | null) | null, done: () => boolean = () => false, each: () => void = () => {}): boolean {
    for (let n = 0; n < seconds / DT; n++) {
      if (done()) return true;
      const g = goal?.() ?? null;
      const d = g ? dist(g, this.p) : 0;
      this.pad.dir = g && d > 0.08 ? { x: (g.x - this.p.x) / d, z: (g.z - this.p.z) / d } : { x: 0, z: 0 };
      each();
      this.step();
    }
    return done();
  }
}

// ---- Galecrest's east heath: the camp north of the Wind Tarn ----------------------

const CAMP = [at(1496.5, 14.5), at(1498.5, 16.5)];
const TARN = { i0: 1490, j0: 20, i1: 1499, j1: 26 };
const inTarn = (x: number, z: number): boolean => x >= TARN.i0 && x < TARN.i1 + 1 && z >= TARN.j0 && z < TARN.j1 + 1;
// A noticed runner heads south-east across open heath (no pond, dell or thicket on the line).
const START = at(1502.5, 19.5);
const FAR = at(1528.5, 40.5);

const runAway = (form: FormId, level: number, seconds: number, start: P, stopWhenClose = false): Rig => {
  const r = new Rig(form, level, start, CAMP);
  let stopped = false;
  r.run(seconds, () => (stopped ? null : FAR), () => r.firstHit !== null, () => {
    if (stopWhenClose && r.firstClose !== null) stopped = true;
  });
  return r;
};
const HOME = CAMP[1];
/** A start `d` tiles from the nearer blade's post, on the line to FAR. */
const startAt = (d: number): P => {
  const L = dist(HOME, FAR);
  return at(HOME.x + ((FAR.x - HOME.x) / L) * d, HOME.z + ((FAR.z - HOME.z) / L) * d);
};

// A blade chases at 8.5, keeps running through its 0.4 s wind-up and follows 60 tiles from its
// post, so running away does not dodge the blow: only the Cheetah (10) gets away. It still gives
// up on a runner 11 tiles off. (First measured with a stand-still wind-up and a 14 tile leash: a
// Wolf or a Human who kept running was never hit.)
describe('Galecrest: the camp blades against a runner on open heath', () => {
  it('get within reach of a level 9 Wolf running straight away from 3 tiles, and hit it the moment it stops', () => {
    const r = runAway('wolf', 9, 6, startAt(3), true);
    expect(r.firstClose).not.toBeNull();
    expect(r.firstClose!).toBeLessThan(2);
    expect(r.firstHit).not.toBeNull();
    expect(r.firstHit! - r.firstClose!).toBeLessThan(1);
    expect(r.player.hearts).toBe(r.maxHearts - 2);
  });

  it('hit a level 9 Wolf that keeps running: the blow is struck on the run', () => {
    const r = runAway('wolf', 9, 6, startAt(3));
    expect(r.firstClose).not.toBeNull();
    expect(r.firstHit).not.toBeNull();
    expect(r.firstHit!).toBeLessThan(3);
    expect(r.player.hearts).toBe(r.maxHearts - 2);
  });

  it('do not catch a fresh Cheetah noticed at 5 tiles: it gains about 1.5 tiles a second, and after 3 s it is past the notice distance with no heart lost', () => {
    const r = runAway('cheetah', 9, 3, START);
    expect(r.player.hearts).toBe(r.maxHearts);
    expect(r.closest).toBeGreaterThan(4);
    expect(r.nearestBlade()).toBeGreaterThan(7.5);
  });

  it('get within reach of a Human sooner than of the Wolf from the same start, and hit it once it stops', () => {
    const wolf = runAway('wolf', 9, 8, startAt(3), true);
    const human = runAway('human', 9, 8, startAt(3), true);
    expect(human.firstClose).not.toBeNull();
    expect(wolf.firstClose).not.toBeNull();
    expect(human.firstClose!).toBeLessThan(wolf.firstClose!);
    expect(human.firstHit).not.toBeNull();
  });

  it('catch and hit a Human and a Wolf noticed at 5.5 tiles who keep running, the Human first', () => {
    const human = runAway('human', 9, 6, startAt(5.5));
    const wolf = runAway('wolf', 9, 6, startAt(5.5));
    expect(human.firstHit).not.toBeNull();
    expect(wolf.firstHit).not.toBeNull();
    expect(human.firstHit!).toBeLessThan(wolf.firstHit!);
  });
});


describe('Galecrest: the Wind Tarn, a dell and a thicket against the blades', () => {
  it('leave a Human floating in the middle of the Wind Tarn alone for 10 s: no bad guy on a water tile, no heart lost', () => {
    const r = new Rig('human', 9, at(1495.5, 22.5), [...CAMP, at(1497.5, 12.5)]);
    expect(world.isWater(r.p.x, r.p.z)).toBe(true);
    let wet = 0;
    r.run(10, null, () => false, () => {
      for (const e of r.all) if (world.isWater(e.pos.x, e.pos.z) || inTarn(e.pos.x, e.pos.z)) wet++;
    });
    expect(r.all.some((e) => e.alert), 'a bad guy noticed the swimmer').toBe(true);
    expect(wet).toBe(0);
    expect(r.player.swimming).toBe(true);
    expect(r.player.hearts).toBe(r.maxHearts);
    expect(r.closest).toBeGreaterThan(1.4);
  });

  it('follow a Human into the dell at (1486..1492, 9..14) and hit it there (the dip does not stop a blade)', () => {
    const r = new Rig('human', 9, at(1490.5, 12.5), CAMP);
    let deep = 0;
    r.run(8, null, () => false, () => {
      for (const b of r.blades) if (b.pos.x > 1486 && b.pos.x < 1493 && b.pos.z > 9 && b.pos.z < 15 && world.groundAt(b.pos.x, b.pos.z) < 11.9) deep++;
    });
    expect(deep).toBeGreaterThan(0);
    expect(r.firstHit).not.toBeNull();
    expect(r.player.hearts).toBeLessThan(r.maxHearts);
  });

  // Measured: the blade has no path-finding. It pushes against the thicket (x 1502..1504, z 12..15)
  // and never gets round it in 10 s, so the Human on the far side is never touched.
  it('never enter a thicket, and push at it in vain for 10 s while a Human stands on its far side', () => {
    const r = new Rig('human', 9, at(1505.2, 14.2), [CAMP[1]]);
    let onTangle = 0;
    const woke = r.run(10, null, () => false, () => {
      for (const b of r.blades) if (world.isTangle(b.pos.x, b.pos.z)) onTangle++;
    });
    expect(woke).toBe(false);
    expect(onTangle).toBe(0);
    expect(r.firstClose).toBeNull();
    expect(r.player.hearts).toBe(r.maxHearts);
  });
});

describe('the ponds and dells are walkable', () => {
  const ponds = [
    { name: "Galecrest's North Tarn", from: at(1515.5, 8.5), bank: at(1521.5, 8.5) },
    { name: "Hollowfen's Long Mere", from: at(1289.5, 12.5), bank: at(1289.5, 17.5) },
  ];
  for (const form of ['human', 'mermaid'] as FormId[]) {
    for (const pond of ponds) {
      it(`lets a ${form} out of ${pond.name} with a jump`, () => {
        const p = new Pilot(world, form, pond.from);
        expect(p.player.swimming || world.isWater(p.x, p.z)).toBe(true);
        expect(p.hop(pond.bank, { seconds: 12 }), p.describe()).toBe(true);
        expect(p.fell).toBe(false);
        expect(p.y).toBeCloseTo(12, 1);
      });
    }
  }

  it('does not let a Human walk out of a pond: the bank is above the water, so it takes a jump', () => {
    const p = new Pilot(world, 'human', ponds[1].from);
    expect(p.walk(ponds[1].bank, { seconds: 6 })).toBe(false);
  });

  const dells = [
    { name: "Galecrest's east dell", from: at(1484.5, 11.5), to: at(1494.5, 11.5), deep: at(1489.5, 11.5) },
    { name: "Hollowfen's east dell", from: at(1284.5, 25.5), to: at(1295.5, 25.5), deep: at(1289.5, 25.5) },
  ];
  for (const dell of dells) {
    it(`lets a Human walk into ${dell.name} and out the other side without jumping`, () => {
      const p = new Pilot(world, 'human', dell.from);
      let lowest = Infinity;
      // Pilot.walk never presses Space, so reaching the far side is a walk.
      for (const wp of [dell.deep, dell.to]) {
        expect(p.walk(wp, { seconds: 10 }), p.describe()).toBe(true);
        lowest = Math.min(lowest, p.y);
      }
      expect(lowest).toBeLessThan(12 - 0.5);
      expect(p.y).toBeCloseTo(12, 1);
    });
  }
});

// ---- Kestrel Rock -----------------------------------------------------------------

const ROCK = { x0: 1574, x1: 1582, z0: 26, z1: 34 };
const onRock = (x: number, z: number): boolean => x >= ROCK.x0 && x < ROCK.x1 + 1 && z >= ROCK.z0 && z < ROCK.z1 + 1;

/** A level 10 Human walks east off the heath's edge at x 1529.5, opens the wings and holds them; lets go at `releaseX` (never when null). */
const glideEast = (releaseX: number | null): { r: Rig; landed: P; lost: number; air: number } => {
  const r = new Rig('human', 10, at(1526.5, 30.5), []);
  let left = false;
  let lastY = r.p.y;
  let air = 0;
  let released = false;
  for (let n = 0; n < 20 / DT; n++) {
    r.pad.dir = { x: 1, z: 0 };
    if (r.player.onGround) {
      r.pad.down.delete('Space');
      if (!left && r.p.x >= 1529.5) r.pad.tapped.add('Space');
    } else {
      left = true;
      air += DT;
      if (releaseX !== null && r.p.x >= releaseX) released = true;
      if (released) r.pad.down.delete('Space');
      else if (r.player.gliding) r.pad.down.add('Space');
      else if (r.p.y < lastY) {
        r.pad.tapped.add('Space');
        r.pad.down.add('Space');
      }
    }
    lastY = r.p.y;
    r.step();
    if (left && (r.player.onGround || r.p.y < -5)) break;
  }
  return { r, landed: at(r.p.x, r.p.z), lost: r.maxHearts - r.player.hearts, air };
};

describe('Kestrel Rock', () => {
  // Measured: the wings carry a Human about 9 tiles per second while sinking 1.5 tiles a second.
  it('takes a level 10 Human who holds the wings east off the heath, lets go at x 1575 and drops onto the Rock without losing a heart', () => {
    const g = glideEast(1575);
    expect(onRock(g.landed.x, g.landed.z), `landed at ${g.landed.x}, ${g.landed.z}`).toBe(true);
    expect(g.r.p.y).toBeCloseTo(1, 1);
    expect(g.lost).toBe(0); // measured: the 4.8 tile drop costs nothing
  });

  // Measured: a Human who never lets go does NOT carry past the Rock: it comes down at x 1577.7 (the Rock is x 1574..1582).
  it('lands a Human who never lets go at x 1577.7, still on the Rock and unhurt', () => {
    const g = glideEast(null);
    expect(g.landed.x).toBeCloseTo(1577.7, 0);
    expect(onRock(g.landed.x, g.landed.z)).toBe(true);
    expect(g.lost).toBe(0);
  });

  it('drops a Human who lets go at x 1560 short of the Rock, into the void', () => {
    const g = glideEast(1560);
    expect(g.landed.x).toBeLessThan(ROCK.x0);
    expect(g.r.p.y).toBeLessThan(0);
  });
});
