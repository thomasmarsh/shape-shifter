import * as THREE from 'three';
import { makeArcher, makeBadGuy, makeBladeGuy, makeEel, makeSnapper, makeSwordGuy, makeWarden, BadGuyModel } from './models';
import { EEL, SNAPPER, WARDEN } from './forms';
import { Arrows, Shot } from './arrows';
import { Particles } from './particles';
import { sound } from './audio';
import { World } from './world';
import type { EnemySpot } from './layout';
import type { Attackable, Player } from './player';

// The bad guys from the plan. Type 1 is the regular bad guy: 9 hearts, punches
// for 1 heart and chases you. "Testers" are the same bad guy but slower to
// notice you and slower to punch, so the tutorial fight is forgiving. Type 2
// is the archer: 8 hearts, holds its post, shoots arrows at anyone it has
// noticed and punches for 1 heart when you get close. Type 3 is the sword bad
// guy: 5 hearts, slow and heavy, and one swing costs 4 hearts. The blade bad
// guy is its light cousin: 3 hearts, a swing costs 2, and at 8 it outruns
// every form but the Cheetah (the Wolf runs 7, the Cheetah 10). The Warden and
// the Eel are the two bosses; their numbers and rules are in forms.ts.

const PUNCH_REACH = 1.3;
const RADIUS = 0.35;
const STEP = 0.35;
/** An archer keeps watching this much past the distance it first noticed you at. */
const KEEP_MARGIN = 1.5;
/** Bow sounds from farther away than this are not played. */
const HEARING = 14;

export type EnemyKind = NonNullable<EnemySpot['kind']>;

/** Facing angles, forward being (sin, cos) in (x, z). */
const FACING = { n: Math.PI, e: Math.PI / 2, s: 0, w: -Math.PI / 2 };

type State = 'idle' | 'chase' | 'windup' | 'recover' | 'return' | 'watch' | 'draw' | 'dash' | 'faint' | 'dead';

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
  /** Hearts one blow takes. */
  damage: number;
  /** How close you must be for it to start a blow; it lands up to 0.35 farther. */
  reach: number;
  bow?: Bow;
  /**
   * A runner keeps running at you through its wind-up, so running away does
   * not dodge the blow, and follows `leash` tiles from its post (others 14).
   */
  runs?: { leash: number };
}

const KINDS: Record<EnemyKind, Tuning> = {
  regular: { hearts: 9, speed: 2.7, notice: 6.5, noticeHeight: 3, windup: 0.5, recover: 1.1, damage: 1, reach: PUNCH_REACH },
  archer: {
    hearts: 8,
    speed: 2.2,
    notice: 10,
    noticeHeight: 6,
    windup: 0.5,
    recover: 1.1,
    damage: 1,
    reach: PUNCH_REACH,
    bow: { draw: 0.9, wait: 1.8, height: 1.1 },
  },
  sword: { hearts: 5, speed: 2.4, notice: 6.5, noticeHeight: 3, windup: 0.8, recover: 1.1, damage: 4, reach: PUNCH_REACH + 0.3 },
  warden: {
    hearts: WARDEN.hearts,
    speed: WARDEN.speed,
    notice: WARDEN.notice,
    noticeHeight: WARDEN.noticeHeight,
    windup: WARDEN.windup,
    recover: WARDEN.recover,
    damage: WARDEN.damage,
    reach: WARDEN.slamStart,
  },
  eel: {
    hearts: EEL.hearts,
    speed: EEL.speed,
    notice: EEL.notice,
    noticeHeight: Infinity,
    windup: EEL.windup,
    recover: EEL.recover,
    damage: EEL.damage,
    reach: EEL.lungeStart,
  },
  snapper: {
    hearts: SNAPPER.hearts,
    speed: SNAPPER.speed,
    notice: SNAPPER.notice,
    noticeHeight: Infinity,
    windup: SNAPPER.windup,
    recover: SNAPPER.recover,
    damage: SNAPPER.damage,
    reach: SNAPPER.lungeStart,
  },
  blade: { hearts: 3, speed: 8, notice: 7.5, noticeHeight: 3, windup: 0.4, recover: 0.9, damage: 2, reach: 1.4, runs: { leash: 60 } },
};

