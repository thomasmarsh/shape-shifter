import { FORMS, FormId } from '../src/forms';
import { TANGLE_GAP } from '../src/layout';
import { explore, Profile, Reach } from '../src/levelcheck';
import { IslandBounds, Spot, World } from '../src/world';

// Prints an ASCII map of each island, for reviewing level layouts.
//
//   npm run map
//   npm run map -- --island=meadow
//   npm run map -- --reach=human,fairy --profile=max --from=10.5,27.5
//
// Up to four grids per island, one character per tile, with x and z rulers
// every ten tiles: heights, things, water depth (only if the island has water)
// and (with --reach) which surfaces can be reached.

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// ---- arguments -------------------------------------------------------------

const args = new Map<string, string>();
for (const a of process.argv.slice(2)) {
  const m = /^--([a-z]+)=(.*)$/.exec(a);
  if (!m) fail(`Unknown argument "${a}". Use --island=<id>, --reach=<forms>, --profile=easy|max, --from=x,z`);
  args.set(m[1], m[2]);
}
for (const key of args.keys()) {
  if (!['island', 'reach', 'profile', 'from'].includes(key)) fail(`Unknown flag --${key}`);
}

const world = new World();
const { layout } = world;

const wanted = args.get('island');
const islands = world.bounds.filter((b) => !wanted || b.id === wanted);
if (islands.length === 0) {
  fail(`No island "${wanted}". Islands: ${world.bounds.map((b) => b.id).join(', ')}`);
}

let reach: Reach | null = null;
let reachTitle = '';
const reachArg = args.get('reach');
if (reachArg !== undefined) {
  const forms = reachArg.split(',').filter(Boolean) as FormId[];
  for (const f of forms) {
    if (!FORMS.some((d) => d.id === f)) fail(`Unknown form "${f}". Forms: ${FORMS.map((d) => d.id).join(', ')}`);
  }
  const profile = (args.get('profile') ?? 'easy') as Profile;
  if (profile !== 'easy' && profile !== 'max') fail('--profile must be easy or max');
  let from: Spot = layout.spawn;
  const fromArg = args.get('from');
  if (fromArg !== undefined) {
    const [x, z] = fromArg.split(',').map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(z)) fail('--from must look like 10.5,27.5');
    from = { x, z };
  }
  reach = explore(world, from, forms, profile);
  reachTitle = `reach: ${forms.join(' + ')}, ${profile}, from ${from.x},${from.z} (${reach.tiles} tiles)`;
}

// ---- characters ------------------------------------------------------------

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Subtracted from every height printed for the island being drawn; 0 when it fits in 0..35. */
let heightBase = 0;

/** The base to print an island's heights from: 0 if it fits the digits, else its lowest ground, floored. */
function baseFor(b: IslandBounds): number {
  let low = Infinity;
  let high = -Infinity;
  for (let j = b.j0; j <= b.j1; j++) {
    for (let i = b.i0; i <= b.i1; i++) {
      if (world.isVoid(i + 0.5, j + 0.5)) continue;
      const h = world.groundAt(i + 0.5, j + 0.5);
      low = Math.min(low, h);
      high = Math.max(high, h);
    }
  }
  return high > 35 ? Math.floor(low) : 0;
}

function heightChar(i: number, j: number): string {
  const x = i + 0.5;
  const z = j + 0.5;
  if (world.isVoid(x, z)) return ' ';
  if (world.isWater(x, z)) return '~';
  return DIGITS[Math.max(0, Math.min(35, Math.floor(world.groundAt(x, z) - heightBase)))];
}

