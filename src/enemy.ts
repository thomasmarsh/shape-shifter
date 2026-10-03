import * as THREE from 'three';
import { makeBadGuy, BadGuyModel } from './models';
import { Particles } from './particles';
import { sound } from './audio';
import { World } from './world';
import type { Attackable, Player } from './player';

// Type 1 from the plan: the regular bad guy. 9 hearts, punches for 1 heart.
// "Testers" are the same bad guy but slower to notice you and slower to punch,
// so the tutorial fight is forgiving.

const MAX_HEARTS = 9;
const PUNCH_DAMAGE = 1;
const PUNCH_REACH = 1.3;
const RADIUS = 0.35;
const STEP = 0.35;

type State = 'idle' | 'chase' | 'windup' | 'recover' | 'return' | 'dead';

interface Tuning {
  speed: number;
  notice: number;
  windup: number;
  recover: number;
}

const REGULAR: Tuning = { speed: 2.7, notice: 6.5, windup: 0.5, recover: 1.1 };
const TESTER: Tuning = { speed: 2.0, notice: 4.5, windup: 0.85, recover: 1.8 };

export class Enemy implements Attackable {
  readonly pos = new THREE.Vector3();
  readonly group = new THREE.Group();
  hearts = MAX_HEARTS;
  private state: State = 'idle';
  private timer = 0;
  private facing = 0;
  private walkPhase = 0;
  private flash = 0;
  private knock = new THREE.Vector3();
  private model: BadGuyModel;
  private barFill: THREE.Sprite;
  private bar: THREE.Group;
  private tuning: Tuning;
  private baseColor: THREE.Color;

