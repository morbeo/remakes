# Glint Shaft

A browser remake of Diamond Mine, the 1983 Roklan game for the Apple II, Atari 8-bit and Commodore 64. Every shaft is generated from a seed, the graphics are drawn in code in the Apple II hi-res palette and the sound is synthesised square-wave blips, so the page works offline from one file.

## Play

Pick 1 player, 2 players co-op or 2 players versus, then **New run** (random seed), **Daily mine** (one seed per calendar day) or your own seed and starting shaft. A run is 20 shafts; after that you can keep digging.

- Your drill digs through dirt as it drives. It moves faster in tunnels that are already clear, and shots stop in dirt.
- Each shaft hides eight diamonds. The ones you dig up trail behind the drill. A monster that touches the trail eats that diamond; one that touches the drill wrecks it and spills everything you tow onto the nearest open ground.
- Drive into the box's green **IN** door to drop raw diamonds off. They are processed one at a time; collect them at the white **OUT** door and take them up the lift at the top right.
- U-shaped pads teleport you to their twin. From shaft 6 a key is buried in the dirt: monsters shy away from a drill towing it, and it opens the orange pad into a sealed vault holding two of the eight diamonds. Process the key and bring it out for the top bonus.
- Green crawlers wander, violet hunters chase, and from shaft 5 orange borers tunnel straight through dirt. Shot monsters return from their nests a few seconds later.
- If a shaft can't be finished, pause and leave it; diamonds still in the mine count as lost.

| Points | |
| --- | --- |
| Dig up, process | 25 each |
| Bring a diamond up the lift | 100 |
| Monster | 75 crawler, 100 hunter, 150 borer |
| Leaving bonus | 300, 450, 600, 800, 1000 for 4 to 8 diamonds out; 1200 for all eight and the key |

Points rise by half every four shafts. An extra drill comes every 20,000 points.

| | Player 1 | Player 2 |
| --- | --- | --- |
| Drive | Arrow keys or `I` `J` `K` `L` | `W` `A` `S` `D` (also player 1 in solo) |
| Fire | `Space` or `/` | `F` or `1` |
| Touch | On-screen pad and Fire, or swipe to drive and tap to fire | |
| Gamepad | First pad | Second pad |

`Esc` or `P` pauses, `M` toggles sound. Turns are buffered, so press the next direction just before a junction. In versus, shooting the other drill stuns it and makes it drop its trail.

## Seeds

The seed (in the URL as `?seed=`, with `&depth=` for the starting shaft) fixes every shaft of a run, so a shared link gives the same mines. **Copy seed link** in the pause and end cards copies it. The best runs on the device are kept in local storage.

## How shafts are built

`generate(seed, shaft)` in `index.html` fills a 27x17 grid with dirt, scatters rock outcrops with short random walks, then places the 5x3 processing box with its IN and OUT doors, the lift at the top right, three monster nests with starter tunnels far from the lift, and teleporter pairs from shaft 3 (two pairs from shaft 10). Any pocket the lift can't reach becomes rock, and the layout is retried if a door, nest or pad is cut off. From shaft 6 a rock-walled vault is stamped in with a pad inside, linked to a locked pad elsewhere. Diamonds and the key go into dirt at least six steps from the lift, spaced apart, two of them inside the vault. Monster count, speed, the mix of kinds and point values scale with the shaft number.
