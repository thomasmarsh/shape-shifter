import { describe, expect, it } from 'vitest';
import { exploreIn, respawnOf as respawn } from './testkit';
import { FormId } from '../forms';
import { World } from '../world';

// The proof that Sunveld gives its forms real work, in a file of its own so
// that it runs beside sunveld-whole.test.ts rather than after it.

const world = new World();
const { layout } = world;
// Every Sunveld test file uses this range, so they share cached explores.
const explore = exploreIn(world, { x0: 620, x1: 960 });

const SEVEN: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);
const START = respawn(layout.checkpoints.find((c) => c.id === 'sunveld')!);
const svs = layout.puzzles.filter((p) => p.id.startsWith('sv-'));

describe('Sunveld: every form has work', () => {
  // Each form of the level-6 set but the Human has real work: without it, on max, a candle is out of
  // reach. The other six forms do all of Sunveld's work between them; the Human is needed nowhere.
  const LOSES: [FormId, string][] = [
    ['fairy', 'sv-table'],
    ['orangutan', 'sv-grove'],
    ['bunny', 'sv-oxbow'],
    ['wolf', 'sv-table'],
    ['ant', 'sv-kraal'],
    ['mermaid', 'sv-hole'],
  ];
  for (const [form, candle] of LOSES) {
    it(`needs the ${form}: without it the ${candle} candle is out of reach on max`, () => {
      const r = explore(START, without(SEVEN, form), 'max');
      const lost = svs.filter((p) => !r.canUse(p.candle)).map((p) => p.id);
      expect(lost).toContain(candle);
    });
  }
});
