# Shape Shifter

A web game. You are a shape shifter stuck on a cloud island. Solve music
puzzles to free candle lights, collect enough lights to level up, and each
level lets you shift into a new creature.

The design lives in [`PLAN.md`](PLAN.md). This build has **eleven islands** to
play, from level 0 (Human) to level 10 (wings), and the end of the game: two
bosses on the last island, level 11 and the credits.

## Play it

You need [Node.js](https://nodejs.org) 20 or newer.

```sh
npm install
npm run dev
```

Then open the address it prints (usually <http://localhost:5173>).

`npm run build` makes a version in `dist/` that can be put on any web host.

If the game runs slowly, add `?fast` to the address to turn off shadows.

## Controls

| Key | What it does |
| --- | --- |
| `W` `A` `S` `D` or arrows | Walk |
| `Space` | Jump. Hold it as a fairy to fly, or as a bunny to hop high (tap for a small hop). As a Human with wings: press it again in the air and hold it to glide |
| Click or `J` | Swing your sword (Human and Orangutan). As a Winter Wolf or a Snake: bite |
| `E` | Use things: speakers, candles |
| `F` | Eat a piece of bread (+1 heart) |
| `Shift` | Dive, as a Human or a Mermaid. Hold it to sink, let go to float back up |
| `0`–`9` | Shape-shift (`0` Human, `1` Fairy, `2` Orangutan, `3` Bunny, `4` Winter Wolf, `5` Ant, `6` Mermaid, `7` Cheetah, `8` Snake, `9` Axolotl) |
| `Q` | Fairy: make a tiny home to hide in. Mermaid, in the water: shoot water at the nearest bad guy |
| `R` | Mermaid, in the water: raise a bubble column under the nearest bad guy |
| `Esc` | Pause. The pause card also has **New game**, which asks once more and then starts over |

**Orangutan:** walk into a tree trunk and keep pushing to climb it. At the top
you stand on the tree, and from a treetop you can jump to the next tree and
grab it. The great trees (the tall ones) are the ones the islands are built
around. You can climb 20 trees in a row, then you must touch the ground before
you can climb more; the bar under your hearts counts them.

**Winter Wolf:** fast, and the first form that can run on thin ice. Thin ice only holds something that
is running, so keep running and do not stop. A wolf that stops, or is slowed
by bumping into something, will fall through. Over the lake it then has to
swim out and try again; over the sky it falls. Jump gaps in the ice at a run.
Thin ice grows back a few seconds after it breaks. The Wolf has no sword, but
it bites (click or `J`): 2 hearts a bite, from close up, with a little over
half a second between bites.

**Ant:** tiny, slow, and it has one heart. It is the only form that fits into a
root tangle (the woven roots with strands hanging up out of sight). Everything
else bumps into a tangle like a wall, and so do bad guys and arrows, so inside
one the Ant is safe. Inside a tangle the Ant cannot jump and cannot change
shape; walk out first. Changing out of the Ant leaves you on one heart, so eat
before you go on.

**Diving:** everything floats in water. A Human can also dive: hold `Shift` to
sink, as far as 4 below the surface, and let go to float back up (`Space` rises
faster). Sea pickles are candles under the water, and they sit 4 deep, so it
takes a dived Human to take their light. No other old form can dive.

**Kelp mats:** a mat of kelp floats on the water and hangs down under it.
Nothing gets over a mat or through it. A shape that can dive below it swims
under: just swim in, and you are pulled under it. A Human fits under a low mat.
Under a mat you cannot come up, jump or change shape.

**Mermaid:** 15 hearts. She swims faster than anything runs, dives as deep as
the water goes, and fits under the deep kelp that no earlier form can pass. Her
sword only works while she is in the water. On land she is very slow and cannot
jump, but she can leap out of the water onto a low shore. While she swims she
has two water powers. `Q` shoots a ball of water at the nearest bad guy within
9 tiles (3 hearts, it stops at walls). `R` raises a bubble column under the
nearest bad guy within 7 tiles: a ring of bubbles warns for a moment, then it
bursts and does 4 hearts to every bad guy in it. Walking bad guys stay out of
the water, so from a pond she can clear a shore without being touched. In the
deep pools there are Snappers, and those are hers to fight.

**Cheetah:** the fastest of all, 10 tiles a second, but only for as long as its
breath lasts. The bar under the hearts is its breath: about 8 seconds of
running. When it runs out the Cheetah is winded and slow until it has rested
for about 3.5 seconds (stand still, or be another shape). Nothing else gives
breath back, not even a checkpoint. Only the Cheetah is fast enough for brittle
crust, which breaks under a Wolf, and for timed gates: step on a plate and a
gate far away opens for a few seconds.

**Snake:** low and quiet, with 6 hearts and no sword. It fits into holes: the
burrows with a ring of dark stones round a black mouth. A hole is wider than a
root tangle, so the Ant fits too, but only the Snake can slide up a tall step
(as high as 1), and inside a hole nobody can jump. So a burrow that climbs is
the Snake's alone. A tangle is too tight for it. Its bite (click or `J`) does
no damage, but a bitten bad guy faints for 20 seconds: it lies still, cannot
hit, and does not stop you using a speaker. It can still be hit while it is
down, so bite as a Snake and finish as a Human. It wakes with the hearts it
had. Only the Snake is quiet: a bad guy standing at its post looks one way
(west, unless the island turns it), and it does not notice a Snake that is
behind it or level with it, however close. Come round behind and bite. Every
other shape is noticed from any side, and a bad guy that is already after you
is not fooled.

**Axolotl:** small, pink and slow on land, with 5 hearts and no sword. It grows
a heart back every 3 seconds, and the hearts stay when you change shape. It
swims fast and dives as deep as the water goes, and it is as low as the Snake,
so it fits into holes too. Only the Axolotl gets into a hollow: a stone roof
lying on the water, with a crack of water left over the bed. Swim at it and you
are pulled under; under the roof you cannot come up, jump or change shape. In a
hollow or a hole the Axolotl is hidden, and a bad guy that was after it gives
up.

**Wings:** level 10 gives no new shape. It gives the Human wings, and they only
glide. Jump as a Human, press `Space` again in the air and hold it: the wings
open at the top of the jump. They never climb. They sink slowly (1.5 a second)
and carry you fast (9 tiles a second), so about 6 tiles for every step of
height you give up, and from high ground that is a very long way. Let go and
they close; press again and they open again. Steer with the walking keys; with
no key held you drop straight down, slowly. Only the Human has wings, and only
a Human that left the ground as a Human: after a change of shape in the air
there are no wings until you land, and once they have opened you cannot change
shape until you land.

**Hop, then fly:** a Bunny can turn into a Fairy at the top of a hop and keep
the height. Hold `Space` as a Bunny, press `1` when the hop is at its top, and
keep holding `Space`. It reaches ledges and gaps that neither form can alone.

## What is in this build

- **Meadow Island** (the tutorial): a meadow, a hill, a pond and a bluff, with
  a resting cloud that leads on. Three music puzzles teach the game. Ends when
  you fly across to the next island as a Fairy.
- **Tanglewood** (level 1, then 2): a forest island with a lake, a stone keep,
  a marsh and a staircase of stepping stones in the sky. Four candles, each a
  lesson in when to fly and when to turn back into a Human. A grove of great
  trees leads out over the sky to the next island, and only the Orangutan can
  climb it.
- **Highcrag** (level 2, then 3): a high valley of cliffs, pillars and rocks.
  Five candles, and most of them need several shapes in a row (climb, then
  fight, then fly). The way off is the Giant's Stair, which only the Bunny can
  hop up, past three archers.
- **Frostfang** (level 3, then 4): a snowy island of pines, ice and a frozen
  lake. Five candles, and each one needs different shapes: a Bunny up the Snow
  Steps, a hop-then-fly across to the Needle, an Orangutan along the Pine Road,
  a drop down the Undercliff and a fly across to its rock, and the Fang, which
  uses every form in turn. The fifth candle gives the Winter Wolf, and the Wolf
  is what the way off needs: sprint over the thin ice of the frozen lake and up
  the Frozen Falls, then every other form does one job on the way to the end,
  and a last run down to the next island.
- **Underroot** (level 4, then 5): a long mossy island of roots, bark and great
  trees, with a flat glade along its south side and everything else rising to
  the north and east. Five candles: the Clearing (a plain sword fight), the
  Leaf Mats (a Wolf up a climbing path of thin leaves, a fight, then a Bunny up
  a step), the Leaf Pier (run as a Wolf, turn into a Fairy at the end without
  stopping, then fight), the Root Grove (an Orangutan along a road of great
  trees, a fight, then a Fairy across) and the Spire (hop, then fly). The fifth
  candle gives the Ant, and the Ant is what the way off needs: past the gate
  guards, through the Root Wall into the Yard, up the Long Root over the open
  sky to the Crown, and one short flight to the next island.
- **Saltmere** (level 5, then 6): an island of sand, salt and water, with a flat
  beach along its south side and a lagoon, the Mere, at its east end. Its five
  candles are sea pickles, each 4 deep, so each one ends with a Human dive: the
  Tide Pool (a sword fight, then the first dive), the Driftwood Nest (an Ant
  through a ring of woven driftwood, a Bunny up to the speaker), Salt Rock (a
  Wolf up a stair of salt crust over the sky, then an Ant through another
  ring), the Stack (a fight for the speaker, then hop, then fly, to a pool on
  top of a rock) and Palm Key (a Human under a ring of kelp, an Orangutan along
  a road of great palms, a fight, then a Fairy across). The fifth pickle gives
  the Mermaid, and the Mermaid is what the way off needs: the Deep Road, a long
  channel over the open sky roofed with deep kelp, to Pearl Rock, and from
  there a hop, then a flight, east and down to the next island.
- **Sunveld** (level 6, then 7): a flat golden valley of dry grass under a red
  escarpment, closed at its east end by the Red Wall. Five candles: the
  Watering Hole (a fight, then a pickle 8 deep that only the Mermaid reaches),
  the Oxbow (a Mermaid under a ring of deep kelp, a Bunny up a terrace, then
  hop, then fly, to a spire), the Red Table (a Wolf up a stair of thin crust,
  an Ant through a ring of thorn, a Fairy across to a pillar), the Umbrella
  Grove (an Orangutan along a road of great acacias, a fight, then a Wolf down
  a pier of thin crust that turns into a Fairy at the end without stopping) and
  the Kraal (an Ant through a ring of thorn, an Orangutan up a tree, then hop,
  then fly). The fifth candle gives the Cheetah, and the Cheetah is what the
  way off needs: a plate that opens the gate in the Red Wall for 3.8 seconds,
  31 tiles away, past the sword bad guys; then two runs of brittle crust over
  the open sky, each with a gap to jump, with a Bunny hop between them, to
  Sunset Rock, and on to the next island. One breath covers each run but not
  two in a row, so the Cheetah has to rest in the Yard and on the Terrace.
  Between the rooms the valley has pans of water, dry wallows, clumps of thorn
  and more bad guys, and one roofed pan, the Lair, for a much later shape.
- **Coilstone** (level 7, then 8): a ruined city of blue-grey slate, split down
  the middle by the Rift, with a mesa of dark basalt, the Serpent's Head, at its
  east end. You land low and walk up a ramp. Five candles: the Sunken Court (a
  Mermaid under a ring of deep kelp, two guards shut in a walled cell that only
  her bubble column reaches, a Bunny up a terrace), the Colonnade
  (a fight, an Orangutan along two great banyans, a Fairy across to a pillar),
  the Tooth (a run down a pier of slate slabs that turns into a Fairy at the
  end without stopping, then an Ant through a ring of fallen stone), the Stair
  (a fight, a run up a stair of slabs, then hop, then fly, to a spire) and the
  Thicket (a sword fight, an Ant through a ring, an Orangutan up a banyan). The
  last two stand east of the Rift, and the only way over is the Bridge of
  brittle stone, which takes the Cheetah. The fifth candle gives the Snake, and
  the Snake is what the way off needs: past two heavy sword bad guys at the
  Foot and up the Coil, a burrow of ten tall steps in the mesa's west face, to
  the Serpent's Head, and from there a hop, then a flight, east and down to the
  next island. Between the rooms the city has cisterns, sunk floors, heaps of
  fallen stone and more guards, and one roofed cistern, the Vault.
- **Hollowfen** (level 8, then 9): a fen of sedge, peat and still water, cut in
  two by the Gap. You land low and walk up a ramp. Five candles: the Reed Pool
  (a fight, then a pickle 8 deep that only the Mermaid reaches), the Reed Ring
  (an Ant through a ring of woven reeds, a Bunny up a terrace), the Heron Road
  (a fight, an Orangutan along two great trees, a Fairy across to a pillar), the
  Stair (a fight, a run up a stair of reed mats, then hop, then fly, to a
  spire) and the Mound (past two heavy sword bad guys who look west, then a
  Snake up a burrow of ten tall steps). The last two stand east of the Gap, and
  the only way over is the Bridge of brittle reed, which takes the Cheetah. The
  fifth candle gives the Axolotl, and the Axolotl is what the way off needs:
  the Well, a lake with a ring of hollows round the Last Stone. The Last Stone
  is a dead end. The way on is from the fen's east bank: a hop, then a flight,
  east and down. Between the rooms the fen has pools, peat cuts, reed beds and
  more herons, two camps of them with the quick blades, and the Holt: a pool
  with a stone roof round its middle, and bread on a stone that only the
  Axolotl reaches.
- **Galecrest** (level 9, then 10): a windy heath of heather, scree and quartz,
  cut in two by the Gap. You land low in the Court, in front of the Windbreak,
  a wall across the whole island that is too tall for anything that hops or
  flies. Water runs under it through the Sluice, beneath a low stone roof, and
  only the Axolotl gets through; under the roof it is hidden from the two
  guards on the bank. Past the wall a ramp of scree climbs to the heath. Five
  candles: the Tarn (a fight, then a pickle 8 deep in a corner shut off by a low
  stone roof: Snappers in the open water for the Mermaid, the roof for the
  Axolotl), the
  Gorse Ring (an Ant through a ring of gorse, a Bunny up a terrace), the Pine
  Road (a fight, an Orangutan along two great pines, a Fairy across to a
  pillar), the Stair (a fight, a run up a stair of quartz flakes, then hop,
  then fly, to a spire) and the Crag (past two heavy sword bad guys who look
  west, then a Snake up a burrow of ten tall steps). The last two stand east of
  the Gap, and the only way over is the Bridge of brittle quartz, which takes
  the Cheetah. The fifth candle gives the wings, and the wings are what the way
  off needs: the heath ends at the open sky, and Kestrel Rock lies 43 tiles out
  and 11 down, too far for a hop and a flight. Jump off the edge and glide.
  The wings carry past the Rock if you keep steering: over it, let go of the
  walking keys and sink straight down.
  There is a way back: the Kestrel Steps, north of the Rock, five steps a Bunny
  hops to a top high enough for a glide west to the heath. Between the rooms
  the heath has tarns, scree hollows, gorse and more guards than any island
  before it, and two roofed tarns, the Kettle and the Cauldron, with bread
  only the Axolotl gets.
- **Cinderhold** (level 10, the end): ash, black glass and one arena, the Ring.
  It has no candles. You land low, a short Fairy flight east of Kestrel Rock,
  and walk up the Climb. The Warden stands in the middle of the Ring on a
  floor of black stone, the Lid, which fills the Ring but for a walk of ash
  round its edge. Beat it and the Lid falls: under it is the Deep, a lake as
  deep as a Human dives, and in it the Eel. Two Stairs stand on the Ring's
  north and east sides, each marked by beacons. Their steps are too tall for the Warden, and
  from the top the wings carry you anywhere in the Ring, or out over the lake.
  Beat the Eel and you are level 11: the credits roll while the camera pulls
  back over the whole world and puzzle bells ring at random. Any key stops
  them, and you can walk on.
- Ten forms: Human (10 hearts, wooden sword, dives), Fairy (3 hearts, short
  slow flight, fairy home), Orangutan (7 hearts, climbs trees, weaker stone
  sword), Bunny (4 hearts, huge hops, no sword), Winter Wolf (12 hearts,
  fast, no sword, a bite of 2 hearts, runs on thin ice), Ant (1 heart, slow, no
  sword, fits into root tangles), Mermaid (15 hearts, swims fast, dives
  without limit, sword and two water powers only in water), Cheetah (11
  hearts, the fastest of all while its breath lasts, no sword, runs on brittle
  crust), Snake (6 hearts, slow, no sword, fits into holes, slides up tall
  steps, a bite that makes bad guys faint, not noticed from behind) and Axolotl
  (5 hearts that grow back, no sword, swims fast, dives without limit, fits
  into holes and hollows, and hides in them). Hearts cap at the form's maximum when
  you shift and only come back by eating.
- Wings for the Human at level 10: a glide, never a climb.
- 100 bread to start, more to find.
- Five kinds of bad guy. Regular ones (9 hearts, 1 heart per punch), including
  two slower "testers" on the training ground, archers (8 hearts) who
  appear once you reach level 3, and two kinds with a sword who appear once you
  reach level 7: a heavy one (5 hearts, slow, a long wind-up, 4 hearts a blow)
  and a light one (3 hearts, a short wind-up, 2 hearts a blow, and at speed 8
  faster than everything but the Cheetah: only a Cheetah runs away from it). And the Snapper (6 hearts), a fish that appears once you reach level
  6 in the deep pools of Sunveld, Hollowfen and Galecrest. It never leaves its
  pool and takes no notice of anyone on the bank. At a swimmer it glows for
  half a second, then snaps 3.5 tiles in a straight line for 2 hearts. A pale
  wake on the surface shows where it is, and a red streak where it will snap.
- Two bosses, at level 10. **The Warden** (60 hearts, a little slower than a Human): it raises its arms
  for 0.9 seconds while a red ring shows on the ground round it, then slams
  everything in the ring for 5 hearts and stands still for 1.3 seconds. Walk
  out of the ring and strike while it stands. Out of its reach (far off, or up
  a Stair) it throws rocks: 3 hearts, straight, after a short glow.
  **The Eel** (20 hearts, quick, and long): it never leaves the water. It glows
  for 0.7 seconds while a red streak on the water shows its path, then lunges 8
  tiles along it for 5 hearts: swim sideways. A pale wake on the surface shows
  where it is, however deep it swims. At anyone within 12 tiles who is not in the water it spits water
  (3 hearts); the Stairs' tops are out of its reach. A boss does not faint from a Snake's bite. If you faint, a boss that
  is not beaten has all its hearts again; a beaten one stays beaten.
- Forty-seven music puzzles (3, 4 and 5 notes on Meadow Island, then 4 to 6 notes
  after), each guarding a candle. You cannot use a speaker while a bad guy
  close by is after you: deal with them, lose them or hide first.
- Checkpoints, falling off the island, fainting and respawning.
- A form bar with all ten forms; the ones you have not reached show as locked.
- Progress saves in the browser.

## Where things are

```
src/
  main.ts       starts the game
  game.ts       the loop, camera, saving, hints, and what happens when
  world.ts      builds the whole world from the islands: terrain, heights, water,
                thin ice, root tangles, kelp mats, hollows, the lid, meshes
  layout.ts     the shared words of a level: tile kinds, spots, hints, arrivals
  islands/      one file per island, plus the tests for the island
    index.ts      the list of islands, in build order
    meadow.ts  tanglewood.ts  highcrag.ts
    frostfang.ts      Frostfang's hub and its five candles (west half)
    frostfang-run.ts  the frozen lake and the Wolf's exit run (east half),
                      built by frostfang.ts
    underroot.ts      Underroot's landing, the west of its hub and three candles
    underroot-east.ts the east of the hub, two candles and the Ant's way off,
                      built by underroot.ts
    saltmere.ts       Saltmere's landing, its beach and four candles (west half)
    saltmere-east.ts  the Mere, Palm Key and the Mermaid's way off (east half),
                      built by saltmere.ts
    sunveld.ts        Sunveld's landing and three candles (west half)
    sunveld-east.ts   two candles, the Red Wall and the Cheetah's way off (east
                      half), built by sunveld.ts
    coilstone.ts      Coilstone's landing, ramp and three candles (west half)
    coilstone-east.ts the Rift and its Bridge, two candles and the Snake's way
                      off (east half), built by coilstone.ts
    hollowfen.ts      Hollowfen's landing, ramp and three candles (west half)
    hollowfen-east.ts the Gap and its Bridge, two candles and the Axolotl's way
                      off (east half), built by hollowfen.ts
    galecrest.ts      Galecrest's Court, Windbreak, Sluice, ramp and three candles
                      (west half)
    galecrest-east.ts the Gap and its Bridge, two candles and Kestrel Rock, the
                      wings' way off (east half), built by galecrest.ts
    cinderhold.ts     the last island: the Landing, the Climb, the Ring, the
                      Lid over the Deep, and the two Stairs
    fill.ts       ponds, dells, thickets and holts: what fills a flat hub
                  without changing who reaches what
    sunveld-fill.ts  coilstone-fill.ts  hollowfen-fill.ts  galecrest-fill.ts
                  what stands between those islands' rooms: water, dips,
                  thickets, holts, more bad guys, bread
    testkit.ts    the checks every island's tests repeat (closed rings, guard
                  and archer distances, things on real ground, ids, melodies,
                  the camera, a way out from every respawn spot, gate timing)
    scatter.ts    sprinkles ordinary trees over an island's grass
  forms.ts      the ten forms and level rules, as a data table, and the
                bosses' numbers and rules
  ending.ts     the end of the game: which boss is beaten, when the lid drops,
                the win, how the camera pulls back for the credits, and the
                bells that ring over them
  player.ts     movement, flying, climbing, hopping, running on ice, fitting into
                tangles, holes and hollows, swimming and diving, breath, sword,
                bite, hearts and their regrowth, hiding, gliding on wings,
                shape-shifting
  enemy.ts      the regular bad guy, the archer and the two sword bad guys, how
                they faint, and which way they look at their posts; the two
                bosses, the Warden and the Eel; the Snapper, which swims as
                the Eel does
  arrows.ts     arrows in flight, and the bosses' rocks and balls of water
  waterpowers.ts  the Mermaid's water shot and bubble column
  things.ts     puzzle speakers, candles and sea pickles, checkpoints, bread
  puzzleUi.ts   the music puzzle screen
  hud.ts        hearts, form bar, meters, hints, title and level-up cards
  models.ts     every character and object, built from coloured boxes
  frost.ts      the look of Frostfang: snow caps, frost and falling snow (looks only)
  cinder.ts     the look of Cinderhold: beacons at the Stairs, embers, glowing
                cracks and standing stones (looks only)
  audio.ts      notes and sound effects, made in code
  particles.ts  sparkles and puffs
  input.ts      keyboard and mouse
  save.ts       saving to the browser
  levelcheck.ts the level checker: which places each set of forms can reach
                (it knows the Winter Wolf, thin ice, hop-then-fly, the Ant and
                root tangles, diving, kelp mats, the Mermaid, the Cheetah,
                brittle crust, timed gates, the Snake and holes, the Axolotl
                and hollows, the wings)
  explorecache.ts  shares the checker's answers inside a test file
  pilot.ts      a scripted player the tests use to walk and fly real routes
  *.test.ts     the tests (next to the code they check)
scripts/
  map.ts        prints an ASCII map of the islands (`npm run map`)
```

To change an island, edit its file in `src/islands/`: `build(t)` shapes the
ground and returns where everything stands (checkpoints, puzzles, bad guys,
bread, trees, hints, arrival cards). To change a form's hearts or speed, edit
`src/forms.ts`.

### Adding an island

1. Make `src/islands/<name>.ts` that exports an `Island` (see
   `src/islands/highcrag.ts` for one in a single file) and add it to the list in
   `src/islands/index.ts`. Leave a gap of sky between islands. Besides
   `t.set(i, j, height, kind)`, `build(t)` can lay water at any height with
   `t.setWater(i, j, wet, level)`, and a sheet of thin ice at any height with
   `t.setThinIce(i, j, height)`, a sheet of brittle crust with
   `t.setBrittle(i, j, height)`, turn a ground tile into a root tangle with
   `t.setTangle(i, j)` (or a Snake hole with `t.setTangle(i, j, 0.35)`), into part of a timed gate with `t.setGate(i, j, id)`
   (the island then returns `plates`, each with its gate and its seconds), and
   float a kelp mat on a water tile with `t.setKelp(i, j, depth)`, or roof it with a hollow with `t.setHollow(i, j)`. On a water tile the height you set is the bed. A
   candle placed on a water tile is a sea pickle. An island can also be built
   in two files, as Frostfang, Underroot, Saltmere, Sunveld, Coilstone, Hollowfen and Galecrest are: its file calls a builder from the other and merges the
   result.
2. Run `npm run map -- --island=<name>` to look at it, and
   `npm run map -- --island=<name> --reach=human,fairy --from=x,z` to see what
   those forms can reach from a spot.
3. Write a test next to it (copy `src/islands/sunveld.test.ts`, which uses the
   shared checks in `src/islands/testkit.ts`) saying who should and should not
   reach each place. Give its explores the island's x range plus a margin, so
   the suite stays fast. Run `npm test`.

## Checking levels

Levels are checked by machine, because a puzzle that needs a jump nobody can
make is easy to build by accident. `src/levelcheck.ts` is a level checker: give
it a world, a starting spot and a set of forms, and it says which places those
forms can reach (an easy setting for "a person can do this" and a generous
one for "nobody can do this"). The route tests in `src/routes.test.ts` back it
up by really flying and climbing the hard routes with the real physics, using
the scripted player in `src/pilot.ts`. `npm run map` prints the islands as
ASCII maps (heights, things, thin ice, root tangles, holes, kelp mats, hollows, the lid, water
depth and reachable ground) so you can see a layout before you run the game, for example
`npm run map -- --island=frostfang --reach=human,fairy,orangutan,bunny --from=208.5,40.5`.

The checker knows these things beyond walking, hopping, flying and climbing:

- **The Winter Wolf:** it moves like a faster Human, and it is the only form
  that can step onto thin ice. Nobody can stand still on thin ice, so nothing there can
  be used (a speaker, a candle) from it.
- **Thin ice:** the checker treats every sheet as whole, and lets only the Wolf
  walk or hop onto it. Whether a run is really fast enough is proved by the
  route tests, not by the checker.
- **Hop-then-fly:** a Bunny that turns into a Fairy at the top of its hop keeps
  that height and flies on from there. This needs both forms. The checker has
  an easy and a generous range for it, measured with the real physics.

- **The Ant and root tangles:** a tangle is a wall for every form but the Ant:
  nobody else walks into one, lands on one or flies over one. For the Ant it is
  plain ground, except that it cannot hop from inside one. A ring of tangle
  must have no diagonal-only joins.
- **The Snake and holes:** every tangle has a gap, and a form fits when it is
  no taller than the gap. A root tangle (0.25) takes only the Ant; a hole (0.35)
  takes the Ant and the Snake. Whoever fits walks in and out and cannot hop from
  inside. Walking up uses each form's own step: 1 for the Snake, 0.35 for
  everyone else, on both settings. So a burrow whose hole tiles rise 0.75 each
  is the Snake's alone.
- **Diving:** a water tile's surface is where a form floats. A form that can
  dive can also be at any height from there down to its dive depth or the bed,
  whichever comes first, and a thing can be used from any of those heights. So
  floaters use things about 2 deep, the Human a sea pickle 4 deep, and only the
  Mermaid anything deeper.
- **Kelp mats:** a mat is a wall with no top for every form that cannot get its
  whole body below it, in the air as well: nothing walks, swims, lands on or
  flies over one. A form that fits swims in and out, and cannot hop from one. A
  closed ring of mats seals a place the way a ring of tangle does.
- **The Mermaid:** she walks on land, floats and dives like the Human with no
  depth limit, and hops only out of water.
- **The Axolotl and hollows:** the Axolotl moves like a slow Human that dives
  without limit, and at 0.3 tall it fits every hole. A hollow is a kelp mat
  that hangs down to 0.35 above the bed, and the mat rule has a second half: a
  body must also fit in the water between the mat and the bed. Under a hollow
  that leaves the Axolotl alone: the Human and the Mermaid are too tall, the
  Snake and the Ant cannot dive. Ordinary mats keep 2 of water under them, so
  nothing changes for them. A closed ring of hollows seals a place for
  everyone else.
- **The wings:** off unless a search asks for them (`explore(..., wings)`, or
  `--wings` on the map), and then only the Human has them. A glide starts from
  any ground the Human stands on, a jump's height above it, and loses height
  for every tile it travels: 1 for every 5.1 tiles on the easy setting, 1 for
  every 6.3 on the generous one (the real physics gives 6). It never rises. It
  steers, so it goes round a tall wall if the way round is short enough, and it
  cannot pass anything that has no top (a tangle, a kelp mat, a hollow, a shut
  gate). Where it comes down the Human stands and can change shape. Because
  nobody changes shape between opening the wings and landing, and wings do not
  open after a change of shape in the air, the checker needs no glide that
  starts in mid-air.
- **The Cheetah:** it moves like a faster Human and jumps a gap of 6 tiles at a
  run (7 at the limit). The checker treats it as always rested; breath is
  proved by the route tests, which run with the real breath bar.
- **Brittle crust:** like thin ice, but only the Cheetah may step onto it.
- **Timed gates:** a shut gate is a wall with no top for everyone. It opens for
  a set of forms when they can stand on one of its plates and one of them is
  fast enough: the straight line from the plate to the far side of the gate,
  divided by the form's speed, must fit in the plate's seconds (with 0.4 s to
  spare on the easy setting). The straight line is generous on purpose; the
  route tests run the real distance.
- **A range of x:** `explore` can be told to look only at a range of columns
  (an island and its neighbours). `src/levelcheck.range.test.ts` proves that
  reach inside the range is the same as with the whole world.
- **The lid:** the checker has no rule for it. A lid tile is plain ground
  while the lid is shut and a water tile once it is down, and the checker
  reads the world as it is. A test explores a world before and after
  `dropLid()`.
- **Bad guys are ignored.** The checker proves where they stand (not near a
  checkpoint or a respawn spot, not where the player must be an Ant; a Snapper
  in open water, with no tangle touching its pool), never that a fight is
  fair. For the bosses, `src/boss.test.ts` runs the real
  attacks: a player who walks out of the red ring is not hit, one who stands
  still is.

The route tests for Underroot, Saltmere, Sunveld, Coilstone, Hollowfen and Galecrest sit
next to the islands, in `src/islands/*.routes.test.ts`. The Cheetah's own route tests
(brittle runs, a timed gate, breath) are in `src/cheetah.routes.test.ts`, and
the Snake's (a stepped burrow) in `src/snake.routes.test.ts`, and the Axolotl's
(a row of hollows) in `src/axolotl.routes.test.ts`. The wings are tested with
the real physics in `src/wings.test.ts`, which also measures how far a glide
carries (76 tiles from ground at 12 down to ground at 1), and in the checker
in `src/levelcheck.wings.test.ts`. Cinderhold's are in
`src/islands/cinderhold.routes.test.ts`: the Fairy's flight from Kestrel Rock,
the Human's climb of a Stair and glide onto the Lid and into the lake, the
Warden that cannot follow up the steps, the lid dropping under a player, the
Eel that never leaves its lake, a Human who dodges its lunge by swimming
sideways and one who does not, and a scripted Human that beats the Warden
without losing a heart (twelve blows of the level 10 sword, in about 26
seconds) next to one who only swings and faints. The Snappers are run in their
real pools in `src/islands/snapper.routes.test.ts`: they stay in their water, a
Mermaid beats the Tarn's two and keeps half her hearts, and a player on the
bank is not noticed. What fills the hubs is run in
`src/islands/fill.routes.test.ts`: a blade hits a Wolf and a Human who keep
running and loses a Cheetah, nobody wades into a pond after a swimmer, a Human
and a Mermaid jump out of every pond tried, dells are walked through, and a
glide from the heath comes down on Kestrel Rock. `src/islands/fill.test.ts`
checks the same things with the checker: nothing higher than the hub, the
lanes clear, the new guards far enough from checkpoints, rings and ways off.
The holts are checked in `src/islands/holt.test.ts` (no set without the
Axolotl reaches the stone or the moat) and swum in
`src/islands/holt.routes.test.ts`, where an Axolotl jumps from the moat onto
the single stone and gets back out.

The suite is 1230 tests in 84 files and runs in about 15 seconds on an 8-core
laptop (the 1174 before Sunveld and Coilstone were filled took the same, the 1138 before any hub was filled about 14, the 977 tests before Cinderhold took about 12, the 872 before Galecrest
about 11, the 777 before Hollowfen 8.5; with isolation those took 10 to 11). Test files run in forked workers without
isolation (`pool: 'forks'`, `isolate: false` in `vite.config.ts`), so the
engine is imported once per worker, not once per file. Each file still builds
its own world; a test must not leave module-level state changed for the next
file.

Because of hop-then-fly, every raised thing (a ledge, a wall top, a treetop) is
a launch pad. Level designs keep raised ground to where it is needed, and
Frostfang's hub only has dips, never bumps. The island tests also check each
island as a whole: what its forms reach, what they cannot, and that things sit
on real ground and can be seen from the camera.

## Trying later islands

The game is in `window.game` in the browser console. Handy while building:

```js
game.debug.warp('hc-prow')   // stand on a checkpoint
game.debug.setLevel(4)       // become level 4 (then press 4 for the Winter Wolf)
game.debug.takeLight(7)      // take a candle's light at once (0 to 46)
```

Candles are numbered in the order of the islands: 0 to 2 Meadow Island, 3 to 6
Tanglewood, 7 to 11 Highcrag, 12 to 16 Frostfang, 17 to 21 Underroot, 22 to 26
Saltmere, 27 to 31 Sunveld, 32 to 36 Coilstone, 37 to 41 Hollowfen, 42 to 46
Galecrest.

Checkpoint names: `meadow`, `middle`, `bluff`, `far-island`, `tw-cross`,
`tw-south`, `tw-grove`, `hc-prow`, `hc-south`, `hc-north`, `hc-east`,
`hc-stair`, `frostfang`, `ff-north`, `ff-south`, `ff-lake`, `ff-glacier`,
`ff-brow`, `ff-last`, `underroot`, `ur-mat`, `ur-glade`, `ur-mid`, `ur-grove`,
`ur-wall`, `ur-yard`, `ur-crown`, `saltmere`, `sm-mid`, `sm-east`, `sm-nest`,
`sm-salt`, `sm-key`, `sm-pearl`, `sunveld`, `sv-mid`, `sv-table`, `sv-east`,
`sv-kraal`, `sv-yard`, `sv-kopje`, `sv-end`, `coilstone`, `cs-hub`, `cs-court`,
`cs-rim`, `cs-far`, `cs-foot`, `cs-end`, `hollowfen`, `hf-hub`, `hf-ring`,
`hf-rim`, `hf-far`, `hf-foot`, `hf-well`, `hf-end`, `galecrest`, `gc-hub`,
`gc-ring`, `gc-rim`, `gc-far`, `gc-foot`, `gc-edge`, `gc-end`, `cinderhold`,
`ch-ring` (on the Climb, below the Ring).

## Decisions the plan did not spell out

These were chosen to get a playable build. Change any of them freely.

- **Candles per level:** 3, then 4, then 5 for every level after.
- **Level 11:** earned by beating both bosses; that ends the game. The credits
  roll once, and after them the world is still there to walk in.
- **Sword damage:** wooden 2, stone 3, iron 4, diamond 5 hearts. An orangutan
  does one less.
- **Bread:** one piece restores one heart.
- **Forms with no attack** cannot hurt bad guys; they run, hide or shift.
- **The Wolf bites:** 2 hearts flat, reach 1, 0.6 seconds between bites, no
  faint. It is the Snake's bite with other numbers (`bite` in `src/forms.ts`).
- **Falling off an island** costs one heart and returns you to the checkpoint.
- **Fainting** returns you to the checkpoint with full hearts. Bad guys you
  already beat stay beaten; the rest go back to their posts.
- **Fairy flight:** about 4.5 seconds of flapping, then she must rest on the
  ground for about 2 seconds.
- **Music puzzles:** squares are told apart by sound and colour, not letters.
  After two wrong tries, the squares light up as the speaker plays.
- **Camera:** fixed, looking north-east. An arrow appears over your head when
  a hill or tree hides you.
- **Orangutan climbing:** push into a trunk for a moment to grab it. 20 trees
  in a row, counting each new tree once, then it must stand on real ground (a
  treetop does not count). An Orangutan can still use the sword, one heart
  weaker.
- **Bunny hops:** a held jump rises about 4.4 steps, enough for a ledge 4
  high. Letting go of `Space` early cuts the hop short, so a quick tap is a
  small hop of about one step. A Human rises about 1.2.
- **Archers:** 8 hearts, notice you from 10 tiles, draw the bow for 0.9 seconds
  (they glow bright yellow and pulse faster as the arrow nears), then loose an
  arrow that flies 10 tiles a second and does 2 hearts. Arrows stop at walls
  and pillars. Between shots they wait about 2 seconds. Their fist does 1 heart.
- **Archers appear at level 3:** they stand on Highcrag from the start but stay
  hidden until you reach level 3, and a toast says so once.
- **Nothing can stand on candles, speakers or checkpoints,** so a fairy cannot
  use them as a step to rise higher.
- **Fairy rise:** she can climb about 3 steps above the last ground she stood
  on, and a treetop counts as ground. That is what makes a fairy tree-hop
  possible, and why the level design keeps tall ground out of her reach.
- **The Winter Wolf's speed:** 7 tiles a second, against the Bunny's 5. It is
  what thin ice needs. Long jumps stay the Bunny's (it hops about 6 tiles, the
  Wolf about 4), and outrunning bad guys is left out, because a machine cannot
  check it.
- **Thin ice:** it holds only under something moving 6 tiles a second or
  faster. Slower forms break through at once. A Wolf that stops breaks through
  after 0.15 seconds, so a stumble is forgiven. A broken sheet grows back after
  4 seconds.
- **The Wolf cannot help with Frostfang's own candles,** because it unlocks on
  the fifth. So the exit run is its showcase, and it needs all five forms.
- **Hop-then-fly is an official move:** a Bunny shifts to a Fairy at the top of
  a hop and keeps the height. The Needle and the tip of the Fang need it, and
  the checker and the route tests both know it.
- **Water can be at any height:** an island sets the level per tile, so a lake
  can sit high up, under thin ice.
- **The Frozen Falls are 2 tiles wide,** so a swimmer who falls in always has
  flat ice beside them to jump out onto, instead of being walled in.
- **Frostfang has no boulders and only eight trees,** all great pines. Anything
  raised is a launch pad for hop-then-fly, so loose rocks and ordinary trees
  would open shortcuts. The pines are the Orangutan's way up.
- **Snow is look-only:** the snow caps, frost and falling snow never change
  where you can stand.
- **A tiny space is a root tangle:** the world has one height per tile, so
  there are no tunnels. A tangle is a flag on a ground tile: a wall 100 high
  for everything taller than its gap (0.25), plain ground for the Ant (0.2
  tall). It gates by who fits, not by height, so no hop-then-fly or glide gets
  past it. The gap is a number, and the Snake's holes use the same rule with a
  wider gap.
- **No jumping and no shape-shifting inside a tangle,** so nobody ends up as a
  big form inside a wall.
- **Keeping it fair for a one-heart Ant:** bad guys cannot enter a tangle and
  arrows stop at it. All the bad guys of Underroot's way off stand before the
  Root Wall; past it there are none. A checkpoint stands before the wall, in
  the Yard and on the Crown. A fall costs one heart, which for the Ant is a
  faint, and a faint returns you with full hearts, so the Ant loses nothing
  extra by falling. The Yard and the Crown have bread, because changing out of
  the Ant leaves one heart.
- **The Ant cannot help with Underroot's own candles,** because it unlocks on
  the fifth. The way off needs it twice (the Root Wall and the Long Root), and
  uses only the Human, the Ant and the Fairy.
- **Underroot's glade is its lowest ground and is flat,** with no trees or
  boulders on it except the first tree of the Root Grove. Its raised places
  stand far apart, because a glide from high ground reaches a long way down.
- **No checkpoint on a rock whose only way off is a fall** (Pier Rock, Bough
  Rock, the Spire): a fall returns you to the last checkpoint, so one there
  would be a trap.
- **Thin leaves are thin ice:** on Underroot the thin sheets are leaf mats with
  the same rules.
- **Underwater is the water of a water tile:** a tile still has one height. On
  a water tile that height is the bed and the water level is the top, and a
  diver can be anywhere between. There are no caves and no overhangs.
- **Depth is the gate, not breath:** there is no breath timer. Each form has a
  dive depth: the Human 4, the Mermaid no limit, everyone else none. The
  checker and the real physics use the same numbers, so every pickle is proved.
- **Sea pickles sit 4 deep,** because a floater can already use things about 2
  deep (it floats 0.8 under the surface and reaches 1.5 up or down).
- **A kelp mat gates by who can dive under it,** like a tangle gates by who
  fits. A low mat hangs 2 deep (the Human fits), a deep one 5 (only the
  Mermaid). The water next to a mat is kept deep, so a swimmer held under it is
  never walled in.
- **The Mermaid cannot help with Saltmere's own pickles,** because she unlocks
  on the fifth. The way off needs only her.
- **The Mermaid's water powers work from the water onto the shore,** and in
  the water on Snappers and the Eel. The
  water shot (`Q`, 3 hearts, 9 tiles, stops at walls, 1 s between shots) and
  the bubble column (`R`, 4 hearts, 7 tiles, bursts 0.6 s after a ring of
  bubbles warns, 3 s between columns) both need her to be swimming. The Gate
  Pond on Sunveld is there so she can clear the gate guards from the water.
  No route needs the powers, because the checker ignores bad guys; the one
  place built for them is the Sunken Court's cell on Coilstone.
- **The Mermaid is slow on land (1.2) and cannot jump there.** She leaps only
  from the water's surface, which is enough to get onto a low shore.
- **Saltmere's beach is its lowest land and is flat.** Its rooms are sealed by
  closed rings (driftwood tangle, kelp), so the raised things inside them are
  not launch pads for the rest of the island. Only Salt Rock and the Stack
  stand in the open, and they are far apart.
- **No run-then-fly on Saltmere:** with a gap to fly at the top of the Salt
  Stair, Salt Rock's only way off would be a fall, and it has a checkpoint.
- **Saltmere has only three trees,** the great palms of Palm Key. An ordinary
  palm is 4 high, which a hop-then-fly can land on.
- **Salt crust is thin ice:** the Salt Stair's sheets have the same rules, and
  their own look.
- **The Cheetah's breath is short, not the plan's minute.** The plan says it
  runs for 1 minute and rests for 2. Here it runs for 8 seconds and rests for
  3.5, close to the Fairy's flying energy (4.5 and 2.2) and never more than
  twice it. A full breath is about 80 tiles. Breath drains only while the
  Cheetah moves and comes back while it stands still or is another shape. At
  nothing left it is winded: speed 3 until the bar is full again. A checkpoint
  does not give breath back, nor does a respawn or bread.
- **What only speed 10 can do:** brittle crust holds at 9 tiles a second or
  faster, so a Wolf (7) breaks it at once; and a timed gate stays open for a
  time only the Cheetah can make. Sunveld's gate gives 3.8 seconds for 31
  tiles: 3.2 for the Cheetah, 4.6 for the Wolf. The island tests check both
  sides of that margin for every gate.
- **A plate holds its gate open while someone stands on it,** and the seconds
  count from the moment they step off. A gate never closes on the player. A
  second plate close behind the gate lets anyone walk back.
- **A breaking sheet drops what is on it.** Before, a runner a little too slow
  could skim across breaking sheets without falling.
- **Two sword bad guys.** The plan has one kind: 5 hearts, a sword that does 4,
  appearing with the Cheetah. That is the heavy one: slow (2.4), with a wind-up
  of 0.8 seconds that glows, so there is time to step back. The light one is
  an addition: 3 hearts, 2 hearts a blow, wind-up 0.4 seconds, and speed 8:
  faster than the Wolf (7), slower than the Cheetah (10). At first it ran 5.5,
  and a Wolf could leave it behind; then 8.5, and in play even the Cheetah had
  trouble getting away. At 8 the Cheetah gains two tiles a second, and still
  nobody else gets away, but for anyone who reaches water. It also keeps running through its wind-up and follows 60
  tiles from its post (other bad guys stand still to strike and turn back at
  14), because a blow struck standing still never lands on a runner. It still
  gives up on anyone 11 tiles ahead, and it cannot find its way round a
  thicket. Both appear at level 7, so
  on Sunveld they guard the gate and the Kopje, and regular bad guys guard the
  candles.
- **The world's north and south edges are walls.** Outside the grid there was
  nothing solid, so a Fairy could leave it and fly around the end of a wall,
  which the checker, knowing only the grid, could not see.
- **Sunveld is flat, and its walls are out of reach.** All ordinary ground is
  at one height (16). West of the Red Wall nothing a player can stand on is
  higher than 25 unless a closed ring seals it, and the escarpment and the wall
  are at 31, more than a hop-then-fly above anything.
- **The Red Wall hides what stands close behind it** (the camera looks
  north-east), so the Yard's checkpoint and its plate stand well clear of it.
- **The Cheetah cannot help with Sunveld's own candles,** because it unlocks on
  the fifth. The way off needs it three times, and the Bunny once.
- **Six of the seven old forms are proved to have work on Sunveld:** take any
  one of the Fairy, Orangutan, Bunny, Wolf, Ant or Mermaid away and a candle
  goes out of reach (`src/islands/sunveld-forms.test.ts`). The Human is the
  exception: its work there is the sword fights, and the checker ignores bad
  guys.
- **A hole is a tangle with a wider gap (0.35),** so the Ant fits every hole
  the Snake fits. What only the Snake does is climb: it slides up a step of 1,
  and inside a hole nobody jumps, so the Ant stops at a rise of 0.75. Outside
  holes the tall step opens nothing, because every walker already jumps 1.2.
  Steps sit between hole tiles and a burrow's mouth is three flat tiles, so the
  Ant cannot jump onto the first rise from outside. The Ant can still walk down
  a burrow.
- **Venom lasts 20 seconds, not the plan's hour.** One bite makes any bad guy
  faint, whatever its hearts, with 1.5 seconds between bites. A fainted bad
  guy is not beaten: it wakes where it lies with the hearts it had. The puzzle
  screen stops the clock, so 20 seconds only has to cover getting past. No
  route needs the bite, because the checker ignores bad guys.
- **Sneaking is the Snake's alone.** A bad guy has a post facing (`facing` on
  its spot, west when not given) and turns back to it after walking home or
  waking. While it is idle it notices a Snake only in its front half (under 90
  degrees between its facing and the direction to the Snake); the distance and
  height limits are unchanged, and every other form is noticed from any side.
  Once it has noticed, or been hit, it behaves as before until it is idle
  again. The Foot's two guards look west, away from the Coil's mouth, so a
  Snake that comes round behind them reaches the burrow unseen
  (`src/sneak.test.ts`).
