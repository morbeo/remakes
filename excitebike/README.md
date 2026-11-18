# Heatline MX

A browser remake of Excite Bike: four-lane dirt motocross against five CPU riders. Hit the ramps, land on your wheels and keep the engine out of the red. Tracks are generated from a seed, graphics are drawn in code and every sound is synthesised, so the page works offline from one file (the web fonts fall back to system ones).

Play: open `index.html`, or https://morbeo.github.io/remakes/excitebike/

## Controls

| | Keyboard | Touch |
| --- | --- | --- |
| Gas | `Z`, `J` or `Space` | Gas |
| Turbo (heats the engine) | `X`, `K` or `Shift` | Turbo |
| Change lane | `↑` `↓` or `W` `S` | ▲ ▼ |
| Lean back / forward in the air | `←` `→` or `A` `D` | ◀ ▶ |
| Pause | `P` or `Esc` | II |
| Restart | `R` | Restart button |
| New track | `N` | New track button |
| Sound on/off | `M` | Sound button |
| Course editor | `E` | Editor button |

Press gas on the title screen to start. In landscape on a phone the pad floats over the sides of the track.

## Play

You and five CPU riders race to the finish line over a run of ramps, humps and whoops. Gas holds a cruising speed and turbo goes faster but heats the engine, which cools off when you coast or brake. If it reaches 100 the engine cuts out for a moment. Land on your wheels: touching down at a bad angle is a wipeout, while landing on top of a rival takes them down.

- **Mud** slows the lanes it covers and heats the engine faster.
- **Coolers** cool the engine in the lanes they cover.
- The best time per track is saved in the browser, and the end screen shows your clean landings, takedowns, wipeouts and overheats.

The **Track** box takes a number, any word or a course code (`e-…`); **New track** picks a random seed from 1 to 9999, and a track can be loaded from the page address as `#<seed or code>`.

## Course editor

**Editor** (or `E`) builds a course from pieces: Flat, Hump, Small ramp, Ramp, Big ramp, Tabletop, Gap jump, Whoops, Kicker, Plateau, Double, Mud and Cooler. `A` to `M` adds a piece, `←` `→` select, `Delete` removes, `R` switches between insert and replace, `1` to `4` choose which lanes Mud and Cooler cover (lane 1 is the far lane), `Enter` test-rides and `Esc` closes. The course code under the strip (up to 80 pieces) can be copied and pasted into the Track box to race it.

## Layout

- `index.html`: the whole game, in one file.
- Script sections, in order: constants, canvas, helpers, track generation, course pieces and codes, riders and physics, effects, state, input, audio, update, drawing (background, track, riders), HUD and overlays, the course editor, and the main loop.
- `screenshot.webp`: the thumbnail on the landing page; regenerate it with `python3 tools/screenshots.py excitebike`.
