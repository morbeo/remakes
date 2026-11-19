# Iron Warren

A browser remake of Bolo, the 1982 Apple II tank maze game: drive a tank through a large maze, find the enemy bases that keep building tanks, and blow them all up. Here every maze is generated from a seed, and a run is a roguelike descent: one hull, upgrades between depths, and nothing kept when the hull breaks. Graphics are drawn in code and sound is synthesised, so the page works offline from one file.

## Play

Start a **New run** (random or typed seed) or the **Daily run** (same seed for everyone that day). On each depth, destroy every violet hive; the green hatch then opens and the compass points to it. Drive onto it to pick an upgrade and go deeper.

| | |
| --- | --- |
| Drive | Arrows or `W` `A` `S` `D`. **Tank** steering (default) turns left and right and drives forwards and back like the original; **Direct** drives the way you press |
| Fire | `Space`, `Z` or `J`; hold to keep firing |
| Map | `Tab`, the Map button or a click on the minimap toggles a large map |
| Pause / mute | `Esc` or `P` / `M` |
| Touch | Drag anywhere for a stick under your thumb, tap FIRE |
| Gamepad | Left stick or d-pad drives, A, B or a trigger fires, Start pauses |

## The warren

- **Hives** build a new enemy every few seconds while you are within about 15 tiles, up to a cap that grows with depth. Destroying one is worth 400 points and 3 scrap.
- **Tanks** (orange) chase you along the maze and stop to shoot when they have a line on you. **Darters** (red, depth 2+) ram you. **Brutes** (purple, depth 4+) take four hits and fire a spread. **Turrets** (blue, depth 2+) sit at junctions.
- Shells **ricochet** off walls, so you can hit things round corners. Your shells and enemy shells cancel each other out.
- **Brown walls** crack after three hits and open a shortcut.
- **Pickups**: white crates repair one hull, gold piles are scrap.
- Every fifth depth is a **hive core**: one big hive in a central chamber guarded by four turrets.

## Roguelike layer

- **Seeded runs**. The seed fixes every maze, modifier and upgrade offer, so a seed can be shared (`?seed=` in the URL, or *Copy link* on the pause and game-over cards).
- **Upgrade draft** after each depth: pick one of three. Fifteen upgrades, several stackable: Ricochet Liner, Autoloader, Extra Plating, Wide Treads, Twin Barrels, Tail Gun, Sabot Rounds, Heavy Shells, Periscope, Field Welder, Deflector, Rail Charger, Seeker Fins, Scrap Magnet, Sweep Radar.
- **Scrap shop** in the draft: repair 1 hull for 3 scrap, or reroll the offer (2 scrap, +1 each time).
- **Depth modifiers** from depth 3 (two from depth 8): Blackout, Swarm, Armored hives, Volatile wrecks, Rubber walls, Static (no hive pings), Supply cache.
- **Permadeath** with a saved checkpoint: the run is saved at the start of each depth so a closed tab can **Continue**, but losing the hull ends the run. Best depth and score are kept.

## Quality of life

- Fog of war with a remembered map; the minimap shows explored tiles and pings each hive.
- Compass arrow to the nearest hive, then to the open hatch (can be switched off).
- Corner assist eases the tank into corridors so it does not snag on wall edges.
- Pauses on its own when the tab loses focus; options for steering, sound and screen shake are remembered.

## Files

- `index.html`: the whole game. `genFloor(seed, depth)` builds a maze with a recursive backtracker on a cell grid, braids some dead ends into loops, carves rooms and cracked walls, then places hives in far dead ends, the hatch at the farthest cell, turrets at junctions, patrols and pickups. Enemies follow a breadth-first flow field from the player's tile.
- `window.IW` exposes the state and `IW.sim(seconds)` for tests and the screenshot recipe in `tools/screenshots.py`.
