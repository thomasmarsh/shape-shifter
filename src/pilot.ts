import { FORMS, FormId, PHYSICS, RUN_BREATH } from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
import { Player } from './player';
import { REACH, REACH_HEIGHT } from './things';
import type { Spot, World } from './world';

// A scripted driver for route tests: a real Player in a real World, steered by
// a fake keyboard. It is only used by tests. Every move returns whether it
// worked, and gives up after a time limit, so a route that cannot be done
// fails instead of hanging. It keeps no secrets from the physics: it can only
// steer, tap Space, hold Space and hold Shift, like a person.

const DT = 1 / 60;
/** How far a fairy glides along per unit of height she still has to lose. */
const GLIDE = 0.85;
/** Player radius, as in player.ts. */
const RADIUS = 0.3;

/** A fake keyboard. `dir` is a walking direction in world terms (x east, z south). */
class Pad implements Controls {
  down = new Set<string>();
  tapped = new Set<string>();
  dir = { x: 0, z: 0 };

  held(code: string): boolean {
    return this.down.has(code) || this.tapped.has(code);
  }
  hit(code: string): boolean {
    return this.tapped.has(code);
  }
  move(): { x: number; y: number } {
    // The inverse of the camera mapping in Player.moveAround.
    return { x: (this.dir.x + this.dir.z) * Math.SQRT1_2, y: (this.dir.x - this.dir.z) * Math.SQRT1_2 };
  }
  anyMoveHit(): boolean {
    return false;
  }
}

export interface MoveOptions {
  /** Seconds before the move gives up. */
  seconds?: number;
}

export interface HopOptions extends MoveOptions {
  /**
   * Jump when the edge of the ground (or a wall) in the direction of travel is
   * this close, in tiles. Anything up to 0.5 is "the last half tile".
   */
  edge?: number;
}

export interface FlyOptions extends MoveOptions {
  /** Let go of Space when this close to the target (tiles), plus one per unit still above it. */
  release?: number;
}

export class Pilot {
  readonly player: Player;
  private readonly pad = new Pad();
  /** Set when the player falls out of the world; every move then stops at once. */
  fell = false;
  /** Seconds of game time since the pilot was made. */
  time = 0;
  /** The highest the feet have been, and the least flying energy left, for margins. */
  peak = -Infinity;
  lowestEnergy = Infinity;
  /** The slowest ground speed (tiles per second) seen on thin ice during `sprint`, for ice tests. */
  minIceSpeed = Infinity;
  /** Why the last move gave up, when the pilot knows (a Cheetah gone winded); otherwise null. */
  reason: string | null = null;
  /** `breathe` is under way: a winded Cheetah is then no reason to stop. */
  private breathing = false;
  /** A hop is under way, so Space stays down until we land. */
  private jumping = false;

  constructor(
    readonly world: World,
    form: FormId,
    start: Spot,
  ) {
    this.player = new Player(world, new Particles(), {
      onFell: () => {
        this.fell = true;
      },
      onDied: () => {},
      onAte: () => {},
      onHome: () => {},
    });
    // Tests share one World, so a pilot starts with all the thin ice whole.
    world.resetIce();
    world.resetGates();
    this.player.level = 8;
    this.shift(form);
    if (world.solidAt(start.x, start.z, this.player.form.height, this.player.form.dive) !== world.groundAt(start.x, start.z)) {
      throw new Error(`cannot start at (${start.x}, ${start.z}): something solid stands there`);
    }
    this.player.hearts = this.player.form.maxHearts;
    this.player.place(start.x, start.z);
  }

  // ---- state -------------------------------------------------------------

  get x(): number {
    return this.player.pos.x;
  }
  get y(): number {
    return this.player.pos.y;
  }
  get z(): number {
    return this.player.pos.z;
  }
  get tile(): { i: number; j: number } {
    return { i: Math.floor(this.x), j: Math.floor(this.z) };
  }
  get onGround(): boolean {
    return this.player.onGround;
  }

