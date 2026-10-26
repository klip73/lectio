import subprocess, time, json, sys
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8765", "--bind", "127.0.0.1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 430, "height": 950})
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto("http://127.0.0.1:8765/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        pg.click("[aria-label='Welcome'] button"); pg.click("nav button:has-text('Vocabulary')"); pg.wait_for_selector("[aria-label='Deck']")
        for deck in ("All five texts", "New Testament", "Summa"):
            pg.click(f"[aria-label='Deck'] button:has-text('{deck}')"); pg.wait_for_timeout(1200)
            for i in range(3):
                front = pg.locator("article p[lang='la']").first.inner_text()
                pg.click("button:has-text('Show meaning')")
                back = " | ".join(pg.locator("article .reveal p").all_inner_texts())
                print(f"{deck} #{i+1}: {front}  →  {back[:150]}")
                pg.click("button:has-text('Knew it')") if i < 2 else pg.click("button:has-text('Didn’t know')")
        pg.click("[aria-label='Deck'] button:has-text('All five texts')"); pg.wait_for_timeout(500)
        f1 = pg.locator("article p[lang='la']").first.inner_text()
        pg.click("button:has-text('I know this already')"); pg.wait_for_timeout(300)
        print("I know this already:", f1, "→ next:", pg.locator("article p[lang='la']").first.inner_text(), "| stored box:", json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-v2')"))["vcards"].get(f1.split(",")[0], {}).get("box"))
        b.close()
finally: srv.terminate()
print("ERRORS", errs)
