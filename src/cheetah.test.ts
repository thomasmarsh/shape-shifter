import { describe, expect, it } from 'vitest';
import { BRITTLE_SPEED, FORMS, FormId, ICE_SPEED, RUN_BREATH, RUN_REST, WINDED_SPEED } from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
import { Player } from './player';
import { Island, Kind, World } from './world';

const FLOOR = 2;
const DT = 1 / 60;

class Pad implements Controls {
  down = new Set<string>();
  tapped = new Set<string>();
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

class Rig {
  readonly world: World;
  readonly player: Player;
  readonly pad = new Pad();

  constructor(form: FormId, isl: Island, start = { x: 6.5, z: 15.5 }) {
    this.world = new World([isl]);
    this.player = new Player(this.world, new Particles(), {
      onFell: () => {},
      onDied: () => {},
      onAte: () => {},
      onHome: () => {},
    });
    this.player.level = 9;
    this.shift(form);
    this.player.hearts = this.player.form.maxHearts;
    this.player.place(start.x, start.z);
  }

  shift(form: FormId): void {
    const index = FORMS.findIndex((f) => f.id === form);
    if (index !== this.player.formIndex) expect(this.player.shiftTo(index)).toBe(true);
  }

  frame(): void {
    this.player.update(DT, this.pad, []);
    this.pad.tapped.clear();
  }

  until(done: () => boolean, max = 600): boolean {
    for (let n = 0; n < max; n++) {
      if (done()) return true;
      this.frame();
    }
    return done();
  }

