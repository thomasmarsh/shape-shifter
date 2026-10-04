import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { HumanModel, makeHuman } from './models';
import { Pilot } from './pilot';
import { World } from './world';

// Looks only: the Human's wings, Galecrest's quartz sheets and the Windbreak's lintel.

const world = new World();

function pilot(level: number): Pilot {
  const p = new Pilot(world, 'human', { x: 1350.5, z: 10.5 });
  p.player.level = level;
  return p;
}

type Posed = { human: HumanModel; animateHuman(swing: number): void };
const human = (p: Pilot): HumanModel => (p.player as unknown as Posed).human;

/** Pose the model as a frame does (the real update would close the wings on the ground). */
function pose(p: Pilot): void {
  (p.player as unknown as Posed).animateHuman(0);
}

const span = (p: Pilot): number => {
  const w = human(p).wings;
  human(p).group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(w.left).union(new THREE.Box3().setFromObject(w.right));
  return box.getSize(new THREE.Vector3()).x;
};

describe('the wings', () => {
  it('are two groups of several boxes on the model', () => {
    const { wings } = makeHuman();
    expect(wings.left.children.length).toBeGreaterThanOrEqual(3);
    expect(wings.right.children.length).toBeGreaterThanOrEqual(3);
  });

  it('are hidden at level 9 and folded at level 10', () => {
    const low = pilot(9);
    pose(low);
    expect(human(low).wings.left.visible).toBe(false);
    const p = pilot(10);
    pose(p);
    expect(human(p).wings.left.visible).toBe(true);
    expect(human(p).wings.right.visible).toBe(true);
    expect(span(p)).toBeLessThan(1);
  });

  it('spread wide while gliding', () => {
    const p = pilot(10);
    p.player.gliding = true;
    pose(p);
    expect(span(p)).toBeGreaterThan(2);
    expect(span(p)).toBeLessThan(2.8);
  });

  it('are not shown on another form', () => {
    const p = pilot(10);
    p.shift('bunny');
    pose(p);
    expect(human(p).group.visible).toBe(false);
  });
});

describe('Galecrest sheets and the Windbreak', () => {
  it('draw the lintel over the six Sluice tiles and none over the Well', () => {
    const lintels = world.group.getObjectByName('hollow-lintels') as THREE.InstancedMesh;
    expect(lintels.count).toBe(6);
    const m = new THREE.Matrix4();
    const at = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (let n = 0; n < lintels.count; n++) {
      lintels.getMatrixAt(n, m);
      m.decompose(at, new THREE.Quaternion(), s);
      expect(at.y + s.y / 2).toBeCloseTo(18, 5);
      expect(at.x).toBeGreaterThan(1361);
      expect(at.x).toBeLessThan(1363);
      expect(at.z).toBeGreaterThan(29);
      expect(at.z).toBeLessThan(32);
    }
  });

  it('use the quartz look for thin sheets and brittle crust', () => {
    expect(world.group.getObjectByName('quartz-flake')).toBeDefined();
    expect(world.group.getObjectByName('dry-quartz')).toBeDefined();
  });
});
