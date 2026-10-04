import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Arrows } from './arrows';
import { Enemy, EnemyKind } from './enemy';
import { FORMS, FormId, SNAPPER, SNAPPER_LEVEL } from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
import { Player } from './player';
import { Island, Kind, World } from './world';

// The Snapper in a small pool of its own, with a real Player. The pool is
// tiles 10..21 both ways, bed at -6 and surface at 2, with grass at 2 round it.

const DT = 1 / 60;
const BED = -6;
const LEVEL = 2;
const POST = { x: 11.5, z: 15.5 };

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

const pool: Island = {
  id: 'test',
  name: 'Test',
  build(t) {
    t.rect(0, 0, 40, 30, (i, j) => t.set(i, j, 2, Kind.Grass));
    t.rect(10, 10, 21, 21, (i, j) => {
      t.set(i, j, BED, Kind.Grass);
      t.setWater(i, j, true, LEVEL);
    });
    return { spawn: { x: 2.5, z: 15.5 } };
  },
};

class Pond {
  readonly world = new World([pool]);
  readonly player: Player;
  readonly enemy: Enemy;
  time = 0;

  constructor(form: FormId, player: { x: number; z: number }, kind: EnemyKind = 'snapper', post = POST, minLevel?: number) {
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
    this.enemy = new Enemy(this.world, particles, new Arrows(this.world, particles), post, { tester: false, kind, minLevel });
  }

  frame(walk?: { x: number; z: number }): void {
    this.player.update(DT, new Pad(), [this.enemy]);
    if (walk) {
      this.player.pos.x += walk.x * DT;
      this.player.pos.z += walk.z * DT;
    }
    this.enemy.update(DT, this.player, [this.enemy]);
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

  /** True while the centre is on a swimmable tile, inside the depth band. */
  inBand(): boolean {
    const { x, y, z } = this.enemy.pos;
    return (
      this.world.isWater(x, z) &&
      !this.world.isKelp(x, z) &&
      y >= this.world.groundAt(x, z) + SNAPPER.bedGap - 1e-6 &&
      y <= this.world.waterLevelAt(x, z) - SNAPPER.topGap + 1e-6
    );
  }
}

describe('the Snapper', () => {
  it('starts in the water at its post, inside the depth band, and is no boss', () => {
    const p = new Pond('human', { x: 30.5, z: 15.5 });
    expect(p.enemy.boss).toBe(false);
    expect(p.enemy.maxHearts).toBe(SNAPPER.hearts);
    expect(p.enemy.pos.x).toBe(POST.x);
    expect(p.enemy.pos.z).toBe(POST.z);
    expect(p.inBand()).toBe(true);
    expect(p.enemy.pos.y).toBeGreaterThan(BED + 1);
  });

  it('ignores a Human on the shore 2 tiles from it', () => {
    const p = new Pond('human', { x: 9.5, z: 15.5 });
    p.player.hearts = 10;
    for (let n = 0; n < 5 / DT; n++) {
      p.frame();
      expect(p.enemy.alert).toBe(false);
    }
    expect(p.player.hearts).toBe(10);
    expect(p.enemy.pos.x).toBe(POST.x);
  });

  it('snaps at a still swimmer inside notice for SNAPPER.damage', () => {
    const p = new Pond('mermaid', { x: 17.5, z: 15.5 });
    p.player.hearts = 10;
    expect(p.until(() => p.player.hearts < 10)).toBe(true);
    expect(p.player.swimming).toBe(true);
    expect(p.player.hearts).toBe(10 - SNAPPER.damage);
    expect(p.time).toBeGreaterThan(SNAPPER.windup);
  });

  it('misses a swimmer who moves sideways out of its line during the windup', () => {
    const p = new Pond('mermaid', { x: 14.5, z: 15.5 });
    p.player.hearts = 10;
    expect(p.until(() => p.enemy.streak!.visible, 3)).toBe(true);
    p.run(2, { x: 0, z: 6 });
    expect(p.player.hearts).toBe(10);
  });

  it('keeps its centre in the water and the depth band through a 20 s chase', () => {
    const p = new Pond('mermaid', { x: 15.5, z: 12.5 });
    const lap = [
      { x: 0, z: 3 },
      { x: 3, z: 0 },
      { x: 0, z: -3 },
      { x: -3, z: 0 },
    ];
    for (let n = 0; n < 20 / DT; n++) {
      p.frame(lap[Math.floor(n / (3 / DT)) % 4]);
      expect(p.inBand()).toBe(true);
    }
  });

  it('goes back to its post after the player climbs out', () => {
    const p = new Pond('mermaid', { x: 17.5, z: 12.5 });
    expect(p.until(() => Math.hypot(p.enemy.pos.x - POST.x, p.enemy.pos.z - POST.z) > 2, 5, { x: 0, z: 0.5 })).toBe(true);
    p.player.place(5.5, 15.5);
    p.run(0.2);
    expect(p.player.swimming).toBe(false);
    p.run(6);
    expect(Math.hypot(p.enemy.pos.x - POST.x, p.enemy.pos.z - POST.z)).toBeLessThan(0.5);
    expect(p.enemy.alert).toBe(false);
  });

  it('is beaten by blows, with no knockback and no fainting', () => {
    const p = new Pond('human', { x: 30.5, z: 15.5 });
    p.enemy.faint(5);
    expect(p.enemy.fainted).toBe(false);
    p.enemy.takeHit(1, 5, 15.5);
    p.run(0.5);
    expect(p.enemy.pos.x).toBeLessThan(POST.x + 0.5);
    expect(p.enemy.pos.x).toBeGreaterThan(POST.x - 0.5);
    expect(p.enemy.hearts).toBe(SNAPPER.hearts - 1);
    p.enemy.takeHit(SNAPPER.hearts, 5, 15.5);
    expect(p.enemy.alive).toBe(false);
    expect(p.enemy.surfaceWake!.visible).toBe(false);
  });

  it('shows a small wake while awake and no streak at rest', () => {
    const p = new Pond('human', { x: 30.5, z: 15.5 });
    p.run(0.2);
    const wake = p.enemy.surfaceWake!;
    expect(wake.visible).toBe(true);
    expect(wake.position.y + p.enemy.pos.y).toBeCloseTo(LEVEL + 0.04, 5);
    expect((wake.geometry as THREE.CircleGeometry).parameters.radius * 2).toBeCloseTo(0.6, 5);
    expect(p.enemy.streak!.visible).toBe(false);
  });

  it('stays dormant until SNAPPER_LEVEL, as any minLevel does', () => {
    const p = new Pond('human', { x: 30.5, z: 15.5 }, 'snapper', POST, SNAPPER_LEVEL);
    expect(p.enemy.active).toBe(false);
    expect(p.enemy.group.visible).toBe(false);
    expect(p.enemy.wake(SNAPPER_LEVEL - 1)).toBe(false);
    expect(p.enemy.wake(SNAPPER_LEVEL)).toBe(true);
    expect(p.enemy.active).toBe(true);
  });
});

describe('other bad guys', () => {
  it('a regular one does not enter the water while it chases a swimmer', () => {
    const p = new Pond('mermaid', { x: 15.5, z: 15.5 }, 'regular', { x: 8.5, z: 15.5 });
    for (let n = 0; n < 10 / DT; n++) {
      p.frame();
      expect(p.world.isWater(p.enemy.pos.x, p.enemy.pos.z)).toBe(false);
    }
    expect(p.enemy.pos.x).toBeLessThan(10);
  });
});
