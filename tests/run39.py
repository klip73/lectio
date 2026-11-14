"""Learn: the course home, a reading chapter (margin notes, tapped notes, word help, grammar, pensa A/B/C), a grammar
lesson (tables, Forms link, Latin answers checked in any order, Vulgate reading with Douay-Rheims), finishing a lesson
(words into Vocabulary → Course words, Due now), the where-to-start check, Home tile, backup carrying the course."""
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
        pg.goto("http://127.0.0.1:8799/t.html"); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000)
        if pg.locator("[aria-label='Welcome'] button:has-text('Skip for now')").count(): pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        print("0 nav:", pg.locator("nav[aria-label='Section'] button").all_inner_texts())
        nav = pg.locator("nav[aria-label='Section']").bounding_box(); print("  nav width:", nav["width"])
        pg.click("nav[aria-label='Section'] button:has-text('Learn')"); pg.wait_for_selector("[aria-label='Reading course']", timeout=10000)
        print("1 course home:", pg.locator("h2").first.inner_text(), "|", pg.locator("[aria-label='Chapters'] li").count(), "chapters,", pg.locator("[aria-label='Lessons'] li").count(), "lessons")
        pg.click("[aria-label='Reading course'] button:has-text('Start')"); pg.wait_for_selector("text=Capitulum I", timeout=10000)
        print("2 chapter:", pg.locator("h2").first.inner_text(), "| margin notes:", pg.locator("[aria-label='Margin notes'] span").count(), "| dotted words:", pg.locator(".lw.cn").count())
        pg.locator(".lw.cn", has_text="oppidum").first.click(); pg.wait_for_timeout(300)
        print("  tapped note:", pg.locator(".reveal").first.inner_text()[:80].replace("\n", " "))
        pg.locator(".reveal button:has-text('English')").first.click(); pg.wait_for_timeout(2500)
        print("  word help panel:", pg.locator(".fixed.bottom-0").count() and pg.locator(".fixed.bottom-0").inner_text()[:100].replace("\n", " | "))
        pg.locator("[aria-label='Grammatica'] button:has-text('Show')").click(); print("  grammar items:", pg.locator("[aria-label='Grammatica'] li").count())
        a = pg.locator("[aria-label='Pēnsum A: endings'] input")
        for i, v in enumerate(["um", "a", "ae", "a", "a", "x"]): a.nth(i).fill(v)
        pg.locator("[aria-label='Pēnsum A: endings'] button:has-text('Check')").click()
        print("3 pensum A:", pg.locator("[aria-label='Pēnsum A: endings']").inner_text()[-90:].replace("\n", " | "))
        c = pg.locator("[aria-label='Pensum C'] textarea").first; c.fill("Nursia in Italia est."); pg.locator("[aria-label='Pensum C'] button:has-text('Show the answer')").first.click()
        print("  pensum C:", pg.locator("[aria-label='Pensum C'] li").first.inner_text()[:120].replace("\n", " | "))
        pg.click("button:has-text('I’ve read this chapter')"); pg.wait_for_selector("text=Capitulum II", timeout=5000)
        print("4 next:", pg.locator("h2").first.inner_text())
        # grammar lesson 3
        pg.click("button:has-text('All of Learn')"); pg.locator("[aria-label='Lessons'] button", has_text="second declension").click(); pg.wait_for_selector("text=Lesson 3", timeout=5000)
        print("5 lesson:", pg.locator("h2").first.inner_text(), "| tables:", pg.locator("table").count(), "| forms buttons:", pg.locator("button:has-text('dominus →')").count())
        t = pg.locator("[aria-label='Exercises'] textarea")
        n_la = pg.locator("[aria-label='Exercises'] ol").first.locator("li").count()
        t.nth(n_la).fill("in agro discipuli sunt"); pg.locator("[aria-label='Exercises'] ol").nth(1).locator("button:has-text('Check')").first.click()
        print("  en→la any order:", pg.locator("[aria-label='Exercises'] ol").nth(1).locator("li").first.inner_text()[:110].replace("\n", " | "))
        t.nth(n_la + 1).fill("Libros puerorum videmus"); pg.locator("[aria-label='Exercises'] ol").nth(1).locator("button:has-text('Check')").first.click()
        print("  2nd:", pg.locator("[aria-label='Exercises'] ol").nth(1).locator("li").nth(1).inner_text()[:90].replace("\n", " | "))
        print("  reading:", pg.locator("[aria-label='Reading'] p[lang='la']").first.inner_text()[:60])
        # a Vulgate reading
        pg.click("button:has-text('Lesson 4 ›')"); pg.click("button:has-text('Lesson 5 ›')"); pg.click("button:has-text('Lesson 6 ›')"); pg.wait_for_timeout(1500)
        print("6 Vulgate:", pg.locator("[aria-label='Reading'] p[lang='la']").first.inner_text()[:70], "|", pg.locator("[aria-label='Reading'] span:has-text('Vulgate')").first.inner_text())
        pg.locator("[aria-label='Reading'] input[type='checkbox']").check(); print("  douay:", pg.locator("[aria-label='Reading'] p.italic").first.inner_text()[:60])
        pg.click("button:has-text('Lesson learnt')"); pg.wait_for_selector("text=Lesson 7", timeout=5000)
        pg.click("button:has-text('All of Learn')"); pg.wait_for_timeout(300)
        print("7 progress:", pg.locator("[aria-label='Reading course'] span.text-soft").inner_text(), "|", pg.locator("[aria-label='Grammar course'] span.text-soft").inner_text(), "|", pg.locator("button:has-text('Course words')").inner_text())
        pg.click("button:has-text('Course words')"); pg.wait_for_timeout(2500)
        print("8 deck:", pg.locator("button[aria-pressed='true']:has-text('Course words')").count(), "|", pg.locator("article").first.inner_text()[:160].replace("\n", " | ") if pg.locator("article").count() else pg.locator("main, body").inner_text()[:200])
        # where to start
        pg.click("nav[aria-label='Section'] button:has-text('Learn')"); pg.wait_for_timeout(300)
        pg.wait_for_selector("[aria-label='How to use it']"); pg.click("button:has-text('Find where to start')"); pg.wait_for_selector("text=Question 1 of 10")
        right = {"laudāmus": "we praise", "fīlia Marīae": "Mary’s daughter", "Dominum vident.": "They see the Lord."}
        for k in range(3):
            qt = pg.locator("[aria-label='How to use it'] .rounded-md.border p.latin").first.inner_text(timeout=5000)
            pg.locator("[aria-label='How to use it']").get_by_role("button", name=right[qt], exact=True).click()
        pg.click("button:has-text('I don’t know')")
        print("9 check:", pg.locator("[aria-label='How to use it'] .rounded-md.border p").first.inner_text()[:120])
        pg.click("nav[aria-label='Section'] button:has-text('⌂')"); pg.wait_for_timeout(500)
        print("10 home tile:", pg.locator("button:has-text('Learn Latin from the beginning')").count(), "| continue:", [x[:50] for x in pg.locator("[aria-label='Continue'] button").all_inner_texts()])
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
