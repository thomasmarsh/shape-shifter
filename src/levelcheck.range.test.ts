import { describe, expect, it } from 'vitest';
import { FormId } from './forms';
import { explore, Profile, XRange } from './levelcheck';
import { World } from './world';

// A bounded explore must answer, for every tile and thing inside its island, what
// the whole-world explore answers. Each case is run both ways and compared.

const world = new World();
const { layout } = world;

/** How far past an island's own columns the bounded search looks. */
const MARGIN = Number(process.env.RANGE_MARGIN ?? 40);

const ISLANDS = {
  meadow: { x0: 0, x1: 62 },
  tanglewood: { x0: 60, x1: 125 },
  highcrag: { x0: 123, x1: 200 },
  frostfang: { x0: 200, x1: 308 },
  underroot: { x0: 299, x1: 480 },
  saltmere: { x0: 486, x1: 700 },
};
type IslandId = keyof typeof ISLANDS;

const FIVE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf'];
const SIX: FormId[] = [...FIVE, 'ant'];
const SEVEN: FormId[] = [...SIX, 'mermaid'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);

const cases: [IslandId, { x: number; z: number }, FormId[], Profile][] = [
  ['meadow', layout.spawn, ['human'], 'easy'],
  ['meadow', layout.spawn, ['human', 'fairy'], 'max'],
  ['tanglewood', { x: 64.5, z: 30.5 }, FIVE, 'easy'],
  ['highcrag', { x: 129.5, z: 28.5 }, FIVE, 'easy'],
  ['highcrag', { x: 129.5, z: 28.5 }, without(FIVE, 'fairy'), 'max'],
  ['highcrag', { x: 175.5, z: 35.5 }, FIVE, 'max'],
  ['highcrag', { x: 180.5, z: 44.5 }, ['human', 'bunny', 'wolf'], 'easy'],
  ['frostfang', { x: 208.5, z: 40.5 }, FIVE, 'easy'],
  ['frostfang', { x: 208.5, z: 40.5 }, without(FIVE, 'wolf'), 'max'],
  ['frostfang', { x: 243.5, z: 29.5 }, FIVE, 'max'],
  ['frostfang', { x: 277.5, z: 30.5 }, ['human', 'fairy', 'wolf'], 'easy'],
  ['frostfang', { x: 304.5, z: 11.5 }, SIX, 'max'],
  ['underroot', { x: 304.5, z: 51.5 }, SIX, 'easy'],
  ['underroot', { x: 304.5, z: 51.5 }, without(SIX, 'ant'), 'max'],
  ['underroot', { x: 388.5, z: 52.5 }, SIX, 'max'],
  ['underroot', { x: 409.5, z: 35.5 }, without(SIX, 'fairy'), 'easy'],
  ['underroot', { x: 419.5, z: 34.5 }, SIX, 'max'],
  ['saltmere', { x: 492.5, z: 52.5 }, SIX, 'easy'],
  ['saltmere', { x: 492.5, z: 52.5 }, without(SIX, 'ant'), 'max'],
  ['saltmere', { x: 492.5, z: 52.5 }, without(SIX, 'fairy'), 'max'],
  ['saltmere', { x: 540.5, z: 52.5 }, SIX, 'max'],
  ['saltmere', { x: 582.5, z: 52.5 }, SEVEN, 'easy'],
  ['saltmere', { x: 582.5, z: 52.5 }, without(SIX, 'human'), 'max'],
  ['saltmere', { x: 598.5, z: 33.5 }, without(SIX, 'human'), 'max'],
  ['saltmere', { x: 611.5, z: 33.5 }, SEVEN, 'max'],
];

/** A digest of every reached tile and every usable thing inside the island's own columns. */
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
  return `${h}`;
}

describe('a bounded explore', () => {
  // Each whole-world explore costs about 250 ms, so the default run keeps one
  // case in `STRIDE`, spread over every island. RANGE_PROOF=full runs them all.
  const STRIDE = process.env.RANGE_PROOF === 'full' ? 1 : 4;
  const picked = cases.filter((_, n) => n % STRIDE === 0);

  it.each(picked)('reaches inside %s from %j as %j on %s what the whole world reaches', (island, from, forms, profile) => {
    const own = ISLANDS[island];
    const range = { x0: Math.max(0, own.x0 - MARGIN), x1: Math.min(world.width, own.x1 + MARGIN) };
    const whole = explore(world, from, forms, profile);
    expect(whole.tiles, 'reaches something').toBeGreaterThan(10);
    expect(digest(explore(world, from, forms, profile, range), own)).toBe(digest(whole, own));
  }, 20000);
});