- **The Snake cannot help with Coilstone's own candles,** because it unlocks on
  the fifth. The way off needs only the Snake.
- **Coilstone's hub is flat, and its raised places were placed by reach.** All
  ordinary ground is at 12 on both sides of the Rift; the Landing is at 6, low
  enough for a hop, then a flight, from Sunset Rock. The Colonnade, the Table
  and the Spire stand in the open, each farther from the Rift, the Tooth and
  the mesa than a hop, then a flight, from its top can carry. The Sunken Court,
  the Tooth's ring and the Thicket are sealed by closed rings.
- **The Serpent's Head has no wall.** It is a sheer mesa 7.5 above the hub, out
  of every old form's reach, so nothing hides behind it.
- **Coilstone has no timed gate.** A gate needs a sealed court, and the only
  things that seal one (tangle, deep kelp) let the Ant or the Mermaid through.
  The Cheetah's work there is the Bridge: both east candles need it.
- **Six of the eight old forms are proved to have work of their own on
  Coilstone:** take away the Fairy, Orangutan, Bunny, Ant, Mermaid or Cheetah
  and a candle goes out of reach (`src/islands/coilstone-forms.test.ts`). The Human and the Wolf are the
  exceptions. The Human's work is the sword fights. The Wolf's work, the pier
  and the Stair, can also be done by the Cheetah, which runs on thin sheets
  too; the test proves only that one of the two runners is needed. In play the
  Wolf has no breath bar to run out.
