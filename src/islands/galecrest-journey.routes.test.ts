import { describe, expect, it } from 'vitest';
import { Arrows } from '../arrows';
import { Enemy, EnemyKind } from '../enemy';
import { FORMS, FormId } from '../forms';
import type { Controls } from '../input';
import type { EnemySpot } from '../layout';
import { Particles } from '../particles';
import { Pilot } from '../pilot';
import { Player } from '../player';
import { World } from '../world';

// The whole way in and the way off, driven by a real Player: the Court, under the Windbreak, up the
// Ramp, and (from the east hub, which the Gap parts from the west one) the glide to Kestrel Rock.

const world = new World();
const { layout } = world;
const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });

describe('Galecrest, from Hollowfen\'s rim to the hub', () => {
  it('lets one pilot hop and fly to the Court as a Bunny, swim under the Windbreak as an Axolotl and climb the Ramp as a Human', () => {
    const p = new Pilot(world, 'bunny', { x: 1327.5, z: 30.5 });
    const where = (what: string) => `${what}: ${p.describe()}`;
    expect(p.hopThenFly(at(1353, 26), { seconds: 25 }), where('to the Court')).toBe(true);
    expect(p.y, where('on the Court')).toBeCloseTo(5, 6);
    expect(p.x, where('west of the Windbreak')).toBeLessThan(1361);
    p.shift('axolotl');
    expect(p.walk(at(1355, 30), { seconds: 15 }), where('to the bank')).toBe(true);
    expect(p.swim(at(1358, 30), { seconds: 15 }), where('into the Sluice')).toBe(true);
    expect(p.swim(at(1361, 30), { under: true, seconds: 20 }), where('under the wall')).toBe(true);
    expect(p.player.hidden, where('hidden')).toBe(true);
    expect(p.swim(at(1364, 30), { under: true, seconds: 20 }), where('past the wall')).toBe(true);
    expect(p.surface(), where('surface')).toBe(true);
    expect(p.hop(at(1368, 30), { seconds: 10 }), where('onto the Yard')).toBe(true);
    expect(p.y, where('on the Yard')).toBeCloseTo(5, 1);
    p.shift('human');
    expect(p.walk(at(1403, 30), { seconds: 60 }), where('up the Ramp')).toBe(true);
    expect(p.y, where('on the hub')).toBeCloseTo(12, 1);
    expect(p.fell).toBe(false);
  });
});

describe('Galecrest, from the east hub to Kestrel Rock', () => {
  it('lets a Human of level 10 glide from the hub\'s east edge onto the rock beside gc-end', () => {
    const p = new Pilot(world, 'human', at(1526, 30));
    p.player.level = 10;
    expect(p.glide({ x: 1577.5, z: 31.5 }, { seconds: 30 }), p.describe()).toBe(true);
    expect(p.fell).toBe(false);
    expect(p.y).toBeCloseTo(1, 1);
    const end = layout.checkpoints.find((c) => c.id === 'gc-end')!;
    expect(Math.hypot(p.x - end.x, p.z - end.z), p.describe()).toBeLessThan(5);
  });
});

// ---- the Court's guards, woken at level 9, as in sneak.test.ts -----------------------------

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


describe('Galecrest the Sluice', () => {
  const GUARD = { x: 1358.5, z: 27.5 };
  it('hides an Axolotl under the wall from the Court\'s guard, and not on the bank', () => {
    const guard = layout.enemies.find((e) => e.x === GUARD.x && e.z === GUARD.z)!;
    expect(guard).toBeDefined();
    const r = new Rig('axolotl', at(1355, 30));
    r.run(2); // settle onto the Court
    const foe = r.add(guard);
    foe.wake(9);
    r.run(2);
    expect(foe.alert, 'noticed on the bank').toBe(true);
    r.player.place(1361.5, 30.5);
    r.run(1);
    expect(r.player.hidden, 'hidden under the wall').toBe(true);
    expect(foe.alert, 'the chase dropped').toBe(false);
    r.player.place(1355.5, 30.5);
    r.run(2);
    expect(r.player.hidden).toBe(false);
    expect(foe.alert, 'noticed again').toBe(true);
  });
});
