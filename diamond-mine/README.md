# Glint Shaft

A browser remake of Diamond Mine, the 1983 Roklan maze game for the Apple II, Atari 8-bit and Commodore 64. Every shaft is generated from a seed, the graphics are drawn in code in the Apple II hi-res palette and the sound is synthesised square-wave blips, so the page works offline from one file.

## Play

Pick **New run** (random seed), **Daily mine** (one seed per calendar day) or enter your own seed and a starting shaft (1, 5, 9, 13 or 17, like the original's five starting screens). A run is 20 shafts; after that you can keep digging.

- Every tunnel starts thick with dust. Walking over a tile clears it, and bullets stop dead in dust, so clear a corridor before you fight in it.
- Diamonds you pick up are carried, not scored. Step onto the lift at the top to bank them. Banking several at once multiplies the points (x1.25 for each extra diamond), so greed pays if you survive.
- A crawler touching you costs a lamp, and the diamonds you carry spill into nearby tunnels where you can win them back. Losing a lamp also calls every crawler back into the den.
- Green crawlers wander, violet stalkers hunt you, and from shaft 7 orange dusters lay dust back down where they walk.
- The violet stone is worth three diamonds. Clearing a shaft fast earns a time bonus, and every fourth shaft returns a lamp (up to five).

| | |
| --- | --- |
| Walk | Arrow keys or `W` `A` `S` `D`; turns are buffered, so press the next direction just before a junction |
| Fire | `Space`, `X` or `J`, in the direction you face (hold a blocked direction to turn on the spot) |
| Pause, sound | `Esc` or `P`, `M` |
| Touch | On-screen pad and Fire button, or swipe on the screen to walk and tap to fire |
| Gamepad | Stick or d-pad, `A`/`B` fire, `Start` pause |

## Seeds

The seed (in the URL as `?seed=`, with `&depth=` for the starting shaft) fixes every shaft of a run, so a shared link gives the same mines. **Copy seed link** in the pause and end cards copies it. The best runs on the device are kept in local storage.

## How shafts are built

`generate(seed, shaft)` in `index.html` carves a 27x17 tile maze with a depth-first backtracker over the odd cells, then knocks out a share of the remaining walls to make loops (fewer as you go deeper). The den is stamped into the middle: a 5x3 room behind a barred gate, wrapped in a corridor ring that keeps every tunnel connected. The lift sits at the top centre. Diamonds go to dead ends first, spaced apart and weighted away from the lift, and the farthest one becomes the violet stone. Crawler count, speed, release rate and the mix of kinds scale with the shaft number.
