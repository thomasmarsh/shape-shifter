import * as THREE from 'three';
import { makeArcher, makeBadGuy, BadGuyModel } from './models';
import { Arrows } from './arrows';
import { Particles } from './particles';
import { sound } from './audio';
import { World } from './world';
import type { EnemySpot } from './layout';
import type { Attackable, Player } from './player';

// The bad guys from the plan. Type 1 is the regular bad guy: 9 hearts, punches
// for 1 heart and chases you. "Testers" are the same bad guy but slower to
// notice you and slower to punch, so the tutorial fight is forgiving. Type 2
// is the archer: 8 hearts, holds its post, shoots arrows at anyone it has
// noticed and punches for 1 heart when you get close.

const PUNCH_DAMAGE = 1;
const PUNCH_REACH = 1.3;
const RADIUS = 0.35;
const STEP = 0.35;
/** An archer keeps watching this much past the distance it first noticed you at. */
const KEEP_MARGIN = 1.5;
/** Bow sounds from farther away than this are not played. */
const HEARING = 14;

export type EnemyKind = NonNullable<EnemySpot['kind']>;

type State = 'idle' | 'chase' | 'windup' | 'recover' | 'return' | 'watch' | 'draw' | 'dead';

interface Bow {
  /** Seconds the bow is drawn before the arrow is loosed. */
  draw: number;
  /** Seconds to wait after a shot before drawing again. */
  wait: number;
  /** Height of the bow above the feet. */
  height: number;
}

interface Tuning {
  hearts: number;
  speed: number;
  /** How close you must be to be noticed, and how far above or below. */
  notice: number;
  noticeHeight: number;
  windup: number;
  recover: number;
  bow?: Bow;
}

const KINDS: Record<EnemyKind, Tuning> = {
  regular: { hearts: 9, speed: 2.7, notice: 6.5, noticeHeight: 3, windup: 0.5, recover: 1.1 },
  archer: {
    hearts: 8,
    speed: 2.2,
    notice: 10,
    noticeHeight: 6,
    windup: 0.5,
    recover: 1.1,
    bow: { draw: 0.9, wait: 1.8, height: 1.1 },
  },
};

/** What a tester changes about the regular bad guy. */
const TESTER: Partial<Tuning> = { speed: 2.0, notice: 4.5, windup: 0.85, recover: 1.8 };

/** What an enemy knows about the player this frame. */
interface Sense {
  dx: number;
  dz: number;
  dy: number;
  dist: number;
  /** False while the player is hidden in a fairy home or has fainted. */
  canSee: boolean;
  fromHome: number;
}

export class Enemy implements Attackable {
  readonly pos = new THREE.Vector3();
  readonly group = new THREE.Group();
  readonly kind: EnemyKind;
  readonly tester: boolean;
  readonly maxHearts: number;
  hearts: number;
  private state: State = 'idle';
  private timer = 0;
  /** Seconds until an archer may draw its bow again. */
  private cooldown = 0;
  private facing = 0;
  private walkPhase = 0;
  private flash = 0;
  private knock = new THREE.Vector3();
  /** Where the current think() wants to walk, as a direction. */
  private wantX = 0;
  private wantZ = 0;
  private model: BadGuyModel;
  private bow: THREE.Group | null = null;
  private bowMat: THREE.MeshLambertMaterial | null = null;
  private barFill: THREE.Sprite;
  private bar: THREE.Group;
  private tuning: Tuning;
  private baseColor: THREE.Color;
  private minLevel: number;
  private awake = false;

