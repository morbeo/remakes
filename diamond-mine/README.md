# Glint Shaft

A browser remake of Diamond Mine, the 1983 Roklan game for the Apple II, Atari 8-bit and Commodore 64. Every shaft is generated from a seed, the graphics are drawn in code in the Apple II hi-res palette and the sound is synthesised square-wave blips, so the page works offline from one file.

## Play

Pick 1 player, 2 players co-op or 2 players versus, then **New run** (random seed), **Daily mine** (one seed per calendar day) or your own seed and starting shaft. A run is 20 shafts; after that you can keep digging.

- The shaft is a grid of cells divided by thin walls. Your car digs through the dirt in each cell as it drives, slower than along tunnels that are already clear. Nothing passes through walls, and shots also stop in dirt.
- Each shaft hides eight diamonds. The ones you dig up trail behind the car. A monster that touches the trail eats that diamond; one that touches the car wrecks it and spills everything you tow into nearby cells.
- The processing box is a one-way drive-through, entered from the left. Driving through drops your raw diamonds in; its counter shows how many are processed, and the next pass hands them out at the far end. Take them up the lift in the top right corner.
- Each shaft's monster box holds a set number of monsters, shown on the box. They come out one at a time and dig at full speed; green ones wander, violet ones hunt. Shot monsters are gone for good, and when you lose a car the ones outside go back into the box.
- U-shaped pads teleport you to their twin. From shaft 6 a key is buried in the dirt: monsters shy away from a car towing it, and picking it up opens the locked pad into a walled vault holding two of the eight diamonds. Process the key and bring it out for the top bonus.
- If a shaft can't be finished, pause and leave it; diamonds still in the mine count as lost.

| Points | |
| --- | --- |
| Dig up, process | 25 each |
| Bring a diamond up the lift | 100 |
| Monster | 75 crawler, 100 hunter |
| Leaving bonus | 300, 450, 600, 800, 1000 for 4 to 8 diamonds out; 1200 for all eight and the key |

Points rise by half every four shafts. An extra car comes every 20,000 points.

The screen starts as a green monochrome monitor like the original; the **Screen** button or `G` switches to Apple II colour.

| | Player 1 | Player 2 |
| --- | --- | --- |
| Drive | Arrow keys or `I` `J` `K` `L` | `W` `A` `S` `D` (also player 1 in solo) |
| Fire | `Space` or `/` | `F` or `1` |
| Touch | On-screen pad and Fire, or swipe to drive and tap to fire | |
| Gamepad | First pad | Second pad |

`Esc` or `P` pauses, `M` toggles sound. Turns are buffered, so press the next direction just before a junction. In versus, shooting the other car stuns it and makes it drop its trail.

## Seeds

The seed (in the URL as `?seed=`, with `&depth=` for the starting shaft) fixes every shaft of a run, so a shared link gives the same mines. **Copy seed link** in the pause and end cards copies it. The best runs on the device are kept in local storage.

## How shafts are built

`generate(seed, shaft)` in `index.html` builds a 21x13 cell maze with a depth-first backtracker, then knocks out a share of the remaining walls (fewer deeper down) so the shaft has loops as well as nooks and dead ends. It then stamps in walled structures: the lift in the top right corner, the 3x2 processing box (counter on top, one-way lane below), the 3x1 monster box with a door underneath, teleporter pairs from shaft 3 (two from shaft 10), and from shaft 6 a 3x3 vault with a pad inside linked to a locked pad outside. A layout is retried unless the box doors and the monster door can be reached from the lift without driving over a pad. Diamonds and the key go into dirt cells at least four steps from the lift, spaced apart, two of them inside the vault. Monster count, release rate, speed, the share of hunters and point values scale with the shaft number.