  constructor(
    private world: World,
    private particles: Particles,
    private home: { x: number; z: number },
    readonly tester: boolean,
  ) {
    this.tuning = tester ? TESTER : REGULAR;
    this.model = makeBadGuy(tester);
    this.baseColor = this.model.bodyMat.color.clone();
    this.group.add(this.model.group);

    // A little heart bar that floats overhead once the bad guy has been hit.
    this.bar = new THREE.Group();
    const back = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x1b1530, depthTest: false }));
    back.scale.set(1.04, 0.16, 1);
    this.barFill = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff5a6e, depthTest: false }));
    this.barFill.center.set(0, 0.5);
    // Offset along the camera's "right" so the fill lines up with its backing.
    this.barFill.position.set(-0.48 * Math.SQRT1_2, 0, -0.48 * Math.SQRT1_2);
    this.barFill.scale.set(0.96, 0.09, 1);
    back.renderOrder = 10;
    this.barFill.renderOrder = 11;
    this.bar.add(back, this.barFill);
    this.bar.position.y = 2.15;
    this.bar.visible = false;
    this.group.add(this.bar);

    this.reset();
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  /** Send a living bad guy back to its post with full hearts. */
  reset(): void {
    if (!this.alive) return;
    this.pos.set(this.home.x, this.world.groundAt(this.home.x, this.home.z), this.home.z);
    this.hearts = MAX_HEARTS;
    this.state = 'idle';
    this.timer = 0;
    this.knock.set(0, 0, 0);
    this.bar.visible = false;
    this.group.position.copy(this.pos);
  }

  takeHit(damage: number, fromX: number, fromZ: number): void {
    if (!this.alive) return;
    this.hearts -= damage;
    this.flash = 0.15;
    const dx = this.pos.x - fromX;
    const dz = this.pos.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    this.knock.set((dx / d) * 7, 0, (dz / d) * 7);
    this.particles.burst(new THREE.Vector3(this.pos.x, this.pos.y + 1, this.pos.z), 0xffffff, 6, 2.5, 0.1);
    sound.hit();
    this.bar.visible = true;
    this.barFill.scale.x = 0.96 * Math.max(0, this.hearts / MAX_HEARTS);
    if (this.state === 'idle' || this.state === 'return') this.state = 'chase';
    if (this.hearts <= 0) {
      this.state = 'dead';
      this.timer = 0.35;
      this.bar.visible = false;
      this.particles.burst(new THREE.Vector3(this.pos.x, this.pos.y + 0.9, this.pos.z), 0x6b4fa3, 22, 4, 0.18);
      sound.defeat();
    }
  }

  update(dt: number, player: Player, others: readonly Enemy[]): void {
    if (this.state === 'dead') {
      if (this.timer > 0) {
        this.timer -= dt;
        this.group.scale.setScalar(Math.max(0.01, this.timer / 0.35));
        if (this.timer <= 0) this.group.visible = false;
      }
      return;
    }

    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const dy = player.pos.y - this.pos.y;
    const canSee = !player.hidden && !player.dead;
    const fromHome = Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z);
    let moveX = 0;
    let moveZ = 0;

    switch (this.state) {
      case 'idle':
        if (canSee && dist < this.tuning.notice && Math.abs(dy) < 3) this.state = 'chase';
        break;
      case 'return': {
        if (canSee && dist < this.tuning.notice * 0.8 && fromHome < 9) {
          this.state = 'chase';
        } else if (fromHome < 0.3) {
          this.state = 'idle';
        } else {
          moveX = (this.home.x - this.pos.x) / fromHome;
          moveZ = (this.home.z - this.pos.z) / fromHome;
        }
        break;
      }
      case 'chase':
        if (!canSee || dist > 11 || fromHome > 14) {
          this.state = 'return';
        } else if (dist < PUNCH_REACH && Math.abs(dy) < 1.4) {
          this.state = 'windup';
          this.timer = this.tuning.windup;
        } else if (dist > 0.9) {
          moveX = dx / dist;
          moveZ = dz / dist;
        }
        break;
      case 'windup':
        this.timer -= dt;
        if (this.timer <= 0) {
          if (canSee && dist < PUNCH_REACH + 0.35 && Math.abs(dy) < 1.4) {
            player.damage(PUNCH_DAMAGE, this.pos.x, this.pos.z);
          }
          this.state = 'recover';
          this.timer = this.tuning.recover;
        }
        break;
      case 'recover':
        this.timer -= dt;
        if (this.timer <= 0) this.state = canSee ? 'chase' : 'return';
        break;
    }

    // Keep bad guys from stacking on top of each other.
    for (const o of others) {
      if (o === this || !o.alive) continue;
      const ox = this.pos.x - o.pos.x;
      const oz = this.pos.z - o.pos.z;
      const od = Math.hypot(ox, oz);
      if (od > 0.001 && od < 0.9) {
        moveX += (ox / od) * 0.8;
        moveZ += (oz / od) * 0.8;
      }
    }

    if (this.state !== 'windup' && (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) && this.state !== 'idle') {
      const aimX = this.state === 'return' ? moveX : dx;
      const aimZ = this.state === 'return' ? moveZ : dz;
      const target = Math.atan2(aimX, aimZ);
      let diff = target - this.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facing += diff * Math.min(1, dt * 8);
    }

    const moving = Math.hypot(moveX, moveZ) > 0.01;
    this.walk((moveX * this.tuning.speed + this.knock.x) * dt, (moveZ * this.tuning.speed + this.knock.z) * dt);
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 8));
    this.walkPhase = moving ? this.walkPhase + dt * 8 : 0;

    this.animate(dt);
  }

  /** Bad guys can't jump, won't step off edges and stay out of the water. */
  private walk(stepX: number, stepZ: number): void {
    const ok = (x: number, z: number): boolean => {
      const top = this.world.solidUnder(x, z, RADIUS);
      if (top > this.pos.y + STEP) return false;
      const lead = RADIUS + 0.15;
      for (const [ax, az] of [
        [x, z],
        [x + Math.sign(x - this.pos.x) * lead, z + Math.sign(z - this.pos.z) * lead],
      ]) {
        if (this.world.isWater(ax, az)) return false;
        if (this.world.groundAt(ax, az) < this.pos.y - 0.5) return false;
      }
      return true;
    };
    if (stepX !== 0 && ok(this.pos.x + stepX, this.pos.z)) this.pos.x += stepX;
    if (stepZ !== 0 && ok(this.pos.x, this.pos.z + stepZ)) this.pos.z += stepZ;
    this.pos.y = this.world.groundAt(this.pos.x, this.pos.z);
  }

  private animate(dt: number): void {
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.facing;
    this.bar.rotation.y = -this.facing;
    const m = this.model;
    const swing = Math.sin(this.walkPhase) * 0.7;
    m.legL.rotation.x = swing;
    m.legR.rotation.x = -swing;
    m.armL.rotation.x = -swing * 0.6;
    if (this.state === 'windup') {
      // The fist goes back, then snaps forward: a clear warning to step away.
      const t = 1 - this.timer / this.tuning.windup;
      m.armR.rotation.x = t < 0.8 ? 0.9 * (t / 0.8) + 0.4 : -1.7;
      m.armR.rotation.z = 0;
    } else if (this.state === 'recover' && this.timer > this.tuning.recover - 0.2) {
      m.armR.rotation.x = -1.7;
    } else {
      m.armR.rotation.x = swing * 0.6;
    }

    if (this.flash > 0) {
      this.flash -= dt;
      m.bodyMat.color.setHex(0xffffff);
    } else if (this.state === 'windup') {
      m.bodyMat.color.copy(this.baseColor).lerp(new THREE.Color(0xff6b6b), 0.5 + Math.sin(this.timer * 40) * 0.3);
    } else {
      m.bodyMat.color.copy(this.baseColor);
    }
  }
}
