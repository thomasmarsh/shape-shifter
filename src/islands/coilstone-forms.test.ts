import { describe, expect, it } from 'vitest';
import { exploreIn, expectUniqueIds, expectMelodies, expectWayOut, respawnOf as respawn } from './testkit';
import { FormId } from '../forms';
import { World } from '../world';

// The proof that Coilstone gives its forms real work, and the checks that span
// both halves, in a file of its own so that it runs beside the island's other tests.

const world = new World();
const { layout } = world;
const checkpoint = (id: string) => layout.checkpoints.find((c) => c.id === id)!;
const EIGHT: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah'];
const NINE: FormId[] = [...EIGHT, 'snake'];
const without = (forms: FormId[], f: FormId): FormId[] => forms.filter((x) => x !== f);
const cs = layout.puzzles.filter((p) => ['cs-court', 'cs-colonnade', 'cs-tooth', 'cs-stair', 'cs-thicket'].includes(p.id));

const WEST = { x0: 925, x1: 1062 };
const CROSS = { x0: 1000, x1: 1136 };
const west = exploreIn(world, WEST);
const cross = exploreIn(world, CROSS);
const whole = exploreIn(world, { x0: 925, x1: 1136 });
const LANDING = respawn(checkpoint('coilstone'));
const RIM = respawn(checkpoint('cs-rim'));
const END = respawn(checkpoint('cs-end'));

describe('Coilstone: every form has work', () => {
  it('has five puzzles, and the eight on easy use every speaker and candle', () => {
    expect(cs).toHaveLength(5);
    for (const [explore, from] of [
      [west, LANDING],
      [cross, RIM],
    ] as const) {
      const r = explore(from, EIGHT, 'easy');
      const here = cs.filter((p) => p.speaker.x >= (explore === west ? 925 : 1062) && p.speaker.x < (explore === west ? 1031 : 1136));
      expect(here.length).toBeGreaterThan(0);
      for (const p of here) {
        expect(r.canUse(p.speaker), `${p.id} speaker`).toBe(true);
        expect(r.canUse(p.candle), `${p.id} candle`).toBe(true);
      }
    }
  });

  // On max, without each form below, a candle is out of reach. The Wolf and the Human are the
  // exceptions: the Cheetah, which the player has from the start of Coilstone, runs thin sheets as
  // well as the Wolf, so the Wolf has no work of its own here, and the Human's work is the sword
  // fights, which the checker ignores. The other six do all the island's work between them.
  const LOSES: [FormId, string[], 'west' | 'cross'][] = [
    ['fairy', ['cs-colonnade', 'cs-tooth'], 'west'],
    ['fairy', ['cs-stair'], 'cross'],
    ['orangutan', ['cs-colonnade'], 'west'],
    ['orangutan', ['cs-thicket'], 'cross'],
    ['bunny', ['cs-court'], 'west'],
    ['bunny', ['cs-stair'], 'cross'],
    ['ant', ['cs-tooth'], 'west'],
    ['ant', ['cs-thicket'], 'cross'],
    ['mermaid', ['cs-court'], 'west'],
    ['cheetah', ['cs-stair', 'cs-thicket'], 'cross'],
  ];
  for (const [form, candles, half] of LOSES) {
    it(`needs the ${form}: without it ${candles.join(' and ')} is out of reach on max (${half})`, () => {
      const r = half === 'west' ? west(LANDING, without(EIGHT, form), 'max') : cross(RIM, without(EIGHT, form), 'max');
      for (const id of candles) expect(r.canUse(cs.find((p) => p.id === id)!.candle), id).toBe(false);
    });
  }

  it('keeps the Tooth candle from everyone without both runners, and gives it to either alone', () => {
    const tooth = cs.find((p) => p.id === 'cs-tooth')!;
    const base = without(without(EIGHT, 'wolf'), 'cheetah');
    expect(west(LANDING, base, 'max').canUse(tooth.candle), 'no runner, max').toBe(false);
    expect(west(LANDING, [...base, 'wolf'], 'easy').canUse(tooth.candle), 'wolf alone, easy').toBe(true);
    expect(west(LANDING, [...base, 'cheetah'], 'easy').canUse(tooth.candle), 'cheetah alone, easy').toBe(true);
  });
});

describe('Coilstone: the Snake', () => {
  it('is what the way off needs: the eight on max do not stand at cs-end, the nine on easy do', () => {
    expect(cross(RIM, EIGHT, 'max').canStand(END), 'eight, max').toBe(false);
    expect(cross(RIM, NINE, 'easy').canStand(END), 'nine, easy').toBe(true);
  });
});

describe('Coilstone as a whole', () => {
  const all = layout.checkpoints.filter((c) => c.id.startsWith('cs-') || c.id === 'coilstone');

  it('has no id clash and no repeated melody across both halves', () => {
    const mine = <T extends { id: string }>(list: T[]) =>
      list.filter((x) => x.id.startsWith('cs-') || x.id === 'coilstone');
    expect(all).toHaveLength(7);
    expectUniqueIds(layout.checkpoints, layout.bread, layout.puzzles, layout.hints);
    expectMelodies(mine(layout.puzzles), layout.puzzles);
    expect(mine(layout.bread).length).toBeGreaterThan(0);
  });

  it('lets the nine on easy get from every respawn spot back to the Landing', () => {
    expectWayOut(whole, all, LANDING, NINE, 'easy');
  }, 30000);
});