/** Everything that stands on a tile, as one character: the first match wins. */
function thingsGrid(): Map<string, string> {
  const marks = new Map<string, string>();
  const put = (s: Spot, c: string): void => {
    const key = `${Math.floor(s.x)},${Math.floor(s.z)}`;
    if (!marks.has(key)) marks.set(key, c);
  };
  for (const p of layout.puzzles) put(p.speaker, 'S');
  for (const p of layout.puzzles) put(p.candle, 'C');
  for (const c of layout.checkpoints) put(c, 'K');
  for (const e of layout.enemies) put(e, 'E');
  for (const b of layout.bread) put(b, 'B');
  for (const t of layout.trees) put(t, t.kind === 'great' || t.kind === 'greatPine' || t.kind === 'greatPalm' ? 'T' : 't');
  for (const b of layout.boulders) put(b, 'o');
  // Root tangles, kelp mats, thin ice (brittle or not), timed gates and their
  // plates, each with nothing else on it.
  for (let j = 0; j < world.depth; j++) {
    for (let i = 0; i < world.width; i++) {
      // A hole (wider than a normal tangle) takes the Snake as well as the Ant.
      if (world.isTangle(i + 0.5, j + 0.5)) put({ x: i + 0.5, z: j + 0.5 }, world.tangleGapAt(i + 0.5, j + 0.5) > TANGLE_GAP ? 'o' : '%');
      if (world.isKelp(i + 0.5, j + 0.5)) put({ x: i + 0.5, z: j + 0.5 }, world.isHollow(i + 0.5, j + 0.5) ? 'u' : '&');
      if (world.isThinIce(i + 0.5, j + 0.5)) put({ x: i + 0.5, z: j + 0.5 }, world.isBrittle(i + 0.5, j + 0.5) ? '+' : '=');
      if (world.isGate(i + 0.5, j + 0.5)) put({ x: i + 0.5, z: j + 0.5 }, 'G');
    }
  }
  for (const p of layout.plates) put(p, 'P');
  return marks;
}
const marks = thingsGrid();

function thingChar(i: number, j: number): string {
  if (world.isVoid(i + 0.5, j + 0.5)) return ' ';
  return marks.get(`${i},${j}`) ?? '.';
}

/** How deep the water is over the bed, rounded down, capped at 9; a dot where it is dry. */
function depthChar(i: number, j: number): string {
  const x = i + 0.5;
  const z = j + 0.5;
  if (world.isVoid(x, z)) return ' ';
  if (!world.isWater(x, z)) return '.';
  return String(Math.min(9, Math.floor(world.waterLevelAt(x, z) - world.groundAt(x, z) + 1e-4)));
}

function hasWater(b: IslandBounds): boolean {
  for (let j = b.j0; j <= b.j1; j++) {
    for (let i = b.i0; i <= b.i1; i++) if (world.isWater(i + 0.5, j + 0.5)) return true;
  }
  return false;
}

function reachChar(i: number, j: number): string {
  if (world.isVoid(i + 0.5, j + 0.5)) return ' ';
  return reach!.has(i, j) ? '#' : '.';
}

// ---- printing --------------------------------------------------------------

const MARGIN = 5; // room for the z labels

function printGrid(title: string, b: IslandBounds, charAt: (i: number, j: number) => string): void {
  console.log(`  ${title}`);
  // Ruler: a number and a tick over every tile whose x is a multiple of ten.
  const width = b.i1 - b.i0 + 1;
  let labels = ' '.repeat(MARGIN);
  let ticks = ' '.repeat(MARGIN);
  for (let i = b.i0; i <= b.i1; i++) {
    const col = MARGIN + (i - b.i0);
    if (i % 10 === 0) {
      labels = labels.padEnd(col) + String(i);
      ticks = ticks.padEnd(col) + '|';
    }
  }
  console.log(labels.trimEnd());
  console.log(ticks.padEnd(MARGIN + width).trimEnd());
  for (let j = b.j0; j <= b.j1; j++) {
    let row = '';
    for (let i = b.i0; i <= b.i1; i++) row += charAt(i, j);
    const label = j % 10 === 0 ? `${j}`.padStart(MARGIN - 2) + ' -' : ' '.repeat(MARGIN - 1) + ' ';
    console.log(`${label}${row.trimEnd()}`.trimEnd());
  }
  console.log('');
}

for (const b of islands) {
  const w = b.i1 - b.i0 + 1;
  const h = b.j1 - b.j0 + 1;
  console.log(`=== ${b.id} (${b.name}): x ${b.i0}..${b.i1}, z ${b.j0}..${b.j1}, ${w} by ${h} tiles ===`);
  heightBase = baseFor(b);
  const minus = heightBase > 0 ? `, heights minus ${heightBase}` : '';
  printGrid(`heights: digit = height (0-9, a-z for 10-35)${minus}, ~ water`, b, heightChar);
  printGrid('things: = thin ice, + brittle sheet, G timed gate, P plate, % root tangle, o hole (also a boulder), & kelp mat, u hollow, T great tree, t tree, S speaker, C candle, K checkpoint, E enemy, B bread, o boulder', b, thingChar);
  if (hasWater(b)) printGrid('water depth: digit = depth of the bed below the surface, rounded down (0-9), . dry', b, depthChar);
  if (reach) printGrid(`${reachTitle}; # reached, . not reached`, b, reachChar);
}
