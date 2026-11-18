"""Checks run on pull requests.

Usage:
  python3 tools/check_games.py              # both checks
  python3 tools/check_games.py --listing    # only: every game folder is on the landing page and in the README table
  python3 tools/check_games.py --load       # only: every game loads in Chromium without console errors or exceptions
  python3 tools/check_games.py excitebike   # limit --load to the named games

A game is a top-level folder with an index.html. The listing check needs only Python. The load check needs Python
Playwright; it uses the preinstalled Chromium at /opt/pw-browsers/chromium when present, or CHROMIUM=/path/to/chrome.
Exits non-zero when anything fails.
"""
import argparse, functools, http.server, os, re, sys, threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SETTLE_MS = 2000


def games():
    return sorted(d.name for d in ROOT.iterdir() if d.is_dir() and not d.name.startswith(".") and (d / "index.html").is_file())


def check_listing(names):
    landing = (ROOT / "index.html").read_text(encoding="utf-8")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    problems = []
    for g in names:
        if not re.search(r"""href=["'](?:\./)?%s/?["']""" % re.escape(g), landing):
            problems.append(f"{g}/: missing from the root index.html (no link to {g}/)")
        if not re.search(r"\]\((?:\./)?%s/?\)" % re.escape(g), readme):
            problems.append(f"{g}/: missing from the README.md table (no link to {g}/)")
    return problems


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def check_load(names):
    from playwright.sync_api import sync_playwright

    handler = functools.partial(Quiet, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    exe = os.environ.get("CHROMIUM") or ("/opt/pw-browsers/chromium" if Path("/opt/pw-browsers/chromium").exists() else None)
    problems = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()
        for g in names:
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            errors = []
            # external requests (web fonts) are answered with an empty 200, so the result does not depend on the network
            page.route(lambda u: not u.startswith(base), lambda r: r.fulfill(status=200, body="", content_type="text/plain"))
            page.on("response", lambda r, e=errors: r.status >= 400 and e.append(f"HTTP {r.status}: {r.url}"))
            page.on("console", lambda m, e=errors: m.type == "error" and e.append(f"console error: {m.text}"))
            page.on("pageerror", lambda x, e=errors: e.append(f"uncaught exception: {x}"))
            try:
                page.goto(f"{base}/{g}/", wait_until="load", timeout=30000)
                page.wait_for_timeout(SETTLE_MS)
            except Exception as x:
                errors.append(f"failed to load: {x}")
            page.close()
            print(f"{'FAIL' if errors else 'ok  '} {g}")
            problems += [f"{g}/: {e}" for e in errors]
        browser.close()
    server.shutdown()
    return problems


def main():
    ap = argparse.ArgumentParser(description="Check the games listing and that each game loads cleanly.")
    ap.add_argument("games", nargs="*", help="limit --load to these game folders")
    ap.add_argument("--listing", action="store_true", help="only the landing page / README check")
    ap.add_argument("--load", action="store_true", help="only the Chromium load check")
    a = ap.parse_args()
    both = not (a.listing or a.load)
    every = games()
    unknown = [g for g in a.games if g not in every]
    if unknown:
        sys.exit(f"not a game folder: {', '.join(unknown)}")
    problems = []
    if a.listing or both:
        problems += check_listing(every)
    if a.load or both:
        problems += check_load(a.games or every)
    for pr in problems:
        print(pr, file=sys.stderr)
    print(f"{len(problems)} problem(s)" if problems else "all checks passed")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
