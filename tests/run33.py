"""Nov 2026: class list read-the-text and word orders (II-II q.31), Anki-style grading, Due now, Quick sort, related words, export."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8793", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 420, "height": 900}, accept_downloads=True); pg = ctx.new_page()
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and "404" not in m.text and errs.append("CONSOLE " + m.text))
        pg.add_init_script("window.__LV_APP_SITE = '';")
        pg.goto("http://127.0.0.1:8793/t.html"); pg.wait_for_selector("nav[aria-label='Practice mode']", timeout=20000)
        if pg.locator("[aria-label='Welcome'] button:has-text('Skip for now')").count(): pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.click("nav[aria-label='Practice mode'] button:has-text('Class quiz')"); pg.wait_for_selector("text=Add this section", timeout=20000)
        pg.click("[aria-label='Text'] button:has-text('Summa')"); pg.wait_for_selector("#cv-p", timeout=10000)
        pg.select_option("#cv-p", "2-2"); pg.select_option("#cv-q", "31")
        pg.click("button:has-text('Add this section')"); pg.wait_for_selector("[aria-label='Words in these sections']", timeout=30000)
        print("1 q.31 sc+resp:", pg.locator("[aria-label='Words in these sections'] strong.num").first.inner_text(), "words |", pg.locator("[aria-label='My class sections'] li").all_inner_texts())
        pg.click("button:has-text('Word list')"); pg.wait_for_selector(".class-list tbody tr", timeout=10000); pg.wait_for_timeout(800)
        rows = lambda: [x.split("\t")[0] for x in pg.locator(".class-list tbody tr").all_inner_texts()[:6]]
        for o in ["text", "hard", "easy", "type", "freq", "az"]:
            pg.select_option("#cw-order", o); pg.wait_for_timeout(200)
            print("  order", o, ":", rows())
        pg.select_option("#cw-order", "type")
        print("  groups:", pg.locator(".class-list td.smallcaps").all_inner_texts())
        rel = pg.locator(".class-list button:has-text('related')")
        print("  'related' buttons:", rel.count())
        if rel.count():
            rel.first.click(); pg.wait_for_timeout(300); print("  related:", pg.locator(".class-list tbody tr td").nth(1).inner_text()[:300].replace("\n", " | "))
        pg.click("text=Export…")
        with pg.expect_download() as d: pg.click(".class-list button:has-text('Anki')")
        path = d.value.path(); txt = open(path, encoding="utf-8").read().split("\n")
        print("2 Anki file:", d.value.suggested_filename, len(txt), "lines |", txt[:5])
        with pg.expect_download() as d: pg.click(".class-list button:has-text('Spreadsheet')")
        print("  CSV:", open(d.value.path(), encoding="utf-8-sig").read().split("\r\n")[:2])
        pg.click("button:has-text('Read the text')"); pg.wait_for_selector("article .cq", timeout=20000)
        print("3 read the text:", pg.locator("article header p.smallcaps").all_inner_texts(), "| quiz words marked:", pg.locator("article .cq").count(), "| headings:", pg.locator("article h3").all_inner_texts()[:8])
        pg.uncheck("text=Whole article (objections and replies too)"); pg.wait_for_timeout(200)
        print("  quiz parts only:", pg.locator("article h3").all_inner_texts()[:6])
        pg.check("text=English"); pg.wait_for_timeout(200); print("  English paragraphs:", pg.locator("article p[lang='en']").count())
        pg.locator("article .cq").first.click(); pg.wait_for_timeout(1500)
        print("  word panel:", pg.locator(".fixed.inset-x-0").inner_text()[:300].replace("\n", " | "))
        # flashcards with four answers
        pg.goto("http://127.0.0.1:8793/t.html"); pg.wait_for_selector("nav[aria-label='Practice mode']", timeout=20000)
        pg.click("nav[aria-label='Practice mode'] button:has-text('Vocab')"); pg.wait_for_timeout(500)
        pg.click("[aria-label='Deck'] button:has-text('Summa')") if pg.locator("[aria-label='Deck'] button:has-text('Summa')").count() else None
        pg.wait_for_selector("text=Show meaning", timeout=20000)
        pg.click("text=Show meaning"); pg.wait_for_timeout(500)
        print("4 answers:", pg.locator("div.border-t button").all_inner_texts()[:4])
        print("  related on card:", pg.locator("article .reveal").inner_text()[:250].replace("\n", " | "))
        for k in ["4", "1"]:
            pg.keyboard.press("Space"); pg.wait_for_timeout(200); pg.keyboard.press(k); pg.wait_for_timeout(300)
        prog = json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-v2')"))
        print("  cards:", {k: {x: v[x] for x in ("ivl", "ease", "box")} for k, v in list(prog["vcards"].items())[:3]}, "| level:", prog.get("vtheta"))
        pg.click("text=Quick sort: clear the new words you already know"); pg.wait_for_timeout(1500)
        n = pg.locator("[aria-label='Quick sort'] li").count()
        print("5 quick sort offers:", n, pg.locator("[aria-label='Quick sort'] li").all_inner_texts()[:5])
        if n:
            pg.locator("[aria-label='Quick sort'] li button").first.click(); pg.click("[aria-label='Quick sort'] button:has-text('Done')"); pg.wait_for_timeout(500)
            print("  ", pg.locator("text=marked known").inner_text())
        pg.click("[aria-label='Deck'] button:has-text('Due now')"); pg.wait_for_timeout(800)
        print("6 Due now:", pg.locator("main, body").first.inner_text().split("Due now")[1][:200].replace("\n", " | ") if True else "")
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
