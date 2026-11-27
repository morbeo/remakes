# Threadline

A browser remake of the 1990 DOS game The Amazing Spider-Man (Oxford Digital Enterprises / Paragon): a flip-screen puzzle platformer where the hero crawls up walls and along ceilings, swings on a web line, trips switches and fights traps on the way to a rescue. Everything here is original: the hero (Wren), the villain (the Projectionist), the film-lot setting, the rooms, the art and the sound. Graphics are drawn in code and sound is synthesised, so the page works offline from one file.

## Play

The Projectionist has tied up the crew of the Lumen Lot inside their own sets. Work through four sets of three rooms and free the crew member at the end of each; your brother Ossie is in the last one. Rooms flip like screens: walk off an open edge to reach the next one.

| | |
| --- | --- |
| Move | Arrows or `W` `A` `S` `D` move along whatever surface Wren is on: floor, wall or ceiling. The arrow pointing into the surface crouches, the one pointing away stands up, and pressed again while standing leaves the surface |
| Climb | Walk into a rough wall, or press `↑` facing one. Press `↑` in a jump to grab a ceiling |
| Jump | `↑` on a floor with no wall to climb, or `Z`, `Space` or `J` from any surface. Hold for a full jump, tap for a hop |
| Web | Hold `X` (or `K`, `C`) and press an arrow to fire that way, or tap `X` alone to fire straight ahead (away from a wall you cling to). Arrows only aim while `X` is held. A click or tap on the screen fires at that spot. Fire again to let go. No webs while crouching |
| Swing | A line fired from a surface hangs slack; jump or step off to swing on it. `←` `→` pump, `↑` `↓` climb up or down the line |
| Restart room | `R` (free; use it if a crate gets stuck) |
| Pause / mute | `P` or `Esc` / `M` |
| Touch | On-screen pad, WEB and JUMP buttons (hold WEB and press a direction to aim); tap the screen to fire at a spot |
| Gamepad | D-pad or stick moves, A jumps, X/B/RT fires the web, Start pauses |

## Rules

- **Energy** (red bar) drops on spikes (25), beams (30), the live rail (34), robots and drones (20) and turret shots (15). At zero you lose a life and the room restarts from where you entered it. Three lives per set; a set restarts when they run out. Hearts refill 35 energy.
- **The web never runs out** and has no range limit: the line flies until it hits something.
- **Rough brick** holds a climber and a web. **Glass** holds neither. The **live rail** shocks on touch.
- A web that hits a **switch** flips it; walking into one flips it too. A web that hits a robot, drone or turret ties it up for a few seconds.
- **Gates** (striped) open while their colour's switch is on. **Beams** come in two kinds: dotted when off, solid when on; some go off with their switch, some come on with it.
- **Crates** push when you walk into them. A purple gate stays open while something sits on its **plate**, a one-tile notch in the floor.
- The web line is instant and never tugs you: it lands the moment you fire, and only swinging or climbing it moves you. Climb up the line with `↑` before swinging low over spikes.
- Crouching makes Wren half as tall, so low gaps need it.
- Movement keeps its momentum: runs accelerate and skid, swing speed carries into the jump and the landing, and a short tap of jump gives a short hop.
- Freeing a crew member unlocks the next set on the title screen (saved in the browser).

## Layout

`index.html` holds everything: the room maps (30 by 18 tiles, as strings at the top of the script with a legend), the physics (fixed 60 Hz step; ground, air, wall, ceiling and swing states), actors, drawing and the UI. `?set=2&room=3` jumps straight to a room for testing. `window.TL` exposes the state and a `sim(frames)` stepper for scripted tests and the screenshot recipe.
