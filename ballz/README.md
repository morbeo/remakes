# Bead Brawl

A 3D-looking fighting game in the spirit of Ballz (PF Magic, 1994): every fighter is a string of shaded spheres. Nothing is hand-made: a text seed generates the whole roster of eight fighters and each match's arena.

## What the seed generates

- **Bodies**: height, girth, limb length, head size, bead density, colour pattern, crests and noses. Heavier builds hit harder and move slower.
- **Stance and moves**: guard, lean and knee bend, plus one variant for each slot (jab, heavy, kick, sweep, jump attack, special). Specials are a projectile, a rolling ball, a stretching coil punch, a spinning whirl, a diving slam or a charging ram.
- **Arenas**: a theme (meadow, dune, candy, frost, clay, lagoon), floor colours, props made of beads, a cheering crowd and clouds.

Knocked-out fighters burst into loose beads that bounce across the ring, and reassemble for the next round.

## Controls

| Action | 1 player | 2 players (P1 / P2) |
| --- | --- | --- |
| Move, jump, crouch | WASD or arrows | WASD / arrows |
| Punch | J or Z | F / J |
| Kick | K or X | G / K |
| Special | L or C | H / L |

- Hold away from the opponent to block; hold down-away to block low. Sweeps must be blocked low, jump attacks and overheads high.
- Forward + punch is the heavy blow, down + kick sweeps, punch or kick in the air is a jump attack.
- Touch: stick on the left, P K S buttons on the right. Gamepads: d-pad or stick, X punch, A kick, B or Y special, Start pauses.
- Esc pauses, M mutes. Best of three rounds, 60 seconds each.

URL options: `?seed=pebble-42` picks a roster, `?mode=watch` starts a CPU vs CPU match.

## Code

Everything is in `index.html`. `genFighter` builds a skeleton, bead segments and move set from the seed; `layout` is the forward kinematics that turns a pose (joint angles plus whole-body spin and twist) into beads; `genArena` builds the ring. Beads are pre-rendered shaded sprites, depth-sorted and projected through a slowly swinging camera. `window.BB` exposes `start()` and `sim()` for tests and the landing-page screenshot.