/** The rock the Warden throws and the ball of water the Eel spits. */
const ROCK = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), new THREE.MeshLambertMaterial({ color: 0x3a3840 }));
const BALL = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 12, 8),
  new THREE.MeshLambertMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.8 }),
);
/** A rock or ball is in the air this long at most. */
const SHOT_LIFE = 3;
/** The longest hop a swimmer's dash takes between checks. */
const DASH_HOP = 0.2;
/** How fast a swimmer rises and sinks to follow the player's depth. */
const SWIM_DEPTH_SPEED = 3;
/** What the Eel and the Snapper share: one swimmer, two tunings. */
type Fish = typeof EEL | typeof SNAPPER;

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
  /** True while an idle bad guy has a Snake behind it: it cannot notice it. */
  behind: boolean;
}

export class Enemy implements Attackable {
  readonly pos = new THREE.Vector3();
  readonly group = new THREE.Group();
  readonly kind: EnemyKind;
  readonly tester: boolean;
  /** True for the Warden and the Eel. */
  readonly boss: boolean;
  /** True for the Eel and the Snapper, which swim and never leave the water. */
  readonly swims: boolean;
  readonly maxHearts: number;
  hearts: number;
  private state: State = 'idle';
  private timer = 0;
  /** Seconds until an archer may draw its bow again. */
  private cooldown = 0;
  private facing = FACING.w;
  private postFacing = FACING.w;
  private walkPhase = 0;
  private flash = 0;
  private knock = new THREE.Vector3();
  /** Where the current think() wants to walk, as a direction. */
  private wantX = 0;
  private wantZ = 0;
  private model: BadGuyModel;
  private bow: THREE.Group | null = null;
  private bowMat: THREE.MeshLambertMaterial | null = null;
  private bladeMat: THREE.MeshLambertMaterial | null = null;
  private barFill: THREE.Sprite;
  private bar: THREE.Group;
  private tuning: Tuning;
  private baseColor: THREE.Color;
  private minLevel: number;
  private awake = false;
  /** What the current wind-up is for. */
  private act: 'slam' | 'throw' | 'lunge' | 'spit' = 'slam';
  /** The red ring on the ground that shows where the Warden's slam lands. */
  private ring: THREE.Mesh | null = null;
  /** The pale disc on the surface over an awake Eel or Snapper. */
  readonly surfaceWake: THREE.Mesh | null = null;
  /** The red streak on the surface along the path of a swimmer's lunge, shown while it glows. */
  readonly streak: THREE.Mesh | null = null;
  /** A swimmer's fixed direction and what is left of its dash. */
  private dashDir = new THREE.Vector3();
  private dashLeft = 0;
  private dashHit = false;
  /** True while a sleeping Eel is parked far below the world, where no sword reaches. */
  private parked = false;

