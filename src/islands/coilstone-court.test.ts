import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { BUBBLE_AIM, BUBBLE_COOLDOWN, BUBBLE_DAMAGE, BUBBLE_DELAY, FORMS, FormId } from '../forms';
import type { Controls } from '../input';
import { Particles } from '../particles';
import { Attackable, Player } from '../player';
import { World } from '../world';
import { WaterPowers } from '../waterpowers';
import { HUB, PARAPET } from './coilstone';
import { expectSeenFromCamera, exploreIn, inBox, reachedAny, respawnOf as respawn, solidTiles } from './testkit';

// The Sunken Court's guard cell: four walls, so only the bubble column reaches its two guards.

const DT = 1 / 60;
const world = new World();
const explore = exploreIn(world, { x0: 925, x1: 1062 });
const EIGHT: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah'];

const CELL = [1013, 46, 1015, 49] as const; // walls included
const FLOOR = [1014, 47, 1014, 48] as const;
const POSTS = [
  { x: 1014.5, z: 47.5 },
  { x: 1014.5, z: 48.5 },
];
const inCell = (i: number, j: number) => inBox(i, j, ...CELL);
const floor: [number, number][] = [];
for (let j = FLOOR[1]; j <= FLOOR[3]; j++) for (let i = FLOOR[0]; i <= FLOOR[2]; i++) floor.push([i, j]);
const inner: [number, number][] = [];
for (let j = 45; j <= 57; j++) {
  for (let i = 1011; i <= 1023; i++) if (inBox(i, j, 1011, 45, 1023, 57) && world.isWater(i + 0.5, j + 0.5)) inner.push([i, j]);
}

class Dummy implements Attackable {
  pos: THREE.Vector3;
  hearts: number;
  hits: number[] = [];
  constructor(x: number, z: number, hearts: number) {
    this.pos = new THREE.Vector3(x, HUB, z);
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

/** A swimming Mermaid at an inner-water tile, with the real water powers aimed at `targets`. */
function mermaidAt(i: number, j: number, targets: Dummy[]) {
  const particles = new Particles();
  const player = new Player(world, particles, { onFell: () => {}, onDied: () => {}, onAte: () => {}, onHome: () => {} });
  const index = FORMS.findIndex((f) => f.id === 'mermaid');
  player.level = FORMS[index].level;
  expect(player.shiftTo(index)).toBe(true);
  player.place(i + 0.5, j + 0.5);
  const powers = new WaterPowers(world, particles, targets);
  const pad = new Pad();
  const frame = (...keys: string[]) => {
    for (const k of keys) pad.tapped.add(k);
    player.update(DT, pad, targets);
    powers.update(DT, player, pad);
    pad.tapped.clear();
  };
  for (let k = 0; k < 40; k++) frame();
  return { player, powers, frame };
}

describe('the Sunken Court guard cell', () => {
  it('is closed on all four sides, above every form, with the guards on its floor', () => {
    for (let j = CELL[1]; j <= CELL[3]; j++) {
      for (let i = CELL[0]; i <= CELL[2]; i++) {
        const wall = !inBox(i, j, ...FLOOR);
        expect(world.solidAt(i + 0.5, j + 0.5), `tile (${i}, ${j})`).toBe(wall ? PARAPET : HUB);
        expect(world.isWater(i + 0.5, j + 0.5), `water at (${i}, ${j})`).toBe(false);
      }
    }
    expect(PARAPET).toBeGreaterThan(20.93);
    expect(Math.hypot(POSTS[0].x - POSTS[1].x, POSTS[0].z - POSTS[1].z)).toBeGreaterThanOrEqual(1);
    for (const p of POSTS) expect(inBox(Math.floor(p.x), Math.floor(p.z), ...FLOOR)).toBe(true);
  });

  it('is never hit by a water shot from any inner-water tile', () => {
    for (const [i, j] of inner) {
      for (const [fi, fj] of floor) {
        const guy = new Dummy(fi + 0.5, fj + 0.5, 9);
        const rig = mermaidAt(i, j, [guy]);
        expect(rig.player.swimming, `swimming at (${i}, ${j})`).toBe(true);
        rig.frame('KeyQ');
        for (let k = 0; k < 90 && rig.powers.shotCount > 0; k++) rig.frame();
        expect(rig.powers.shotCount).toBe(0);
        expect(guy.hits, `shot from (${i}, ${j}) at (${fi}, ${fj})`).toEqual([]);
      }
    }
  });

  it('is reached by the bubble column from inner-water tile (1012, 48), both guards in turn', () => {
    const [i, j] = [1012, 48];
    expect(inner.some(([a, b]) => a === i && b === j)).toBe(true);
    const guys = POSTS.map((p) => new Dummy(p.x, p.z, 9));
    for (const g of guys) expect(Math.hypot(g.pos.x - (i + 0.5), g.pos.z - (j + 0.5))).toBeLessThanOrEqual(BUBBLE_AIM);
    const rig = mermaidAt(i, j, guys);
    for (let k = 0; k < 6 * Math.ceil((BUBBLE_DELAY + BUBBLE_COOLDOWN) * 60) && guys.some((g) => g.alive); k++) {
      rig.frame(k % 30 === 0 ? 'KeyR' : '');
    }
    for (const g of guys) {
      expect(g.hits.length).toBeGreaterThan(0);
      expect(g.hits.every((h) => h === BUBBLE_DAMAGE)).toBe(true);
      expect(g.alive).toBe(false);
    }
  });

  it('is stood on by none of the eight forms on max', () => {
    const r = explore(respawn({ x: 1000.5, z: 18.5 }), EIGHT, 'max');
    const cell = solidTiles(world, { x0: 1013, x1: 1016 }).filter(([i, j]) => inCell(i, j));
    expect(reachedAny(r, cell).slice(0, 3)).toEqual([]);
  }, 30000);

  it('hides neither the speaker, the candle nor the terrace from the camera', () => {
    expectSeenFromCamera(world, 'speaker', 1021.5, 51.5);
    expectSeenFromCamera(world, 'candle', 1020.5, 48.5);
    for (let j = 47; j <= 50; j++) for (let i = 1018; i <= 1021; i++) expectSeenFromCamera(world, `terrace (${i}, ${j})`, i + 0.5, j + 0.5);
  });
});
