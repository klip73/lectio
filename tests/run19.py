import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8782", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text)); pg.on("response", lambda r: r.status == 404 and errs.append("404 " + r.url))
        pg.goto("http://127.0.0.1:8782/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        print("1 sections:", pg.locator("nav[aria-label='Section'] button").all_inner_texts(), "| study row:", pg.locator("nav[aria-label='Practice mode'] button").all_inner_texts())
        pg.click("nav[aria-label='Practice mode'] button:has-text('Forms')"); pg.wait_for_timeout(300)
        pg.click("nav[aria-label='Section'] button:has-text('Guide')"); print("  guide: study row hidden:", pg.locator("nav[aria-label='Practice mode']").count() == 0)
        pg.click("nav[aria-label='Section'] button:has-text('Study')"); pg.wait_for_timeout(300)
        print("  back to Study remembers Forms:", pg.locator("nav[aria-label='Practice mode'] button[aria-pressed='true']").inner_text())
        # Calendar
        pg.click("nav[aria-label='Section'] button:has-text('Liturgy')"); pg.wait_for_selector("[aria-label='Liturgy section']", timeout=15000)
        pg.click("[aria-label='Liturgy section'] button:has-text('Calendar')"); pg.wait_for_selector("[aria-label='Days of the month']", timeout=20000)
        rows = pg.locator("[aria-label='Days of the month'] li")
        print("2 calendar:", pg.locator("h2").filter(has_text="20").first.inner_text(), "|", rows.count(), "days |", [rows.nth(i).inner_text().replace("\n", " ") for i in (0, 1, 7)])
        pg.click("button[aria-label='Next month']"); pg.wait_for_timeout(1500)
        print("  next month:", [rows.nth(i).inner_text().replace("\n", " ") for i in (7, 24)])
        rows.nth(24).locator("button").click(); pg.wait_for_selector("[aria-label='The day'] h2", timeout=20000)
        print("  tapped Dec 25 →", pg.locator("[aria-label='The day'] h2").inner_text(), "| date:", pg.input_value("#office-date"))
        # Prayers
        pg.click("[aria-label='Liturgy section'] button:has-text('Prayers')"); pg.wait_for_selector("[aria-label='Prayers']", timeout=15000)
        print("3 prayers:", pg.locator("[aria-label='Prayers'] button span.font-semibold").all_inner_texts())
        pg.locator("[aria-label='Prayers'] button:has-text('Thanksgiving after Mass')").click(); pg.wait_for_timeout(500)
        print("  thanksgiving:", pg.locator("section[id^='office-']").count(), "sections | Adoro te:", pg.locator("text=Adóro te").count() + pg.locator("text=Adoro te").count())
        pg.check("#office-en"); print("  english shown:", pg.locator("section[id^='office-'] [lang='en']").count())
        pg.locator("section[id^='office-'] .lw").nth(8).click(); pg.wait_for_timeout(1500)
        print("  word:", pg.locator(".fixed").inner_text()[:80].replace("\n", " | "))
        pg.locator(".fixed button:has-text('Close')").first.click()
        # Library
        pg.click("nav[aria-label='Section'] button:has-text('Library')"); pg.wait_for_selector("text=Classics of the Church", timeout=15000)
        cards = pg.locator("button:has(span.latin.font-bold)")
        print("4 library:", [cards.nth(i).locator("span").first.inner_text() for i in range(cards.count())])
        pg.click("button:has-text('De imitatione Christi')"); pg.wait_for_selector("#lib-ch", timeout=15000)
        print("  imitatio:", pg.locator("article h2").inner_text(), "|", pg.locator("article p").first.inner_text()[:80])
        pg.click("button:has-text('Next chapter →')"); pg.wait_for_timeout(300)
        print("  next:", pg.locator("article h2").inner_text())
        pg.locator("article .lw").nth(3).click(); pg.wait_for_timeout(1500)
        print("  word:", pg.locator(".fixed").inner_text()[:80].replace("\n", " | "), "| deck:", json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-v2')") or "{}").get("vtap", [])[:4])
        pg.reload(); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000); pg.wait_for_timeout(1500)
        print("  after reload, still reading:", pg.locator("article h2").inner_text() if pg.locator("article h2").count() else "(not on library)")
        pg.click("button:has-text('‹ Library')") if pg.locator("button:has-text('‹ Library')").count() else None
        pg.click("button:has-text('Confessiones')"); pg.wait_for_selector("#lib-ch", timeout=15000)
        print("  confessiones:", pg.locator("article h2").inner_text(), "|", pg.locator("article p").first.inner_text()[:70])
        pg.click("text=‹ Library"); pg.click("button:has-text('Hymni')"); pg.wait_for_selector("#lib-ch", timeout=15000)
        print("  ambrose:", pg.locator("article p").first.inner_text()[:60].replace("\n", " / "))
        # Canon law: 1983 lookup, Decretals
        pg.click("text=‹ Library") if pg.locator("text=‹ Library").count() else None
        pg.fill("#canon-n", "915"); pg.wait_for_timeout(500)
        links = pg.locator("a:has-text('Latin ↗'), a:has-text('English ↗')")
        print("6 can. 915:", pg.locator("#canon-n ~ span").first.inner_text(), "|", [links.nth(i).get_attribute("href").split("/")[-1] for i in range(links.count())])
        pg.click("button:has-text('Decretales Gregorii IX')"); pg.wait_for_selector("#lib-ch", timeout=15000)
        print("  decretales:", pg.locator("#lib-ch option").count(), "titles | 2nd:", pg.locator("#lib-ch option").nth(1).inner_text())
        # Old Testament: Vulgate with Douay-Rheims
        pg.click("text=‹ Library") if pg.locator("text=‹ Library").count() else None
        pg.click("summary:has-text('Old Testament')"); pg.click("button:has-text('Isaias')"); pg.wait_for_selector("#lib-ch", timeout=15000)
        pg.select_option("#lib-ch", "6"); pg.wait_for_timeout(500)
        print("5 Isaias 7:", pg.locator("article h2").inner_text(), "| v14:", pg.locator("article p[lang='la']").nth(13).inner_text()[:60], "|", pg.locator("article p[lang='en']").nth(13).inner_text()[:60])
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
