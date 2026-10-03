import { describe, expect, it } from 'vitest';
import { explore } from '../levelcheck';
import { World } from '../world';

const world = new World();
const { layout } = world;

// The 'far-island' checkpoint's stand spot: where a player coming across lands.
const start = { x: 63.5, z: 24.5 };

const puzzle = (id: string) => layout.puzzles.find((p) => p.id === id)!;
const bread = (id: string) => layout.bread.find((b) => b.id === id)!;
const ground = (i: number, j: number) => world.groundAt(i + 0.5, j + 0.5);

const ALL = ['tw-lake', 'tw-keep', 'tw-marsh', 'tw-stairs'];
const CHAIN = [
  { x: 113.5, z: 27.5 },
  { x: 116.5, z: 26.5 },
  { x: 119.5, z: 27.5 },
  { x: 122.5, z: 28.5 },
];

describe('Tanglewood reachability', () => {
  it('lets a human who can turn into a fairy solve all four puzzles and reach the checkpoints', () => {
    const r = explore(world, start, ['human', 'fairy'], 'easy');
    for (const id of ALL) {
      expect(r.canUse(puzzle(id).speaker), `${id} speaker`).toBe(true);
      expect(r.canUse(puzzle(id).candle), `${id} candle`).toBe(true);
    }
    const tanglewood = ['far-island', 'tw-cross', 'tw-south', 'tw-grove'];
    for (const id of tanglewood) {
      const c = layout.checkpoints.find((k) => k.id === id)!;
      expect(r.canStand({ x: c.x - 1, z: c.z + 1 }), `checkpoint ${id}`).toBe(true);
    }
    for (const b of layout.bread.filter((k) => k.id.startsWith('tw-') && k.id !== 'tw-lookout')) {
      expect(r.canStand(b), `bread ${b.id}`).toBe(true);
    }
  });

  it('lets a human alone reach the lake and marsh speakers', () => {
    const r = explore(world, start, ['human'], 'easy');
    expect(r.canUse(puzzle('tw-lake').speaker)).toBe(true);
    expect(r.canUse(puzzle('tw-marsh').speaker)).toBe(true);
  });

  it('keeps a human, even at the limit, off the candles that need a fairy', () => {
    const r = explore(world, start, ['human'], 'max');
    expect(r.canUse(puzzle('tw-lake').candle), 'lake candle').toBe(false);
    expect(r.canUse(puzzle('tw-keep').speaker), 'keep speaker').toBe(false);
    expect(r.canUse(puzzle('tw-keep').candle), 'keep candle').toBe(false);
    expect(r.canUse(puzzle('tw-marsh').candle), 'marsh candle').toBe(false);
    expect(r.canUse(puzzle('tw-stairs').speaker), 'stairs speaker').toBe(false);
    expect(r.canUse(puzzle('tw-stairs').candle), 'stairs candle').toBe(false);
    expect(r.canStand(bread('tw-marsh')), 'overlook bread').toBe(false);
  });

  it('keeps a fairy, even at the limit, off the Lookout and the exit', () => {
    const r = explore(world, start, ['human', 'fairy'], 'max');
    expect(r.canStand(bread('tw-lookout')), 'lookout').toBe(false);
    CHAIN.forEach((p, n) => expect(r.canStand(p), `P${n + 1}`).toBe(false));
    expect(r.canStand({ x: 125.5, z: 28.5 })).toBe(false);
    // Nothing at all of the next island, wherever it is.
    for (let j = 0; j < world.depth; j++) {
      for (let i = 123; i < world.width; i++) {
        expect(r.has(i, j), `tile ${i},${j}`).toBe(false);
      }
    }
  });

  it('lets an orangutan reach the Lookout and every exit pillar', () => {
    const r = explore(world, start, ['human', 'fairy', 'orangutan'], 'easy');
    expect(r.canStand(bread('tw-lookout')), 'lookout').toBe(true);
    CHAIN.forEach((p, n) => expect(r.canStand(p), `P${n + 1}`).toBe(true));
  });
});

