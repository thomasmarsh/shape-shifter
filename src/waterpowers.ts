import * as THREE from 'three';
import {
  BUBBLE_AHEAD,
  BUBBLE_AIM,
  BUBBLE_COOLDOWN,
  BUBBLE_DAMAGE,
  BUBBLE_DELAY,
  BUBBLE_RADIUS,
  WATER_SHOT_AIM,
  WATER_SHOT_COOLDOWN,
  WATER_SHOT_DAMAGE,
  WATER_SHOT_RADIUS,
  WATER_SHOT_RANGE,
  WATER_SHOT_SPEED,
} from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
import { sound } from './audio';
import { World } from './world';
import type { Attackable, Player } from './player';

// The Mermaid's two water powers. Both need her to be swimming: on land the
// keys only make the "denied" sound. `KeyQ` throws a ball of water at the
// nearest bad guy; `KeyR` raises a column of bubbles under one.

const SUBSTEP = 0.2; // longest hop between checks, so no frame rate can skip a wall or a bad guy
const BODY = 1.6; // a bad guy's body is a column this tall from the feet
const CHEST = 0.9; // how high above the Mermaid's feet the shot leaves her
const COLUMN_HEIGHT = 3; // tiles the bubbles rise
const RISE_TIME = 0.5; // seconds from the burst until the column has faded away
const PALE = 0xbfe6ff;
const SPHERE = new THREE.SphereGeometry(1, 10, 8);

interface Shot {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  travelled: number;
  fromX: number;
  fromZ: number;
}

interface Column {
  group: THREE.Group;
  material: THREE.MeshBasicMaterial;
  /** The warning ring on the ground, then the stack that rises. */
  ring: THREE.Mesh[];
  stack: THREE.Mesh[];
  x: number;
  z: number;
  y: number;
  age: number;
  burst: boolean;
}

export class WaterPowers {
  readonly group = new THREE.Group();
  private shots: Shot[] = [];
  private columns: Column[] = [];
  private shotCool = 0;
  private columnCool = 0;

  constructor(
    private world: World,
    private particles: Particles,
    private targets: readonly Attackable[],
  ) {}

  /** How many water shots are in the air. */
  get shotCount(): number {
    return this.shots.length;
  }

  /** How many bubble columns are warning or bursting. */
  get columnCount(): number {
    return this.columns.length;
  }

  /** Remove everything, for when the player is sent back to a checkpoint. */
  clear(): void {
    for (const s of this.shots) this.group.remove(s.mesh);
    for (const c of this.columns) this.dropColumn(c);
    this.shots = [];
    this.columns = [];
    this.shotCool = 0;
    this.columnCool = 0;
  }

  update(dt: number, player: Player, input: Controls): void {
    this.shotCool = Math.max(0, this.shotCool - dt);
    this.columnCool = Math.max(0, this.columnCool - dt);
    if (player.form.id === 'mermaid' && !player.dead && !player.hidden) {
      if (input.hit('KeyQ') && this.shotCool <= 0) {
        if (player.swimming) this.shoot(player);
        else sound.denied();
      }
      if (input.hit('KeyR') && this.columnCool <= 0) {
        if (player.swimming) this.raise(player);
        else sound.denied();
      }
    }
    for (let n = this.shots.length - 1; n >= 0; n--) {
      const s = this.shots[n];
      if (this.fly(s, dt)) {
        this.group.remove(s.mesh);
        this.shots.splice(n, 1);
      } else {
        s.mesh.position.copy(s.pos);
      }
    }
    for (let n = this.columns.length - 1; n >= 0; n--) {
      if (this.grow(this.columns[n], dt)) {
        this.dropColumn(this.columns[n]);
        this.columns.splice(n, 1);
      }
    }
  }

  /** The nearest living bad guy within `reach` tiles of the player, on the ground plane. */
  private nearest(player: Player, reach: number): Attackable | null {
    let best: Attackable | null = null;
    let bestD = reach;
    for (const e of this.targets) {
      if (!e.alive) continue;
      const d = Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
      if (d <= bestD) {
        best = e;
        bestD = d;
      }
    }
    return best;
  }

  private shoot(player: Player): void {
    const from = new THREE.Vector3(player.pos.x, player.pos.y + CHEST, player.pos.z);
    const target = this.nearest(player, WATER_SHOT_AIM);
    const dir = target
      ? new THREE.Vector3(target.pos.x - from.x, target.pos.y + CHEST - from.y, target.pos.z - from.z)
      : new THREE.Vector3(Math.sin(player.heading), 0, Math.cos(player.heading));
    if (dir.lengthSq() < 1e-6) dir.set(Math.sin(player.heading), 0, Math.cos(player.heading));
    dir.normalize();
    const mesh = new THREE.Mesh(SPHERE, new THREE.MeshBasicMaterial({ color: PALE, transparent: true, opacity: 0.85 }));
    mesh.scale.setScalar(0.22);
    mesh.position.copy(from);
    this.group.add(mesh);
    this.shots.push({ mesh, pos: from.clone(), dir, travelled: 0, fromX: player.pos.x, fromZ: player.pos.z });
    this.shotCool = WATER_SHOT_COOLDOWN;
    sound.waterShot();
  }

