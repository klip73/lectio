"""Nov 2026: Meter (hymn scansion, practice, accentual), Display panel and focus, Home order."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8794", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 420, "height": 900})
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and "404" not in m.text and errs.append("CONSOLE " + m.text))
        pg.add_init_script("window.__LV_APP_SITE = '';")
        pg.goto("http://127.0.0.1:8794/t.html"); pg.wait_for_selector("nav[aria-label='Practice mode']", timeout=20000)
        if pg.locator("[aria-label='Welcome'] button:has-text('Skip for now')").count(): pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.click("nav[aria-label='Practice mode'] button:has-text('Meter')"); pg.wait_for_selector("#mt-h", timeout=10000)
        def show():
            pg.wait_for_selector("article .latin", timeout=30000); pg.wait_for_timeout(300)
            lines = pg.locator("article > div > div").all_inner_texts()
            return pg.locator("text=Best fit").first.inner_text()[:80] if pg.locator("text=Best fit").count() else "", [l.replace("\n", "")[:120] for l in lines[:4]]
        for label in ["Aeterne rerum Conditor", "Iste Confessor", "Sanctorum meritis", "Pange lingua", "Decora lux", "Ut queant laxis", "Vexilla Regis"]:
            opts = pg.locator("#mt-h option").all_inner_texts()
            i = next((k for k, o in enumerate(opts) if o.startswith(label)), None)
            if i is None: print("  (no", label, ")"); continue
            pg.select_option("#mt-h", index=i); pg.wait_for_timeout(200)
            fit, lines = show(); print(label, "→", fit); [print("   ", l) for l in lines]
        pg.locator("article button").nth(2).click(); pg.wait_for_timeout(200)
        print("why:", pg.locator("[aria-live='polite']").last.inner_text().replace("\n", " | "))
        pg.click("[aria-label='View'] button:has-text('Practise')"); pg.wait_for_timeout(200)
        for k in range(6): pg.locator("article button").nth(k).click()
        pg.click("text=Check my marks"); print("practice:", pg.locator("text=syllables right").inner_text())
        pg.click("[aria-label='View'] button:has-text('Accentual')"); pg.wait_for_timeout(300)
        print("accentual:", pg.locator("article > div > div").first.inner_text().replace("\n", "")[:120])
        # display panel
        pg.click("button[aria-label='Display settings']"); pg.wait_for_selector("[aria-label='Display settings'] [aria-label='Text size']")
        pg.click("[aria-label='Text size'] button:has-text('Larger')"); pg.click("[aria-label='Line spacing'] button:has-text('Roomy')"); pg.click("[aria-label='Theme'] button:has-text('Dark')")
        print("display:", pg.evaluate("[getComputedStyle(document.documentElement).getPropertyValue('--lv-zoom'), document.documentElement.getAttribute('data-lh'), document.documentElement.getAttribute('data-theme'), getComputedStyle(document.getElementById('root')).zoom]"))
        pg.click("[aria-label='What brings you here'] button:has-text('Praying')")
        pg.click("nav[aria-label='Section'] button[aria-label='Home']"); pg.wait_for_timeout(500)
        print("Home order (pray):", [x.split("\n")[0] for x in pg.locator(".grid.gap-3 > button, .grid.gap-3 > div").all_inner_texts()])
        pg.reload(); pg.wait_for_timeout(1500)
        print("after reload:", pg.evaluate("[document.documentElement.style.getPropertyValue('--lv-zoom'), document.documentElement.getAttribute('data-lh')]"))
        # votive Masses
        pg.click("nav[aria-label='Section'] button:has-text('Liturgy')"); pg.wait_for_timeout(800)
        pg.click("[aria-label='Liturgy section'] button:has-text('Mass')"); pg.wait_for_selector("#votive", timeout=20000)
        print("votive options:", pg.locator("#votive option").all_inner_texts()[:8])
        pg.select_option("#votive", "joseph"); pg.wait_for_timeout(1500)
        print("votive note:", pg.locator("#votive").locator("xpath=../..").inner_text()[:400].replace("\n", " | "))
        print("votive introit:", [x[:90] for x in pg.locator("section[id^='office-']").all_inner_texts()[:2]])
        # memory aids
        pg.click("nav[aria-label='Section'] button:has-text('Guide')"); pg.wait_for_timeout(500)
        pg.click("[aria-label='Guide section'] button:has-text('Memory aids')"); pg.wait_for_timeout(300)
        print("memory aids:", pg.locator("section.rounded-lg button span.latin").all_inner_texts())
        # library EPUB
        pg.click("nav[aria-label='Section'] button:has-text('Library')"); pg.wait_for_timeout(1500)
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
