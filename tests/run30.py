"""Sentence by sentence splits a long verse (a Matins lesson) into its sentences; verbs coloured by aspect."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8796", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
T = "Initium esse sapientiae timorem Domini, dicit propheta. Quid est autem initium sapientiae, nisi saeculo renuntiare? Quia sapere saecularia, stultitia est. Denique sapientiam hujus mundi, stultitiam esse apud Deum, Apostolus dicit. Sed et ipse timor Domini, nisi secundum scientiam sit, nihil prodest, immo obest plurimum. Siquidem Judaei habent zelum Dei; sed quia non habent secundum scientiam, in ipso zelo et timore majorem contrahunt divinitatis offensam. Ut dicitur Matth. 5. Beati pauperes."
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8796/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        print("1 split:", json.dumps(pg.evaluate("t => splitSentences(t)", T), ensure_ascii=False)[:900])
        pg.click("nav[aria-label='Practice mode'] button:has-text('Passages')"); pg.wait_for_selector("button:has-text('Read it sentence by sentence')", timeout=20000)
        pg.click("button:has-text('Read it sentence by sentence')"); d = pg.locator("[aria-label='Sentence by sentence']"); d.wait_for(timeout=10000)
        print("2 counter:", d.locator("span.num").first.inner_text())
        d.locator("text=Colour verbs by aspect").click(); pg.wait_for_timeout(300)
        sp = d.locator("p[lang=la] span[title]")
        print("  coloured verbs:", [(sp.nth(j).inner_text(), sp.nth(j).get_attribute("title")) for j in range(min(sp.count(), 6))])
        pg.screenshot(path=os.path.join(here, "sbs-aspect.png"))
        pg.emulate_media(color_scheme="dark"); pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(here, "sbs-aspect-dark.png"))
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
