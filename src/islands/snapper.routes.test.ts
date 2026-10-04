import { describe, expect, it } from 'vitest';
import { Arrows } from '../arrows';
import { Enemy } from '../enemy';
import { FORMS, FormId, SNAPPER, SNAPPER_LEVEL } from '../forms';
import type { Controls } from '../input';
import { Particles } from '../particles';
import { Player } from '../player';
import { WaterPowers } from '../waterpowers';
import { World } from '../world';

// The Snappers in their three real pools, with a real Player and real water powers.

const world = new World();
const DT = 1 / 60;
const at = (x: number, z: number) => ({ x, z });
const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);

type Pool = { name: string; i0: number; j0: number; i1: number; j1: number; pickle: { x: number; z: number }; snappers: { x: number; z: number }[] };
const POOLS: Pool[] = [
  { name: 'the Watering Hole', i0: 720, j0: 30, i1: 726, j1: 34, pickle: at(723.5, 32.5), snappers: [at(721.5, 33.5)] },
  { name: 'the Reed Pool', i0: 1199, j0: 42, i1: 1207, j1: 50, pickle: at(1206.5, 43.5), snappers: [at(1201.5, 48.5), at(1205.5, 46.5)] },
  { name: 'the Tarn', i0: 1406, j0: 42, i1: 1414, j1: 50, pickle: at(1413.5, 43.5), snappers: [at(1408.5, 48.5), at(1412.5, 46.5)] },
];
const inPool = (pool: Pool, x: number, z: number): boolean => x >= pool.i0 && x < pool.i1 + 1 && z >= pool.j0 && z < pool.j1 + 1;

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

class Rig {
  readonly player: Player;
  readonly pad = new Pad();
  readonly arrows: Arrows;
  readonly powers: WaterPowers;
  readonly all: Enemy[] = [];
  readonly snappers: Enemy[] = [];
  time = 0;

  constructor(form: FormId, level: number, start: { x: number; z: number }, pool: Pool, extra: { x: number; z: number }[] = [], wake = level) {
    const particles = new Particles();
    this.player = new Player(world, particles, { onFell: () => {}, onDied: () => {}, onAte: () => {}, onHome: () => {} });
    this.player.level = Math.max(level, FORMS.find((f) => f.id === form)!.level);
    const index = FORMS.findIndex((f) => f.id === form);
    if (index !== 0) expect(this.player.shiftTo(index)).toBe(true);
    this.player.level = level;
    this.player.hearts = this.player.form.maxHearts;
    this.player.place(start.x, start.z);
    this.arrows = new Arrows(world, particles);
    const spots = world.layout.enemies.filter((e) => [...pool.snappers, ...extra].some((s) => s.x === e.x && s.z === e.z));
    for (const spot of spots) {
      const e = new Enemy(world, particles, this.arrows, { x: spot.x, z: spot.z }, spot);
      e.wake(wake);
      this.all.push(e);
      if (e.kind === 'snapper') this.snappers.push(e);
    }
    this.powers = new WaterPowers(world, particles, this.all);
  }

  get p() {
    return this.player.pos;
  }

  step(): void {
    this.player.update(DT, this.pad, this.all);
    for (const e of this.all) e.update(DT, this.player, this.all);
    this.arrows.update(DT, this.player);
    this.powers.update(DT, this.player, this.pad);
    this.pad.tapped.clear();
    this.time += DT;
  }

  run(seconds: number, goal: (() => { x: number; z: number } | null) | null, done: () => boolean = () => false, each: () => void = () => {}): boolean {
    for (let n = 0; n < seconds / DT; n++) {
      if (done()) return true;
      const g = goal?.() ?? null;
      const d = g ? dist(g, this.p) : 0;
      this.pad.dir = g && d > 0.08 ? { x: (g.x - this.p.x) / d, z: (g.z - this.p.z) / d } : { x: 0, z: 0 };
      each();
      this.step();
    }
    return done();
  }
}

