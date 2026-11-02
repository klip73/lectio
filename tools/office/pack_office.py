"""Pack the generated Office for the page.
Usage: python3 -I tools/office/pack_office.py <raw dir from build_office.py> data
Writes data/office/: index.json (years), days-YYYY.json, common.json (sections used on 30 or more days: psalms, fixed prayers,
the Ordinary of the Mass), and per calendar month m-MM.json (Matins), d-MM.json (the other hours), x-MM.json (the Mass) with every
other section used that month; forms.json (word form -> parsing ids, for tapping words)."""
import sys, os, re, json, glob, collections, unicodedata
RAW, DATA = sys.argv[1], sys.argv[2]
OUT = os.path.join(DATA, "office"); os.makedirs(OUT, exist_ok=True)
P = json.load(open(os.path.join(RAW, "pieces.json")))
GROUP = {"m": "m", "x": "x"}   # every other hour is in group "d"
use, where, years = collections.Counter(), collections.defaultdict(set), []
for f in glob.glob(os.path.join(OUT, "*.json")): os.remove(f)
alldays = {}
for f in sorted(glob.glob(os.path.join(RAW, "days-*.json"))):
    yr = re.search(r"days-(\d+)", f).group(1); years.append(int(yr))
    alldays[yr] = days = json.load(open(f))
    for md, d in days.items():
        seen = set()
        for h, ids in d["h"].items():
            for k in ids:
                if k not in seen: use[k] += 1; seen.add(k)
                where[k].add(GROUP.get(h, "d") + "-" + md[:2])
# Short ids (base 36, most-used first) keep the day files small.
def b36(n):
    d = "0123456789abcdefghijklmnopqrstuvwxyz"; s = ""
    while True:
        s = d[n % 36] + s; n //= 36
        if not n: return s
short = {k: b36(i) for i, k in enumerate(sorted(P, key=lambda k: (-use[k], k)))}
P = {short[k]: v for k, v in P.items()}
use = collections.Counter({short[k]: n for k, n in use.items()})
where = {short[k]: v for k, v in where.items()}
for yr, days in alldays.items():
    for d in days.values(): d["h"] = {h: [short[k] for k in ids] for h, ids in d["h"].items()}
    json.dump(days, open(os.path.join(OUT, f"days-{yr}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
common = {k: P[k] for k in P if use[k] >= 30}
json.dump(common, open(os.path.join(OUT, "common.json"), "w"), ensure_ascii=False, separators=(",", ":"))
for g in "mdx":
    for m in [f"{i:02d}" for i in range(1, 13)]:
        name = f"{g}-{m}"
        part = {k: P[k] for k in P if use[k] < 30 and name in where[k]}
        json.dump(part, open(os.path.join(OUT, name + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
# Word index: every form in the Office text that the parsed corpora know.
def norm(w):
    w = unicodedata.normalize("NFD", w.lower()).replace("æ", "ae").replace("œ", "oe")
    w = "".join(c for c in w if not unicodedata.combining(c))
    return w.replace("j", "i").replace("v", "u")
lex = json.load(open(os.path.join(DATA, "lexicon.json")))
known = collections.defaultdict(collections.Counter)
for p in lex["parts"]:
    for b in p["books"]:
        book = json.load(open(os.path.join(DATA, b[0] + ".json")))
        for ch in book["ch"]:
            for v in ch:
                for w, e in zip(re.findall(r"[A-Za-z]+", v[1]), v[3]):
                    ids = [e] if isinstance(e, int) and e >= 0 else e if isinstance(e, list) else []
                    for i in ids: known[norm(w)][i] += 1
words = set()
for la, en in P.values():  # (P is keyed by short id now)
    for line in la:
        words.update(norm(w) for w in re.findall(r"[^\W\d_]+", re.sub(r"\^[^^]*\^|\*[^*]*\*", " ", line)))
forms = {w: [i for i, _ in known[w].most_common(4)] for w in sorted(words) if w in known}
json.dump(forms, open(os.path.join(OUT, "forms.json"), "w"), separators=(",", ":"))
json.dump({"years": years, "rubrics": "1960", "source": "Divinum Officium"}, open(os.path.join(OUT, "index.json"), "w"))
print(f"years {years[0]}-{years[-1]}; common {len(common)} sections; forms {len(forms)} of {len(words)} words known")
