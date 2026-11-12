"""Search index for the Library and the Summa, and the Summa's citations of the Gospels (for Sunday preparation).
Usage: python3 -I tools/library/build_search.py data
Writes data/search/docs.json (what each document is: a Library chapter or a Summa article), data/search/s<n>.json
(word -> documents containing it, delta-coded; docs.json says which file holds each two-letter beginning) and data/summa/cites.json
(Gospel book -> chapter -> Summa articles that cite it)."""
import sys, os, re, json, glob, unicodedata, collections
DATA = sys.argv[1]
OUT = os.path.join(DATA, "search"); os.makedirs(OUT, exist_ok=True)
def norm(x):
    x = unicodedata.normalize("NFD", x.lower()).replace("æ", "ae").replace("œ", "oe")
    return "".join(c for c in x if not unicodedata.combining(c)).replace("j", "i").replace("v", "u")
WORD = re.compile(r"[^\W\d_]+")
docs, post = [], collections.defaultdict(list)
def add(doc, texts):
    d = len(docs); docs.append(doc)
    for w in {norm(x) for t in texts for x in WORD.findall(t) if len(x) > 1}: post[w].append(d)
lib = json.load(open(os.path.join(DATA, "library", "index.json")))
for w in lib["works"]:
    work = json.load(open(os.path.join(DATA, "library", w["id"] + ".json")))
    for ci, c in enumerate(work["chapters"]): add(["L", w["id"], ci], c["paras"])
sidx = json.load(open(os.path.join(DATA, "summa", "index.json")))
ROMAN = {r: i + 1 for i, r in enumerate("I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX XXI XXII XXIII XXIV XXV XXVI XXVII XXVIII".split())}
GOS = {"Matth": "mt", "Marc": "mk", "Luc": "lk", "Ioan": "jn"}
CITE = re.compile(r"(?<![IV] )(?<![IV]\. )\b(Matth|Marc|Luc|Ioan)\.?\s+([IVXL]+)\b(?:,\s*([^.;]{0,90}))?")
cites = collections.defaultdict(lambda: collections.defaultdict(list))
for part in sidx["parts"]:
    for q in part["qs"]:
        qn = q[0]
        k = f'{part["id"]}-{(qn - 1) // 20}'
        chunk = json.load(open(os.path.join(DATA, "summa", k + ".json")))
        qd = chunk.get(str(qn))
        if not qd: continue
        for ai, art in enumerate(qd["a"]):
            add(["S", part["id"], qn, ai + 1], art)
            seen = set()
            for p in art:
                for m in CITE.finditer(p):
                    b, c = GOS[m.group(1)], ROMAN.get(m.group(2))
                    if not c or (b, c) in seen: continue
                    seen.add((b, c))
                    cites[b][c].append([part["id"], qn, ai + 1, (m.group(3) or "").strip()])
shards = collections.defaultdict(dict)
for w, ds in post.items():
    key = re.sub(r"[^a-z]", "_", w[:2].ljust(2, "_"))
    prev, out = 0, []
    for d in ds: out.append(d - prev); prev = d
    shards[key][w] = out
# pack the two-letter groups, in order, into files of about 600 KB (the online page has a limit on its number of files)
for f in glob.glob(os.path.join(OUT, "*.json")):
    if os.path.basename(f) != "docs.json": os.remove(f)
buckets, cur, size, where = [], {}, 0, {}
for k in sorted(shards):
    n = len(json.dumps(shards[k], separators=(",", ":")))
    if cur and size + n > 600_000: buckets.append(cur); cur, size = {}, 0
    cur.update(shards[k]); size += n; where[k] = len(buckets)
if cur: buckets.append(cur)
for i, v in enumerate(buckets): json.dump(v, open(os.path.join(OUT, f"s{i}.json"), "w"), separators=(",", ":"))
json.dump({"docs": docs, "where": where}, open(os.path.join(OUT, "docs.json"), "w"), separators=(",", ":"))
shards = {f"s{i}": v for i, v in enumerate(buckets)}
json.dump(cites, open(os.path.join(DATA, "summa", "cites.json"), "w"), ensure_ascii=False, separators=(",", ":"))
sizes = sorted(os.path.getsize(os.path.join(OUT, k + ".json")) for k in shards)
print(f"{len(docs)} documents, {len(post)} words, {len(shards)} shards, largest {sizes[-1] // 1024} KB, total {sum(sizes) // 1024} KB")
print("Summa Gospel citations:", {b: sum(len(v) for v in cs.values()) for b, cs in cites.items()})
