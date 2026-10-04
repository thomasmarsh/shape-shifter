import { describe, expect, it } from 'vitest';
import { FormId } from '../forms';
import { World } from '../world';
import { exploreIn, expectUniqueIds, expectWayOut, respawnOf } from './testkit';

// The checks that span both halves of Galecrest, and the proof that it gives its forms real work.
// One World and one explorer are shared, so each distinct explore runs once.

const world = new World();
const { layout } = world;
const NINE: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah', 'snake'];
const TEN: FormId[] = [...NINE, 'axolotl'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);
const mine = (id: string) => id.startsWith('gc-') || id === 'galecrest';
const gc = layout.puzzles.filter((p) => p.id.startsWith('gc-'));
const candle = (id: string) => gc.find((p) => p.id === id)!.candle;
const checkpoint = (id: string) => layout.checkpoints.find((c) => c.id === id)!;

const run = exploreIn(world, { x0: 1300, x1: 1590 });
const COURT = respawnOf(checkpoint('galecrest'));
const END = respawnOf(checkpoint('gc-end'));

describe('Galecrest as a whole', () => {
  const all = layout.checkpoints.filter((c) => mine(c.id));

  it('has no id clash across both halves and the world', () => {
    expect(all).toHaveLength(8);
    expectUniqueIds(layout.checkpoints, layout.bread, layout.puzzles, layout.hints);
    expect(layout.bread.filter((b) => b.id.startsWith('gc-')).length).toBeGreaterThan(0);
  });

  it('lets the ten on easy get from every respawn spot back to the Court', () => {
    // gc-end is left out: its only way off is a fall, by decision (the game stops there for now).
    const open = all.filter((c) => c.id !== 'gc-end');
    expect(open).toHaveLength(7);
    expectWayOut(run, open, COURT, TEN, 'easy');
  }, 60000);
});

describe('Galecrest: every form has work', () => {
  it('has five puzzles, and the ten on easy use every speaker and candle', () => {
    expect(gc.map((p) => p.id).sort()).toEqual(['gc-crag', 'gc-ring', 'gc-road', 'gc-stair', 'gc-tarn']);
    const r = run(COURT, TEN, 'easy');
    for (const p of gc) {
      expect(r.canUse(p.speaker), `${p.id} speaker`).toBe(true);
      expect(r.canUse(p.candle), `${p.id} candle`).toBe(true);
    }
  });

  // On max, without each form below, a candle is out of reach. The Human, the Wolf and the Mermaid alone
  // are the known exceptions and nothing is asserted about them: the Human's work is the sword fights,
  // which the checker ignores; the Cheetah runs thin sheets as well as the Wolf; the Axolotl dives as deep
  // as the Mermaid.
  const LOSES: [FormId, string[]][] = [
    ['fairy', ['gc-road', 'gc-stair']],
    ['orangutan', ['gc-road']],
    ['bunny', ['gc-ring', 'gc-stair']],
    ['ant', ['gc-ring']],
    ['cheetah', ['gc-stair', 'gc-crag']],
    ['snake', ['gc-crag']],
    ['axolotl', ['gc-tarn', 'gc-ring', 'gc-road', 'gc-stair', 'gc-crag']], // the only way under the Windbreak
  ];
  for (const [form, ids] of LOSES) {
    it(`needs the ${form}: without it ${ids.join(' and ')} is out of reach on max`, () => {
      const r = run(COURT, without(TEN, form), 'max');
      for (const id of ids) expect(r.canUse(candle(id)), id).toBe(false);
    });
  }

  // The pickle sits in a roofed cell now (TARN_CELL in galecrest.ts): the Mermaid does not fit under a hollow.
  it('keeps the Tarn candle from the nine without the Axolotl, the Mermaid and all, on max, and gives it to the ten on easy', () => {
    expect(run(COURT, NINE, 'max').canUse(candle('gc-tarn')), 'nine, max').toBe(false);
    expect(run(COURT, TEN, 'easy').canUse(candle('gc-tarn')), 'ten, easy').toBe(true);
  });

  it('keeps the Stair candle from everyone without both runners', () => {
    const r = run(COURT, without(without(TEN, 'wolf'), 'cheetah'), 'max');
    expect(r.canUse(candle('gc-stair'))).toBe(false);
  });

  it('keeps everything from everyone without both swimmers', () => {
    const r = run(COURT, without(without(TEN, 'mermaid'), 'axolotl'), 'max');
    for (const p of gc) {
      expect(r.canUse(p.speaker), `${p.id} speaker`).toBe(false);
      expect(r.canUse(p.candle), `${p.id} candle`).toBe(false);
    }
  });
});

describe('Galecrest: the wings', () => {
  it('are what the way off needs: the ten on max without wings do not stand on Kestrel Rock, with wings the ten on easy do', () => {
    expect(run(COURT, TEN, 'max').canStand(END), 'ten, max, no wings').toBe(false);
    expect(run(COURT, TEN, 'easy', true).canStand(END), 'ten, easy, wings').toBe(true);
  });

  it('are the Human\'s: with wings and without the Human, on max, nobody stands on Kestrel Rock', () => {
    expect(run(COURT, without(TEN, 'human'), 'max', true).canStand(END)).toBe(false);
  });
});