  /** Standing on the tile containing `spot`, with ground under the middle of the body. */
  standingOn(spot: Spot): boolean {
    return this.player.onGround && Number.isFinite(this.world.groundAt(this.x, this.z)) && Math.floor(this.x) === Math.floor(spot.x) && Math.floor(this.z) === Math.floor(spot.z);
  }

  /** Where the pilot is, for messages. */
  describe(): string {
    return `(${this.x.toFixed(2)}, ${this.z.toFixed(2)}) at height ${this.y.toFixed(2)}`;
  }

  // ---- time --------------------------------------------------------------

  private frame(): void {
    this.player.update(DT, this.pad, []);
    this.pad.tapped.clear();
    this.time += DT;
    this.peak = Math.max(this.peak, this.y);
    this.lowestEnergy = Math.min(this.lowestEnergy, this.player.energy);
  }

  /** Step until `done`, at most `seconds`. Returns whether `done` came true. */
  private run(done: () => boolean, seconds: number, each: () => void = () => {}): boolean {
    const frames = Math.round(seconds / DT);
    for (let n = 0; n < frames && !this.fell; n++) {
      if (done()) return true;
      // A Cheetah out of breath is slowed and breaks every sheet: the move has failed.
      if (!this.breathing && this.player.form.id === 'cheetah' && this.player.winded) {
        this.reason = `the Cheetah went winded at ${this.describe()}`;
        return false;
      }
      each();
      this.frame();
    }
    return !this.fell && done();
  }

  private stopSteering(): void {
    this.pad.dir = { x: 0, z: 0 };
    this.pad.down.delete('Space');
    this.pad.down.delete('ShiftLeft');
    this.jumping = false;
  }

  private steerTo(target: Spot, deadzone = 0.08): number {
    const dx = target.x - this.x;
    const dz = target.z - this.z;
    const d = Math.hypot(dx, dz);
    this.pad.dir = d < deadzone ? { x: 0, z: 0 } : { x: dx / d, z: dz / d };
    return d;
  }

  // ---- moves -------------------------------------------------------------

  /** Change shape, which needs the level to be high enough (the pilot is level 8). */
  shift(form: FormId): void {
    const index = FORMS.findIndex((f) => f.id === form);
    if (index !== this.player.formIndex) {
      if (!this.player.shiftTo(index)) throw new Error(`cannot shift to ${form}`);
      this.player.hearts = this.player.form.maxHearts;
    }
  }

  /** Stand still for a moment. */
  wait(seconds: number): void {
    this.stopSteering();
    this.run(() => false, seconds);
  }

  /**
   * Stand still, in any form, until the Cheetah's breath is full again (and it
   * is no longer winded). Fails if that takes longer than `seconds`.
   */
  breathe(seconds = RUN_BREATH): boolean {
    this.stopSteering();
    this.breathing = true;
    const ok = this.run(() => this.player.breath >= RUN_BREATH - 1e-6 && !this.player.winded, seconds);
    this.breathing = false;
    return ok;
  }

  /** Walk on the ground to a point. Fails if something blocks the way. */
  walk(target: Spot, { seconds = 15 }: MoveOptions = {}): boolean {
    const ok = this.run(
      () => Math.hypot(target.x - this.x, target.z - this.z) < 0.12 && this.onGround,
      seconds,
      () => this.steerTo(target),
    );
    this.stopSteering();
    return ok;
  }

  /**
   * How far ahead, along the direction of travel, the ground ends or a wall
   * begins: the distance at which a jump should happen. Measured from the
   * centre of the body; a wall counts from where the body is stopped by it.
   */
  private edgeAhead(): number {
    const { x: dx, z: dz } = this.pad.dir;
    const len = Math.hypot(dx, dz);
    if (len === 0) return Infinity;
    const ux = dx / len;
    const uz = dz / len;
    const y = this.y;
    // A wall is felt one frame early: the body stops a step short of it.
    const stride = this.player.form.speed * DT;
    const step = this.player.form.step ?? PHYSICS.step;
    for (let t = 0; t <= 4; t += 0.02) {
      const qx = this.x + ux * t;
      const qz = this.z + uz * t;
      // A wall: the body (a circle) would be stopped by a taller block ahead.
      const { height, dive } = this.player.form;
      if (this.world.solidUnder(qx + ux * stride, qz + uz * stride, RADIUS, height, dive) > y + step) return t;
      // The ground ends under the centre of the body.
      if (this.world.solidAt(qx, qz, height, dive) < y - step) return t;
    }
    return Infinity;
  }

