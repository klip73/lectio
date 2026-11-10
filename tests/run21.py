"""Other Divinum Officium calendars: the picker, switching to another version, its Office, Mass and calendar, and back to 1960."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8784", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
VID = sys.argv[1] if len(sys.argv) > 1 else "da1954"
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8784/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.click("nav[aria-label='Section'] button:has-text('Liturgy')"); pg.wait_for_selector("#office-ver", timeout=15000)
        pg.fill("#office-date", "2026-11-08"); pg.wait_for_selector("[aria-label='The day'] h2", timeout=15000)
        t1960 = pg.locator("[aria-label='The day'] h2").inner_text()
        opts = pg.locator("#office-ver option").all_inner_texts()
        print("1 picker:", opts, "| 1960 title:", t1960)
        pg.select_option("#office-ver", VID); pg.wait_for_timeout(300)
        pg.fill("#office-date", "2026-11-08"); pg.wait_for_selector("[aria-label='The day'] h2", timeout=15000); pg.wait_for_timeout(800)
        print("2 switched:", pg.locator("[aria-label='The day'] h2").inner_text(), "|", pg.locator("[aria-label='The day'] p").first.inner_text(), "| note:", pg.locator("#office-ver ~ span").inner_text())
        pg.wait_for_selector("section[id^='office-']", timeout=15000)
        print("  matins sections:", pg.locator("section[id^='office-']").count(), "| first:", pg.locator("section[id^='office-'] .latin").first.inner_text()[:60])
        pg.click("[aria-label='Hour'] button:has-text('Vespers')"); pg.wait_for_timeout(1200)
        print("  vespers sections:", pg.locator("section[id^='office-']").count())
        pg.click("[aria-label='Liturgy section'] button:has-text('Mass')"); pg.wait_for_selector("section[id^='office-']", timeout=15000)
        print("3 mass:", pg.locator("section[id^='office-']").count(), "sections | first proper:", pg.locator("section[id^='office-'] .smallcaps").first.inner_text())
        pg.click("[aria-label='Liturgy section'] button:has-text('Calendar')"); pg.wait_for_selector("[aria-label='Days of the month']", timeout=15000); pg.wait_for_timeout(800)
        rows = pg.locator("[aria-label='Days of the month'] li")
        print("4 calendar:", [rows.nth(i).inner_text().replace("\n", " ") for i in (0, 1, 8)], "| bold:", pg.locator("[aria-label='Days of the month'] span.font-bold.text-ink").count())
        pg.reload(); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000); pg.wait_for_timeout(1500)
        pg.click("nav[aria-label='Section'] button:has-text('Liturgy')") if pg.locator("#office-ver").count() == 0 else None
        pg.wait_for_selector("#office-ver", timeout=15000)
        print("5 after reload, still:", pg.input_value("#office-ver"))
        pg.select_option("#office-ver", ""); pg.click("[aria-label='Liturgy section'] button:has-text('Office')"); pg.fill("#office-date", "2026-11-08"); pg.wait_for_timeout(1500)
        print("6 back to 1960:", pg.locator("[aria-label='The day'] h2").inner_text())
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
