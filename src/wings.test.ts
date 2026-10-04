import { describe, expect, it } from 'vitest';
import { GLIDE_SINK, GLIDE_SPEED, WINGS_LEVEL } from './forms';
import { Pilot } from './pilot';
import { Kind, World } from './world';

// The wings (level 10) with the real player physics, on small hand-built worlds:
// a pad at height 12 in rows 14-16 and, for the long glides, ground across the sky.

const at = (i: number, j = 15) => ({ x: i + 0.5, z: j + 0.5 });
const PAD = 12;

/** A pad of columns 0-9 at height 12, then `sky` empty tiles, then ground of `height` (columns after the sky, 10 wide). */
function world(sky: number, height = 1): World {
  return new World([
    {
      id: 'pad',
      name: 'Pad',
      build(t) {
        t.rect(0, 14, 9, 16, (i, j) => t.set(i, j, PAD, Kind.Stone));
        t.rect(10 + sky, 14, 19 + sky, 16, (i, j) => t.set(i, j, height, Kind.Stone));
        return { spawn: at(2) };
      },
    },
  ]);
}

const shared = world(41);

/** A level 10 pilot on the pad, as a Human unless told otherwise. */
function pilot(level = WINGS_LEVEL, w: World = shared): Pilot {
  const p = new Pilot(w, 'human', at(8));
  p.player.level = level;
  return p;
}

type Frame = { held?: boolean; hit?: boolean; dir?: number };

/** Run the player a frame at a time with a scripted keyboard, east when `dir` is 1. */
function step(p: Pilot, { held = false, hit = false, dir = 0 }: Frame): void {
  const input = {
    held: (c: string) => c === 'Space' && (held || hit),
    hit: (c: string) => c === 'Space' && hit,
    move: () => ({ x: dir * Math.SQRT1_2, y: dir * Math.SQRT1_2 }),
    anyMoveHit: () => false,
  };
  p.player.update(1 / 60, input as never, []);
}

const vy = (p: Pilot): number => (p.player as unknown as { vy: number }).vy;

/** Jump from the pad and fall until the Human is past the top of the jump. */
function jumpAndFall(p: Pilot, dir = 0): void {
  step(p, { hit: true, dir });
  for (let n = 0; n < 200 && vy(p) > 0; n++) step(p, { held: true, dir });
}

