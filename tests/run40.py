"""run40, Nov 2026: Sunday preparation with more resources: the proper of the Mass, the Epistle with St Thomas's lectura and
the Church's documents, the Gospel antiphons of the Office, St Thomas's lectures on the Gospel, the Catechism paragraphs
and Vatican documents citing the Gospel; the section buttons; opening a document in the Library."""
import subprocess, time, sys, os
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8800", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and "404" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8800/t.html"); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000)
        if pg.locator("[aria-label='Welcome'] button:has-text('Skip for now')").count(): pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.click("nav[aria-label='Section'] button:has-text('Liturgy')"); pg.wait_for_selector("[aria-label='Liturgy section']", timeout=15000)
        pg.click("[aria-label='Liturgy section'] button:has-text('Sunday')")
        done = set()
        for n, day in enumerate(["2026-11-15", "2026-11-29", "2027-01-24", "2027-04-11", "2027-08-01"]):
            pg.fill("#sunday-date", day); pg.wait_for_timeout(5000)
            sec = lambda name: pg.locator(f"section[aria-label=\"{name}\"]")
            print(f"{n + 1} {day}:", pg.locator("section[aria-label='Sunday'] h2").inner_text()[:60])
            print("   nav:", pg.locator("nav[aria-label='On this page'] button").all_inner_texts())
            print("   propers:", [t.split("\n")[0] for t in sec("The proper of the Mass").locator("summary").all_inner_texts()])
            print("   epistle:", sec("The Epistle").locator("h3").inner_text() if sec("The Epistle").count() else None,
                  "| thomas:", sec("The Epistle").locator("summary").all_inner_texts()[:3] if sec("The Epistle").count() else None)
            print("   gospel:", sec("The Gospel").locator("h3").inner_text(), "| antiphons:", sec("The Gospel").locator("span.text-soft").all_inner_texts())
            st = sec("St Thomas")
            print("   lectura:", st.locator("summary").all_inner_texts()[:3], "|", st.locator("p.text-soft").first.inner_text()[:80] if not st.locator("summary").count() else "")
            ch = sec("The Catechism and the Church's documents")
            print("   church:", ch.locator("summary").all_inner_texts()[:1], "| docs:", ch.locator("li").count(), "|", [t.split("\n")[0] for t in ch.locator("li").all_inner_texts()[:3]])
            if n == 0:
                pg.screenshot(path=os.path.join(here, "sunday40.png"), full_page=True)
            if ch.locator("summary").count() and "ccc" not in done:
                done.add("ccc"); ch.locator("summary").first.click(); pg.wait_for_timeout(3000)
                print("   CCC text:", ch.locator("details p[lang='la']").first.inner_text()[:100] if ch.locator("details p[lang='la']").count() else "(none)")
                pr = sec("The proper of the Mass")
                print("   introit:", pr.locator("details").first.locator("p[lang='la']").first.inner_text()[:70], "|", pr.locator("details").first.locator("p[lang='en']").first.inner_text()[:60] if pr.locator("details").first.locator("p[lang='en']").count() else "(no en)")
                pg.locator("nav[aria-label='On this page'] button:has-text('Catechism')").click(); pg.wait_for_timeout(800)
        # open a Vatican document from the list
        ch = pg.locator("section[aria-label=\"The Catechism and the Church's documents\"]")
        if ch.locator("li button").count():
            t = ch.locator("li button").first.inner_text().split("\n")[0]
            ch.locator("li button").first.click(); pg.wait_for_selector("#lib-ch", timeout=20000)
            print("6 opened:", t, "→", pg.locator("span.latin.font-bold").first.inner_text()[:60], "|", pg.locator("#lib-ch option:checked").inner_text()[:50])
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
