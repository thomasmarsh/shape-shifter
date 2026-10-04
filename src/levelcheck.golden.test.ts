import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FormId } from './forms';
import { explore, Profile, XRange } from './levelcheck';
import golden from './levelcheck.golden.json';
import { World } from './world';

// Pins what `explore` answers, so the checker can be made faster without
// changing a single answer: a hash of every tile it reaches and every thing it
// can use, plus the tile count, for explores over all islands. The default run
// takes one case in `STRIDE`; GOLDEN=full runs them all, GOLDEN=record rewrites
// the table (only when the checker's rules change on purpose).

const world = new World();
const { layout } = world;

const FIVE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf'];
const SIX: FormId[] = [...FIVE, 'ant'];
const SEVEN: FormId[] = [...SIX, 'mermaid'];
const EIGHT: FormId[] = [...SEVEN, 'cheetah'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);
const respawnAt = (id: string) => {
  const c = layout.checkpoints.find((q) => q.id === id)!;
  return { x: c.x - 1, z: c.z + 1 };
};

const SV = respawnAt('sunveld');
const SV_EAST = respawnAt('sv-east');
const SV_YARD = respawnAt('sv-yard');
const R_SV: XRange = { x0: 620, x1: 960 };
const R_EAST: XRange = { x0: 660, x1: 960 };

type Case = [string, { x: number; z: number }, FormId[], Profile, XRange | undefined];
const cases: Case[] = [
  ['meadow-1-easy-all', layout.spawn, ['human'], 'easy', undefined],
  ['meadow-2-max-all', layout.spawn, ['human', 'fairy'], 'max', undefined],
  ['tanglewood-5-easy-range', { x: 64.5, z: 30.5 }, FIVE, 'easy', { x0: 20, x1: 165 }],
  ['highcrag-4-max-range', { x: 175.5, z: 35.5 }, without(FIVE, 'fairy'), 'max', { x0: 83, x1: 240 }],
  ['highcrag-3-easy-all', { x: 180.5, z: 44.5 }, ['human', 'bunny', 'wolf'], 'easy', undefined],
  ['frostfang-5-max-range', { x: 243.5, z: 29.5 }, FIVE, 'max', { x0: 160, x1: 350 }],
  ['frostfang-6-max-range', { x: 304.5, z: 11.5 }, SIX, 'max', { x0: 160, x1: 350 }],
  ['underroot-6-easy-range', { x: 304.5, z: 51.5 }, SIX, 'easy', { x0: 259, x1: 520 }],
  ['underroot-5-max-range', { x: 409.5, z: 35.5 }, without(SIX, 'fairy'), 'max', { x0: 259, x1: 520 }],
  ['saltmere-6-easy-range', { x: 492.5, z: 52.5 }, SIX, 'easy', { x0: 446, x1: 740 }],
  ['saltmere-7-easy-range', { x: 582.5, z: 52.5 }, SEVEN, 'easy', { x0: 446, x1: 740 }],
  ['saltmere-7-max-range', { x: 611.5, z: 33.5 }, SEVEN, 'max', { x0: 446, x1: 740 }],
  ['saltmere-5-max-all', { x: 582.5, z: 52.5 }, without(SIX, 'human'), 'max', undefined],
  ['saltmere-8-max-range', { x: 540.5, z: 52.5 }, EIGHT, 'max', { x0: 446, x1: 740 }],
  ['sv-7-easy', SV, SEVEN, 'easy', R_SV],
  ['sv-7-max', SV, SEVEN, 'max', R_SV],
  ['sv-8-easy', SV, EIGHT, 'easy', R_SV],
  ['sv-8-max', SV, EIGHT, 'max', R_SV],
  ['sv-1-easy', SV, ['human'], 'easy', R_SV],
  ['sv-2-max-mermaid', SV, ['mermaid', 'human'], 'max', R_SV],
  ['sv-6-max-nomermaid', SV, without(SEVEN, 'mermaid'), 'max', R_SV],
  ['sv-6-max-noant', SV, without(SEVEN, 'ant'), 'max', R_SV],
  ['sv-4-easy-wolfcheetah', SV, ['human', 'bunny', 'wolf', 'cheetah'], 'easy', R_SV],
  ['sv-east-7-easy', SV_EAST, SEVEN, 'easy', R_EAST],
  ['sv-east-7-max', SV_EAST, SEVEN, 'max', R_EAST],
  ['sv-east-8-easy', SV_EAST, EIGHT, 'easy', R_EAST],
  ['sv-east-6-max-noorang', SV_EAST, without(SEVEN, 'orangutan'), 'max', R_EAST],
  ['sv-yard-8-easy', SV_YARD, EIGHT, 'easy', R_EAST],
  ['sv-yard-7-max', SV_YARD, SEVEN, 'max', R_EAST],
  ['sv-yard-1-easy', SV_YARD, ['human'], 'easy', R_EAST],
  ['sv-8-max-all', SV, EIGHT, 'max', undefined],
];

/** A digest of every reached tile in the searched columns and every usable thing in them. */
function digest(r: ReturnType<typeof explore>, { x0, x1 }: XRange): string {
  let h = 2166136261;
  const mix = (n: number): void => {
    h = Math.imul(h ^ n, 16777619) >>> 0;
  };
  for (let j = 0; j < world.depth; j++) for (let i = x0; i < x1; i++) mix(r.has(i, j) ? 1 : 0);
  const inside = (s: { x: number }): boolean => s.x >= x0 && s.x < x1;
  for (const p of layout.puzzles.filter((q) => inside(q.speaker))) {
    mix(r.canUse(p.speaker) ? 1 : 0);
    mix(r.canUse(p.candle) ? 1 : 0);
  }
  for (const s of [...layout.bread, ...layout.checkpoints].filter(inside)) mix(r.canUse(s) ? 1 : 0);
  return `${h}:${r.tiles}`;
}

describe('the checker, pinned', () => {
  const mode = process.env.GOLDEN ?? '';
  const STRIDE = mode === 'full' || mode === 'record' ? 1 : 4;
  const picked = cases.filter((_, n) => n % STRIDE === 0);
  const table: Record<string, string> = {};

  it.each(picked)('gives the pinned answer for %s', (name, from, forms, profile, range) => {
    const r = explore(world, from, forms, profile, range);
    const got = digest(r, range ?? { x0: 0, x1: world.width });
    if (mode === 'record') {
      table[name] = got;
      writeFileSync(new URL('./levelcheck.golden.json', import.meta.url), `${JSON.stringify(table, null, 2)}\n`);
      return;
    }
    expect(got).toBe((golden as Record<string, string>)[name]);
  }, 20000);
});