- **The Sunken Court's guards are for the bubble column.** They stand in a
  closed cell in the islet's north-west corner: a floor of two tiles inside a
  wall one tile thick and 9.5 high (21.5), above a hop, then a flight, from the
  terrace (20.93). `src/islands/coilstone-court.test.ts` proves it with the real
  water powers: no water shot from any tile of the inner water hits a guard in
  the cell, the column from the water beats both, and the eight old forms on
  the generous setting stand on no tile of the cell or its walls. The cell
  stands in that corner because anywhere else its walls hid the terrace. The
  walls do hide the guards themselves from the camera; the hint at the Court
  says they are there. A guard that has noticed you still stops the speaker, so
  the fight matters.
- **What sets the Axolotl apart:** it has no dive limit, it moves through
  small spaces, and it hides in hollows. The plan gives it 5 hearts, a heart
  back every 3 seconds and a fast swim; those are built too. Regrowth runs
  only while you are the Axolotl, and the hearts stay when you shift, up to
  the new form's maximum.
- **A hollow is the small space under water.** It is a stone roof on a water
  tile that leaves 0.35 of water over the bed, the gap of a Snake hole. Getting
  in takes a body no taller than that which can also dive to the bed, and only
  the Axolotl is both. In the code a hollow is a kelp mat with almost no room
  under it, so being pulled under, not surfacing and not shifting all come
  from the kelp rules. With no dive limit the Axolotl also passes deep kelp,
  so from level 9 deep kelp is no longer the Mermaid's alone.
