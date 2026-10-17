# Sunwell Duel

A browser remake of Spacewar, as played on DOS PCs: two armed ships duel around a star whose gravity pulls on everything. Ships, stars and effects are drawn in code and every sound is synthesised, so the page works offline from one file.

## Play

Pick **1 player vs CPU** or **2 players**. A ship is destroyed by a blaster bolt or laser burn while its shield is down, by the star, or by ramming without a strong shield; the survivor scores. First to the target score wins.

| | Needle (blue) | Wedge (red) |
| --- | --- | --- |
| Rotate | `A` `D` | `J` `L` or `←` `→` |
| Thrust | `W` | `I` or `↑` |
| Blaster | `S` | `K` or `↓` |
| Laser (hold) | `X` | `M` or `/` |
| Teleport | `Q` | `U` or Right `Shift` |
| Shield on/off | `E` | `O` |
| Cloak on/off | `R` | `P` |
| Energy → shield | `Z` | `N` |
| Shield → energy | `C` | `,` |

Solo, either key set flies the Needle and `Space` also fires the blaster. `Esc` pauses.

Touch screens get on-screen pads (below the field in portrait, over its corners in landscape): rotate, shield and cloak on the left; thrust, blaster, laser, teleport and energy transfer on the right. In 2-player mode the Wedge's pad is upside down across the top, for two players sharing a tablet.

## Ship systems

Like the DOS Spacewar, each ship runs on energy and carries a separate shield reserve.

- **Energy** (max 100) recharges slowly when you're not thrusting or firing the laser. Thrust, blaster shots, the laser, teleport, a raised shield and the cloak all draw on it.
- **Shield** reserve (max 100, starts at 60) only fills when you move energy into it, and can be drained back into energy. While raised it soaks blaster bolts (34 each), laser burn and rams, and costs a trickle of energy. It drops when the reserve or energy runs out.
- **Blaster**: bolts that inherit the ship's velocity, bend in the star's gravity (optional) and cancel enemy bolts they touch.
- **Laser**: a short-range beam that burns while held. It strips shields fast, kills an unshielded ship after a brief burn, and shoots down bolts in its path. Costly on energy.
- **Teleport**: drops you somewhere random. The first jump in a round is safe; each later one is riskier.
- **Cloak**: makes the ship invisible (a faint flame still flickers) at a steep energy cost. Firing or being hit shows it for a moment. Shield and cloak can't run together.

## Options

Star gravity (normal, strong, off), deadly or hidden star, blaster bolt gravity, wrapping or bouncing edges, CPU skill, points to win and sound. Choices are remembered in the browser.
