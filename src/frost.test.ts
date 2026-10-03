import { describe, expect, it } from 'vitest';
import { coldAt } from './frost';

describe('the cold that follows the camera', () => {
  it('is 0 at x 190 and 1 at x 204, on Frostfang', () => {
    expect(coldAt(190)).toBe(0);
    expect(coldAt(204)).toBe(1);
    expect(coldAt(208.5, 40.5)).toBe(1);
  });

  it('is 1 on Last Rock, stays high down the last run, and is gone at Underroot', () => {
    expect(coldAt(304.5, 11.5)).toBe(1);
    expect(coldAt(304.5, 30)).toBeGreaterThanOrEqual(0.9);
    expect(coldAt(305.5, 52.5)).toBe(0);
  });

  it('is 0 everywhere at x >= 320', () => {
    for (let z = 0; z <= 64; z += 4) expect(coldAt(320, z), `z=${z}`).toBe(0);
    expect(coldAt(400, 10)).toBe(0);
  });
});
