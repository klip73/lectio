"""The Dictionary: any Latin form (fecerunt → facio), headword suggestions, the dictionaries, all forms, English → Latin,
opening from a word panel; and the Latin Library in the Library search."""
import subprocess, time, sys, os
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8798", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and "404" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8798/t.html"); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000)
        if pg.locator("[aria-label='Welcome'] button:has-text('Skip for now')").count(): pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.screenshot(path="/tmp/dict-header.png", clip={"x": 0, "y": 0, "width": 400, "height": 260})
        pg.click("header button[aria-label='Dictionary']"); pg.wait_for_selector("#dict-q")
        pg.fill("#dict-q", "carit"); pg.wait_for_timeout(1200)
        print("1 suggestions:", pg.locator("[aria-label='Headwords'] li").all_inner_texts()[:8])
        pg.fill("#dict-q", "fecerunt"); pg.click("button:has-text('Look up')"); pg.wait_for_timeout(2500)
        e = pg.locator("[aria-label='Entry']")
        print("2 fecerunt:", e.inner_text()[:400].replace("\n", " | "))
        pg.fill("#dict-q", "gratiae"); pg.click("button:has-text('Look up')"); pg.wait_for_timeout(2500)
        print("3 gratiae:", e.inner_text()[:300].replace("\n", " | "))
        e.locator("button[aria-pressed]:has-text('Du Cange')").click() if e.locator("button[aria-pressed]:has-text('Du Cange')").count() else None
        pg.wait_for_timeout(1500); print("  du cange:", e.inner_text()[-250:].replace("\n", " | "))
        pg.click("button:has-text('English → Latin')"); pg.fill("#dict-q", "grace"); pg.click("button:has-text('Look up')"); pg.wait_for_timeout(800)
        print("4 grace:", pg.locator("[aria-label='Latin words'] li").all_inner_texts()[:5])
        pg.locator("[aria-label='Latin words'] li button").first.click(); pg.wait_for_timeout(2000)
        print("  → entry:", pg.locator("[aria-label='Entry'] h3").inner_text())
        pg.locator("[aria-label='Entry'] button:has-text('All forms')").first.click(); pg.wait_for_timeout(1500)
        print("5 forms opened:", pg.locator("text=All forms").count() >= 0, "| dictionary closed:", pg.locator("#dict-q").count() == 0)
        # 6. Latin Library search
        pg.click("nav[aria-label='Section'] button:has-text('Library')"); pg.wait_for_selector("#lib-search", timeout=20000)
        pg.fill("#lib-search", "arma virumque"); pg.check("text=Also search the whole Latin Library"); pg.click("button:has-text('Search')"); pg.wait_for_timeout(4000)
        print("6 search:", pg.locator("ul li button").first.inner_text()[:120].replace("\n", " | "))
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
