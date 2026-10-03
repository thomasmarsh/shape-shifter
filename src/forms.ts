// Every form from PLAN.md, as data. The number key that selects a form is its
// index in this list, and it unlocks when the player reaches `level`.
//
// Human, Fairy, Orangutan and Bunny are playable; the rest are listed so the
// form bar can show them as locked and so later islands can fill them in
// without changing the shape of this table.

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
};

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

export interface FormDef {
  id: FormId;
  name: string;
  /** Level at which this form unlocks. Also its number key. */
  level: number;
  maxHearts: number;
  /** Ground speed in tiles per second. */
  speed: number;
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
    jump: 7.6,
    jumpCut: 0,
    chest: 0.9,
    height: 1.2,
    arrowLift: 1.5,
    sword: 'none',
    canFly: false,
    blurb: 'A giant wolf that outruns everything so far.',
    playable: false,
  },
  {
    id: 'ant',
    name: 'Ant',
    level: 5,
    maxHearts: 1,
    speed: 2.5,
    jump: 7.6,
    jumpCut: 0,
    chest: 0.9,
    height: 0.2,
    arrowLift: 1.5,
    sword: 'none',
    canFly: false,
    blurb: 'Squeeze into really tiny spaces to reach hidden candles.',
    playable: false,
  },
  {
    id: 'mermaid',
    name: 'Mermaid',
    level: 6,
    maxHearts: 15,
    speed: 1.2,
    jump: 7.6,
    jumpCut: 0,
    chest: 0.9,
    height: 1.4,
    arrowLift: 1.5,
    sword: 'underwater',
    canFly: false,
    blurb: 'Swim fast and command water and bubbles.',
    playable: false,
  },
  {
    id: 'cheetah',
    name: 'Cheetah',
    level: 7,
    maxHearts: 11,
    speed: 10.0,
    jump: 7.6,
    jumpCut: 0,
    chest: 0.9,
    height: 0.9,
    arrowLift: 1.5,
    sword: 'none',
    canFly: false,
    blurb: 'Fastest of all, for one minute at a time.',
    playable: false,
  },
  {
    id: 'snake',
    name: 'Snake',
    level: 8,
    maxHearts: 6,
    speed: 3.5,
    jump: 7.6,
    jumpCut: 0,
    chest: 0.9,
    height: 0.3,
    arrowLift: 1.5,
    sword: 'none',
    canFly: false,
    blurb: 'A venomous bite that makes bad guys faint.',
    playable: false,
  },
  {
    id: 'axolotl',
    name: 'Axolotl',
    level: 9,
    maxHearts: 5,
    speed: 1.5,
    jump: 7.6,
    jumpCut: 0,
    chest: 0.9,
    height: 0.3,
    arrowLift: 1.5,
    sword: 'none',
    canFly: false,
    blurb: 'Regrows a heart every three seconds.',
    playable: false,
  },
];

export const MAX_LEVEL = 11;

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
