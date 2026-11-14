"""Study → More: exam plan (date → weekly targets per part), sentences to review (a sentence marked "I needed help" is saved
and comes back; review grades it), phrases (quiz and examples), sacramental forms (cloze, write from memory, word-perfect,
read the whole rite); sentence by sentence in the Summa reader, a Library work and the Office."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8803", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []; fails = []
def check(name, ok, extra=""):
    print(("OK  " if ok else "FAIL"), name, extra)
    if not ok: fails.append(name)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and "404" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8803/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        # 1. a sentence marked "I needed help" is saved
        pg.click("nav[aria-label='Practice mode'] button:has-text('Passages')"); pg.wait_for_selector("button:has-text('Read it sentence by sentence')", timeout=20000)
        pg.click("button:has-text('Read it sentence by sentence')")
        d = pg.locator("[aria-label='Sentence by sentence']"); d.wait_for(timeout=10000)
        d.locator("button:has-text('Check translation')").click(); pg.wait_for_timeout(150)
        d.locator("button:has-text('I needed help')").click(); pg.wait_for_timeout(200)
        bank = json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-sbank')") or "{}")
        check("1 sentence saved to the bank", len(bank.get("items", [])) == 1, bank.get("items", [{}])[0].get("r", ["", ""])[1][:60] if bank.get("items") else "")
        d.locator("button:has-text('Back to the passage')").click(); pg.wait_for_timeout(200)
        # 2. Study → More: exam plan
        pg.click("nav[aria-label='Practice mode'] button:has-text('More')"); pg.wait_for_selector("nav[aria-label='More practice']", timeout=5000)
        pg.click("nav[aria-label='More practice'] button:has-text('Exam plan')")
        if pg.locator("#plan-date").count():
            pg.fill("#plan-date", "2027-05-14"); pg.click("button:has-text('Make my plan')"); pg.wait_for_timeout(300)
        check("2 plan shows days and five parts", pg.locator("h2:has-text('days to the exam')").count() == 1 and pg.locator("[aria-label='Passages this week'] [role=listitem]").count() == 5,
              pg.locator("[aria-label='Passages this week']").inner_text()[:120].replace("\n", " | "))
        check("  phase", pg.locator("text=This week · Building").count() == 1)
        # 3. sentences to review
        pg.click("nav[aria-label='More practice'] button:has-text('Sentences to review')"); pg.wait_for_timeout(200)
        check("3 saved sentence listed", pg.locator("text=1 saved").count() == 1)
        pg.click("button:has-text('Show all')"); pg.wait_for_timeout(100)
        pg.click("button:has-text('Review some anyway')"); d.wait_for(timeout=10000)
        d.locator("button:has-text('Check translation')").click(); pg.wait_for_timeout(100)
        d.locator("button:has-text('I got it')").click(); pg.wait_for_timeout(200)
        bank = json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-sbank')"))
        check("  graded: next in 3 days, still one item", bank["items"][0]["ivl"] == 3 and len(bank["items"]) == 1, str(bank["items"][0]["ivl"]))
        if d.count(): d.locator("button:has-text('Back to the passage')").click(); pg.wait_for_timeout(200)
        # 4. phrases
        pg.click("nav[aria-label='More practice'] button:has-text('Phrases')"); pg.wait_for_timeout(200)
        pg.click("button:has-text('Start')"); pg.wait_for_timeout(500)
        q = pg.locator("text=Question 1 of")
        check("4 phrase quiz", q.count() == 1)
        opts = pg.locator("section div.flex.flex-col.gap-1\\.5 > button")
        check("  four options", opts.count() == 4, " / ".join(opts.all_inner_texts()))
        opts.first.click(); pg.wait_for_timeout(150)
        check("  answered, Next shown", pg.locator("button:has-text('Next')").count() == 1)
        pg.click("[aria-label='View'] button:has-text('All the phrases')"); pg.wait_for_timeout(800)
        check("  examples with marks", pg.locator("li mark").count() >= 10, str(pg.locator("li mark").count()))
        pg.click("[aria-label='Kind of Latin'] button:has-text('Bible')"); pg.wait_for_timeout(300)
        check("  bible examples with English buttons", pg.locator("li button:has-text('English')").count() >= 3)
        # 5. sacramental forms
        pg.click("nav[aria-label='More practice'] button:has-text('Sacramental forms')"); pg.wait_for_timeout(200)
        pg.select_option("#form-pick", "absolm"); pg.wait_for_timeout(100)
        pg.click("[aria-label='Hide words'] button:has-text('Half')")
        cl = pg.locator("article p[lang=la]").inner_text()
        check("5 cloze hides words", "_" in cl, cl)
        pg.fill("#form-typed", "Ego te absolvo ab omnibus censuris et peccatis in nomine Patris et Filii et Spiritus Sancti Amen")
        pg.click("button:has-text('Check')"); pg.wait_for_timeout(150)
        check("  word-perfect", pg.locator("text=Word-perfect ✓").count() == 1)
        pg.fill("#form-typed", "Ego te absolvo a peccatis in nomine Patris")
        pg.click("button:has-text('Check')"); pg.wait_for_timeout(150)
        check("  partial scored", pg.locator("text=% of the words in place").count() == 1, pg.locator("[aria-live=polite] p").first.inner_text())
        pg.screenshot(path=os.path.join(here, "more-forms.png"))
        pg.click("button:has-text('Read the whole rite')"); pg.wait_for_selector("#lib-ch", timeout=20000); pg.wait_for_timeout(500)
        check("  rite opens in the Library", "Absolutiónis" in pg.eval_on_selector("#lib-ch", "s => s.options[s.selectedIndex].text"))
        # 6. sentence by sentence in a Library chapter
        pg.click("button:has-text('Read it sentence by sentence')"); d.wait_for(timeout=20000)
        check("6 library: reader opens", " 1 of " in d.locator("span.num").first.inner_text(), d.locator("span.num").first.inner_text())
        d.locator("button:has-text('Back to the passage')").click(); pg.wait_for_timeout(200)
        pg.click("button:has-text('‹ Library')"); pg.wait_for_timeout(300)
        # 7. the Summa
        pg.click("button:has-text('Summa Theologiae')"); pg.wait_for_selector("#sr-p", timeout=15000); pg.wait_for_timeout(1500)
        pg.click("button:has-text('Read it sentence by sentence')"); d.wait_for(timeout=20000)
        check("7 summa: reader opens", d.locator("span.num").first.count() == 1, d.locator("span.num").first.inner_text())
        d.locator("button:has-text('Show hints')").first.click() if d.locator("button:has-text('Show hints')").count() else None
        lw = d.locator("p[lang=la] span[role=button]")
        check("  words tappable", lw.count() >= 4, str(lw.count()))
        lw.nth(2).click(); pg.wait_for_timeout(1500)
        check("  a word shows its parsing", d.locator("text=Lewis & Short").count() + d.locator("text=Dictionary").count() >= 1, lw.nth(2).inner_text())
        d.locator("button:has-text('Back to the passage')").click(); pg.wait_for_timeout(200)
        # 8. the Office
        pg.click("nav[aria-label='Section'] button:has-text('Liturgy')"); pg.wait_for_selector("[aria-label='Liturgy section']", timeout=20000); pg.wait_for_timeout(2500)
        btn = pg.locator("section button:has-text('Sentence by sentence')")
        check("8 office: sections offer sentence by sentence", btn.count() >= 1, str(btn.count()))
        if btn.count():
            btn.first.click(); d.wait_for(timeout=20000)
            print("dialogs", d.count()); check("  office reader opens", " 1 of " in d.locator("span.num").first.inner_text(), d.locator("span.num").first.inner_text())
            pg.wait_for_timeout(300); print("  greyed words:", d.locator("p[lang=la] span[role=button]").count()); pg.screenshot(path=os.path.join(here, "more-office.png"))
        b.close()
finally:
    srv.terminate()
print("FAILS:", fails)
print("ERRORS:", errs)
