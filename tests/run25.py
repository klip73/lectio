"""Home: opens first; Continue lists what you were doing; the four purpose buttons and the Hour shortcuts go to the right place."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8788", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
W = int(sys.argv[1]) if len(sys.argv) > 1 else 400
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": W, "height": 900})
        pg.add_init_script("Object.defineProperty(window, '__LV_START', { value: '', writable: false })")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8788/t.html"); pg.wait_for_selector("text=Exam preparation", timeout=20000)
        print("1 opens on Home:", pg.locator("nav[aria-label='Section'] button[aria-pressed='true']").get_attribute("aria-label"), "| welcome:", pg.locator("[aria-label='Welcome']").count(), "| continue:", pg.locator("[aria-label='Continue']").count())
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        print("  tiles:", [t[:40] for t in pg.locator("main button span.latin.font-bold, button span.latin.font-bold").all_inner_texts()])
        pg.screenshot(path=os.path.join(here, f"home-{W}.png"), full_page=True)
        # Class quiz button
        pg.click("button:has-text('Class quiz') >> nth=0"); pg.wait_for_selector("text=Add this section", timeout=15000)
        print("2 class quiz opened")
        pg.select_option("#cv-book", "mt"); pg.select_option("#cv-c1", "5"); pg.click("button:has-text('Add this section')"); pg.wait_for_selector("[aria-label='Words in these sections']", timeout=30000)
        # Office: Vespers shortcut
        pg.click("nav[aria-label='Section'] button[aria-label='Home']"); pg.wait_for_selector("[aria-label='Open an Hour']")
        pg.click("[aria-label='Open an Hour'] button:has-text('Vespers')"); pg.wait_for_selector("[aria-label='Hour'] button[aria-pressed='true']", timeout=15000)
        print("3 Vespers shortcut → hour:", pg.locator("[aria-label='Hour'] button[aria-pressed='true']").inner_text())
        # Library: Summa
        pg.click("nav[aria-label='Section'] button[aria-label='Home']"); pg.click("button:has-text('Read & look up')"); pg.wait_for_selector("text=Summa Theologiae", timeout=15000)
        pg.click("button:has-text('Summa Theologiae')"); pg.wait_for_selector("#sr-p", timeout=20000)
        pg.select_option("#sr-p", "2-2"); pg.wait_for_timeout(500); pg.select_option("#sr-q", "27"); pg.wait_for_timeout(800)
        # back home: Continue
        pg.click("nav[aria-label='Section'] button[aria-label='Home']"); pg.wait_for_selector("[aria-label='Continue']")
        print("4 continue:", [x.replace("\n", " / ") for x in pg.locator("[aria-label='Continue'] button").all_inner_texts()])
        print("  class tile:", pg.locator("button:has-text('This week')").inner_text().replace("\n", " / ")[:100])
        pg.reload(); pg.wait_for_selector("[aria-label='Continue']", timeout=20000)
        pg.locator("[aria-label='Continue'] button").first.click(); pg.wait_for_selector("#sr-q", timeout=20000)
        print("5 after reload, Continue → Summa:", pg.locator("#sr-p option:checked").inner_text(), "|", pg.locator("#sr-q option:checked").inner_text()[:40])
        pg.click("nav[aria-label='Section'] button[aria-label='Home']")
        pg.click("button:has-text('Exam preparation')"); pg.wait_for_selector("text=Today’s session", timeout=10000)
        print("6 exam prep → Study:", pg.locator("nav[aria-label='Section'] button[aria-pressed='true']").inner_text())
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
