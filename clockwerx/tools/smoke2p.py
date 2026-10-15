import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width":420,"height":860})
        errs = []
        pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
        html = open(sys.argv[1]).read()
        await pg.set_content("<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head><body>" + html + "</body></html>")
        await pg.wait_for_timeout(300)
        await pg.evaluate("S.qok=true; titleContinue(); S.opts.type=2; S.opts.name2='Ana'; renderOptions();")
        await pg.screenshot(path=sys.argv[2] + "/m1-options.png", full_page=False)
        await pg.click("#bPlay"); await pg.wait_for_timeout(300)
        await pg.keyboard.down("ArrowDown"); await pg.keyboard.down("x"); await pg.wait_for_timeout(3000)
        await pg.keyboard.up("ArrowDown"); await pg.keyboard.up("x")
        st = await pg.evaluate("({state:G.state, p:G.w.players.map(p=>[p.x,p.y,p.dead,p.done]), lv:G.level})")
        print(st)
        await pg.screenshot(path=sys.argv[2] + "/m2-2p.png")
        await pg.evaluate("cmd('pause')"); await pg.wait_for_timeout(200)
        await pg.screenshot(path=sys.argv[2] + "/m3-pause.png")
        # force a win path: teleport player to goal neighbour and test goal logic
        await pg.evaluate("G.state='play'; goalTwo(0); goalTwo(1);")
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=sys.argv[2] + "/m4-results.png")
        await pg.evaluate("endGame()"); await pg.wait_for_timeout(200)
        await pg.evaluate("scoreTab='total'; renderScores()")
        await pg.screenshot(path=sys.argv[2] + "/m5-scores.png")
        print("\n".join(errs) or "no errors")
        await b.close()
asyncio.run(main())
