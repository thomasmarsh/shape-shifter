import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  expectArchersAwayFromRespawns,
  expectCheckpointsAwayFromGuards,
  expectMelodies,
  expectOnRealGround,
  expectPlatesOnRealGround,
  expectSeenFromCamera,
  expectUniqueIds,
  expectWayOut,
  exploreIn,
  reachedAny,
  respawnOf as respawn,
  solidTiles,
} from './testkit';
import { BUBBLE_AIM, FORMS, FormId, WATER_SHOT_RANGE } from '../forms';
import type { Controls } from '../input';
import { Particles } from '../particles';
import { Attackable, Player } from '../player';
import { World } from '../world';
import { WaterPowers } from '../waterpowers';

// Sunveld as a whole (x 700..959): the two halves joined, the proof that every
// form has work, the gate guards and the Mermaid's way past them.

const world = new World();
const { layout } = world;
// Every Sunveld test file uses this range, so they share cached explores.
const explore = exploreIn(world, { x0: 620, x1: 960 });

const onSunveld = (s: { x: number }) => s.x >= 700 && s.x < 960;
const mine = <T extends { x: number }>(items: T[]): T[] => items.filter(onSunveld);
const SIX: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant'];
const SEVEN: FormId[] = [...SIX, 'mermaid'];
const EIGHT: FormId[] = [...SEVEN, 'cheetah'];

const checkpoint = (id: string) => layout.checkpoints.find((c) => c.id === id)!;
const START = respawn(checkpoint('sunveld'));
const svs = layout.puzzles.filter((p) => p.id.startsWith('sv-'));
const svCheckpoints = mine(layout.checkpoints);
const svBread = mine(layout.bread);
const svEnemies = mine(layout.enemies);
const solid = solidTiles(world, { x0: 700, x1: 960 });

