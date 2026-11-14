"""Memory aids on word cards: built-in pictures (only when the meaning matches), own hook + emoji (saved, in the backup),
own photo (IndexedDB), the hint button, the Settings choices."""
import subprocess, time, sys, os, json, base64
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8801", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==")
open("/tmp/lv-test.png", "wb").write(PNG)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 400, "height": 900})
        pg.add_init_script("window.__LV_APP_SITE = ''")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8801/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        print("1 stock:", pg.evaluate("[stockPic('aqua','water'), stockPic('liber','children (pl.)'), stockPic('ovis','sheep'), Object.keys(PICS).length]"))
        pg.click("nav[aria-label='Practice mode'] button:has-text('Vocab')"); pg.wait_for_selector("text=Show meaning", timeout=20000)
        word = pg.locator("article p[lang=la]").first.inner_text()
        pg.click("text=Show meaning"); pg.wait_for_timeout(300)
        pg.click("text=Add a memory hook or picture"); pg.fill("#mn-t", "my test hook"); pg.fill("#mn-e", "🐎")
        pg.locator("section[aria-label='My memory hook'] input[type=file]").set_input_files("/tmp/lv-test.png"); pg.wait_for_timeout(600)
        print("2 photo shown:", pg.locator("article img[src^='data:image/jpeg']").count())
        pg.click("section[aria-label='My memory hook'] button:has-text('Save')"); pg.wait_for_timeout(300)
        print("  hook shown:", pg.locator("text=Your hook:").count(), "| saved:", pg.evaluate("Object.entries(JSON.parse(localStorage.getItem('lectio-vulgata-v2')||'{}').mnemo||{})")[:1] if pg.evaluate("!!localStorage.getItem('lectio-vulgata-v2')") else "(key?)")
        print("  backup round trip:", pg.evaluate("(() => { const p = loadLocalProgress(); const d = decodeBackup(encodeBackup(p)); return d && d.mnemo; })()"))
        pg.click("button:has-text('Remove my photo')") if pg.locator("button:has-text('Remove my photo')").count() else (pg.click("text=Edit my hook / picture"), pg.click("button:has-text('Remove my photo')"))
        pg.wait_for_timeout(400); print("3 photo removed, emoji now:", pg.locator("article img").count(), pg.locator("article [role=img]").all_inner_texts())
        pg.screenshot(path=os.path.join(here, "mnemo.png"))
        # the same card again on its front: hint button (default "hint")
        pg.evaluate("w => { const p = loadLocalProgress(); }", word)
        print("4 settings:", pg.evaluate("[getSet('pics'), getSet('hooks')]"))
        pg.reload(); pg.click("nav[aria-label='Practice mode'] button:has-text('Vocab')") if pg.locator("nav[aria-label='Practice mode'] button:has-text('Vocab')").count() else None
        pg.wait_for_selector("text=Show meaning", timeout=20000)
        same = pg.locator("article p[lang=la]").first.inner_text() == word
        print("5 same card:", same, "| hint button:", pg.locator("text=Hint: my memory hook").count())
        if same: pg.click("text=Hint: my memory hook"); pg.wait_for_timeout(200); print("  hint:", pg.locator("text=Your hook:").count())
        pg.evaluate("setSet({ pics: 'front' })"); pg.wait_for_timeout(300)
        print("6 picture on the front:", pg.locator("article [role=img]").all_inner_texts())
        pg.evaluate("setSet({ hooks: 'off', pics: 'off' })"); pg.wait_for_timeout(300)
        print("7 all off:", pg.locator("text=Hint: my memory hook").count(), pg.locator("article [role=img]").count())
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
