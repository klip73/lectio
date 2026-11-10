"""Put the ecclesiastical sense first in the meanings of key church words (data/lexicon.json).
Usage: python3 -I tools/data/church_glosses.py data tools/data/church_glosses.json   (after apply_fixes.py; safe to run twice)"""
import sys, os, json, unicodedata
DATA, SRC = sys.argv[1], sys.argv[2]
def n1(w):
    w = unicodedata.normalize("NFD", w.lower()); w = "".join(c for c in w if not unicodedata.combining(c))
    return w.replace("j", "i").replace("v", "u")
over = {n1(k): v for k, v in json.load(open(SRC)).items() if not k.startswith("_")}
p = os.path.join(DATA, "lexicon.json"); lex = json.load(open(p))
n = 0
for e in lex["lemmas"]:
    church = over.get(n1(e[0]))
    if not church or len(e) < 2: continue
    g = e[1] or ""
    if g.startswith("† "): g = g.split(" · ", 1)[1] if " · " in g else ""; e[1] = g   # an older run's marker
    if g.startswith(church): continue                                       # already applied
    first = g.split(";")[0].split(",")[0].strip().lower()
    if church.lower().startswith(first) and len(first) > 2 and church.lower().split(";")[0].strip() == first: continue   # adds nothing
    e[1] = church + (" · " + g if g else "")
    n += 1
json.dump(lex, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
print(f"church senses added to {n} entries")
