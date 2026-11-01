import subprocess, time, sys, re
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8771", "--bind", "127.0.0.1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 430, "height": 1000})
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8771/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.click("nav button:has-text('Forms')"); pg.wait_for_selector("[aria-label='Forms of dico']", timeout=20000)
        sec = pg.locator("[aria-label='Forms of dico']")
        print("1 dico head:", sec.locator("h2").inner_text(), "|", sec.locator("p").first.inner_text())
        print("  cards:", sec.locator("h4").all_inner_texts()[:10])
        pg.locator("[aria-label='Voice'] button:has-text('Passive')").click(); pg.wait_for_timeout(200)
        print("  passive impf subj 3pl present:", sec.locator("text=dicerentur").count(), "| perfect passive:", sec.locator("text=dictus sum").count())
        pg.fill("#forms-search", "loqu"); pg.wait_for_timeout(300)
        print("2 search hits:", pg.locator("[role='listbox'] li").all_inner_texts()[:4])
        pg.locator("[role='listbox'] li").first.click(); pg.wait_for_timeout(300)
        print("  loquor:", pg.locator("section[aria-label^='Forms of'] p").first.inner_text())
        for w in ["res", "omnis", "qui", "possum"]:
            pg.locator(f"button:has-text('{w}')").first.click(); pg.wait_for_timeout(200)
            print("  ", w, "→", pg.locator("section[aria-label^='Forms of'] p").first.inner_text()[:70], "| cells:", pg.locator("section[aria-label^='Forms of'] td span.latin").count())
        # from a passage word
        pg.click("nav button:has-text('Passages')"); pg.wait_for_selector("text=Tap any word", timeout=15000)
        lw = pg.locator("p.lt .lw")
        for i in range(lw.count()):
            lw.nth(i).click(); pg.wait_for_timeout(150)
            if pg.locator("text=All forms of").count(): break
        word = lw.nth(i).inner_text()
        pg.locator("text=All forms of").first.click(); pg.wait_for_timeout(800)
        print("3 from word:", word, "→", pg.locator("section[aria-label^='Forms of'] h2").inner_text(), "|", pg.locator("section[aria-label^='Forms of'] p").nth(1).inner_text()[:90], "| highlighted:", pg.locator("section[aria-label^='Forms of'] .bg-rubrictint").count())
        # trainer: write
        pg.click("[aria-label='Forms view'] button:has-text('Trainer')"); pg.wait_for_timeout(200)
        pg.click("[aria-label='What to practise'] button:has-text('Verbs')"); pg.select_option("#forms-set", "top")
        pg.locator("[aria-label='Task'] button, [aria-label='Trainer settings'] button:has-text('Write the form')").first.click()
        pg.click("[aria-label='Trainer settings'] button:has-text('Start')"); pg.wait_for_selector("#forms-answer")
        good = 0
        for i in range(10):
            sec = pg.locator("[aria-label='Form trainer']")
            prompt = sec.inner_text().split("\n")
            pg.fill("#forms-answer", "xx"); pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
            fb = sec.locator("[aria-live='polite'] p").first.inner_text()
            if i < 3: print("4 Q:", prompt[2:5], "→", fb[:110])
            pg.keyboard.press("Enter"); pg.wait_for_timeout(100)
        print("  results:", pg.locator("[aria-label='Results'] h3").inner_text(), "| missed listed:", pg.locator("[aria-label='Results'] li").count())
        pg.click("button:has-text('Practise the')"); pg.wait_for_selector("#forms-answer")
        # answer correctly using the shown answer via 'Show me' then retry is complex; just check right answer path:
        pg.click("button:has-text('Show me')"); pg.wait_for_timeout(100)
        ans = pg.locator("[aria-label='Form trainer'] [aria-live='polite'] p span.font-bold").first.inner_text()
        print("  show me answer:", ans)
        pg.click("[aria-label='Form trainer'] button:has-text('Next')")
        pg.fill("#forms-answer", "zz")
        # parse mode
        pg.goto("http://127.0.0.1:8771/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("nav button:has-text('Forms')"); pg.wait_for_timeout(1500)
        pg.click("[aria-label='Forms view'] button:has-text('Trainer')")
        pg.click("[aria-label='Trainer settings'] button:has-text('Parse the form')"); pg.click("[aria-label='Trainer settings'] button:has-text('Start')"); pg.wait_for_timeout(300)
        sec = pg.locator("[aria-label='Form trainer']")
        print("5 parse Q:", sec.locator("p.latin, p[lang='la']").first.inner_text(), "| selects:", sec.locator("select").count())
        for sid, v in [("#p-pn", "3p"), ("#p-tense", "p"), ("#p-mood", "i"), ("#p-voice", "a")]:
            if pg.locator(sid).count(): pg.select_option(sid, v)
        sec.locator("button:has-text('Check')").click(); pg.wait_for_timeout(100)
        print("  feedback:", sec.locator("[aria-live='polite'] p").first.inner_text()[:140])
        # agreement + pronouns
        pg.click("button:has-text('Next')") if False else None
        pg.goto("http://127.0.0.1:8771/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("nav button:has-text('Forms')"); pg.wait_for_timeout(1500); pg.click("[aria-label='Forms view'] button:has-text('Trainer')")
        for what in ["Noun + adjective", "Pronouns", "Nouns", "Adjectives"]:
            pg.click(f"[aria-label='What to practise'] button:has-text('{what}')")
            pg.click("[aria-label='Trainer settings'] button:has-text('Write the form')") if what != "Noun + adjective" else None
            pg.click("[aria-label='Trainer settings'] button:has-text('Start')"); pg.wait_for_selector("#forms-answer")
            sec = pg.locator("[aria-label='Form trainer']")
            q = " / ".join(sec.inner_text().split("\n")[2:5])
            pg.click("button:has-text('Show me')"); pg.wait_for_timeout(80)
            print("6", what, ":", q, "→", sec.locator("[aria-live='polite'] p").first.inner_text()[:80])
            pg.goto("http://127.0.0.1:8771/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
            pg.click("nav button:has-text('Forms')"); pg.wait_for_timeout(1200); pg.click("[aria-label='Forms view'] button:has-text('Trainer')")
        pg.screenshot(path="forms.png", full_page=False)
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
