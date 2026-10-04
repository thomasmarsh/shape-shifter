// Every form from PLAN.md, as data. The number key that selects a form is its
// index in this list, and it unlocks when the player reaches `level`.
//
// Human, Fairy, Orangutan, Bunny, Winter Wolf, Ant, Mermaid, Cheetah and Snake are playable; the
// rest are listed so the form bar can show them as locked and so later islands
// can fill them in without changing the shape of this table.

/**
 * The physics every mover shares. player.ts runs on these, and the level
 * checker should read them instead of keeping its own copy.
 */
export const PHYSICS = {
  gravity: 24,
  /** How high you can walk up onto ground without jumping. */
  step: 0.35,
  /** How far above the last ground she stood on a fairy can climb. */
  flyCeiling: 3,
  /** Gap of a hole: a tangle the Snake and the Ant fit through (a plain tangle is TANGLE_GAP). */
  holeGap: 0.35,
};

// Thin ice holds only under something moving fast. The Winter Wolf (7.0) is
// the only form quicker than ICE_SPEED; the Bunny (5.0) is not.

/** Real ground speed, in tiles per second, that thin ice needs to hold. */
export const ICE_SPEED = 6;
/** Seconds a fast form may be slow on thin ice (a stumble, a turn) before it breaks. */
export const ICE_STUMBLE = 0.15;
/** Seconds after breaking before a thin-ice tile grows back. */
export const ICE_REGROW = 4;
/** Real ground speed that a brittle sheet needs to hold: only a fresh Cheetah (10) has it. */
export const BRITTLE_SPEED = 9;

// The Mermaid's water powers, which only work while she is swimming.
/** Hearts a water shot takes off the first bad guy it touches. */
export const WATER_SHOT_DAMAGE = 3;
/** How far away a bad guy can be for the shot to aim at it, in tiles. */
export const WATER_SHOT_AIM = 9;
/** Tiles a second. */
export const WATER_SHOT_SPEED = 12;
/** Tiles a shot flies before it falls into the water. */
export const WATER_SHOT_RANGE = 9;
/** Seconds between shots. */
export const WATER_SHOT_COOLDOWN = 1.0;
/** How close a shot must pass to a bad guy's middle to hit, in tiles. */
export const WATER_SHOT_RADIUS = 0.6;
/** Hearts a bubble column takes off every bad guy it catches. */
export const BUBBLE_DAMAGE = 4;
/** How far away a bad guy can be for the column to come up under it, in tiles. */
export const BUBBLE_AIM = 7;
/** Where the column comes up when there is no bad guy, tiles ahead of her. */
export const BUBBLE_AHEAD = 3;
/** Radius of the burst, in tiles. */
export const BUBBLE_RADIUS = 1.3;
/** Seconds of warning bubbles before the burst. */
export const BUBBLE_DELAY = 0.6;
/** Seconds between columns. */
export const BUBBLE_COOLDOWN = 3.0;

// The Cheetah's breath: it drains while running, and only time refills it.
/** Seconds of running a full breath lasts. */
export const RUN_BREATH = 8;
/** Seconds of rest (or any other form) to get from empty to full. */
export const RUN_REST = 3.5;
/** The Cheetah's top speed while winded, until breath is completely full again. */
export const WINDED_SPEED = 3.0;

/**
 * How far below the water surface a kelp mat hangs, for a mat the Human fits
 * under. A body of height h that can dive d fits when d - h >= depth.
 */
export const KELP_LOW = 2;
/** The depth of a mat only the Mermaid fits under. */
export const KELP_DEEP = 5;

/** The room between a hollow's roof and its bed: the gap of a Snake hole, under water. */
export const HOLLOW_ROOM = 0.35;

/** Seconds for the Axolotl to regrow one heart. */
export const AXOLOTL_REGROW = 3;

