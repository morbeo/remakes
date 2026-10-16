"""Capture a gameplay thumbnail for each game into <game>/screenshot.webp.

Usage:
  python3 tools/screenshots.py                 # every game folder with an index.html
  python3 tools/screenshots.py excitebike      # only the named games
  python3 tools/screenshots.py --width 480     # thumbnail width in px (default 640)

Needs Python Playwright. Uses the preinstalled Chromium at /opt/pw-browsers/chromium
when present; set CHROMIUM=/path/to/chrome to use another one.
"""
import argparse, base64, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


def elasto_mania(pg):
    pg.click("#levelList >> text=Rolling Hills")
    pg.wait_for_timeout(300)
    pg.keyboard.down("KeyW"); pg.wait_for_timeout(1800); pg.keyboard.up("KeyW")
    return "#game"


def clockwerx(pg):
    pg.mouse.click(640, 300)
    pg.wait_for_timeout(300)
    btns = pg.query_selector_all("#dlgBtns button")
    if btns: btns[-1].click()
    pg.wait_for_timeout(300)
    pg.click("#bPlay")
    pg.wait_for_timeout(500)
    pg.keyboard.down("x"); pg.wait_for_timeout(1200); pg.keyboard.up("x")
    return "#stage"


def excitebike(pg):
    pg.keyboard.down("KeyZ"); pg.wait_for_timeout(2600)
    pg.keyboard.down("ArrowUp"); pg.wait_for_timeout(250); pg.keyboard.up("ArrowUp")
    pg.wait_for_timeout(600); pg.keyboard.up("KeyZ")
    return "#c"


def arctic_adventure(pg):
    pg.keyboard.press("Enter")
    pg.wait_for_timeout(1500)
    pg.keyboard.down("ArrowRight"); pg.wait_for_timeout(900)
    pg.keyboard.press("ArrowUp"); pg.wait_for_timeout(250); pg.keyboard.up("ArrowRight")
    return "#c"


def default(pg):
    pg.wait_for_timeout(1000)
    return "canvas"


RECIPES = {"elasto-mania": elasto_mania, "clockwerx": clockwerx,
           "excitebike": excitebike, "arctic-adventure": arctic_adventure}

# Scale the element shot down in the page and encode it as WebP there, so no image library is needed.
ENCODE = """async ([src, w]) => {
  const img = new Image(); img.src = src; await img.decode();
  const h = Math.round(img.height * w / img.width);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/webp', 0.82);
}"""


def capture(pg, game, width):
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto((ROOT / game / "index.html").as_uri())
    pg.wait_for_timeout(800)
    selector = RECIPES.get(game, default)(pg)
    png = pg.locator(selector).first.screenshot()
    url = pg.evaluate(ENCODE, ["data:image/png;base64," + base64.b64encode(png).decode(), width])
    out = ROOT / game / "screenshot.webp"
    out.write_bytes(base64.b64decode(url.split(",", 1)[1]))
    print(f"{out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB" + (f"  errors: {errors}" if errors else ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("games", nargs="*", help="game folders (default: all)")
    ap.add_argument("--width", type=int, default=640, help="thumbnail width in px (default 640)")
    a = ap.parse_args()
    games = a.games or sorted(d.name for d in ROOT.iterdir() if (d / "index.html").is_file())
    exe = os.environ.get("CHROMIUM") or ("/opt/pw-browsers/chromium" if Path("/opt/pw-browsers/chromium").exists() else None)
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=exe)
        for g in games:
            if not (ROOT / g / "index.html").is_file():
                sys.exit(f"no such game: {g}")
            pg = b.new_page(viewport={"width": 1280, "height": 800})
            capture(pg, g, a.width)
            pg.close()
        b.close()


if __name__ == "__main__":
    main()
