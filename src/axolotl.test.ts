import { describe, expect, it } from 'vitest';
import { Arrows } from './arrows';
import { Enemy } from './enemy';
import { FORMS, FormId, KELP_DEEP, PHYSICS } from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
import { Player } from './player';
import { Island, Kind, World } from './world';

// The Axolotl: five hearts that regrow, no dive limit, hollows and holes to hide in.

const BANK = 6;
const LEVEL = 6;
const DT = 1 / 60;

class Pad implements Controls {
  tapped = new Set<string>();
  down = new Set<string>();
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

type Terrain = Parameters<Island['build']>[0];

/** A bank at 6, a pool from column 10 to 40 with its bed `bed` tiles under the surface, a tangle band at 50 to 52. */
function island(bed: number, extra: (t: Terrain) => void = () => {}, gap?: number): Island {
  return {
    id: 'test',
    name: 'Test',
    build(t) {
      t.rect(0, 0, 70, 30, (i, j) => t.set(i, j, BANK, Kind.Grass));
      t.rect(10, 5, 40, 25, (i, j) => {
        t.set(i, j, LEVEL - bed, Kind.Sand);
        t.setWater(i, j, true, LEVEL);
      });
      if (gap !== undefined) t.rect(50, 0, 52, 30, (i, j) => t.setTangle(i, j, gap));
      extra(t);
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

const hollows = (t: Terrain) => t.rect(18, 5, 20, 25, (i, j) => t.setHollow(i, j));

class Rig {
  readonly world: World;
  readonly player: Player;
  readonly pad = new Pad();
  readonly enemies: Enemy[] = [];

  constructor(form: FormId, isl: Island, at = { x: 5.5, z: 15.5 }, level = 9) {
    this.world = new World([isl]);
    this.player = new Player(this.world, new Particles(), {
      onFell: () => {},
      onDied: () => {},
      onAte: () => {},
      onHome: () => {},
    });
    this.player.level = level;
    const index = FORMS.findIndex((f) => f.id === form);
    if (index !== 0) expect(this.player.shiftTo(index)).toBe(true);
    this.player.hearts = this.player.form.maxHearts;
    this.player.place(at.x, at.z);
  }

  addEnemy(x: number, z = 15.5): Enemy {
    const particles = new Particles();
    const e = new Enemy(this.world, particles, new Arrows(this.world, particles), { x, z }, { tester: false, kind: 'regular' });
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
}

const east = { x: 1, z: 0 };
const key9 = (rig: Rig) => rig.player.shiftTo(9);

describe('the Axolotl as a form', () => {
  it('shifts on key 9 at level 9 and not at level 8', () => {
    const at9 = new Rig('human', island(4));
    expect(at9.player.canShiftTo(9)).toBe('ok');
    expect(key9(at9)).toBe(true);
    expect(at9.player.form.id).toBe('axolotl');
    const at8 = new Rig('human', island(4), undefined, 8);
    expect(at8.player.canShiftTo(9)).toBe('locked');
    expect(key9(at8)).toBe(false);
  });

  it('has five hearts and no sword', () => {
    const rig = new Rig('axolotl', island(4));
    expect(rig.player.hearts).toBe(5);
    const foe = rig.addEnemy(5.5 + 1.2);
    const before = foe.hearts;
    rig.pad.tapped.add('KeyJ');
    rig.frame();
    rig.run(0.5);
    expect(foe.hearts).toBe(before);
  });

  it('regrows a heart every 3 seconds up to 5, and keeps them in the Human', () => {
    const rig = new Rig('axolotl', island(4));
    rig.player.hearts = 1;
    rig.run(2.9);
    expect(rig.player.hearts).toBe(1);
    rig.run(0.2);
    expect(rig.player.hearts).toBe(2);
    rig.run(30);
    expect(rig.player.hearts).toBe(5);
    rig.player.hearts = 3;
    expect(rig.player.shiftTo(0)).toBe(true);
    rig.run(10);
    expect(rig.player.hearts).toBe(3);
  });

  it('restarts the timer on each shift into it', () => {
    const rig = new Rig('axolotl', island(4));
    rig.player.hearts = 1;
    rig.run(2);
    rig.player.shiftTo(0);
    rig.player.shiftTo(9);
    rig.run(2);
    expect(rig.player.hearts).toBe(1);
    rig.run(1.2);
    expect(rig.player.hearts).toBe(2);
  });
});

describe('diving', () => {
  it('reaches a bed 8 deep, where the Human stops at 4', () => {
    const deep = island(8);
    const a = new Rig('axolotl', deep, { x: 20.5, z: 15.5 });
    a.pad.down.add('ShiftLeft');
    a.run(6);
    expect(a.player.pos.y).toBeLessThan(LEVEL - 7.5);
    const h = new Rig('human', deep, { x: 20.5, z: 15.5 });
    h.pad.down.add('ShiftLeft');
    h.run(6);
    expect(h.player.pos.y).toBeGreaterThan(LEVEL - 5);
  });
});

describe('hollows', () => {
  const swimEast = (form: FormId): Rig => {
    const rig = new Rig(form, island(4, hollows), { x: 14.5, z: 15.5 });
    rig.pad.dir = east;
    rig.pad.down.add('ShiftLeft');
    rig.run(1.5);
    return rig;
  };

  it('lets the Axolotl swim under the row and come up on the far side', () => {
    const rig = swimEast('axolotl');
    expect(rig.player.pos.x).toBeGreaterThan(18);
    expect(rig.until(() => rig.player.pos.x > 24, 8)).toBe(true);
    rig.pad.down.delete('ShiftLeft');
    rig.pad.dir = { x: 0, z: 0 };
    rig.pad.down.add('Space');
    rig.run(3);
    expect(rig.player.pos.y).toBeGreaterThan(LEVEL - 1);
  });

  it('holds it under the roof: no surfacing, jumping or shifting', () => {
    const rig = new Rig('axolotl', island(4, hollows), { x: 19.5, z: 15.5 });
    rig.run(1);
    rig.pad.down.add('Space');
    rig.run(1);
    expect(rig.player.pos.y).toBeLessThan(LEVEL - 4 + 0.1);
    expect(rig.player.canShiftTo(0)).toBe('cramped');
    expect(rig.player.shiftTo(0)).toBe(false);
  });

  it('stops everyone else at the hollow', () => {
    for (const form of ['mermaid', 'human', 'snake', 'ant'] as FormId[]) {
      const rig = swimEast(form);
      rig.run(6);
      expect(rig.player.pos.x, form).toBeLessThan(18.1);
    }
  });
});

describe('holes', () => {
  const crosses = (gap: number): boolean => {
    const rig = new Rig('axolotl', island(4, undefined, gap), { x: 44.5, z: 15.5 });
    rig.pad.dir = east;
    return rig.until(() => rig.player.pos.x > 54, 12);
  };

  it('walks through a hole and not through a root tangle', () => {
    expect(crosses(PHYSICS.holeGap)).toBe(true);
    expect(crosses(0.25)).toBe(false);
  });
});

describe('hiding', () => {
  it('drops the chase under a hollow and in a hole, and is noticed again outside', () => {
    const rig = new Rig('axolotl', island(4, hollows, PHYSICS.holeGap), { x: 12.5, z: 15.5 });
    const foe = rig.addEnemy(8.5, 15.5);
    rig.run(1);
    expect(foe.alert).toBe(true);
    expect(rig.player.hidden).toBe(false);
    rig.player.place(19.5, 15.5);
    rig.run(1);
    expect(rig.player.hidden).toBe(true);
    expect(foe.alert).toBe(false);
    rig.player.place(12.5, 15.5);
    rig.run(1);
    expect(foe.alert).toBe(true);
  });

  it('drops the chase inside a hole too', () => {
    const rig = new Rig('axolotl', island(4, undefined, PHYSICS.holeGap), { x: 54.5, z: 15.5 });
    const foe = rig.addEnemy(58.5);
    rig.run(1);
    expect(foe.alert).toBe(true);
    rig.player.place(51.5, 15.5);
    rig.run(1);
    expect(rig.player.hidden).toBe(true);
    expect(foe.alert).toBe(false);
    rig.player.place(54.5, 15.5);
    rig.run(1);
    expect(foe.alert).toBe(true);
  });
});

describe('deep kelp', () => {
  const kelp = (t: Terrain) => t.rect(18, 5, 20, 25, (i, j) => t.setKelp(i, j, KELP_DEEP));
  const passes = (form: FormId): boolean => {
    const rig = new Rig(form, island(8, kelp), { x: 14.5, z: 15.5 });
    rig.pad.dir = east;
    rig.pad.down.add('ShiftLeft');
    return rig.until(() => rig.player.pos.x > 23, 10);
  };

  it('still passes the Mermaid, and the Axolotl too', () => {
    expect(passes('mermaid')).toBe(true);
    expect(passes('axolotl')).toBe(true);
    expect(passes('human')).toBe(false);
  });
});
