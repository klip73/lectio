"""run42, Nov 2026: Bracketing. Study → Bracket (train: verbs, then brackets, the structure; test: score), Settings →
Bracketing (lines and bracket shapes), and "Bracket it" in the sentence-by-sentence reader on John 1:7, checked against
the PROIEL key ([ut testimonium perhiberet de lumine, [ut omnes crederent per illum]]), and a Summa sentence (rules key)."""
import subprocess, time, sys, os
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8799", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 390, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and "404" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8799/t.html#p-jn-1-7"); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000)
        if pg.locator("[aria-label='Welcome'] button:has-text('Skip for now')").count(): pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        # 1. sentence reader on John 1:7
        pg.click("button:has-text('Read it sentence by sentence')"); pg.wait_for_selector("[role=dialog]", timeout=10000)
        for _ in range(6):
            if "Hic venit" in pg.locator("[role=dialog] p[lang=la]").first.inner_text(): break
            pg.click("button[aria-label='Next sentence']"); pg.wait_for_timeout(150)
        print("1 sentence:", pg.locator("[role=dialog] p[lang=la]").first.inner_text()[:60])
        pg.click("[role=dialog] button:has-text('Bracket it')"); pg.wait_for_selector("[aria-label='Sentence to bracket']")
        B = "section[aria-label='Bracketing']"
        print("  key source:", pg.locator(f"{B} h3 + span").inner_text())
        W = lambda w: pg.locator(f"{B} [aria-label='Sentence to bracket'] [data-w]", has_text=w).first
        pg.click(f"{B} button:has-text('Check the verbs')"); print("  empty check:", pg.locator(f"{B} [role=status]").inner_text())
        pg.click(f"{B} [aria-label='Verb marks'] button:has-text('Fin')")
        for w in ["venit", "perhiberet", "crederent"]: W(w).click()
        pg.click(f"{B} button:has-text('Check the verbs')"); pg.wait_for_timeout(200)
        print("  step after verbs:", pg.locator(f"{B} h3").inner_text())
        pg.locator(f"{B} [aria-label='Sentence to bracket'] [data-w]").nth(4).click()   # ut (first)
        W("illum").click()
        uts = pg.locator(f"{B} [aria-label='Sentence to bracket'] [data-w]", has_text="ut")
        pg.locator(f"{B} [aria-label='Sentence to bracket'] [data-w]").nth(9).click(); W("illum").click()   # second ut
        print("  bracketed:", pg.locator(f"{B} [aria-label='Sentence to bracket']").inner_text())
        pg.click(f"{B} button:has-text('Check the brackets')"); pg.wait_for_timeout(200)
        print("  result:", pg.locator(f"{B} h3").inner_text(), "|", pg.locator(f"{B} [aria-label='Structure']").inner_text().replace("\n", " / "))
        pg.click("[role=dialog] button:has-text('Back to the passage')")
        # 2. Study → Bracket
        pg.click("nav[aria-label='Section'] button:has-text('Study')"); pg.click("nav[aria-label='Practice mode'] button:has-text('Bracket')")
        pg.wait_for_selector(f"{B} [aria-label='Sentence to bracket']", timeout=15000)
        print("2 study mode:", pg.locator("[aria-label='Bracketing practice'] p.smallcaps").inner_text(), "|", pg.locator(f"{B} [aria-label='Sentence to bracket']").inner_text()[:70])
        pg.click(f"{B} button:has-text('How many verbs?')"); print("  hint:", pg.locator(f"{B} p:has-text('This sentence has')").inner_text())
        pg.click(f"{B} button:has-text('Check the verbs')"); pg.click(f"{B} button:has-text('Show them and go on')")
        pg.click(f"{B} button:has-text('Where do clauses open?')"); print("  open hint:", pg.locator(f"{B} p:has-text('Clauses open at')").inner_text())
        pg.click(f"{B} button:has-text('Check the brackets')"); pg.wait_for_timeout(200)
        if pg.locator(f"{B} button:has-text('Show the answer')").count(): pg.click(f"{B} button:has-text('Show the answer')")
        print("  structure lines:", pg.locator(f"{B} [aria-label='Structure'] p").count())
        # Summa, test mode
        pg.click("[aria-label='Bracketing practice'] [aria-label='Text'] button:has-text('Summa')"); pg.wait_for_timeout(1500)
        pg.click("[aria-label='Bracketing practice'] [aria-label='Mode'] button:has-text('Test')"); pg.wait_for_selector("section[aria-label='Bracketing test']", timeout=10000)
        T = "section[aria-label='Bracketing test']"
        print("3 summa test:", pg.locator(f"{T} h3 + span").inner_text(), "|", pg.locator(f"{T} [aria-label='Sentence to bracket']").inner_text()[:70])
        pg.locator(f"{T} [aria-label='Sentence to bracket'] [data-w]").first.click()
        pg.click(f"{T} button:has-text('Check')"); print("  score:", pg.locator(f"{T} [role=status]").inner_text())
        pg.click(f"{T} button:has-text('Show the answer')"); print("  answer:", pg.locator(f"{T} [aria-label='Sentence to bracket']").inner_text()[:120])
        for part in ["Matins", "Hymns", "Psalms", "New Testament"]:
            pg.click(f"[aria-label='Bracketing practice'] [aria-label='Text'] button:has-text('{part}')"); pg.wait_for_selector(f"{T} [aria-label='Sentence to bracket']", timeout=10000); pg.wait_for_timeout(500)
            print("  ", part, ":", pg.locator(f"{T} [aria-label='Sentence to bracket']").inner_text()[:60])
        print("  history:", pg.locator("[aria-label='Bracketing practice'] p:has-text('Your last')").inner_text())
        # 4. Settings → Bracketing
        S = "section[aria-label='Settings']"
        pg.click("button[aria-label='Settings']"); pg.wait_for_selector(S)
        pg.click(f"{S} button[aria-expanded]:has-text('Bracketing')")
        pg.click(f"{S} [aria-label='Finite verb'] button:has-text('Wavy')"); pg.click(f"{S} [aria-label='Clause brackets'] button:has-text('{{ }}')"); pg.check("#brk-phr")
        print("4 settings:", pg.evaluate("JSON.stringify((({brkFin,brkCl,brkPh,brkPhr})=>({brkFin,brkCl,brkPh,brkPhr}))(JSON.parse(localStorage['lectio-vulgata-settings'])))"))
        pg.click("button[aria-label='Settings']")
        print("  bracket tools now:", pg.locator(f"{T} [aria-label='Brackets'] button").all_inner_texts())
        print("ERRORS:", errs)
        b.close()
finally:
    srv.terminate()
