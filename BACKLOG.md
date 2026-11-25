# Backlog

Open work, grouped by game in landing-page order, highest value first within each group. Tick items off (or delete them) as they land.

## Repo-wide

- [ ] Merge or close PR #14: adds `ballz/` (Bead Brawl, a Ballz remake) with its landing-page card, README row and screenshot recipe. Not listed on `master` until it merges.
- [ ] Self-host or drop the Google Fonts links in `arctic-adventure/`, `elasto-mania/` and `excitebike/`; they break the single-file, offline rule (the pages fall back to system fonts offline).
- [ ] Remove Claude artifact leftovers: the `claude:viewport-fit-sides` meta in `clockwerx/src/shell.html`, `elasto-mania/` and `excitebike/`, and the artifact-only code in `elasto-mania/` (see that section).
- [ ] Give `elasto-mania/` and `excitebike/` a full document head (doctype, `<html lang>`, charset), as CLAUDE.md requires; they render in quirks mode today.
- [ ] Extend `tools/check_games.py --listing` to fail on a missing doctype/charset/viewport, external `<script src>`/`<link href>` and a missing `screenshot.webp`.
- [ ] Write a `RESEARCH.md` for every game except `diamond-mine/` (11 missing), so remakes can be compared against the original.
- [ ] Decide whether the deploy should skip dev files (`clockwerx/src/`, `*/tools/`, `README.md`, `RESEARCH.md`); `pages.yml` copies whole game folders.
- [ ] Decide whether inlined third-party code counts as an "external library" (`virtua-cop/` inlines Three.js r128 and is 800 KB).
- [ ] Add gamepad support where it fits: `arctic-adventure/`, `clockwerx/`, `elasto-mania/`, `excitebike/`, `marble-madness/`, `spacewar/`.

## ClockWerx (`clockwerx/`)

- [ ] Drop the `claude:viewport-fit-sides` meta from `src/shell.html` and rebuild.
- [ ] Add gamepad input for both players.
- [ ] Write `RESEARCH.md` (manual notes, element list, what was changed).

## Dead Drop (`spy-vs-spy/`)

- [ ] Add a TURN relay option (or document a self-hosted one) so strict networks can play online.
- [ ] Write `RESEARCH.md` (original rules, traps and remedies, what was changed).

## Glint Shaft (`diamond-mine/`)

- [ ] Consider the original's password after five shafts as an option beside seed links (RESEARCH.md: replaced by seeds).
- [ ] Consider an "original rules" toggle where monsters respawn after being shot (RESEARCH.md: the remake keeps them dead).

## Gold Raid (`lode-runner/`)

- [ ] Merge or close PR #12: pickaxe as in Lode Runner Online (timed rubble under a ceiling), Apple II two-pixel run cycle, conveyor belts, ice, nooks, ladder kit, Freight Yard and Proving Ground levels, cached tile layer, delta online snapshots.
- [ ] Add a TURN relay option for online play on strict networks.
- [ ] Write `RESEARCH.md` (Apple II rules, sequel tools and terrain, what was changed).

## Heatline MX (`excitebike/`)

- [ ] Add a full document head (doctype, `<html lang>`, charset) and remove the artifact meta.
- [ ] Self-host or drop the Google Fonts (Barlow Condensed, Racing Sans One).
- [ ] Add gamepad input.
- [ ] Write `RESEARCH.md`.

## Iron Warren (`bolo/`)

- [ ] Write `RESEARCH.md` (Apple II Bolo rules and maze structure, what the roguelike layer adds).

## Polar Delve (`arctic-adventure/`)

- [ ] Self-host or drop the Google Fonts (Silkscreen, Barlow Condensed).
- [ ] Add gamepad input.
- [ ] Add a level editor or seeded levels beyond the fixed ten.
- [ ] Write `RESEARCH.md`.

## Ridge Roller (`marble-madness/`)

- [ ] Find and fix the seed/course pair the autopilot cannot clear (174 of 175 sampled; see README "Testing"), or confirm the course is fair for a player.
- [ ] Add gamepad input (analog stick fits the trackball feel).
- [ ] Write `RESEARCH.md`.

## Spring Rider (`elasto-mania/`)

- [ ] Point share links at the live site: `SHARE_BASE` is a `claude.ai/artifact/...` URL, so "Copy link" sends players away from the Pages site.
- [ ] Replace or remove the shared level gallery: it uses `window.claude.use("db")`, which exists only inside Claude artifacts, so it is dead on the Pages site.
- [ ] Add a full document head (doctype, `<html lang>`, charset) and remove the artifact meta.
- [ ] Self-host or drop the Google Fonts (Bungee, Barlow Semi Condensed).
- [ ] Add gamepad input.
- [ ] Write `RESEARCH.md`.

## Sunwell Duel (`spacewar/`)

- [ ] Add gamepad input (one pad per ship).
- [ ] Write `RESEARCH.md` (DOS version rules and energy table sources).

## Tiny Tenant (`little-computer-people/`)

- [ ] Add keyboard shortcuts for the action buttons (knock, phone, parcels, speed), which are mouse/touch only.
- [ ] Write `RESEARCH.md` (original behaviours, what the panel-block setting changes).

## Virtua Justice (`virtua-cop/`)

- [ ] Cut page size: Three.js r128 is inlined (800 KB); consider a trimmed build or plain WebGL.
- [ ] Write `RESEARCH.md`.
