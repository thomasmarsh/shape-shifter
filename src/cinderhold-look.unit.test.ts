import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { makeEel, makeSwordGuy, makeWarden } from './models';
import { World } from './world';

// The look of the last island: the two bosses and the Lid.

const size = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
const FIELDS = ['group', 'armL', 'armR', 'legL', 'legR', 'bodyMat'];

const lidOf = (w: World) => w.group.getObjectByName('lid') as THREE.InstancedMesh;

function colours(slab: THREE.InstancedMesh): THREE.Color[] {
  const out: THREE.Color[] = [];
  for (let i = 0; i < slab.count; i++) {
    const c = new THREE.Color();
    slab.getColorAt(i, c);
    out.push(c);
  }
  return out;
}

function centreOf(slab: THREE.InstancedMesh): THREE.Vector3 {
  const m = new THREE.Matrix4();
  const c = new THREE.Vector3();
  const p = new THREE.Vector3();
  for (let i = 0; i < slab.count; i++) {
    slab.getMatrixAt(i, m);
    c.add(p.setFromMatrixPosition(m));
  }
  return c.divideScalar(slab.count);
}

describe('the Warden model', () => {
  it('is 2.0 to 2.5 tall', () => {
    const h = size(makeWarden().group).y;
    expect(h).toBeGreaterThanOrEqual(2.0);
    expect(h).toBeLessThanOrEqual(2.5);
  });

  it('is wider than a sword bad guy', () => {
    expect(size(makeWarden().group).x).toBeGreaterThan(size(makeSwordGuy().group).x);
  });

  it('keeps every field of the bad guy model', () => {
    const m = makeWarden();
    for (const f of FIELDS) expect(m).toHaveProperty(f);
    expect(m.armL).toBeInstanceOf(THREE.Group);
  });
});

describe('the Eel model', () => {
  it('is 2.0 to 2.8 long along z and longer than it is tall', () => {
    const s = size(makeEel().group);
    expect(s.z).toBeGreaterThanOrEqual(2.0);
    expect(s.z).toBeLessThanOrEqual(2.8);
    expect(s.z).toBeGreaterThan(s.y);
  });

  it('keeps every field of the bad guy model', () => {
    const m = makeEel();
    for (const f of FIELDS) expect(m).toHaveProperty(f);
    expect(m.bodyMat).toBeInstanceOf(THREE.MeshLambertMaterial);
  });
});

describe('the Lid mesh', () => {
  it('has 208 slabs, shown while shut', () => {
    const slab = lidOf(new World());
    expect(slab.count).toBe(208);
    expect(slab.visible).toBe(true);
  });

  it('sinks for a while when dropped, then hides, and comes straight back when raised', () => {
    const w = new World();
    const slab = lidOf(w);
    w.dropLid();
    expect(w.lidDown).toBe(true);
    expect(slab.visible).toBe(true);
    w.stepLid(0.3);
    expect(slab.visible).toBe(true);
    expect(slab.position.y).toBeLessThan(0);
    w.stepLid(1);
    expect(slab.visible).toBe(false);
    w.raiseLid();
    expect(slab.visible).toBe(true);
    expect(slab.position.y).toBe(0);
    expect((slab.material as THREE.Material).opacity).toBe(1);
  });

  it('is back at once when raised while still sinking', () => {
    const w = new World();
    const slab = lidOf(w);
    w.dropLid();
    w.stepLid(0.2);
    w.raiseLid();
    w.stepLid(1);
    expect(slab.visible).toBe(true);
  });

  it('uses several colours, with a rim that differs from the middle', () => {
    const slab = lidOf(new World());
    const cs = colours(slab);
    expect(new Set(cs.map((c) => c.getHex())).size).toBeGreaterThanOrEqual(2);
    const mid = centreOf(slab);
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    let inner = 0;
    let outer = 0;
    let rIn = Infinity;
    let rOut = 0;
    for (let i = 0; i < slab.count; i++) {
      slab.getMatrixAt(i, m);
      p.setFromMatrixPosition(m);
      const r = Math.hypot(p.x - mid.x, p.z - mid.z);
      if (r < rIn) {
        rIn = r;
        inner = i;
      }
      if (r > rOut) {
        rOut = r;
        outer = i;
      }
    }
    expect(cs[outer].getHex()).not.toBe(cs[inner].getHex());
    expect(cs[outer].getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThan(cs[inner].getHSL({ h: 0, s: 0, l: 0 }).l);
  });
});