// ---- The wings (level 10) ----------------------------------------------------
// The wings are not a form. Only the Human has them, from WINGS_LEVEL on, and
// they only glide:
// - They open on a press of Space in the air (not the press that jumped), once
//   the Human is no longer rising, and stay open while Space is held.
// - The Human must have left the ground as a Human: after a shift in the air
//   there are no wings until the next landing. They do not open in water.
// - Open wings fall at GLIDE_SINK at most and never rise, and move at
//   GLIDE_SPEED where the player steers (nowhere, with no direction held).
// - Once the wings have opened there is no shifting until the Human lands.
// So a glide always starts from a place the Human can stand, at most a Human
// jump above it, and carries GLIDE_SPEED / GLIDE_SINK tiles for each unit of
// height it gives up. The level checker models exactly that.
/** The level that gives the Human its wings. */
export const WINGS_LEVEL = 10;
/** Tiles a second over the ground while the wings are open. */
export const GLIDE_SPEED = 9;
/** Height lost a second while the wings are open. */
export const GLIDE_SINK = 1.5;

/**
 * Does a body of height `body` that can dive `dive` fit under a kelp mat that
 * hangs `depth` below the surface? Its whole body must get below the mat, and
 * fit in the `room` of water between the mat and the bed.
 */
export function fitsUnderKelp(body: number, dive: number, depth: number, room = Infinity): boolean {
  return dive - body >= depth && body <= room;
}

export type FormId =
  | 'human'
  | 'fairy'
  | 'orangutan'
  | 'bunny'
  | 'wolf'
  | 'ant'
  | 'mermaid'
  | 'cheetah'
  | 'snake'
  | 'axolotl';

export type SwordUse = 'full' | 'weak' | 'underwater' | 'none';

/** A bite: takes `damage` hearts, and/or makes a bad guy faint for `faint` seconds whatever its hearts (0 = no faint). */
export interface BiteDef {
  /** Tiles. */
  reach: number;
  /** Seconds between bites. */
  cooldown: number;
  /** Seconds a bitten bad guy lies fainted. */
  faint: number;
  damage: number;
}

export interface FormDef {
  id: FormId;
  name: string;
  /** Level at which this form unlocks. Also its number key. */
  level: number;
  maxHearts: number;
  /** Ground speed in tiles per second. */
  speed: number;
  /** Speed in water, in tiles per second. */
  swim: number;
  /**
   * How far below the water surface the feet can go. 0 floats and cannot dive;
   * Infinity is the bed, however deep.
   */
  dive: number;
  /** 'water': jumps only while swimming at the surface, never from land. */
  jumpsFrom: 'anywhere' | 'water';
  /**
   * Upward speed of a jump, 0 for forms that fly or cannot jump. With
   * `jumpCut` set, letting go of Space early trims the jump.
   */
  jump: number;
  /** Upward speed kept when Space is let go mid-jump. 0 = jumps are always full. */
  jumpCut: number;
  /** Height of the middle of the body above the feet, for effects and aiming. */
  chest: number;
  /** Height of the top of the head above the feet: arrows fly over anything taller. */
  height: number;
  /** How far above the chest the "where am I" arrow floats. */
  arrowLift: number;
  sword: SwordUse;
  /** Replaces the sword click with a bite when set. */
  bite?: BiteDef;
  /** How high a step the form walks up without jumping; PHYSICS.step when not set. */
  step?: number;
  canFly: boolean;
  /** One-line description shown when the form unlocks. */
  blurb: string;
  /** False until the form has a model and its powers are built. */
  playable: boolean;
}

