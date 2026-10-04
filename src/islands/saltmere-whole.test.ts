import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { expectWayOut, exploreIn } from './testkit';
import { FormId } from '../forms';
import { Kind, World } from '../world';

// Saltmere as a whole (x 486..699): ids, the README, the look, the join and the footing.

const world = new World();
// Saltmere's columns and a margin for its neighbours; the explores see only these.
const explore = exploreIn(world, { x0: 446, x1: 740 });
const { layout } = world;
const kinds = (world as unknown as { kind: Uint8Array }).kind;

const onSaltmere = (s: { x: number }) => s.x >= 486 && s.x < 700;
const mine = <T extends { x: number }>(items: T[]): T[] => items.filter(onSaltmere);
const SEVEN: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid'];

const sms = layout.puzzles.filter((p) => p.id.startsWith('sm-'));

describe('Saltmere as a whole', () => {
  it('has no id clash among its checkpoints, puzzles, bread, hints and arrivals, nor in the world', () => {
    const own = [
      mine(layout.checkpoints),
      mine(layout.bread),
      mine(layout.hints),
      mine(layout.arrivals),
      layout.puzzles.filter((p) => onSaltmere(p.speaker)),
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

  it('gives the five sm- puzzles six different notes each, and no melody of any older island', () => {
    expect(sms).toHaveLength(5);
    for (const p of sms) {
      expect(p.melody, p.id).toHaveLength(6);
      expect(new Set(p.melody).size, p.id).toBe(6);
    }
    const key = (p: { melody: number[] }) => p.melody.join();
    expect(new Set(sms.map(key)).size).toBe(5);
    const older = new Set(layout.puzzles.filter((p) => !p.id.startsWith('sm-')).map(key));
    for (const p of sms) expect(older.has(key(p)), `${p.id} repeats an older melody`).toBe(false);
  });

  it('lists every checkpoint in the README', () => {
    const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
    const ids = mine(layout.checkpoints).map((c) => c.id);
    expect(ids).toContain('saltmere');
    for (const id of ids) expect(readme, `checkpoint ${id} in the README`).toContain(`\`${id}\``);
  });

  it('is sand, salt and stone only, with no frost look', () => {
    let checked = 0;
    for (let j = 0; j < world.depth; j++) {
      for (let i = 486; i < 700; i++) {
        if (world.isVoid(i + 0.5, j + 0.5)) continue;
        checked++;
        const k = kinds[j * world.width + i];
        // The salt stair (x 545..547) is thin ice laid over a void tile.
        if (k === Kind.Void && world.isIceIntact(i + 0.5, j + 0.5)) {
          expect(i >= 545 && i <= 547, `thin ice at (${i}, ${j})`).toBe(true);
          continue;
        }
        expect([Kind.Sand, Kind.Salt, Kind.Stone], `kind at (${i}, ${j})`).toContain(k);
        expect(world.isFrostTile(i, j), `frost at (${i}, ${j})`).toBe(false);
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it('joins the beach (38) at x 583 to the Mere (water level 37.7) at x 584', () => {
    for (let j = 46; j <= 58; j++) {
      expect(world.groundAt(583.5, j + 0.5), `beach (583, ${j})`).toBe(38);
      expect(world.isWater(584.5, j + 0.5), `water (584, ${j})`).toBe(true);
      expect(world.waterLevelAt(584.5, j + 0.5), `level (584, ${j})`).toBeCloseTo(37.7, 3);
    }
  });

  it('stands every sea pickle in water over a bed 4 deep, and every speaker on dry ground', () => {
    for (const p of sms) {
      const { x, z } = p.candle;
      expect(world.isWater(x, z), `${p.id} pickle in water`).toBe(true);
      expect(world.waterLevelAt(x, z) - world.groundAt(x, z), `${p.id} bed`).toBeCloseTo(4, 0);
      expect(Math.abs(world.waterLevelAt(x, z) - world.groundAt(x, z) - 4), `${p.id} bed`).toBeLessThan(0.35);
      expect(world.isWater(p.speaker.x, p.speaker.z), `${p.id} speaker dry`).toBe(false);
      expect(world.isVoid(p.speaker.x, p.speaker.z), `${p.id} speaker`).toBe(false);
    }
  });

  it('never leaves a checkpoint where the only way off is a fall', () => {
    const arrival = layout.arrivals.find((a) => a.id === 'saltmere')!;
    const cps = mine(layout.checkpoints);
    expect(cps.length).toBeGreaterThan(5);
    expectWayOut(explore, cps, arrival, SEVEN, 'easy');
  });
});
