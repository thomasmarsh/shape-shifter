import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeGreatTree, makeTree } from './models';
import { TREE_BLOCK } from './world';

const top = (o: THREE.Object3D): number => new THREE.Box3().setFromObject(o).max.y;
const width = (o: THREE.Object3D): number => {
  const b = new THREE.Box3().setFromObject(o);
  return Math.max(b.max.x - b.min.x, b.max.z - b.min.z);
};

describe('tree models', () => {
  it('draw a regular tree as tall as its solid block', () => {
    for (let seed = 0; seed < 6; seed++) {
      expect(top(makeTree(seed))).toBeGreaterThanOrEqual(TREE_BLOCK.regular - 0.2 - 1e-6);
      expect(top(makeTree(seed))).toBeLessThanOrEqual(TREE_BLOCK.regular + 1e-6);
    }
  });

  it('draw a great tree exactly as tall as its solid block, with a wide canopy', () => {
    for (let seed = 0; seed < 4; seed++) {
      const tree = makeGreatTree(seed);
      expect(top(tree)).toBeCloseTo(TREE_BLOCK.great, 6);
      expect(width(tree)).toBeGreaterThanOrEqual(2.2 - 1e-6);
    }
  });
});