  /** Move a shot for `dt` in small hops. Returns true once it has hit something or run out. */
  private fly(s: Shot, dt: number): boolean {
    const length = WATER_SHOT_SPEED * dt;
    const hops = Math.max(1, Math.ceil(length / SUBSTEP));
    for (let k = 0; k < hops; k++) {
      const hop = Math.min(length / hops, WATER_SHOT_RANGE - s.travelled);
      s.pos.addScaledVector(s.dir, hop);
      s.travelled += hop;
      this.particles.sparkle(s.pos, PALE, 1, 0.12);

      // Walls, ledges, trees and pedestals stop it, as they stop arrows.
      if (s.pos.y < this.world.solidAt(s.pos.x, s.pos.z)) {
        this.particles.burst(s.pos, PALE, 5, 1.6, 0.08);
        return true;
      }

      for (const e of this.targets) {
        if (!e.alive) continue;
        const close = Math.hypot(s.pos.x - e.pos.x, s.pos.z - e.pos.z) < WATER_SHOT_RADIUS;
        if (close && s.pos.y >= e.pos.y - 0.2 && s.pos.y <= e.pos.y + BODY) {
          e.takeHit(WATER_SHOT_DAMAGE, s.fromX, s.fromZ);
          this.particles.burst(s.pos, PALE, 8, 2.2, 0.1);
          return true;
        }
      }
      if (s.travelled >= WATER_SHOT_RANGE) {
        this.particles.burst(s.pos, PALE, 4, 1.2, 0.08);
        return true;
      }
    }
    return false;
  }

  private raise(player: Player): void {
    const target = this.nearest(player, BUBBLE_AIM);
    const x = target ? target.pos.x : player.pos.x + Math.sin(player.heading) * BUBBLE_AHEAD;
    const z = target ? target.pos.z : player.pos.z + Math.cos(player.heading) * BUBBLE_AHEAD;
    const ground = this.world.groundAt(x, z);
    const y = target ? target.pos.y : Number.isFinite(ground) ? ground : player.pos.y;

    const group = new THREE.Group();
    group.position.set(x, y, z);
    const material = new THREE.MeshBasicMaterial({ color: PALE, transparent: true, opacity: 0.6, depthWrite: false });
    const ring: THREE.Mesh[] = [];
    for (let n = 0; n < 10; n++) {
      const a = (n / 10) * Math.PI * 2;
      const b = new THREE.Mesh(SPHERE, material);
      b.scale.setScalar(0.1);
      b.position.set(Math.cos(a) * BUBBLE_RADIUS, 0.1, Math.sin(a) * BUBBLE_RADIUS);
      ring.push(b);
      group.add(b);
    }
    const stack: THREE.Mesh[] = [];
    for (let n = 0; n < 6; n++) {
      const b = new THREE.Mesh(SPHERE, material);
      b.scale.setScalar(0.35 + (n % 3) * 0.1);
      b.position.set(((n * 37) % 5) * 0.12 - 0.24, 0, ((n * 53) % 5) * 0.12 - 0.24);
      b.visible = false;
      stack.push(b);
      group.add(b);
    }
    this.group.add(group);
    this.columns.push({ group, material, ring, stack, x, z, y, age: 0, burst: false });
    this.columnCool = BUBBLE_COOLDOWN;
    sound.bubbles();
  }

  /** Age a column: warn, burst once, then rise and fade. Returns true when it is gone. */
  private grow(c: Column, dt: number): boolean {
    c.age += dt;
    if (!c.burst) {
      if (c.age < BUBBLE_DELAY) {
        // The ring shrinks a little as the burst nears.
        const t = c.age / BUBBLE_DELAY;
        for (const b of c.ring) b.scale.setScalar(0.1 + 0.06 * Math.sin(t * Math.PI * 6));
        return false;
      }
      c.burst = true;
      for (const b of c.ring) b.visible = false;
      for (const b of c.stack) b.visible = true;
      for (const e of this.targets) {
        if (!e.alive) continue;
        if (Math.hypot(e.pos.x - c.x, e.pos.z - c.z) <= BUBBLE_RADIUS) e.takeHit(BUBBLE_DAMAGE, c.x, c.z);
      }
      this.particles.burst(new THREE.Vector3(c.x, c.y + 0.5, c.z), PALE, 12, 3, 0.1);
    }
    const t = Math.min(1, (c.age - BUBBLE_DELAY) / RISE_TIME);
    c.stack.forEach((b, n) => {
      b.position.y = t * COLUMN_HEIGHT * ((n + 1) / c.stack.length);
    });
    c.material.opacity = 0.6 * (1 - t);
    return t >= 1;
  }

  private dropColumn(c: Column): void {
    this.group.remove(c.group);
    c.material.dispose();
  }
}