describe('the wings', () => {
  it('are for level 10 and up', () => {
    const p = pilot(WINGS_LEVEL - 1);
    expect(p.player.winged).toBe(false);
    jumpAndFall(p);
    step(p, { hit: true });
    expect(p.player.gliding).toBe(false);
  });

  it('belong to the Human alone', () => {
    const p = pilot();
    expect(p.player.winged).toBe(true);
    p.shift('bunny');
    expect(p.player.winged).toBe(false);
    jumpAndFall(p);
    step(p, { hit: true });
    expect(p.player.gliding).toBe(false);
  });

  it('do not open on the press that jumped, nor while rising', () => {
    const p = pilot();
    step(p, { hit: true });
    for (let n = 0; n < 5; n++) step(p, { held: true });
    expect(p.player.onGround).toBe(false);
    expect(p.player.gliding).toBe(false);
    step(p, { hit: true });
    expect(vy(p)).toBeGreaterThan(0);
    expect(p.player.gliding).toBe(false);
  });

  it('open at the top of the jump when the second press came early and is still held', () => {
    const p = pilot();
    step(p, { hit: true });
    for (let n = 0; n < 5; n++) step(p, {});
    step(p, { hit: true });
    expect(p.player.gliding).toBe(false);
    for (let n = 0; n < 200 && vy(p) > 0; n++) step(p, { held: true });
    step(p, { held: true });
    expect(p.player.gliding).toBe(true);
  });

  it('forget an early press that was let go before the top', () => {
    const p = pilot();
    step(p, { hit: true });
    for (let n = 0; n < 5; n++) step(p, {});
    step(p, { hit: true });
    step(p, {});
    for (let n = 0; n < 200 && vy(p) > 0; n++) step(p, {});
    for (let n = 0; n < 5; n++) step(p, { held: true });
    expect(p.player.gliding).toBe(false);
  });

  it('open on a second press in the air and never rise or fall faster than the sink', () => {
    const p = pilot();
    jumpAndFall(p);
    step(p, { hit: true });
    expect(p.player.gliding).toBe(true);
    const y = p.y;
    for (let n = 0; n < 40; n++) {
      step(p, { held: true });
      expect(vy(p)).toBeLessThanOrEqual(0);
      expect(vy(p)).toBeGreaterThanOrEqual(-GLIDE_SINK);
    }
    expect(p.y).toBeLessThan(y);
    expect(vy(p)).toBeCloseTo(-GLIDE_SINK, 5);
  });

  it('move at the glide speed where steered, and nowhere with no direction', () => {
    const p = pilot();
    jumpAndFall(p);
    step(p, { hit: true });
    let x = p.x;
    step(p, { held: true });
    expect(p.x).toBeCloseTo(x, 6);
    x = p.x;
    for (let n = 0; n < 30; n++) step(p, { held: true, dir: 1 });
    expect((p.x - x) / 0.5).toBeCloseTo(GLIDE_SPEED, 1);
  });

  it('close when Space is let go and open again on another press', () => {
    const p = pilot();
    jumpAndFall(p);
    step(p, { hit: true });
    step(p, {});
    expect(p.player.gliding).toBe(false);
    step(p, { hit: true });
    expect(p.player.gliding).toBe(true);
  });

  it('do not open after a shift in the air, until the next landing', () => {
    const p = pilot();
    p.shift('bunny');
    p.player.update(1 / 60, { held: () => false, hit: (c: string) => c === 'Space', move: () => ({ x: 0, y: 0 }), anyMoveHit: () => false } as never, []);
    for (let n = 0; n < 200 && vy(p) > 0; n++) step(p, { held: true });
    expect(p.player.shiftTo(0)).toBe(true);
    step(p, { hit: true });
    expect(p.player.gliding).toBe(false);
    for (let n = 0; n < 300 && !p.player.onGround; n++) step(p, {});
    step(p, { hit: true });
    for (let n = 0; n < 5; n++) step(p, { held: true });
    jumpAndFall(p);
    step(p, { hit: true });
    expect(p.player.gliding).toBe(true);
  });

  it('allow no shifting once open, until the Human lands', () => {
    const p = pilot();
    expect(p.player.canShiftTo(1)).toBe('ok');
    jumpAndFall(p);
    step(p, { hit: true });
    step(p, {});
    expect(p.player.canShiftTo(1)).toBe('cramped');
    for (let n = 0; n < 400 && !p.player.onGround; n++) step(p, {});
    expect(p.player.canShiftTo(1)).toBe('ok');
  });

  it('do not open in water and close on touching it', () => {
    const w = new World([
      {
        id: 'lake',
        name: 'Lake',
        build(t) {
          t.rect(0, 14, 9, 16, (i, j) => t.set(i, j, PAD, Kind.Stone));
          t.rect(10, 14, 90, 16, (i, j) => t.set(i, j, 0, Kind.Stone));
          t.rect(10, 14, 90, 16, (i, j) => t.setWater(i, j, true, 4));
          return { spawn: at(2) };
        },
      },
    ]);
    const p = pilot(WINGS_LEVEL, w);
    jumpAndFall(p, 1);
    step(p, { hit: true, dir: 1 });
    for (let n = 0; n < 600 && !p.player.swimming; n++) step(p, { held: true, dir: 1 });
    expect(p.player.swimming).toBe(true);
    expect(p.player.gliding).toBe(false);
    step(p, { hit: true });
    expect(p.player.gliding).toBe(false);
  });
});

describe('gliding with the pilot', () => {
  it('crosses 41 tiles of sky from a pad at 12 to ground at 1', () => {
    const p = pilot();
    expect(p.glide(at(10 + 41 + 3)), p.describe()).toBe(true);
  });

  it('measures the farthest glide onto ground at 6 and at 1', () => {
    const far = (height: number): number => {
      let best = 0;
      for (let sky = 20; sky <= 80; sky += 2) {
        const w = world(sky, height);
        if (!pilot(WINGS_LEVEL, w).glide(at(10 + sky + 1))) break;
        best = sky;
      }
      return best;
    };
    const six = far(6);
    const one = far(1);
    // About (12 + the 1.2 jump - ground) / GLIDE_SINK * GLIDE_SPEED tiles, less the settling.
    expect(six).toBe(46);
    expect(one).toBe(76);
  });
});
