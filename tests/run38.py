"""run38, Nov 2026: the Settings panel (gear button). Display (sizes, sepia, drop capitals, tap targets), Latin text (vowel marks,
u/v, i/j, ae, English under, short word panel, underlined words to learn), AI switch, flashcards (daily limit, English → Latin,
typed answers), Liturgy (folded commemorations, rubric notes hidden, hour by time), Home tiles, start page, backup with settings."""
import subprocess, time, sys, os, json, re
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
# a copy of the test page that opens like the real app (no __LV_START), for the start-page setting
t = open(os.path.join(here, "t.html")).read()
open(os.path.join(here, "t3.html"), "w").write(t.replace('window.__LV_START = "study";', ''))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8799", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 860})
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and "404" not in m.text and errs.append("CONSOLE " + m.text))
        pg.add_init_script("window.__LV_APP_SITE = '';")
        pg.goto("http://127.0.0.1:8799/t.html"); pg.wait_for_selector("nav[aria-label='Practice mode']", timeout=20000)
        if pg.locator("[aria-label='Welcome'] button:has-text('Skip for now')").count(): pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        S = "section[aria-label='Settings']"
        def sect(name):
            btn = pg.locator(f"{S} button[aria-expanded]:has-text('{name}')")
            if btn.get_attribute("aria-expanded") != "true": btn.click()
        pg.click("button[aria-label='Settings']"); pg.wait_for_selector(S)
        print("1 sections:", pg.locator(f"{S} button[aria-expanded]").all_inner_texts())
        pg.click(f"{S} [aria-label='Theme'] button:has-text('Sepia')"); pg.uncheck("#set-drop"); pg.check("#set-big")
        pg.click(f"{S} [aria-label='English text size'] button:has-text('Smaller')"); pg.click(f"{S} [aria-label='Interface font'] button:has-text('Atkinson')")
        print("  theme/flags:", pg.evaluate("[document.documentElement.dataset.theme, document.documentElement.getAttribute('data-nodrop'), document.documentElement.getAttribute('data-big'), document.documentElement.style.getPropertyValue('--lv-en'), getComputedStyle(document.body).fontFamily.slice(0, 30), getComputedStyle(document.body).backgroundColor]"))
        sect("Latin text")
        ex = lambda: pg.locator(f"{S} p:has-text('Example:') span[lang='la']").inner_text()
        print("2 example as printed:", ex())
        pg.click(f"{S} [aria-label='u and v'] button:has-text('u and v')"); pg.click(f"{S} [aria-label='i and j'] button:has-text('i and j')")
        pg.click(f"{S} [aria-label='Ligatures'] button:has-text('Write ae')"); pg.click(f"{S} [aria-label='Vowel marks'] button:has-text('Plain')")
        print("  example changed:", ex())
        pg.click(f"{S} [aria-label='English translations'] button:has-text('Under')"); pg.click(f"{S} [aria-label='Tapping a word'] button:has-text('Short')")
        pg.click(f"{S} [aria-label='Underline words to learn'] button:has-text('Not in my cards')")
        sect("Liturgy")
        pg.click(f"{S} [aria-label='Commemorations'] button:has-text('Fold')"); pg.uncheck("#set-rub")
        pg.click(f"{S} [aria-label='Hour'] button:has-text('time of day')")
        print("  hour hint:", pg.locator(f"{S} span:has-text('Now that would be')").inner_text())
        pg.click(f"{S} button:has-text('Close')")
        # the Liturgy with these settings
        pg.click("nav[aria-label='Section'] button:has-text('Liturgy')"); pg.wait_for_selector("section[id^='office-']", timeout=30000); pg.wait_for_timeout(2500)
        print("3 hour opened:", pg.locator("[aria-label='Hour'] button[aria-pressed='true']").inner_text())
        la = " ".join(pg.locator("section[id^='office-'] [lang='la']").all_inner_texts())
        print("  Latin sample:", la[:300].replace("\n", " "))
        print("  accents left:", len(re.findall(r"[áéíóúǽ]", la)), "| æ left:", la.count("æ"), "| v:", len(re.findall(r"\bv", la)), "| j:", la.count("j"), "| words underlined:", pg.locator(".unk").count())
        print("  rubric notes hidden:", pg.locator(".rb").count(), [x for x in pg.evaluate("[...document.querySelectorAll('.rb')].slice(0,3).map(e => getComputedStyle(e).display)")])
        # any day with a commemoration: Lauds of 12 Nov (S. Martini, comm. ...)? walk a few days of Lauds
        found = None
        for dd in ["2026-11-12", "2026-11-11", "2026-11-09", "2026-11-08", "2026-11-25", "2026-11-23"]:
            pg.fill("#office-date", dd); pg.wait_for_timeout(1200)
            pg.click("[aria-label='Hour'] button:has-text('Lauds')"); pg.wait_for_timeout(2000)
            fb = pg.locator("section[id^='office-'] button[aria-expanded]:has-text('Commemorat')")
            if fb.count(): found = (dd, fb.first.inner_text()); break
        print("4 commemoration folded:", found)
        if found:
            fb.first.click(); pg.wait_for_timeout(300); print("  opened:", fb.first.get_attribute("aria-expanded"))
        # tap a word: the short panel
        pg.locator("section[id^='office-'] .lw").nth(5).click(); pg.wait_for_timeout(2500)
        panel = pg.locator(".fixed.inset-x-0")
        print("5 short word panel:", panel.inner_text()[:200].replace("\n", " | "))
        if panel.locator("button:has-text('More')").count(): panel.locator("button:has-text('More')").click(); pg.wait_for_timeout(400); print("  after More:", panel.inner_text()[:120].replace("\n", " | "))
        # English under the Latin, in the Library
        pg.click("nav[aria-label='Section'] button:has-text('Library')"); pg.wait_for_timeout(1500)
        # AI off, Dictionary hidden
        pg.click("button[aria-label='Settings']"); sect("AI"); pg.uncheck("#set-ai"); sect("Home & layout"); pg.uncheck("#set-dict")
        print("6 header:", pg.locator("header button").all_inner_texts())
        pg.check("#tile-class", timeout=3000); pg.uncheck("#tile-class"); pg.check("#tile-learn")
        # flashcards
        sect("Flashcards & study"); pg.select_option("#set-new", "5")
        pg.click(f"{S} [aria-label='Card direction'] button:has-text('English → Latin')"); pg.click(f"{S} [aria-label='Answering'] button:has-text('Type')")
        pg.click(f"{S} [aria-label='Daily goal'] button:has-text('Intense')")
        pg.click(f"{S} button:has-text('Close')")
        pg.click("nav[aria-label='Section'] button:has-text('Study')"); pg.wait_for_timeout(500)
        print("7 today's session:", pg.locator("[aria-label=\"Today's session\"] li").all_inner_texts()[:3])
        pg.click("nav[aria-label='Practice mode'] button:has-text('Vocab')"); pg.wait_for_selector("#vc-typed", timeout=20000)
        print("  card (English → Latin):", pg.locator("article").first.inner_text()[:160].replace("\n", " | "))
        for k in range(6):
            if not pg.locator("#vc-typed").count(): break
            pg.fill("#vc-typed", "xyz"); pg.click("article button:has-text('Check')"); pg.wait_for_timeout(200)
            if k == 0: print("  typed result:", pg.locator("article .reveal").inner_text()[:160].replace("\n", " | "))
            pg.locator("div.border-t button:has-text('Good')").click(); pg.wait_for_timeout(250)
        print("  after 5 new:", pg.locator("article").last.inner_text()[:200].replace("\n", " | "))
        # Home: tiles
        pg.click("nav[aria-label='Section'] button[aria-label='Home']"); pg.wait_for_timeout(500)
        print("8 Home tiles:", [x.split("\n")[0] for x in pg.locator(".grid.gap-3 > button, .grid.gap-3 > div").all_inner_texts()])
        st = json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-settings')"))
        print("  stored:", {k: st[k] for k in ["ai", "uv", "ij", "marks", "enShow", "newPerDay", "dir", "typed", "hideTiles", "tiles", "goal"]})
        # start page and backup code with settings, on the page that opens like the app
        pg.evaluate("localStorage.setItem('lectio-vulgata-settings', JSON.stringify({...JSON.parse(localStorage.getItem('lectio-vulgata-settings')), start: 'liturgy'}))")
        pg.goto("http://127.0.0.1:8799/t3.html"); pg.wait_for_timeout(3000)
        print("9 opens on:", pg.locator("nav[aria-label='Section'] button[aria-pressed='true']").inner_text())
        code = pg.evaluate("(() => { const p = JSON.parse(localStorage.getItem('lectio-vulgata-v2')); return null; })()")
        pg.click("nav[aria-label='Section'] button:has-text('Study')"); pg.wait_for_timeout(500)
        pg.click("button:has-text('Skill map & backup')"); pg.wait_for_timeout(500)
        ta = pg.locator("textarea[readonly], input[readonly]").first
        c = ta.input_value() if ta.count() else ""
        import base64, urllib.parse
        d = json.loads(base64.b64decode(c[4:]).decode("utf-8")) if c.startswith("LV1:") else {}
        print("10 backup carries settings:", sorted((d.get("set") or {}).get("s", {}).items())[:4], "theme:", (d.get("set") or {}).get("theme"))
        # restore into a clean browser: settings come back
        ctx = b.new_context(viewport={"width": 400, "height": 860}); p2 = ctx.new_page(); p2.add_init_script("window.__LV_APP_SITE = '';")
        p2.on("pageerror", lambda e: errs.append("PAGEERROR2 " + str(e)))
        p2.goto("http://127.0.0.1:8799/t.html"); p2.wait_for_selector("nav[aria-label='Practice mode']", timeout=20000)
        if p2.locator("[aria-label='Welcome'] button:has-text('Skip for now')").count(): p2.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        p2.click("button:has-text('Skill map & backup')"); p2.wait_for_timeout(400)
        box = p2.locator("#backup-in")
        if box.count() and c:
            box.fill(c); p2.locator("button:has-text('Restore')").first.click(); p2.wait_for_timeout(800)
            print("  restored:", p2.evaluate("[JSON.parse(localStorage.getItem('lectio-vulgata-settings')||'{}').uv, document.documentElement.dataset.theme]"))
        else: print("  (no restore box found)")
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
