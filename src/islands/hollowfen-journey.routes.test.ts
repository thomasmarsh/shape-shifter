import { describe, expect, it } from 'vitest';
import { Pilot } from '../pilot';
import { World } from '../world';
import { respawnOf } from './testkit';

// The joins the room route files leave out, driven by a real Player.

const world = new World();
const { layout } = world;
const spotOf = (id: string) => respawnOf(layout.checkpoints.find((c) => c.id === id)!);

const at = (i: number, j: number) => ({ x: i + 0.5, z: j + 0.5 });
const MOUND_SPEAKER = { x: 1312.5, z: 40.5 };
const MOUND_CANDLE = { x: 1312.5, z: 49.5 };

describe('Hollowfen the Reed Pool, from the hub', () => {
  it('lets a Human walk to the shore, shift to a Mermaid in the water and use the pickle', () => {
    const p = new Pilot(world, 'human', spotOf('hf-hub'));
    // The north shore: the straight way from the hub, with the speaker on the far side.
    expect(p.walk(at(1205, 40), { seconds: 40 }), p.describe()).toBe(true);
    expect(p.walk(at(1205, 43), { seconds: 10 }), p.describe()).toBe(true);
    p.shift('mermaid');
    expect(p.dive(at(1206, 44), { seconds: 20 }), p.describe()).toBe(true);
    expect(p.canUse({ x: 1206.5, z: 43.5 }), p.describe()).toBe(true);
  });
});

describe('Hollowfen the Mound, from the foot', () => {
  it('lets a Snake go round the guards from the north, up the burrow and on to the speaker and the candle', () => {
    const p = new Pilot(world, 'snake', spotOf('hf-foot'));
    const where = (what: string) => `${what}: ${p.describe()}`;
    expect(p.walk(at(1292, 38), { seconds: 20 }), where('north of the guards')).toBe(true);
    expect(p.walk(at(1294, 44), { seconds: 10 }), where('the burrow mouth')).toBe(true);
    expect(p.walk(at(1310, 44), { seconds: 30 }), where('up the burrow')).toBe(true);
    expect(p.y, where('on top')).toBeCloseTo(19.5, 1);
    expect(p.walk(at(1312, 42), { seconds: 10 }), where('by the speaker')).toBe(true);
    expect(p.canUse(MOUND_SPEAKER), where('speaker')).toBe(true);
    expect(p.walk(at(1312, 48), { seconds: 10 }), where('by the candle')).toBe(true);
    expect(p.canUse(MOUND_CANDLE), where('candle')).toBe(true);
    // and back down: the top is no trap
    expect(p.walk(at(1310, 44), { seconds: 10 }), where('to the burrow')).toBe(true);
    expect(p.walk(at(1292, 44), { seconds: 30 }), where('down the burrow')).toBe(true);
    expect(p.y, where('at the foot')).toBeLessThan(12.5);
    expect(p.fell).toBe(false);
  });

  // The burrow is a root tangle (0.35 gap): a Human cannot use it, so the top is left by its edge, a drop of 7.5.
  it('lets a Human walk off the top of the Mound by its west edge', () => {
    const p = new Pilot(world, 'human', at(1300, 40));
    expect(p.y, p.describe()).toBeCloseTo(19.5, 1);
    expect(p.walk(at(1290, 40), { seconds: 20 }), p.describe()).toBe(true);
    expect(p.y, p.describe()).toBeCloseTo(12, 1);
    expect(p.fell).toBe(false);
  });
});

describe('Hollowfen the Well, from hf-well', () => {
  it('lets an Axolotl swim under the ring, climb onto the Last Stone and stand beside hf-end', () => {
    const p = new Pilot(world, 'axolotl', spotOf('hf-well'));
    const where = (what: string) => `${what}: ${p.describe()}`;
    expect(p.walk(at(1303, 17), { seconds: 10 }), where('to the shore')).toBe(true);
    p.swim(at(1306, 17));
    expect(p.swim(at(1310, 17), { under: true, seconds: 20 }), where('under the ring')).toBe(true);
    expect(p.surface(), where('surface')).toBe(true);
    expect(p.hop(at(1314, 19), { seconds: 10 }), where('onto the stone')).toBe(true);
    expect(p.y, where('on the stone')).toBeCloseTo(12, 1);
    const end = layout.checkpoints.find((c) => c.id === 'hf-end')!;
    expect(p.walk(at(1315, 18), { seconds: 10 }), where('beside hf-end')).toBe(true);
    expect(Math.hypot(p.x - end.x, p.z - end.z), where('close to it')).toBeLessThan(1.5);
  });
});
