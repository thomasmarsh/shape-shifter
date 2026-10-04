import * as THREE from 'three';
import {
  AXOLOTL_REGROW,
  FORMS,
  FormDef,
  GLIDE_SINK,
  GLIDE_SPEED,
  ICE_STUMBLE,
  PHYSICS,
  RUN_BREATH,
  RUN_REST,
  SWORD_COLOR,
  SWORD_DAMAGE,
  swordTier,
  WINDED_SPEED,
  WINGS_LEVEL,
} from './forms';
import type { Meter } from './hud';
import type { Controls } from './input';
import {
  APE_ARM_REST,
  makeAnt,
  makeSnake,
  makeAxolotl,
  makeBunny,
  makeCheetah,
  makeFairy,
  makeFairyHome,
  makeHuman,
  makeMermaid,
  MermaidModel,
  AxolotlModel,
  makeOrangutan,
  makeWolf,
  AntModel,
  BunnyModel,
  FairyModel,
  HumanModel,
  OrangutanModel,
  SnakeModel,
  WolfModel,
} from './models';
import { Particles } from './particles';
import { sound } from './audio';
import { World } from './world';

const { gravity: GRAVITY, step: STEP, flyCeiling: FLY_CEILING } = PHYSICS;
const RADIUS = 0.3;

// Fairy flight
const FLY_ENERGY = 4.5; // seconds of flapping before exhaustion
const FLY_RISE = 2.4;
const FLY_REST = 2.2; // seconds on the ground to recover fully

// Thin ice
const BREAK_DROP = 4; // downward speed a breaking sheet gives, in tiles per second

// Cheetah breath
const RUN_MOVING = 0.5; // tiles per second that count as running

// Orangutan climbing
const MAX_TREES = 20; // trees in a row before it must touch the ground
const CLIMB_SPEED = 4; // tiles per second up a trunk
const GRAB_DELAY = 0.15; // seconds of pushing on the ground before it grabs
const CLIMB_SLACK = 0.3; // feet may be this far below a trunk's base and still grab
const TOP_TIME = 0.12; // seconds to shuffle onto the middle of the treetop
const LET_GO_DOT = -0.2; // steering this far away from the trunk lets go
const DENIED_GAP = 0.8; // seconds between "too tired" sounds

// Bunny
const HOP_FULL_SPEED = 12; // still rising this fast after a moment: a full hop
const LAND_TIME = 0.2; // squash after landing

// Diving (vertical speeds in tiles per second)
const SINK = 3.5;
const RISE = 2.5;
const RISE_FAST = 5; // Space held
const MERMAID_VERTICAL = 6; // sinking and rising
const KELP_PULL = 16; // an auto-duck under a mat

// Winter Wolf on thin ice
const FROST_RATE = 22; // frost puffs per second while running on ice

const ATTACK_TIME = 0.3;
const ATTACK_REACH = 1.75;
const HURT_SAFE_TIME = 0.9;

export interface Attackable {
  pos: THREE.Vector3;
  alive: boolean;
  takeHit(damage: number, fromX: number, fromZ: number): void;
  /** Lie fainted for this many seconds (a venomous bite). Optional: not everything can faint. */
  faint?(seconds: number): void;
}

/** A climb up one tree trunk. */
interface Climb {
  /** The trunk's tile and the middle of it. */
  tile: number;
  cx: number;
  cz: number;
  /** Height of the treetop. */
  top: number;
  /** Progress of the shuffle onto the top: -1 while still going up. */
  over: number;
  fromX: number;
  fromZ: number;
}

export interface PlayerEvents {
  onFell(): void;
  onDied(): void;
  onAte(): void;
  onHome(): void;
}

/** Turn `facing` toward `target`, the short way round. */
function turnToward(facing: number, target: number, dt: number): number {
  let diff = target - facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return facing + diff * Math.min(1, dt * 16);
}

export class Player {
  readonly pos = new THREE.Vector3();
  readonly group = new THREE.Group();
  private vy = 0;
  private facing = Math.PI / 2;
  /** The way she faces, as an angle: forward is (sin, cos) on the ground plane. */
  get heading(): number {
    return this.facing;
  }
  onGround = true;
  swimming = false;
  /** True while the wings are open (a Human of level WINGS_LEVEL, holding Space in the air). */
  gliding = false;
  /** The wings opened since the last landing: no shifting until then. */
  private glided = false;
  /** The Human left the ground as a Human, so the wings may open. A shift in the air clears it. */
  private humanLift = false;
  /** Space was pressed in the air and is still held: the wings open as soon as the Human stops rising. */
  private wingsAsked = false;

  level = 0;
  lights = 0;
  hearts = 10;
  bread = 100;
  formIndex = 0;

  energy = FLY_ENERGY;
  exhausted = false;
  /** The Cheetah's breath, in seconds of running left. Only time refills it. */
  breath = RUN_BREATH;
  /** True from running out of breath until it is completely full again, in any form. */
  winded = false;
  /** True while tucked inside a fairy home. */
  homed = false;
  private hiddenTime = 0;
  /** Seconds the Axolotl has been in its form since it last regrew a heart. */
  private regrowTimer = 0;
  /** Total seconds spent flapping, for the tutorial. */
  flownTime = 0;
  walked = 0;

