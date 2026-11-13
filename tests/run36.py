"""Write-it-out quiz with AI on: the AI also marks the forms (accepting a right variant the exact check missed) and the meaning,
and notes a wrong app gloss. Claude's sampling is mocked (window.claude.use). Also: malum's gloss is no longer "apple tree"."""
import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8796", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
MOCK = """
window.__prompts = [];
const __s = { json: async (p) => { window.__prompts.push(p);
  await new Promise(r => setTimeout(r, 200));
  if (/rest of the entry|the meaning:/.test(p)) return { forms_ok: true, forms_note: "variant accepted", meaning_ok: false, meaning_note: "AI says the meaning is off", gloss_note: "test gloss note" };
  return { ok: true, note: "fine", ex: [] }; } };
const __c = { use: async n => n === "sample" ? __s : null };
Object.defineProperty(window, 'claude', { get: () => __c, set: () => {}, configurable: false });
window.__LV_APP_SITE = '';
"""
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 420, "height": 900})
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and "404" not in m.text and errs.append("CONSOLE " + m.text))
        pg.add_init_script(MOCK)
        pg.goto("http://127.0.0.1:8796/t.html"); pg.wait_for_selector("nav[aria-label='Practice mode']", timeout=20000)
        if pg.locator("[aria-label='Welcome'] button:has-text('Skip for now')").count(): pg.click("[aria-label='Welcome'] button:has-text('Skip for now')")
        lex = json.loads(open(os.path.join(here, "..", "data", "lexicon.json")).read())
        print("0 malum gloss:", [l[1] for l in lex["lemmas"] if l[0] == "malum"])
        pg.click("nav[aria-label='Practice mode'] button:has-text('Class quiz')"); pg.wait_for_selector("text=Add this section", timeout=20000)
        pg.click("[aria-label='Text'] button:has-text('Summa')"); pg.wait_for_selector("#cv-p", timeout=10000)
        pg.select_option("#cv-p", "2-2"); pg.select_option("#cv-q", "31")
        pg.click("button:has-text('Add this section')"); pg.wait_for_selector("[aria-label='Words in these sections']", timeout=30000)
        pg.click("button:has-text('Write-it-out quiz')"); pg.wait_for_selector("[aria-label='Write-it-out question']", timeout=10000)
        for i in range(4):
            q = pg.locator("[aria-label='Write-it-out question']")
            if not q.count(): break
            prompt = q.locator("p.latin").first.inner_text()
            labels = [x.split("\n")[0] for x in q.locator("label").all_inner_texts()]
            inputs = q.locator("input")
            if inputs.count() >= 2: inputs.nth(0).fill("xxx, yyy")
            q.locator("label:has-text('Meaning') input").fill("something")
            q.locator("button:has-text('Check')").click()
            loading = q.locator("text=The AI is checking").count()
            pg.wait_for_selector("[aria-label='Write-it-out question'] .reveal >> text=meaning:", timeout=10000)
            marks = q.locator("p span.rounded").all_inner_texts()
            notes = [t for t in q.locator(".reveal p").all_inner_texts() if "meaning" in t or "Note" in t or "variant" in t]
            print("W", prompt, "| labels:", labels, "| loading shown:", bool(loading), "| marks:", marks, "| notes:", notes,
                  "| asks Yes/No:", q.locator("button:has-text('Yes')").count() == 1)
            q.locator("button:has-text('No')").first.click(); pg.wait_for_timeout(150)
        print("prompts sent:", len(pg.evaluate("window.__prompts")), "| first:", pg.evaluate("window.__prompts[0]")[:260])
        b.close()
finally:
    srv.kill()
print("ERRORS:", errs)