describe.each(POOLS)('the Snappers of $name', (pool) => {
  const centre = at((pool.i0 + pool.i1 + 1) / 2, (pool.j0 + pool.j1 + 1) / 2);

  it('start in water inside the pool, and keep their centres on its water tiles in their depth band for 30 s', () => {
    const r = new Rig('mermaid', 9, at(centre.x, centre.z), pool);
    expect(r.snappers).toHaveLength(pool.snappers.length);
    const check = () => {
      for (const s of r.snappers) {
        const { x, y, z } = s.pos;
        const where = `${s.pos.x.toFixed(1)}, ${s.pos.z.toFixed(1)}`;
        expect(inPool(pool, x, z), `outside at ${where}`).toBe(true);
        expect(world.isWater(x, z), `dry at ${where}`).toBe(true);
        expect(world.isKelp(x, z), `kelp at ${where}`).toBe(false);
        expect(y).toBeGreaterThanOrEqual(world.groundAt(x, z) + SNAPPER.bedGap - 1e-6);
        expect(y).toBeLessThanOrEqual(world.waterLevelAt(x, z) - SNAPPER.topGap + 1e-6);
      }
    };
    check();
    const rx = (pool.i1 + 1 - pool.i0) / 2 - 1;
    const rz = (pool.j1 + 1 - pool.j0) / 2 - 1;
    r.run(30, () => {
      const a = r.time * 0.8;
      return at(centre.x + rx * Math.cos(a), centre.z + rz * Math.sin(a));
    }, () => false, () => {
      r.player.hearts = r.player.form.maxHearts;
      check();
    });
    expect(r.snappers.some((s) => s.alert)).toBe(true);
  });

  it('are dormant below the Mermaid level', () => {
    const r = new Rig('human', SNAPPER_LEVEL - 1, at(centre.x, centre.z), pool);
    r.run(10, null);
    for (const s of r.snappers) {
      expect(s.group.visible).toBe(false);
      expect(s.alert).toBe(false);
    }
    expect(r.player.hearts).toBe(r.player.form.maxHearts);
  });
});

describe('the Tarn fights', () => {
  const tarn = POOLS[2];
  it('are won by a Mermaid with sword, water shot and bubble column, who keeps at least half her hearts', () => {
    const r = new Rig('mermaid', 9, at(1410.5, 49.5), tarn);
    const max = r.player.hearts;
    const cool = { q: 0, r: 0, j: 0 };
    const nearest = () => r.snappers.filter((s) => s.alive).sort((a, b) => dist(a.pos, r.p) - dist(b.pos, r.p))[0];
    const won = r.run(90, () => nearest()?.pos ?? null, () => r.snappers.every((s) => !s.alive), () => {
      const t = nearest();
      if (!t) return;
      const d = dist(t.pos, r.p);
      if (r.time >= cool.q && d < 8) {
        r.pad.tapped.add('KeyQ');
        cool.q = r.time + 1;
      }
      if (r.time >= cool.r && d < 6) {
        r.pad.tapped.add('KeyR');
        cool.r = r.time + 3.1;
      }
      if (r.time >= cool.j && d < 1.8) {
        r.pad.tapped.add('KeyJ');
        cool.j = r.time + 0.4;
      }
    });
    expect(won, `snappers left ${r.snappers.map((s) => s.hearts).join(',')}, hearts ${r.player.hearts}`).toBe(true);
    expect(r.player.hearts).toBeGreaterThanOrEqual(max / 2);
  });
});

describe('the Snappers and the Human', () => {
  it('bite a Human who dives to the Watering Hole pickle and stays 6 s (one bite every 1.7 s, so 6 to 8 hearts of 10 gone), but do not make them faint', () => {
    const hole = POOLS[0];
    const r = new Rig('human', 9, at(723.5, 28.5), hole);
    const max = r.player.hearts;
    expect(max).toBe(10);
    r.run(20, () => hole.pickle, () => dist(r.p, hole.pickle) < 1.5 && r.player.swimming);
    const before = r.player.hearts;
    let fainted = false;
    r.run(6, () => hole.pickle, () => false, () => {
      if (r.player.dead || r.player.hearts <= 0) fainted = true;
    });
    expect(fainted).toBe(false);
    // Measured: bites land at 1.7, 3.4, 5.5, 7.2 and 9.2 s, so a Human who stays 10 s does faint (at 9.2 s).
    expect(before - r.player.hearts).toBeGreaterThanOrEqual(2 * SNAPPER.damage);
    expect(r.player.hearts).toBeGreaterThan(0);
  });

  it('do not notice a player on the bank by the Reed Pool speaker for 10 s', () => {
    const pool = POOLS[1];
    const r = new Rig('human', 9, at(1203.5, 52.5), pool, [at(1199.5, 53.5), at(1200.5, 54.5)]);
    r.run(10, null, () => false, () => {
      for (const s of r.snappers) expect(s.alert).toBe(false);
    });
    expect(r.player.hearts).toBe(r.player.form.maxHearts);
  });
});
