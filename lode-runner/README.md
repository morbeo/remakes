# Gold Raid

A Lode Runner remake. It keeps the look of the 1983 Apple II original (black screen, orange bricks, white ladders and stick-figure runners) and adds the tools and terrain of the sequels, *The Legend Returns* and *Lode Runner Online: The Mad Monks' Revenge*, plus online multiplayer. Everything is drawn and synthesised in code; levels are original.

Play: open `index.html`, or https://morbeo.github.io/remakes/lode-runner/

## Controls

| | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Run, climb, drop | arrows or WASD | stick or d-pad | d-pad |
| Dig left / right | Z / X (or Q / E) | X / B (or LB / RB) | Dig buttons |
| Use tool | Space | A | Use tool |
| Pause | Esc | Start | Pause button |

Two players on one keyboard: P1 uses WASD, Q/E to dig, F for the tool; P2 uses the arrows, `,`/`.` to dig, `/` for the tool. Gamepad *n* also drives player *n*, so three or four local players need gamepads. In solo, R gives up a life when you're stuck. Online, keys 1 to 4 send quick chat (!, HELP, GG, NICE).

## Rules

Take every chest of gold, then leave: exit ladders appear and climb off the top of the screen, and exit doors open. Monks kill on touch. A monk that falls into a hole you dug is stuck for a moment and drops any gold it carried; if the hole closes on it, it reappears at the top. Holes close on runners too, but a trapped runner can climb out by tapping up quickly.

Terrain: brick (diggable, grows back), bedrock, trapdoor (looks like brick), ladder, rope, phase blocks (two sets that vanish and return out of step; anything inside when one returns is crushed), goo (slows everyone).

Tools, one carried at a time (walking onto another swaps):

- Jackhammer: drills the block under you, bedrock included.
- Pickaxe: drops a brick in front of you.
- Snare: holds the next monk (or rival) that steps on it.
- Gas can: stuns monks up to 3 tiles ahead.
- Goo bucket: coats the floor around you.
- Bomb: opens the bricks around it for a while.
- Mega bomb: removes bricks and bedrock around it for good.

## Modes

- **Solo**: 12 levels, five lives, one back per level cleared. Best times are kept in the browser.
- **Co-op** (local or online, 2 to 4): shared score and lives through the campaign. A runner who dies returns while lives last; a level clears when everyone still standing is out.
- **Gold Rush** (versus): 2:30 on the clock, gold respawns, a nugget worth 3 drops every 30 seconds, trapping a rival in a hole scores 2.
- **Race** (versus): gold scores 1; the first runner out after the last chest scores 3 and ends the round.

In versus, outlined tools belong to the runner of that colour, snares are invisible to rivals, gas and snares stop rivals too, and tools come back 12 seconds after pickup.

## Online play

One player creates a room and shares the 5-character code or invite link (`?room=CODE`); up to three others join. Browsers connect peer to peer over WebRTC data channels; the host runs the game and sends snapshots, everyone else sends inputs. The free public PeerJS signalling server (`0.peerjs.com`) only introduces the browsers. If it is down or a network blocks it, the "copy and paste" option swaps connection codes by hand instead. There is no TURN relay, so a few strict networks can't connect at all. Keep the host's tab in front, since browsers slow down background tabs.

## Level editor

Paint with the palette, test, save (saved levels show up in every level list, including online, where the host sends the level to everyone), and share levels as `GR1:` codes.

## Layout

- `index.html`: the whole game. Level data is the JSON block `<script id="levels">`; map rows use `.` empty, `#` brick, `@` bedrock, `X` trapdoor, `H` ladder, `-` rope, `S` exit ladder, `E` exit door, `%`/`&` phase blocks, `~` goo, `$` gold, `0` monk, `1`-`4` starts, and `j p n g o b m` for tools. Arena `locks` map `"x,y"` to the player index that owns a tool.
- `tools/check-levels.js`: rough reachability check for the built-in levels (`node tools/check-levels.js`).
- `tools/broker.js`: a tiny local stand-in for the signalling server, for testing online play offline: `node tools/broker.js 9777`, then open the page with `?broker=ws://localhost:9777/peerjs` in two windows.
