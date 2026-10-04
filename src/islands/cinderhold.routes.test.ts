import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Arrows } from '../arrows';
import { Enemy } from '../enemy';
import { EEL, FORMS, FormId, WARDEN } from '../forms';
import type { Controls } from '../input';
import { Particles } from '../particles';
import { Pilot } from '../pilot';
import { Player } from '../player';
import { WaterPowers } from '../waterpowers';
import { World } from '../world';
import { BUBBLE_DAMAGE, WATER_SHOT_DAMAGE } from '../forms';
import { DEEP, RING } from './cinderhold';

// Cinderhold with real physics: a real Player (and the real bosses) in the real World.
// `shut` keeps the lid shut; `open` has dropLid() called once at the top.

const shut = new World();
const open = new World();
open.dropLid();

const DT = 1 / 60;
const at = (x: number, z: number) => ({ x, z });

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

/** A real Player and the island's real bosses, stepped together, steered by a fake keyboard. */
class Rig {
  readonly player: Player;
  readonly pad = new Pad();
  readonly arrows: Arrows;
  readonly powers: WaterPowers;
  readonly bosses: Enemy[] = [];
  time = 0;

  constructor(readonly world: World, form: FormId, start: { x: number; z: number }, kinds: ('warden' | 'eel')[]) {
    const particles = new Particles();
    this.player = new Player(world, particles, { onFell: () => {}, onDied: () => {}, onAte: () => {}, onHome: () => {} });
    this.player.level = 10;
    const index = FORMS.findIndex((f) => f.id === form);
    if (index !== 0) expect(this.player.shiftTo(index)).toBe(true);
    this.player.hearts = this.player.form.maxHearts;
    this.player.place(start.x, start.z);
    this.arrows = new Arrows(world, particles);
    for (const kind of kinds) {
      const spot = world.layout.enemies.find((e) => e.kind === kind)!;
      const boss = new Enemy(world, particles, this.arrows, { x: spot.x, z: spot.z }, spot);
      expect(boss.wake(10)).toBe(true);
      this.bosses.push(boss);
    }
    this.powers = new WaterPowers(world, particles, this.bosses);
  }

  get p(): THREE.Vector3 {
    return this.player.pos;
  }

  step(): void {
    this.player.update(DT, this.pad, this.bosses);
    for (const b of this.bosses) b.update(DT, this.player, this.bosses);
    this.arrows.update(DT, this.player);
    this.powers.update(DT, this.player, this.pad);
    this.pad.tapped.clear();
    this.time += DT;
  }

  /** Steer to a point (or stand still when null) until `done`, for at most `seconds`; true if done. */
  run(seconds: number, goal: (() => { x: number; z: number } | null) | null, done: () => boolean = () => false, each: () => void = () => {}): boolean {
    for (let n = 0; n < seconds / DT; n++) {
      if (done()) return true;
      const g = goal?.() ?? null;
      const dx = g ? g.x - this.p.x : 0;
      const dz = g ? g.z - this.p.z : 0;
      const d = Math.hypot(dx, dz);
      this.pad.dir = g && d > 0.08 ? { x: dx / d, z: dz / d } : { x: 0, z: 0 };
      each();
      this.step();
    }
    return done();
  }
}

