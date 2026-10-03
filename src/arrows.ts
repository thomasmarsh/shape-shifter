import * as THREE from 'three';
import { makeArrow } from './models';
import { Particles } from './particles';
import { sound } from './audio';
import { World } from './world';
import type { Player } from './player';

// Every arrow in flight. Archers call `shoot`; the game calls `update` once a
// frame. Arrows fly straight, are stopped by anything solid and hurt the
// player if they pass through the body.

const SPEED = 10; // tiles per second
const LIFE = 1.6; // seconds before an arrow gives up
const DAMAGE = 2;
const HIT_RADIUS = 0.45; // how close to the player's middle, on the ground plane
const SUBSTEP = 0.2; // longest hop between checks, so no frame rate can skip a wall or the player
const HEARING = 14; // arrows farther than this from the player make no sound

interface Arrow {
  mesh: THREE.Group;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  age: number;
  /** Where the archer stood, for knocking the player back. */
  fromX: number;
  fromZ: number;
}

export class Arrows {
  readonly group = new THREE.Group();
  private live: Arrow[] = [];

  constructor(
    private world: World,
    private particles: Particles,
  ) {}

  /** How many arrows are in the air. */
  get count(): number {
    return this.live.length;
  }

  /** Loose an arrow from `from` along the line through `to`, and on past it. */
  shoot(from: THREE.Vector3, to: THREE.Vector3, archerX: number, archerZ: number): void {
    const dir = to.clone().sub(from);
    if (dir.lengthSq() < 1e-6) return;
    dir.normalize();
    const mesh = makeArrow();
    // Turn to face the way it flies: yaw first, then tilt up or down.
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = Math.atan2(dir.x, dir.z);
    mesh.rotation.x = -Math.asin(dir.y);
    mesh.position.copy(from);
    this.group.add(mesh);
    this.live.push({ mesh, pos: from.clone(), dir, age: 0, fromX: archerX, fromZ: archerZ });
  }

  /** Remove every arrow, for when the player is sent back to a checkpoint. */
  clear(): void {
    for (const a of this.live) this.group.remove(a.mesh);
    this.live = [];
  }

  update(dt: number, player: Player): void {
    for (let n = this.live.length - 1; n >= 0; n--) {
      const a = this.live[n];
      a.age += dt;
      if (this.fly(a, dt, player) || a.age >= LIFE) {
        this.group.remove(a.mesh);
        this.live.splice(n, 1);
      } else {
        a.mesh.position.copy(a.pos);
      }
    }
  }

  /** Move an arrow for `dt` in small hops. Returns true once it has hit something. */
  private fly(a: Arrow, dt: number, player: Player): boolean {
    const length = SPEED * dt;
    const hops = Math.max(1, Math.ceil(length / SUBSTEP));
    for (let k = 0; k < hops; k++) {
      a.pos.addScaledVector(a.dir, length / hops);

      // Walls, ledges, trees and pedestals are cover.
      if (a.pos.y < this.world.solidAt(a.pos.x, a.pos.z)) {
        this.particles.burst(a.pos, 0xd9c9a0, 5, 1.6, 0.08);
        if (a.pos.distanceTo(player.pos) < HEARING) sound.thunk();
        return true;
      }

      // The player's body is a column from the feet to the top of the head.
      const close = Math.hypot(a.pos.x - player.pos.x, a.pos.z - player.pos.z) < HIT_RADIUS;
      if (close && a.pos.y >= player.pos.y && a.pos.y <= player.pos.y + player.form.height) {
        // Hidden or briefly safe players ignore the damage; the arrow flies on through.
        const before = player.hearts;
        player.damage(DAMAGE, a.fromX, a.fromZ);
        if (player.hearts < before) return true;
      }
    }
    return false;
  }
}
