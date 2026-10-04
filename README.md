# Shape Shifter

A web game. You are a shape shifter stuck on a cloud island. Solve music
puzzles to free candle lights, collect enough lights to level up, and each
level lets you shift into a new creature.

The design lives in [`PLAN.md`](PLAN.md). This build has **eight islands** to
play, from level 0 (Human) to level 8 (Snake). It stops for now on the
Serpent's Head, at the far end of the eighth island.

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
| `Space` | Jump. Hold it as a fairy to fly, or as a bunny to hop high (tap for a small hop) |
| Click or `J` | Swing your sword (Human and Orangutan). As a Snake: bite |
| `E` | Use things: speakers, candles |
| `F` | Eat a piece of bread (+1 heart) |
| `Shift` | Dive, as a Human or a Mermaid. Hold it to sink, let go to float back up |
| `0`–`9` | Shape-shift (`0` Human, `1` Fairy, `2` Orangutan, `3` Bunny, `4` Winter Wolf, `5` Ant, `6` Mermaid, `7` Cheetah, `8` Snake, …) |
| `Q` | Fairy: make a tiny home to hide in. Mermaid, in the water: shoot water at the nearest bad guy |
| `R` | Mermaid, in the water: raise a bubble column under the nearest bad guy |
| `Esc` | Pause |

**Orangutan:** walk into a tree trunk and keep pushing to climb it. At the top
you stand on the tree, and from a treetop you can jump to the next tree and
grab it. The great trees (the tall ones) are the ones the islands are built
around. You can climb 20 trees in a row, then you must touch the ground before
you can climb more; the bar under your hearts counts them.

**Winter Wolf:** fast, and the first form that can run on thin ice. Thin ice only holds something that
is running, so keep running and do not stop. A wolf that stops, or is slowed
by bumping into something, will fall through. Over the lake it then has to
swim out and try again; over the sky it falls. Jump gaps in the ice at a run.
Thin ice grows back a few seconds after it breaks.

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
the water goes, and fits under the deep kelp that nothing else can pass. Her
sword only works while she is in the water. On land she is very slow and cannot
jump, but she can leap out of the water onto a low shore. While she swims she
has two water powers. `Q` shoots a ball of water at the nearest bad guy within
9 tiles (3 hearts, it stops at walls). `R` raises a bubble column under the
nearest bad guy within 7 tiles: a ring of bubbles warns for a moment, then it
bursts and does 4 hearts to every bad guy in it. Bad guys stay out of the
water, so from a pond she can clear a shore without being touched.

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
had.

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
  Sunset Rock, where the game stops for now. One breath covers each run but not
  two in a row, so the Cheetah has to rest in the Yard and on the Terrace.
- **Coilstone** (level 7, then 8): a ruined city of blue-grey slate, split down
  the middle by the Rift, with a mesa of dark basalt, the Serpent's Head, at its
  east end. You land low and walk up a ramp. Five candles: the Sunken Court (a
  Mermaid under a ring of deep kelp, guards behind a wall that she can beat
  from the water with the bubble column, a Bunny up a terrace), the Colonnade
  (a fight, an Orangutan along two great banyans, a Fairy across to a pillar),
  the Tooth (a run down a pier of slate slabs that turns into a Fairy at the
  end without stopping, then an Ant through a ring of fallen stone), the Stair
  (a fight, a run up a stair of slabs, then hop, then fly, to a spire) and the
  Thicket (a sword fight, an Ant through a ring, an Orangutan up a banyan). The
  last two stand east of the Rift, and the only way over is the Bridge of
  brittle stone, which takes the Cheetah. The fifth candle gives the Snake, and
  the Snake is what the way off needs: past two heavy sword bad guys at the
  Foot and up the Coil, a burrow of ten tall steps in the mesa's west face, to
  the Serpent's Head, where the game stops for now.
- Nine forms: Human (10 hearts, wooden sword, dives), Fairy (3 hearts, short
  slow flight, fairy home), Orangutan (7 hearts, climbs trees, weaker stone
  sword), Bunny (4 hearts, huge hops, no sword), Winter Wolf (12 hearts, the
  fast, no sword, runs on thin ice), Ant (1 heart, slow, no
  sword, fits into root tangles), Mermaid (15 hearts, swims fast, dives
  without limit, sword and two water powers only in water), Cheetah (11
  hearts, the fastest of all while its breath lasts, no sword, runs on brittle
  crust) and Snake (6 hearts, slow, no sword, fits into holes, slides up tall
  steps, a bite that makes bad guys faint). Hearts cap at the form's maximum when
  you shift and only come back by eating.
- 100 bread to start, more to find.
- Four kinds of bad guy. Regular ones (9 hearts, 1 heart per punch), including
  two slower "testers" on the training ground, archers (8 hearts) who
  appear once you reach level 3, and two kinds with a sword who appear once you
  reach level 7: a heavy one (5 hearts, slow, a long wind-up, 4 hearts a blow)
  and a light one (3 hearts, faster than a Human, a short wind-up, 2 hearts a
  blow).
