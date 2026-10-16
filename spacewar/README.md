# Sunwell Duel

A browser remake of Spacewar, as played on DOS PCs: two ships duel around a star whose gravity pulls on everything. Ships, stars and effects are drawn in code and every sound is synthesised, so the page works offline from one file.

## Play

Pick **1 player vs CPU** or **2 players**. A ship is destroyed by a torpedo, the star, or ramming the other ship; the survivor scores. First to the target score wins.

| | Needle (blue) | Wedge (red) |
| --- | --- | --- |
| Rotate | `A` `D` | `←` `→` |
| Thrust | `W` | `↑` |
| Fire | `S` | `↓` |
| Hyperspace | `Q` | Right `Shift` |

Solo, either key set flies the Needle and `Space` also fires. `Esc`/`P` pauses, `M` mutes.

Touch screens get on-screen pads (below the field in portrait, over its corners in landscape). In 2-player mode the Wedge's pad is upside down across the top, for two players sharing a tablet.

## Rules

- Thrust burns fuel, which slowly refills while coasting.
- Torpedoes inherit the ship's velocity, reload one at a time (8 in the tube) and annihilate enemy torpedoes they touch.
- Hyperspace drops you somewhere random. The first jump is safe; each later one in the same round is more likely to blow you up.

## Options

Star gravity (normal, strong, off), deadly or hidden star, torpedo gravity, wrapping or bouncing edges, CPU skill, points to win and sound. Choices are remembered in the browser.
