"""Smoke-test every game: load it, poke it, fail on page errors.

Usage:
  python3 tools/smoke.py                 # landing page and every game folder
  python3 tools/smoke.py excitebike      # only the named games
  python3 tools/smoke.py --wait 5000     # ms to let each page run (default 3000)

Serves the repo over a local HTTP server, opens each page in headless
Chromium, waits, sends a click and a few keys, waits again, and reports any
uncaught exception, console error or missing local file. Third-party
requests (web fonts) and the browser's favicon probe are ignored, so the
test also runs offline. Exits 1 if any page failed.

Needs Python Playwright. Uses the preinstalled Chromium at /opt/pw-browsers/chromium
when present; set CHROMIUM=/path/to/chrome to use another one.
"""
import argparse, functools, http.server, os, sys, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
KEYS = ["Enter", "Space", "ArrowRight", "KeyZ"]


def games():
    return sorted(p.parent.name for p in ROOT.glob("*/index.html"))


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def chromium_path():
    if os.environ.get("CHROMIUM"):
        return os.environ["CHROMIUM"]
    pre = Path("/opt/pw-browsers/chromium")
    return str(pre) if pre.exists() and pre.is_file() else None


def check(browser, base, url, wait):
    errors = []

    def local(u):
        return u.startswith(base) and not u.endswith("/favicon.ico")

    def on_console(m):
        # resource failures are reported below with their URL, filtered to local files
        if m.type == "error" and not m.text.startswith("Failed to load resource"):
            errors.append(f"console: {m.text}")

    def on_response(r):
        if r.status >= 400 and local(r.url):
            errors.append(f"http {r.status}: {r.url[len(base) - 1:]}")

    pg = browser.new_page(viewport={"width": 1280, "height": 720})
    pg.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    pg.on("console", on_console)
    pg.on("response", on_response)
    pg.on("requestfailed", lambda r: local(r.url) and errors.append(f"request failed: {r.url[len(base) - 1:]}"))
    try:
        pg.goto(url, wait_until="load")
        pg.wait_for_timeout(wait)
        pg.mouse.click(640, 360)
        for k in KEYS:
            pg.keyboard.press(k)
        pg.wait_for_timeout(1000)
    except Exception as e:  # navigation or timeout failure counts as a page failure
        errors.append(f"error: {e}")
    finally:
        pg.close()
    return errors


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("games", nargs="*", help="game folders to test (default: landing page and all games)")
    ap.add_argument("--wait", type=int, default=3000, metavar="MS", help="ms to let each page run (default 3000)")
    args = ap.parse_args()

    known = games()
    unknown = [g for g in args.games if g not in known]
    if unknown:
        sys.exit(f"smoke: unknown game(s): {', '.join(unknown)} (have: {', '.join(known)})")
    pages = [f"{g}/" for g in args.games] or ["", *(f"{g}/" for g in known)]

    srv = serve()
    base = f"http://127.0.0.1:{srv.server_address[1]}/"
    failed = 0
    with sync_playwright() as p:
        exe = chromium_path()
        browser = p.chromium.launch(**({"executable_path": exe} if exe else {}))
        for page in pages:
            errors = check(browser, base, base + page, args.wait)
            name = page.rstrip("/") or "(landing page)"
            print(f"{'FAIL' if errors else 'ok  '} {name}")
            for e in errors:
                print(f"     {e}")
            failed += bool(errors)
        browser.close()
    srv.shutdown()
    print(f"{len(pages) - failed}/{len(pages)} pages clean")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
