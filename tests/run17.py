import subprocess, time, sys, os, json
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8777", "--bind", "127.0.0.1", "--directory", here], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 430, "height": 1000})
        pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
        pg.on("console", lambda m: m.type == "error" and "ERR_" not in m.text and errs.append("CONSOLE " + m.text))
        pg.goto("http://127.0.0.1:8777/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        # 1. the estimator: simulated students of known level answering 10 questions (2 per passage, 5 passages), as the check does
        r = pg.evaluate("""() => {
          const out = {};
          for (const true_t of [0.1, 0.35, 0.6, 0.85]) {
            const ests = [];
            for (let rep = 0; rep < 200; rep++) {
              let post = plPrior();
              for (let i = 0; i < 5; i++) {
                const d = Math.max(0.05, Math.min(0.95, plMean(post)));
                for (const g of [0.25, 0.25]) { const ok = Math.random() < g + (1 - g) * pSuccess(true_t, d); post = plUpdate(post, d, ok, g); }
              }
              ests.push(plMean(post));
            }
            const m = ests.reduce((a, b) => a + b, 0) / ests.length, sd = Math.sqrt(ests.reduce((a, b) => a + (b - m) ** 2, 0) / ests.length);
            out[true_t] = [+m.toFixed(2), +sd.toFixed(2)];
          }
          return out;
        }""")
        print("1 estimator, true level → mean estimate, spread over 200 simulated students:", r)
        # 2. passage picking for every part at an easy and a hard target
        r = pg.evaluate("""async () => {
          const lex = await loadLex(); const out = {};
          for (const part of ["nt", "st", "se", "hy", "ps"]) for (const target of [0.2, 0.8]) {
            const used = new Set(), ds = [], kinds = {}; let fail = 0;
            for (let i = 0; i < 6; i++) { const it = await plItem(part, target, used, lex); if (!it) { fail++; continue; } ds.push(Math.round(it.d * 100)); it.qs.forEach(q => kinds[q.kind || "parse"] = (kinds[q.kind || "parse"] || 0) + 1); }
            out[part + "@" + target] = { ds, kinds, fail };
          }
          const it = await plItem("st", 0.5, new Set(), lex); out.sample = { la: it.la, q1: it.qs[0].q, opts: it.qs[0].opts, ans: it.qs[0].ans, q2: it.qs[1] && it.qs[1].q };
          return out;
        }""")
        for k, v in r.items(): print("2", k, v)
        # 3. the screens, answering the first option every time
        pg.click("button:has-text('Find my level')"); pg.wait_for_selector("[aria-label='Placement check'] button:has-text('Start'):not([disabled])", timeout=20000)
        pg.click("[aria-label='Placement check'] button:has-text('Start')")
        for i in range(15):
            if pg.locator("[aria-label='Placement result']").count(): break   # shorter with AI marking on
            sec = pg.locator("[aria-label='Placement question']"); sec.locator("p[lang='la']").wait_for(timeout=20000)
            if sec.locator("#pl-tr").count():   # with AI marking on: translate, then it is marked
                pg.fill("#pl-tr", "A translation of this sentence"); sec.locator("button:has-text('Mark it')").click()
                sec.locator("text=Reference:").wait_for(timeout=10000)
            for _ in range(2):
                btn = sec.locator("button.rounded-md.border.text-left:not([disabled])").first
                if btn.count(): btn.click(); pg.wait_for_timeout(50)
            sec.locator("button:has-text('Next passage'), button:has-text('See my level')").click(); pg.wait_for_timeout(300)
        print("3 result:", pg.locator("[aria-label='Placement result']").inner_text().replace("\n", " | ")[:420])
        print("  stored:", json.loads(pg.evaluate("localStorage.getItem('lectio-vulgata-v2')")).get("ability"))
        pg.click("button:has-text('Start practising')"); pg.wait_for_selector("text=Tap any word", timeout=15000)
        print("  then:", pg.locator("article .smallcaps").first.inner_text(), "| banner gone:", pg.locator("text=Not placed in").count() == 0, "| readiness:", pg.locator("text=Exam readiness").locator("..").locator("..").inner_text()[:200].replace("\n", " "))
        b.close()
finally:
    srv.terminate()
print("ERRORS:", errs)
