import { describe, expect, it } from 'vitest';
import { Arrows } from './arrows';
import { Enemy, EnemyKind } from './enemy';
import { FORMS, FormId } from './forms';
import type { Controls } from './input';
import type { EnemySpot } from './layout';
import { Particles } from './particles';
import { Player } from './player';
import { Island, Kind, World } from './world';

// Only the Snake is quiet: an idle bad guy notices it in its front half only.

const FLOOR = 2;
const DT = 1 / 60;

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

const flat: Island = {
  id: 'test',
  name: 'Test',
  build(t) {
    t.rect(0, 0, 60, 30, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
    return { spawn: { x: 2.5, z: 15.5 } };
  },
};

class Rig {
  readonly player: Player;
  readonly pad = new Pad();
  readonly enemies: Enemy[] = [];

  constructor(
    readonly world: World,
    form: FormId,
    at: { x: number; z: number },
  ) {
    this.player = new Player(world, new Particles(), { onFell: () => {}, onDied: () => {}, onAte: () => {}, onHome: () => {} });
    this.player.level = 9;
    const index = FORMS.findIndex((f) => f.id === form);
    if (index !== 0) expect(this.player.shiftTo(index)).toBe(true);
    this.player.hearts = this.player.form.maxHearts;
    this.player.place(at.x, at.z);
  }

  add(x: number, z: number, spot: Partial<EnemySpot> & { kind?: EnemyKind } = {}): Enemy {
    const particles = new Particles();
    const e = new Enemy(this.world, particles, new Arrows(this.world, particles), { x, z }, { tester: false, ...spot });
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
}

const rig = (form: FormId, at: { x: number; z: number }) => new Rig(new World([flat]), form, at);

// Guards stand at x 20.5 and face west, so x 24.5 is behind and x 16.5 in front.
const POST = { x: 20.5, z: 15.5 };
const BEHIND = { x: 24.5, z: 15.5 };
const FRONT = { x: 16.5, z: 15.5 };

describe.each<EnemyKind>(['regular', 'archer'])('a %s guard facing west', (kind) => {
  it('does not notice a Snake behind it, but does one in front', () => {
    const back = rig('snake', BEHIND);
    const a = back.add(POST.x, POST.z, { kind });
    back.run(4);
    expect(a.alert).toBe(false);
    const front = rig('snake', FRONT);
    const b = front.add(POST.x, POST.z, { kind });
    front.run(4);
    expect(b.alert).toBe(true);
  });

  it('notices a Human behind it', () => {
    const r = rig('human', BEHIND);
    const e = r.add(POST.x, POST.z, { kind });
    r.run(4);
    expect(e.alert).toBe(true);
  });
});

describe('facing', () => {
  it('a spot with facing e looks east: a Snake to its west is unnoticed, to its east is noticed', () => {
    const west = rig('snake', FRONT);
    const a = west.add(POST.x, POST.z, { facing: 'e' });
    west.run(4);
    expect(a.alert).toBe(false);
    const east = rig('snake', BEHIND);
    const b = east.add(POST.x, POST.z, { facing: 'e' });
    east.run(4);
    expect(b.alert).toBe(true);
  });

  it('turns back to its post facing after a chase and the walk home', () => {
    const r = rig('snake', FRONT);
    const e = r.add(POST.x, POST.z);
    r.run(1);
    expect(e.alert).toBe(true);
    // It chases west, so it walks home facing east.
    r.player.place(58.5, 15.5);
    r.run(8);
    expect(e.alert).toBe(false);
    expect(Math.hypot(e.pos.x - POST.x, e.pos.z - POST.z)).toBeLessThan(0.5);
    // Back at its post it faces west again, so a Snake behind it goes unnoticed.
    r.player.place(BEHIND.x, BEHIND.z);
    r.run(4);
    expect(e.alert).toBe(false);
  });
});

describe('the bite', () => {
  it('from behind on one guard does not wake a second guard that is facing away', () => {
    const r = rig('snake', { x: 21.4, z: 15.5 });
    const a = r.add(20.5, 15.5);
    const b = r.add(17.5, 15.5);
    // Face west, then bite the first guard from behind.
    r.pad.dir = { x: -1, z: 0 };
    r.run(0.1);
    r.pad.dir = { x: 0, z: 0 };
    r.pad.tapped.add('KeyJ');
    r.frame();
    expect(a.fainted).toBe(true);
    r.run(2);
    expect(b.alert).toBe(false);
  });
});

describe('Coilstone', () => {
  it('Foot guards do not notice a Snake at the Coil mouth', () => {
    const world = new World();
    const r = new Rig(world, 'snake', { x: 1101.5, z: 30.5 });
    const foot = world.layout.enemies.filter((e) => Math.abs(e.x - 1098.5) < 0.1 && (e.z === 28.5 || e.z === 32.5));
    expect(foot).toHaveLength(2);
    const guards = foot.map((e) => r.add(e.x, e.z, e));
    r.player.level = 8;
    for (const g of guards) g.wake(8);
    r.run(5);
    for (const g of guards) expect(g.alert).toBe(false);
    // The same spot is noticed by a Human, so the guards are awake and in range.
    const human = new Rig(world, 'human', { x: 1101.5, z: 30.5 });
    const awake = foot.map((e) => human.add(e.x, e.z, e));
    for (const g of awake) g.wake(8);
    human.run(5);
    expect(awake.some((g) => g.alert)).toBe(true);
  });
});
