// Every form from PLAN.md, as data. The number key that selects a form is its
// index in this list, and it unlocks when the player reaches `level`.
//
// Only Human and Fairy are playable in the tutorial island build; the rest are
// listed so the form bar can show them as locked and so later islands can fill
// them in without changing the shape of this table.

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
    sword: 'weak',
    canFly: false,
    blurb: 'Climb twenty trees before needing to touch the ground.',
    playable: false,
  },
  {
    id: 'bunny',
    name: 'Bunny',
    level: 3,
    maxHearts: 4,
    speed: 5.0,
    sword: 'none',
    canFly: false,
    blurb: 'Hop over things nothing else can.',
    playable: false,
  },
  {
    id: 'wolf',
    name: 'Winter Wolf',
    level: 4,
    maxHearts: 12,
    speed: 7.0,
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
