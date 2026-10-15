# Headless smoke test: load the page, click through title -> options -> play, press keys, capture screenshots and errors.
import sys, asyncio
from playwright.async_api import async_playwright
page_file = sys.argv[1]; outdir = sys.argv[2] if len(sys.argv) > 2 else "."
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width":1100,"height":800})
        errs = []
        pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
        pg.on("console", lambda m: errs.append("console." + m.type + ": " + m.text) if m.type in ("error","warning") else None)
        html = open(page_file).read()
        await pg.set_content("<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head><body>" + html + "</body></html>")
        await pg.wait_for_timeout(600)
        await pg.screenshot(path=outdir + "/s1-title.png")
        await pg.mouse.click(500, 300)
        await pg.wait_for_timeout(300)
        # skip clock question if shown
        btns = await pg.query_selector_all("#dlgBtns button")
        if btns: await btns[-1].click()
        await pg.wait_for_timeout(300)
        await pg.screenshot(path=outdir + "/s2-options.png")
        for lvl in [int(x) for x in (sys.argv[3].split(",") if len(sys.argv) > 3 else ["1"])]:
            await pg.evaluate(f"S.sel[SET.id]={lvl-1}; for(let i=0;i<{lvl-1};i++) profile(p1()).done[i]=true;")
            await pg.evaluate("goOptions()")
            await pg.click("#bPlay")
            await pg.wait_for_timeout(400)
            await pg.keyboard.down("x"); await pg.wait_for_timeout(2500); await pg.keyboard.up("x")
            await pg.keyboard.down("Shift"); await pg.wait_for_timeout(1500); await pg.keyboard.up("Shift")
            await pg.screenshot(path=f"{outdir}/s3-level{lvl}.png")
            st = await pg.evaluate("({state:G.state, t:G.timeLeft, n:G.L.dots.length, fx:G.fx.length})")
            print("level", lvl, st)
        await pg.evaluate("openPanel('scrHelp')")
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=outdir + "/s4-help.png", full_page=True)
        await pg.evaluate("closePanel(); endGame()")
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=outdir + "/s5-scores.png")
        print("\n".join(errs) or "no errors")
        await b.close()
asyncio.run(main())