- **Hiding:** the Axolotl is hidden, as a Fairy is in her home, while it is
  under a hollow or inside a hole. A hidden Axolotl can still be hurt by a bad
  guy that is already next to it. No bad guy stands near the Well, so on
  Hollowfen hiding is not needed yet.
- **The Axolotl cannot help with Hollowfen's own candles,** because it unlocks
  on the fifth. The way off needs only the Axolotl. It floats 0.8 under the
  water, so getting out of the Well onto the Last Stone is a jump.
- **Hollowfen's Landing reaches west to x 1154,** not 1160 as first planned: on
  the easy setting a hop, then a flight, from the Serpent's Head comes down
  about 25 tiles out, less than the reach sum for a long drop promised. That
  leaves 24 tiles of sky between the islands.
- **Hollowfen's east half is Coilstone's, moved and renamed:** the Bridge, the
  Stair and a Snake burrow in a mesa stand as they do there, 205 columns
  farther east, because those shapes were already proved. What is new is the
  Well, and the west half's pool, ring and road.
- **Seven of the nine old forms are proved to have work of their own on
  Hollowfen:** take away the Fairy, Orangutan, Bunny, Ant, Mermaid, Cheetah or
  Snake and a candle goes out of reach
  (`src/islands/hollowfen-forms.test.ts`). The Human and the Wolf are the
  exceptions again, for the same reasons as on Coilstone.
