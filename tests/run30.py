"""Sentence by sentence splits a long verse (a Matins lesson) into its sentences; each grammar box has its own colour, matched in its words."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8796", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
T = "Initium esse sapientiae timorem Domini, dicit propheta. Quid est autem initium sapientiae, nisi saeculo renuntiare? Quia sapere saecularia, stultitia est. Denique sapientiam hujus mundi, stultitiam esse apud Deum, Apostolus dicit. Sed et ipse timor Domini, nisi secundum scientiam sit, nihil prodest, immo obest plurimum. Siquidem Judaei habent zelum Dei; sed quia non habent secundum scientiam, in ipso zelo et timore majorem contrahunt divinitatis offensam. Ut dicitur Matth. 5. Beati pauperes."
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''; localStorage.setItem('lectio-vulgata-study', JSON.stringify({learn:false,hl:'underline'}))")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8796/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        print("1 split:", json.dumps(pg.evaluate("t => splitSentences(t)", T), ensure_ascii=False)[:900])
        pg.click("nav[aria-label='Practice mode'] button:has-text('Passages')"); pg.wait_for_selector("button:has-text('Read it sentence by sentence')", timeout=20000)
        pg.click("button:has-text('Read it sentence by sentence')"); d = pg.locator("[aria-label='Sentence by sentence']"); d.wait_for(timeout=10000)
        print("2 counter:", d.locator("span.num").first.inner_text())
        print("  aspect switch gone:", d.locator("text=Colour verbs by aspect").count() == 0)
        for _ in range(8):
            if d.locator("button[aria-pressed][style*='--gc']").count() >= 2: break
            if not d.locator("button:has-text('I got it')").count(): break
            d.locator("button:has-text('I got it')").click(); pg.wait_for_timeout(250)
        ch = d.locator("button[aria-pressed][style*='--gc']")
        print("  coloured boxes:", [(ch.nth(j).inner_text().split("\n")[0], ch.nth(j).get_attribute("style")) for j in range(ch.count())])
        uw = d.locator("p[lang=la] span[style*='--gc']")
        print("  underlined words:", [(uw.nth(j).inner_text(), uw.nth(j).get_attribute("style")) for j in range(uw.count())])
        if ch.count(): ch.first.click(); pg.wait_for_timeout(200); print("  filled after tap:", d.locator("p[lang=la] span[class*='bg-[var(--gt)]']").count())
        pg.screenshot(path=os.path.join(here, "sbs-colours.png"))
        pg.emulate_media(color_scheme="dark"); pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(here, "sbs-colours-dark.png"))
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
