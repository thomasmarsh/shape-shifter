import * as THREE from 'three';
import {
  makeBread,
  makeCandle,
  makeCheckpoint,
  makePickle,
  makeSpeaker,
  CandleModel,
  CheckpointModel,
  SpeakerModel,
} from './models';
import type { PuzzleSpot, World } from './world';

// The things on an island you walk up to: puzzle speakers, the candles they
// guard, checkpoints and loaves of bread.

/** How close you must be to use a speaker or a candle, in tiles. */
export const REACH = 2.1;
/** And how far above or below the thing's ground your feet may be. */
export const REACH_HEIGHT = 1.5;

export class Puzzle {
  readonly melody: number[];
  /** How bright the flame is right now, around 1. Game feeds it to the light pool. */
  flicker = 1;
  solved = false;
  taken = false;
  readonly speakerPos: THREE.Vector3;
  readonly candlePos: THREE.Vector3;
  /** True when the candle stands in water: then it is a sea pickle. */
  readonly pickle: boolean;
  private speaker: SpeakerModel;
  private candle: CandleModel;
  /** Seconds until the speaker next plays its tune out loud. */
  tuneTimer = 2;

  constructor(
    readonly spot: PuzzleSpot,
    world: World,
    parent: THREE.Object3D,
  ) {
    this.melody = spot.melody;
    this.speaker = makeSpeaker();
    this.pickle = world.isWater(spot.candle.x, spot.candle.z);
    this.candle = this.pickle ? makePickle() : makeCandle();
    this.speakerPos = new THREE.Vector3(spot.speaker.x, world.groundAt(spot.speaker.x, spot.speaker.z), spot.speaker.z);
    this.candlePos = new THREE.Vector3(spot.candle.x, world.groundAt(spot.candle.x, spot.candle.z), spot.candle.z);
    this.speaker.group.position.copy(this.speakerPos);
    this.candle.group.position.copy(this.candlePos);
    parent.add(this.speaker.group, this.candle.group);
  }

  /** Where the candle's flame is, for the light flying to the player. */
  get flamePos(): THREE.Vector3 {
    return new THREE.Vector3(this.candlePos.x, this.candlePos.y + this.candle.flame.position.y, this.candlePos.z);
  }

  refresh(): void {
    this.candle.cage.visible = !this.solved;
    this.candle.flame.visible = !this.taken;
  }

  update(time: number): void {
    const c = this.candle;
    if (!this.taken) {
      const flicker = 1 + Math.sin(time * 13 + this.candlePos.x) * 0.08 + Math.sin(time * 7.3) * 0.06;
      this.flicker = flicker;
      c.flame.scale.set(flicker, 1.7 * flicker, flicker);
    }
    if (!this.solved) {
      (c.cage.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(time * 3) * 0.08;
      c.cage.rotation.y = time * 0.6;
      // The speaker thumps gently so it reads as "playing".
      const thump = 1 + Math.max(0, Math.sin(time * 6)) * 0.12;
      this.speaker.cone.scale.set(0.5 * thump, 0.5 * thump, 0.06);
    } else {
      this.speaker.cone.scale.set(0.5, 0.5, 0.06);
    }
  }
}

export class Checkpoint {
  readonly pos: THREE.Vector3;
  active = false;
  private model: CheckpointModel;

  constructor(
    readonly id: string,
    x: number,
    z: number,
    world: World,
    parent: THREE.Object3D,
  ) {
    this.model = makeCheckpoint();
    this.pos = new THREE.Vector3(x, world.groundAt(x, z), z);
    this.model.group.position.copy(this.pos);
    parent.add(this.model.group);
  }

  /** A free tile next to the pedestal to respawn on. */
  get standSpot(): { x: number; z: number } {
    return { x: this.pos.x - 1, z: this.pos.z + 1 };
  }

  setActive(active: boolean): void {
    this.active = active;
    const m = this.model.crystal.material as THREE.MeshLambertMaterial;
    m.color.setHex(active ? 0x8ff1ff : 0x9aa3b5);
    m.emissive.setHex(active ? 0x35c6e6 : 0x000000);
  }

  update(time: number): void {
    this.model.crystal.rotation.y = time * (this.active ? 1.6 : 0.4);
    this.model.crystal.position.y = 1.5 + Math.sin(time * 2 + this.pos.x) * 0.06;
  }
}

export class BreadPickup {
  readonly pos: THREE.Vector3;
  taken = false;
  readonly group: THREE.Group;

  constructor(
    readonly id: string,
    x: number,
    z: number,
    readonly amount: number,
    world: World,
    parent: THREE.Object3D,
  ) {
    this.group = makeBread();
    this.pos = new THREE.Vector3(x, world.groundAt(x, z), z);
    this.group.position.copy(this.pos);
    parent.add(this.group);
  }

  update(time: number): void {
    this.group.visible = !this.taken;
    this.group.position.y = this.pos.y + 0.25 + Math.sin(time * 2.5 + this.pos.z) * 0.08;
    this.group.rotation.y = time * 1.2;
  }
}
