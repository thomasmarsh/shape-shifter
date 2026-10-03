import { FORMS, FormId, PHYSICS } from './forms';
import type { Controls } from './input';
import { Particles } from './particles';
import { Player } from './player';
import type { Spot, World } from './world';

// A scripted driver for route tests: a real Player in a real World, steered by
// a fake keyboard. It is only used by tests. Every move returns whether it
// worked, and gives up after a time limit, so a route that cannot be done
// fails instead of hanging. It keeps no secrets from the physics: it can only
// steer, tap Space and hold Space, like a person.

const DT = 1 / 60;
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
    if (world.solidAt(start.x, start.z) !== world.groundAt(start.x, start.z)) {
      throw new Error(`cannot start at (${start.x}, ${start.z}): something solid stands there`);
    }
    this.player.level = 3;
    this.shift(form);
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
      each();
      this.frame();
    }
    return !this.fell && done();
  }

  private stopSteering(): void {
    this.pad.dir = { x: 0, z: 0 };
    this.pad.down.delete('Space');
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

  /** Change shape, which needs the level to be high enough (the pilot is level 3). */
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
    for (let t = 0; t <= 4; t += 0.02) {
      const qx = this.x + ux * t;
      const qz = this.z + uz * t;
      // A wall: the body (a circle) would be stopped by a taller block ahead.
      if (this.world.solidUnder(qx + ux * stride, qz + uz * stride, RADIUS) > y + PHYSICS.step) return t;
      // The ground ends under the centre of the body.
      if (this.world.solidAt(qx, qz) < y - PHYSICS.step) return t;
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
}
