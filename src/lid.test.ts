import { describe, expect, it } from 'vitest';
import { explore } from './levelcheck';
import { Island, Kind, World } from './world';

// The lid: a stone floor over a lake that can drop. A flat 40 by 20 map at 6
// with a pool from column 10 to 15 (bed 1.7, level 5.7) roofed at 6.

const TOP = 6;
const BED = 1.7;
const LEVEL = 5.7;

const isl: Island = {
  id: 'test',
  name: 'Test',
  build(t) {
    t.rect(0, 0, 40, 20, (i, j) => t.set(i, j, TOP, Kind.Grass));
    t.rect(10, 5, 15, 10, (i, j) => {
      t.set(i, j, BED, Kind.Sand);
      t.setWater(i, j, true, LEVEL);
      t.setLid(i, j, TOP);
    });
    return { spawn: { x: 2.5, z: 7.5 } };
  },
};

const world = new World([isl]);
const from = { x: 2.5, z: 7.5 };
const mid = { x: 12.5, z: 7.5 };
const far = { x: 20.5, z: 7.5 };
const range = { x0: 0, x1: 40 };

const snap = () => [world.groundAt(mid.x, mid.z), world.solidAt(mid.x, mid.z), world.isWater(mid.x, mid.z), world.waterLevelAt(mid.x, mid.z)];

describe('the lid', () => {
  it('starts shut: plain ground at the top, not water', () => {
    world.raiseLid();
    expect(world.lidDown).toBe(false);
    expect(world.isLid(mid.x, mid.z)).toBe(true);
    expect(world.isWater(mid.x, mid.z)).toBe(false);
    expect(world.groundAt(mid.x, mid.z)).toBe(TOP);
    expect(world.solidAt(mid.x, mid.z)).toBe(TOP);
    expect(world.isKelp(mid.x, mid.z)).toBe(false);
    expect(world.isHollow(mid.x, mid.z)).toBe(false);
  });

  it('is not a lid outside the pool', () => {
    expect(world.isLid(2.5, 7.5)).toBe(false);
    expect(world.isLid(-3, 7.5)).toBe(false);
  });

  it('lets a Human walk across it while shut', () => {
    world.raiseLid();
    const r = explore(world, from, ['human'], 'easy', range);
    expect(r.canStand(mid)).toBe(true);
    expect(r.canStand(far)).toBe(true);
  });

  it('gives the Mermaid no water while shut', () => {
    world.raiseLid();
    const r = explore(world, from, ['mermaid'], 'easy', range);
    expect(r.canStand({ x: 12.5, z: 7.5 })).toBe(true);
    expect(world.isWater(mid.x, mid.z)).toBe(false);
  });

  it('turns into water at its level and bed when dropped', () => {
    world.dropLid();
    expect(world.lidDown).toBe(true);
    expect(world.isWater(mid.x, mid.z)).toBe(true);
    expect(world.waterLevelAt(mid.x, mid.z)).toBe(LEVEL);
    expect(world.groundAt(mid.x, mid.z)).toBeCloseTo(BED, 4);
    expect(world.isLid(mid.x, mid.z)).toBe(true);
    world.raiseLid();
  });

  it('lets the Mermaid reach the bed once dropped', () => {
    world.dropLid();
    const r = explore(world, from, ['mermaid'], 'easy', range);
    expect(r.canStand({ x: 12.5, z: 7.5 })).toBe(true);
    world.raiseLid();
  });

  it('lets a Human reach the far shore by swimming once dropped', () => {
    world.dropLid();
    const r = explore(world, from, ['human'], 'easy', range);
    expect(r.canStand(far)).toBe(true);
    world.raiseLid();
  });

  it('puts every number back on raiseLid', () => {
    const before = snap();
    world.dropLid();
    expect(snap()).not.toEqual(before);
    world.raiseLid();
    expect(snap()).toEqual(before);
  });

  it('is safe to drop or raise twice', () => {
    world.dropLid();
    world.dropLid();
    expect(world.isWater(mid.x, mid.z)).toBe(true);
    world.raiseLid();
    world.raiseLid();
    expect(world.isWater(mid.x, mid.z)).toBe(false);
    expect(world.groundAt(mid.x, mid.z)).toBe(TOP);
  });

  it('shows the slab while shut and hides it when dropped', () => {
    const slab = world.group.getObjectByName('lid');
    expect(slab).toBeDefined();
    world.raiseLid();
    expect(slab!.visible).toBe(true);
    world.dropLid();
    expect(slab!.visible).toBe(false);
    world.raiseLid();
  });

  it('throws on a dry tile', () => {
    const bad: Island = {
      id: 'bad',
      name: 'Bad',
      build(t) {
        t.rect(0, 0, 5, 5, (i, j) => t.set(i, j, TOP, Kind.Grass));
        t.setLid(2, 2, TOP);
        return { spawn: { x: 1.5, z: 1.5 } };
      },
    };
    expect(() => new World([bad])).toThrow();
  });

  it('leaves the default world without a lid', () => {
    const w = new World();
    const pts = [[10.5, 10.5], [100.5, 20.5], [500.5, 30.5], [900.5, 40.5]];
    const before = pts.map(([x, z]) => [w.isLid(x, z), w.isWater(x, z), w.groundAt(x, z)]);
    expect(before.every((b) => b[0] === false)).toBe(true);
    w.dropLid();
    expect(pts.map(([x, z]) => [w.isLid(x, z), w.isWater(x, z), w.groundAt(x, z)])).toEqual(before);
    w.raiseLid();
  });
});
