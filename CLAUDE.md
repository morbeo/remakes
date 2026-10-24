# remakes

Browser remakes of old games. Live site: https://morbeo.github.io/remakes/

## Layout

- One folder per game (`elasto-mania/`, `clockwerx/`, `excitebike/`, `spy-vs-spy/`, ...), each with a self-contained `index.html`: no external libraries, graphics drawn in code, sound synthesised.
- Root `index.html` is the landing page; root `README.md` has a table of games. Both must list every game folder.
- `.github/workflows/pages.yml` deploys on push to `master`: it copies the root `index.html` and every top-level folder that has an `index.html`.
- Larger games may keep sources and tools beside the built page. `clockwerx/` does: edit `src/`, then run `node tools/build.js`; never hand-edit its `index.html`. See `clockwerx/README.md` for verify, generate and smoke-test commands.

## Adding a game

1. Create `<game>/index.html` (full document with doctype, charset and viewport meta).
2. Add a card to the root `index.html` and a row to the root `README.md` table.
   The card shows `<game>/screenshot.webp`; make it with `python3 tools/screenshots.py <game>` (add a recipe in that script if the game needs input to reach gameplay).
3. Optional `<game>/README.md` with controls and layout, and `<game>/RESEARCH.md` with notes on the original.

## Conventions

- Plain HTML, CSS and JavaScript. Keep pages working offline from a single file.
- Must work on desktop (keyboard, mouse) and mobile (touch, small screens).
- Light theme for menus and page chrome; no dark-theme defaults.
- Levels, art and sound are original; never copy assets or level layouts from the source games.
- Tools use Node 18+; smoke tests use Python with Playwright (Chromium is preinstalled in cloud sessions).

## Git

- Default branch is `master`. Work on a branch and open a PR.
- Commit messages have a short summary line and a longer body.
- Never add attribution of any kind: no "Generated with Claude", no "Requested by" lines, no Co-Authored-By or session trailers, no Claude or project links. This applies to commits, PR titles and bodies, and code comments.

## Agents

Project agents live in `.claude/agents/`:

- `game-researcher`: researches an original game and writes a design brief.
- `repo-organizer`: audits and tidies the repo so folders, landing page, README and Pages stay in sync.
