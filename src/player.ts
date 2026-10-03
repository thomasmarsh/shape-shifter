import * as THREE from 'three';
import { FORMS, FormDef, SWORD_COLOR, SWORD_DAMAGE, swordTier } from './forms';
import { Input } from './input';
import { makeFairy, makeFairyHome, makeHuman, FairyModel, HumanModel } from './models';
import { Particles } from './particles';
import { sound } from './audio';
import { World } from './world';

const GRAVITY = 24;
const JUMP_SPEED = 7.6; // clears a one-tile ledge
const STEP = 0.35; // how high you can walk up without jumping
const RADIUS = 0.3;

// Fairy flight
const FLY_ENERGY = 4.5; // seconds of flapping before exhaustion
const FLY_RISE = 2.4;
const FLY_CEILING = 3; // how far above the last ground a fairy can climb
const FLY_REST = 2.2; // seconds on the ground to recover fully

const ATTACK_TIME = 0.3;
const ATTACK_REACH = 1.75;
const HURT_SAFE_TIME = 0.9;

export interface Attackable {
  pos: THREE.Vector3;
  alive: boolean;
  takeHit(damage: number, fromX: number, fromZ: number): void;
}

export interface PlayerEvents {
  onFell(): void;
  onDied(): void;
  onAte(): void;
  onHome(): void;
}

export class Player {
  readonly pos = new THREE.Vector3();
  readonly group = new THREE.Group();
  private vy = 0;
  private facing = Math.PI / 2;
  onGround = true;
  swimming = false;

  level = 0;
  lights = 0;
  hearts = 10;
  bread = 100;
  formIndex = 0;

  energy = FLY_ENERGY;
  exhausted = false;
  /** True while tucked inside a fairy home: bad guys can't see you. */
  hidden = false;
  private hiddenTime = 0;
  /** Total seconds spent flapping, for the tutorial. */
  flownTime = 0;
  walked = 0;

  private lastGroundY = 0;
  private attackTimer = 0;
  private attackHit = false;
  private safeTimer = 0;
  private eatTimer = 0;
  private walkPhase = 0;
  private knock = new THREE.Vector3();
  dead = false;

  private human: HumanModel;
  private fairy: FairyModel;
  private home: THREE.Group;

  constructor(
    private world: World,
    private particles: Particles,
    private events: PlayerEvents,
  ) {
    this.human = makeHuman();
    this.fairy = makeFairy();
    this.home = makeFairyHome();
    this.home.visible = false;
    this.group.add(this.human.group, this.fairy.group);
    this.applyForm();
  }

  get form(): FormDef {
    return FORMS[this.formIndex];
  }

  get homeMesh(): THREE.Group {
    return this.home;
  }

  get energyFraction(): number {
    return this.energy / FLY_ENERGY;
  }

  /** Height of the middle of the body, for effects and aiming. */
  get chest(): THREE.Vector3 {
    return new THREE.Vector3(this.pos.x, this.pos.y + (this.formIndex === 1 ? 0.45 : 0.9), this.pos.z);
  }

  place(x: number, z: number): void {
    this.pos.set(x, this.world.groundAt(x, z), z);
    this.vy = 0;
    this.knock.set(0, 0, 0);
    this.onGround = true;
    this.lastGroundY = this.pos.y;
    this.leaveHome();
    this.sync(0);
  }

  // ---- shape-shifting ----------------------------------------------------

  canShiftTo(index: number): 'ok' | 'locked' | 'soon' | 'same' {
    const form = FORMS[index];
    if (!form) return 'locked';
    if (index === this.formIndex) return 'same';
    if (this.level < form.level) return 'locked';
    if (!form.playable) return 'soon';
    return 'ok';
  }

  shiftTo(index: number): boolean {
    if (this.canShiftTo(index) !== 'ok') return false;
    this.leaveHome();
    this.formIndex = index;
    // Hearts never go above what the new form can hold. Shifting back to a
    // bigger form does not give them back: you have to eat.
    this.hearts = Math.min(this.hearts, this.form.maxHearts);
    this.applyForm();
    this.particles.burst(this.chest, 0xc9a7ff, 18, 3.2, 0.14, 2);
    this.particles.sparkle(this.chest, 0xffffff, 10, 0.6);
    sound.shift();
    return true;
  }

  private applyForm(): void {
    this.human.group.visible = this.formIndex === 0;
    this.fairy.group.visible = this.formIndex === 1;
    const tier = swordTier(this.level);
    (this.human.blade.material as THREE.MeshLambertMaterial).color.setHex(SWORD_COLOR[tier]);
  }

  /** Call after the level changes so the sword shows its new tier. */
  refreshGear(): void {
    this.applyForm();
  }

  // ---- hearts ------------------------------------------------------------

