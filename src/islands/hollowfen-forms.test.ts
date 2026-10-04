import { describe, expect, it } from 'vitest';
import { exploreIn, respawnOf as respawn } from './testkit';
import { FormId } from '../forms';
import { World } from '../world';

// The proof that Hollowfen gives its forms real work, in a file of its own so that it
// runs beside the island's other tests.

const world = new World();
const { layout } = world;
const checkpoint = (id: string) => layout.checkpoints.find((c) => c.id === id)!;
const NINE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake'];
const TEN: FormId[] = [...NINE, 'axolotl'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);
const hf = layout.puzzles.filter((p) => p.id.startsWith('hf-'));
const candle = (id: string) => hf.find((p) => p.id === id)!.candle;

const run = exploreIn(world, { x0: 1125, x1: 1336 });
const LANDING = respawn(checkpoint('hollowfen'));
const END = respawn(checkpoint('hf-end'));

describe('Hollowfen: every form has work', () => {
  it('has five puzzles, and the nine on easy use every speaker and candle', () => {
    expect(hf.map((p) => p.id).sort()).toEqual(['hf-mound', 'hf-pool', 'hf-ring', 'hf-road', 'hf-stair']);
    const r = run(LANDING, NINE, 'easy');
    for (const p of hf) {
      expect(r.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(r.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
  });

  // On max, without each form below, a candle is out of reach. The Human and the Wolf alone are the
  // known exceptions and nothing is asserted about them: the Cheetah runs thin sheets as well as the
  // Wolf, and the Human's work is the sword fights, which the checker ignores.
  const LOSES: [FormId, string[]][] = [
    ['fairy', ['hf-road']],
    ['orangutan', ['hf-road']],
    ['bunny', ['hf-ring']],
    ['ant', ['hf-ring']],
    ['mermaid', ['hf-pool']],
    ['cheetah', ['hf-stair', 'hf-mound']],
    ['snake', ['hf-mound']],
  ];
  for (const [form, ids] of LOSES) {
    it(`needs the ${form}: without it ${ids.join(' and ')} is out of reach on max`, () => {
      const r = run(LANDING, without(NINE, form), 'max');
      for (const id of ids) expect(r.canUse(candle(id)), id).toBe(false);
    });
  }

  it('keeps the Stair candle from everyone without both runners', () => {
    const r = run(LANDING, without(without(NINE, 'wolf'), 'cheetah'), 'max');
    expect(r.canUse(candle('hf-stair'))).toBe(false);
  });
});

describe('Hollowfen: the Axolotl', () => {
  it('is what the way off needs: the nine on max do not stand at hf-end, the ten on easy do', () => {
    expect(run(LANDING, NINE, 'max').canStand(END), 'nine, max').toBe(false);
    expect(run(LANDING, TEN, 'easy').canStand(END), 'ten, easy').toBe(true);
  });
});