  // Orangutan climbing
  private climb: Climb | null = null;
  /** Trees climbed since an orangutan last stood on real ground. */
  treesClimbed = 0;
  private lastTree = -1;
  private pushed: { tile: number; cx: number; cz: number } | null = null;
  private pushTime = 0;
  private pushTile = -1;
  private noGrab = 0;
  private deniedTimer = 0;
  private climbPhase = 0;
  /** Total climbs started, for the tutorial. */
  totalClimbs = 0;

  // Bunny
  private hopCounted = false;
  /** Hops where Space was held long enough to count as a full one, for the tutorial. */
  fullHops = 0;
  private landTimer = 0;

  // Thin ice
  /** Seconds spent slower than ICE_SPEED on thin ice, or since last on real ground. */
  private iceSlow = 0;
  /** Tiles run at full speed on thin ice, for the tutorial. */
  iceRun = 0;

  private lastGroundY = 0;
  private attackTimer = 0;
  private biteWait = 0;
  private attackHit = false;
  private safeTimer = 0;
  private eatTimer = 0;
  private walkPhase = 0;
  private knock = new THREE.Vector3();
  dead = false;

  private human: HumanModel;
  private mermaid: MermaidModel;
  private fairy: FairyModel;
  private orangutan: OrangutanModel;
  private bunny: BunnyModel;
  private wolf: WolfModel;
  private cheetah: WolfModel;
  private ant: AntModel;
  private snake: SnakeModel;
  private axolotl: AxolotlModel;
  private home: THREE.Group;

  constructor(
    private world: World,
    private particles: Particles,
    private events: PlayerEvents,
  ) {
    this.human = makeHuman();
    this.mermaid = makeMermaid();
    this.fairy = makeFairy();
    this.orangutan = makeOrangutan();
    this.bunny = makeBunny();
    this.wolf = makeWolf();
    this.cheetah = makeCheetah();
    this.ant = makeAnt();
    this.snake = makeSnake();
    this.axolotl = makeAxolotl();
    this.home = makeFairyHome();
    this.home.visible = false;
    this.group.add(this.human.group, this.mermaid.group, this.fairy.group, this.orangutan.group, this.bunny.group, this.wolf.group, this.cheetah.group, this.ant.group, this.snake.group, this.axolotl.group);
    this.applyForm();
  }

  get form(): FormDef {
    return FORMS[this.formIndex];
  }

  get homeMesh(): THREE.Group {
    return this.home;
  }

  /** Top ground speed right now: a winded Cheetah is slowed to WINDED_SPEED. */
  get topSpeed(): number {
    return this.form.id === 'cheetah' && this.winded ? Math.min(this.form.speed, WINDED_SPEED) : this.form.speed;
  }

  get energyFraction(): number {
    return this.energy / FLY_ENERGY;
  }

  /** True while gripping a tree trunk. */
  get climbing(): boolean {
    return this.climb !== null;
  }

  /** The bar under the hearts for forms that have one, or null. */
  get meter(): Meter | null {
    if (this.form.canFly) {
      const label = this.exhausted ? 'Tired! Resting…' : 'Flying energy';
      return { label, fraction: this.energyFraction, tired: this.exhausted };
    }
    if (this.form.id === 'cheetah') {
      const label = this.winded ? 'Out of breath! Resting…' : 'Breath';
      return { label, fraction: this.breath / RUN_BREATH, tired: this.winded };
    }
    if (this.form.id === 'orangutan') {
      const left = MAX_TREES - this.treesClimbed;
      const label =
        left > 0 ? `Climbing: ${left} ${left === 1 ? 'tree' : 'trees'} left` : 'Too tired to climb - touch the ground';
      return { label, fraction: left / MAX_TREES, tired: left <= 0 };
    }
    return null;
  }

  /** Height of the middle of the body, for effects and aiming. */
  get chest(): THREE.Vector3 {
    return new THREE.Vector3(this.pos.x, this.pos.y + this.form.chest, this.pos.z);
  }

  place(x: number, z: number): void {
    this.pos.set(x, this.world.groundAt(x, z), z);
    // Water holds you up: you start floating, not on the bed.
    if (this.world.isWater(x, z)) this.pos.y = Math.max(this.pos.y, this.floatHeight());
    this.vy = 0;
    this.knock.set(0, 0, 0);
    this.onGround = true;
    this.lastGroundY = this.pos.y;
    this.climb = null;
    this.treesClimbed = 0;
    this.lastTree = -1;
    this.iceSlow = 0;
    this.leaveHome();
    this.sync(0);
  }

  // ---- shape-shifting ----------------------------------------------------

  /** True while any part of the footprint (centre and the four corners) is on a root tangle. */
  get inTangle(): boolean {
    const { x, z } = this.pos;
    const w = this.world;
    return (
      w.isTangle(x, z) ||
      w.isTangle(x - RADIUS, z - RADIUS) ||
      w.isTangle(x + RADIUS, z - RADIUS) ||
      w.isTangle(x - RADIUS, z + RADIUS) ||
      w.isTangle(x + RADIUS, z + RADIUS)
    );
  }