describe('Tanglewood geometry', () => {
  it('keeps the keep tower out of a fairy\'s reach from the plateau, but not from the launch stone', () => {
    const tower = ground(83, 13);
    expect(tower - ground(85, 16)).toBeGreaterThanOrEqual(4);
    expect(ground(86, 15) + 3).toBeGreaterThanOrEqual(tower);
  });

  it('puts the lake pillar one fairy flight above the launch rock only', () => {
    const pillar = ground(82, 40);
    expect(pillar - 3).toBeGreaterThan(ground(74, 36) + 0.65);
    expect(pillar).toBe(ground(79, 40) + 3);
  });

  it('keeps every marsh guard well away from the mound', () => {
    const guards = layout.enemies.filter((e) => [[93.5, 36.5], [99.5, 28.5], [101.5, 44.5]].some(([x, z]) => e.x === x && e.z === z));
    expect(guards).toHaveLength(3);
    for (const g of guards) expect(Math.hypot(g.x - 101.5, g.z - 36.5)).toBeGreaterThan(7.5);
  });

  it('puts the second sky stone more than a fairy flight above the shore', () => {
    expect(ground(80, 57) - ground(90, 49)).toBeGreaterThanOrEqual(4);
  });
});

describe('Tanglewood placement', () => {
  const things = [
    ...layout.puzzles.flatMap((p) => [
      { n: `${p.id} speaker`, ...p.speaker },
      { n: `${p.id} candle`, ...p.candle },
    ]),
    ...layout.checkpoints.filter((c) => c.x > 60 && c.x < 125).flatMap((c) => [
      { n: `${c.id} checkpoint`, x: c.x, z: c.z },
      { n: `${c.id} stand`, x: c.x - 1, z: c.z + 1 },
    ]),
    ...layout.bread.filter((b) => b.id.startsWith('tw-')).map((b) => ({ n: `bread ${b.id}`, x: b.x, z: b.z })),
    ...layout.enemies.filter((e) => e.x > 60 && e.x < 125).map((e, n) => ({ n: `guard ${n}`, x: e.x, z: e.z })),
  ];

  it('stands every thing on dry ground', () => {
    for (const th of things) {
      expect(world.isVoid(th.x, th.z), `${th.n} in sky`).toBe(false);
      expect(world.isWater(th.x, th.z), `${th.n} in water`).toBe(false);
    }
  });

  it('keeps every tree and boulder off every thing', () => {
    const solids = [...layout.trees.filter((t) => t.x > 60 && t.x < 125), ...layout.boulders.filter((b) => b.x > 60 && b.x < 125)];
    for (const th of things) {
      for (const s of solids) {
        expect(Math.hypot(th.x - s.x, th.z - s.z), `${th.n} vs ${s.x},${s.z}`).toBeGreaterThan(1.2);
      }
    }
  });

  it('puts every tree and boulder on ground', () => {
    for (const s of [...layout.trees, ...layout.boulders].filter((b) => b.x > 60 && b.x < 125)) {
      expect(world.isVoid(s.x, s.z), `${s.x},${s.z}`).toBe(false);
      expect(world.isWater(s.x, s.z), `${s.x},${s.z}`).toBe(false);
    }
  });
});

describe('Tanglewood respawns', () => {
  it('keeps every checkpoint at least 7 tiles from a guard post at about its height', () => {
    const onTanglewood = (s: { x: number }) => s.x >= 61 && s.x < 123;
    for (const c of layout.checkpoints.filter(onTanglewood)) {
      for (const e of layout.enemies.filter(onTanglewood)) {
        if (Math.abs(world.groundAt(e.x, e.z) - world.groundAt(c.x, c.z)) > 3) continue;
        expect(Math.hypot(e.x - c.x, e.z - c.z), `${c.id} vs guard (${e.x}, ${e.z})`).toBeGreaterThanOrEqual(7);
      }
    }
  });
});
