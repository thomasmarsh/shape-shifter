import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Arrows } from './arrows';
import { Enemy, EnemyKind } from './enemy';
import { FORMS, FormId } from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
import { Player } from './player';
import { Island, Kind, World } from './world';

// Archers, arrows and the rules around them, in tiny worlds with a real
// Player driven by a fake keyboard (see player.test.ts for the same idea).

const FLOOR = 2;
const DT = 1 / 60;

class Pad implements Controls {
  tapped = new Set<string>();
  held(code: string): boolean {
    return this.tapped.has(code);
  }
  hit(code: string): boolean {
    return this.tapped.has(code);
  }
  move(): { x: number; y: number } {
    return { x: 0, y: 0 };
  }
  anyMoveHit(): boolean {
    return false;
  }
}

type Terrain = Parameters<Island['build']>[0];

/** Flat ground 100 by 30, with `extra` shaping it further. */
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

const wall = (x: number, h: number) => (t: Terrain) =>
  t.rect(x, 0, x, 30, (i, j) => t.set(i, j, FLOOR + h, Kind.Stone));

class Duel {
  readonly world: World;
  readonly player: Player;
  readonly arrows: Arrows;
  readonly enemy: Enemy;
  readonly pad = new Pad();
  time = 0;

  constructor(
    form: FormId,
    isl: Island,
    player: { x: number; z: number },
    enemy: { x: number; z: number },
    spot: { kind: EnemyKind; tester?: boolean; minLevel?: number },
  ) {
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
    this.enemy = new Enemy(this.world, particles, this.arrows, enemy, { tester: false, ...spot });
  }

  frame(): void {
    this.player.update(DT, this.pad, [this.enemy]);
    this.enemy.update(DT, this.player, [this.enemy]);
    this.arrows.update(DT, this.player);
    this.pad.tapped.clear();
    this.time += DT;
  }

  /** Run until `done` or `seconds` have passed. Returns whether `done` became true. */
  until(done: () => boolean, seconds = 10): boolean {
    for (let n = 0; n < seconds / DT; n++) {
      if (done()) return true;
      this.frame();
    }
    return done();
  }

  run(seconds: number): void {
    this.until(() => false, seconds);
  }
}

const archerSpot = { kind: 'archer' as const };
const regularSpot = { kind: 'regular' as const };

describe('archers', () => {
  it('hurt a standing human for exactly 2 hearts, and not before the draw is done', () => {
    const d = new Duel('human', island(), { x: 28.5, z: 15.5 }, { x: 20.5, z: 15.5 }, archerSpot);
    d.run(0.85);
    expect(d.enemy.alert).toBe(true);
    expect(d.arrows.count).toBe(0);
    expect(d.player.hearts).toBe(10);

    expect(d.until(() => d.player.hearts < 10)).toBe(true);
    expect(d.player.hearts).toBe(8);
    // 0.9 s to draw, then 8 tiles at 10 tiles per second.
    expect(d.time).toBeGreaterThan(0.9 + 0.7);
  });

  it('are stopped by a wall 2 high', () => {
    const d = new Duel('human', island(wall(24, 2)), { x: 28.5, z: 15.5 }, { x: 20.5, z: 15.5 }, archerSpot);
    d.run(10);
    expect(d.player.hearts).toBe(10);
    expect(d.arrows.count).toBeLessThan(2);
  });

  it('shoot down from a pillar at a player in the open', () => {
    const pillar = (t: Terrain) => t.rect(20, 15, 20, 15, (i, j) => t.set(i, j, FLOOR + 4, Kind.Stone));
    const d = new Duel('human', island(pillar), { x: 26.5, z: 15.5 }, { x: 20.5, z: 15.5 }, archerSpot);
    expect(d.enemy.pos.y).toBe(FLOOR + 4);
    expect(d.until(() => d.player.hearts < 10)).toBe(true);
    expect(d.player.hearts).toBe(8);
  });

  it('cannot hurt a player hidden in a fairy home, and stop being alert', () => {
    const d = new Duel('fairy', island(), { x: 28.5, z: 15.5 }, { x: 20.5, z: 15.5 }, archerSpot);
    d.run(0.5);
    expect(d.enemy.alert).toBe(true);
    d.pad.tapped.add('KeyQ');
    d.frame();
    expect(d.player.hidden).toBe(true);
    d.run(0.1);
    expect(d.enemy.alert).toBe(false);
    d.run(8);
    expect(d.player.hearts).toBe(3);
    expect(d.enemy.alert).toBe(false);
  });

  it('lower the bow without shooting when the player hides mid-draw', () => {
    const d = new Duel('fairy', island(), { x: 28.5, z: 15.5 }, { x: 20.5, z: 15.5 }, archerSpot);
    d.run(0.5);
    d.pad.tapped.add('KeyQ');
    d.run(1);
    expect(d.arrows.count).toBe(0);
  });

  it('do not chase, and walk back to their post when knocked away', () => {
    const d = new Duel('human', island(wall(24, 2)), { x: 28.5, z: 15.5 }, { x: 20.5, z: 15.5 }, archerSpot);
    d.run(3);
    expect(d.enemy.pos.x).toBeCloseTo(20.5, 1);
    d.enemy.takeHit(1, 19.5, 15.5);
    d.run(0.3);
    expect(d.enemy.pos.x).toBeGreaterThan(21);
    d.run(5);
    expect(Math.abs(d.enemy.pos.x - 20.5)).toBeLessThan(0.35);
  });

  it('punch for 1 heart when the player is close', () => {
    const d = new Duel('human', island(), { x: 21.5, z: 15.5 }, { x: 20.5, z: 15.5 }, archerSpot);
    expect(d.until(() => d.player.hearts < 10)).toBe(true);
    expect(d.player.hearts).toBe(9);
    expect(d.enemy.maxHearts).toBe(8);
  });
});

