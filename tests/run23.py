"""Summa reader in the Library: II-II q.27 a.2, Latin with English, a word's parsing, next article, add to class quiz, place kept."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8787", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1000, "height": 900})
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8787/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.click("nav[aria-label='Section'] button:has-text('Library')"); pg.wait_for_selector("text=Summa Theologiae", timeout=15000)
        pg.click("button:has-text('Summa Theologiae')"); pg.wait_for_selector("#sr-p", timeout=15000)
        pg.select_option("#sr-p", "2-2"); pg.wait_for_timeout(500); pg.select_option("#sr-q", "27"); pg.wait_for_timeout(800); pg.select_option("#sr-a", "2"); pg.wait_for_timeout(1500)
        print("1 header:", pg.locator("article header").inner_text().replace("\n", " | "))
        print("  groups:", pg.locator("article h3").all_inner_texts())
        print("  sed contra:", pg.locator("article section").nth(1).inner_text()[:220].replace("\n", " || "))
        pg.locator("article .lw").nth(30).click(); pg.wait_for_timeout(1500)
        print("2 word:", pg.locator(".fixed").inner_text()[:120].replace("\n", " | "))
        pg.locator(".fixed button:has-text('Close')").first.click()
        pg.click("button:has-text('Next article ›')"); pg.wait_for_timeout(1200)
        print("3 next:", pg.locator("article header p").first.inner_text())
        pg.click("button:has-text('Add to my class quiz')"); pg.wait_for_selector("text=Added:", timeout=20000)
        print("4", pg.locator("text=Added:").inner_text())
        pg.reload(); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000); pg.wait_for_timeout(1500); pg.wait_for_timeout(1500)
        print("5 after reload:", pg.locator("article header p").first.inner_text() if pg.locator("article header p").count() else "(not open)")
        pg.uncheck("text=English") if False else None
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
