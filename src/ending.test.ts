import { describe, expect, it } from 'vitest';
import { Arrows } from './arrows';
import { CHIME_NOTES, CreditsChimes, Ending, creditsEndZoom, creditsTarget, creditsZoom, viewSize } from './ending';
import { Enemy, EnemyKind } from './enemy';
import { CREDITS, CREDITS_SECONDS } from './forms';
import { Particles } from './particles';
import { Kind, World } from './world';
import type { Island } from './world';

// The ending, in a tiny world with a lidded pool and both bosses.

const island: Island = {
  id: 'test',
  name: 'Test',
  build(t) {
    t.rect(0, 0, 60, 30, (i, j) => t.set(i, j, 2, Kind.Grass));
    t.rect(40, 10, 55, 19, (i, j) => {
      t.set(i, j, 0, Kind.Grass);
      t.setWater(i, j, true, 1.5);
      t.setLid(i, j, 2);
    });
    return { spawn: { x: 2.5, z: 15.5 } };
  },
};

function setup(saved: string[] = []) {
  const world = new World([island]);
  const particles = new Particles();
  const arrows = new Arrows(world, particles);
  const make = (kind: EnemyKind, x: number, z: number) =>
    new Enemy(world, particles, arrows, { x, z }, { tester: false, kind });
  const warden = make('warden', 20.5, 15.5);
  const eel = make('eel', 47.5, 15.5);
  const ending = new Ending(world, [warden, eel], saved);
  return { world, warden, eel, ending };
}

const beat = (e: Enemy): void => {
  e.takeHit(e.maxHearts, 0, 0);
};

describe('the ending', () => {
  it('does nothing while both bosses live', () => {
    const { world, ending } = setup();
    expect(ending.step()).toEqual([]);
    expect(world.lidDown).toBe(false);
    expect(ending.beaten()).toEqual([]);
  });

  it('drops the lid once when the Warden is beaten, and reports it once', () => {
    const { world, warden, ending } = setup();
    beat(warden);
    expect(ending.step()).toEqual(['warden']);
    expect(world.lidDown).toBe(true);
    expect(ending.step()).toEqual([]);
    expect(ending.beaten()).toEqual(['warden']);
  });

  it('reports the win once when the Eel is beaten', () => {
    const { warden, eel, world, ending } = setup();
    beat(warden);
    ending.step();
    expect(world.lidDown).toBe(true);
    beat(eel);
    expect(ending.step()).toEqual(['eel']);
    expect(ending.step()).toEqual([]);
    expect(ending.beaten()).toEqual(['warden', 'eel']);
  });

  it('loads a saved Warden: lid down at once, Warden gone, Eel awake', () => {
    const first = setup();
    beat(first.warden);
    first.ending.step();
    const again = setup(first.ending.beaten());
    expect(again.world.lidDown).toBe(true);
    expect(again.warden.alive).toBe(false);
    expect(again.warden.group.visible).toBe(false);
    expect(again.eel.alive).toBe(true);
    expect(again.ending.step()).toEqual([]);
  });

  it('loads a saved Eel too, with no second win', () => {
    const { world, warden, eel, ending } = setup(['warden', 'eel']);
    expect(world.lidDown).toBe(true);
    expect(warden.alive).toBe(false);
    expect(eel.alive).toBe(false);
    expect(ending.step()).toEqual([]);
    expect(ending.beaten()).toEqual(['warden', 'eel']);
  });

  it('raises the lid for a new game', () => {
    const { world } = setup(['warden']);
    expect(world.lidDown).toBe(true);
    const fresh = new Ending(world, [], []);
    expect(world.lidDown).toBe(false);
    expect(fresh.step()).toEqual([]);
  });

  it('brings both bosses back for a new game in the same session', () => {
    const { world, warden, eel } = setup(['warden', 'eel']);
    expect(warden.alive).toBe(false);
    expect(eel.alive).toBe(false);
    const fresh = new Ending(world, [warden, eel], []);
    expect(world.lidDown).toBe(false);
    expect(warden.alive).toBe(true);
    expect(warden.hearts).toBe(warden.maxHearts);
    expect(eel.alive).toBe(true);
    expect(eel.hearts).toBe(eel.maxHearts);
    expect(fresh.step()).toEqual([]);
    expect(fresh.beaten()).toEqual([]);
  });

  it('does nothing in a world with no bosses', () => {
    const world = new World([island]);
    const ending = new Ending(world, []);
    expect(ending.step()).toEqual([]);
    expect(ending.beaten()).toEqual([]);
  });
});

