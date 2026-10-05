import { describe, expect, it } from 'vitest';
import { stepTilt, TILT_PITCH, TILT_YAW, tiltedDir } from './tilt';

const BASE = (() => {
  const n = Math.hypot(-1, 1.12, 1);
  return { x: -1 / n, y: 1.12 / n, z: 1 / n };
})();

describe('the look-over tilt', () => {
  it('leaves the camera where it was with no tilt', () => {
    const d = tiltedDir(BASE, 0);
    expect(d.x).toBeCloseTo(BASE.x, 9);
    expect(d.y).toBeCloseTo(BASE.y, 9);
    expect(d.z).toBeCloseTo(BASE.z, 9);
  });

  it('looks from higher and a little round when fully tilted, and stays a unit direction', () => {
    const d = tiltedDir(BASE, 1);
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1, 9);
    const pitch = (v: { x: number; y: number; z: number }) => Math.atan2(v.y, Math.hypot(v.x, v.z));
    const yaw = (v: { x: number; z: number }) => Math.atan2(v.z, v.x);
    expect(pitch(d) - pitch(BASE)).toBeCloseTo(TILT_PITCH, 9);
    expect(yaw(d) - yaw(BASE)).toBeCloseTo(TILT_YAW, 9);
    // Still from the south-west, and never straight down.
    expect(d.x).toBeLessThan(0);
    expect(d.z).toBeGreaterThan(0);
    expect(pitch(d)).toBeLessThan(Math.PI / 2 - 0.3);
  });

  it('eases in while the key is held and back out when it is let go, and settles', () => {
    let t = 0;
    for (let n = 0; n < 30; n++) t = stepTilt(t, true, 1 / 60);
    expect(t).toBeGreaterThan(0.9);
    for (let n = 0; n < 120; n++) t = stepTilt(t, true, 1 / 60);
    expect(t).toBe(1);
    for (let n = 0; n < 150; n++) t = stepTilt(t, false, 1 / 60);
    expect(t).toBe(0);
    // A long frame does not overshoot.
    expect(stepTilt(0, true, 5)).toBe(1);
  });
});
