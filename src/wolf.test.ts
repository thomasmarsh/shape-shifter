import { describe, expect, it } from 'vitest';
import { Arrows } from './arrows';
import { Enemy, EnemyKind } from './enemy';
import { FORMS, FormId } from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
import { Player } from './player';
import { Island, Kind, World } from './world';

// The Winter Wolf: a plain bite, 2 hearts and no faint.

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

function island(): Island {
  return {
    id: 'test',
    name: 'Test',
    build(t) {
      t.rect(0, 0, 60, 30, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

class Rig {
  readonly world: World;
  readonly player: Player;
  readonly pad = new Pad();
  readonly enemies: Enemy[] = [];

  constructor(form: FormId, at = { x: 10.5, z: 15.5 }) {
    this.world = new World([island()]);
    this.player = new Player(this.world, new Particles(), {
      onFell: () => {},
      onDied: () => {},
      onAte: () => {},
      onHome: () => {},
    });
    const index = FORMS.findIndex((f) => f.id === form);
    this.player.level = 9;
    if (index !== 0) expect(this.player.shiftTo(index)).toBe(true);
    this.player.hearts = this.player.form.maxHearts;
    this.player.place(at.x, at.z);
  }

  addEnemy(kind: EnemyKind, x: number, z = 15.5): Enemy {
    const particles = new Particles();
    const e = new Enemy(this.world, particles, new Arrows(this.world, particles), { x, z }, { tester: false, kind });
    this.enemies.push(e);
    return e;
  }

  frame(): void {
    this.player.update(DT, this.pad, this.enemies);
    for (const e of this.enemies) e.update(DT, this.player, this.enemies);
    this.pad.tapped.clear();
  }

  run(seconds: number): void {
    for (let n = 0; n < seconds / DT; n++) this.frame();
  }

  /** Bite with both put back in place, since blows knock them about. */
  bite(e?: Enemy): void {
    if (e) {
      this.player.place(10.5, 15.5);
      e.pos.x = 11.3;
      e.pos.z = 15.5;
    }
    this.pad.tapped.add('KeyJ');
    this.frame();
  }
}

describe('the Wolf bite', () => {
  it.each(['regular', 'sword'] as const)('takes 2 hearts from a %s bad guy', (kind) => {
    const rig = new Rig('wolf');
    const e = rig.addEnemy(kind, 11.3);
    const before = e.hearts;
    rig.bite();
    expect(e.hearts).toBe(before - 2);
  });

  it('beats a heavy sword bad guy in 3 bites', () => {
    const rig = new Rig('wolf');
    const e = rig.addEnemy('sword', 11.3);
    for (let n = 0; n < 3; n++) {
      expect(e.alive).toBe(true);
      rig.bite(e);
      rig.run(0.7);
    }
    expect(e.alive).toBe(false);
  });

  it('faints nobody', () => {
    const rig = new Rig('wolf');
    const e = rig.addEnemy('regular', 11.3);
    rig.bite();
    expect(e.hearts).toBe(7);
    expect(e.fainted).toBe(false);
  });

  it('waits 0.6 seconds between bites', () => {
    const rig = new Rig('wolf');
    const e = rig.addEnemy('regular', 11.3);
    rig.bite();
    rig.run(0.4);
    rig.bite(e);
    expect(e.hearts).toBe(7);
    rig.run(0.3);
    rig.bite(e);
    expect(e.hearts).toBe(5);
  });

  it('does nothing out of reach', () => {
    const rig = new Rig('wolf');
    const e = rig.addEnemy('regular', 12.8);
    rig.bite();
    expect(e.hearts).toBe(9);
  });

  it('is in the form table, and the Snake bite is unchanged', () => {
    expect(FORMS.find((f) => f.id === 'wolf')!.bite).toEqual({ reach: 1.0, cooldown: 0.6, faint: 0, damage: 2 });
    expect(FORMS.find((f) => f.id === 'snake')!.bite).toEqual({ reach: 1.0, cooldown: 1.5, faint: 20, damage: 0 });
  });
});
