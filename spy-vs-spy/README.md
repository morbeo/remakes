# Dead Drop

A Spy vs Spy remake. Two spies, White and Black, search an embassy for a briefcase and four documents, booby-trap the place for each other, and race for the exit. Each spy has their own half of the screen and their own clock. The embassy is generated from scratch every round: floor plan, doors, rooms, furniture and where everything is hidden. Everything is drawn and synthesised in code.

Play: open `index.html`, or https://morbeo.github.io/remakes/spy-vs-spy/

## Rules

- Search furniture to find the briefcase, passport, cash, key and plans. Without the briefcase you can carry one thing; with it, documents go inside and your hand stays free for a cure. Finding something while your hand is full swaps it with what you held.
- Leave through the green EXIT door with the briefcase and all four documents to win. The map in your panel shows the exit and where you are.
- Traps (the trapulator): bomb and spring go on furniture, a bucket of water and a gun on a string go on doors, and a time bomb sits on the floor for 10 seconds and catches everyone in the room. Whoever searches that furniture or opens that door next is caught, the spy who set it included. Your own traps blink faintly on your screen only.
- Cures lie on the floor: water bucket (bomb), wire cutters (spring), umbrella (bucket on a door), scissors (gun). Holding the right one defuses the trap; the cure is used up and turns up again elsewhere.
- Meet your rival and you can fight with clubs. A fallen spy loses 15 seconds, drops what they carried into the furniture of that room, and comes back after a few seconds.
- Run out of clock and you're out. If both run out, nobody wins.

## Modes

- **Against the computer**: easy, normal or hard. The CPU spy remembers what it searched, avoids its own traps, gets wary of furniture and doors it saw you rig (it watches your half of the screen too), and picks fights when you carry what it needs.
- **Two players, one keyboard**: split screen, one gamepad each also works.
- **Online**: one player creates a room and shares the 5-character code or invite link (`?room=CODE`). The browsers connect peer to peer over a WebRTC data channel; the host runs the game and sends snapshots, the guest sends inputs. The free public PeerJS server (`0.peerjs.com`) only introduces the two browsers. If it's down or blocked, "swap codes by hand" does the same by copy and paste. There is no TURN relay, so a few strict networks can't connect. If the guest leaves mid-round, the computer takes over Black.

Embassy size (3×3, 4×3 or 5×4 rooms) and clock (3, 5 or 8 minutes) are set in the menu, or by the host online.

## Controls

| | Move | Search / fight | Set trap | Next trap |
| --- | --- | --- | --- | --- |
| Solo or online | WASD or arrows | F, Space or Enter | G, E or / | R, Q or , |
| Player 1 | WASD | F or Space | G or E | R or Q |
| Player 2 | arrows | Enter or . | / or Right Shift | , or Right Ctrl |
| Gamepad | stick or d-pad | A | X | B or Y |
| Touch | stick | Search | Trap | Next |

Esc or P pauses (online games keep running).

## Layout

- `index.html`: the whole game. `genWorld` builds the embassy from a seed (online guests rebuild the same one from the host's seed), `Game` holds the rules, `AI` is the CPU spy, then drawing, sound, controls, online play and menus.
- `tools/sim.js`: plays CPU-vs-CPU rounds headless and prints wins, round length and falls by cause: `node tools/sim.js [rounds] [small|medium|large] [easy|normal|hard] [clock seconds]`.
- `tools/broker.js`: a tiny local stand-in for the signalling server, for testing online play offline: `node tools/broker.js 9777`, then open the page with `?broker=ws://localhost:9777/peerjs` in two windows.
