import { CREDITS_SECONDS } from './forms';
import type { Enemy } from './enemy';
import type { World } from './world';

// The end of the game: it watches the two bosses. The Warden beaten drops the
// lid, the Eel beaten wins the game. No DOM and no scene work, so tests can
// run it. The credits' camera maths is here too.

export type EndingEvent = 'warden' | 'eel';

export class Ending {
  private readonly warden: Enemy | undefined;
  private readonly eel: Enemy | undefined;
  private wardenDone = false;
  private eelDone = false;

  /** `saved` is the list from `beaten()`. A new game passes []. */
  constructor(
    private readonly world: World,
    enemies: readonly Enemy[],
    saved: readonly string[] = [],
  ) {
    this.warden = enemies.find((e) => e.kind === 'warden');
    this.eel = enemies.find((e) => e.kind === 'eel');
    // The Eel can only be beaten once the lid is down, so it implies the Warden.
    this.eelDone = saved.includes('eel');
    this.wardenDone = this.eelDone || saved.includes('warden');
    // A boss the save does not name is alive: a new game in the same session brings it back.
    if (this.wardenDone) {
      this.warden?.beat();
      world.dropLid();
    } else {
      this.warden?.revive();
      world.raiseLid();
    }
    if (this.eelDone) this.eel?.beat();
    else this.eel?.revive();
  }

  /** Call every frame. Returns what just happened, each thing once. */
  step(): EndingEvent[] {
    const events: EndingEvent[] = [];
    if (!this.wardenDone && this.warden && !this.warden.alive) {
      this.wardenDone = true;
      this.world.dropLid();
      events.push('warden');
    }
    if (!this.eelDone && this.eel && !this.eel.alive) {
      this.eelDone = true;
      events.push('eel');
    }
    return events;
  }

  /** The bosses beaten so far, for the save. */
  beaten(): string[] {
    const list: string[] = [];
    if (this.wardenDone) list.push('warden');
    if (this.eelDone) list.push('eel');
    return list;
  }
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 0 to 1 over the credits, gentle at both ends. */
export function creditsEase(seconds: number): number {
  const s = Math.min(1, Math.max(0, seconds / CREDITS_SECONDS));
  return s * s * (3 - 2 * s);
}

/**
 * How wide and tall a box of the world looks on screen from a camera that
 * looks along `-dir`, in world units on the screen.
 */
export function viewSize(dir: Vec3, width: number, depth: number, height: number): { w: number; h: number } {
  const len = Math.hypot(dir.x, dir.y, dir.z);
  const f = { x: -dir.x / len, y: -dir.y / len, z: -dir.z / len };
  // right = forward x up, up = right x forward
  const rl = Math.hypot(f.z, f.x);
  const r = { x: -f.z / rl, y: 0, z: f.x / rl };
  const u = { x: r.y * f.z - r.z * f.y, y: r.z * f.x - r.x * f.z, z: r.x * f.y - r.y * f.x };
  const extent = (a: Vec3): number => Math.abs(a.x) * width + Math.abs(a.y) * height + Math.abs(a.z) * depth;
  return { w: extent(r), h: extent(u) };
}

/** The zoom at the end of the credits: the frustum height, over `baseHeight`, that shows the whole box. */
export function creditsEndZoom(
  dir: Vec3,
  width: number,
  depth: number,
  height: number,
  aspect: number,
  baseHeight: number,
): number {
  const { w, h } = viewSize(dir, width, depth, height);
  return (Math.max(h, w / aspect) * 1.06) / baseHeight;
}

/** The frustum's growth: 1 at the start, `endZoom` at CREDITS_SECONDS, steady in between (even in the log). */
export function creditsZoom(seconds: number, endZoom: number): number {
  return Math.pow(Math.max(1, endZoom), creditsEase(seconds));
}

/** Where the camera looks: from the player to the middle of the world. */
export function creditsTarget(seconds: number, from: Vec3, middle: Vec3): Vec3 {
  const k = creditsEase(seconds);
  return {
    x: from.x + (middle.x - from.x) * k,
    y: from.y + (middle.y - from.y) * k,
    z: from.z + (middle.z - from.z) * k,
  };
}

/** One bell for the credits: a puzzle note, how long to wait before it, and how loud. */
export interface Chime {
  note: number;
  delay: number;
  volume: number;
}

/**
 * The puzzle notes the credits play: C D E G A and high C. Any two of them
 * sound well together, so bells that overlap never clash.
 */
export const CHIME_NOTES: readonly number[] = [0, 1, 2, 4, 5, 7];

/**
 * The music of the credits: puzzle bells at random, a little under one a
 * second, and now and then two or three close together so they overlap.
 */
export class CreditsChimes {
  private wait = 0.8;
  private last = -1;

  constructor(private readonly rand: () => number = Math.random) {}

  /** The bells to start in the next `dt` seconds. */
  step(dt: number): Chime[] {
    const out: Chime[] = [];
    this.wait -= dt;
    while (this.wait <= 0) {
      out.push(this.bell(0));
      // About one time in three a second bell rings into the first, and
      // sometimes a third into that.
      if (this.rand() < 0.35) {
        out.push(this.bell(0.12 + this.rand() * 0.2));
        if (this.rand() < 0.3) out.push(this.bell(0.34 + this.rand() * 0.2));
      }
      this.wait += 0.5 + this.rand() * 1.1;
    }
    return out;
  }

  /** A bell that is not the one before it. */
  private bell(delay: number): Chime {
    let k = Math.floor(this.rand() * CHIME_NOTES.length) % CHIME_NOTES.length;
    if (k === this.last) k = (k + 1) % CHIME_NOTES.length;
    this.last = k;
    return { note: CHIME_NOTES[k], delay, volume: 0.22 + this.rand() * 0.16 };
  }
}
