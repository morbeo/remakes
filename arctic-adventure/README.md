# Polar Delve

A browser remake of Arctic Adventure: a single-screen platformer through ten ice caves. Grab the treasure and keys, deal with the cave's wildlife and reach the igloo on every screen. Graphics are pixel art drawn in code and every sound is synthesised, so the page works offline from one file (the web fonts fall back to system ones).

Play: open `index.html`, or https://morbeo.github.io/remakes/arctic-adventure/

## Controls

| | Keyboard | Touch |
| --- | --- | --- |
| Walk | `←` `→` or `A` `D` | d-pad |
| Climb ladders | `↑` `↓` or `W` `S` | d-pad |
| Jump | `Space`, `Z` or `↑` | Jump |
| Throw a spear | `X`, `F` or `Ctrl` | Spear |
| Swing the pickaxe | `C`, `V` or `Shift` | Pick |
| Pause | `P` or `Esc` | Pause button |
| Retry the screen (costs a life) | `R` | |
| Sound on/off | `M` | Sound button |

On a phone the pad appears below the cave; in landscape it floats over the sides of the screen. The key legend under the cave shows the same keys.

## Play

Each cave is one screen. Walk to the igloo to clear it for 1000 points; the treasure on the way is optional but is where the score comes from.

- **Treasure:** sapphire 100, ruby 250, gold idol 500. A key is worth 50 and opens one locked door.
- **Spears** (3 per pick-up) stop penguins (100), polar bears (300), bats (150) and spiders (150). Shooting an icicle off the ceiling is worth 50.
- **Pickaxes** (2 per pick-up) break cracked ice. Spears and pickaxes are carried between caves.
- **Hazards:** ice spikes and freezing water kill on touch, and so does any creature. Ice is slippery; ice ledges can be jumped up through.
- Three lives. An extra life comes every 10,000 points, plus 1UP pick-ups in the caves.

The title card lists the ten caves (Base Camp, Ice Shelf, Frozen Hall, Penguin Run, Crevasse, Pick and Shovel, Icicle Gallery, Bear Den, Spider Vault, Viking Hoard); a cave unlocks when the one before it is cleared. Unlocked caves, cleared caves, the best score and the sound setting are saved in the browser.

## Layout

- `index.html`: the whole game, in one file. The cave map legend and the `LEVELS` array (20 by 12 tiles of 16 px, drawn as text rows) sit near the top of the script.
- Script sections, in order: helpers, sound (PC-speaker style beeps through Web Audio), sprites (pixel art written as strings and outlined in code), tile textures, game state, input, physics (movement, collisions, enemies, spears), rendering, HUD and overlays, and the main loop.
- `screenshot.webp`: the thumbnail on the landing page; regenerate it with `python3 tools/screenshots.py arctic-adventure`.
