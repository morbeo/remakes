# Ridge Roller

A browser remake of Marble Madness: steer a glass marble down floating isometric courses before the clock runs out. Every course is generated from a seed, all graphics are drawn in code and every sound is synthesised, so the page works offline from one file.

## Play

Press **Play** to start at course 1 (or pick a later course). Roll from the blue start ring to the checkered goal. Time left over carries into the next course, which adds its own allowance; when the clock reaches zero the game is over. Clearing a course scores 25 points per second left plus 250 per course number.

| | |
| --- | --- |
| Steer | Arrow keys or `W` `A` `S` `D` (screen directions, so up rolls up the screen) |
| Mouse | Click the course to capture the pointer and roll it like a trackball; or drag with the button held |
| Touch | Drag anywhere; a stick appears under your finger. Phones can switch on tilt steering in the menu |
| Pause | `Esc`, `P` or the pause button |

## Hazards

- Falling more than about 2.8 levels shatters the marble; rolling off an edge drops it into the mist. Either way you restart at the last ring you rolled over, and the clock keeps running.
- Pale blue ice barely grips; green goo slows you down.
- Red posts are bumpers that kick the marble away.
- The dark marble chases you around its platform in bursts and tries to shove you off.
- Purple coiled crawlers shatter the marble on contact. They doze for a few seconds after a hit.

## Seeds

The seed (shown in the menu, the pause card and the URL as `?seed=`) fixes every course of a run, so the same seed always gives the same sequence. `?level=` preselects the start course.

## How courses are built

`generate(seed, n)` in `index.html` lays a chain of modules along +x or +y, the two directions that run down the screen, joined by square turn platforms. Each cell stores its own four corner heights, so slopes are smooth inside a module and cliffs appear where neighbouring cells disagree. Module kinds:

| Module | What it is |
| --- | --- |
| flat, ramp | plain platforms and straight slopes, sometimes with raised rails |
| steps, ledge | half-level steps and a safe drop of 1.2 to 1.8 levels |
| bridge | one cell wide, zig-zagging sideways on later courses |
| chute | a half-pipe with raised rims |
| wash | a ramp with ridges across it |
| camber | a ramp that tilts towards one edge in the middle |
| pits | a wide platform with holes and one guaranteed path |
| bump | bumper posts with one clear lane |
| ice, goo | slippery and sticky surfaces |
| arena | a platform guarded by the dark marble or crawlers |

Difficulty rises over the first ten courses: more modules, steeper ramps, narrower and more frequent bridges, pits, camber and guards, and less time per module. A ledge never follows a ramp-like module, so a fast run off a slope cannot add up to a fatal drop.

## Testing

The page exposes `window.RR` for headless checks: `RR.start(seed, course)` begins a run, `RR.sim(seconds, true)` advances the simulation with the built-in autopilot (the same one that drives the menu background) and returns the state, and `RR.snap()` centres the camera on the marble. The autopilot clears 174 of 175 sampled seed and course pairs (courses 1 to 14) within the allotted time.