- **Hollowfen has its own ground:** sedge, peat and chalk, used on no other
  island, and its thin sheets and brittle crust are reed mats. The look of the
  island and of the Axolotl (pink, with six gill stalks in rainbow colours) was
  built without being seen on a screen.
- **Wings glide, and only the Human has them.** The plan says level 10 gives
  wings that fly far, fast and without tiring. Here they are a glide, like a
  paraglider: far and fast, never up, and with nothing to run out. They are
  not an eleventh form and not for every form, so the Human, which the checker
  could never tell from the others, now has work that is its own: no hop and
  no flight carries 43 tiles.
- **A glide needs height, not a run.** A hop, then a flight, gains about one
  tile for each step of drop; a glide gains six. So what only wings reach is a
  low place far from high ground. Kestrel Rock is 11 under the heath and 43
  tiles out; a glide from the edge has about 30 tiles to spare, and the Crag
  (19.5) is a higher place to start from.
- **No shape-shifting on the wing.** Wings do not open after a change of shape
  in the air, and once they have opened there is no changing until you land.
  Without those two rules a Bunny's hop or a Fairy's flight could start a
  glide in mid-air and the checker would have to know every such mix.
- **The wings cannot help with Galecrest's own candles,** because they come
  with the fifth. The way off needs only the Human.
