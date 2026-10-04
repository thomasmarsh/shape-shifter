import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  BUBBLE_COOLDOWN,
  BUBBLE_DAMAGE,
  BUBBLE_DELAY,
  BUBBLE_RADIUS,
  FORMS,
  FormId,
  WATER_SHOT_COOLDOWN,
  WATER_SHOT_DAMAGE,
} from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
import { Player, Attackable } from './player';
import { Island, Kind, World } from './world';
import { WaterPowers } from './waterpowers';

const DT = 1 / 60;
const WATER = 2.7;
const BANK = 3;

/** A bad guy with `hearts` that just counts what it is hit for. */
class Dummy implements Attackable {
  pos: THREE.Vector3;
  hearts: number;
  hits: number[] = [];
  constructor(x: number, z: number, hearts: number, y = BANK) {
    this.pos = new THREE.Vector3(x, y, z);
    this.hearts = hearts;
  }
  get alive(): boolean {
    return this.hearts > 0;
  }
  takeHit(damage: number): void {
    this.hits.push(damage);
    this.hearts -= damage;
  }
}

class Pad implements Controls {
  tapped = new Set<string>();
  held(): boolean {
    return false;
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

/** Banks with a lake on tiles 10 to 49, rows 5 to 25; `wallAt` raises a wall across it. */
function lake(wallAt?: number): Island {
  return {
    id: 'lake',
    name: 'Lake',
    build(t) {
      t.rect(0, 0, 70, 30, (i, j) => t.set(i, j, BANK, Kind.Grass));
      t.rect(10, 5, 49, 25, (i, j) => {
        t.set(i, j, WATER - 6, Kind.Sand);
        t.setWater(i, j, true);
      });
      if (wallAt !== undefined) t.rect(wallAt, 5, wallAt, 25, (i, j) => t.set(i, j, 12, Kind.Stone));
      return { spawn: { x: 2.5, z: 15.5 } };
    },
  };
}

class Rig {
  readonly world: World;
  readonly player: Player;
  readonly powers: WaterPowers;
  readonly pad = new Pad();
  readonly targets: Dummy[] = [];

  constructor(form: FormId, start: { x: number; z: number }, wallAt?: number) {
    this.world = new World([lake(wallAt)]);
    const particles = new Particles();
    this.player = new Player(this.world, particles, { onFell: () => {}, onDied: () => {}, onAte: () => {}, onHome: () => {} });
    const index = FORMS.findIndex((f) => f.id === form);
    this.player.level = FORMS[index].level;
    if (index !== 0) expect(this.player.shiftTo(index)).toBe(true);
    this.player.place(start.x, start.z);
    this.powers = new WaterPowers(this.world, particles, this.targets);
    // Settle into the water (or onto the bank) before any key is pressed.
    this.frames(60);
  }

  frame(...keys: string[]): void {
    for (const k of keys) this.pad.tapped.add(k);
    this.player.update(DT, this.pad, this.targets);
    this.powers.update(DT, this.player, this.pad);
    this.pad.tapped.clear();
  }

  frames(n: number): void {
    for (let k = 0; k < n; k++) this.frame();
  }
}

const IN_LAKE = { x: 44.5, z: 15.5 };
const ON_BANK = { x: 55.5, z: 15.5 };

describe('the Mermaid water shot', () => {
  it('does 3 hearts to a bad guy 6 tiles away on the shore', () => {
    const rig = new Rig('mermaid', IN_LAKE);
    expect(rig.player.swimming).toBe(true);
    const guy = new Dummy(50.5, 15.5, 9);
    rig.targets.push(guy);
    rig.frame('KeyQ');
    rig.frames(60);
    expect(guy.hits).toEqual([WATER_SHOT_DAMAGE]);
    expect(guy.hearts).toBe(6);
    expect(rig.powers.shotCount).toBe(0);
  });

  it('does nothing on land, and a Human pressing the keys does nothing either', () => {
    const land = new Rig('mermaid', ON_BANK);
    expect(land.player.swimming).toBe(false);
    const guy = new Dummy(60.5, 15.5, 9);
    land.targets.push(guy);
    land.frame('KeyQ', 'KeyR');
    land.frames(60);
    expect(land.powers.shotCount + land.powers.columnCount).toBe(0);
    expect(guy.hits).toEqual([]);

    const human = new Rig('human', IN_LAKE);
    const near = new Dummy(50.5, 15.5, 9);
    human.targets.push(near);
    human.frame('KeyQ', 'KeyR');
    human.frames(60);
    expect(human.powers.shotCount + human.powers.columnCount).toBe(0);
    expect(near.hits).toEqual([]);
  });

  it('stops at a wall between them', () => {
    const rig = new Rig('mermaid', IN_LAKE, 47);
    const guy = new Dummy(50.5, 15.5, 9);
    rig.targets.push(guy);
    rig.frame('KeyQ');
    rig.frames(60);
    expect(guy.hits).toEqual([]);
    expect(rig.powers.shotCount).toBe(0);
  });

  it('flies straight ahead with no bad guy, and falls out of range', () => {
    const rig = new Rig('mermaid', IN_LAKE);
    rig.frame('KeyQ');
    expect(rig.powers.shotCount).toBe(1);
    rig.frames(60);
    expect(rig.powers.shotCount).toBe(0);
  });

  it('holds its cooldown', () => {
    const rig = new Rig('mermaid', IN_LAKE);
    const guy = new Dummy(50.5, 15.5, 30);
    rig.targets.push(guy);
    rig.frame('KeyQ');
    rig.frames(10);
    rig.frame('KeyQ');
    rig.frames(60);
    expect(guy.hits).toEqual([WATER_SHOT_DAMAGE]);
    rig.frames(Math.ceil(WATER_SHOT_COOLDOWN * 60));
    rig.frame('KeyQ');
    rig.frames(60);
    expect(guy.hits).toEqual([WATER_SHOT_DAMAGE, WATER_SHOT_DAMAGE]);
  });
});

describe('the Mermaid bubble column', () => {
  it('does 4 hearts after the warning to bad guys inside its radius, none outside', () => {
    const rig = new Rig('mermaid', IN_LAKE);
    const hit = new Dummy(50.5, 15.5, 9);
    const edge = new Dummy(50.5 + BUBBLE_RADIUS - 0.1, 15.5, 9);
    const clear = new Dummy(50.5 + BUBBLE_RADIUS + 0.1, 15.5, 9);
    rig.targets.push(hit, edge, clear);
    rig.frame('KeyR');
    rig.frames(Math.floor(BUBBLE_DELAY * 60) - 3);
    expect(hit.hits).toEqual([]);
    rig.frames(10);
    expect(hit.hits).toEqual([BUBBLE_DAMAGE]);
    expect(edge.hits).toEqual([BUBBLE_DAMAGE]);
    expect(clear.hits).toEqual([]);
    rig.frames(120);
    expect(hit.hits).toEqual([BUBBLE_DAMAGE]);
    expect(rig.powers.columnCount).toBe(0);
  });

  it('comes up even with a wall between, and holds its cooldown', () => {
    const rig = new Rig('mermaid', IN_LAKE, 47);
    const guy = new Dummy(50.5, 15.5, 30);
    rig.targets.push(guy);
    rig.frame('KeyR');
    rig.frames(60);
    rig.frame('KeyR');
    rig.frames(60);
    expect(guy.hits).toEqual([BUBBLE_DAMAGE]);
    rig.frames(Math.ceil(BUBBLE_COOLDOWN * 60));
    rig.frame('KeyR');
    rig.frames(60);
    expect(guy.hits).toEqual([BUBBLE_DAMAGE, BUBBLE_DAMAGE]);
  });

  it('kills a light blade (3 hearts) with one column', () => {
    const rig = new Rig('mermaid', IN_LAKE);
    const blade = new Dummy(50.5, 15.5, 3);
    rig.targets.push(blade);
    rig.frame('KeyR');
    rig.frames(60);
    expect(blade.alive).toBe(false);
  });

  it('kills a heavy sword (5 hearts) with a shot and a column', () => {
    const rig = new Rig('mermaid', IN_LAKE);
    const heavy = new Dummy(50.5, 15.5, 5);
    rig.targets.push(heavy);
    rig.frame('KeyQ');
    rig.frames(60);
    expect(heavy.alive).toBe(true);
    rig.frame('KeyR');
    rig.frames(60);
    expect(heavy.alive).toBe(false);
  });
});