  /**
   * Walk toward `target` and jump when the edge ahead is within `edge` tiles.
   * Keeps steering in the air. Works for human, orangutan and bunny. Done when
   * `done` is true (by default: standing on the tile of the target).
   */
  hop(target: Spot, opts: HopOptions & { done?: () => boolean } = {}): boolean {
    const { edge = 0.25, seconds = 12 } = opts;
    const done = opts.done ?? ((): boolean => this.standingOn(target));
    // One jump per tile: a take-off that misses is not quietly retried from the
    // same spot, so the take-off point decides whether the hop works.
    const launched = new Set<number>();
    const ok = this.run(done, seconds, () => {
      this.steerTo(target);
      if (this.onGround) {
        this.pad.down.delete('Space');
        this.jumping = false;
        const tile = this.tile.j * this.world.width + this.tile.i;
        if (!launched.has(tile) && this.edgeAhead() <= edge) {
          launched.add(tile);
          this.pad.tapped.add('Space');
          this.jumping = true;
        }
      }
      // Keep Space down through the whole hop: a bunny's hop is cut short otherwise.
      if (this.jumping && !this.onGround) this.pad.down.add('Space');
    });
    this.stopSteering();
    return ok;
  }

  /** Fly (hold Space) toward `target`, letting go near it to settle onto it. */
  fly(target: Spot, { seconds = 8, release = 0.5 }: FlyOptions = {}): boolean {
    const flying = (): void => {
      const d = this.steerTo(target);
      const above = Math.max(0, this.y - this.world.groundAt(target.x, target.z));
      if (d < release + above) this.pad.down.delete('Space');
      else this.pad.down.add('Space');
    };
    const ok = this.run(() => this.standingOn(target), seconds, flying);
    this.stopSteering();
    return ok;
  }

  /**
   * Hop-then-fly: as a bunny, take a full hop toward `target` (jumping at the
   * edge, as `hop` does), shift to a fairy at the top and keep flying on, then
   * settle onto the target tile. Fails if she lands anywhere else or runs out
   * of time. Works for a target on the ground level or on a ledge.
   */
  hopThenFly(target: Spot, opts: HopOptions & FlyOptions = {}): boolean {
    const { edge = 0.25, seconds = 20, release = 0.5 } = opts;
    this.shift('bunny');
    // Up to the top of the hop: the first frame the feet stop rising.
    let last = this.y;
    let airborne = false;
    const atApex = (): boolean => {
      airborne = airborne || !this.onGround;
      const falling = airborne && this.y < last - 1e-9;
      last = this.y;
      return falling;
    };
    const start = this.time;
    if (!this.hop(target, { edge, seconds, done: atApex })) return false;
    // Now a fairy, still holding Space: she hovers at this height until her
    // energy runs out. Let go early enough to glide down onto the target.
    this.shift('fairy');
    const flying = (): void => {
      const d = this.steerTo(target);
      const above = Math.max(0, this.y - this.world.groundAt(target.x, target.z));
      if (d < release + GLIDE * above) this.pad.down.delete('Space');
      else this.pad.down.add('Space');
    };
    const ok = this.run(() => this.standingOn(target), seconds - (this.time - start), flying);
    this.stopSteering();
    return ok;
  }

  // ---- water -------------------------------------------------------------