  constructor(
    private world: World,
    private particles: Particles,
    private arrows: Arrows,
    private home: { x: number; z: number },
    spot: Pick<EnemySpot, 'tester' | 'kind' | 'minLevel' | 'facing'>,
  ) {
    this.postFacing = this.facing = FACING[spot.facing ?? 'w'];
    this.kind = spot.kind ?? 'regular';
    this.tester = spot.tester;
    this.boss = this.kind === 'warden' || this.kind === 'eel';
    this.swims = this.kind === 'eel' || this.kind === 'snapper';
    this.tuning = this.tester ? { ...KINDS[this.kind], ...TESTER } : KINDS[this.kind];
    this.maxHearts = this.tuning.hearts;
    this.hearts = this.maxHearts;
    if (this.kind === 'archer') {
      const archer = makeArcher();
      this.model = archer;
      this.bow = archer.bow;
      this.bowMat = archer.bowMat;
    } else if (this.kind === 'sword' || this.kind === 'blade') {
      const guy = this.kind === 'sword' ? makeSwordGuy() : makeBladeGuy();
      this.model = guy;
      this.bladeMat = guy.bladeMat;
    } else if (this.kind === 'warden' || this.kind === 'eel') {
      this.model = this.kind === 'warden' ? makeWarden() : makeEel();
    } else if (this.kind === 'snapper') {
      this.model = makeSnapper();
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
    this.bar.position.y = this.kind === 'warden' ? 2.9 : this.kind === 'snapper' ? 1 : 2.15;
    this.bar.visible = false;
    this.group.add(this.bar);
    if (this.kind === 'warden') {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(WARDEN.slamRadius - 0.15, WARDEN.slamRadius, 48),
        new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      ring.visible = false;
      this.ring = ring;
      this.group.add(ring);
    }
    if (this.swims) {
      const F = this.fish;
      const red = () => new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
      // The wake is a flat disc, about 1.2 across for the Eel and 0.6 for the Snapper.
      const surfaceWake = new THREE.Mesh(
        new THREE.CircleGeometry(F === EEL ? 0.6 : 0.3, 24),
        new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
      );
      surfaceWake.rotation.x = -Math.PI / 2;
      surfaceWake.renderOrder = 5;
      surfaceWake.visible = false;
      // The streak is a strip one tile long that is stretched to the lunge.
      const strip = new THREE.PlaneGeometry(F === EEL ? 0.7 : 0.4, 1);
      strip.rotateX(-Math.PI / 2);
      strip.translate(0, 0, 0.5);
      const streak = new THREE.Mesh(strip, red());
      streak.renderOrder = 5;
      streak.visible = false;
      this.surfaceWake = surfaceWake;
      this.streak = streak;
      this.group.add(surfaceWake, streak);
    }

    // Bad guys for a later level wait out of sight until `wake` is called.
    this.minLevel = spot.minLevel ?? 0;
    this.setAwake(this.minLevel <= 0);

    this.reset();
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  /** Make a boss beaten at once, with no sound or puff: for loading a save. */
  beat(): void {
    this.hearts = 0;
    this.state = 'dead';
    this.timer = 0;
    this.group.visible = false;
    this.bar.visible = false;
    this.hideSwimMarks();
  }

  /** Undo a beating: the bad guy stands at its post again with all its hearts. For a new game. */
  revive(): void {
    if (this.alive) return;
    this.state = 'idle';
    this.reset();
    this.group.visible = this.awake;
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
    if (this.sleeping) return false;
    return this.state !== 'idle' && this.state !== 'return' && this.state !== 'faint';
  }

  /** True for the Eel until the lid is down. */
  private get sleeping(): boolean {
    return this.kind === 'eel' && !this.world.lidDown;
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
    if (this.swims) {
      this.parked = false;
      this.dashLeft = 0;
      const [lo, hi] = this.swimRange();
      this.pos.y = (lo + hi) / 2;
    }
    this.hearts = this.maxHearts;
    this.state = 'idle';
    this.facing = this.postFacing;
    this.timer = 0;
    this.cooldown = 0;
    this.knock.set(0, 0, 0);
    this.bar.visible = false;
    this.group.position.copy(this.pos);
    this.group.rotation.x = 0;
  }

  /** True while it lies fainted from a bite. */
  get fainted(): boolean {
    return this.state === 'faint';
  }

  /**
   * Knock it out for `seconds`, whatever its hearts. A blow or shot in progress is
   * cancelled, a second bite restarts the count, and it wakes where it lies.
   */
  faint(seconds: number): void {
    if (!this.alive || !this.awake || this.boss || this.swims) return;
    this.state = 'faint';
    this.timer = seconds;
    this.wantX = 0;
    this.wantZ = 0;
    this.particles.burst(new THREE.Vector3(this.pos.x, this.pos.y + 1, this.pos.z), 0x7bd44a, 8, 2, 0.1);
  }

  takeHit(damage: number, fromX: number, fromZ: number): void {
    if (!this.alive || !this.awake || this.sleeping) return;
    this.hearts -= damage;
    this.flash = 0.15;
    const dx = this.pos.x - fromX;
    const dz = this.pos.z - fromZ;
    const d = Math.hypot(dx, dz) || 1;
    // A boss is too heavy to be shoved, and water holds a swimmer.
    if (!this.boss && !this.swims) this.knock.set((dx / d) * 7, 0, (dz / d) * 7);
    this.particles.burst(new THREE.Vector3(this.pos.x, this.pos.y + 1, this.pos.z), 0xffffff, 6, 2.5, 0.1);
    sound.hit();
    this.bar.visible = true;
    this.barFill.scale.x = 0.96 * Math.max(0, this.hearts / this.maxHearts);
    if (this.state === 'idle' || this.state === 'return') this.state = this.kind === 'archer' ? 'watch' : 'chase';
    if (this.hearts <= 0) {
      this.state = 'dead';
      this.timer = 0.35;
      this.bar.visible = false;
      this.hideSwimMarks();
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

    if (this.state === 'faint') {
      // Lies still: no thinking at all, only a shove from a sword blow.
      this.timer -= dt;
      if (this.timer <= 0) this.state = 'idle';
      this.walk(this.knock.x * dt, this.knock.z * dt);
      this.knock.multiplyScalar(Math.max(0, 1 - dt * 8));
      this.walkPhase = 0;
      this.animate(dt);
      return;
    }

    if (this.sleeping) {
      // Parked far below the world, out of sight, so nothing can reach it.
      this.parked = true;
      this.state = 'idle';
      this.pos.set(this.home.x, -1000, this.home.z);
      this.group.visible = false;
      this.hideSwimMarks();
      return;
    }
    if (this.parked) this.reset();
    this.group.visible = true;

    const s: Sense = {
      dx: player.pos.x - this.pos.x,
      dz: player.pos.z - this.pos.z,
      dy: player.pos.y - this.pos.y,
      dist: 0,
      canSee: !player.hidden && !player.dead,
      fromHome: Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z),
      behind: false,
    };
    s.dist = Math.hypot(s.dx, s.dz);
    // Only the Snake is quiet: an idle bad guy notices it in its front half only.
    s.behind = this.state === 'idle' && player.form.id === 'snake' && Math.sin(this.facing) * s.dx + Math.cos(this.facing) * s.dz <= 0;
    this.cooldown = Math.max(0, this.cooldown - dt);

    this.wantX = 0;
    this.wantZ = 0;
    if (this.swims) {
      this.thinkSwimmer(dt, player, s);
      this.animate(dt);
      return;
    }
    if (this.kind === 'archer') this.thinkArcher(dt, player, s);
    else if (this.kind === 'warden') this.thinkWarden(dt, player, s);
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
    } else if (this.state === 'idle') {
      let diff = this.postFacing - this.facing;
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
        if (s.canSee && !s.behind && s.dist < t.notice && Math.abs(s.dy) < t.noticeHeight) this.state = 'chase';
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
        if (!s.canSee || s.dist > 11 || s.fromHome > (t.runs?.leash ?? 14)) {
          this.state = 'return';
        } else if (s.dist < t.reach && Math.abs(s.dy) < 1.4) {
          this.state = 'windup';
          this.timer = t.windup;
        } else if (s.dist > 0.9) {
          this.wantX = s.dx / s.dist;
          this.wantZ = s.dz / s.dist;
        }
        break;
      case 'windup':
        if (t.runs && s.dist > 0.9) {
          this.wantX = s.dx / s.dist;
          this.wantZ = s.dz / s.dist;
        }
        this.punch(dt, player, s);
        break;
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
    const noticed = s.canSee && !s.behind && s.dist < t.notice && Math.abs(s.dy) < t.noticeHeight;
    // Once it has noticed you it keeps watching a little farther out, so you
    // can't flicker it on and off at the edge of its range.
    const watching = s.canSee && s.dist < t.notice + KEEP_MARGIN && Math.abs(s.dy) < t.noticeHeight + KEEP_MARGIN;
    const inFistReach = s.dist < t.reach && Math.abs(s.dy) < 1.4;

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

  /** The Warden: walks at you, slams when you are close, throws rocks when you are out of reach. */
  private thinkWarden(dt: number, player: Player, s: Sense): void {
    const t = this.tuning;
    const noticed = s.canSee && s.dist < t.notice && Math.abs(s.dy) < t.noticeHeight;
    const inSlam = s.dist < WARDEN.slamStart && Math.abs(s.dy) < WARDEN.slamHeight;
    const outOfReach = s.dist > WARDEN.throwFrom || Math.abs(s.dy) > WARDEN.slamHeight;
    switch (this.state) {
      case 'idle':
        if (noticed) this.state = 'chase';
        break;
      case 'return':
        if (noticed) {
          this.state = 'chase';
        } else if (s.fromHome < 0.3) {
          this.state = 'idle';
        } else {
          this.headHome(s);
        }
        break;
      case 'chase':
        if (!s.canSee || s.dist > t.notice + 4 || Math.abs(s.dy) > t.noticeHeight + 4) {
          this.state = 'return';
        } else if (inSlam) {
          this.state = 'windup';
          this.act = 'slam';
          this.timer = WARDEN.windup;
        } else if (outOfReach && this.cooldown <= 0) {
          this.state = 'windup';
          this.act = 'throw';
          this.timer = WARDEN.throwWindup;
        } else if (s.dist > 0.9) {
          this.wantX = s.dx / s.dist;
          this.wantZ = s.dz / s.dist;
        }
        break;
      case 'windup':
        this.timer -= dt;
        if (this.timer > 0) break;
        if (this.act === 'slam') {
          if (s.canSee && s.dist < WARDEN.slamRadius && Math.abs(s.dy) < WARDEN.slamHeight) {
            player.damage(WARDEN.damage, this.pos.x, this.pos.z);
          }
          this.timer = WARDEN.recover;
        } else {
          this.shoot(player, 1.9, WARDEN.rockSpeed, WARDEN.rockDamage, ROCK);
          this.cooldown = WARDEN.throwGap;
          this.timer = 0.5;
        }
        this.state = 'recover';
        break;
      case 'recover':
        this.timer -= dt;
        if (this.timer <= 0) this.state = s.canSee ? 'chase' : 'return';
        break;
    }
  }

  /** Throw a rock or spit a ball at where the player's chest is right now. */
  private shoot(player: Player, height: number, speed: number, damage: number, look: THREE.Mesh): void {
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const from = new THREE.Vector3(this.pos.x + (dx / d) * 0.5, this.pos.y + height, this.pos.z + (dz / d) * 0.5);
    const shot: Shot = { speed, damage, look: look.clone(), life: SHOT_LIFE };
    this.arrows.shoot(from, player.chest, this.pos.x, this.pos.z, shot);
    if (d < HEARING) sound.bow();
  }

  /** The numbers of the swimmer this is: the Eel's or the Snapper's. */
  private get fish(): Fish {
    return this.kind === 'snapper' ? SNAPPER : EEL;
  }

  /** The depths a swimmer's centre may be at here: off the bed, and under the surface. */
  private swimRange(): [number, number] {
    const F = this.fish;
    const lo = this.world.groundAt(this.pos.x, this.pos.z) + F.bedGap;
    const hi = this.world.waterLevelAt(this.pos.x, this.pos.z) - F.topGap;
    return [lo, Math.max(lo, hi)];
  }

  /** True where a swimmer may be: water, and for a Snapper not on kelp or a hollow. */
  private swimmable(x: number, z: number): boolean {
    return this.world.isWater(x, z) && (this.kind !== 'snapper' || !this.world.isKelp(x, z));
  }

  /** Swim a step in the plane, one axis at a time, never onto a tile that is not swimmable. Returns how far it got. */
  private swimMove(stepX: number, stepZ: number): number {
    let moved = 0;
    if (stepX !== 0 && this.swimmable(this.pos.x + stepX, this.pos.z)) {
      this.pos.x += stepX;
      moved += Math.abs(stepX);
    }
    if (stepZ !== 0 && this.swimmable(this.pos.x, this.pos.z + stepZ)) {
      this.pos.z += stepZ;
      moved += Math.abs(stepZ);
    }
    return moved;
  }

  /** Swim toward (x, z) and rise or sink toward `y`, staying in the water. */
  private swimTo(dt: number, x: number, z: number, y: number, speed: number): void {
    const d = Math.hypot(x - this.pos.x, z - this.pos.z);
    if (d > 0.05) {
      const step = Math.min(d, speed * dt);
      this.swimMove(((x - this.pos.x) / d) * step, ((z - this.pos.z) / d) * step);
    }
    const dy = y - this.pos.y;
    this.pos.y += Math.sign(dy) * Math.min(Math.abs(dy), SWIM_DEPTH_SPEED * dt);
  }

  /** Keep a swimmer's centre between the bed and the surface. */
  private swimClamp(): void {
    const [lo, hi] = this.swimRange();
    this.pos.y = Math.min(hi, Math.max(lo, this.pos.y));
  }

  /**
   * The Eel and the Snapper: lunge at swimmers and drift home when alone. The
   * Eel also spits at anyone it has noticed on the shore; the Snapper notices
   * only swimmers, and lets go of one who is farther than twice its notice.
   */
  private thinkSwimmer(dt: number, player: Player, s: Sense): void {
    const F = this.fish;
    const swimmer = !player.dead && player.swimming && this.world.isWater(player.pos.x, player.pos.z);
    const snapper = this.kind === 'snapper';
    const range = snapper && this.state === 'chase' ? F.notice * 2 : F.notice;
    const noticed = s.canSee && (snapper ? swimmer && s.dist < range : swimmer || s.dist < F.notice);
    const [lo, hi] = this.swimRange();
    const aimY = swimmer ? player.pos.y + 0.4 : hi;
    const dy = aimY - this.pos.y;
    this.wantX = 0;
    this.wantZ = 0;
    switch (this.state) {
      case 'idle':
      case 'return':
        if (noticed) {
          this.state = 'chase';
        } else if (s.fromHome < 0.3) {
          this.state = 'idle';
          this.swimTo(dt, this.pos.x, this.pos.z, (lo + hi) / 2, F.speed);
        } else {
          this.state = 'return';
          this.swimTo(dt, this.home.x, this.home.z, (lo + hi) / 2, F.speed);
        }
        break;
      case 'chase':
        if (!noticed) {
          this.state = 'return';
        } else if (swimmer) {
          if (Math.hypot(s.dist, dy) < F.lungeStart) {
            // The direction is fixed now: swim sideways.
            this.dashDir.set(s.dx, dy, s.dz).normalize();
            this.state = 'windup';
            this.act = 'lunge';
            this.timer = F.windup;
          } else {
            this.swimTo(dt, player.pos.x, player.pos.z, aimY, F.speed);
          }
        } else if (this.cooldown <= 0) {
          this.state = 'windup';
          this.act = 'spit';
          this.timer = EEL.spitWindup;
        } else {
          this.swimTo(dt, player.pos.x, player.pos.z, aimY, F.speed);
        }
        break;
      case 'windup':
        this.timer -= dt;
        if (this.act === 'spit') this.swimTo(dt, this.pos.x, this.pos.z, hi, F.speed);
        if (this.timer > 0) break;
        if (this.act === 'lunge') {
          this.state = 'dash';
          this.dashLeft = F.lungeLength;
          this.dashHit = false;
        } else {
          this.swimClamp();
          const surface = this.world.waterLevelAt(this.pos.x, this.pos.z);
          this.shoot(player, Math.max(this.pos.y, surface) + 0.3 - this.pos.y, EEL.spitSpeed, EEL.spitDamage, BALL);
          this.cooldown = EEL.spitGap;
          this.state = 'recover';
          this.timer = 0.5;
        }
        break;
      case 'dash': {
        let todo = Math.min(this.dashLeft, F.lungeSpeed * dt);
        let blocked = false;
        while (todo > 1e-6 && !blocked) {
          const hop = Math.min(DASH_HOP, todo);
          todo -= hop;
          this.dashLeft -= hop;
          const y0 = this.pos.y;
          const moved = this.swimMove(this.dashDir.x * hop, this.dashDir.z * hop);
          this.pos.y = y0 + this.dashDir.y * hop;
          this.swimClamp();
          blocked = moved < Math.hypot(this.dashDir.x, this.dashDir.z) * hop * 0.5;
          const px = player.pos.x - this.pos.x;
          const pz = player.pos.z - this.pos.z;
          if (!this.dashHit && s.canSee && Math.hypot(px, pz) < F.lungeHit && Math.abs(player.pos.y + 0.4 - this.pos.y) < 1.3) {
            this.dashHit = true;
            player.damage(F.damage, this.pos.x, this.pos.z);
          }
        }
        if (blocked || this.dashLeft <= 1e-6) {
          this.state = 'recover';
          this.timer = F.recover;
        }
        break;
      }
      case 'recover':
        this.timer -= dt;
        this.swimTo(dt, this.pos.x, this.pos.z, aimY, F.speed);
        if (this.timer <= 0) this.state = 'chase';
        break;
    }
    this.swimClamp();
    // It faces the way it swims, or the way it lunges.
    const lunging = this.state === 'windup' || this.state === 'dash';
    const fx = lunging && this.act === 'lunge' ? this.dashDir.x : s.dx;
    const fz = lunging && this.act === 'lunge' ? this.dashDir.z : s.dz;
    if (this.state !== 'idle' && (Math.abs(fx) > 0.01 || Math.abs(fz) > 0.01)) this.facing = Math.atan2(fx, fz);
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

  /** The punch (or sword swing), shared by all kinds: a wind-up that tells you to step away, then a short recovery. */
  private punch(dt: number, player: Player, s: Sense): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    if (this.state === 'windup') {
      if (s.canSee && s.dist < this.tuning.reach + 0.35 && Math.abs(s.dy) < 1.4) {
        player.damage(this.tuning.damage, this.pos.x, this.pos.z);
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

  private hideSwimMarks(): void {
    if (this.surfaceWake) this.surfaceWake.visible = false;
    if (this.streak) this.streak.visible = false;
  }

  /** Lay the wake over the swimmer and, while it glows for a lunge, the streak along the path. */
  private markSwimmer(): void {
    const { surfaceWake: wake, streak } = this;
    if (!wake || !streak) return;
    const F = this.fish;
    const surface = this.world.waterLevelAt(this.pos.x, this.pos.z);
    wake.visible = true;
    wake.position.y = surface - this.pos.y + 0.04;
    streak.visible = this.state === 'windup' && this.act === 'lunge';
    if (!streak.visible) return;
    // The path runs straight ahead (the swimmer faces its lunge) until the shore or its full length.
    let length = 0;
    const dx = this.dashDir.x;
    const dz = this.dashDir.z;
    const flat = Math.hypot(dx, dz);
    while (flat > 0.001 && length < F.lungeLength && this.swimmable(this.pos.x + (dx / flat) * (length + 0.2), this.pos.z + (dz / flat) * (length + 0.2))) {
      length += 0.2;
    }
    streak.position.y = surface - this.pos.y + 0.05;
    streak.scale.z = Math.max(0.01, flat > 0.001 ? Math.min(length, F.lungeLength) : 0);
  }

  private animate(dt: number): void {
    this.group.position.copy(this.pos);
    if (this.swims) this.markSwimmer();
    if (this.ring) this.ring.visible = this.state === 'windup' && this.act === 'slam';
    this.group.rotation.y = this.facing;
    this.bar.rotation.y = -this.facing;
    // A fainted bad guy tips over onto its back.
    const down = this.state === 'faint';
    this.group.rotation.x = down ? -Math.PI / 2 : 0;
    if (down) this.group.position.y += 0.25;
    const m = this.model;
    const swing = Math.sin(this.walkPhase) * 0.7;
    m.legL.rotation.x = swing;
    m.legR.rotation.x = -swing;
    m.armL.rotation.x = -swing * 0.6;
    m.armR.rotation.z = 0;
    if (this.kind === 'warden' && this.state === 'windup') {
      // Both arms go up over the head and hold.
      m.armL.rotation.x = m.armR.rotation.x = -2.6;
    } else if (this.state === 'windup' && this.bladeMat) {
      // The sword goes up and back and holds there, then chops down at the end.
      const t = 1 - this.timer / this.tuning.windup;
      m.armR.rotation.x = t < 0.85 ? -2.6 * Math.min(1, t / 0.4) : -0.5;
    } else if (this.state === 'windup') {
      // The fist goes back, then snaps forward: a clear warning to step away.
      const t = 1 - this.timer / this.tuning.windup;
      m.armR.rotation.x = t < 0.8 ? 0.9 * (t / 0.8) + 0.4 : -1.7;
    } else if (this.state === 'recover' && this.timer > this.tuning.recover - 0.2) {
      m.armR.rotation.x = this.bladeMat ? -0.5 : -1.7;
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

    const glow = this.bowMat || this.bladeMat ? this.drawGlow() : 0;
    m.bodyMat.emissive.setHex(0xffb000).multiplyScalar(glow);
    this.bowMat?.emissive.setHex(0xffd84d).multiplyScalar(glow);
    this.bladeMat?.emissive.setHex(0xffd84d).multiplyScalar(glow);
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

  /**
   * 0 at rest; while a bow is drawn or a sword is raised, a pulse that grows
   * brighter and faster until the shot or the blow.
   */
  private drawGlow(): number {
    const span = this.state === 'draw' ? this.tuning.bow?.draw : this.state === 'windup' && this.bladeMat ? this.tuning.windup : 0;
    if (!span) return 0;
    const t = 1 - this.timer / span;
    const pulse = 0.5 + 0.5 * Math.sin((span - this.timer) * (20 + 30 * t));
    return Math.min(1, (0.4 + 0.6 * t) * (0.6 + 0.4 * pulse) + 0.2 * t);
  }
}
