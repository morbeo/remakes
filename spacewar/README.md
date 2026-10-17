# Sunwell Duel

A browser remake of Spacewar, as played on DOS PCs: two armed ships duel around a star whose gravity pulls on everything. Ships, stars and effects are drawn in code and every sound is synthesised, so the page works offline from one file.

## Play

Pick **1 player vs CPU** or **2 players**. Destroy the other ship with blaster torpedoes or laser pulses until all its shield energy is gone; the survivor scores. First to the target score wins.

| | Needle (blue) | Wedge (red) |
| --- | --- | --- |
| Rotate | `A` `D` | `J` `L` or `←` `→` |
| Thrust | `W` | `I` or `↑` |
| Blaster | `S` | `K` or `↓` |
| Laser pulse | `X` | `M` or `/` |
| Teleport | `Q` | `U` or Right `Shift` |
| Shield (hold) | `E` | `O` |
| Cloak (hold) | `R` | `P` |
| Energy → shield | `Z` | `N` |
| Shield → energy | `C` | `,` |

These are the defaults (`Space` is also a Needle blaster key). Every action has two key slots per ship; open **Controls** in the menu, click a slot and press the new key to rebind it (`Backspace` clears, `Esc` cancels, **Reset keys** restores the defaults). A key can drive only one action, so binding it moves it from wherever it was. Bindings are saved in the browser.

Solo, either key set flies the Needle. `Esc` pauses.

Touch screens get on-screen pads (below the field in portrait, over its corners in landscape): rotate, shield and cloak on the left; thrust, blaster, laser, teleport and energy transfer on the right. In 2-player mode the Wedge's pad is upside down across the top, for two players sharing a tablet.

## Ship systems

Energy units follow the original DOS Spacewar instruction screen.

| System | Cost | Effect |
| --- | --- | --- |
| Blaster torpedo | 1 energy | 4 shield damage |
| Laser pulse | 1 energy | 2 shield damage, short range, shoots down torpedoes |
| Engines | 1 energy every ½ s | thrust while held |
| Cloak | 1 energy every ½ s | invisible while held; firing or being hit flickers it into view |
| Shield | 1 energy every ½ s | while held, hits drain energy instead of shield |
| Teleport | 8 energy | the ship breaks into particles that stream to a random spot and reassemble |

- Each ship starts with 30 energy and 20 shield (max 40 each). Energy recharges 1 unit every 2 seconds far from the star and faster the closer you fly, up to 8 times as fast in its glow (shown as SOLAR on the HUD). Flying close is a gamble: gravity is strongest there and touching the star burns shield.
- Move energy into the shield or back with the transfer keys.
- A ship is destroyed when its shield reaches 0. A warning beep and a flashing bar mean it's nearly gone.
- Touching the star burns 3 shield and flings the ship away; ramming costs both ships 4.

## Advanced settings

The menu's **Advanced settings** panel exposes every rule as a number: ship speed, thrust, turn rate and hit/shield radius; energy and shield limits, starting values, recharge, solar boost and transfer rate; the energy cost of each system; blaster and laser damage, speed, range and cooldowns; gravity, star size, star and ramming damage; teleport timing and cloak reveal. Changed values are highlighted, saved in the browser and applied right away; **Reset to defaults** restores the DOS-style numbers.

Both ships share the same outline length, span and swept area (only the tail notch differs) and use the same circular hit radius, so neither is easier to hit.

## Options

Star gravity (normal, strong, off), deadly or hidden star, blaster bolt gravity, wrapping or bouncing edges, CPU skill, points to win and sound. Choices are remembered in the browser.
