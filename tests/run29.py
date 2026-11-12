"""Live use: share a class list (code and #class= link), feedback without email (prefilled GitHub issue), What's new on Home."""
import subprocess, time, sys, os, json, urllib.parse
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8795", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 400, "height": 900}); ctx.grant_permissions(["clipboard-read", "clipboard-write"])
        pg = ctx.new_page()
        pg.add_init_script("Object.defineProperty(window, '__LV_START', { value: '', writable: false }); window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8795/t.html"); pg.wait_for_selector("text=Exam preparation", timeout=20000)
        print("1 new user, What's new shown:", pg.locator("[aria-label='What’s new']").count(), "| seen:", pg.evaluate("localStorage.getItem('lectio-vulgata-seen')"))
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        # returning user without 'seen': card shows the latest
        pg.evaluate("localStorage.removeItem('lectio-vulgata-seen')"); pg.reload(); pg.wait_for_selector("text=Exam preparation", timeout=20000)
        card = pg.locator("[aria-label='What’s new']")
        print("  returning user card:", card.count(), "|", card.inner_text()[:110].replace("\n", " ") if card.count() else "")
        card.locator("button:has-text('Got it')").click(); print("  after Got it:", pg.locator("[aria-label='What’s new']").count())
        # feedback
        pg.click("button:has-text('Suggest an improvement')")
        f = pg.locator("[aria-label='Send feedback']")
        print("2 feedback open; post disabled:", f.locator("a:has-text('Post it on GitHub')").get_attribute("aria-disabled"))
        f.locator("button:has-text('Something’s wrong')").click(); f.locator("#fb-text").fill("The Vespers hymn shows no English")
        href = f.locator("a:has-text('Post it on GitHub')").get_attribute("href"); q = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
        print("  url:", href.split("?")[0], "| title:", q["title"][0], "| body:", q["body"][0].replace("\n", " / ")[:140])
        print("  any mailto on the page:", pg.locator("a[href^='mailto']").count())
        f.locator("button[aria-label='Close']").click()
        # class list: add a section, share
        pg.click("button:has-text('Class quiz') >> nth=0"); pg.wait_for_selector("text=Add this section", timeout=15000)
        pg.select_option("#cv-book", "jn"); pg.select_option("#cv-c1", "1"); pg.click("button:has-text('Add this section')"); pg.wait_for_selector("[aria-label='Words in these sections']", timeout=30000)
        pg.click("button:has-text('Share this list with classmates')")
        txt = pg.locator("textarea[aria-label='Class list to share']").input_value(); print("3 share text:", txt.replace("\n", " / ")[:220])
        pg.click("[aria-label='My class sections'] button:has-text('Copy')"); pg.wait_for_timeout(300)
        print("  copied ok:", pg.evaluate("navigator.clipboard.readText()") == txt)
        link = [l for l in txt.split() if "#class=" in l][0]; code = link.split("#class=")[1]
        # a classmate opens the link (fresh browser)
        pg2 = b.new_context(viewport={"width": 400, "height": 900}).new_page()
        pg2.add_init_script("Object.defineProperty(window, '__LV_START', { value: '', writable: false }); window.__LV_APP_SITE = ''")
        pg2.on("pageerror", lambda e: errs.append("PAGEERROR2 " + str(e)))
        pg2.goto("http://127.0.0.1:8795/t.html#class=" + code); pg2.wait_for_selector("button:has-text('Load this list')", timeout=30000)
        print("4 classmate sees:", pg2.locator("[aria-label='My class sections']").inner_text().split("A classmate shared this class list:")[1][:80].replace("\n", " "), "| hash cleared:", pg2.evaluate("location.hash") == "")
        pg2.click("button:has-text('Load this list')"); pg2.wait_for_selector("[aria-label='Words in these sections']", timeout=30000)
        print("  loaded sections:", pg2.evaluate("JSON.parse(localStorage.getItem('lectio-vulgata-class')).sections"), "| words:", pg2.evaluate("JSON.parse(localStorage.getItem('lectio-vulgata-class')).words.length"))
        # paste a code in the first browser: Summa articles + own words survive the round trip
        pg.evaluate("""localStorage.setItem('x', '')""")
        code2 = pg.evaluate("encodeClass({sections:[{t:'sm',p:'1',q:2,a:[1,3],parts:['resp']}], own:[{head:'gratia, -ae, f.', gloss:'grace'}], basic:false})") if pg.evaluate("typeof encodeClass") == "function" else None
        if code2 is None:
            print("  (encodeClass not global; skip pasted round trip)")
        else:
            print("  round trip:", pg.evaluate(f"JSON.stringify(decodeClass('see this: https://x/#class={code2} thanks'))"))
        pg.click("button:has-text('Load a shared list')"); pg.fill("#cls-paste", "nonsense"); print("5 bad code msg:", pg.locator("text=isn’t a class list code").count())
        pg.fill("#cls-paste", txt); print("  pasted preview:", pg.locator("[aria-label='My class sections'] p.text-ink").last.inner_text()[:90])
        # About has What's new and feedback
        pg.click("nav[aria-label='Section'] button[aria-label='Home']"); pg.click("button:has-text('How this app works')")
        pg.wait_for_selector("#new"); print("6 about: what's new", pg.locator("#new").count(), "| feedback", pg.locator("#feedback [aria-label='Send feedback']").count())
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
