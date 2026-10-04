import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Arrows } from './arrows';
import { Enemy, EnemyKind } from './enemy';
import { EEL, FORMS, FormId, WARDEN } from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
import { Player } from './player';
import { Island, Kind, World } from './world';

// The Warden and the Eel, in tiny worlds with a real Player. The Eel's pool is
// an open one (no lid) and `dropLid()` wakes it.

const FLOOR = 2;
const DT = 1 / 60;

class Pad implements Controls {
  held(): boolean {
    return false;
  }
  hit(): boolean {
    return false;
  }
  move(): { x: number; y: number } {
    return { x: 0, y: 0 };
  }
  anyMoveHit(): boolean {
    return false;
  }
}

type Terrain = Parameters<Island['build']>[0];

function island(extra: (t: Terrain) => void = () => {}): Island {
  return {
    id: 'test',
    name: 'Test',
    build(t) {
      t.rect(0, 0, 100, 30, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
      extra(t);
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

/** A pool 20 by 10 tiles, bed at 0 and surface at 1.5, so a swimmer floats at the top. */
const pool = (t: Terrain) => {
  t.rect(40, 10, 59, 19, (i, j) => {
    t.set(i, j, 0, Kind.Grass);
    t.setWater(i, j, true, 1.5);
  });
};

const ledge = (x: number, h: number) => (t: Terrain) => t.rect(x, 0, 99, 29, (i, j) => t.set(i, j, FLOOR + h, Kind.Stone));
const wall = (x: number, h: number) => (t: Terrain) => t.rect(x, 0, x, 30, (i, j) => t.set(i, j, FLOOR + h, Kind.Stone));

class Fight {
  readonly world: World;
  readonly player: Player;
  readonly arrows: Arrows;
  readonly boss: Enemy;
  time = 0;

  constructor(kind: EnemyKind, form: FormId, isl: Island, player: { x: number; z: number }, boss: { x: number; z: number }) {
    this.world = new World([isl]);
    const particles = new Particles();
    this.player = new Player(this.world, particles, {
      onFell: () => {},
      onDied: () => {},
      onAte: () => {},
      onHome: () => {},
    });
    const index = FORMS.findIndex((f) => f.id === form);
    this.player.level = FORMS[index].level;
    if (index !== 0) expect(this.player.shiftTo(index)).toBe(true);
    this.player.hearts = this.player.form.maxHearts;
    this.player.place(player.x, player.z);
    this.arrows = new Arrows(this.world, particles);
    this.boss = new Enemy(this.world, particles, this.arrows, boss, { tester: false, kind });
  }

  /** One frame; `walk` moves the player on the ground plane by that many tiles a second. */
  frame(walk?: { x: number; z: number }): void {
    this.player.update(DT, new Pad(), [this.boss]);
    if (walk) {
      this.player.pos.x += walk.x * DT;
      this.player.pos.z += walk.z * DT;
    }
    this.boss.update(DT, this.player, [this.boss]);
    this.arrows.update(DT, this.player);
    this.time += DT;
  }

  until(done: () => boolean, seconds = 10, walk?: { x: number; z: number }): boolean {
    for (let n = 0; n < seconds / DT; n++) {
      if (done()) return true;
      this.frame(walk);
    }
    return done();
  }

  run(seconds: number, walk?: { x: number; z: number }): void {
    this.until(() => false, seconds, walk);
  }
}

describe('the Warden', () => {
  it('is a boss with its hearts, and a bite does not faint it', () => {
    const f = new Fight('warden', 'human', island(), { x: 30.5, z: 15.5 }, { x: 20.5, z: 15.5 });
    expect(f.boss.boss).toBe(true);
    expect(f.boss.maxHearts).toBe(WARDEN.hearts);
    expect(f.boss.hearts).toBe(WARDEN.hearts);
    f.boss.faint(5);
    expect(f.boss.fainted).toBe(false);
  });

  it('slams a player who stands still inside slamStart for 5 hearts after about 1.2 s', () => {
    const f = new Fight('warden', 'human', island(), { x: 21.5, z: 15.5 }, { x: 20.5, z: 15.5 });
    f.player.hearts = 10;
    expect(f.until(() => f.player.hearts < 10)).toBe(true);
    expect(f.player.hearts).toBe(10 - WARDEN.damage);
    expect(f.time).toBeGreaterThan(WARDEN.windup - 0.1);
    expect(f.time).toBeLessThan(WARDEN.windup + 0.3);
  });

  it('shows its red ring only while winding up', () => {
    const f = new Fight('warden', 'human', island(), { x: 21.5, z: 15.5 }, { x: 20.5, z: 15.5 });
    const ring = f.boss.group.children.find((c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.RingGeometry) as THREE.Mesh;
    expect(ring.visible).toBe(false);
    f.run(0.5);
    expect(ring.visible).toBe(true);
    f.run(1.5);
    expect(ring.visible).toBe(false);
  });

  it('misses a player who walks straight out at 4 tiles a second from the start of the wind-up', () => {
    const f = new Fight('warden', 'human', island(), { x: 21.5, z: 15.5 }, { x: 20.5, z: 15.5 });
    f.player.hearts = 10;
    const wind = { x: 4, z: 0 };
    f.until(() => f.boss.alert, 2);
    f.run(3, wind);
    expect(f.player.hearts).toBe(10);
  });

  it('does not get up a step 1 high', () => {
    const f = new Fight('warden', 'human', island(ledge(30, 1)), { x: 35.5, z: 15.5 }, { x: 24.5, z: 15.5 });
    f.player.hearts = 10;
    f.run(8);
    expect(f.boss.pos.x).toBeLessThan(30);
    expect(f.boss.pos.y).toBe(FLOOR);
  });

  it('throws a rock at a player on a ledge 3 above it, and hurts a still one for rockDamage', () => {
    const f = new Fight('warden', 'human', island(ledge(30, 3)), { x: 30.7, z: 15.5 }, { x: 28.5, z: 15.5 });
    f.player.hearts = 10;
    expect(f.until(() => f.player.hearts < 10)).toBe(true);
    expect(f.player.hearts).toBe(10 - WARDEN.rockDamage);
    expect(f.time).toBeGreaterThan(WARDEN.throwWindup);
  });

  it('stands still while it lifts the rock', () => {
    const f = new Fight('warden', 'human', island(ledge(30, 3)), { x: 30.7, z: 15.5 }, { x: 29.0, z: 15.5 });
    f.run(0.3);
    const x = f.boss.pos.x;
    f.run(0.5);
    expect(f.boss.pos.x).toBe(x);
  });

  it('has its rock stopped by a wall', () => {
    const f = new Fight('warden', 'human', island(wall(26, 4)), { x: 32.5, z: 15.5 }, { x: 20.5, z: 15.5 });
    f.player.hearts = 10;
    f.run(10);
    expect(f.player.hearts).toBe(10);
  });

  it('gets all its hearts back on reset', () => {
    const f = new Fight('warden', 'human', island(), { x: 60.5, z: 15.5 }, { x: 20.5, z: 15.5 });
    f.boss.takeHit(6, 0, 0);
    expect(f.boss.hearts).toBe(WARDEN.hearts - 6);
    f.boss.pos.x = 25;
    f.boss.reset();
    expect(f.boss.hearts).toBe(WARDEN.hearts);
    expect(f.boss.pos.x).toBe(20.5);
  });
});

describe('the Eel', () => {
  const inWater = (f: Fight) => f.world.isWater(f.boss.pos.x, f.boss.pos.z);

  it('is asleep, unhittable and out of sight until the lid is down', () => {
    const f = new Fight('eel', 'mermaid', island(pool), { x: 44.5, z: 14.5 }, { x: 50.5, z: 14.5 });
    expect(f.boss.maxHearts).toBe(EEL.hearts);
    f.run(3);
    expect(f.player.hearts).toBe(f.player.form.maxHearts);
    expect(f.boss.group.visible).toBe(false);
    expect(f.boss.alert).toBe(false);
    f.boss.takeHit(5, 0, 0);
    expect(f.boss.hearts).toBe(EEL.hearts);
    f.world.dropLid();
    f.run(0.1);
    expect(f.boss.group.visible).toBe(true);
    expect(inWater(f)).toBe(true);
  });

  it('never leaves the water while it chases a player round the shore', () => {
    const f = new Fight('eel', 'human', island(pool), { x: 38.5, z: 8.5 }, { x: 50.5, z: 14.5 });
    f.world.dropLid();
    const lap = [
      { x: 0, z: 4 },
      { x: 4, z: 0 },
      { x: 0, z: -4 },
      { x: -4, z: 0 },
    ];
    // Walk a loop 2 tiles outside the pool, 5 s a side, four times over 20 s.
    f.player.place(38.5, 8.5);
    for (let n = 0; n < 20 / DT; n++) {
      f.frame(lap[Math.floor(n / (5 / DT)) % 4]);
      expect(inWater(f)).toBe(true);
      expect(f.boss.pos.y).toBeLessThanOrEqual(1.5 - EEL.topGap + 1e-6);
      expect(f.boss.pos.y).toBeGreaterThanOrEqual(EEL.bedGap - 1e-6);
    }
  });

  it('lunges at a still swimmer for 5 hearts', () => {
    const f = new Fight('eel', 'mermaid', island(pool), { x: 44.5, z: 14.5 }, { x: 50.5, z: 14.5 });
    f.world.dropLid();
    f.player.hearts = 10;
    expect(f.until(() => f.player.hearts < 10)).toBe(true);
    expect(f.player.swimming).toBe(true);
    expect(f.player.hearts).toBe(10 - EEL.damage);
  });

  it('misses a swimmer who moves sideways at 6 from the start of the glow', () => {
    const f = new Fight('eel', 'mermaid', island(pool), { x: 46.5, z: 14.5 }, { x: 50.5, z: 14.5 });
    f.world.dropLid();
    f.player.hearts = 10;
    expect(f.until(() => f.boss.alert, 2)).toBe(true);
    f.run(2, { x: 0, z: 6 });
    expect(f.player.hearts).toBe(10);
  });

  it('shows a wake while awake and its red streak exactly during the lunge windup', () => {
    const f = new Fight('eel', 'mermaid', island(pool), { x: 44.5, z: 14.5 }, { x: 50.5, z: 14.5 });
    const wake = f.boss.surfaceWake!;
    const streak = f.boss.streak!;
    expect((wake.geometry as THREE.CircleGeometry).parameters.radius * 2).toBeCloseTo(1.2, 5);
    f.run(0.2);
    expect(wake.visible).toBe(false);
    expect(streak.visible).toBe(false);
    f.world.dropLid();
    f.player.hearts = 10;
    let glowing = 0;
    while (f.player.hearts === 10 && f.time < 10) {
      f.frame();
      expect(wake.visible).toBe(true);
      if (streak.visible) {
        glowing += DT;
        expect(streak.scale.z).toBeGreaterThan(0.5);
        expect(streak.scale.z).toBeLessThanOrEqual(EEL.lungeLength);
      }
    }
    expect(f.player.hearts).toBeLessThan(10);
    expect(glowing).toBeGreaterThan(EEL.windup - 0.1);
    expect(glowing).toBeLessThan(EEL.windup + 0.1);
    f.boss.takeHit(EEL.hearts, 0, 0);
    f.run(0.1);
    expect(wake.visible).toBe(false);
    expect(streak.visible).toBe(false);
  });

  it('spits at a still player on the shore for spitDamage', () => {
    const f = new Fight('eel', 'human', island(pool), { x: 50.5, z: 8.5 }, { x: 50.5, z: 14.5 });
    f.world.dropLid();
    f.player.hearts = 10;
    expect(f.until(() => f.player.hearts < 10)).toBe(true);
    expect(f.player.hearts).toBe(10 - EEL.spitDamage);
    expect(f.time).toBeGreaterThan(EEL.spitWindup);
  });

  it('drifts back to its post when nobody is about', () => {
    const f = new Fight('eel', 'human', island(pool), { x: 90.5, z: 15.5 }, { x: 50.5, z: 14.5 });
    f.world.dropLid();
    f.boss.pos.x = 43.5;
    f.run(5);
    expect(Math.hypot(f.boss.pos.x - 50.5, f.boss.pos.z - 14.5)).toBeLessThan(0.5);
  });
});

describe('other bad guys', () => {
  it('still refuse water', () => {
    const f = new Fight('regular', 'human', island(pool), { x: 52.5, z: 14.5 }, { x: 38.5, z: 14.5 });
    f.run(10);
    expect(f.world.isWater(f.boss.pos.x, f.boss.pos.z)).toBe(false);
  });
});
