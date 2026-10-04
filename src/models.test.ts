import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  makeAnt,
  makeBunny,
  makeGreatPalm,
  makeGreatPine,
  makeGreatTree,
  makeMermaid,
  makePalm,
  makePickle,
  makePine,
  makeTree,
  makeWolf,
} from './models';
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

describe('the ant model', () => {
  it('is tiny: about 0.35 long and 0.2 tall, standing on its feet', () => {
    const ant = makeAnt();
    const b = new THREE.Box3().setFromObject(ant.group);
    expect(b.max.y).toBeLessThanOrEqual(0.25);
    expect(b.max.y).toBeGreaterThan(0.15);
    expect(b.max.z - b.min.z).toBeLessThan(0.5);
    expect(b.min.y).toBeGreaterThanOrEqual(-1e-6);
    expect(ant.legs).toHaveLength(6);
  });
});

describe('palm models', () => {
  it('draw a palm as tall as a regular tree and a great palm as tall as a great tree', () => {
    for (let seed = 0; seed < 6; seed++) {
      expect(top(makePalm(seed))).toBeGreaterThanOrEqual(TREE_BLOCK.palm - 0.2 - 1e-6);
      expect(top(makePalm(seed))).toBeLessThanOrEqual(TREE_BLOCK.palm + 1e-6);
      expect(top(makeGreatPalm(seed))).toBeCloseTo(TREE_BLOCK.greatPalm, 6);
    }
    expect(TREE_BLOCK.palm).toBe(TREE_BLOCK.regular);
    expect(TREE_BLOCK.greatPalm).toBe(TREE_BLOCK.great);
  });

  it('droop the fronds outward and down, clear of a figure standing on top', () => {
    const palm = makeGreatPalm(1);
    const b = new THREE.Box3().setFromObject(palm);
    expect(b.max.x - b.min.x).toBeGreaterThan(2.5);
    // Nothing but the hub reaches the top, and it is slim.
    const hub = new THREE.Box3();
    palm.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const box = new THREE.Box3().setFromObject(mesh);
      if (box.max.y > TREE_BLOCK.greatPalm - 0.1) hub.union(box);
    });
    expect(hub.max.x - hub.min.x).toBeLessThan(0.7);
  });
});

describe('the sea pickle model', () => {
  it('is a gherkin about 1.1 tall with its glow just above, like a candle', () => {
    const pickle = makePickle();
    pickle.group.remove(pickle.flame, pickle.cage);
    const b = new THREE.Box3().setFromObject(pickle.group);
    expect(b.max.y).toBeGreaterThan(1.0);
    expect(b.max.y).toBeLessThan(1.25);
    expect(pickle.flame.position.y).toBeGreaterThan(b.max.y);
    expect(pickle.cage.position.y).toBeGreaterThan(0);
  });
});

describe('the mermaid model', () => {
  it('stands about as tall as the human, with a wide fin at the bottom of her tail', () => {
    const mermaid = makeMermaid();
    const b = new THREE.Box3().setFromObject(mermaid.group);
    expect(b.max.y).toBeGreaterThan(1.4);
    expect(b.max.y).toBeLessThan(1.8);
    expect(b.min.y).toBeGreaterThanOrEqual(-1e-6);
    expect(new THREE.Box3().setFromObject(mermaid.fin).getSize(new THREE.Vector3()).x).toBeGreaterThan(0.7);
  });

  it('lies nearly flat when tipped forward to swim', () => {
    const mermaid = makeMermaid();
    mermaid.swim.rotation.x = 1.35;
    mermaid.group.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(mermaid.group);
    expect(b.max.y).toBeLessThan(1.4);
    expect(b.max.z - b.min.z).toBeGreaterThan(1.3);
  });

  it('has a sword blade that can take the tier colour', () => {
    expect(makeMermaid().blade.material).toBeInstanceOf(THREE.MeshLambertMaterial);
  });
});
