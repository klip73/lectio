"""Lewis & Short under the word panel; a dictionary guess for words the parsed texts never met (clerici, excommunicationis);
older spellings found (quum, literas)."""
import subprocess, time, sys, os
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8792", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.add_init_script("localStorage.setItem('lectio-vulgata-library', JSON.stringify({_open: 'cic1917', cic1917: 4}))")
        pg.goto("http://127.0.0.1:8792/t.html"); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000)
        pg.click("nav[aria-label='Section'] button:has-text('Library')"); pg.wait_for_selector("article h2", timeout=20000)
        def tap(word):
            pg.locator(f"article span.lw:text-is('{word}')").first.click(); pg.wait_for_timeout(2500)
            return pg.locator("div.fixed.bottom-0").inner_text().replace("\n", " | ")[:260]
        txt = pg.locator("article").inner_text()
        import re
        for w in ["clerici", "Ordinarius", "excommunicationis", "quum", "literas", "possunt"]:
            if pg.locator(f"article span.lw:text-is('{w}')").count(): print(w, "→", tap(w))
        # open L&S on a known word
        pg.locator("article span.lw:text-is('possunt'), article span.lw:text-is('Rescripta')").first.click(); pg.wait_for_timeout(800)
        btn = pg.locator("div.fixed.bottom-0 button:has-text('Lewis')")
        if btn.count() and btn.get_attribute("aria-expanded") == "false": btn.click()
        pg.wait_for_timeout(2500)
        print("L&S:", pg.locator("div.fixed.bottom-0").inner_text().replace("\n", " | ")[:400])
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
