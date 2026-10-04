import type { Island } from '../layout';
import { meadow } from './meadow';
import { tanglewood } from './tanglewood';
import { highcrag } from './highcrag';
import { frostfang } from './frostfang';
import { underroot } from './underroot';
import { saltmere } from './saltmere';
import { sunveld } from './sunveld';
import { coilstone } from './coilstone';
import { hollowfen } from './hollowfen';
import { galecrest } from './galecrest';
import { cinderhold } from './cinderhold';

/** Every island in the world, in the order they are built. */
export const ISLANDS: readonly Island[] = [meadow, tanglewood, highcrag, frostfang, underroot, saltmere, sunveld, coilstone, hollowfen, galecrest, cinderhold];
