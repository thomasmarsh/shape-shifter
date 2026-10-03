import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Kind, World } from '../world';

// Underroot and Saltmere as a whole: ids, the README, the look and the hub join.

const world = new World();
const { layout } = world;
const kinds = (world as unknown as { kind: Uint8Array }).kind;

const onUnderroot = (s: { x: number }) => s.x >= 299;
const mine = <T extends { x: number }>(items: T[]): T[] => items.filter(onUnderroot);

/** Every non-void tile that Underroot or Saltmere own (Frostfang's last run reaches x 306 above z 46). */
const tiles: [number, number][] = [];
for (const b of world.bounds.filter((k) => k.id === 'underroot' || k.id === 'saltmere')) {
  for (let j = b.j0; j <= b.j1; j++) {
    for (let i = b.i0; i <= b.i1; i++) {
      if (world.isVoid(i + 0.5, j + 0.5) || (i < 307 && j < 46)) continue;
      tiles.push([i, j]);
    }
  }
}

describe('Underroot and Saltmere as a whole', () => {
  it('has no id clash among its checkpoints, puzzles, bread, hints and arrivals', () => {
    const own = [
      mine(layout.checkpoints),
      mine(layout.bread),
      mine(layout.hints),
      mine(layout.arrivals),
      layout.puzzles.filter((p) => onUnderroot(p.speaker)),
    ];
    for (const items of own) {
      expect(items.length).toBeGreaterThan(0);
      const ids = items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    for (const items of [layout.checkpoints, layout.bread, layout.hints, layout.puzzles, layout.arrivals]) {
      const all = items.map((i) => i.id);
      expect(new Set(all).size).toBe(all.length);
    }
  });

  it('gives the five ur- puzzles five distinct six-note melodies', () => {
    const urs = layout.puzzles.filter((p) => p.id.startsWith('ur-'));
    expect(urs).toHaveLength(5);
    for (const p of urs) {
      expect(p.melody, p.id).toHaveLength(6);
      expect(new Set(p.melody).size, p.id).toBe(6);
    }
    expect(new Set(urs.map((p) => p.melody.join())).size).toBe(5);
  });

  it('lists every checkpoint in the README', () => {
    const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
    const ids = mine(layout.checkpoints).map((c) => c.id);
    expect(ids).toContain('underroot');
    expect(ids).toContain('saltmere');
    for (const id of ids) expect(readme, `checkpoint ${id} in the README`).toContain(`\`${id}\``);
  });

  it('has no snow or ice, and no frost look, on a tile of its own', () => {
    expect(tiles.length).toBeGreaterThan(1000);
    expect(world.isFrostTile(208, 40), 'Frostfang keeps its look').toBe(true);
    expect(world.isFrostTile(304, 11), 'Last Rock keeps its look').toBe(true);
    for (const [i, j] of tiles) {
      const k = kinds[j * world.width + i];
      expect(k === Kind.Snow || k === Kind.Ice, `(${i}, ${j})`).toBe(false);
      expect(world.isFrostTile(i, j), `frost at (${i}, ${j})`).toBe(false);
    }
  });

  it('keeps the hub 32 high on both sides of the join', () => {
    for (let j = 47; j <= 57; j++) {
      expect(world.groundAt(384.5, j + 0.5), `(384, ${j})`).toBe(32);
      expect(world.groundAt(385.5, j + 0.5), `(385, ${j})`).toBe(32);
    }
  });
});
