import { describe, expect, it } from 'vitest';
import { PHYSICS } from './forms';
import type { FormId } from './forms';
import { explore, Profile } from './levelcheck';
import { Island, Kind, World } from './world';

// The Snake and its holes in the checker, on hand-built strips: a hole (gap 0.35)
// takes the Snake and the Ant, a tangle (0.25) only the Ant, and the Snake walks
// up 1.0 where everyone else walks up 0.35.

const FLOOR = 2;
const HOLE = PHYSICS.holeGap;
const PROFILES: Profile[] = ['easy', 'max'];
const at = (i: number) => ({ x: i + 0.5, z: 15.5 });
const RANGE = { x0: 0, x1: 90 };

const OLD: FormId[] = ['human', 'fairy', 'orangutan', 'bunny', 'wolf', 'ant', 'mermaid', 'cheetah'];

/** Ground to column 19, then `wall` gap-`gap` tangle tiles at the heights `rise(n)`, then ground. */
function strip(wall: number, gap: number, rise: (n: number) => number = () => 0, top = FLOOR + rise(wall - 1)): World {
  const isl: Island = {
    id: 'strip',
    name: 'Strip',
    build(t) {
      t.rect(0, 0, 19, 63, (i, j) => t.set(i, j, FLOOR, Kind.Grass));
      for (let n = 0; n < wall; n++) {
        t.rect(20 + n, 0, 20 + n, 63, (i, j) => {
          t.set(i, j, FLOOR + rise(n), Kind.Grass);
          t.setTangle(i, j, gap);
        });
      }
      t.rect(20 + wall, 0, 20 + wall + 10, 63, (i, j) => t.set(i, j, top, Kind.Grass));
      return { spawn: at(5) };
    },
  };
  return new World([isl]);
}

const reaches = (w: World, forms: FormId[], profile: Profile, goal: number): boolean =>
  explore(w, at(5), forms, profile, RANGE).canStand(at(goal));

describe('a flat hole wall, 30 tiles across', () => {
  const hole = strip(30, HOLE);
  const far = 55;

  it.each(PROFILES)('takes the Snake and the Ant on %s', (profile) => {
    expect(reaches(hole, ['snake'], profile, far)).toBe(true);
    expect(reaches(hole, ['ant'], profile, far)).toBe(true);
  });

  it.each(PROFILES)('stops everyone else, flight and hop-then-fly too, on %s', (profile) => {
    const others = OLD.filter((f) => f !== 'ant');
    expect(reaches(hole, others, profile, far)).toBe(false);
    expect(reaches(hole, ['bunny', 'fairy'], profile, far)).toBe(false);
  });

  it.each(PROFILES)('is not passed by a Snake in a 0.25 tangle on %s', (profile) => {
    const tangle = strip(30, 0.25);
    expect(reaches(tangle, ['snake'], profile, far)).toBe(false);
    expect(reaches(tangle, ['ant'], profile, far)).toBe(true);
  });
});

describe('a stepped burrow, six hole tiles rising 0.75 a tile', () => {
  const burrow = strip(6, HOLE, (n) => 0.75 * (n + 1));
  const top = 30;

  it.each(PROFILES)('lets the Snake walk to the top on %s, alone or with the rest', (profile) => {
    expect(reaches(burrow, ['snake'], profile, top)).toBe(true);
    expect(reaches(burrow, [...OLD, 'snake'], profile, top)).toBe(true);
  });

  it('keeps the eight old forms out, so the Snake step is the Snake alone', () => {
    expect(reaches(burrow, OLD, 'max', top)).toBe(false);
    expect(reaches(burrow, ['ant'], 'max', top)).toBe(false);
  });

  it.each(PROFILES)('is stopped by a rise of 1.1 between hole tiles on %s', (profile) => {
    const sheer = strip(6, HOLE, (n) => (n === 0 ? 0.75 : 0.75 + 1.1 * n));
    expect(reaches(sheer, ['snake'], profile, top)).toBe(false);
  });
});
