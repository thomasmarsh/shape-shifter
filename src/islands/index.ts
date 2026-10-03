import type { Island } from '../layout';
import { meadow } from './meadow';
import { tanglewood } from './tanglewood';
import { highcrag } from './highcrag';
import { frostfang } from './frostfang';

/** Every island in the world, in the order they are built. */
export const ISLANDS: readonly Island[] = [meadow, tanglewood, highcrag, frostfang];
