import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(here)
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8778", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
app = subprocess.Popen([sys.executable, "-m", "http.server", "8779", "--bind", "127.0.0.1", "--directory", os.path.join(root, "docs")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
def watch(pg, tag):
    pg.on("pageerror", lambda e: errs.append(tag + " PAGEERROR " + str(e)))
    pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and "fonts" not in m.text and errs.append(tag + " CONSOLE " + m.text))
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 430, "height": 1000}); watch(pg, "online")
        pg.goto("http://127.0.0.1:8778/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.wait_for_selector("text=Today’s Office", timeout=15000)
        print("1 today card:", pg.locator("button:has-text('Today’s Office')").inner_text().replace("\n", " "))
        pg.click("button:has-text('Read Matins')"); pg.wait_for_selector("[aria-label='The day'] h2", timeout=20000)
        print("2 day:", pg.locator("[aria-label='The day'] h2").inner_text(), "|", pg.locator("[aria-label='The day'] p").first.inner_text())
        print("  sections shown (lessons view):", pg.locator("section[id^='office-']").count(), "| chips:", pg.locator("[aria-label='Sections'] button").all_inner_texts())
        pg.locator("[aria-label='How much to show'] button:has-text('Full Matins')").click(); pg.wait_for_timeout(200)
        print("  full view sections:", pg.locator("section[id^='office-']").count(), "| chips:", pg.locator("[aria-label='Sections'] button").all_inner_texts()[:12])
        hymn = pg.locator("section[id^='office-']").nth(2).inner_text()[:160].replace("\n", " / ")
        print("  hymn section:", hymn)
        # tap a word
        pg.locator("section[id^='office-'] .lw").nth(40).click(); pg.wait_for_timeout(1500)
        print("3 word panel:", pg.locator(".fixed").inner_text()[:200].replace("\n", " | "))
        if pg.locator(".fixed button:has-text('All forms of')").count():
            pg.locator(".fixed button:has-text('All forms of')").first.click(); pg.wait_for_timeout(1500)
            print("  → forms:", pg.locator("section[aria-label^='Forms of'] h2").inner_text())
            pg.click("nav button:has-text('Office')"); pg.wait_for_selector("[aria-label='The day'] h2", timeout=20000)
        # English
        pg.locator("section[id^='office-'] button:has-text('English')").first.click(); pg.wait_for_timeout(100)
        print("4 english shown in one section:", pg.locator("section[id^='office-'] [lang='en']").count())
        pg.check("#office-en"); print("  all english:", pg.locator("section[id^='office-'] [lang='en']").count())
        # mark read + streak
        pg.click("button:has-text('Mark as read')"); pg.wait_for_timeout(200)
        print("5 read:", pg.locator("[aria-label='The day']").inner_text().split("\n")[-1], "| saved:", json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-v2')"))["oread"])
        pg.click("button[aria-label='Previous day']"); pg.wait_for_timeout(1500)
        print("  yesterday:", pg.locator("[aria-label='The day'] h2").inner_text()); pg.click("button:has-text('Mark as read')"); pg.wait_for_timeout(200)
        print("  streak:", pg.locator("[aria-label='The day']").inner_text().split("\n")[-1])
        for d in ["2027-03-28", "2027-12-25", "2031-08-15", "2040-01-01"]:
            pg.fill("#office-date", d); pg.wait_for_timeout(1500)
            print("6", d, "→", pg.locator("[aria-label='The day']").inner_text().split("\n")[4:6])
        b.close()
        # offline copy, no network
        b = p.chromium.launch(); oc = b.new_context(viewport={"width": 1000, "height": 900}, offline=True); op = oc.new_page(); watch(op, "offline")
        op.goto("file://" + os.path.join(root, "dist", "lectio-offline.html")); op.wait_for_selector("text=Today’s session", timeout=40000)
        op.click("nav button:has-text('Office')"); op.wait_for_selector("[aria-label='The day'] h2", timeout=40000)
        print("7 offline copy office:", op.locator("[aria-label='The day'] h2").inner_text(), "| sections:", op.locator("section[id^='office-']").count())
        b.close()
        # phone app: open the Office online, then go offline and reload
        b = p.chromium.launch(); ctx = b.new_context(**p.devices["Pixel 7"]); ap = ctx.new_page(); watch(ap, "app")
        ap.goto("http://127.0.0.1:8779/"); ap.wait_for_selector("text=Today’s session", timeout=30000)
        ap.evaluate("navigator.serviceWorker.ready"); ap.wait_for_timeout(2000)
        ap.click("nav button:has-text('Office')"); ap.wait_for_selector("[aria-label='The day'] h2", timeout=30000)
        ap.click("button:has-text('Keep this year')"); ap.wait_for_selector("text=Saved: the Office", timeout=60000)
        print("8 app saved:", ap.evaluate("caches.keys()"))
        ctx.set_offline(True); ap.reload(); ap.wait_for_selector("text=Today’s session", timeout=30000)
        ap.click("nav button:has-text('Office')"); ap.wait_for_selector("[aria-label='The day'] h2", timeout=30000)
        ap.fill("#office-date", "2027-06-29"); ap.wait_for_timeout(2000)
        print("  offline in app:", ap.locator("[aria-label='The day'] h2").inner_text())
        b.close()
finally:
    srv.terminate(); app.terminate()
print("ERRORS:", errs)