export const FORMS: readonly FormDef[] = [
  {
    id: 'human',
    name: 'Human',
    level: 0,
    maxHearts: 10,
    speed: 4.6,
    swim: 2.53,
    dive: 4,
    jumpsFrom: 'anywhere',
    jump: 7.6,
    jumpCut: 0,
    chest: 0.9,
    height: 1.6,
    arrowLift: 1.5,
    sword: 'full',
    canFly: false,
    blurb: 'No powers, but handy with a sword.',
    playable: true,
  },
  {
    id: 'fairy',
    name: 'Fairy',
    level: 1,
    maxHearts: 3,
    speed: 2.9,
    swim: 1.45,
    dive: 0,
    jumpsFrom: 'anywhere',
    jump: 0,
    jumpCut: 0,
    chest: 0.45,
    height: 0.9,
    arrowLift: 0.9,
    sword: 'none',
    canFly: true,
    blurb: 'Fly short distances and magic up a tiny home to hide in.',
    playable: true,
  },
  {
    id: 'orangutan',
    name: 'Orangutan',
    level: 2,
    maxHearts: 7,
    speed: 4.0,
    swim: 2.2,
    dive: 0,
    jumpsFrom: 'anywhere',
    jump: 7.6,
    jumpCut: 0,
    chest: 0.85,
    height: 1.5,
    arrowLift: 1.5,
    sword: 'weak',
    canFly: false,
    blurb: 'Climb twenty trees before needing to touch the ground.',
    playable: true,
  },
  {
    id: 'bunny',
    name: 'Bunny',
    level: 3,
    maxHearts: 4,
    speed: 5.0,
    swim: 2.75,
    dive: 0,
    jumpsFrom: 'anywhere',
    jump: 14.5,
    jumpCut: 4,
    chest: 0.3,
    height: 0.7,
    arrowLift: 0.9,
    sword: 'none',
    canFly: false,
    blurb: 'Hop over things nothing else can.',
    playable: true,
  },
  {
    id: 'wolf',
    name: 'Winter Wolf',
    level: 4,
    maxHearts: 12,
    speed: 7.0,
    swim: 3.85,
    dive: 0,
    jumpsFrom: 'anywhere',
    jump: 7.6,
    jumpCut: 0,
    chest: 0.9,
    height: 1.2,
    arrowLift: 1.5,
    sword: 'none',
    bite: { reach: 1.0, cooldown: 0.6, faint: 0, damage: 2 },
    canFly: false,
    blurb: 'A giant wolf that outruns everything so far, and can run across thin ice.',
    playable: true,
  },
  {
    id: 'ant',
    name: 'Ant',
    level: 5,
    maxHearts: 1,
    speed: 2.5,
    swim: 1.375,
    dive: 0,
    jumpsFrom: 'anywhere',
    jump: 7.6,
    jumpCut: 0,
    chest: 0.1,
    height: 0.2,
    arrowLift: 0.5,
    sword: 'none',
    canFly: false,
    blurb: 'Squeeze into really tiny spaces to reach hidden candles.',
    playable: true,
  },
  {
    id: 'mermaid',
    name: 'Mermaid',
    level: 6,
    maxHearts: 15,
    speed: 1.2,
    swim: 8,
    dive: Infinity,
    jumpsFrom: 'water',
    jump: 7.6,
    jumpCut: 0,
    chest: 0.9,
    height: 1.4,
    arrowLift: 1.5,
    sword: 'underwater',
    canFly: false,
    blurb: 'Swim fast, dive as deep as you like, and swing your sword in the water.',
    playable: true,
  },
  {
    id: 'cheetah',
    name: 'Cheetah',
    level: 7,
    maxHearts: 11,
    speed: 10.0,
    swim: 5.5,
    dive: 0,
    jumpsFrom: 'anywhere',
    jump: 7.6,
    jumpCut: 0,
    chest: 0.9,
    height: 0.9,
    arrowLift: 1.5,
    sword: 'none',
    canFly: false,
    blurb: 'Fastest of all, for one minute at a time.',
    playable: true,
  },
  {
    id: 'snake',
    name: 'Snake',
    level: 8,
    maxHearts: 6,
    speed: 3.5,
    swim: 1.925,
    dive: 0,
    jumpsFrom: 'anywhere',
    jump: 7.6,
    jumpCut: 0,
    chest: 0.15,
    height: 0.3,
    arrowLift: 0.7,
    sword: 'none',
    bite: { reach: 1.0, cooldown: 1.5, faint: 20, damage: 0 },
    step: 1.0,
    canFly: false,
    blurb: 'A venomous bite that makes bad guys faint.',
    playable: true,
  },
  {
    id: 'axolotl',
    name: 'Axolotl',
    level: 9,
    maxHearts: 5,
    speed: 1.5,
    swim: 6,
    dive: Infinity,
    jumpsFrom: 'anywhere',
    jump: 7.6,
    jumpCut: 0,
    chest: 0.9,
    height: 0.3,
    arrowLift: 1.5,
    sword: 'none',
    canFly: false,
    blurb: 'Regrows a heart every three seconds, swims without limit and hides in hollows and holes.',
    playable: true,
  },
];

export const MAX_LEVEL = 11;

