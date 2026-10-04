import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { beaconSpots, Cinder, crackSpots, PILLAR_HEIGHT, stoneSpots } from './cinder';
import { inDeep } from './islands/cinderhold';
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
  it('is 5.0 to 5.6 long along z, under 1.3 tall and longer than it is tall', () => {
    const s = size(makeEel().group);
    expect(s.z).toBeGreaterThanOrEqual(5.0);
    expect(s.z).toBeLessThanOrEqual(5.6);
    expect(s.y).toBeLessThan(1.3);
    expect(s.z).toBeGreaterThan(s.y);
  });

  it('has white teeth and two glowing eyes', () => {
    const teeth: number[] = [];
    let eyes = 0;
    makeEel().group.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined;
      if (!m || !('color' in m)) return;
      if (m.color.getHex() === 0xffffff) teeth.push(1);
      if (m.color.getHex() === 0xffe066 && m.emissive.getHex() !== 0) eyes++;
    });
    expect(teeth.length).toBeGreaterThanOrEqual(6);
    expect(eyes).toBe(2);
  });

  it('keeps every field of the bad guy model', () => {
    const m = makeEel();
    for (const f of FIELDS) expect(m).toHaveProperty(f);
    expect(m.bodyMat).toBeInstanceOf(THREE.MeshLambertMaterial);
  });
});

describe('the Lid mesh', () => {
  it('has 872 slabs, shown while shut', () => {
    const slab = lidOf(new World());
    expect(slab.count).toBe(872);
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

describe('the look of Cinderhold', () => {
  it('builds 8 beacons: 4 at the feet of the Stairs, 4 on their tops', () => {
    const b = beaconSpots();
    expect(b).toHaveLength(8);
    expect(b.filter((x) => x.kind === 'foot')).toHaveLength(4);
    expect(b.filter((x) => x.kind === 'top')).toHaveLength(4);
    const feet = b.filter((x) => x.kind === 'foot').map((x) => `${x.stair} ${Math.floor(x.x)},${Math.floor(x.z)}`).sort();
    expect(feet).toEqual(['east 1667,27', 'east 1667,36', 'north 1640,14', 'north 1649,14']);
    const tops = b.filter((x) => x.kind === 'top').map((x) => `${x.stair} ${Math.floor(x.x)},${Math.floor(x.z)}`).sort();
    expect(tops).toEqual(['east 1678,28', 'east 1678,35', 'north 1641,3', 'north 1648,3']);
  });

  it('shows every beacon to the camera, which looks north-east', () => {
    const w = new World();
    for (const b of beaconSpots()) {
      const y = b.y + PILLAR_HEIGHT;
      for (let k = 1; k <= 30; k++) expect(w.groundAt(b.x - k, b.z + k)).toBeLessThanOrEqual(y + 0.9 + 1.12 * k);
    }
  });

  it('keeps every crack off the lid, and every stone thin and low', () => {
    const cracks = crackSpots();
    expect(cracks.length).toBeGreaterThan(10);
    for (const c of cracks) {
      for (const f of [-0.5, -0.25, 0, 0.25, 0.5]) {
        const x = c.x + Math.sin(c.rot) * c.len * f;
        const z = c.z + Math.cos(c.rot) * c.len * f;
        expect(inDeep(Math.floor(x), Math.floor(z))).toBe(false);
      }
    }
    for (const s of stoneSpots()) expect(s.h).toBeLessThan(1.5);
  });

  it('builds the same placements twice', () => {
    expect(beaconSpots()).toEqual(beaconSpots());
    expect(crackSpots()).toEqual(crackSpots());
    expect(stoneSpots()).toEqual(stoneSpots());
    const w = new World();
    const a = new Cinder((x, z) => w.groundAt(x, z), true);
    const b = new Cinder((x, z) => w.groundAt(x, z), true);
    expect(a.cracks).toEqual(b.cracks);
    a.update(0.1);
  });
});
