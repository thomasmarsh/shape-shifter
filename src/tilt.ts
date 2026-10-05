// The look-over key. The camera looks from a fixed corner, and with no
// perspective a high ledge far off can look like a low one close by. Holding
// the key swings the camera a little higher and a little round, and things at
// different heights and distances slide apart on the screen. Walking keys keep
// their directions on the ground.

/** The key that tilts the camera while it is held. */
export const TILT_KEY = 'KeyT';
/** How much higher the tilted camera looks from, and how far round it swings, in radians. */
export const TILT_PITCH = 0.36;
export const TILT_YAW = 0.2;
/** The tilt eases in and out at this rate (about a quarter of a second). */
export const TILT_RATE = 7;

/** Move the tilt (0 = the normal view, 1 = fully tilted) one step towards held or not held. */
export function stepTilt(tilt: number, held: boolean, dt: number): number {
  const k = Math.min(1, dt * TILT_RATE);
  const next = tilt + ((held ? 1 : 0) - tilt) * k;
  return Math.abs(next - (held ? 1 : 0)) < 0.001 ? (held ? 1 : 0) : next;
}

/** The unit direction from the camera's target to the camera, for a base direction and a tilt of 0..1. */
export function tiltedDir(base: { x: number; y: number; z: number }, tilt: number): { x: number; y: number; z: number } {
  const flat = Math.hypot(base.x, base.z);
  const s = tilt * tilt * (3 - 2 * tilt); // smooth at both ends
  const pitch = Math.atan2(base.y, flat) + TILT_PITCH * s;
  const yaw = Math.atan2(base.z, base.x) + TILT_YAW * s;
  return { x: Math.cos(pitch) * Math.cos(yaw), y: Math.sin(pitch), z: Math.cos(pitch) * Math.sin(yaw) };
}