// ---- The bosses (level 10) and the end of the game ---------------------------
// One arena, two phases. This comment is the contract; world.ts, enemy.ts and
// ending.ts are built against it.
//
// The lid (world.ts). An island roofs water tiles with `t.setLid(i, j, top)`
// (after setWater). While the lid is shut such a tile is plain solid ground at
// `top`: not water, anyone stands and walks on it, bad guys too. `dropLid()`
// turns every lid tile into the water tile it was built as (its bed and its
// level) and hides the slab; `raiseLid()` puts it back. `lidDown` says which,
// `isLid(x, z)` is true on a lid tile in both states. The checker reads the
// world as it is, so it needs no rule for the lid: a test explores before and
// after `dropLid()`.
//
// Both bosses are bad guys (`EnemySpot.kind` 'warden' and 'eel', `boss` true on
// the Enemy, `hearts` and `maxHearts` readable). A boss never faints from a
// bite. A boss that is not beaten gets all its hearts back on `reset()` (the
// player fainted). A beaten boss stays beaten, and that is saved.
//
// The Warden (phase 1, on land) is slower than a Human and hits hard. It has
// WARDEN.hearts hearts, a dozen blows of the level 10 sword, so the fight is
// many rounds of walking out of the ring and coming back in:
// - It walks at WARDEN.speed, cannot jump, steps up no more than any bad guy
//   (0.35) and will not walk off an edge. So it cannot climb the Stairs, whose
//   steps are 1 high.
// - The slam: with the player inside WARDEN.slamStart it stops and raises its
//   arms for WARDEN.windup seconds, and a red ring of radius WARDEN.slamRadius
//   shows on the ground round it. Then it hits everyone inside the ring that
//   is within WARDEN.slamHeight of its feet for WARDEN.damage hearts, and
//   stands still for WARDEN.recover seconds. Walk out of the ring; hit it
//   while it recovers.
// - The throw: a player it has noticed but cannot reach (farther than
//   WARDEN.throwFrom on the flat, or more than WARDEN.slamHeight above or
//   below it) gets a rock. It lifts the rock for WARDEN.throwWindup seconds
//   (it glows), then throws it at where the player is at that moment. The
//   rock flies straight at WARDEN.rockSpeed, does WARDEN.rockDamage hearts and
//   stops at walls. At least WARDEN.throwGap seconds between throws.
// When the Warden is beaten the lid drops.
//
// The Eel (phase 2, in the lake) is quick:
// - It is asleep (not drawn, cannot be hit, hits nobody) until the lid is down.
// - It never leaves the water: its centre stays on water tiles, between
//   EEL.bedGap above the bed and EEL.topGap under the surface. It swims at
//   EEL.speed and follows the player's depth.
// - It notices anyone in its water, and anyone within EEL.notice tiles of it
//   on the flat, whatever the height.
// - The lunge: with a swimmer inside EEL.lungeStart it glows for EEL.windup
//   seconds and fixes its direction when the glow starts. Then it dashes
//   EEL.lungeLength tiles straight at EEL.lungeSpeed (it stops at the shore)
//   and hits the player once, within EEL.lungeHit of it, for EEL.damage
//   hearts. Then it lies still for EEL.recover seconds. Swim sideways.
// - It must be easy to see. While it is awake a pale wake shows on the
//   surface over it, wherever it swims and however deep. While it glows for
//   the lunge a red streak shows on the surface along the whole path the
//   lunge will take (EEL.lungeLength long, or to the shore), as the Warden's
//   red ring shows its slam.
// - The spit: a noticed player who is not in the water (on the shore, on the
//   Stairs, in the air) gets a ball of water. The Eel comes up, glows for
//   EEL.spitWindup seconds, then spits at where the player is at that moment:
//   EEL.spitSpeed, EEL.spitDamage hearts, stops at walls, at least
//   EEL.spitGap seconds between.
// When the Eel is beaten the player is level 11 (MAX_LEVEL) and the credits
// roll.
//
// The Snapper (`EnemySpot.kind` 'snapper') is a small bad guy that swims: the
// Eel's little cousin, and no boss. It is there for the Mermaid.
// - It lives in the water its post is in and never leaves the water: its
//   centre stays on water tiles, between SNAPPER.bedGap above the bed and
//   SNAPPER.topGap under the surface, and never on a kelp mat or a hollow. It
//   swims at SNAPPER.speed and follows the player's depth.
// - It notices only a player who is in the water (swimming or dived, not
//   hidden) within SNAPPER.notice tiles on the flat, whatever the depth.
//   Anyone on the shore or in the air is nothing to it, so it never stops a
//   speaker on the bank from being used.
// - The snap: with a swimmer inside SNAPPER.lungeStart it glows for
//   SNAPPER.windup seconds and fixes its direction, then dashes
//   SNAPPER.lungeLength tiles straight at SNAPPER.lungeSpeed (it stops at the
//   shore) and hits the player once, within SNAPPER.lungeHit of it, for
//   SNAPPER.damage hearts. Then it lies still for SNAPPER.recover seconds.
// - When the player leaves the water, or is farther off than twice
//   SNAPPER.notice, it swims back to its post.
// - It takes no knockback and does not faint (nothing bites under water). It
//   has a hearts bar like any bad guy, and swords, the water shot and the
//   bubble column all hurt it. It appears at SNAPPER_LEVEL, with the Mermaid.
// - A pale wake shows on the surface over it, as over the Eel.
//
// The ending (ending.ts, no DOM): it watches the two bosses. Warden beaten:
// `world.dropLid()`. Eel beaten: level 11, credits. The save keeps
// `bosses: string[]` ('warden', 'eel'); loading with 'warden' in it starts
// with the lid down and the Warden gone. The credits are CREDITS, rolled for
// CREDITS_SECONDS while the camera slowly pulls back until the whole world is
// in view; any key or a click ends them and the camera comes back, and the
// player walks on.
/** The level at which the bosses appear. */
export const BOSS_LEVEL = 10;
export const WARDEN = {
  name: 'The Warden',
  hearts: 60,
  speed: 3.2,
  notice: 14,
  noticeHeight: 8,
  damage: 5,
  slamStart: 2.3,
  slamRadius: 3.0,
  slamHeight: 1.5,
  windup: 0.9,
  recover: 1.3,
  throwFrom: 5,
  throwWindup: 0.8,
  throwGap: 2.2,
  rockSpeed: 9,
  rockDamage: 3,
} as const;
export const EEL = {
  name: 'The Eel',
  hearts: 20,
  speed: 7,
  notice: 12,
  damage: 5,
  bedGap: 0.3,
  topGap: 0.6,
  lungeStart: 5,
  lungeLength: 8,
  lungeSpeed: 14,
  lungeHit: 1.4,
  windup: 0.7,
  recover: 0.9,
  spitWindup: 0.7,
  spitGap: 2.5,
  spitSpeed: 10,
  spitDamage: 3,
} as const;
/** The level at which Snappers appear: the Mermaid's. */
export const SNAPPER_LEVEL = 6;
export const SNAPPER = {
  hearts: 6,
  speed: 5,
  notice: 8,
  damage: 2,
  bedGap: 0.3,
  topGap: 0.5,
  lungeStart: 3,
  lungeLength: 3.5,
  lungeSpeed: 11,
  lungeHit: 0.8,
  windup: 0.5,
  recover: 1.0,
} as const;
/** The credits, in order: what was done, and who did it. */
export const CREDITS: readonly (readonly [string, string])[] = [
  ['Game design', 'Laura Elena Marsh-Leguia'],
  ['Coding', 'Papa & Claude'],
  ['Play testing', 'Mama'],
];
/** How long the credits roll, and the camera pulls back, if nobody stops them. */
export const CREDITS_SECONDS = 30;

/**
 * Candle lights needed to go from `level` to `level + 1`.
 * 3 for the first level, 4 for the second, then 5 from there on.
 * Level 10 → 11 is earned by beating both bosses, not by candles.
 */
export function lightsNeeded(level: number): number {
  if (level >= 10) return Infinity;
  return Math.min(3 + level, 5);
}

export type SwordTier = 'wooden' | 'stone' | 'iron' | 'diamond';

/** The sword upgrades itself at levels 2, 5 and 8. */
export function swordTier(level: number): SwordTier {
  if (level >= 8) return 'diamond';
  if (level >= 5) return 'iron';
  if (level >= 2) return 'stone';
  return 'wooden';
}

/** Hearts of damage per hit. Not in the plan; see DECISIONS in README. */
export const SWORD_DAMAGE: Record<SwordTier, number> = {
  wooden: 2,
  stone: 3,
  iron: 4,
  diamond: 5,
};

export const SWORD_COLOR: Record<SwordTier, number> = {
  wooden: 0xb07a3f,
  stone: 0x9aa0a6,
  iron: 0xe4e8ee,
  diamond: 0x67e8f9,
};