  /**
   * Swim toward `target` holding Shift until the feet are at the diver's floor
   * (the bed, or as deep as the form can go) on the target's tile or next to
   * it. Fails at once if not in water or the form cannot dive.
   */
  dive(target: Spot, { seconds = 15 }: MoveOptions = {}): boolean {
    const { height, dive } = this.player.form;
    if (dive <= 0 || !this.world.isWater(this.x, this.z)) return false;
    const atFloor = (): boolean => {
      const floor = Math.max(
        this.world.solidUnder(this.x, this.z, RADIUS, height, dive),
        this.world.waterLevelAt(this.x, this.z) - dive,
      );
      return (
        this.y <= floor + 1e-6 &&
        Math.abs(this.tile.i - Math.floor(target.x)) <= 1 &&
        Math.abs(this.tile.j - Math.floor(target.z)) <= 1
      );
    };
    const ok = this.run(atFloor, seconds, () => {
      this.steerTo(target);
      this.pad.down.add('ShiftLeft');
    });
    this.stopSteering();
    return ok;
  }

  /**
   * Steer to `target` through the water, with Shift held the whole way if
   * `under`. Done when the body is within 0.3 of it, on the ground or not.
   */
  swim(target: Spot, opts: MoveOptions & { under?: boolean } = {}): boolean {
    const { seconds = 15, under = false } = opts;
    const ok = this.run(
      () => Math.hypot(target.x - this.x, target.z - this.z) < 0.3,
      seconds,
      () => {
        this.steerTo(target);
        if (under) this.pad.down.add('ShiftLeft');
        else this.pad.down.delete('ShiftLeft');
      },
    );
    this.stopSteering();
    return ok;
  }

  /** Let go of Shift and hold Space until floating at the surface. */
  surface({ seconds = 10 }: MoveOptions = {}): boolean {
    this.pad.down.delete('ShiftLeft');
    this.pad.down.add('Space');
    const ok = this.run(() => this.player.swimming && !this.player.submerged && this.onGround, seconds);
    this.stopSteering();
    return ok;
  }

  /** Can a speaker or candle at `spot` be used from here? The game's own rule. */
  canUse(spot: Spot): boolean {
    return (
      Math.hypot(spot.x - this.x, spot.z - this.z) < REACH &&
      Math.abs(this.world.groundAt(spot.x, spot.z) - this.y) < REACH_HEIGHT
    );
  }

  /** Stay on the ground until the fairy's flying energy is full. */
  rest(seconds = 6): boolean {
    this.stopSteering();
    return this.run(() => this.player.energyFraction >= 1 && !this.player.exhausted, seconds);
  }

  /** Walk into a tree trunk until the orangutan has grabbed it, then ride it to the top. */
  climb(trunk: Spot, { seconds = 10 }: MoveOptions = {}): boolean {
    const centre = { x: Math.floor(trunk.x) + 0.5, z: Math.floor(trunk.z) + 0.5 };
    const grabbed = this.run(() => this.player.climbing, seconds, () => this.steerTo(centre, 0));
    this.pad.dir = { x: 0, z: 0 };
    if (!grabbed) return false;
    const ok = this.run(() => !this.player.climbing && this.onGround, seconds);
    this.stopSteering();
    return ok && this.standingOn(centre);
  }

  /**
   * Jump from where we stand to a tree trunk. Either the orangutan grabs the
   * trunk in the air and climbs it, or it arrives high enough to land on top.
   */
  leapTo(trunk: Spot, opts: HopOptions = {}): boolean {
    const centre = { x: Math.floor(trunk.x) + 0.5, z: Math.floor(trunk.z) + 0.5 };
    if (!this.hop(centre, { ...opts, done: () => this.player.climbing || this.standingOn(centre) })) return false;
    this.pad.dir = { x: 0, z: 0 };
    const ok = this.run(() => !this.player.climbing && this.onGround, opts.seconds ?? 10);
    this.stopSteering();
    return ok && this.standingOn(centre);
  }

  // ---- running (the Winter Wolf and thin ice) ----------------------------

