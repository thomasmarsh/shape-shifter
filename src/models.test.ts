import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeBunny, makeGreatPine, makePine, makeGreatTree, makeTree, makeWolf } from './models';
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

describe('pine models', () => {
  it('draw a pine as tall as its solid block', () => {
    for (let seed = 0; seed < 6; seed++) {
      expect(top(makePine(seed))).toBeGreaterThanOrEqual(TREE_BLOCK.pine - 0.2 - 1e-6);
      expect(top(makePine(seed))).toBeLessThanOrEqual(TREE_BLOCK.pine + 1e-6);
    }
  });

  it('draw a great pine exactly as tall as its solid block, with a wide top', () => {
    for (let seed = 0; seed < 4; seed++) {
      const tree = makeGreatPine(seed);
      expect(top(tree)).toBeCloseTo(TREE_BLOCK.greatPine, 6);
      expect(width(tree)).toBeGreaterThanOrEqual(2.2 - 1e-6);
    }
  });

  it('make pines block like regular and great trees', () => {
    expect(TREE_BLOCK.pine).toBe(TREE_BLOCK.regular);
    expect(TREE_BLOCK.greatPine).toBe(TREE_BLOCK.great);
  });
});

describe('the wolf model', () => {
  it('is clearly bigger than the bunny', () => {
    const wolf = new THREE.Box3().setFromObject(makeWolf().group);
    const bunny = new THREE.Box3().setFromObject(makeBunny().group);
    expect(wolf.max.y - wolf.min.y).toBeGreaterThan(1.2 * (bunny.max.y - bunny.min.y));
    expect(wolf.max.z - wolf.min.z).toBeGreaterThan(2 * (bunny.max.z - bunny.min.z));
    expect(wolf.min.y).toBeGreaterThanOrEqual(-1e-6);
  });
});