const ringOf = (boss: Enemy): THREE.Mesh =>
  boss.group.children.find((c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.RingGeometry) as THREE.Mesh;
const inRing = (x: number, z: number): boolean => x >= RING.i0 && x < RING.i1 + 1 && z >= RING.j0 && z < RING.j1 + 1;
const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

describe('Cinderhold arrival', () => {
  it('lets a Fairy fly from Kestrel Rock to the Landing', () => {
    const p = new Pilot(shut, 'fairy', at(1577.5, 31.5));
    expect(p.fly(at(1598.5, 31.5), { seconds: 20 }), p.describe()).toBe(true);
    expect(p.fell).toBe(false);
    expect(p.y).toBeCloseTo(1, 1);
  });

  it('lets a Human walk the Climb to the Ring', () => {
    const p = new Pilot(shut, 'human', at(1598.5, 31.5));
    expect(p.walk(at(1623.5, 31.5), { seconds: 30 }), p.describe()).toBe(true);
    expect(p.y).toBeCloseTo(6, 1);
  });
});

describe('Cinderhold Stairs', () => {
  const top = at(1644.5, 1.5);
  const stairTop = (world: World, to: { x: number; z: number }) => {
    const p = new Pilot(world, 'human', at(1644.5, 16.5));
    expect(p.hop(top, { seconds: 40 }), p.describe()).toBe(true);
    expect(p.y).toBeCloseTo(12, 1);
    p.player.level = 10;
    p.glide(to, { seconds: 25 });
    return p;
  };

  it('can be jumped up step by step by a Human, and a glide from the top lands on the shut Lid', () => {
    const p = stairTop(shut, at(1645.5, 32.5));
    expect(p.fell).toBe(false);
    expect(Math.hypot(p.x - 1645.5, p.z - 32.5)).toBeLessThan(1);
    expect(p.y).toBeCloseTo(6, 1);
    expect(shut.isWater(p.x, p.z)).toBe(false);
  });

  it('ends the same glide in the lake once the lid is down', () => {
    const p = stairTop(open, at(1645.5, 32.5));
    expect(p.fell).toBe(false);
    expect(open.isWater(p.x, p.z)).toBe(true);
    expect(p.player.swimming).toBe(true);
    expect(Math.hypot(p.x - 1645, p.z - 32)).toBeLessThan(3);
  });
});

describe('the Warden on the island', () => {
  it('notices a Human who walks in to 12 tiles away, and not one on the Landing', () => {
    const r = new Rig(shut, 'human', at(1598.5, 31.5), ['warden']);
    const w = r.bosses[0];
    r.run(2, null);
    expect(w.alert).toBe(false);
    expect(r.run(40, () => at(1634.5, 31.5), () => w.alert)).toBe(true);
    expect(dist(r.p, w.pos)).toBeLessThan(WARDEN.notice + 0.01);
    expect(dist(r.p, w.pos)).toBeGreaterThan(8);
  });

  /** Notice, then lead the Warden to the foot of the North Stair (the player hops to the top, then waits there). */
  const ledToStair = () => {
    const r = new Rig(shut, 'human', at(1644.5, 18.5), ['warden']);
    const w = r.bosses[0];
    expect(r.run(3, null, () => w.alert)).toBe(true);
    // Wait at the foot until it is a few tiles off (a human outruns it, and it gives up at 18), then climb.
    r.run(15, () => at(1644.5, 16.5), () => w.pos.z < 24);
    const hop = () => {
      if (r.player.onGround && r.pad.dir.z !== 0) r.pad.tapped.add('Space');
    };
    expect(r.run(20, () => at(1644.5, 1.5), () => r.p.y > 11.9, hop), `at ${r.p.z.toFixed(1)}, ${r.p.y.toFixed(1)}`).toBe(true);
    r.run(30, null, () => w.pos.z < 15.5);
    return r;
  };

  it('cannot follow a Human up the North Stair: it stays on the Ring floor for 40 s', () => {
    const r = ledToStair();
    const w = r.bosses[0];
    r.player.place(1644.5, 10.5);
    r.run(0.5, null);
    expect(r.p.y).toBeCloseTo(8, 1);
    r.run(40, null, () => false, () => {
      r.player.hearts = r.player.form.maxHearts; // the rocks keep coming: stay alive
      expect(w.pos.y).toBe(RING.h);
      expect(inRing(w.pos.x, w.pos.z)).toBe(true);
    });
    expect(w.alert).toBe(true);
    expect(w.pos.z).toBeGreaterThan(RING.j0);
  });

  it('throws a rock for rockDamage at a Human standing still on the Stair top', () => {
    const r = ledToStair();
    r.player.hearts = r.player.form.maxHearts;
    const before = r.player.hearts;
    expect(dist(r.p, r.bosses[0].pos)).toBeGreaterThan(WARDEN.throwFrom);
    expect(r.run(25, null, () => r.player.hearts < before)).toBe(true);
    expect(r.player.hearts).toBe(before - WARDEN.rockDamage);
  });

  it('does not leave the Ring while it chases a Human who stands outside the rim on the Climb', () => {
    const r = new Rig(shut, 'human', at(1633.5, 31.5), ['warden']);
    const w = r.bosses[0];
    expect(r.run(3, null, () => w.alert)).toBe(true);
    // Walk back out down the Climb, to 3 tiles outside the rim, and stand there.
    expect(r.run(10, () => at(1619.5, 31.5), () => r.p.x < 1620)).toBe(true);
    r.run(40, null, () => false, () => expect(inRing(w.pos.x, w.pos.z)).toBe(true));
    expect(r.p.x).toBeLessThan(RING.i0);
    expect(w.pos.x).toBeGreaterThan(RING.i0);
  });

  it('is beaten by a level 10 sword (5 a blow, 12 blows that land) with scripted dodging, in over 20 s', () => {
    const r = new Rig(shut, 'human', at(1643.5, 30.5), ['warden']);
    const w = r.bosses[0];
    const ring = ringOf(w);
    const max = r.player.hearts;
    const away = () => {
      const d = Math.max(0.01, dist(r.p, w.pos));
      return at(r.p.x + ((r.p.x - w.pos.x) / d) * 5, r.p.z + ((r.p.z - w.pos.z) / d) * 5);
    };
    let phase: 'bait' | 'out' | 'in' = 'bait';
    let strikes = 0;
    let hits = 0;
    let lastHearts = w.hearts;
    const goal = () => (phase === 'bait' ? null : phase === 'out' ? away() : at(w.pos.x, w.pos.z));
    const each = () => {
      if (phase === 'bait') {
        if (ring.visible) phase = 'out';
        else if (dist(r.p, w.pos) > WARDEN.slamStart - 0.2) phase = 'in';
      } else if (phase === 'out') {
        if (!ring.visible) phase = 'in';
      } else {
        if (ring.visible) phase = 'out';
        else if (dist(r.p, w.pos) < 1.5 && !r.pad.tapped.size) {
          r.pad.tapped.add('KeyJ');
          strikes++;
        }
      }
      if (w.hearts < lastHearts) {
        lastHearts = w.hearts;
        hits++;
        phase = 'bait';
      }
    };
    expect(r.run(120, goal, () => !w.alive, each), `hearts ${w.hearts}, strikes ${strikes}, time ${r.time.toFixed(1)}`).toBe(true);
    if (w.hearts < lastHearts) hits++; // the last blow ends the run before `each` sees it
    expect(hits, 'blows that landed').toBe(12);
    expect(r.time).toBeGreaterThan(20);
    expect(r.time).toBeLessThan(40); // measured 26.3 s
    expect(max - r.player.hearts, 'hearts lost').toBe(0);
  });

  it('beats a Human who only stands next to it and swings, never dodging', () => {
    const r = new Rig(shut, 'human', at(1643.5, 30.5), ['warden']);
    const w = r.bosses[0];
    let next = 0;
    const each = () => {
      if (r.time >= next && dist(r.p, w.pos) < 2) {
        r.pad.tapped.add('KeyJ');
        next = r.time + 0.4;
      }
    };
    const over = () => !w.alive || r.player.dead || r.player.hearts <= 0;
    r.run(120, () => at(w.pos.x - 1, w.pos.z), over, each);
    expect(w.alive, `warden left with ${w.hearts}`).toBe(true);
    expect(r.player.hearts).toBeLessThanOrEqual(0);
  });
});

describe('the Lid', () => {
  it('drops under a Human standing on it: swimming within 2 s, unhurt, and out onto the Ring by the shore', () => {
    const world = new World(); // a third world, so the shared two stay as they are
    const r = new Rig(world, 'human', at(1645.5, 32.5), []);
    r.run(1, null);
    expect(r.player.swimming).toBe(false);
    expect(r.p.y).toBeCloseTo(RING.h, 1);
    world.dropLid();
    expect(r.run(2, null, () => r.player.swimming)).toBe(true);
    expect(r.player.hearts).toBe(r.player.form.maxHearts);
    const hop = () => {
      if (r.player.onGround && r.pad.dir.x !== 0) r.pad.tapped.add('Space');
    };
    expect(r.run(20, () => at(1624.5, 32.5), () => !r.player.swimming && r.p.x < 1626.5, hop), `at ${r.p.x.toFixed(1)}, ${r.p.y.toFixed(1)}`).toBe(true);
    r.run(1, null);
    expect(r.p.y).toBeCloseTo(RING.h, 1);
    expect(r.player.hearts).toBe(r.player.form.maxHearts);
  });
});

describe('the Eel on the island', () => {
  const eelRange = (r: Rig) => () => {
    const e = r.bosses[0];
    expect(open.isWater(e.pos.x, e.pos.z), `eel at ${e.pos.x.toFixed(1)}, ${e.pos.z.toFixed(1)}`).toBe(true);
    expect(e.pos.y).toBeLessThanOrEqual(DEEP.level - EEL.topGap + 1e-6);
    expect(e.pos.y).toBeGreaterThanOrEqual(DEEP.bed + EEL.bedGap - 1e-6);
  };

  it('keeps its centre on lake tiles for 30 s while a Human walks round the shore', () => {
    const r = new Rig(open, 'human', at(1645, 22), ['eel']);
    const check = eelRange(r);
    r.run(30, () => {
      // The ash walk round the Deep, at its middle (a rounded rectangle 18 by 13 from the centre).
      const a = -Math.PI / 2 + r.time * 0.3;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const k = 1 / Math.max(Math.abs(c) / (DEEP.rx + 2), Math.abs(s) / (DEEP.rz + 2));
      return at(DEEP.x + c * k, DEEP.z + s * k);
    }, () => false, () => {
      check();
      r.player.hearts = r.player.form.maxHearts;
    });
    expect(r.bosses[0].alert).toBe(true);
  });

  /** Swim in the middle of the lake with the Eel after us: still, or sideways whenever its streak shows. Counts the glows, and the tiles swum during them. */
  const lunge = (form: FormId, sidestep: boolean, seconds: number) => {
    const r = new Rig(open, form, at(1645.5, 27.5), ['eel']);
    const e = r.bosses[0];
    const max = r.player.hearts;
    let glows = 0;
    let glowing = false;
    let glowTime = 0;
    let moved = 0;
    let side: { x: number; z: number } | null = null;
    let last = { x: r.p.x, z: r.p.z };
    r.run(seconds, () => {
      const on = e.streak!.visible;
      if (on && !glowing) {
        // The direction is fixed when the glow starts: go at right angles to it.
        const d = Math.max(0.01, dist(r.p, e.pos));
        side = { x: -(e.pos.z - r.p.z) / d, z: (e.pos.x - r.p.x) / d };
      }
      return sidestep && on && side ? at(r.p.x + side.x * 5, r.p.z + side.z * 5) : null;
    }, () => r.player.hearts < max, () => {
      const on = e.streak!.visible;
      if (on && !glowing) glows++;
      if (on) {
        glowTime += DT;
        moved += dist(r.p, last);
      }
      glowing = on;
      last = { x: r.p.x, z: r.p.z };
    });
    return { lost: max - r.player.hearts, glows, glowTime, moved, swimming: r.player.swimming };
  };

  it('lunges at a Human who swims still in the lake, for EEL.damage, with the streak showing for the windup', () => {
    const got = lunge('human', false, 20);
    expect(got.swimming).toBe(true);
    expect(got.lost).toBe(EEL.damage);
    expect(got.glows).toBe(1);
    expect(got.glowTime).toBeGreaterThan(EEL.windup - 0.1);
    expect(got.glowTime).toBeLessThan(EEL.windup + 0.1);
  });

  it('misses a Human who swims sideways during the glow', () => {
    const got = lunge('human', true, 15);
    expect(got.glows).toBeGreaterThanOrEqual(3);
    expect(got.lost).toBe(0);
  });

  it('loses hearts to a Human who swims up beside it and strikes', () => {
    const r = new Rig(open, 'human', at(1640.5, 32.5), ['eel']);
    const e = r.bosses[0];
    let next = 0;
    r.run(20, () => at(e.pos.x, e.pos.z), () => e.hearts <= EEL.hearts - 5, () => {
      r.player.hearts = r.player.form.maxHearts;
      if (r.time >= next) {
        r.pad.tapped.add('KeyJ');
        next = r.time + 0.5;
      }
    });
    expect(r.player.swimming).toBe(true);
    expect(e.hearts).toBeLessThanOrEqual(EEL.hearts - 5);
  });

  it.each([
    ['water shot', 'KeyQ', WATER_SHOT_DAMAGE],
    ['bubble column', 'KeyR', BUBBLE_DAMAGE],
  ])('is hurt by the Mermaid %s', (_name, key, damage) => {
    const r = new Rig(open, 'mermaid', at(1640.5, 32.5), ['eel']);
    const e = r.bosses[0];
    let next = 0;
    r.run(20, () => at(e.pos.x, e.pos.z), () => e.hearts < EEL.hearts, () => {
      r.player.hearts = r.player.form.maxHearts;
      if (r.time >= next && dist(r.p, e.pos) < 5) {
        r.pad.tapped.add(key);
        next = r.time + 2;
      }
    });
    r.run(2, null, () => e.hearts < EEL.hearts);
    expect(EEL.hearts - e.hearts).toBe(damage);
  });

  it('cannot reach a Human on either Stair top, but spits at one on the south ash walk 11 tiles off', () => {
    const top = new Rig(open, 'human', at(1679.5, 31.5), ['eel']);
    top.run(20, null);
    expect(top.bosses[0].alert).toBe(false);
    expect(top.player.hearts).toBe(top.player.form.maxHearts);

    const north = new Rig(open, 'human', at(1644.5, 1.5), ['eel']);
    north.run(20, null);
    expect(north.bosses[0].alert).toBe(false);
    expect(north.player.hearts).toBe(north.player.form.maxHearts);

    const ring = new Rig(open, 'human', at(1645.5, 45.5), ['eel']);
    const before = ring.player.hearts;
    expect(ring.run(20, null, () => ring.player.hearts < before)).toBe(true);
    expect(ring.player.hearts).toBe(before - EEL.spitDamage);
  });
});

describe('the checkpoints', () => {
  it('leave the Human at the ch-ring respawn spot unhurt for 20 s with the lid down and the Eel awake', () => {
    const r = new Rig(open, 'human', at(1611.5, 31.5), ['eel']);
    expect(dist(r.p, r.bosses[0].pos)).toBeGreaterThan(EEL.notice + 20);
    r.run(20, null, () => false, () => expect(r.player.hearts).toBe(r.player.form.maxHearts));
    expect(r.bosses[0].alert).toBe(false);
  });

  it.each([
    ['the Landing', at(1595.5, 30.5)],
    ['the Ring', at(1624.5, 30.5)],
  ])('are quiet at %s: nobody wakes and no heart is lost in 20 s', (_name, spot) => {
    for (const world of [shut, open]) {
      const r = new Rig(world, 'human', spot, world === shut ? ['warden', 'eel'] : ['eel']);
      r.run(20, null);
      for (const b of r.bosses) expect(b.alert, `${b.kind} with the lid ${world === shut ? 'shut' : 'down'}`).toBe(false);
      expect(r.player.hearts).toBe(r.player.form.maxHearts);
    }
  });
});
