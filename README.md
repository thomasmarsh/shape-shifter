# Shape Shifter

A web game. You are a shape shifter stuck on a cloud island. Solve music
puzzles to free candle lights, collect enough lights to level up, and each
level lets you shift into a new creature.

The design lives in [`PLAN.md`](PLAN.md). This build is the **tutorial
island**: level 0 (Human) to level 1 (Fairy), ending when you fly across to
the next cloud island.

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
| `Space` | Jump. As a fairy, hold it to fly |
| Click or `J` | Swing your sword |
| `E` | Use things: speakers, candles |
| `F` | Eat a piece of bread (+1 heart) |
| `0`–`9` | Shape-shift (`0` Human, `1` Fairy, …) |
| `Q` | Fairy only: make a tiny home to hide in |
| `Esc` | Pause |

## What is in this build

- One cloud island with a meadow, a hill, a pond and a bluff, plus a resting
  cloud and the edge of the second island.
- Human (10 hearts, wooden sword) and Fairy (3 hearts, short slow flight,
  fairy home). Hearts cap at the form's maximum when you shift and only come
  back by eating.
- 100 bread to start, more to find.
- Regular bad guys (9 hearts, 1 heart per punch), including two slower
  "testers" on the training ground.
- Three music puzzles (3, 4 and 5 notes), each guarding a candle.
- Checkpoints, falling off the island, fainting and respawning.
- A form bar with all ten forms; the eight later ones show as locked.
- Progress saves in the browser.

## Where things are

```
src/
  main.ts       starts the game
  game.ts       the loop, camera, saving, hints, and what happens when
  world.ts      the island: terrain, heights, where everything is placed
  forms.ts      the ten forms and level rules, as a data table
  player.ts     movement, flying, sword, hearts, shape-shifting
  enemy.ts      the regular bad guy
  things.ts     puzzle speakers, candles, checkpoints, bread
  puzzleUi.ts   the music puzzle screen
  hud.ts        hearts, form bar, hints, title and level-up cards
  models.ts     every character and object, built from coloured boxes
  audio.ts      notes and sound effects, made in code
  particles.ts  sparkles and puffs
  input.ts      keyboard and mouse
  save.ts       saving to the browser
```

To change the island, edit `shapeTerrain()` and `placeThings()` in
`src/world.ts`. To change a form's hearts or speed, edit `src/forms.ts`.

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

## Next

1. Second island: 4 candles, Orangutan (tree climbing), stone sword.
2. Third island: Bunny, and archers start to appear.
3. Water areas you can dive into, sea pickles, Mermaid and Axolotl.
4. Sword bad guys, the two bosses, wings and character customising.
