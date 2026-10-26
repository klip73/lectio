import subprocess, time, json, sys
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8766", "--bind", "127.0.0.1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
def watch(pg, tag):
    pg.on("pageerror", lambda e: errs.append(tag + " PAGEERROR " + str(e)))
    pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and "fonts" not in m.text and errs.append(tag + " CONSOLE " + m.text))
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
        ctx = b.new_context(viewport={"width": 430, "height": 950}, permissions=["microphone"])
        pg = ctx.new_page(); watch(pg, "online")
        pg.goto("http://127.0.0.1:8766/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Got it')")
        pg.click("nav button:has-text('Passages')"); pg.wait_for_selector("text=Tap any word", timeout=15000)
        # skeleton
        pg.click("text=Find the skeleton first"); pg.wait_for_selector("[aria-label='Find the skeleton']")
        sk = pg.locator("[aria-label='Find the skeleton']")
        print("1 skeleton step:", sk.locator("h3").inner_text(), "| words:", sk.locator(".sk").count())
        sk.locator(".sk").nth(0).click(); sk.locator(".sk").nth(3).click()
        sk.locator("button:has-text('Check')").click(); pg.wait_for_timeout(200)
        print("  result:", sk.locator("p strong").first.inner_text(), "| ok/miss/bad:", sk.locator(".sk-ok").count(), sk.locator(".sk-miss").count(), sk.locator(".sk-bad").count())
        for _ in range(3):
            btn = sk.locator("button:has-text('Next step'), button:has-text('See the skeleton')")
            if btn.count(): btn.first.click(); pg.wait_for_timeout(150)
            if sk.locator("button:has-text('Check')").count(): sk.locator("button:has-text('Check')").click(); pg.wait_for_timeout(150)
        print("  final:", sk.inner_text().split("\n")[-3:])
        # recording
        pg.click("button:has-text('Record yourself')"); pg.wait_for_timeout(1800)
        print("2 recording state:", pg.locator("button:has-text('Stop')").count())
        pg.click("button:has-text('Stop')"); pg.wait_for_timeout(800)
        print("  audio element:", pg.locator("[aria-label='Record yourself'] audio").count(), "|", pg.locator("[aria-label='Record yourself'] p").inner_text()[:60])
        # report parse
        pg.locator("p.lt .lw").first.click(); pg.wait_for_timeout(300)
        pg.click("text=This parsing looks wrong"); pg.fill("#report-note", "should be ablative"); pg.click("button:has-text('Report')"); pg.wait_for_timeout(500)
        print("3 report:", pg.locator("text=Saved on this device, text=Thanks: reported.").count(), pg.evaluate("localStorage.getItem('lectio-vulgata-reports')")[:160])
        # blind
        before = pg.locator("article .smallcaps").first.inner_text()
        pg.check("#blind"); pg.wait_for_timeout(300)
        print("4 blind label:", before, "→", pg.locator("article .smallcaps").first.inner_text(), "| book select:", pg.locator("#book").count(), "chapter select:", pg.locator("#chapter").count())
        pg.click("text=Next passage →"); pg.wait_for_timeout(1200)
        print("  next passage label:", pg.locator("article .smallcaps").first.inner_text())
        pg.fill("#translation", "x"); pg.click("text=Check Translation"); pg.wait_for_timeout(300)
        print("  after check:", pg.locator("article .smallcaps").first.inner_text())
        # reports panel + offline panel
        pg.click("text=Skill map & backup"); pg.wait_for_timeout(300)
        print("5 reports panel:", pg.locator("text=Copy reports").count(), "| offline btn:", pg.locator("text=Download offline copy").count())
        # exam blind oral with recorder
        pg.click("nav button:has-text('Exam sitting')"); pg.select_option("#exam-scope", "nt")
        print("6 exam blind checkbox checked:", pg.is_checked("#exam-blind"))
        pg.click("text=Start sitting"); pg.wait_for_selector("section[aria-label^='Part'] article", timeout=20000); pg.wait_for_timeout(600)
        print("  exam header:", pg.locator("section[aria-label^='Part'] article span").nth(1).inner_text(), "| recorder:", pg.locator("[aria-label='Record yourself']").count())
        pg.click("text=Finish and reveal"); pg.wait_for_timeout(400)
        print("  after reveal:", pg.locator("section[aria-label^='Part'] article span").nth(1).inner_text())
        # offline file, no network
        oc = b.new_context(viewport={"width": 1000, "height": 900}, offline=True)
        op = oc.new_page(); watch(op, "offline")
        t0 = time.time()
        op.goto("file://" + __import__("os").path.abspath(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "..", "lectio-offline.html")) + ""); op.wait_for_selector("text=Today’s session", timeout=30000)
        op.click("[aria-label='Welcome'] button:has-text('Got it')")
        op.click("nav button:has-text('Passages')"); op.wait_for_selector("text=Tap any word", timeout=20000)
        print("7 offline passage:", op.locator("article .smallcaps").first.inner_text(), "| %.1fs" % (time.time() - t0))
        op.locator("[aria-label='Exam part'] button").nth(1).click(); op.wait_for_selector("text=Tap any word", timeout=20000)
        print("  summa:", op.locator("p.lt").first.inner_text()[:70])
        op.locator("p.lt .lw").first.click(); op.wait_for_timeout(300); print("  word panel:", op.locator("[aria-live='polite'] li").first.inner_text()[:80])
        op.click("nav button:has-text('Vocabulary')"); op.wait_for_timeout(2500); print("  vocab card:", op.locator("article p[lang='la']").first.inner_text())
        op.click("nav button:has-text('Exam sitting')"); op.click("text=Start sitting"); op.wait_for_selector("section[aria-label^='Part'] article", timeout=20000)
        print("  offline exam ok")
        op.click("text=Skill map & backup"); print("  offline note:", op.locator("text=This is the offline copy").count())
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
