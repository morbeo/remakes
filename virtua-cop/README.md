# Virtua Justice

A browser remake of Virtua Cop: a 3D rail shooter where the camera moves you through procedurally generated levels and you shoot gunmen before their lock-on ring closes. Levels, characters and props are built from boxes in code, and every sound is synthesised. Three.js r128 and its BufferGeometryUtils are inlined, so the page works offline from one file.

## Play

- **Shoot:** click or tap. Right-click, `R`, `Space` or the Reload button reloads.
- **Pause:** `P` or `Esc`. **Mute:** `M`.
- Shoot each gunman before his ring turns red and closes, or you lose a life.
- Every suspect drops from one hit. Hit the body twice more as it falls for 500 and 1000 extra.
- Shoot the gun hand for a Justice Shot (+1000): the suspect surrenders.
- Don't shoot civilians or hostages. Shoot grenades, knives, rockets and barrels out of the air.
- Floating pickups give a machine gun, a shotgun or an extra life. Taking a hit loses the special weapon.

The title screen sets difficulty, lock-on sights on or off, the starting mission and a level seed. The same seed always builds the same streets.

## Missions

Five themes, cycled and harder on each loop: downtown streets, harbor docks, warehouse, office tower and construction site. Each stage has:

- a route fork: shoot a sign to pick one of two branches
- a set piece: subway train, boat chase or lift ride
- a car chase on the streets and docks, from a squad car
- a boss with phases and a thrown attack, who can be arrested if he surrenders

Stages end with a rank from S to D. Game over offers a continue countdown, a replay of the last seconds and a top-10 table with initials.

## Shooting gallery

Five timed rounds from the title screen: pop-up targets, moving targets with cans, skeet, quick draw, and a can-juggling trick shot in the style of Hogan's Alley game C.
