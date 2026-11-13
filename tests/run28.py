"""Grammar in this passage (A&G sections, adaptive order, words lit up), sentence by sentence, the Latin font, phrase notes in the Summa."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8794", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8794/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.click("nav[aria-label='Practice mode'] button:has-text('Passages')"); pg.wait_for_selector("[aria-label='Grammar points in this passage']", timeout=20000)
        sec = pg.locator("[aria-label='Grammar points in this passage']")
        if sec.locator("button[aria-expanded='false']").count(): sec.locator("button[aria-expanded]").first.click()
        notes = sec.locator("div.rounded-md")
        print("1 notes:", notes.count(), "|", [t.split("\n")[0][:60] for t in notes.all_inner_texts()[:6]])
        print("  A&G refs:", [x for x in sec.inner_text().split() if x.startswith("§")][:6])
        tap = sec.locator("div[role='button']").first
        if tap.count():
            tap.click(); pg.wait_for_timeout(300)
            print("  lit words:", pg.locator(".gh").all_inner_texts())
        # sentence by sentence
        pg.click("button:has-text('Read it sentence by sentence')"); pg.wait_for_selector("[aria-label='Sentence by sentence']", timeout=10000)
        d = pg.locator("[aria-label='Sentence by sentence']")
        print("2 sbs:", d.locator("span.num").first.inner_text(), "| chips:", d.locator("button.rounded-full.border").all_inner_texts()[:4])
        if d.locator("button.rounded-full.border").count():
            d.locator("button.rounded-full.border").first.click(); pg.wait_for_timeout(300)
            print("  lit:", d.locator("span.bg-rubrictint").all_inner_texts(), "| note:", d.locator("div.reveal").first.inner_text()[:120].replace("\n", " "))
        d.locator("button:has-text('Show the translation')").click(); print("  translation:", d.locator("p[lang=en]").inner_text()[:60])
        pg.click("button:has-text('I got it')"); pg.wait_for_timeout(300); print("  after got it:", d.locator("span.num").first.inner_text())
        pg.click("button:has-text('Back to the passage')"); pg.wait_for_timeout(300)
        # font
        pg.click("button[aria-label='Display settings']"); pg.select_option("#disp-font", "alegreya"); pg.wait_for_timeout(300)
        print("3 font:", pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--font-latin')"), "| link:", pg.locator("link#lvf-alegreya").count())
        pg.reload(); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000)
        print("  after reload:", pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--font-latin')"))
        # Summa reader phrase tips
        pg.evaluate("localStorage.setItem('lectio-vulgata-library', JSON.stringify({_open: 'summa'})); localStorage.setItem('lectio-vulgata-summa', JSON.stringify({p:'2-2', q:27, a:2}))")
        pg.click("nav[aria-label='Section'] button:has-text('Library')"); pg.wait_for_selector("[aria-label='Notes on this kind of Latin']", timeout=20000)
        t = pg.locator("[aria-label='Notes on this kind of Latin']"); t.locator("button").first.click(); pg.wait_for_timeout(300)
        print("4 summa phrases:", [x.split("\n")[0] for x in t.locator("div.rounded-md").all_inner_texts()][:8])
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
