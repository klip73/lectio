"""New in November: Library search, the new books (Catena Aurea, Rituale, Catechismus, 1917 Code with canon lookup),
Sunday preparation, the quick starts in Exam (sight-reading, mock from today's liturgy), past class words, mistake drills."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8790", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8790/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        # Library: shelves, search
        pg.click("nav[aria-label='Section'] button:has-text('Library')"); pg.wait_for_selector("text=Catechism and the Roman Ritual", timeout=20000)
        inp = pg.locator("input[type='search'], input[placeholder*='earch']").first
        inp.fill("caritas operatur"); inp.press("Enter"); pg.wait_for_timeout(4000)
        res = pg.locator("form[role='search'] ~ div li button")
        print("1 search 'caritas operatur':", res.count(), "|", [t[:90].replace("\n", " ") for t in res.all_inner_texts()[:3]])
        if res.count():
            res.first.click(); pg.wait_for_timeout(2500)
            print("  opened:", pg.locator("h2").first.inner_text()[:80])
            pg.click("text=‹ Library") if pg.locator("text=‹ Library").count() else None
            pg.wait_for_timeout(800)
        # 1917 canon lookup
        pg.fill("#canon17-n", "1325"); pg.wait_for_timeout(2500)
        pg.click("button:has-text('Open can. 1325')"); pg.wait_for_timeout(2500)
        print("2 can. 1325:", pg.locator("article h2").first.inner_text()[:100], "|", pg.locator("article .bg-rubrictint").first.inner_text()[:90])
        pg.click("text=‹ Library"); pg.wait_for_timeout(800)
        for wid, label in [("Catena Aurea in Matthaeum", "catena"), ("Rituale Romanum", "rituale"), ("Catechismus Romanus", "catechismus")]:
            pg.click(f"button:has-text('{wid}')"); pg.wait_for_selector("article h2", timeout=20000)
            if label == "catena":
                pg.select_option("#lib-ch", index=40); pg.wait_for_timeout(500)
            en = pg.locator("article input[type='checkbox']").count()
            print("3", label, "|", pg.locator("article h2").first.inner_text()[:70], "|", pg.locator("article p.latin").first.inner_text()[:70], "| english toggle:", en,
                  "| rubrics:", pg.locator("article p.text-rubric").count())
            pg.click("text=‹ Library"); pg.wait_for_timeout(600)
        # Sunday preparation
        pg.click("nav[aria-label='Section'] button:has-text('Liturgy')"); pg.wait_for_selector("[aria-label='Liturgy section']", timeout=15000)
        pg.click("[aria-label='Liturgy section'] button:has-text('Sunday')"); pg.wait_for_timeout(6000)
        txt = pg.locator("main, body").first.inner_text()
        heads = pg.locator("h2, h3").all_inner_texts()
        print("4 sunday:", [h for h in heads if h][:10])
        print("  has Catena:", "Catena" in txt, "| has Summa:", "Summa" in txt, "| homily:", "Homil" in txt)
        pg.screenshot(path=os.path.join(here, "sunday.png"), full_page=True)
        # Exam quick starts
        pg.click("nav[aria-label='Section'] button:has-text('Study')"); pg.click("nav[aria-label='Practice mode'] button:has-text('Exam')")
        pg.wait_for_selector("text=Timed sight-reading", timeout=10000)
        pg.click("button:has-text('Timed sight-reading')"); pg.wait_for_timeout(4000)
        print("5 sight:", pg.locator("span.smallcaps:has-text('Sight-reading')").first.inner_text()[:80])
        pg.click("button:has-text('Finish')"); pg.wait_for_timeout(1000)
        print("  next button:", pg.locator("button:has-text('Next unseen passage')").count())
        pg.click("button:has-text('Stop')"); pg.wait_for_timeout(500)
        pg.click("button:has-text('Mock exam from today’s liturgy')"); pg.wait_for_timeout(9000)
        labels = pg.locator("section h3, section .smallcaps").all_inner_texts()
        print("6 today mock:", pg.locator("span.smallcaps:has-text('today')").first.inner_text()[:80], "|", [l[:70] for l in labels if l][:12])
        pg.click("button:has-text('Abandon')") if pg.locator("button:has-text('Abandon')").count() else None
        # Past class words + mistake drills (seeded)
        pg.evaluate("""() => {
          localStorage.setItem('lectio-vulgata-class', JSON.stringify({sections: [], words: [], past: {caritas: Date.now(), gratia: Date.now(), benevolentia: Date.now()}}));
          const p = JSON.parse(localStorage.getItem('lectio-vulgata-v2')) || {v: 6, cards: {}, pcards: {}, vcards: {}, vtap: [], sittings: [], skill: {}, ability: {}, oread: [], exam: "", updated: 0};
          const m = (latin, fix) => ({ref: 'Mt 5:1', type: 'case', concept: 'abl', latin, fix, at: Date.now()});
          p.mistakes = [m('cum sedisset', 'when he had sat'), m('in monte', 'on the mountain'), m('ore suo', 'with his mouth')];
          localStorage.setItem('lectio-vulgata-v2', JSON.stringify(p));
        }""")
        pg.reload(); pg.wait_for_selector("nav[aria-label='Section']", timeout=20000); pg.wait_for_timeout(1500)
        print("7 mistake drills:", pg.locator("[aria-label='Mistake drills'] li").all_inner_texts()[:2])
        pg.click("nav[aria-label='Practice mode'] button:has-text('Class quiz')"); pg.wait_for_selector("[aria-label='Past weeks']", timeout=15000)
        print("8 past weeks:", pg.locator("[aria-label='Past weeks']").inner_text().replace("\n", " | ")[:160])
        pg.locator("[aria-label='Past weeks'] button:has-text('Quiz me')").click(); pg.wait_for_selector("[aria-label='Quiz question']", timeout=10000)
        print("  past quiz:", pg.locator("[aria-label='Quiz question'] span.num").inner_text())
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