  /** True while any part of the footprint is on a kelp mat (the same five points as `inTangle`). */
  get inKelp(): boolean {
    const { x, z } = this.pos;
    const w = this.world;
    return (
      w.isKelp(x, z) ||
      w.isKelp(x - RADIUS, z - RADIUS) ||
      w.isKelp(x + RADIUS, z - RADIUS) ||
      w.isKelp(x - RADIUS, z + RADIUS) ||
      w.isKelp(x + RADIUS, z + RADIUS)
    );
  }

  /** True while bad guys can't see you: in a fairy home, or the Axolotl under a hollow's roof or inside a hole. */
  get hidden(): boolean {
    if (this.homed) return true;
    if (this.form.id !== 'axolotl' || this.dead) return false;
    return this.inTangle || this.world.isHollow(this.pos.x, this.pos.z);
  }

  /** Height of the feet when floating at the surface of the water here. */
  private floatHeight(): number {
    return this.world.waterLevelAt(this.pos.x, this.pos.z) - (this.form.canFly ? 0.25 : 0.8);
  }

  /** In water with the feet more than 0.05 below the float height. */
  get submerged(): boolean {
    return this.world.isWater(this.pos.x, this.pos.z) && this.pos.y < this.floatHeight() - 0.05;
  }

  /**
   * Highest the feet can be under the kelp mats of the footprint: the mat's
   * underside minus the body. Infinity when there is no mat.
   */
  private kelpCeiling(): number {
    const { x, z } = this.pos;
    const w = this.world;
    let ceiling = Infinity;
    for (const [ox, oz] of [[0, 0], [-RADIUS, -RADIUS], [RADIUS, -RADIUS], [-RADIUS, RADIUS], [RADIUS, RADIUS]]) {
      if (!w.isKelp(x + ox, z + oz)) continue;
      ceiling = Math.min(ceiling, w.waterLevelAt(x + ox, z + oz) - w.kelpDepthAt(x + ox, z + oz) - this.form.height);
    }
    return ceiling;
  }

  /** The Human of level WINGS_LEVEL has wings. They are not a form. */
  get winged(): boolean {
    return this.form.id === 'human' && this.level >= WINGS_LEVEL;
  }

  /** The wings open on a fresh press of Space in the air once the Human stops rising, and stay open while it is held. */
  private stepWings(input: Controls): void {
    if (this.onGround || this.swimming) {
      this.gliding = false;
      this.glided = false;
      this.wingsAsked = false;
      this.humanLift = this.winged && this.onGround;
    } else if (this.gliding) {
      this.gliding = input.held('Space');
    } else if (this.winged && this.humanLift) {
      // A press made while still rising is kept for as long as it is held, so the wings open at the top.
      if (input.hit('Space')) this.wingsAsked = true;
      if (!input.held('Space')) this.wingsAsked = false;
      if (this.wingsAsked && this.vy <= 0) {
        this.gliding = true;
        this.glided = true;
      }
    }
  }

  /** 'cramped' means a root tangle or a kelp mat leaves no room to change shape. */
  canShiftTo(index: number): 'ok' | 'locked' | 'soon' | 'same' | 'cramped' {
    const form = FORMS[index];
    if (!form) return 'locked';
    if (index === this.formIndex) return 'same';
    if (this.level < form.level) return 'locked';
    if (!form.playable) return 'soon';
    if (this.inTangle || this.inKelp || this.glided) return 'cramped';
    return 'ok';
  }

  shiftTo(index: number): boolean {
    if (this.canShiftTo(index) !== 'ok') return false;
    this.leaveHome();
    this.letGo();
    this.formIndex = index;
    if (!this.onGround) this.humanLift = false;
    // Hearts never go above what the new form can hold. Shifting back to a
    // bigger form does not give them back: you have to eat.
    this.hearts = Math.min(this.hearts, this.form.maxHearts);
    this.regrowTimer = 0;
    this.applyForm();
    this.particles.burst(this.chest, 0xc9a7ff, 18, 3.2, 0.14, 2);
    this.particles.sparkle(this.chest, 0xffffff, 10, 0.6);
    sound.shift();
    return true;
  }

  private applyForm(): void {
    const id = this.form.id;
    this.human.group.visible = id === 'human';
    this.mermaid.group.visible = id === 'mermaid';
    this.fairy.group.visible = id === 'fairy';
    this.orangutan.group.visible = id === 'orangutan';
    this.bunny.group.visible = id === 'bunny';
    this.wolf.group.visible = id === 'wolf';
    this.cheetah.group.visible = id === 'cheetah';
    this.ant.group.visible = id === 'ant';
    this.snake.group.visible = id === 'snake';
    this.axolotl.group.visible = id === 'axolotl';
    const color = SWORD_COLOR[swordTier(this.level)];
    for (const blade of [this.human.blade, this.mermaid.blade, this.orangutan.blade]) {
      (blade.material as THREE.MeshLambertMaterial).color.setHex(color);
    }
  }

  /** Call after the level changes so the sword shows its new tier. */
  refreshGear(): void {
    this.applyForm();
  }

  // ---- hearts ------------------------------------------------------------

  damage(amount: number, fromX: number, fromZ: number): void {
    if (this.dead || this.safeTimer > 0 || this.homed) return;
    this.hearts = Math.max(0, this.hearts - amount);
    this.letGo();
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
    this.homed = true;
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
    if (!this.homed) return;
    this.homed = false;
    this.home.visible = false;
    this.particles.sparkle(this.home.position, 0xffe98a, 10, 0.5);
    this.applyForm();
  }

