"""My class list: add NT chapters and Summa sed contra / respondeo, the word list, a quiz (grades the flashcards), flashcards from the list."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8785", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8785/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        pg.click("nav[aria-label='Practice mode'] button:has-text('Class quiz')"); pg.wait_for_selector("text=Add this section", timeout=20000)
        print("0 Class quiz button opens My class list; pressed:", pg.locator("nav[aria-label='Practice mode'] button[aria-pressed='true']").inner_text())
        pg.select_option("#cv-book", "mt"); pg.select_option("#cv-c1", "5"); pg.select_option("#cv-c2", "7")
        pg.click("button:has-text('Add this section')"); pg.wait_for_selector("[aria-label='Words in these sections']", timeout=30000)
        n1 = pg.locator("[aria-label='Words in these sections'] strong.num").first.inner_text()
        print("1 Matthew 5–7:", n1, "words |", pg.locator("[aria-label='My class sections'] li").all_inner_texts())
        pg.click("[aria-label='Text'] button:has-text('Summa')")
        pg.wait_for_selector("#cv-p", timeout=10000)
        pg.select_option("#cv-p", "2-2"); pg.select_option("#cv-q", "27"); pg.select_option("#cv-a", "2")
        print("  II-II q.27 a.2 option:", pg.locator("#cv-a option:checked").inner_text(), "| question:", pg.locator("#cv-q option:checked").inner_text())
        print("  parts ticked:", [pg.locator("[aria-label='Parts of the article'] label").nth(i).inner_text() for i in range(4) if pg.locator("[aria-label='Parts of the article'] input").nth(i).is_checked()])
        pg.click("button:has-text('Add this section')"); pg.wait_for_timeout(2500)
        print("2 with Summa:", pg.locator("[aria-label='Words in these sections'] strong.num").first.inner_text(), "words |", pg.locator("[aria-label='My class sections'] li").all_inner_texts())
        pg.click("text=Show the word list"); rows = pg.locator(".class-list tbody tr")
        print("  list:", rows.count(), "rows | top:", [rows.nth(i).inner_text().replace("\t", " | ") for i in range(4)])
        # only the Summa section: are the words from sed contra / respondeo only?
        pg.locator("[aria-label='My class sections'] li").first.locator("button").click(); pg.wait_for_timeout(1500)
        words = json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-class')"))["words"]
        print("3 Summa II-II q27 a2 sc+resp only:", len(words), "words | examples:", [w[3][:50] for w in words[:2]], "| refs:", sorted(set(w[2] for w in words)))
        has_obj = any("Videtur" in w[3] or "Praeterea" in w[3] for w in words)
        print("  any objection text in examples:", has_obj)
        # quiz
        pg.click("button:has-text('Quiz me (20)')"); pg.wait_for_selector("[aria-label='Quiz question']", timeout=10000)
        n = int(pg.locator("[aria-label='Quiz question'] span.num").inner_text().split(" of ")[1].split(" ")[0])
        kinds = []
        for i in range(n):
            q = pg.locator("[aria-label='Quiz question']")
            kinds.append(q.locator(".smallcaps").inner_text())
            q.locator("button.rounded-md.border").nth(i % 4).click()
            q.locator("button:has-text('Next'), button:has-text('See my score')").click()
        print("4 quiz:", n, "questions |", {k: kinds.count(k) for k in set(kinds)}, "|", pg.locator("[aria-label='Quiz result'] h3").inner_text())
        vc = json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-v2')"))["vcards"]
        print("  flashcards graded by the quiz:", len(vc))
        if pg.locator("button:has-text('Quiz me on these again')").count():
            pg.click("button:has-text('Quiz me on these again')"); pg.wait_for_selector("[aria-label='Quiz question']", timeout=5000)
            print("  retake on misses:", pg.locator("[aria-label='Quiz question'] span.num").inner_text())
            pg.click("text=End the quiz"); pg.click("button:has-text('Back to my list')")
        else:
            pg.click("button:has-text('Back to my list')")
        # flashcards
        pg.click("button:has-text('Learn with flashcards')"); pg.wait_for_selector("text=Show meaning", timeout=10000)
        print("5 flashcard:", pg.locator("article p.latin").first.inner_text(), "| example:", pg.locator("article p.latin").nth(1).inner_text()[:80])
        pg.click("text=‹ My class list"); pg.wait_for_selector("text=Add this section", timeout=5000)
        # own words, e.g. a textbook chapter
        pg.click("[aria-label='Text'] button:has-text('My own words')")
        pg.fill("#cv-own", "gratia, gratiae, f. – grace, favor\ncaritas, caritatis, f. - charity\nvenio, venire, veni, ventum: come\nzzqword - a made-up word\nbenevolentia")
        pg.click("button:has-text('Add these words')"); pg.wait_for_timeout(1500)
        cl = json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-class')"))
        print("7 own words:", [(o["head"][:20], o["gloss"], o["lemma"]) for o in cl["own"]], "| list starts:", [w[0] for w in cl["words"][:6]])
        if pg.locator(".class-list").count() == 0: pg.click("text=Show the word list")
        print("  table top:", [pg.locator(".class-list tbody tr").nth(i).inner_text().replace("\t", " | ") for i in range(5)])
        pg.click("button:has-text('Quiz me (20)')"); pg.wait_for_selector("[aria-label='Quiz question']", timeout=10000)
        seen = set()
        for i in range(20):
            q = pg.locator("[aria-label='Quiz question']")
            if not q.count(): break
            seen.add(q.locator("p").nth(0).inner_text() if q.locator("p").count() else "")
            q.locator("button.rounded-md.border").first.click()
            q.locator("button:has-text('Next'), button:has-text('See my score')").click()
        print("  quiz with own words ran:", pg.locator("[aria-label='Quiz result'] h3").inner_text())
        pg.click("button:has-text('Back to my list')")
        # write-it-out quiz
        pg.click("button:has-text('Write-it-out quiz')"); pg.wait_for_selector("[aria-label='Write-it-out question']", timeout=10000)
        shown = []
        for i in range(6):
            q = pg.locator("[aria-label='Write-it-out question']")
            if not q.count(): break
            prompt = q.locator("p.latin").first.inner_text(); label = q.locator("label").first.inner_text().split("\n")[0]
            inputs = q.locator("input")
            if inputs.count() >= 2: inputs.nth(0).fill("-are, -avi, -atum")
            inputs.nth(inputs.count() - 1 if inputs.count() < 3 else 1).fill("to love")
            q.locator("button:has-text('Check')").click(); pg.wait_for_timeout(300)
            marks = q.locator("p span.rounded").all_inner_texts()
            shown.append((prompt, label, marks))
            b2 = q.locator("button:has-text('Next'), button:has-text('No')").first; b2.click(); pg.wait_for_timeout(150)
        for x in shown: print("  W", x)
        pg.click("text=End the quiz") if pg.locator("text=End the quiz").count() else None
        print("8 write quiz result:", pg.locator("[aria-label='Quiz result'] h3").inner_text())
        pg.click("button:has-text('Back to my list')")
        pg.reload(); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000); pg.wait_for_timeout(1500)
        print("6 after reload, deck kept:", pg.locator("[aria-label='My class sections'] li").all_inner_texts())
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
