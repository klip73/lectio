import subprocess, time, sys, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8773", "--bind", "127.0.0.1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page()
        pg.goto("http://127.0.0.1:8773/t.html"); pg.wait_for_selector("text=Today’s session", timeout=20000)
        r = pg.evaluate("""async () => {
          const lex = await loadLex(); const ix = formsIndex(lex);
          const q = (lemma, key, input) => { const it = ix.byLemma[lemma]; const t = entryOf(it); const forms = t.finite ? (t.finite[key] || t.nonfinite[key]) : t.F[key]; return [lemma, key, input, checkWrite({ forms, t, it }, input)]; };
          const p = (lemma, form, sel) => { const it = ix.byLemma[lemma]; const t = entryOf(it); return [lemma, form, JSON.stringify(sel), checkParse({ t, it, show: form }, sel)]; };
          return [
            q("dico", "isp3p", "dicerentur"), q("dico", "rip3s", "Dicta est"), q("dico", "rip3s", "dictum est"), q("dico", "rip3s", "dictus"),
            q("amo", "pip2s", "amare"), q("audio", "ria2s", "audisti"), q("video", "pia1s", "uideo"), q("eicio", "pia3s", "ejicit"),
            q("sum", "isa3s", "foret"), q("eo", "fia3s", "ibit"), q("exeo", "fia3s", "exiet"), q("fero", "pia2s", "fers"),
            q("res", "gp", "rerum"), q("manus", "bp", "manibus"), q("omnis", "ngp", "omnium"),
            p("rego", "regeris", {pn:"2s", tense:"f", mood:"i", voice:"p"}), p("rego", "regeris", {pn:"2s", tense:"p", mood:"i", voice:"p"}), p("rego", "regeris", {pn:"2s", tense:"p", mood:"s", voice:"p"}),
            p("loquor", "loquimur", {pn:"1p", tense:"p", mood:"i"}), p("dominus", "dominis", {case:"b", num:"p"}), p("dominus", "dominis", {case:"d", num:"p"}), p("dominus", "dominis", {case:"g", num:"p"}),
            p("dico", "dicere", {tense:"p", mood:"n", voice:"a"}), p("dico", "dicere", {pn:"2s", tense:"f", mood:"i", voice:"p"})
          ];
        }""")
        for x in r: print(x)
        b.close()
finally:
    srv.terminate()