  // ---- per-frame ---------------------------------------------------------

  update(dt: number, input: Controls, enemies: readonly Attackable[]): void {
    if (this.dead) return;
    this.safeTimer = Math.max(0, this.safeTimer - dt);
    this.eatTimer = Math.max(0, this.eatTimer - dt);
    this.noGrab = Math.max(0, this.noGrab - dt);
    this.deniedTimer = Math.max(0, this.deniedTimer - dt);

    if (input.hit('KeyF')) this.eat();

    if (this.form.id === 'axolotl' && this.hearts < this.form.maxHearts) {
      this.regrowTimer += dt;
      if (this.regrowTimer >= AXOLOTL_REGROW) {
        this.regrowTimer -= AXOLOTL_REGROW;
        this.hearts += 1;
      }
    }

    if (this.homed) {
      this.hiddenTime += dt;
      this.home.scale.setScalar(Math.min(1, this.home.scale.x + dt * 6));
      const wantsOut = input.hit('KeyQ') || input.hit('Space') || input.anyMoveHit();
      if (this.hiddenTime > 0.35 && wantsOut) this.leaveHome();
      this.recoverEnergy(dt);
      this.stepBreath(dt, 0);
      this.world.stepGates(dt, this.pos.x, this.pos.z, RADIUS, true);
      return;
    }

    const isFairy = this.form.canFly;
    if (isFairy && input.hit('KeyQ')) {
      if (this.onGround && !this.swimming) {
        this.enterHome();
        return;
      }
      sound.denied();
    }

    let moved = 0;
    if (this.climb) {
      this.climbStep(dt, input);
    } else {
      const fromX = this.pos.x;
      const fromZ = this.pos.z;
      this.stepWings(input);
      this.moveAround(dt, input);
      this.tryGrab(dt);
      if (!this.climb) this.moveUpDown(dt, input, isFairy);
      this.touchGround();
      moved = Math.hypot(this.pos.x - fromX, this.pos.z - fromZ);
      this.thinIce(dt, moved);
    }
    this.stepBreath(dt, moved);
    this.world.stepIce(dt, this.pos.x, this.pos.z, RADIUS);
    this.world.stepGates(dt, this.pos.x, this.pos.z, RADIUS, this.onGround);
    this.swingSword(dt, input, enemies);

    if (this.pos.y < -8) this.events.onFell();
    this.sync(dt);
  }