describe('the credits', () => {
  const dir = { x: -1, y: 1.12, z: 1 };
  const aspect = 16 / 9;
  const end = creditsEndZoom(dir, 1700, 64, 31, aspect, 15);

  it('has the three rows in order', () => {
    expect(CREDITS).toEqual([
      ['Game design', 'Laura Elena Marsh-Leguia'],
      ['Coding', 'Papa & Claude'],
      ['Play testing', 'Mama'],
    ]);
  });

  it('zooms from 1 and rises steadily', () => {
    expect(creditsZoom(0, end)).toBe(1);
    let last = 1;
    for (let s = 1; s <= CREDITS_SECONDS; s++) {
      const z = creditsZoom(s, end);
      expect(z).toBeGreaterThan(last);
      last = z;
    }
    expect(last).toBeCloseTo(end, 6);
  });

  it('shows a 1700 by 64 world at the end', () => {
    const { w, h } = viewSize(dir, 1700, 64, 31);
    const height = 15 * creditsZoom(CREDITS_SECONDS, end);
    expect(height).toBeGreaterThanOrEqual(h);
    expect(height * aspect).toBeGreaterThanOrEqual(w);
  });

  it('moves the camera target from the player to the middle of the world', () => {
    const from = { x: 10, y: 3, z: 20 };
    const mid = { x: 850, y: 15, z: 32 };
    expect(creditsTarget(0, from, mid)).toEqual(from);
    expect(creditsTarget(CREDITS_SECONDS, from, mid)).toEqual(mid);
    expect(creditsTarget(CREDITS_SECONDS / 2, from, mid).x).toBeGreaterThan(10);
  });
});

describe('the music of the credits', () => {
  // A small seeded generator, so the test hears the same bells every time.
  const seeded = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const play = (seed: number) => {
    const chimes = new CreditsChimes(seeded(seed));
    const bells: { at: number; note: number; volume: number }[] = [];
    for (let t = 0; t < CREDITS_SECONDS; t += 1 / 60) {
      for (const b of chimes.step(1 / 60)) bells.push({ at: t + b.delay, note: b.note, volume: b.volume });
    }
    return bells;
  };

  it('rings only puzzle notes that sound well together, softly, and never the same one twice in a row', () => {
    for (const seed of [1, 2, 3]) {
      const bells = play(seed);
      for (const b of bells) {
        expect(CHIME_NOTES).toContain(b.note);
        expect(b.volume).toBeGreaterThan(0.2);
        expect(b.volume).toBeLessThan(0.4);
      }
      for (let k = 1; k < bells.length; k++) expect(bells[k].note).not.toBe(bells[k - 1].note);
    }
  });

  it('rings between 25 and 60 bells over the credits, with no silence longer than 2 s', () => {
    for (const seed of [1, 2, 3]) {
      const bells = play(seed).sort((a, b) => a.at - b.at);
      expect(bells.length).toBeGreaterThanOrEqual(25);
      expect(bells.length).toBeLessThanOrEqual(60);
      expect(bells[0].at).toBeLessThan(1);
      for (let k = 1; k < bells.length; k++) expect(bells[k].at - bells[k - 1].at).toBeLessThan(2);
    }
  });

  it('lets some bells overlap: a bell lasts 0.55 s, and some start within 0.4 s of the one before', () => {
    for (const seed of [1, 2, 3]) {
      const bells = play(seed).sort((a, b) => a.at - b.at);
      let close = 0;
      for (let k = 1; k < bells.length; k++) if (bells[k].at - bells[k - 1].at < 0.4) close++;
      expect(close).toBeGreaterThanOrEqual(3);
    }
  });

  it('rings nothing in a step of no time once the first bell has rung', () => {
    const chimes = new CreditsChimes(seeded(7));
    chimes.step(1);
    expect(chimes.step(0)).toEqual([]);
  });
});