  constructor(
    private world: World,
    private particles: Particles,
    private arrows: Arrows,
    private home: { x: number; z: number },
    spot: Pick<EnemySpot, 'tester' | 'kind' | 'minLevel'>,
  ) {
    this.kind = spot.kind ?? 'regular';
    this.tester = spot.tester;
    this.tuning = this.tester ? { ...KINDS[this.kind], ...TESTER } : KINDS[this.kind];
    this.maxHearts = this.tuning.hearts;
    this.hearts = this.maxHearts;
    if (this.kind === 'archer') {
      const archer = makeArcher();
      this.model = archer;
      this.bow = archer.bow;
      this.bowMat = archer.bowMat;
    } else {
      this.model = makeBadGuy(this.tester);
    }
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

    // Bad guys for a later level wait out of sight until `wake` is called.
    this.minLevel = spot.minLevel ?? 0;
    this.setAwake(this.minLevel <= 0);

    this.reset();
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  /** False while the bad guy is still waiting for a higher level. */
  get active(): boolean {
    return this.awake;
  }

  /**
   * True while this bad guy is after the player: a regular one is chasing or
   * fighting, an archer has noticed you. Idle, walking home and dormant ones
   * are not alert.
   */
  get alert(): boolean {
    if (!this.awake || !this.alive) return false;
    return this.state !== 'idle' && this.state !== 'return';
  }

  /**
   * Bring a dormant bad guy into the world, with a puff, once `level` is high
   * enough. Returns true if it just appeared.
   */
  wake(level: number): boolean {
    if (this.awake || level < this.minLevel) return false;
    this.setAwake(true);
    this.particles.burst(new THREE.Vector3(this.pos.x, this.pos.y + 0.9, this.pos.z), 0xbfa6ff, 24, 3.5, 0.16, 2);
    this.particles.sparkle(new THREE.Vector3(this.pos.x, this.pos.y + 0.2, this.pos.z), 0xffffff, 10, 0.6);
    return true;
  }

  /** Make it present or dormant to match `level` with no fanfare, for loading a save. */
  settle(level: number): void {
    this.setAwake(level >= this.minLevel);
  }

  private setAwake(awake: boolean): void {
    this.awake = awake;
    this.group.visible = awake && this.alive;
  }

  /** Send a living bad guy back to its post with full hearts. */
  reset(): void {
    if (!this.alive) return;
    this.pos.set(this.home.x, this.world.groundAt(this.home.x, this.home.z), this.home.z);
    this.hearts = this.maxHearts;
    this.state = 'idle';
    this.timer = 0;
    this.cooldown = 0;
    this.knock.set(0, 0, 0);
    this.bar.visible = false;
    this.group.position.copy(this.pos);
  }

  takeHit(damage: number, fromX: number, fromZ: number): void {
    if (!this.alive || !this.awake) return;
    this.hearts -= damage;
    this.flash = 0.15;
    const dx = this.pos.x - fromX;
    const dz = this.pos.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    this.knock.set((dx / d) * 7, 0, (dz / d) * 7);
    this.particles.burst(new THREE.Vector3(this.pos.x, this.pos.y + 1, this.pos.z), 0xffffff, 6, 2.5, 0.1);
    sound.hit();
    this.bar.visible = true;
    this.barFill.scale.x = 0.96 * Math.max(0, this.hearts / this.maxHearts);
    if (this.state === 'idle' || this.state === 'return') this.state = this.kind === 'archer' ? 'watch' : 'chase';
    if (this.hearts <= 0) {
      this.state = 'dead';
      this.timer = 0.35;
      this.bar.visible = false;
      this.particles.burst(new THREE.Vector3(this.pos.x, this.pos.y + 0.9, this.pos.z), 0x6b4fa3, 22, 4, 0.18);
      sound.defeat();
    }
  }

  update(dt: number, player: Player, others: readonly Enemy[]): void {
    if (!this.awake) return;
    if (this.state === 'dead') {
      if (this.timer > 0) {
        this.timer -= dt;
        this.group.scale.setScalar(Math.max(0.01, this.timer / 0.35));
        if (this.timer <= 0) this.group.visible = false;
      }
      return;
    }

    const s: Sense = {
      dx: player.pos.x - this.pos.x,
      dz: player.pos.z - this.pos.z,
      dy: player.pos.y - this.pos.y,
      dist: 0,
      canSee: !player.hidden && !player.dead,
      fromHome: Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z),
    };
    s.dist = Math.hypot(s.dx, s.dz);
    this.cooldown = Math.max(0, this.cooldown - dt);

    this.wantX = 0;
    this.wantZ = 0;
    if (this.kind === 'archer') this.thinkArcher(dt, player, s);
    else this.thinkRegular(dt, player, s);
    let moveX = this.wantX;
    let moveZ = this.wantZ;

    // Keep bad guys from stacking on top of each other.
    for (const o of others) {
      if (o === this || !o.alive || !o.awake) continue;
      const ox = this.pos.x - o.pos.x;
      const oz = this.pos.z - o.pos.z;
      const od = Math.hypot(ox, oz);
      if (od > 0.001 && od < 0.9) {
        moveX += (ox / od) * 0.8;
        moveZ += (oz / od) * 0.8;
      }
    }

    if (this.state !== 'windup' && (Math.abs(s.dx) > 0.01 || Math.abs(s.dz) > 0.01) && this.state !== 'idle') {
      const aimX = this.state === 'return' ? moveX : s.dx;
      const aimZ = this.state === 'return' ? moveZ : s.dz;
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

  // ---- thinking ----------------------------------------------------------

  private headHome(s: Sense): void {
    if (s.fromHome < 0.001) return;
    this.wantX = (this.home.x - this.pos.x) / s.fromHome;
    this.wantZ = (this.home.z - this.pos.z) / s.fromHome;
  }

  /** The regular bad guy and the testers: notice you, chase you, punch you. */
  private thinkRegular(dt: number, player: Player, s: Sense): void {
    const t = this.tuning;
    switch (this.state) {
      case 'idle':
        if (s.canSee && s.dist < t.notice && Math.abs(s.dy) < t.noticeHeight) this.state = 'chase';
        break;
      case 'return':
        if (s.canSee && s.dist < t.notice * 0.8 && s.fromHome < 9) {
          this.state = 'chase';
        } else if (s.fromHome < 0.3) {
          this.state = 'idle';
        } else {
          this.headHome(s);
        }
        break;
      case 'chase':
        if (!s.canSee || s.dist > 11 || s.fromHome > 14) {
          this.state = 'return';
        } else if (s.dist < PUNCH_REACH && Math.abs(s.dy) < 1.4) {
          this.state = 'windup';
          this.timer = t.windup;
        } else if (s.dist > 0.9) {
          this.wantX = s.dx / s.dist;
          this.wantZ = s.dz / s.dist;
        }
        break;
      case 'windup':
      case 'recover':
        this.punch(dt, player, s);
        break;
    }
  }

  /**
   * The archer: holds its post, shoots anyone it has noticed who is out of
   * punching range, and punches anyone who comes close.
   */
  private thinkArcher(dt: number, player: Player, s: Sense): void {
    const t = this.tuning;
    const bow = t.bow;
    if (!bow) return;
    const noticed = s.canSee && s.dist < t.notice && Math.abs(s.dy) < t.noticeHeight;
    // Once it has noticed you it keeps watching a little farther out, so you
    // can't flicker it on and off at the edge of its range.
    const watching = s.canSee && s.dist < t.notice + KEEP_MARGIN && Math.abs(s.dy) < t.noticeHeight + KEEP_MARGIN;
    const inFistReach = s.dist < PUNCH_REACH && Math.abs(s.dy) < 1.4;

    switch (this.state) {
      case 'idle':
      case 'return':
        if (noticed) {
          this.state = 'watch';
        } else if (s.fromHome < 0.3) {
          this.state = 'idle';
        } else {
          this.state = 'return';
          this.headHome(s);
        }
        break;
      case 'watch':
        if (!watching) {
          this.giveUp(s);
        } else if (inFistReach) {
          this.state = 'windup';
          this.timer = t.windup;
        } else if (this.cooldown <= 0) {
          this.state = 'draw';
          this.timer = bow.draw;
        } else if (s.fromHome > 0.3) {
          // Between shots, an archer knocked off its post walks back to it.
          this.headHome(s);
        }
        break;
      case 'draw':
        this.timer -= dt;
        if (!watching) {
          // The player hid or got away: lower the bow without shooting.
          this.giveUp(s);
        } else if (inFistReach) {
          this.state = 'watch';
        } else if (this.timer <= 0) {
          this.loose(player, s, bow);
        }
        break;
      case 'windup':
      case 'recover':
        this.punch(dt, player, s);
        break;
    }
  }

  /** Stop watching and start walking back to the post. */
  private giveUp(s: Sense): void {
    this.state = 'return';
    this.headHome(s);
  }

  /** Release the arrow at wherever the player's chest is right now. */
  private loose(player: Player, s: Sense, bow: Bow): void {
    const out = s.dist > 0 ? 0.4 / s.dist : 0;
    const from = new THREE.Vector3(this.pos.x + s.dx * out, this.pos.y + bow.height, this.pos.z + s.dz * out);
    this.arrows.shoot(from, player.chest, this.pos.x, this.pos.z);
    if (s.dist < HEARING) sound.bow();
    this.state = 'watch';
    this.cooldown = bow.wait;
  }

  /** The punch, shared by both kinds: a wind-up that tells you to step away, then a short recovery. */
  private punch(dt: number, player: Player, s: Sense): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    if (this.state === 'windup') {
      if (s.canSee && s.dist < PUNCH_REACH + 0.35 && Math.abs(s.dy) < 1.4) {
        player.damage(PUNCH_DAMAGE, this.pos.x, this.pos.z);
      }
      this.state = 'recover';
      this.timer = this.tuning.recover;
    } else if (this.kind === 'archer') {
      const t = this.tuning;
      const watching = s.canSee && s.dist < t.notice + KEEP_MARGIN && Math.abs(s.dy) < t.noticeHeight + KEEP_MARGIN;
      if (watching) this.state = 'watch';
      else this.giveUp(s);
    } else {
      this.state = s.canSee ? 'chase' : 'return';
    }
  }

  /** Bad guys can't jump, won't step off edges and stay out of the water and off thin ice. */
  private walk(stepX: number, stepZ: number): void {
    const ok = (x: number, z: number): boolean => {
      const top = this.world.solidUnder(x, z, RADIUS);
      if (top > this.pos.y + STEP) return false;
      const lead = RADIUS + 0.15;
      for (const [ax, az] of [
        [x, z],
        [x + Math.sign(x - this.pos.x) * lead, z + Math.sign(z - this.pos.z) * lead],
      ]) {
        if (this.world.isWater(ax, az) || this.world.isThinIce(ax, az)) return false;
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
    m.armR.rotation.z = 0;
    if (this.state === 'windup') {
      // The fist goes back, then snaps forward: a clear warning to step away.
      const t = 1 - this.timer / this.tuning.windup;
      m.armR.rotation.x = t < 0.8 ? 0.9 * (t / 0.8) + 0.4 : -1.7;
    } else if (this.state === 'recover' && this.timer > this.tuning.recover - 0.2) {
      m.armR.rotation.x = -1.7;
    } else {
      m.armR.rotation.x = swing * 0.6;
    }
    const bow = this.tuning.bow;
    if (this.bow && bow) {
      if (this.state === 'draw') {
        // The bow arm comes up and the other hand pulls the string back.
        const t = Math.min(1, (1 - this.timer / bow.draw) * 3);
        m.armL.rotation.x = -1.45 * t;
        m.armR.rotation.x = -1.2 * t;
      } else if (this.state === 'watch') {
        m.armL.rotation.x = -0.35;
      }
      // Keep the bow upright whatever the arm is doing.
      this.bow.rotation.x = -m.armL.rotation.x;
    }

    const glow = this.bowMat ? this.drawGlow() : 0;
    m.bodyMat.emissive.setHex(0xffb000).multiplyScalar(glow);
    this.bowMat?.emissive.setHex(0xffd84d).multiplyScalar(glow);
    if (this.flash > 0) {
      this.flash -= dt;
      m.bodyMat.color.setHex(0xffffff);
    } else if (this.state === 'draw') {
      // An archer's tell is a bright amber glow on cloak and bow that pulses
      // faster as the shot nears. (Red would read as brown on the green cloak.)
      m.bodyMat.color.copy(this.baseColor).lerp(new THREE.Color(0xfff07a), 0.35 + glow * 0.35);
    } else if (this.state === 'windup') {
      // Glows and pulses red: the second warning to step away or take cover.
      m.bodyMat.color.copy(this.baseColor).lerp(new THREE.Color(0xff6b6b), 0.5 + Math.sin(this.timer * 40) * 0.3);
    } else {
      m.bodyMat.color.copy(this.baseColor);
    }
  }

  /** 0 when the bow is down; while it is drawn, a pulse that grows brighter and faster. */
  private drawGlow(): number {
    const bow = this.tuning.bow;
    if (this.state !== 'draw' || !bow) return 0;
    const t = 1 - this.timer / bow.draw;
    const pulse = 0.5 + 0.5 * Math.sin((bow.draw - this.timer) * (20 + 30 * t));
    return Math.min(1, (0.4 + 0.6 * t) * (0.6 + 0.4 * pulse) + 0.2 * t);
  }
}