describe('Sunveld as a whole: the proof', () => {
  it('lets the level-6 set use all five speakers and all five candles, on easy', () => {
    expect(svs.map((p) => p.id)).toEqual(['sv-hole', 'sv-table', 'sv-oxbow', 'sv-grove', 'sv-kraal']);
    const r = explore(START, SEVEN, 'easy');
    for (const p of svs) {
      expect(r.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(r.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
  });

  it('keeps the level-6 set, on max, off everything east of the Red Wall and off every tile at height 31', () => {
    const r = explore(START, SEVEN, 'max');
    expect(
      reachedAny(
        r,
        solid.filter(([i]) => i >= 870),
      ).slice(0, 3),
      'x >= 870',
    ).toEqual([]);
    expect(
      reachedAny(
        r,
        solid.filter(([i, j]) => world.groundAt(i + 0.5, j + 0.5) >= 31),
      ).slice(0, 3),
      'height 31',
    ).toEqual([]);
  });

  it('takes the Cheetah, on easy, to Sunset Rock', () => {
    const r = explore(START, EIGHT, 'easy');
    expect(r.canStand(respawn(checkpoint('sv-end'))), 'respawn spot').toBe(true);
  });
});

describe('Sunveld as a whole: ids, melodies and footing', () => {
  it('has no id clash, in the island or in the world', () => {
    for (const items of [svCheckpoints, svBread, mine(layout.hints), mine(layout.arrivals), svs]) {
      expect(items.length).toBeGreaterThan(0);
    }
    expectUniqueIds(
      layout.checkpoints,
      layout.bread,
      layout.hints,
      layout.puzzles,
      layout.arrivals,
      layout.plates.map((p) => ({ id: `${p.gate}@${p.x},${p.z}` })),
    );
  });

  it('gives the five sv- puzzles six different notes each, and no melody of any other island', () => {
    expect(svs).toHaveLength(5);
    expectMelodies(svs, layout.puzzles);
  });

  it('stands everything on real ground: dry, except the candles in water', () => {
    expect(svCheckpoints).toHaveLength(8);
    expectOnRealGround(world, [...svCheckpoints.flatMap((c) => [c, respawn(c)]), ...svBread, ...mine(layout.trees)]);
    expectOnRealGround(world, svEnemies);
    expectOnRealGround(
      world,
      svs.map((p) => p.speaker),
    );
    for (const p of svs) expect(world.groundAt(p.candle.x, p.candle.z), `${p.id} candle`).toBeGreaterThan(0);
    expectPlatesOnRealGround(world, mine(layout.plates));
  });

  it('keeps guards and archers away from every checkpoint and respawn spot', () => {
    expectCheckpointsAwayFromGuards(world, svCheckpoints, svEnemies);
    expectArchersAwayFromRespawns(
      world,
      svCheckpoints,
      svEnemies.filter((e) => e.kind === 'archer'),
    );
  });

  it('gives every sword and blade minLevel 7, and none west of x 850', () => {
    const fighters = svEnemies.filter((e) => e.kind === 'sword' || e.kind === 'blade');
    expect(fighters.length).toBeGreaterThan(0);
    for (const e of fighters) {
      expect(e.minLevel, `(${e.x}, ${e.z})`).toBe(7);
      expect(e.x, `(${e.x}, ${e.z}) west`).toBeGreaterThanOrEqual(850);
    }
  });

  it('shows every checkpoint, speaker, candle, bread and plate to the camera', () => {
    for (const c of svCheckpoints) expectSeenFromCamera(world, `checkpoint ${c.id}`, c.x, c.z);
    for (const p of svs) {
      expectSeenFromCamera(world, `${p.id} speaker`, p.speaker.x, p.speaker.z);
      const { x, z } = p.candle;
      expectSeenFromCamera(world, `${p.id} candle`, x, z, world.isWater(x, z) ? world.waterLevelAt(x, z) : undefined);
    }
    for (const b of svBread) expectSeenFromCamera(world, `bread ${b.id}`, b.x, b.z);
    for (const p of mine(layout.plates)) expectSeenFromCamera(world, `plate (${p.x}, ${p.z})`, p.x, p.z);
  });

  it('leaves a way back to the landing from every respawn spot, for the whole set on easy', () => {
    expectWayOut(explore, svCheckpoints, START, EIGHT, 'easy');
  });
});

describe('Sunveld as a whole: the Mermaid at the gate', () => {
  const POSTS = svEnemies.filter((e) => e.kind === 'sword' || e.kind === 'blade').filter((e) => e.x < 870);
  const POND = { x: 862.5, z: 53.5 };

  class Pad implements Controls {
    tapped = new Set<string>();
    held = () => false;
    hit = (code: string) => this.tapped.has(code);
    move = () => ({ x: 0, y: 0 });
    anyMoveHit = () => false;
  }
  class Guard implements Attackable {
    pos: THREE.Vector3;
    hearts = 20;
    hits: number[] = [];
    constructor(x: number, z: number) {
      this.pos = new THREE.Vector3(x, world.groundAt(x, z), z);
    }
    get alive() {
      return this.hearts > 0;
    }
    takeHit(damage: number) {
      this.hits.push(damage);
      this.hearts -= damage;
    }
  }

  it('has the three posts within the bubble column from the pond, and one in the water shot', () => {
    expect(POSTS).toHaveLength(3);
    expect(world.isWater(POND.x, POND.z), 'pond tile').toBe(true);
    for (const p of POSTS) {
      expect(Math.hypot(p.x - POND.x, p.z - POND.z), `post (${p.x}, ${p.z})`).toBeLessThanOrEqual(BUBBLE_AIM);
    }
    expect(POSTS.some((p) => Math.hypot(p.x - POND.x, p.z - POND.z) <= WATER_SHOT_RANGE)).toBe(true);
  });

  it('hurts a guard with the real water shot and the real bubble column', () => {
    const particles = new Particles();
    const player = new Player(world, particles, {
      onFell: () => {},
      onDied: () => {},
      onAte: () => {},
      onHome: () => {},
    });
    player.level = 7;
    expect(player.shiftTo(FORMS.findIndex((f) => f.id === 'mermaid'))).toBe(true);
    player.place(POND.x, POND.z);
    const guards = POSTS.map((p) => new Guard(p.x, p.z));
    const powers = new WaterPowers(world, particles, guards);
    const pad = new Pad();
    const frame = (...keys: string[]) => {
      for (const k of keys) pad.tapped.add(k);
      player.update(1 / 60, pad, guards);
      powers.update(1 / 60, player, pad);
      pad.tapped.clear();
    };
    for (let k = 0; k < 60; k++) frame();
    expect(player.swimming).toBe(true);
    frame('KeyQ');
    for (let k = 0; k < 90; k++) frame();
    const afterShot = guards.reduce((n, g) => n + g.hits.length, 0);
    expect(afterShot, 'water shot hits').toBeGreaterThan(0);
    frame('KeyR');
    for (let k = 0; k < 90; k++) frame();
    expect(
      guards.reduce((n, g) => n + g.hits.length, 0),
      'bubble column hits',
    ).toBeGreaterThan(afterShot);
  });
});
