import subprocess, time, sys
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8774", "--bind", "127.0.0.1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page()
        pg.goto("http://127.0.0.1:8774/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        r = pg.evaluate("""async () => {
          const lex = await loadLex(); const bk = await loadBook("ap"); const vs = bk.ch[8].filter(v => v[0] === 18 || v[0] === 19);
          const words = []; vs.forEach((v, vi) => (v[1].match(WORD_RE) || []).forEach((w, k) => words.push({ key: vi + ":" + k, v: vi, w, e: v[3][k] })));
          const peri = periphrastic(lex, words);
          return [0, 1, 2].map(step => words.map(x => { let t = wordTruth(lex, x.e, step); if (peri.has(x.key)) t = step === 0 ? 1 : step === 2 ? null : t; return t === 1 ? x.w : t === null ? "(" + x.w + ")" : null; }).filter(Boolean).join(" "));
        }""")
        for i, x in enumerate(["verbs", "openers", "nominatives"]): print(x, ":", r[i])
        b.close()
finally:
    srv.terminate()
