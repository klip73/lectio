"""Vatican documents shelf: sections, finding a document, reading it (Latin with the Holy See's English), the Catechism,
the 1983 Code from the canon lookup, and the Vatican documents in the Library search."""
import subprocess, time, sys, os
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8795", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and "404" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8795/t.html"); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000)
        if pg.locator("[aria-label='Welcome'] button:has-text('Skip for now')").count(): pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.click("nav[aria-label='Section'] button:has-text('Library')"); pg.wait_for_selector("#lib-search", timeout=20000)
        s = pg.locator("summary:has-text('Vatican documents')")
        print("1 summary:", s.inner_text()[:160]); s.click(); pg.wait_for_selector("[aria-label='Kind of document']", timeout=20000)
        print("2 sections:", pg.locator("[aria-label='Kind of document'] button").all_inner_texts())
        print("  popes:", [x.split("\n")[0] for x in pg.locator("details[open] ul > li").all_inner_texts()[:6]])
        pg.click("[aria-label='Kind of document'] button:has-text('Second Vatican')"); pg.wait_for_timeout(300)
        print("3 Vatican II:", [x.split(" · ")[0] for x in pg.locator("details[open] ul > li button").all_inner_texts()[:16]])
        pg.fill("input[placeholder^='Find a document']", "rerum novarum"); pg.wait_for_timeout(300)
        hits = pg.locator("details[open] ul > li button"); print("4 find:", hits.all_inner_texts()[:3])
        hits.filter(has_text="Rerum novarum").first.click(); pg.wait_for_selector("article", timeout=20000)
        print("5 reader:", pg.locator("article h2").inner_text(), "|", pg.locator("#lib-ch option").count(), "parts")
        print("  latin:", pg.locator("article p[lang='la']").first.inner_text()[:100])
        print("  english label:", pg.locator("article label").all_inner_texts(), "| caveat:", pg.locator("article p.text-soft").first.inner_text()[:80])
        print("  english:", pg.locator("article [lang='en'] p, article p[lang='en']").first.inner_text()[:100] if pg.locator("article [lang='en'] p, article p[lang='en']").count() else "NONE")
        pg.locator("article p[lang='la'] span").nth(3).click(); pg.wait_for_timeout(800)
        print("  word help:", pg.locator("button:has-text('Open in the Dictionary')").count() > 0)
        pg.click("button:has-text('‹ Library')"); pg.wait_for_timeout(600)
        # Humanae vitae: English beside the Latin where the paragraphs pair off
        pg.fill("input[placeholder^='Find a document']", "humanae vitae"); pg.wait_for_timeout(300)
        pg.locator("details[open] ul > li button").filter(has_text="Humanae").first.click(); pg.wait_for_selector("article", timeout=20000)
        pg.select_option("#lib-ch", index=1); pg.wait_for_timeout(800)
        print("6 side by side:", pg.locator("article div.grid").count(), "pairs;", pg.locator("article h2").inner_text())
        pg.click("button:has-text('‹ Library')"); pg.wait_for_timeout(600)
        # Catechism
        pg.click("[aria-label='Kind of document'] button:has-text('Catechism')"); pg.wait_for_timeout(300)
        print("7 catechism:", pg.locator("details[open] ul > li").all_inner_texts())
        pg.locator("details[open] ul > li button").filter(has_text="Catechismus Catholicae").first.click(); pg.wait_for_selector("article", timeout=30000)
        print("  parts:", pg.locator("#lib-ch option").count(), "| groups:", pg.locator("#lib-ch optgroup").count())
        pg.fill("input[aria-label='Find in this book']", "transsubstantiatio"); pg.click("button:has-text('Find')"); pg.wait_for_timeout(800)
        print("  find:", pg.locator("section[aria-label='Found in this book']").inner_text()[:200].replace("\n", " | "))
        pg.click("button:has-text('‹ Library')"); pg.wait_for_timeout(600)
        # 1983 Code from the canon lookup
        pg.fill("#canon-n", "1752"); pg.wait_for_timeout(2500)
        pg.click("button:has-text('Open can. 1752')"); pg.wait_for_selector("article", timeout=20000); pg.wait_for_timeout(500)
        print("8 can. 1752:", pg.locator("article h2").inner_text(), "|", pg.locator("article .bg-rubrictint").inner_text()[:140] if pg.locator("article .bg-rubrictint").count() else "NOT MARKED")
        pg.click("button:has-text('‹ Library')"); pg.wait_for_timeout(600)
        # search
        pg.fill("#lib-search", "transsubstantiatio"); pg.check("text=Also search the Vatican documents"); pg.click("button:has-text('Search')"); pg.wait_for_timeout(4000)
        print("9 search:", pg.locator("[aria-live='polite'] > p").first.inner_text()[:100], "|", [x[:90].replace("\n", " | ") for x in pg.locator("[aria-live='polite'] ul li button").all_inner_texts()[:3]])
        pg.locator("[aria-live='polite'] ul li button").filter(has_text="(").first.click(); pg.wait_for_selector("article", timeout=20000)
        print("  opened:", pg.locator("article h2").inner_text()[:80])
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
