import * as THREE from 'three';
import { hash } from './layout';
import { EAST_STAIR, inDeep, LANDING, NORTH_STAIR, RIM, RING, STAIR_TOP } from './islands/cinderhold';

// Looks only: the beacons, embers, cracks and standing stones of Cinderhold.
// Nothing here collides or changes a query. Placements come from the same hash
// every time; everything is built once and update(dt) only moves a few numbers.

export interface Beacon {
  /** Centre of the tile it stands on. */
  x: number;
  z: number;
  /** The surface under it. */
  y: number;
  stair: 'north' | 'east';
  kind: 'foot' | 'top';
}

export interface Crack {
  x: number;
  z: number;
  len: number;
  rot: number;
}

export const PILLAR_HEIGHT = 3;
const EMBERS = 90;
const EMBERS_FAST = 30;
const EMBER_TOP = STAIR_TOP + 2;

/** The eight beacons: a pair at the foot of each Stair and a pair on its top. */
export function beaconSpots(): Beacon[] {
  const out: Beacon[] = [];
  const n = NORTH_STAIR;
  const e = EAST_STAIR;
  const north = (i: number, j: number, y: number, kind: Beacon['kind']) => out.push({ x: i + 0.5, z: j + 0.5, y, stair: 'north', kind });
  const east = (i: number, j: number, y: number, kind: Beacon['kind']) => out.push({ x: i + 0.5, z: j + 0.5, y, stair: 'east', kind });
  north(n.i0 - 1, RING.j0, RIM, 'foot');
  north(n.i1 + 1, RING.j0, RIM, 'foot');
  east(RING.i1, e.j0 - 1, RIM, 'foot');
  east(RING.i1, e.j1 + 1, RIM, 'foot');
  north(n.i0, n.top.j1, STAIR_TOP, 'top');
  north(n.i1, n.top.j1, STAIR_TOP, 'top');
  east(e.top.i0, e.j0, STAIR_TOP, 'top');
  east(e.top.i0, e.j1, STAIR_TOP, 'top');
  return out;
}

/** Glowing cracks on the ash walk of the Ring and on the Landing, never on a lid tile. */
export function crackSpots(): Crack[] {
  const out: Crack[] = [];
  const add = (i: number, j: number, seed: number): void => {
    if (hash(i, j, seed) > 0.12) return;
    const len = 0.9 + hash(i, j, seed + 1) * 0.9;
    const rot = hash(i, j, seed + 2) * Math.PI;
    const x = i + 0.5;
    const z = j + 0.5;
    // Keep all of it on the tile it was picked for.
    const reach = (len / 2) * Math.max(Math.abs(Math.cos(rot)), Math.abs(Math.sin(rot)));
    if (reach > 0.5) return;
    out.push({ x, z, len, rot });
  };
  for (let j = RING.j0 + 1; j < RING.j1; j++) {
    for (let i = RING.i0 + 1; i < RING.i1; i++) {
      if (!inDeep(i, j) && !nearDeep(i, j)) add(i, j, 301);
    }
  }
  for (let j = LANDING.j0; j <= LANDING.j1; j++) for (let i = LANDING.i0; i <= LANDING.i1; i++) add(i, j, 302);
  return out;
}

const nearDeep = (i: number, j: number): boolean => inDeep(i - 1, j) || inDeep(i + 1, j) || inDeep(i, j - 1) || inDeep(i, j + 1);

/** Small dark stones on the rim, along its north and east sides, on either side of the Stairs. */
export function stoneSpots(): { x: number; z: number; h: number }[] {
  const out: { x: number; z: number; h: number }[] = [];
  const n = NORTH_STAIR;
  const e = EAST_STAIR;
  for (let i = RING.i0 + 1; i < RING.i1; i += 3) {
    if (i >= n.i0 - 2 && i <= n.i1 + 2) continue;
    out.push({ x: i + 0.5, z: RING.j0 + 0.5, h: 0.7 + hash(i, 1, 303) * 0.7 });
  }
  for (let j = RING.j0 + 1; j < RING.j1; j += 3) {
    if (j >= e.j0 - 2 && j <= e.j1 + 2) continue;
    out.push({ x: RING.i1 + 0.5, z: j + 0.5, h: 0.7 + hash(1, j, 304) * 0.7 });
  }
  return out;
}

const FLAME_COLORS = [new THREE.Color(0xff8a1f), new THREE.Color(0xffc040), new THREE.Color(0xff5a10)];

export class Cinder {
  readonly group = new THREE.Group();
  readonly beacons: Beacon[];
  readonly cracks: Crack[];
  readonly stones: { x: number; z: number; h: number }[];
  private flames: THREE.Mesh[] = [];
  private lights: THREE.PointLight[] = [];
  private embers: THREE.Points;
  private emberBase: Float32Array;
  private emberPos: THREE.BufferAttribute;
  private time = 0;

