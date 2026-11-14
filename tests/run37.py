"""Sentence by sentence, learning mode: plain sentence first, hints on demand (one point at a time), then all the highlighting;
Check translation before I got it / I needed help; previous/next and arrow keys; study settings (highlight style, mode); grammar notes try-first."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8797", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8797/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.click("nav[aria-label='Practice mode'] button:has-text('Passages')"); pg.wait_for_selector("[aria-label='Grammar points in this passage']", timeout=20000)
        sec = pg.locator("[aria-label='Grammar points in this passage']")
        print("1 grammar notes hidden first:", sec.locator("text=Find it yourself").count() >= 1)
        sec.locator("div[role='button']").first.click(); pg.wait_for_timeout(200)
        print("  after tap, note shown:", sec.locator("text=Find it yourself").count() == 0, "| lit:", pg.locator(".gh").all_inner_texts())
        d = pg.locator("[aria-label='Sentence by sentence']")
        found = False
        for _ in range(12):
            pg.click("button:has-text('Read it sentence by sentence')"); d.wait_for(timeout=10000)
            for _ in range(8):
                if d.locator("button:has-text('Show hints')").count(): found = True; break
                if d.locator("button[aria-label='Next sentence']").is_disabled(): break
                pg.keyboard.press("ArrowRight"); pg.wait_for_timeout(150)
            if found: break
            d.locator("button:has-text('Back to the passage')").click(); pg.wait_for_timeout(200)
            pg.click("button[aria-label='Following passage']"); pg.wait_for_timeout(500)
        print("2 sentence with help found:", found, "|", d.locator("span.num").first.inner_text())
        print("  plain first: chips", d.locator("button[aria-pressed]").count(), "| coloured words", d.locator("p[lang=la] span[style*='--gc']").count(), "| translation hidden", d.locator("p[lang=en]").count() == 0)
        print("  bottom:", d.locator("button:has-text('Check translation')").count(), "check button, got-it", d.locator("button:has-text('I got it')").count())
        d.locator("button:has-text('Show hints')").click(); pg.wait_for_timeout(200)
        ch = d.locator("button[aria-pressed]")
        print("3 hints:", ch.all_inner_texts(), "| coloured words still", d.locator("p[lang=la] span[style*='--gc']").count())
        ch.first.click(); pg.wait_for_timeout(200)
        print("  one point open, its words:", d.locator("p[lang=la] span[class*='bg-[var(--gt)]'], p[lang=la] span.bg-rubrictint").all_inner_texts())
        d.locator("button:has-text('Show all the highlighting')").click(); pg.wait_for_timeout(200)
        print("4 all highlighting, coloured words:", d.locator("p[lang=la] span[style*='--gc']").count())
        if d.locator("button:has-text('Explain everything')").count():
            d.locator("button:has-text('Explain everything')").click(); pg.wait_for_timeout(200); print("  explain all boxes:", d.locator("div.reveal div.reveal").count())
        pg.screenshot(path=os.path.join(here, "sbs-learn.png"))
        d.locator("button:has-text('Check translation')").click(); pg.wait_for_timeout(200)
        print("5 translation:", d.locator("p[lang=en]").inner_text()[:50], "| help ringed:", "ring-2" in d.locator("button:has-text('I needed help')").get_attribute("class"))
        n0 = d.locator("span.num").first.inner_text()
        d.locator("button:has-text('I needed help')").click(); pg.wait_for_timeout(250)
        print("  next page:", n0, "->", d.locator("span.num").first.inner_text(), "| plain again:", d.locator("button[aria-pressed]").count() == 0)
        pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(200); print("  arrow back:", d.locator("span.num").first.inner_text())
        # settings
        d.locator("button[aria-label='Study settings']").click(); pg.wait_for_timeout(150)
        d.locator("button:has-text('Coloured fill')").click(); d.locator("button:has-text('Show all help at once')").click(); pg.wait_for_timeout(200)
        print("6 all-at-once: chips", d.locator("button[aria-pressed]").count(), "| filled words", d.locator("p[lang=la] span[class*='bg-[var(--gt)]']").count(), "| saved", pg.evaluate("localStorage.getItem('lectio-vulgata-study')"))
        pg.screenshot(path=os.path.join(here, "sbs-fill.png"))
        d.locator("button:has-text('No colours')").click(); pg.wait_for_timeout(150)
        print("  no colours:", d.locator("p[lang=la] span[style*='--gc']").count())
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
# --- the new options (Settings → Sentence study & hints) ---
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8798", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8798/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.click("nav[aria-label='Practice mode'] button:has-text('Passages')"); pg.wait_for_selector("button:has-text('Read it sentence by sentence')", timeout=20000)
        pg.locator("button[aria-label='Settings'], button[title='Settings']").first.click(); pg.wait_for_timeout(300)
        pg.locator("button:has-text('Sentence study & hints')").click(); pg.wait_for_timeout(200)
        grp = pg.locator("[role=group][aria-label='Sentence study & hints']")
        print("7 settings section:", grp.count(), "| options:", grp.locator("label").all_inner_texts()[:5])
        grp.locator("#st-peek").check(); grp.locator("#st-adv").uncheck(); grp.locator("#st-phr").uncheck(); pg.wait_for_timeout(200)
        print("  saved:", pg.evaluate("localStorage.getItem('lectio-vulgata-study')"))
        pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
        vb = pg.locator("button[aria-label^='Translation of']")
        print("8 verse-number buttons:", vb.count())
        if vb.count():
            vb.first.click(); pg.wait_for_timeout(200); print("  peek:", pg.locator("article span[lang=en]").first.inner_text()[:60])
        pg.screenshot(path=os.path.join(here, "peek.png"))
        pg.click("button:has-text('Read it sentence by sentence')"); d = pg.locator("[aria-label='Sentence by sentence']"); d.wait_for(timeout=10000)
        n0 = d.locator("span.num").first.inner_text(); d.locator("button:has-text('Check translation')").click(); d.locator("button:has-text('I got it')").click(); pg.wait_for_timeout(200)
        print("9 stays after I got it:", n0 == d.locator("span.num").first.inner_text(), "| bar segment green:", d.locator("button[aria-label$='got it']").count())
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