- **The Last Stone is a dead end.** The ring of hollows round it has no top,
  so nothing flies off it. The way to Galecrest starts from Hollowfen's east
  bank, which every form reaches. So that a player still needs the Axolotl to
  go on, the gate stands on Galecrest: the Windbreak.
- **The Windbreak is 18 high and crosses the whole island.** That is above a
  hop, then a flight, from the heath (12 + 4.93), so nothing gets onto it or
  over it, and the Sluice's hollows close the one opening. A wall hides what
  stands close behind it, so the Yard behind the wall is empty but for bread.
- **Galecrest's Court is 17 tiles from Hollowfen,** not the 24 to 30 first
  planned. Hollowfen's bank is at 12, and on the easy setting a hop, then a
  flight, from it comes down on ground at 5 no more than 19 tiles out.
- **A use for hiding:** two guards stand on the Court's bank by the Sluice.
  An Axolotl under the roof is hidden, and they give up; the whole-island test
  runs it with a real guard.
- **Seven of the ten forms are proved to have work of their own on
  Galecrest's candles:** take away the Fairy, Orangutan, Bunny, Ant, Cheetah,
  Snake or Axolotl and a candle goes out of reach
  (`src/islands/galecrest-whole.test.ts`). The Human and the Wolf are
  the exceptions as before, and the Mermaid too: the Tarn's pickle lies under
  a roof that only the Axolotl fits, and her work there, the Snappers, is a
  fight, which the checker ignores.