  frames(n: number): void {
    for (let k = 0; k < n; k++) this.frame();
  }
}

const east = { x: 1, z: 0 };
const still = { x: 0, z: 0 };

/** Flat ground 0..99 by 10..20, with `extra` shaping it, and the given plates. */
function flat(extra: (t: Parameters<Island['build']>[0]) => void = () => {}, plates: { x: number; z: number; gate: string; seconds: number }[] = []): Island {
  return {
    id: 'flat',
    name: 'Flat',
    build(t) {
      t.rect(0, 10, 99, 20, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
      extra(t);
      return { spawn: { x: 2.5, z: 15.5 }, plates };
    },
  };
}

/** A start bank, 14 tiles of sheet (tiles 10 to 23), and a far bank. */
function sheetBridge(brittle: boolean): Island {
  return {
    id: 'sheet',
    name: 'Sheet',
    build(t) {
      t.rect(0, 10, 9, 20, (i, j) => t.set(i, j, FLOOR, Kind.Snow));
      t.rect(24, 10, 40, 20, (i, j) => t.set(i, j, FLOOR, Kind.Snow));
      t.rect(10, 10, 23, 20, (i, j) => (brittle ? t.setBrittle(i, j, FLOOR) : t.setThinIce(i, j, FLOOR)));
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

const intact = (rig: Rig, from: number, to: number): boolean => {
  for (let i = from; i <= to; i++) if (!rig.world.isIceIntact(i + 0.5, 15.5)) return false;
  return true;
};

function crossing(form: FormId, brittle: boolean, winded = false): Rig {
  const rig = new Rig(form, sheetBridge(brittle));
  if (winded) {
    rig.player.breath = 0;
    rig.player.winded = true;
  }
  rig.pad.dir = east;
  rig.until(() => rig.player.pos.x > 27 || rig.player.pos.y < FLOOR - 1, 600);
  return rig;
}

describe('sheets', () => {
  it('knows both kinds', () => {
    const rig = new Rig('human', sheetBridge(true));
    expect(BRITTLE_SPEED).toBeGreaterThan(ICE_SPEED);
    expect(rig.world.isThinIce(12.5, 15.5)).toBe(true);
    expect(rig.world.isBrittle(12.5, 15.5)).toBe(true);
    expect(rig.world.sheetSpeedAt(12.5, 15.5)).toBe(BRITTLE_SPEED);
    const thin = new Rig('human', sheetBridge(false));
    expect(thin.world.isBrittle(12.5, 15.5)).toBe(false);
    expect(thin.world.sheetSpeedAt(12.5, 15.5)).toBe(ICE_SPEED);
    expect(thin.world.sheetSpeedAt(2.5, 15.5)).toBe(0);
  });

  it('holds a full-speed Cheetah on brittle and on thin sheets', () => {
    for (const brittle of [true, false]) {
      const rig = crossing('cheetah', brittle);
      expect(rig.player.pos.x, `brittle ${brittle}`).toBeGreaterThan(27);
      expect(rig.player.pos.y).toBe(FLOOR);
      expect(intact(rig, 10, 23)).toBe(true);
    }
  });

  it('holds a Wolf on thin sheets but breaks brittle at once', () => {
    expect(crossing('wolf', false).player.pos.x).toBeGreaterThan(27);
    const rig = crossing('wolf', true);
    expect(rig.player.pos.y).toBeLessThan(FLOOR - 1);
    expect(rig.player.pos.x).toBeLessThan(13);
  });

  it('breaks under a winded Cheetah, thin or brittle', () => {
    for (const brittle of [true, false]) {
      const rig = crossing('cheetah', brittle, true);
      expect(rig.player.pos.y, `brittle ${brittle}`).toBeLessThan(FLOOR - 1);
    }
  });
});

describe('breath', () => {
  it('drains in 8 seconds of running, then slows the Cheetah to 3', () => {
    const rig = new Rig('cheetah', flat());
    expect(rig.player.meter).toMatchObject({ label: 'Breath', fraction: 1, tired: false });
    rig.pad.dir = east;
    rig.frames(Math.round(7.9 / DT));
    expect(rig.player.winded).toBe(false);
    rig.frames(Math.round(0.2 / DT));
    expect(rig.player.winded).toBe(true);
    expect(rig.player.breath).toBe(0);
    expect(rig.player.meter).toMatchObject({ label: 'Out of breath! Resting…', tired: true });
    const x = rig.player.pos.x;
    rig.frames(30);
    expect((rig.player.pos.x - x) / 0.5).toBeCloseTo(WINDED_SPEED, 1);
  });

  it('stays winded until full, and is full again after the rest time', () => {
    const rig = new Rig('cheetah', flat());
    rig.player.breath = 0;
    rig.player.winded = true;
    rig.frames(Math.round((RUN_REST - 0.1) / DT));
    expect(rig.player.winded).toBe(true);
    expect(rig.player.breath).toBeLessThan(RUN_BREATH);
    rig.frames(Math.round(0.2 / DT));
    expect(rig.player.winded).toBe(false);
    expect(rig.player.breath).toBe(RUN_BREATH);
    rig.pad.dir = east;
    const x = rig.player.pos.x;
    rig.frames(30);
    expect((rig.player.pos.x - x) / 0.5).toBeCloseTo(10, 1);
  });

  it('keeps refilling in other forms, and a shift does not refill it', () => {
    const rig = new Rig('cheetah', flat());
    rig.pad.dir = east;
    rig.frames(Math.round(8.2 / DT));
    expect(rig.player.winded).toBe(true);
    rig.pad.dir = still;
    rig.shift('human');
    expect(rig.player.breath).toBe(0);
    expect(rig.player.winded).toBe(true);
    rig.frames(Math.round(1.75 / DT));
    expect(rig.player.breath).toBeCloseTo(RUN_BREATH / 2, 0);
    rig.shift('cheetah');
    expect(rig.player.winded).toBe(true);
    expect(rig.player.breath).toBeLessThan(RUN_BREATH);
    rig.frames(Math.round(1.8 / DT));
    expect(rig.player.winded).toBe(false);
  });

  it('is not drained by other forms running', () => {
    const rig = new Rig('wolf', flat());
    rig.pad.dir = east;
    rig.frames(300);
    expect(rig.player.breath).toBe(RUN_BREATH);
    expect(rig.player.meter).toBeNull();
  });

  it('is not refilled by being placed (a respawn or checkpoint stand)', () => {
    // Nothing in player.ts or game.ts touches breath on a checkpoint; place() is what both call.
    const rig = new Rig('cheetah', flat());
    rig.player.breath = 2;
    rig.player.place(6.5, 15.5);
    expect(rig.player.breath).toBe(2);
  });
});

describe('timed gates', () => {
  // A wall of gate tiles at x = 10 across the whole strip, a plate at tile 5.
  const gated = (seconds = 3): Island =>
    flat(
      (t) => t.rect(10, 10, 10, 20, (i, j) => t.setGate(i, j, 'g')),
      [{ x: 5.5, z: 15.5, gate: 'g', seconds }],
    );

  it('blocks walking for every playable form, and a fairy flying over', () => {
    for (const f of FORMS.filter((f) => f.playable)) {
      const rig = new Rig(f.id, gated(), { x: 8.5, z: 15.5 });
      rig.pad.dir = east;
      if (f.canFly) rig.pad.down.add('Space');
      rig.frames(240);
      expect(rig.player.pos.x, f.id).toBeLessThan(10);
    }
    expect(new Rig('human', gated()).world.isClosedGate(10.5, 15.5)).toBe(true);
  });

  it('opens when the plate is stood on, and shuts `seconds` after leaving it', () => {
    const rig = new Rig('human', gated(3), { x: 5.5, z: 15.5 });
    expect(rig.world.gateOpen('g')).toBe(false);
    rig.frame();
    expect(rig.world.gateOpen('g')).toBe(true);
    expect(rig.world.isClosedGate(10.5, 15.5)).toBe(false);
    rig.frames(300);
    expect(rig.world.gateOpen('g')).toBe(true);
    rig.pad.dir = { x: -1, z: 0 };
    rig.until(() => rig.player.pos.x < 5, 60);
    rig.pad.dir = still;
    rig.frames(Math.round(2.8 / DT));
    expect(rig.world.gateOpen('g')).toBe(true);
    rig.frames(Math.round(0.4 / DT));
    expect(rig.world.gateOpen('g')).toBe(false);
  });

  it('lets a Cheetah run through before it shuts', () => {
    const rig = new Rig('cheetah', gated(3), { x: 5.5, z: 15.5 });
    rig.pad.dir = east;
    rig.frames(120);
    expect(rig.player.pos.x).toBeGreaterThan(14);
  });

  it('never closes on a player standing in it', () => {
    const rig = new Rig('human', gated(1), { x: 5.5, z: 15.5 });
    rig.frame();
    rig.pad.dir = east;
    expect(rig.until(() => rig.player.pos.x > 10.5, 200)).toBe(true);
    rig.pad.dir = still;
    rig.frames(240);
    expect(rig.world.gateOpen('g')).toBe(true);
    expect(rig.player.pos.x).toBeGreaterThan(10);
    rig.pad.dir = east;
    rig.until(() => rig.player.pos.x > 11.4, 100);
    rig.frames(60);
    expect(rig.world.gateOpen('g')).toBe(false);
  });

  it('only counts a grounded body with its centre on the plate', () => {
    const rig = new Rig('fairy', gated(3), { x: 5.5, z: 15.5 });
    rig.pad.down.add('Space');
    rig.frames(30);
    expect(rig.player.onGround).toBe(false);
    expect(rig.world.gateOpen('g')).toBe(false); // she left the ground on the first frame
    const edge = new Rig('human', gated(3), { x: 5.05, z: 15.5 });
    edge.pad.dir = { x: -1, z: 0 };
    edge.frames(20);
    expect(edge.world.gateOpen('g')).toBe(false);
  });
});

describe('Cheetah speed', () => {
  it('runs 10 tiles a second from a standing start, and a Wolf 7', () => {
    for (const [form, speed] of [['cheetah', 10], ['wolf', 7]] as const) {
      const rig = new Rig(form, flat(), { x: 2.5, z: 15.5 });
      rig.pad.dir = east;
      rig.frames(60);
      expect(rig.player.pos.x - 2.5, form).toBeCloseTo(speed, 1);
    }
  });
});