  /**
   * Run toward `target` without ever stopping to wait: for the Wolf on thin
   * ice, which breaks under anything slower than a run. Optionally jumps when
   * the edge ahead is within `edge` tiles (once per tile, like `hop`; no jumps
   * without `edge`). Done when `done` is true (by default: standing on the
   * target's tile). Records the slowest speed seen on thin ice in `minIceSpeed`.
   * Leaves the keys as they are, so a following move carries on at speed.
   */
  sprint(target: Spot, opts: MoveOptions & { edge?: number; done?: () => boolean } = {}): boolean {
    const { edge, seconds = 15 } = opts;
    const done = opts.done ?? ((): boolean => this.standingOn(target));
    const launched = new Set<number>();
    let lastX = this.x;
    let lastZ = this.z;
    let wasOnIce = false;
    const ok = this.run(done, seconds, () => {
      // What the last frame did: its speed counts if it ended on thin ice.
      const speed = Math.hypot(this.x - lastX, this.z - lastZ) / DT;
      if (wasOnIce) this.minIceSpeed = Math.min(this.minIceSpeed, speed);
      lastX = this.x;
      lastZ = this.z;
      wasOnIce = this.onGround && this.world.isThinIce(this.x, this.z);
      this.steerTo(target);
      if (edge === undefined) return;
      if (this.onGround) {
        this.pad.down.delete('Space');
        this.jumping = false;
        const tile = this.tile.j * this.world.width + this.tile.i;
        if (!launched.has(tile) && this.edgeAhead() <= edge) {
          launched.add(tile);
          this.pad.tapped.add('Space');
          this.jumping = true;
        }
      }
      if (this.jumping && !this.onGround) this.pad.down.add('Space');
    });
    this.stopSteering();
    return ok;
  }

  /**
   * Press a timed gate's plate and run through the gate: walk onto the plate
   * tile (in whatever form we are), shift to `form` (the Cheetah by default) and
   * sprint to `through` without stopping. The plate is pressed while we stand on
   * it and the gate's clock starts the moment we leave it. Fails if the walk to
   * the plate fails, or the sprint does (a gate that closes first is a wall).
   */
  runGate(plate: Spot, through: Spot, opts: MoveOptions & { form?: FormId } = {}): boolean {
    const { form = 'cheetah', seconds = 8 } = opts;
    const centre = { x: Math.floor(plate.x) + 0.5, z: Math.floor(plate.z) + 0.5 };
    if (!this.walk(centre)) return false;
    if (!this.world.plateAtPoint(this.x, this.z)) throw new Error(`no plate under (${centre.x}, ${centre.z})`);
    this.shift(form);
    return this.sprint(through, { seconds });
  }

  /**
   * Run, then fly: as a wolf, sprint toward `along` until `shiftWhen` is true,
   * shift to a fairy in the very same frame (no stopping) and fly to `target`.
   * Fails if the run fails, or she does not land on the target's tile.
   */
  runThenFly(along: Spot, shiftWhen: () => boolean, target: Spot, opts: FlyOptions = {}): boolean {
    const { seconds = 10, release = 0.5 } = opts;
    if (!this.sprint(along, { done: shiftWhen, seconds })) return false;
    this.shift('fairy');
    return this.fly(target, { seconds, release });
  }

  /**
   * Toward `target`, hopping at every chance: Space is tapped the moment the
   * feet touch anything (ground, water or ice) and held through the whole hop.
   * The cheat a person might try, for tests that say "nothing gets across by
   * hopping". Done when `done` is true (by default: standing on the target's tile).
   */
  bounce(target: Spot, opts: MoveOptions & { done?: () => boolean } = {}): boolean {
    const { seconds = 20 } = opts;
    const done = opts.done ?? ((): boolean => this.standingOn(target));
    const ok = this.run(done, seconds, () => {
      this.steerTo(target);
      if (this.onGround) this.pad.tapped.add('Space');
      else this.pad.down.add('Space');
    });
    this.stopSteering();
    return ok;
  }
}