  constructor(groundAt: (x: number, z: number) => number, fast: boolean) {
    this.group.name = 'cinder';
    this.beacons = beaconSpots();
    this.cracks = crackSpots();
    this.stones = stoneSpots();

    const obsidian = new THREE.MeshLambertMaterial({ color: 0x14111c });
    const pillarGeo = new THREE.BoxGeometry(0.4, PILLAR_HEIGHT, 0.4);
    const flameGeo = new THREE.BoxGeometry(0.34, 0.5, 0.34);
    for (const b of this.beacons) {
      const pillar = new THREE.Mesh(pillarGeo, obsidian);
      pillar.position.set(b.x, b.y + PILLAR_HEIGHT / 2, b.z);
      const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: FLAME_COLORS[0].clone() }));
      flame.position.set(b.x, b.y + PILLAR_HEIGHT + 0.25, b.z);
      this.flames.push(flame);
      this.group.add(pillar, flame);
      // A light on the four at the feet only: each light costs every surface.
      if (!fast && b.kind === 'foot') {
        const light = new THREE.PointLight(0xff8a30, 6, 11, 2);
        light.position.set(b.x, b.y + PILLAR_HEIGHT + 0.8, b.z);
        this.lights.push(light);
        this.group.add(light);
      }
    }

    // Cracks: thin glowing strips lying on the ground.
    const crackMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a });
    const crackMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.03, 1), crackMat, Math.max(1, this.cracks.length));
    const o = new THREE.Object3D();
    this.cracks.forEach((c, n) => {
      o.position.set(c.x, groundAt(c.x, c.z) + 0.02, c.z);
      o.rotation.set(0, c.rot, 0);
      o.scale.set(1, 1, c.len);
      o.updateMatrix();
      crackMesh.setMatrixAt(n, o.matrix);
    });
    crackMesh.count = this.cracks.length;
    this.group.add(crackMesh);

    // Standing stones: thin and low, so they hide nothing.
    const stoneMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 1, 0.3), obsidian, Math.max(1, this.stones.length));
    this.stones.forEach((s, n) => {
      o.position.set(s.x, RIM + s.h / 2, s.z);
      o.rotation.set(0, hash(n, 2, 305) * Math.PI, 0);
      o.scale.set(1, s.h, 1);
      o.updateMatrix();
      stoneMesh.setMatrixAt(n, o.matrix);
    });
    stoneMesh.count = this.stones.length;
    this.group.add(stoneMesh);

    // Embers rise over the Ring.
    const count = fast ? EMBERS_FAST : EMBERS;
    this.emberBase = new Float32Array(count * 4);
    for (let n = 0; n < count; n++) {
      this.emberBase[n * 4] = RING.i0 + hash(n, 1, 306) * (RING.i1 - RING.i0);
      this.emberBase[n * 4 + 1] = hash(n, 2, 306);
      this.emberBase[n * 4 + 2] = RING.j0 + hash(n, 3, 306) * (RING.j1 - RING.j0);
      this.emberBase[n * 4 + 3] = 0.5 + hash(n, 4, 306) * 0.7;
    }
    const geo = new THREE.BufferGeometry();
    this.emberPos = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    geo.setAttribute('position', this.emberPos);
    this.embers = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0xff9a30, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    this.embers.frustumCulled = false;
    this.group.add(this.embers);
    this.update(0);
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;
    this.flames.forEach((f, n) => {
      const k = 0.5 + 0.5 * Math.sin(t * (9 + n) + n * 2.1) * Math.sin(t * 5.3 + n);
      f.scale.set(1, 0.8 + 0.7 * k, 1);
      (f.material as THREE.MeshBasicMaterial).color.copy(FLAME_COLORS[0]).lerp(FLAME_COLORS[1], k);
    });
    this.lights.forEach((l, n) => {
      l.intensity = 5 + 2.5 * Math.sin(t * 7 + n * 1.7) * Math.sin(t * 3.1 + n);
    });
    const span = EMBER_TOP - RING.h;
    const a = this.emberPos.array as Float32Array;
    for (let n = 0; n < a.length / 3; n++) {
      const b = n * 4;
      const rise = (this.emberBase[b + 1] + (t * this.emberBase[b + 3]) / span) % 1;
      a[n * 3] = this.emberBase[b] + Math.sin(t * 0.7 + n) * 0.6;
      a[n * 3 + 1] = RING.h + 0.5 + rise * span;
      a[n * 3 + 2] = this.emberBase[b + 2] + Math.cos(t * 0.5 + n * 1.3) * 0.6;
    }
    this.emberPos.needsUpdate = true;
  }
}
