import type { FormId } from './forms';
import { explore, Profile, Reach } from './levelcheck';
import type { Spot, World } from './world';

// Tests only: `explore` of a whole world is the costly part of the suite, and
// many tests ask the same question. Same world, start, forms and profile give
// back the same Reach (a Reach is read-only).
const cache = new WeakMap<World, Map<string, Reach>>();

export function exploreCached(world: World, from: Spot, forms: readonly FormId[], profile: Profile): Reach {
  let byKey = cache.get(world);
  if (!byKey) cache.set(world, (byKey = new Map()));
  const key = `${from.x},${from.z}|${[...forms].sort().join(',')}|${profile}`;
  let r = byKey.get(key);
  if (!r) byKey.set(key, (r = explore(world, from, forms, profile)));
  return r;
}