  private moveAround(dt: number, input: Controls): void {
    const m = input.move();
    // The camera sits to the south-west looking north-east, so "up" on screen
    // is +x -z and "right" on screen is +x +z.
    let dx = (m.x + m.y) * Math.SQRT1_2;
    let dz = (m.x - m.y) * Math.SQRT1_2;
    const len = Math.hypot(dx, dz);
    let speed = this.gliding ? GLIDE_SPEED : this.swimming ? this.form.swim : this.topSpeed;
    if (this.attackTimer > 0) speed *= 0.5;

    if (len > 0) {
      dx /= len;
      dz /= len;
      this.facing = turnToward(this.facing, Math.atan2(dx, dz), dt);
      this.walkPhase += dt * speed * 2.4;
      this.walked += speed * dt;
    } else {
      this.walkPhase = 0;
    }

    const stepX = (dx * speed + this.knock.x) * dt;
    const stepZ = (dz * speed + this.knock.z) * dt;
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 8));

    // Slide along walls by trying each axis on its own. An orangutan that is
    // steering into a wall makes a note of any tree trunk it is pressed against.
    const climber = this.form.id === 'orangutan';
    this.pushed = null;
    const { height, dive } = this.form;
    if (this.world.solidUnder(this.pos.x + stepX, this.pos.z, RADIUS, height, dive) <= this.pos.y + (this.form.step ?? STEP)) {
      this.pos.x += stepX;
    } else if (climber && dx !== 0) {
      this.pushed = this.trunkAt(this.pos.x + stepX, this.pos.z);
    }
    if (this.world.solidUnder(this.pos.x, this.pos.z + stepZ, RADIUS, height, dive) <= this.pos.y + (this.form.step ?? STEP)) {
      this.pos.z += stepZ;
    } else if (climber && dz !== 0) {
      this.pushed = this.pushed ?? this.trunkAt(this.pos.x, this.pos.z + stepZ);
    }
  }

  // ---- orangutan climbing ------------------------------------------------

  /** The climbable trunk, if any, that blocks a body standing at (x, z). */
  private trunkAt(x: number, z: number): { tile: number; cx: number; cz: number } | null {
    let best: { tile: number; cx: number; cz: number } | null = null;
    let bestDist = Infinity;
    for (const [ox, oz] of [[-RADIUS, -RADIUS], [RADIUS, -RADIUS], [-RADIUS, RADIUS], [RADIUS, RADIUS]]) {
      const i = Math.floor(x + ox);
      const j = Math.floor(z + oz);
      const cx = i + 0.5;
      const cz = j + 0.5;
      if (this.world.treeAt(cx, cz) <= 0) continue;
      if (this.world.solidAt(cx, cz, this.form.height, this.form.dive) <= this.pos.y + (this.form.step ?? STEP)) continue;
      if (this.pos.y < this.world.groundAt(cx, cz) - CLIMB_SLACK) continue;
      const d = Math.hypot(cx - x, cz - z);
      if (d < bestDist) {
        bestDist = d;
        best = { tile: j * this.world.width + i, cx, cz };
      }
    }
    return best;
  }

  /** Grab the trunk we are pressed against: at once in the air, after a push on the ground. */
  private tryGrab(dt: number): void {
    const t = this.pushed;
    if (!t || this.noGrab > 0) {
      this.pushTime = 0;
      this.pushTile = -1;
      return;
    }
    if (t.tile !== this.pushTile) {
      this.pushTile = t.tile;
      this.pushTime = 0;
    }
    this.pushTime += dt;
    if (this.onGround && this.pushTime < GRAB_DELAY) return;

    const isNew = t.tile !== this.lastTree;
    if (isNew && this.treesClimbed >= MAX_TREES) {
      if (this.deniedTimer <= 0) {
        sound.denied();
        this.deniedTimer = DENIED_GAP;
      }
      return;
    }
    if (isNew) {
      this.treesClimbed += 1;
      this.lastTree = t.tile;
    }
    this.totalClimbs += 1;
    this.climb = {
      tile: t.tile,
      cx: t.cx,
      cz: t.cz,
      top: this.world.solidAt(t.cx, t.cz, this.form.height, this.form.dive),
      over: -1,
      fromX: 0,
      fromZ: 0,
    };
    this.vy = 0;
    this.onGround = false;
    this.swimming = false;
    this.pushTime = 0;
    this.pushTile = -1;
  }

  private climbStep(dt: number, input: Controls): void {
    const c = this.climb!;
    const toTrunk = Math.atan2(c.cx - this.pos.x, c.cz - this.pos.z);
    this.facing = turnToward(this.facing, toTrunk, dt);

    if (c.over < 0) {
      // Steering away from the trunk lets go.
      const m = input.move();
      const sx = (m.x + m.y) * Math.SQRT1_2;
      const sz = (m.x - m.y) * Math.SQRT1_2;
      const len = Math.hypot(sx, sz);
      const tx = c.cx - this.pos.x;
      const tz = c.cz - this.pos.z;
      const tl = Math.hypot(tx, tz);
      const away = len > 0 && tl > 0 ? (sx * tx + sz * tz) / (len * tl) : 0;
      if (away < LET_GO_DOT) {
        this.letGo();
        return;
      }
      this.pos.y = Math.min(c.top, this.pos.y + CLIMB_SPEED * dt);
      this.climbPhase += dt;
      if (this.pos.y >= c.top) {
        c.over = 0;
        c.fromX = this.pos.x;
        c.fromZ = this.pos.z;
      }
      return;
    }

    // At the top: shuffle onto the middle of the tile and stand there.
    c.over = Math.min(1, c.over + dt / TOP_TIME);
    this.pos.x = c.fromX + (c.cx - c.fromX) * c.over;
    this.pos.z = c.fromZ + (c.cz - c.fromZ) * c.over;
    if (c.over >= 1) {
      this.climb = null;
      this.vy = 0;
      this.onGround = true;
      this.lastGroundY = c.top;
    }
  }

  /** Let go of a trunk and fall. Does nothing when not climbing. */
  private letGo(): void {
    if (!this.climb) return;
    this.climb = null;
    this.noGrab = 0.4;
    this.vy = 0;
    this.onGround = false;
  }

  /** Real ground (not a treetop) makes a tired orangutan fresh again. */
  private touchGround(): void {
    if (!(this.onGround || this.swimming)) return;
    if (this.world.treeAt(this.pos.x, this.pos.z) > 0) return;
    this.treesClimbed = 0;
    this.lastTree = -1;
  }

  /**
   * Thin ice and brittle sheets hold only under a fast runner. Called each frame after moving,
   * with how far we really moved. On the ground over whole ice: fast keeps it,
   * slow wears it down, and past the allowance every tile under us breaks.
   * Only a runner (a form whose current top speed is the sheet's speed or more) gets the
   * stumble allowance; everyone else breaks it the frame they touch it. The
   * slow time resets only when running fast or standing on real ground, never
   * in the air, so a landing every few frames cannot skip across.
   */
  private thinIce(dt: number, moved: number): void {
    if (!this.onGround || dt <= 0) return;
    const holding = this.world.iceHolding(this.pos.x, this.pos.z, RADIUS, this.pos.y);
    if (holding.length === 0) {
      this.iceSlow = 0;
      return;
    }
    // The most demanding sheet under us decides how fast we must be.
    const need = Math.max(...holding.map((s) => this.world.sheetSpeedAt(s.x, s.z)));
    if (moved / dt >= need) {
      this.iceSlow = 0;
      this.iceRun += moved;
      if (Math.random() < dt * FROST_RATE) {
        this.particles.burst(this.pos, 0xeaf8ff, 1, 0.9, 0.09, 1);
      }
      return;
    }
    this.iceSlow += dt;
    const allowance = this.topSpeed >= need ? ICE_STUMBLE : 0;
    if (this.iceSlow <= allowance) return;
    this.world.breakIce(holding);
    for (const s of holding) {
      this.particles.burst(new THREE.Vector3(s.x, this.pos.y, s.z), 0xd6f1ff, 7, 2.6, 0.13, 9);
    }
    sound.crack();
    // Off the ground at once, so a bunny cannot land and hop off a tile that just broke.
    this.onGround = false;
    // A hard drop, so a fast form cannot skim across the next tile before it falls a step.
    if (!this.form.canFly) this.vy = Math.min(this.vy, -BREAK_DROP);
    this.iceSlow = 0;
  }

  private moveUpDown(dt: number, input: Controls, isFairy: boolean): void {
    const wasOnGround = this.onGround;
    const impact = this.vy;
    const { height, dive } = this.form;
    const solid = this.world.solidUnder(this.pos.x, this.pos.z, RADIUS, height, dive);
    let ground = solid;
    // Water holds you up: you float with your head out.
    const inWater = this.world.isWater(this.pos.x, this.pos.z);
    const floatY = this.floatHeight();
    if (inWater) ground = Math.max(ground, floatY);

    // Down (Shift) works for a form that can dive. Under a kelp mat a body is
    // held below it, and below the float height everyone rises when not sinking.
    const down = dive > 0 && (input.held('ShiftLeft') || input.held('ShiftRight'));
    const ceiling = this.kelpCeiling();
    const diving =
      inWater && this.pos.y <= floatY + 0.05 && (down || this.pos.y < floatY - 0.05 || this.pos.y > ceiling);

    if (diving) {
      const floor = Math.max(solid, this.world.waterLevelAt(this.pos.x, this.pos.z) - dive);
      this.dive(dt, input, down, ground, floor, ceiling);
      if (this.pos.y >= ground) this.lastGroundY = ground;
    } else {
      this.fall(dt, input, isFairy, ground, wasOnGround, impact, inWater);
    }
    this.swimming = inWater && this.pos.y <= floatY + 0.05;
    if (this.swimming) this.gliding = false;
    if (this.onGround) this.recoverEnergy(dt);
  }

  /**
   * Move the feet through the water column toward where they want to be: the
   * floor while Shift is held, the float height otherwise, and never above the
   * underside of a kelp mat. No gravity here; the water carries you.
   */
  private dive(dt: number, input: Controls, down: boolean, float: number, floor: number, ceiling: number): void {
    const quick = this.form.id === 'mermaid';
    const target = Math.min(down ? floor : float, ceiling);
    let speed: number;
    if (target < this.pos.y) {
      speed = this.pos.y > ceiling ? KELP_PULL : quick ? MERMAID_VERTICAL : SINK;
      this.pos.y = Math.max(target, this.pos.y - speed * dt);
    } else {
      speed = quick ? MERMAID_VERTICAL : input.held('Space') ? RISE_FAST : RISE;
      this.pos.y = Math.min(target, this.pos.y + speed * dt);
    }
    this.vy = 0;
    this.onGround = this.pos.y >= float;
  }

  /** Flap, jump or fall, then land on `ground`. */
  private fall(
    dt: number,
    input: Controls,
    isFairy: boolean,
    ground: number,
    wasOnGround: boolean,
    impact: number,
    inWater: boolean,
  ): void {
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
    } else if (this.canJump(input, inWater)) {
      this.vy = this.form.jump;
      this.onGround = false;
      this.hopCounted = false;
      sound.jump();
    } else if (!this.onGround) {
      // Letting go of Space early cuts a bunny's hop short; holding it counts as a full hop.
      const cut = this.form.jumpCut;
      if (cut > 0 && this.vy > cut) {
        if (!input.held('Space')) {
          this.vy = cut;
        } else if (!this.hopCounted && this.vy < HOP_FULL_SPEED) {
          this.hopCounted = true;
          this.fullHops += 1;
        }
      }
      // Fairies flutter down slowly; everyone else just falls.
      this.vy -= GRAVITY * (isFairy ? 0.4 : 1) * dt;
      if (isFairy) this.vy = Math.max(this.vy, -3.4);
    }

    if (this.gliding) this.vy = Math.min(0, Math.max(this.vy, -GLIDE_SINK));
    this.pos.y += this.vy * dt;
    if (this.pos.y <= ground) {
      this.pos.y = ground;
      this.vy = 0;
      this.onGround = true;
      this.gliding = false;
      this.glided = false;
      this.lastGroundY = ground;
      if (!wasOnGround && impact < -3) this.landed(impact);
    } else if (this.pos.y > ground + 0.02) {
      this.onGround = false;
    }
  }

  /** Space on the ground jumps, except inside a tangle or a mat. A form with `jumpsFrom: 'water'` jumps only from the surface. */
  private canJump(input: Controls, inWater: boolean): boolean {
    if (!(this.form.jump > 0 && this.onGround && input.hit('Space')) || this.inTangle || this.inKelp) return false;
    return this.form.jumpsFrom === 'anywhere' || inWater;
  }

  private landed(impact: number): void {
    if (this.form.id !== 'bunny') return;
    this.landTimer = LAND_TIME;
    if (impact < -8) this.particles.burst(this.pos, 0xffffff, 8, 1.6, 0.1, 1);
  }

  /** The Cheetah's breath drains while it moves; any other time it refills. Being winded outlasts a shape shift. */
  private stepBreath(dt: number, moved: number): void {
    if (dt <= 0) return;
    if (this.form.id === 'cheetah' && moved / dt > RUN_MOVING) {
      this.breath = Math.max(0, this.breath - dt);
      if (this.breath <= 0) this.winded = true;
      return;
    }
    this.breath = Math.min(RUN_BREATH, this.breath + (RUN_BREATH / RUN_REST) * dt);
    if (this.breath >= RUN_BREATH) this.winded = false;
  }

  private recoverEnergy(dt: number): void {
    this.energy = Math.min(FLY_ENERGY, this.energy + (FLY_ENERGY / FLY_REST) * dt);
    if (this.energy >= FLY_ENERGY) this.exhausted = false;
  }

  private swingSword(dt: number, input: Controls, enemies: readonly Attackable[]): void {
    const wants = input.hit('KeyJ') || input.hit('Mouse0');
    this.biteWait -= dt;
    if (this.form.bite) {
      if (wants && this.attackTimer <= 0 && this.biteWait <= 0) this.bite(enemies);
      if (this.attackTimer > 0) this.attackTimer -= dt;
      return;
    }
    if (wants && this.attackTimer <= 0) {
      // The Mermaid's sword only works in water.
      if (this.form.sword === 'none' || (this.form.sword === 'underwater' && !this.swimming)) {
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

  /** A bite lands at once on whatever is within reach in front, and the next one has to wait. */
  private bite(enemies: readonly Attackable[]): void {
    const bite = this.form.bite!;
    this.attackTimer = ATTACK_TIME;
    this.biteWait = bite.cooldown;
    sound.swing();
    const fx = Math.sin(this.facing);
    const fz = Math.cos(this.facing);
    for (const e of enemies) {
      if (!e.alive || (bite.faint > 0 && !e.faint)) continue;
      const ex = e.pos.x - this.pos.x;
      const ez = e.pos.z - this.pos.z;
      const d = Math.hypot(ex, ez);
      if (d > bite.reach || Math.abs(e.pos.y - this.pos.y) > 1.3) continue;
      if (d > 0.4 && (ex * fx + ez * fz) / d < 0.25) continue;
      if (bite.damage > 0) e.takeHit(bite.damage, this.pos.x, this.pos.z);
      if (bite.faint > 0) e.faint?.(bite.faint);
    }
  }

  /** Move the models to match the state and play the little animations. */
  private sync(dt: number): void {
    this.group.position.copy(this.pos);
    this.group.rotation.y = this.facing;
    // Blink while briefly safe after being hurt.
    this.group.visible = this.safeTimer <= 0 || Math.floor(this.safeTimer * 14) % 2 === 0;

    const swing = Math.sin(this.walkPhase) * (this.onGround || this.swimming ? 0.8 : 0.3);
    switch (this.form.id) {
      case 'human':
        this.animateHuman(swing);
        break;
      case 'mermaid':
        this.animateMermaid(swing, dt);
        break;
      case 'orangutan':
        this.animateOrangutan(swing);
        break;
      case 'bunny':
        this.animateBunny(dt);
        break;
      case 'wolf':
      case 'cheetah':
        this.animateWolf();
        break;
      case 'ant':
        this.animateAnt(swing);
        break;
      case 'snake':
        this.animateSnake();
        break;
      case 'axolotl':
        this.animateAxolotl();
        break;
      default:
        this.animateFairy(dt);
    }
  }

  /** Raised-arm angle for a sword swing, starting overhead and sweeping down. */
  private swordArm(): number {
    const t = 1 - this.attackTimer / ATTACK_TIME;
    return -2.6 + t * 2.9;
  }

  private animateHuman(swing: number): void {
    const h = this.human;
    h.legL.rotation.x = swing;
    h.legR.rotation.x = -swing;
    h.armL.rotation.x = -swing * 0.8;
    h.armR.rotation.x = this.attackTimer > 0 ? this.swordArm() : swing * 0.8 - 0.25;
    if (!this.onGround && !this.swimming) {
      h.legL.rotation.x = 0.5;
      h.legR.rotation.x = -0.3;
    }
  }

  private animateMermaid(swing: number, dt: number): void {
    const m = this.mermaid;
    const now = performance.now() / 1000;
    // Under water she tips forward to swim nearly flat; on land she sits upright on her tail.
    const flat = this.submerged;
    const k = dt > 0 ? Math.min(1, dt * 8) : 1;
    m.swim.rotation.x += ((flat ? 1.35 : 0) - m.swim.rotation.x) * k;
    // The tail sways while she swims, one part a little behind the one before.
    const sway = this.swimming ? Math.sin(now * 7) * (flat ? 0.45 : 0.25) : this.onGround ? swing * 0.08 : 0;
    m.tail.rotation.x = sway;
    m.tailEnd.rotation.x = sway * 1.2;
    m.fin.rotation.x = sway * 1.5;
    m.armL.rotation.x = flat ? -2.9 : -swing * 0.8;
    m.armR.rotation.x = this.attackTimer > 0 ? this.swordArm() : flat ? -2.9 : swing * 0.8 - 0.25;
  }

  private animateOrangutan(swing: number): void {
    const o = this.orangutan;
    if (this.climb) {
      // Hand over hand: the arms reach overhead in turn and the legs push.
      const c = Math.sin(this.climbPhase * 9);
      o.upper.rotation.x = 0.1;
      o.armL.rotation.x = -2.7 + c * 0.45;
      o.armR.rotation.x = -2.7 - c * 0.45;
      o.legL.rotation.x = -c * 0.6;
      o.legR.rotation.x = c * 0.6;
      return;
    }
    o.upper.rotation.x = 0.25;
    o.legL.rotation.x = swing;
    o.legR.rotation.x = -swing;
    o.armL.rotation.x = APE_ARM_REST - swing * 0.7;
    o.armR.rotation.x = this.attackTimer > 0 ? this.swordArm() : APE_ARM_REST + swing * 0.7;
    if (!this.onGround && !this.swimming) {
      o.legL.rotation.x = 0.5;
      o.legR.rotation.x = -0.3;
    }
  }

  private animateBunny(dt: number): void {
    const b = this.bunny;
    const airborne = !this.onGround && !this.swimming;
    let stretch = 1;
    let bounce = 0;
    let earTarget = 0.08;
    let footKick = 0;
    if (airborne) {
      // Long and thin on the way up, ears and feet trailing behind.
      stretch = this.vy > 0.5 ? 1.2 : 1.06;
      earTarget = -1.1;
      footKick = 0.7;
    } else if (this.walkPhase > 0) {
      bounce = Math.abs(Math.sin(this.walkPhase)) * 0.1;
      earTarget = -0.35;
    }
    let squash = 0;
    if (this.landTimer > 0) {
      this.landTimer = Math.max(0, this.landTimer - dt);
      squash = this.landTimer / LAND_TIME;
    }
    const sy = stretch - squash * 0.3;
    const sx = 1 / Math.sqrt(stretch) + squash * 0.25;
    b.body.scale.set(sx, sy, sx);
    b.body.position.y = bounce;
    const k = dt > 0 ? Math.min(1, dt * 14) : 1;
    for (const ear of [b.earL, b.earR]) ear.rotation.x += (earTarget - ear.rotation.x) * k;
    b.footL.rotation.x = footKick;
    b.footR.rotation.x = footKick;
  }

  private animateAnt(swing: number): void {
    // Legs swing in two groups of three, like a real ant's walk.
    this.ant.legs.forEach((leg, n) => {
      leg.rotation.y = (n % 2 === 0 ? swing : -swing) * 0.5;
    });
  }

  private animateSnake(): void {
    // Each segment sways a little later than the one before it; a bite lunges the head.
    const sway = this.walkPhase > 0 ? 0.35 : 0.05;
    this.snake.segments.forEach((seg, n) => {
      seg.position.x = Math.sin(this.walkPhase * 1.5 - n * 0.9) * sway * 0.3;
      seg.rotation.y = Math.cos(this.walkPhase * 1.5 - n * 0.9) * sway;
    });
    this.snake.segments[0].position.z = 0.35 + (this.attackTimer > 0 ? 0.2 : 0);
  }

  private animateAxolotl(): void {
    // A slow tail and body sway while moving; the gills always wave gently, faster in the water.
    const a = this.axolotl;
    const now = performance.now() / 1000;
    const moving = this.walkPhase > 0;
    a.tail.rotation.y = Math.sin(this.walkPhase * 0.8) * (moving ? 0.35 : 0) + Math.sin(now * 1.2) * 0.06;
    a.body.rotation.y = Math.sin(this.walkPhase * 0.8 + 0.8) * (moving ? 0.06 : 0);
    a.legs.forEach((leg, n) => {
      leg.rotation.x = moving ? Math.sin(this.walkPhase + (n % 3 ? Math.PI : 0)) * 0.5 : 0;
    });
    const rate = this.swimming ? 7 : 2.5;
    a.gills.forEach((g, n) => {
      const side = n < 3 ? -1 : 1;
      g.rotation.x = -0.5 + Math.sin(now * rate + n * 0.9) * 0.18;
      g.rotation.z = -side * (0.5 + (n % 3) * 0.35) + Math.sin(now * rate * 0.8 + n) * 0.08 * side;
    });
  }

  private animateWolf(): void {
    const w = this.form.id === 'cheetah' ? this.cheetah : this.wolf;
    const airborne = !this.onGround && !this.swimming;
    const now = performance.now() / 1000;
    let front = 0;
    let back = 0;
    let bob = 0;
    let wag = Math.sin(now * 2.5) * 0.15;
    let tailUp = -0.6;
    if (airborne) {
      // Legs tucked in, tail streaming out behind.
      front = -0.8;
      back = 0.8;
      tailUp = -0.15;
    } else if (this.walkPhase > 0) {
      // A gallop: the front pair and the back pair swing out of phase.
      front = Math.sin(this.walkPhase) * 0.9;
      back = -front;
      bob = Math.abs(Math.sin(this.walkPhase)) * 0.07;
      wag = Math.sin(this.walkPhase * 0.5) * 0.25;
      tailUp = -0.3;
    }
    w.legFL.rotation.x = front;
    w.legFR.rotation.x = front;
    w.legBL.rotation.x = back;
    w.legBR.rotation.x = back;
    w.body.position.y = bob;
    w.tail.rotation.y = wag;
    w.tail.rotation.x = tailUp;
  }

  private animateFairy(dt: number): void {
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