  damage(amount: number, fromX: number, fromZ: number): void {
    if (this.dead || this.safeTimer > 0 || this.hidden) return;
    this.hearts = Math.max(0, this.hearts - amount);
    this.safeTimer = HURT_SAFE_TIME;
    const dx = this.pos.x - fromX;
    const dz = this.pos.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    this.knock.set((dx / d) * 6, 0, (dz / d) * 6);
    this.particles.burst(this.chest, 0xff5a6e, 8, 2.5);
    sound.hurt();
    if (this.hearts <= 0) {
      this.dead = true;
      this.events.onDied();
    }
  }

  private eat(): void {
    if (this.eatTimer > 0) return;
    if (this.bread <= 0 || this.hearts >= this.form.maxHearts) {
      sound.denied();
      this.eatTimer = 0.3;
      return;
    }
    this.bread -= 1;
    this.hearts += 1;
    this.eatTimer = 0.35;
    this.particles.sparkle(this.chest, 0xff8fa3, 4, 0.3);
    sound.eat();
    this.events.onAte();
  }

  // ---- fairy home --------------------------------------------------------

  private enterHome(): void {
    this.hidden = true;
    this.hiddenTime = 0;
    this.home.position.copy(this.pos);
    this.home.visible = true;
    this.home.scale.setScalar(0.01);
    this.fairy.group.visible = false;
    this.particles.sparkle(this.pos, 0xffe98a, 14, 0.6);
    sound.magic();
    this.events.onHome();
  }

  private leaveHome(): void {
    if (!this.hidden) return;
    this.hidden = false;
    this.home.visible = false;
    this.particles.sparkle(this.home.position, 0xffe98a, 10, 0.5);
    this.applyForm();
  }

  // ---- per-frame ---------------------------------------------------------

  update(dt: number, input: Input, enemies: readonly Attackable[]): void {
    if (this.dead) return;
    this.safeTimer = Math.max(0, this.safeTimer - dt);
    this.eatTimer = Math.max(0, this.eatTimer - dt);

    if (input.hit('KeyF')) this.eat();

    if (this.hidden) {
      this.hiddenTime += dt;
      this.home.scale.setScalar(Math.min(1, this.home.scale.x + dt * 6));
      const wantsOut = input.hit('KeyQ') || input.hit('Space') || input.anyMoveHit();
      if (this.hiddenTime > 0.35 && wantsOut) this.leaveHome();
      this.recoverEnergy(dt);
      return;
    }

    const isFairy = this.formIndex === 1;
    if (isFairy && input.hit('KeyQ')) {
      if (this.onGround && !this.swimming) {
        this.enterHome();
        return;
      }
      sound.denied();
    }

    this.moveAround(dt, input, isFairy);
    this.moveUpDown(dt, input, isFairy);
    this.swingSword(dt, input, enemies);

    if (this.pos.y < -8) this.events.onFell();
    this.sync(dt);
  }