- **Galecrest's rooms are Hollowfen's, moved and renamed,** 207 columns
  farther east, because those shapes were already proved. What is new is the
  arrival (the Court, the Windbreak, the Sluice) and the way off.
- **A hub is filled with dips, never bumps.** In play Hollowfen and Galecrest
  were big and sparse. Anything raised is a launch pad, so what fills them is
  lower than the hub or has no top: ponds (4 deep, 0.3 under the rim, so a
  Human jumps out), dells (two walking steps down) and thickets (tangle).
  No candle's reach changed, and the old tests of both islands passed
  untouched but for their counts. Bad guys do not wade, so a pond is a safe
  place; a thicket stops them and their arrows. Lanes are left clear for a
  runner: the Bridges' run-ups, one across each west hub (z 38 to 41) and one
  down each east hub.
- **More bad guys in the open.** Hollowfen has 12 more (three blades, two
  archers), Galecrest 13 (four blades, two archers, a heavy sword). None
  stands within 10 tiles of an Ant's ring, 7 of a checkpoint or 12 of a way
  off.
- **Four hubs are filled now.** Sunveld and Coilstone got the same ponds,
  dells and thickets as Hollowfen and Galecrest, and more bad guys in the open:
  Sunveld 13 (four blades, one archer in the east; none in the west, where a
  one-heart Ant has work), Coilstone 11 (three blades, two archers). Sunveld's
  blades appear at level 7, so after its last candle. Lanes are left clear for
  a runner there too, and on Sunveld the whole south of the valley, where the
  Cheetah runs from the plate to the gate.
