# Bead Brawl

A 3D-looking fighting game in the spirit of Ballz (PF Magic, 1994): every fighter is a string of shaded spheres. Nothing is hand-made: a text seed generates the whole roster of eight fighters and each match's arena.

## What the seed generates

- **Bodies**: height, girth, limb length, head size, bead density, colour pattern, crests and noses. Heavier builds hit harder and move slower.
- **Stance and moves**: guard, lean and knee bend, plus 13 moves picked from variant pools: jab, low punch, heavy (→P), anti-air (←P), kick, forward kick, back kick, sweep, air punch, air kick, two specials and a throw. Specials come from nine kinds: projectile, rolling ball, stretching coil punch, spinning whirl, diving slam, charging ram, corkscrew uppercut, punch flurry and a ground-shockwave stomp. Throws are a suplex or a slam.
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
- Punch and kick change with direction: P, →P, ←P, ↓P, K, →K, ←K, ↓K (→ means toward the opponent). S and ↓S are the two specials, P+K is a throw, P or K in the air is a jump attack.
- Double-tap forward or back to dash. A normal that hits or is blocked can be cancelled into a stronger move; jabs chain up to three times.
- The fighter select screen and the pause menu list each fighter's moves.
- Touch: stick on the left, P K S buttons on the right. Gamepads: d-pad or stick, X punch, A kick, B or Y special, Start pauses.
- Esc pauses, M mutes. Best of three rounds, 60 seconds each.

URL options: `?seed=pebble-42` picks a roster, `?mode=watch` starts a CPU vs CPU match.

## Code

Everything is in `index.html`. `genFighter` builds a skeleton, bead segments and move set from the seed; `layout` is the forward kinematics that turns a pose (joint angles plus whole-body spin and twist) into beads. Moves are eased keyframes (start, windup, strike, recovery), and every joint then follows its target through a damped spring tuned per state, which gives the overshoot, follow-through and hit recoil; `genArena` builds the ring. Beads are pre-rendered shaded sprites, depth-sorted and projected through a slowly swinging camera. `window.BB` exposes `start()` and `sim()` for tests and the landing-page screenshot.
