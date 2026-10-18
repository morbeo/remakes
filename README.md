# remakes

Browser remakes of old games. Each game lives in its own folder as a self-contained `index.html`; open it in a browser to play, or use the GitHub Pages site (deployed from `master` by `.github/workflows/pages.yml`).

| Game | Folder |
| --- | --- |
| Elasto Mania | [elasto-mania/](elasto-mania/) |
| ClockWerx | [clockwerx/](clockwerx/) |
| Excitebike | [excitebike/](excitebike/) |
| Arctic Adventure | [arctic-adventure/](arctic-adventure/) |
| Lode Runner | [lode-runner/](lode-runner/) |

The landing page shows a gameplay thumbnail for each game (`<game>/screenshot.webp`). Regenerate them with `python3 tools/screenshots.py` (needs Python Playwright; pass game folders to redo only those).
