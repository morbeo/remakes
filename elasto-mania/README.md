# Spring Rider

A browser tribute to Elasto Mania: ride a motorbike over physics-driven hills, eat every apple, then touch the flower, without landing on your head. Bike, track and effects are drawn in code and every sound is synthesised, so the page works offline from one file (the web fonts fall back to system ones). The level gallery needs a connection.

Play: open `index.html`, or https://morbeo.github.io/remakes/elasto-mania/

## Controls

| | Default keys | Touch |
| --- | --- | --- |
| Throttle | `↑` or `W` | ▲ |
| Brake | `↓` or `S` | ▼ |
| Lean left / volt | `←` or `A` | ⟲ |
| Lean right / volt | `→` or `D` | ⟳ |
| Turn around | `Space` | ⇄ |
| Restart the level | `Enter` | Restart button |
| Menu | `Esc` | Menu button |
| Sound on/off | `M` | Sound button |
| Retry / next level (end screens) | `Space` | buttons |
| Back to the menu (end screens) | `Enter` | Menu button |

Holding a lean key rotates the whole bike; a fresh press of left or right also gives a short volt, with a quarter second between volts. Every action has two key slots: open **Change keys** in the menu, click a slot and press the new key (`Backspace` clears it, `Esc` cancels, **Reset to defaults** restores the table above). Bindings are saved in the browser.

## Play

Pick one of the six levels (First Ride, Rolling Hills, Pit Stop, Low Ceiling, Staircase, Up and Over) or press **Random track** for a generated one; its seed is shown, and the same seed gives the same track. Eat every apple, then touch the flower. Touching a killer, or landing on your head, ends the run. The clock counts up and the best time per track is saved in the browser; the end screen says whether you beat it.

## Level editor

**Level editor** in the menu opens an editor on the same canvas. Tools: Move (`1`), Ground (`2`), Block (`3`), Apple (`4`), Killer (`5`), Flower (`6`) and Start (`7`). In Move, drag points and items, drag empty space to pan, scroll to zoom, double-click the edge of the ground to add a point, and right-click or `Delete` to remove one. `Ctrl+Z` undoes, `T` test-rides, and **Start from** begins from a blank level, a built-in level or a random track. The ground has to run left to right with the start and the flower between its ends.

**Share** gives a level code and a link; **Import level code** takes either, to play or to open in the editor. **Publish to gallery** adds the level to the **Level gallery**, which lists levels published by everyone who opens the game.

## Layout

- `index.html`: the whole game, in one file.
- Script sections, in order: constants, a seeded RNG, level building (the `Track` builder, the six levels and the random generator), game state and bike physics (480 Hz steps), persistence, audio, graphics, UI, key bindings, the main loop, level codes, the editor, share and import, and the shared gallery.
- `screenshot.webp`: the thumbnail on the landing page; regenerate it with `python3 tools/screenshots.py elasto-mania`.