- Thirty-seven music puzzles (3, 4 and 5 notes on Meadow Island, then 4 to 6 notes
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
                thin ice, root tangles, kelp mats, meshes
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
    testkit.ts    the checks every island's tests repeat (closed rings, guard
                  and archer distances, things on real ground, ids, melodies,
                  the camera, a way out from every respawn spot, gate timing)
    scatter.ts    sprinkles ordinary trees over an island's grass
  forms.ts      the ten forms and level rules, as a data table
  player.ts     movement, flying, climbing, hopping, running on ice, fitting into
                tangles and holes, swimming and diving, breath, sword, bite,
                hearts, shape-shifting
  enemy.ts      the regular bad guy, the archer and the two sword bad guys, and
                how they faint
  arrows.ts     arrows in flight
  waterpowers.ts  the Mermaid's water shot and bubble column
  things.ts     puzzle speakers, candles and sea pickles, checkpoints, bread
  puzzleUi.ts   the music puzzle screen
  hud.ts        hearts, form bar, meters, hints, title and level-up cards
  models.ts     every character and object, built from coloured boxes
  frost.ts      the look of Frostfang: snow caps, frost and falling snow (looks only)
  audio.ts      notes and sound effects, made in code
  particles.ts  sparkles and puffs
  input.ts      keyboard and mouse
  save.ts       saving to the browser
  levelcheck.ts the level checker: which places each set of forms can reach
                (it knows the Winter Wolf, thin ice, hop-then-fly, the Ant and
                root tangles, diving, kelp mats, the Mermaid, the Cheetah,
                brittle crust, timed gates, the Snake and holes)
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
   float a kelp mat on a water tile with `t.setKelp(i, j, depth)`. On a water tile the height you set is the bed. A
   candle placed on a water tile is a sea pickle. An island can also be built
   in two files, as Frostfang, Underroot, Saltmere, Sunveld and Coilstone are: its file calls a builder from the other and merges the
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
ASCII maps (heights, things, thin ice, root tangles, holes, kelp mats, water
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
- **Bad guys are ignored.** The checker proves where they stand (not near a
  checkpoint or a respawn spot, not where the player must be an Ant), never
  that a fight is fair.

The route tests for Underroot, Saltmere, Sunveld and Coilstone sit next to the
islands, in `src/islands/*.routes.test.ts`. The Cheetah's own route tests
(brittle runs, a timed gate, breath) are in `src/cheetah.routes.test.ts`, and
the Snake's (a stepped burrow) in `src/snake.routes.test.ts`.

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
game.debug.takeLight(7)      // take a candle's light at once (0 to 36)
```

Candles are numbered in the order of the islands: 0 to 2 Meadow Island, 3 to 6
Tanglewood, 7 to 11 Highcrag, 12 to 16 Frostfang, 17 to 21 Underroot, 22 to 26
Saltmere, 27 to 31 Sunveld, 32 to 36 Coilstone.

Checkpoint names: `meadow`, `middle`, `bluff`, `far-island`, `tw-cross`,
`tw-south`, `tw-grove`, `hc-prow`, `hc-south`, `hc-north`, `hc-east`,
`hc-stair`, `frostfang`, `ff-north`, `ff-south`, `ff-lake`, `ff-glacier`,
`ff-brow`, `ff-last`, `underroot`, `ur-mat`, `ur-glade`, `ur-mid`, `ur-grove`,
`ur-wall`, `ur-yard`, `ur-crown`, `saltmere`, `sm-mid`, `sm-east`, `sm-nest`,
`sm-salt`, `sm-key`, `sm-pearl`, `sunveld`, `sv-mid`, `sv-table`, `sv-east`,
`sv-kraal`, `sv-yard`, `sv-kopje`, `sv-end`, `coilstone`, `cs-hub`, `cs-court`,
`cs-rim`, `cs-far`, `cs-foot`, `cs-end`.

## Decisions the plan did not spell out

These were chosen to get a playable build. Change any of them freely.

- **Candles per level:** 3, then 4, then 5 for every level after.
- **Level 11:** earned by beating both bosses; that ends the game.
- **Sword damage:** wooden 2, stone 3, iron 4, diamond 5 hearts. An orangutan
  does one less.
- **Bread:** one piece restores one heart.
- **Forms with no attack** cannot hurt bad guys; they run, hide or shift.
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
- **The Mermaid's water powers work from the water onto the shore.** Bad guys
  stay out of the water, so there is nothing under water to fight yet. The
  water shot (`Q`, 3 hearts, 9 tiles, stops at walls, 1 s between shots) and
  the bubble column (`R`, 4 hearts, 7 tiles, bursts 0.6 s after a ring of
  bubbles warns, 3 s between columns) both need her to be swimming. The Gate
  Pond on Sunveld is there so she can clear the gate guards from the water.
  Nothing in a level needs the powers, because the checker ignores bad guys.
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
  an addition: 3 hearts, 2 hearts a blow, speed 5.5 (faster than a Human or a
  Bunny, slower than a Wolf), wind-up 0.4 seconds. Both appear at level 7, so
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
  pocket walled on three sides, 2 to 5 tiles from the inner water. The column
  rises under the nearest bad guy within 7 tiles on the flat and ignores walls.
  This is a layout, not a proof.
- **Tangle strands are faint threads:** one thin, pale, see-through thread per
  tile, so the wall still reads as going up but hides nothing behind it.
- **Trees are solid:** a Human walks around them and arrows stop at them.
  Great trees are the tall ones (five steps against four), and the level
  designs rely on them: the Orangutan climbs them to cross the sky.

## Next

1. The island after the Serpent's Head, with the Axolotl (level 9).
2. Bad guys that can be fought in the water, for the Mermaid's powers.
3. Work only the Wolf and only the Human can do, that the checker can see.
4. The two bosses (land, then underwater), level 11 and the end of the game.
5. Wings (level 10) and character customising.
6. More for the other forms to do on the ways off Underroot (Human, Ant and
   Fairy only), Saltmere (Mermaid only), Sunveld (Cheetah and Bunny only) and
   Coilstone (Snake only).
