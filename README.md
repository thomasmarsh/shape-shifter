# Shape Shifter

A web game. You are a shape shifter stuck on a cloud island. Solve music
puzzles to free candle lights, collect enough lights to level up, and each
level lets you shift into a new creature.

The design lives in [`PLAN.md`](PLAN.md). This build has **three islands** to
play, from level 0 (Human) to level 3 (Bunny), and a small snowy stub of a
fourth island at the end where it stops for now.

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
| `0`–`9` | Shape-shift (`0` Human, `1` Fairy, `2` Orangutan, `3` Bunny, …) |
| `Q` | Fairy only: make a tiny home to hide in |
| `Esc` | Pause |

**Orangutan:** walk into a tree trunk and keep pushing to climb it. At the top
you stand on the tree, and from a treetop you can jump to the next tree and
grab it. The great trees (the tall ones) are the ones the islands are built
around. You can climb 20 trees in a row, then you must touch the ground before
you can climb more; the bar under your hearts counts them.

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
- **Frostfang**: only a small snowy stub so far, to say the game goes on.
- Four forms: Human (10 hearts, wooden sword), Fairy (3 hearts, short slow
  flight, fairy home), Orangutan (7 hearts, climbs trees, weaker stone sword)
  and Bunny (4 hearts, huge hops, no sword). Hearts cap at the form's maximum
  when you shift and only come back by eating.
- 100 bread to start, more to find.
- Two kinds of bad guy. Regular ones (9 hearts, 1 heart per punch), including
  two slower "testers" on the training ground, and archers (8 hearts) who
  appear once you reach level 3.
- Twelve music puzzles (3, 4 and 5 notes on Meadow Island, then 4 to 6 notes
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
  world.ts      builds the whole world from the islands: terrain, heights, meshes
  layout.ts     the shared words of a level: tile kinds, spots, hints, arrivals
  islands/      one file per island, plus the tests for the island
    index.ts      the list of islands, in build order
    meadow.ts  tanglewood.ts  highcrag.ts  frostfang.ts
    scatter.ts    sprinkles ordinary trees over an island's grass
  forms.ts      the ten forms and level rules, as a data table
  player.ts     movement, flying, climbing, hopping, sword, hearts, shape-shifting
  enemy.ts      the regular bad guy and the archer
  arrows.ts     arrows in flight
  things.ts     puzzle speakers, candles, checkpoints, bread
  puzzleUi.ts   the music puzzle screen
  hud.ts        hearts, form bar, meters, hints, title and level-up cards
  models.ts     every character and object, built from coloured boxes
  audio.ts      notes and sound effects, made in code
  particles.ts  sparkles and puffs
  input.ts      keyboard and mouse
  save.ts       saving to the browser
  levelcheck.ts the level checker: which places each set of forms can reach
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
   `src/islands/frostfang.ts` for the smallest one) and add it to the list in
   `src/islands/index.ts`. Leave a gap of sky between islands.
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
ASCII maps (heights, things, and reachable ground) so you can see a layout
before you run the game.

## Trying later islands

The game is in `window.game` in the browser console. Handy while building:

```js
game.debug.warp('hc-prow')   // stand on a checkpoint
game.debug.setLevel(3)       // become level 3 (then press 3 for the Bunny)
game.debug.takeLight(7)      // take a candle's light at once (0 to 11)
```

Checkpoint names: `meadow`, `middle`, `bluff`, `far-island`, `tw-cross`,
`tw-south`, `tw-grove`, `hc-prow`, `hc-south`, `hc-north`, `hc-east`,
`hc-stair`, `frostfang`.

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
- **Trees are solid:** a Human walks around them and arrows stop at them.
  Great trees are the tall ones (five steps against four), and the level
  designs rely on them: the Orangutan climbs them to cross the sky.

## Next

1. Frostfang for real: the Winter Wolf island (level 4).
2. Ant (level 5) and the tiny spaces only it can enter.
3. Water areas you can dive into, sea pickles and the Mermaid, then the Axolotl.
4. Cheetah, and the sword bad guys that come with it.
5. Snake.
6. The two bosses (land, then underwater), level 11 and the end of the game.
7. Wings (level 10) and character customising.
