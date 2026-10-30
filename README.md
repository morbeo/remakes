# remakes

Browser remakes of old games. Each game lives in its own folder as a self-contained `index.html`; open it in a browser to play, or use the GitHub Pages site (deployed from `master` by `.github/workflows/pages.yml`).

| Game | Remake of | Folder |
| --- | --- | --- |
| ClockWerx | ClockWerx | [clockwerx/](clockwerx/) |
| Dead Drop | Spy vs Spy | [spy-vs-spy/](spy-vs-spy/) |
| Gold Raid | Lode Runner | [lode-runner/](lode-runner/) |
| Heatline MX | Excitebike | [excitebike/](excitebike/) |
| Polar Delve | Arctic Adventure | [arctic-adventure/](arctic-adventure/) |
| Ridge Roller | Marble Madness | [marble-madness/](marble-madness/) |
| Spring Rider | Elasto Mania | [elasto-mania/](elasto-mania/) |
| Sunwell Duel | Spacewar | [spacewar/](spacewar/) |
| Tiny Tenant | Little Computer People | [little-computer-people/](little-computer-people/) |
| Virtua Justice | Virtua Cop | [virtua-cop/](virtua-cop/) |

The landing page shows a gameplay thumbnail for each game (`<game>/screenshot.webp`). Regenerate them with `python3 tools/screenshots.py` (needs Python Playwright; pass game folders to redo only those).
