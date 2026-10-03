# Shape Shifter

A web game. You are a shape shifter stuck on a cloud island. Solve music
puzzles to free candle lights, collect enough lights to level up, and each
level lets you shift into a new creature.

The design lives in [`PLAN.md`](PLAN.md). This build has **five islands** to
play, from level 0 (Human) to level 5 (Ant), and a small sandy stub of a sixth
island at the end where it stops for now.

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
| Click or `J` | Swing your sword (Human and Orangutan) |
| `E` | Use things: speakers, candles |
| `F` | Eat a piece of bread (+1 heart) |
| `0`–`9` | Shape-shift (`0` Human, `1` Fairy, `2` Orangutan, `3` Bunny, `4` Winter Wolf, `5` Ant, …) |
| `Q` | Fairy only: make a tiny home to hide in |
| `Esc` | Pause |

**Orangutan:** walk into a tree trunk and keep pushing to climb it. At the top
you stand on the tree, and from a treetop you can jump to the next tree and
grab it. The great trees (the tall ones) are the ones the islands are built
around. You can climb 20 trees in a row, then you must touch the ground before
you can climb more; the bar under your hearts counts them.

**Winter Wolf:** the fastest form so far. Thin ice only holds something that
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
- **Saltmere** (the end, for now): a small sandy stub where the game stops. It
  is the home of the Mermaid.
- Six forms: Human (10 hearts, wooden sword), Fairy (3 hearts, short slow
  flight, fairy home), Orangutan (7 hearts, climbs trees, weaker stone sword),
  Bunny (4 hearts, huge hops, no sword), Winter Wolf (12 hearts, the fastest
  so far, no sword, runs on thin ice) and Ant (1 heart, slow, no sword, fits
  into root tangles). Hearts cap at the form's maximum when
  you shift and only come back by eating.
- 100 bread to start, more to find.
- Two kinds of bad guy. Regular ones (9 hearts, 1 heart per punch), including
  two slower "testers" on the training ground, and archers (8 hearts) who
  appear once you reach level 3.
- Twenty-two music puzzles (3, 4 and 5 notes on Meadow Island, then 4 to 6 notes
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
                thin ice, root tangles, meshes
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
    saltmere.ts       the stub of island 6, the smallest island to copy
    scatter.ts    sprinkles ordinary trees over an island's grass
  forms.ts      the ten forms and level rules, as a data table
  player.ts     movement, flying, climbing, hopping, running on ice, fitting into
                tangles, sword, hearts, shape-shifting
  enemy.ts      the regular bad guy and the archer
  arrows.ts     arrows in flight
  things.ts     puzzle speakers, candles, checkpoints, bread
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
                root tangles)
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
   `src/islands/saltmere.ts` for the smallest one) and add it to the list in
   `src/islands/index.ts`. Leave a gap of sky between islands. Besides
   `t.set(i, j, height, kind)`, `build(t)` can lay water at any height with
   `t.setWater(i, j, wet, level)`, and a sheet of thin ice at any height with
   `t.setThinIce(i, j, height)`, and turn a ground tile into a root tangle with
   `t.setTangle(i, j)`. An island can also be built in two files, as Frostfang
   and Underroot are: its file calls a builder from the other and merges the
   result.
2. Run `npm run map -- --island=<name>` to look at it, and
   `npm run map -- --island=<name> --reach=human,fairy --from=x,z` to see what
   those forms can reach from a spot.
3. Write a test next to it (copy `src/islands/highcrag.test.ts`) saying who
   should and should not reach each place. Run `npm test`.

## Checking levels

Levels are checked by machine, because a puzzle that needs a jump nobody can
make is easy to build by accident. `src/levelcheck.ts` is a level checker: give
it a world, a starting spot and a set of forms, and it says which places those
forms can reach (an easy setting for "a person can do this" and a generous
one for "nobody can do this"). The route tests in `src/routes.test.ts` back it
up by really flying and climbing the hard routes with the real physics, using
the scripted player in `src/pilot.ts`. `npm run map` prints the islands as
ASCII maps (heights, things, thin ice, root tangles, and reachable ground) so you can see a
layout before you run the game, for example
`npm run map -- --island=frostfang --reach=human,fairy,orangutan,bunny --from=208.5,40.5`.

The checker knows four things beyond walking, hopping, flying and climbing:

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

The route tests for Underroot sit next to the island, in
`src/islands/underroot.routes.test.ts` and
`src/islands/underroot-east.routes.test.ts`.

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
game.debug.takeLight(7)      // take a candle's light at once (0 to 21)
```

Candles are numbered in the order of the islands: 0 to 2 Meadow Island, 3 to 6
Tanglewood, 7 to 11 Highcrag, 12 to 16 Frostfang, 17 to 21 Underroot.

Checkpoint names: `meadow`, `middle`, `bluff`, `far-island`, `tw-cross`,
`tw-south`, `tw-grove`, `hc-prow`, `hc-south`, `hc-north`, `hc-east`,
`hc-stair`, `frostfang`, `ff-north`, `ff-south`, `ff-lake`, `ff-glacier`,
`ff-brow`, `ff-last`, `underroot`, `ur-mat`, `ur-glade`, `ur-mid`, `ur-grove`,
`ur-wall`, `ur-yard`, `ur-crown`, `saltmere`.

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
  past it. The gap is a number, so the Snake's bigger holes can use the same
  rule later.
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
- **Trees are solid:** a Human walks around them and arrows stop at them.
  Great trees are the tall ones (five steps against four), and the level
  designs rely on them: the Orangutan climbs them to cross the sky.

## Next

1. Water areas you can dive into, sea pickles and the Mermaid (level 6), on
   Saltmere, the next island (only a stub for now). Then the Axolotl.
2. Cheetah, and the sword bad guys that come with it.
3. Snake, and small holes that are bigger than a tangle's gap.
4. The two bosses (land, then underwater), level 11 and the end of the game.
5. Wings (level 10) and character customising.
6. More for the other forms to do on Underroot's way off, which today uses only
   the Human, the Ant and the Fairy.
