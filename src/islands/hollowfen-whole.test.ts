import { describe, expect, it } from 'vitest';
import { Arrows } from '../arrows';
import { Enemy, EnemyKind } from '../enemy';
import { FORMS, FormId } from '../forms';
import type { Controls } from '../input';
import type { EnemySpot } from '../layout';
import { Particles } from '../particles';
import { Player } from '../player';
import { World } from '../world';
import { exploreIn, expectUniqueIds, expectWayOut, respawnOf } from './testkit';

// The checks that span both halves of Hollowfen.

const world = new World();
const { layout } = world;
const TEN: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake', 'axolotl'];
const mine = (id: string) => id.startsWith('hf-') || id === 'hollowfen';

describe('Hollowfen as a whole', () => {
  const all = layout.checkpoints.filter((c) => mine(c.id));

  it('has no id clash across both halves and the world', () => {
    expect(all).toHaveLength(8);
    expectUniqueIds(layout.checkpoints, layout.bread, layout.puzzles, layout.hints);
    expect(layout.bread.filter((b) => b.id.startsWith('hf-')).length).toBeGreaterThan(0);
  });

  it('lets the ten on easy get from every respawn spot back to the Landing', () => {
    const run = exploreIn(world, { x0: 1125, x1: 1336 });
    const landing = respawnOf(all.find((c) => c.id === 'hollowfen')!);
    expectWayOut(run, all, landing, TEN, 'easy');
  }, 60000);
});

// ---- the guards, woken at level 9, as in sneak.test.ts ------------------------------------

const DT = 1 / 60;
class Pad implements Controls {
  held = () => false;
  hit = () => false;
  move = () => ({ x: 0, y: 0 });
  anyMoveHit = () => false;
}

class Rig {
  readonly player: Player;
  readonly enemies: Enemy[] = [];
  constructor(form: FormId, at: { x: number; z: number }) {
    this.player = new Player(world, new Particles(), { onFell: () => {}, onDied: () => {}, onAte: () => {}, onHome: () => {} });
    this.player.level = 9;
    const index = FORMS.findIndex((f) => f.id === form);
    if (index !== 0) expect(this.player.shiftTo(index)).toBe(true);
    this.player.hearts = this.player.form.maxHearts;
    this.player.place(at.x, at.z);
  }
  add(spot: EnemySpot & { kind?: EnemyKind }): Enemy {
    const particles = new Particles();
    const e = new Enemy(world, particles, new Arrows(world, particles), { x: spot.x, z: spot.z }, { ...spot, tester: false });
    this.enemies.push(e);
    return e;
  }
  run(seconds: number): void {
    const pad = new Pad();
    for (let n = 0; n < seconds / DT; n++) {
      this.player.update(DT, pad, this.enemies);
      for (const e of this.enemies) e.update(DT, this.player, this.enemies);
    }
  }
}

describe('Hollowfen the Mound guards', () => {
  const MOUTH = { x: 1295.5, z: 44.5 };
  const guards = layout.enemies.filter((e) => Math.abs(e.x - 1291.5) < 0.1 && (e.z === 42.5 || e.z === 46.5));

  it('do not notice a Snake at the burrow mouth, and do notice a Human', () => {
    expect(guards).toHaveLength(2);
    const snake = new Rig('snake', MOUTH);
    snake.run(8); // settle onto the ground first (placed at the top of the world)
    expect(snake.player.pos.y).toBeCloseTo(12, 0);
    const awake = guards.map((g) => snake.add(g));
    for (const g of awake) g.wake(9);
    snake.run(5);
    for (const g of awake) expect(g.alert).toBe(false);
    // A Human cannot stand on the mouth itself (the tangle there is a roof for it: it is lifted to the top
    // of the world), so the control is the open tile just west of the tangle, a tile nearer to the guards.
    const human = new Rig('human', { x: 1293.5, z: 44.5 });
    human.run(8);
    const foes = guards.map((g) => human.add(g));
    for (const g of foes) g.wake(9);
    human.run(5);
    expect(foes.some((g) => g.alert)).toBe(true);
  });
});

describe('Hollowfen the Well', () => {
  it('hides an Axolotl under a hollow of the ring, and not on the open shore', () => {
    const r = new Rig('axolotl', { x: 1307.5, z: 17.5 });
    r.run(1);
    expect(r.player.hidden).toBe(true);
    r.player.place(1304.5, 17.5);
    r.run(1);
    expect(r.player.hidden).toBe(false);
  });
});