- **A holt is the Axolotl's treasure.** A pond 9 by 9 with a ring of hollows 2
  thick, a moat inside the ring and one stone in the middle with ten loaves on
  it. The ring has no top, so nothing hops, flies or glides in. There is one
  on Sunveld (the Lair), Coilstone (the Vault) and Hollowfen (the Holt), and
  two on Galecrest (the Kettle and the Cauldron). The first two are for coming
  back to: their hints say so.
- **The Tarn's pickle is the Axolotl's.** Galecrest's Tarn was Hollowfen's Reed
  Pool again, a pickle 8 deep for the Mermaid. Now a ring of hollows shuts the
  pickle's corner off, and the Mermaid does not fit under it. So the two water
  shapes each have work there: the Mermaid beats the Snappers in the open
  water, or the Axolotl slips past them and hides under the roof, where a
  Snapper gives up. The pickle stands in the far corner of its cell, because
  anywhere else the pool's rim hid it from the camera.
- **A new game at any time.** The title card offered it only when there was a
  save. The pause card has it now too. It asks once more, clears the save and
  loads the page again, which is the one sure way to put every bad guy, sheet,
  gate and the Lid back.
- **Kestrel Rock is no longer a trap.** Cinderhold's Landing lies 9 tiles east
  of it at the same height, a Fairy's flight. Wings are no use there: a glide
  never rises. A Fairy can also fly back from the Landing to the Rock.
- **The way back is the Kestrel Steps.** Five steps of scree north of the Rock,
  each 4 high: a Bunny's hop, and more than a Fairy rises. The top is at 21,
  nine above the heath, and a glide from it reaches the heath 46 tiles west.
  So the way back needs the Bunny and the wings, and the way out still needs
  the wings: from the heath nothing without them reaches the Rock or the Steps
  (`src/islands/galecrest-return.test.ts`). The Steps rise north, so they hide
  nothing from the camera.
- **Galecrest has its own ground:** heather, scree and quartz, used on no
  other island. Its look, and the wings', were built without being seen on a
  screen.
- **One arena, two fights.** The plan gives two boss stages, land and then
  underwater. Here they share one place: the lake lies under a stone floor,
  the Lid, and the floor falls when the Warden is beaten. So there is no water
  in the first fight (a Mermaid cannot shoot the Warden from a pond), and the
  second fight starts where the first one ended.
- **The Lid fills the Ring.** At first it was a round floor in the middle, 208
  tiles; play showed the second fight wanted more room. Now it is 872 tiles, a
  rectangle with round corners, and what is left of the Ring is a walk of ash
  four tiles wide. The checkpoint that stood in the Ring moved down onto the
  Climb, farther from the lake than the Eel spits, so nobody wakes up under
  fire.
- **The lid is a tile that changes.** A lid tile is built as water with a roof.
  While the lid is shut it is plain ground at the roof's height; `dropLid()`
  makes it the water it was built as, at once. Only the slab's picture lingers:
  it sinks and fades for under a second. The checker needs no new rule.
- **The credits pull the camera back** until the whole world, 1700 tiles of
  it, is in view (about 49 times the normal view on a wide screen), over 30
  seconds. Any key or a click ends them, except in the first half second, so
  the blow that won the game does not end them too. While they roll, puzzle
  bells ring at random, a little under one a second, and about one time in
  three a second or third bell rings into the first. They use only C, D, E, G,
  A and high C, so bells that overlap never clash.
- **The Stairs are for getting away, not for hiding.** Their steps are 1 high:
  a Human jumps them, a bad guy cannot (it steps up 0.35 at most). So the
  Warden throws rocks at anyone it cannot reach, and the Eel spits at anyone
  out of the water. The plan gives each boss one number, 5 hearts a blow; the
  thrown rock and the spit (3 hearts each) are additions.
- **The Warden gives up at 18 tiles.** A Human who gets up a Stair fast enough
  is left alone, and the Warden walks back to its post with the hearts it had.
  One that stays near the foot of the Stair has rocks thrown at it, and they
  hurt: a Human standing still there is beaten in about 20 seconds.
- **The Warden takes twelve blows.** The plan gives it 16 hearts, four blows
  of the level 10 sword, and in play that fight was over in two seconds. Now
  it has 60, walks at 3.2 (a Human at 4.6), and winds up and recovers faster.
  A Human who stands and swings faints in about 3 seconds with the Warden
  still on 20 hearts; one who walks out of every ring wins unhurt in about 26
  seconds. Its numbers are in one place (`WARDEN` in `src/forms.ts`).
- **Bosses must be easy to read.** In play the Eel was hard to see. Now a
  swimmer shows a pale wake on the surface over it at any depth, and a red
  streak along the path of its lunge while it glows, as the Warden shows its
  red ring. The Eel is twice as long as it was, and the Stairs have beacons.
- **Snappers are the Eel's small cousins.** One swimming behaviour, two sets
  of numbers (`EEL` and `SNAPPER` in `src/forms.ts`). A Snapper notices only a
  swimmer, so it never stops a speaker on the bank from being used, and it is
  no danger to an Ant on the shore. They stand by the pickles 8 deep, where
  only the Mermaid and the Axolotl go.
- **The Eel was the first bad guy in the water.** It and the Snappers swim; every other
  bad guy still stays out. It follows a swimmer's depth, so the Human's sword
  (the lake is 4 deep, a Human's dive) and the Mermaid's sword and water
  powers all reach it.
- **The Ring has a low rim** (0.6, more than a walking step), so nobody walks
  off the edge in a fight by accident. It can be jumped.
- **Cinderhold has no candles and no trees.** Level 10 needs no lights. Its
  ground is its own: ash, obsidian and coral. Its look, the bosses' and the
  credits' were built without being seen on a screen.
- **The credits:** game design Laura Elena Marsh-Leguia, coding Papa & Claude,
  play testing Mama (`CREDITS` in `src/forms.ts`).
- **Tangle strands are faint threads:** one thin, pale, see-through thread per
  tile, so the wall still reads as going up but hides nothing behind it.
- **Trees are solid:** a Human walks around them and arrows stop at them.
  Great trees are the tall ones (five steps against four), and the level
  designs rely on them: the Orangutan climbs them to cross the sky.

## Next

1. Play the filled hubs of Sunveld and Coilstone, the holts, the Tarn's roofed
   corner and the blades at speed 8: none of that has been played yet.
2. Work only the Wolf and only the Mermaid can do, that the checker can see.
3. Character customising.
4. More for the other forms to do on the ways off Underroot (Human, Ant and
   Fairy only), Saltmere (Mermaid only), Sunveld (Cheetah and Bunny only),
   Coilstone (Snake only), Hollowfen (Axolotl only) and Galecrest (Human
   only).
5. Rooms of its own for Galecrest, which repeats Hollowfen's.
