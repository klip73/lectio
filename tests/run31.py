"""AI keys from the header; My calendar (local feast, rank change, transfer); the Library reader (Boethius by book, verse,
English) and the Latin Library shelf; Roman numerals out of class words."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8795", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 420, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8795/t.html"); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000)
        if pg.locator("[aria-label='Welcome'] button:has-text('Skip for now')").count(): pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        # 1. AI keys from the header, from any section
        pg.click("nav[aria-label='Section'] button:has-text('Library')")
        pg.click("header button[aria-label^='AI marking']"); pg.wait_for_selector("[aria-label='AI marking keys']", timeout=5000)
        print("1 AI panel:", pg.locator("[aria-label='AI marking keys']").inner_text()[:90].replace("\n", " | "))
        pg.click("[aria-label='AI marking keys'] button:has-text('Close')")
        # 2. Boethius
        pg.click("button:has-text('De consolatione Philosophiae')"); pg.wait_for_selector("#lib-ch", timeout=20000)
        print("2 groups:", pg.eval_on_selector_all("#lib-ch optgroup", "g => g.map(x => x.label)"), "| first:", pg.eval_on_selector("#lib-ch", "s => s.options[0].text"))
        art = pg.locator("article")
        print("  title:", art.locator("h2").inner_text(), "| verse lines:", art.locator("p[lang=la]").first.inner_text().count("\n") + 1, "| English:", art.locator("p[lang=en]").first.inner_text()[:50])
        pg.select_option("#lib-ch", "1"); pg.wait_for_timeout(300); print("  next:", art.locator("h2").inner_text())
        pg.fill("input[aria-label='Find in this book']", "beatitudo"); pg.click("button:has-text('Find')"); pg.wait_for_timeout(300)
        hs = pg.locator("[aria-label='Found in this book'] li")
        print("  find beatitudo:", hs.count(), "|", hs.first.inner_text()[:80].replace("\n", " "))
        hs.first.click(); pg.wait_for_timeout(400); print("  jumped to:", art.locator("h2").inner_text(), "| highlighted:", pg.locator("article div.bg-rubrictint").count())
        pg.click("button:has-text('A+')"); print("  size:", pg.eval_on_selector("article p[lang=la]", "p => p.style.fontSize"))
        pg.click("button:has-text('‹ Library')")
        # 3. Latin Library
        pg.click("summary:has-text('The Latin Library: all of it')"); pg.wait_for_selector("input[placeholder^='Find an author']", timeout=20000)
        pg.fill("input[placeholder^='Find an author']", "Aeneis"); pg.wait_for_timeout(200)
        pg.locator("button:has-text('Aeneis')").first.click(); pg.wait_for_selector("#lib-ch", timeout=20000)
        print("3 Aeneid:", pg.locator("article h2").inner_text(), "|", pg.locator("article p[lang=la]").first.inner_text()[:44].replace("\n", " / "))
        pg.click("button:has-text('‹ Library')")
        # 4. My calendar
        pg.click("nav[aria-label='Section'] button:has-text('Liturgy')"); pg.wait_for_selector("[aria-label='Liturgy section']", timeout=20000)
        pg.click("[aria-label='Liturgy section'] button:has-text('My calendar')")
        pg.click("button:has-text('Add a feast')")
        ed = pg.locator("[aria-label='Local feast']")
        ed.locator("select").first.select_option("titular-own")
        ed.locator("input[placeholder^='e.g.']").fill("B. Mariae V. de Guadalupe")
        ed.locator("input[type=date]").first.fill("2028-12-12")
        ed.locator("button:has-text('Our Lady')").first.click(); pg.wait_for_timeout(500)
        ed.locator("li button").first.click()
        ed.locator("button:has-text('Save')").click(); pg.wait_for_timeout(800)
        print("4 entries:", pg.locator("[aria-label='Your feasts'] li").all_inner_texts())
        print("  coming up:", [t[:110] for t in pg.locator("[aria-label='Coming up'] li").all_inner_texts()[:3]])
        pg.locator("[aria-label='Coming up'] li button").first.click(); pg.wait_for_timeout(1500)
        print("  day:", pg.locator("[aria-label='The day'] h2").inner_text(), "|", pg.locator("[aria-label='The day'] p.text-soft").first.inner_text()[:100])
        print("  note:", pg.locator("[aria-label='The day'] div.border-rubric").inner_text()[:160].replace("\n", " | "))
        pg.click("[aria-label='Liturgy section'] button:has-text('Calendar')"); pg.wait_for_timeout(1000)
        print("  calendar local marks:", pg.locator("ol[aria-label='Days of the month'] span:has-text('local')").count())
        # 5. Roman numerals glossed
        lex = json.load(open(os.path.join(here, "data", "lexicon.json")))
        print("5 ix:", [l for l in lex["lemmas"] if l[0] in ("ix", "i")])
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
