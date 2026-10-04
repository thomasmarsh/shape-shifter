import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeAxolotl } from './models';
import { Island, Kind, World } from './world';

// Looks only: the Axolotl's model and the hollow lids.

function hslOf(mesh: THREE.Mesh) {
  const hsl = { h: 0, s: 0, l: 0 };
  (mesh.material as THREE.MeshLambertMaterial).color.getHSL(hsl);
  return hsl;
}

describe('the Axolotl model', () => {
  const model = makeAxolotl();
  const size = new THREE.Box3().setFromObject(model.group).getSize(new THREE.Vector3());

  it('is low and about a metre long', () => {
    expect(size.y).toBeLessThan(0.75);
    expect(size.z).toBeGreaterThan(0.6);
    expect(size.z).toBeLessThan(1.4);
  });

  it('has six gill stalks in at least five hues', () => {
    expect(model.gills).toHaveLength(6);
    const hues = new Set<number>();
    let meshes = 0;
    for (const g of model.gills) {
      g.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        meshes++;
        hues.add(Math.round(hslOf(o as THREE.Mesh).h * 20));
      });
    }
    expect(meshes).toBeGreaterThanOrEqual(6);
    expect(hues.size).toBeGreaterThanOrEqual(5);
  });

  it('has a pink body', () => {
    const { h, l } = hslOf(model.body.children[0] as THREE.Mesh);
    expect(h > 0.93 || h < 0.02).toBe(true);
    expect(l).toBeGreaterThan(0.6);
  });
});

describe('a hollow', () => {
  const island: Island = {
    id: 'test',
    name: 'Test',
    build(t) {
      t.rect(0, 0, 12, 12, (i, j) => t.set(i, j, 6, Kind.Grass));
      t.rect(4, 4, 8, 8, (i, j) => {
        t.set(i, j, 0, Kind.Sand);
        t.setWater(i, j, true, 6);
      });
      t.setHollow(5, 5);
      return { spawn: { x: 1.5, z: 1.5 } };
    },
  };
  const world = new World([island]);

  it('gets a chalk lid and no kelp strands', () => {
    expect(world.isHollow(5, 5)).toBe(true);
    const lids = world.group.getObjectByName('hollow-lids') as THREE.InstancedMesh;
    expect(lids.count).toBe(2);
    expect(world.group.getObjectByName('kelp-fronds')).toBeUndefined();
  });
});
