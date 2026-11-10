"""Backup reminder: shown once there is progress to lose and no recent backup; saving or "remind me next week" hides it."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8788", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
now = int(time.time() * 1000)
prog = {"v": 6, "cards": {}, "pcards": {}, "vcards": {f"w{i}": {"box": 2, "n": 1, "last": now, "due": now + 9e8, "ema": 1} for i in range(20)}, "vtap": [], "sittings": [], "mistakes": [], "skill": {}, "ability": {}, "oread": [], "exam": "", "updated": now}
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 400, "height": 900}, accept_downloads=True); pg = ctx.new_page()
        ctx.add_init_script("Object.defineProperty(window, 'claude', { value: undefined, writable: false })")
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.goto("http://127.0.0.1:8788/t.html"); pg.evaluate(f"localStorage.setItem('lectio-vulgata-v2', {json.dumps(json.dumps(prog))}); localStorage.setItem('lectio-vulgata-prefs', JSON.stringify({{welcomed: true}}))")
        pg.reload(); pg.wait_for_selector("text=Today’s session", timeout=20000)
        r = pg.locator("[aria-label='Back up your progress']")
        print("1 reminder shown:", r.count(), "|", r.inner_text()[:120].replace("\n", " ") if r.count() else "")
        with pg.expect_download() as dl: r.locator("button:has-text('Save progress file')").click()
        print("2 file:", dl.value.suggested_filename, "| reminder gone:", pg.locator("[aria-label='Back up your progress']").count() == 0, "| backed up:", "at" in json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-backup')")))
        pg.evaluate("localStorage.removeItem('lectio-vulgata-backup')"); pg.reload(); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("text=Remind me next week"); pg.wait_for_timeout(200)
        pg.reload(); pg.wait_for_selector("text=Today’s session", timeout=20000)
        print("3 snoozed, after reload hidden:", pg.locator("[aria-label='Back up your progress']").count() == 0)
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