  private moveAround(dt: number, input: Input, isFairy: boolean): void {
    const m = input.move();
    // The camera sits to the south-west looking north-east, so "up" on screen
    // is +x -z and "right" on screen is +x +z.
    let dx = (m.x + m.y) * Math.SQRT1_2;
    let dz = (m.x - m.y) * Math.SQRT1_2;
    const len = Math.hypot(dx, dz);
    let speed = this.form.speed;
    if (this.swimming) speed *= isFairy ? 0.5 : 0.55;
    if (this.attackTimer > 0) speed *= 0.5;

    if (len > 0) {
      dx /= len;
      dz /= len;
      const target = Math.atan2(dx, dz);
      let diff = target - this.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facing += diff * Math.min(1, dt * 16);
      this.walkPhase += dt * speed * 2.4;
      this.walked += speed * dt;
    } else {
      this.walkPhase = 0;
    }

    const stepX = (dx * speed + this.knock.x) * dt;
    const stepZ = (dz * speed + this.knock.z) * dt;
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 8));

    // Slide along walls by trying each axis on its own.
    if (this.world.solidUnder(this.pos.x + stepX, this.pos.z, RADIUS) <= this.pos.y + STEP) {
      this.pos.x += stepX;
    }
    if (this.world.solidUnder(this.pos.x, this.pos.z + stepZ, RADIUS) <= this.pos.y + STEP) {
      this.pos.z += stepZ;
    }
  }

  private moveUpDown(dt: number, input: Input, isFairy: boolean): void {
    let ground = this.world.solidUnder(this.pos.x, this.pos.z, RADIUS);
    // Water holds you up: you float with your head out.
    const inWater = this.world.isWater(this.pos.x, this.pos.z);
    const floatY = this.world.waterLevel - (isFairy ? 0.25 : 0.8);
    if (inWater) ground = Math.max(ground, floatY);

    const flapping = isFairy && input.held('Space') && !this.exhausted && this.energy > 0;
    if (flapping) {
      if (this.onGround) sound.jump();
      this.onGround = false;
      this.energy -= dt;
      this.flownTime += dt;
      const ceiling = this.lastGroundY + FLY_CEILING;
      const want = this.pos.y < ceiling ? FLY_RISE : 0;
      this.vy += (want - this.vy) * Math.min(1, dt * 8);
      if (this.energy <= 0) {
        this.energy = 0;
        this.exhausted = true;
        sound.denied();
      }
    } else if (!isFairy && this.onGround && input.hit('Space')) {
      this.vy = JUMP_SPEED;
      this.onGround = false;
      sound.jump();
    } else if (!this.onGround) {
      // Fairies flutter down slowly; everyone else just falls.
      this.vy -= GRAVITY * (isFairy ? 0.4 : 1) * dt;
      if (isFairy) this.vy = Math.max(this.vy, -3.4);
    }

    this.pos.y += this.vy * dt;
    if (this.pos.y <= ground) {
      this.pos.y = ground;
      this.vy = 0;
      this.onGround = true;
      this.lastGroundY = ground;
    } else if (this.pos.y > ground + 0.02) {
      this.onGround = false;
    }
    this.swimming = inWater && this.pos.y <= floatY + 0.05;
    if (this.onGround) this.recoverEnergy(dt);
  }

  private recoverEnergy(dt: number): void {
    this.energy = Math.min(FLY_ENERGY, this.energy + (FLY_ENERGY / FLY_REST) * dt);
    if (this.energy >= FLY_ENERGY) this.exhausted = false;
  }

  private swingSword(dt: number, input: Input, enemies: readonly Attackable[]): void {
    const wants = input.hit('KeyJ') || input.hit('Mouse0');
    if (wants && this.attackTimer <= 0) {
      if (this.form.sword === 'none') {
        sound.denied();
      } else {
        this.attackTimer = ATTACK_TIME;
        this.attackHit = false;
        sound.swing();
      }
    }
    if (this.attackTimer <= 0) return;
    this.attackTimer -= dt;

    // The blow lands partway through the swing.
    if (!this.attackHit && this.attackTimer < ATTACK_TIME * 0.6) {
      this.attackHit = true;
      const fx = Math.sin(this.facing);
      const fz = Math.cos(this.facing);
      let damage = SWORD_DAMAGE[swordTier(this.level)];
      if (this.form.sword === 'weak') damage -= 1;
      for (const e of enemies) {
        if (!e.alive) continue;
        const ex = e.pos.x - this.pos.x;
        const ez = e.pos.z - this.pos.z;
        const d = Math.hypot(ex, ez);
        if (d > ATTACK_REACH || Math.abs(e.pos.y - this.pos.y) > 1.3) continue;
        // In front of us: within about 75 degrees either side.
        if (d > 0.4 && (ex * fx + ez * fz) / d < 0.25) continue;
        e.takeHit(damage, this.pos.x, this.pos.z);
      }
    }
  }

  /** Move the models to match the state and play the little animations. */
  private sync(dt: number): void {
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.facing;
    // Blink while briefly safe after being hurt.
    this.group.visible = this.safeTimer <= 0 || Math.floor(this.safeTimer * 14) % 2 === 0;

    const swing = Math.sin(this.walkPhase) * (this.onGround || this.swimming ? 0.8 : 0.3);
    if (this.formIndex === 0) {
      const h = this.human;
      h.legL.rotation.x = swing;
      h.legR.rotation.x = -swing;
      h.armL.rotation.x = -swing * 0.8;
      if (this.attackTimer > 0) {
        const t = 1 - this.attackTimer / ATTACK_TIME;
        h.armR.rotation.x = -2.6 + t * 2.9;
      } else {
        h.armR.rotation.x = swing * 0.8 - 0.25;
      }
      if (!this.onGround && !this.swimming) {
        h.legL.rotation.x = 0.5;
        h.legR.rotation.x = -0.3;
      }
    } else {
      const f = this.fairy;
      const airborne = !this.onGround;
      const now = performance.now() / 1000;
      const flap = airborne ? 0.5 + Math.sin(now * 38) * 0.7 : 0.3 + Math.sin(now * 4) * 0.2;
      f.wingL.rotation.y = flap;
      f.wingR.rotation.y = -flap;
      f.body.position.y = airborne ? Math.sin(now * 7) * 0.04 : 0;
      f.body.rotation.x = airborne ? 0.25 : 0;
      if (airborne && dt > 0 && Math.random() < dt * 14) {
        this.particles.sparkle(this.chest, 0xffd6f2, 1, 0.15);
      }
    }
  }
}