describe('arrows', () => {
  it('fly over a bunny that is well above their path', () => {
    const d = new Duel('bunny', island(), { x: 28.5, z: 15.5 }, { x: 20.5, z: 15.5 }, archerSpot);
    const from = new THREE.Vector3(20.5, FLOOR + 1.1, 15.5);
    const aim = new THREE.Vector3(28.5, FLOOR + 1.1, 15.5);

    d.player.pos.y = FLOOR + 5;
    d.arrows.shoot(from, aim, 20.5, 15.5);
    for (let n = 0; n < 120; n++) d.arrows.update(DT, d.player);
    expect(d.player.hearts).toBe(4);

    // The same line does hit a bunny sitting on the ground, if aimed at its chest.
    d.player.pos.y = FLOOR;
    d.arrows.shoot(from, new THREE.Vector3(28.5, FLOOR + 0.3, 15.5), 20.5, 15.5);
    for (let n = 0; n < 120; n++) d.arrows.update(DT, d.player);
    expect(d.player.hearts).toBe(2);
  });

  it('cannot skip through a one-tile wall at a very low frame rate', () => {
    const d = new Duel('human', island(wall(24, 2)), { x: 28.5, z: 15.5 }, { x: 20.5, z: 15.5 }, archerSpot);
    d.arrows.shoot(new THREE.Vector3(20.5, FLOOR + 1.1, 15.5), new THREE.Vector3(28.5, FLOOR + 0.9, 15.5), 20.5, 15.5);
    for (let n = 0; n < 4; n++) d.arrows.update(0.4, d.player);
    expect(d.player.hearts).toBe(10);
    expect(d.arrows.count).toBe(0);
  });
});

describe('dormant enemies', () => {
  it('do nothing and cannot be hit until the level reaches them', () => {
    const d = new Duel('human', island(), { x: 26.5, z: 15.5 }, { x: 20.5, z: 15.5 }, { kind: 'archer', minLevel: 3 });
    expect(d.enemy.active).toBe(false);
    expect(d.enemy.group.visible).toBe(false);
    d.run(5);
    expect(d.player.hearts).toBe(10);
    expect(d.enemy.alert).toBe(false);
    d.enemy.takeHit(100, 19, 15.5);
    expect(d.enemy.hearts).toBe(8);
    expect(d.enemy.alive).toBe(true);

    expect(d.enemy.wake(2)).toBe(false);
    expect(d.enemy.wake(3)).toBe(true);
    expect(d.enemy.wake(3)).toBe(false);
    expect(d.enemy.active).toBe(true);
    expect(d.enemy.group.visible).toBe(true);
    expect(d.until(() => d.player.hearts < 10)).toBe(true);
  });

  it('settle quietly to match a loaded level', () => {
    const d = new Duel('human', island(), { x: 26.5, z: 15.5 }, { x: 20.5, z: 15.5 }, { kind: 'archer', minLevel: 3 });
    d.enemy.settle(5);
    expect(d.enemy.active).toBe(true);
    d.enemy.settle(0);
    expect(d.enemy.active).toBe(false);
    expect(d.enemy.group.visible).toBe(false);
  });
});

describe('regular bad guys', () => {
  it('are alert while chasing, and not once they have turned for home', () => {
    const d = new Duel('fairy', island(), { x: 24.5, z: 15.5 }, { x: 20.5, z: 15.5 }, regularSpot);
    d.run(0.2);
    expect(d.enemy.alert).toBe(true);
    d.pad.tapped.add('KeyQ');
    d.frame();
    expect(d.player.hidden).toBe(true);
    d.run(3);
    expect(d.enemy.alert).toBe(false);
  });

  it('keep their numbers: 9 hearts, punch for 1', () => {
    const d = new Duel('human', island(), { x: 21.5, z: 15.5 }, { x: 20.5, z: 15.5 }, regularSpot);
    expect(d.enemy.maxHearts).toBe(9);
    expect(d.enemy.hearts).toBe(9);
    expect(d.until(() => d.player.hearts < 10)).toBe(true);
    expect(d.player.hearts).toBe(9);
  });

  it('testers are still slower to notice you', () => {
    const d = new Duel('human', island(), { x: 26.0, z: 15.5 }, { x: 20.5, z: 15.5 }, { kind: 'regular', tester: true });
    d.run(1);
    expect(d.enemy.alert).toBe(false);
  });
});
