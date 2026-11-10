"""Pack the generated Office for the page.
Usage: python3 -I tools/office/pack_office.py <raw dir from build_office.py> data [version id] [version name]
With a version id, writes data/office/v/<id>/ instead (another Divinum Officium calendar) and lists it in data/office/versions.json.
Writes data/office/: index.json (years), days-YYYY.json, common.json (sections used on 30 or more days: psalms, fixed prayers,
the Ordinary of the Mass), and per calendar month m-MM.json (Matins), d-MM.json (the other hours), x-MM.json (the Mass) with every
other section used that month; forms.json (word form -> parsing ids, for tapping words)."""
import sys, os, re, json, glob, collections, unicodedata
RAW, DATA = sys.argv[1], sys.argv[2]
VID = sys.argv[3] if len(sys.argv) > 3 else ""
VNAME = sys.argv[4] if len(sys.argv) > 4 else "Rubrics 1960 - 1960"
OUT = os.path.join(DATA, "office", "v", VID) if VID else os.path.join(DATA, "office"); os.makedirs(OUT, exist_ok=True)
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
groups = {f"{g}-{m:02d}": {k: P[k] for k in P if use[k] < 30 and f"{g}-{m:02d}" in where[k]} for g in "mdx" for m in range(1, 13)}
if not VID:
    json.dump(common, open(os.path.join(OUT, "common.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    for name, part in groups.items():
        json.dump(part, open(os.path.join(OUT, name + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
else:
    # Format 2 (the other calendars): their sections repeat whole psalms and prayers with small differences from day to day,
    # so each line is stored once: a section is [[Latin line ids], [English line ids]]; texts are in "L" of the same file,
    # or in lines.json (lines used in four or more of the month files, loaded once).
    files = {"common": common, **groups}
    seen = collections.Counter()
    for f in files.values():
        ls = set(l for la, en in f.values() for l in la + en)
        seen.update(ls)
    shared = {l for l, n in seen.items() if n >= 4}
    lid = {l: b36(i) for i, l in enumerate(sorted(seen, key=lambda l: (-seen[l], l)))}
    json.dump({lid[l]: l for l in shared}, open(os.path.join(OUT, "lines.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    for name, f in files.items():
        L = {}
        sec = {}
        for k, (la, en) in f.items():
            sec[k] = [[lid[l] for l in la], [lid[l] for l in en]]
            for l in la + en:
                if l not in shared: L[lid[l]] = l
        json.dump({"s": sec, "L": L}, open(os.path.join(OUT, name + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
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
json.dump({"years": years, "rubrics": VNAME, "source": "Divinum Officium", **({"fmt": 2} if VID else {})}, open(os.path.join(OUT, "index.json"), "w"))
if VID:
    # The list of other calendars the Liturgy section offers.
    INFO = {
        "t1570": ("roman", "Tridentine 1570", "St Pius V’s Breviary and Missal"),
        "t1888": ("roman", "Tridentine 1888", "as revised under Leo XIII"),
        "t1906": ("roman", "Tridentine 1906", "just before St Pius X’s psalter reform"),
        "da1939": ("roman", "Divino Afflatu 1939", "St Pius X’s psalter (1911), 1939 calendar"),
        "da1954": ("roman", "Divino Afflatu 1954", "the books before the 1955 and 1960 reforms"),
        "r1955": ("roman", "Reduced 1955", "Pius XII’s simplification of the rubrics"),
        "usa": ("roman", "1960 with newer US feasts", "1962 books, with feasts added since"),
        "m1617": ("monastic", "Monastic 1617", "Benedictine Breviary, Tridentine"),
        "m1930": ("monastic", "Monastic 1930", "Benedictine, after Divino Afflatu"),
        "m1963": ("monastic", "Monastic 1963", "Benedictine, 1960 rubrics"),
        "m1963b": ("monastic", "Monastic 1963 (Le Barroux)", "as kept at Sainte-Madeleine du Barroux"),
        "c1951": ("cist", "Cistercian 1951", "Cistercian Breviary"),
        "cav": ("cist", "Cistercian (Altovadensis)", "the use of Hohenfurth (Vyšší Brod)"),
        "op1962": ("op", "Dominican 1962", "Ordo Praedicatorum: Office and Dominican Mass"),
    }
    vf = os.path.join(DATA, "office", "versions.json")
    vs = [v for v in (json.load(open(vf)) if os.path.exists(vf) else []) if v["id"] != VID]
    g, label, note = INFO.get(VID, ("roman", VNAME, ""))
    vs.append({"id": VID, "name": VNAME, "group": g, "label": label, "note": note, "years": years})
    order = list(INFO)
    vs.sort(key=lambda v: order.index(v["id"]) if v["id"] in order else 99)
    json.dump(vs, open(vf, "w"), ensure_ascii=False, indent=0)
print(f"years {years[0]}-{years[-1]}; common {len(common)} sections; forms {len(forms)} of {len(words)} words known")
