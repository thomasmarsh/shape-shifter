import { describe, expect, it, vi } from 'vitest';
import { Arrows } from './arrows';
import { Enemy, EnemyKind } from './enemy';
import { FORMS, FormId, PHYSICS } from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
import { Player } from './player';
import { Island, Kind, World } from './world';

// The Snake: holes (tangles it fits through), its tall step, and the venom bite.

const FLOOR = 2;
const DT = 1 / 60;
const HOLE = PHYSICS.holeGap;

class Pad implements Controls {
  tapped = new Set<string>();
  dir = { x: 0, z: 0 };
  held(code: string): boolean {
    return this.tapped.has(code);
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

type Terrain = Parameters<Island['build']>[0];

function island(extra: (t: Terrain) => void = () => {}): Island {
  return {
    id: 'test',
    name: 'Test',
    build(t) {
      t.rect(0, 0, 60, 30, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
      extra(t);
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

/** A band of tangle tiles 20 to 22 across the whole width, with the given gap. */
const band = (gap?: number) => (t: Terrain) => t.rect(20, 0, 22, 30, (i, j) => t.setTangle(i, j, gap));

/** Tile 20 is a hole at floor level, then 21 to 22 are holes 0.75 higher, then plain high ground. */
const stepped = (t: Terrain) => {
  t.rect(21, 0, 60, 30, (i, j) => t.set(i, j, FLOOR + 0.75, Kind.Grass));
  t.rect(20, 0, 22, 30, (i, j) => t.setTangle(i, j, HOLE));
};

class Rig {
  readonly world: World;
  readonly player: Player;
  readonly pad = new Pad();
  readonly enemies: Enemy[] = [];

  constructor(form: FormId, isl: Island, at = { x: 6.5, z: 15.5 }) {
    this.world = new World([isl]);
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

  until(done: () => boolean, seconds = 10): boolean {
    for (let n = 0; n < seconds / DT && !done(); n++) this.frame();
    return done();
  }

  bite(): void {
    this.pad.tapped.add('KeyJ');
    this.frame();
  }
}

const east = { x: 1, z: 0 };
const west = { x: -1, z: 0 };

/** Walk east from x 6.5 and report whether the form got past the band. */
function crosses(form: FormId, isl: Island): boolean {
  const rig = new Rig(form, isl);
  rig.pad.dir = east;
  return rig.until(() => rig.player.pos.x > 26, 12);
}

describe('holes', () => {
  it('the Snake is a playable level 8 form', () => {
    const snake = FORMS.find((f) => f.id === 'snake')!;
    expect(snake.playable).toBe(true);
    expect(snake.level).toBe(8);
  });

  it('lets the Snake and the Ant through a flat hole, and nobody else', () => {
    const hole = island(band(HOLE));
    expect(crosses('snake', hole)).toBe(true);
    expect(crosses('ant', hole)).toBe(true);
    expect(crosses('human', hole)).toBe(false);
    expect(crosses('bunny', hole)).toBe(false);
  });

  it('keeps a plain tangle for the Ant alone', () => {
    const tangle = island(band());
    expect(crosses('ant', tangle)).toBe(true);
    expect(crosses('snake', tangle)).toBe(false);
  });

  it('cannot jump or shift inside a hole', () => {
    const rig = new Rig('snake', island(band(HOLE)), { x: 21.5, z: 15.5 });
    rig.run(0.2);
    rig.pad.tapped.add('Space');
    rig.frame();
    rig.run(0.2);
    expect(rig.player.pos.y).toBe(FLOOR);
    expect(rig.player.canShiftTo(0)).toBe('cramped');
  });

  it('jumps 1.2 up outside a hole', () => {
    const rig = new Rig('snake', island());
    rig.pad.tapped.add('Space');
    let top = 0;
    for (let n = 0; n < 90; n++) {
      rig.frame();
      top = Math.max(top, rig.player.pos.y - FLOOR);
    }
    expect(top).toBeGreaterThan(1.1);
    expect(top).toBeLessThan(1.3);
  });
});

describe('the Snake step', () => {
  it('takes a 0.75 rise between holes that stops the Ant', () => {
    expect(crosses('snake', island(stepped))).toBe(true);
    expect(crosses('ant', island(stepped))).toBe(false);
  });

  it('lets the Ant come down the same step', () => {
    const rig = new Rig('ant', island(stepped), { x: 22.5, z: 15.5 });
    rig.pad.dir = west;
    expect(rig.until(() => rig.player.pos.x < 18, 12)).toBe(true);
  });

  it('changes nothing for the other forms', () => {
    const ledge = island((t) => t.rect(20, 0, 60, 30, (i, j) => t.set(i, j, FLOOR + 0.75, Kind.Grass)));
    expect(crosses('human', ledge)).toBe(false);
    expect(crosses('ant', ledge)).toBe(false);
    expect(crosses('snake', ledge)).toBe(true);
  });
});

describe('the bite', () => {
  it.each(['regular', 'sword'] as const)('makes a %s bad guy faint for 20 seconds, then it wakes as it was', (kind) => {
    const rig = new Rig('snake', island(), { x: 10.5, z: 15.5 });
    const e = rig.addEnemy(kind, 11.3);
    rig.bite();
    expect(e.fainted).toBe(true);
    const hearts = e.hearts;
    rig.run(19);
    expect(e.fainted).toBe(true);
    expect(e.pos.x).toBeCloseTo(11.3, 1);
    rig.run(1.2);
    expect(e.fainted).toBe(false);
    expect(e.hearts).toBe(hearts);
    expect(e.alive).toBe(true);
  });

  it('lands no blow and is not after the player while fainted', () => {
    const rig = new Rig('snake', island(), { x: 10.5, z: 15.5 });
    const e = rig.addEnemy('sword', 11.3);
    rig.run(0.3);
    expect(e.alert).toBe(true);
    rig.bite();
    expect(e.alert).toBe(false);
    const hearts = rig.player.hearts;
    rig.run(10);
    expect(rig.player.hearts).toBe(hearts);
    expect(e.alert).toBe(false);
  });

  it('still takes a sword hit and can die', () => {
    const rig = new Rig('snake', island(), { x: 10.5, z: 15.5 });
    const e = rig.addEnemy('regular', 11.3);
    rig.bite();
    e.takeHit(1, 10.5, 15.5);
    expect(e.hearts).toBe(e.maxHearts - 1);
    expect(e.fainted).toBe(true);
    e.takeHit(99, 10.5, 15.5);
    expect(e.alive).toBe(false);
  });

  it('a second bite restarts the count', () => {
    const rig = new Rig('snake', island(), { x: 10.5, z: 15.5 });
    const e = rig.addEnemy('regular', 11.3);
    rig.bite();
    rig.run(15);
    rig.bite();
    rig.run(10);
    expect(e.fainted).toBe(true);
    rig.run(11);
    expect(e.fainted).toBe(false);
  });

  it('wakes when reset, as on a respawn', () => {
    const rig = new Rig('snake', island(), { x: 10.5, z: 15.5 });
    const e = rig.addEnemy('regular', 11.3);
    rig.bite();
    e.reset();
    expect(e.fainted).toBe(false);
  });

  it('waits 1.5 seconds between bites', () => {
    const rig = new Rig('snake', island(), { x: 10.5, z: 15.5 });
    const e = rig.addEnemy('regular', 11.3);
    const spy = vi.spyOn(e, 'faint');
    rig.bite();
    rig.run(1.0);
    rig.bite();
    expect(spy).toHaveBeenCalledTimes(1);
    rig.run(0.6);
    rig.bite();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('does nothing out of reach', () => {
    const rig = new Rig('snake', island(), { x: 10.5, z: 15.5 });
    const e = rig.addEnemy('regular', 12.8);
    rig.bite();
    expect(e.fainted).toBe(false);
  });
});
