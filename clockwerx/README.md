# ClockWerx

Browser remake of ClockWerx (Callisto / Spectrum HoloByte, 1995). Open `index.html` to play: one file, no libraries, all graphics drawn in code and all sound synthesised.

Swing, flip and bounce a gold clock hand from dot to dot until it grabs the goal. The game has 100 levels in 10 stages, four difficulties, one or two players, and every element from the original manual: enemy hands, spikes, walls, doors and switches, oil globs, lighters, fuses and bombs, guns, wallbusters, and moving, extended, ring, slowdown, way-station, death, hyper, shield and up/down dots.

## Controls

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Swing | `X` `.` | `2` `6` or `↓` |
| Bounce | `Z` `/` | `3` `5` or `→` |
| Flip | `Shift` | `1` `4` `+` or `←` |
| Reverse | `Space` | `Enter` `0` or `↑` |

`P` pauses, `R` restarts the level, `K` skips it, `I` toggles the swing indicator and `F1` opens help. Mouse and touch work too.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The built game |
| `src/sim.js` | Deterministic simulation shared by the game, the solver and the generator |
| `src/app.js` | Menus, game flow, input, audio and rendering |
| `src/shell.html` | Page markup and styles |
| `src/levels.src.js` | Stage plan, hand-made showcase levels, level names |
| `src/levels.json` | All 100 levels, as built by the generator |
| `tools/` | Build, generate, verify and smoke-test scripts |

## Tools

Node 18+ for the tools; Python with Playwright for the smoke tests.

```sh
node tools/build.js                    # rebuild index.html from src/
node tools/build.js --fragment --out x.html   # body-only page for hosts that add their own <head>
node tools/verify.js                   # solve every level on C E M H; exits 1 if any fails
node tools/verify.js M --only 31,52    # one difficulty, some levels
node tools/generate.js                 # regenerate missing slots in src/levels.json
node tools/generate.js --only 76       # redo specific slots
CW_BUDGET=90000 node tools/generate.js --only 78   # bigger solver budget for hard slots
python3 tools/smoke.py index.html shots 1,31       # headless run with screenshots
```

Every level is checked by a breadth-first solver over the player's choices at each quarter turn. The solver never reverses between marks and ignores hourglasses, so a level it can beat is beatable by a careful player.

Levels are original; none of the 1995 level layouts are reproduced.
