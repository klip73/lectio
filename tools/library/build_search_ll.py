"""Search index for the Latin Library shelf (data/library/ll-*.json), kept apart from the main one (build_search.py) so the
Library's own search stays small: the student ticks "also the Latin Library" to use it.
    python3 -I tools/library/build_search_ll.py data [ll|va]
Writes data/search-ll/docs.json and s<n>.json, in the same shape as data/search; with "va", the Vatican documents shelf
(data/library/va-*.json) into data/search-va."""
import sys, os, re, json, glob, unicodedata, collections
DATA = sys.argv[1]
PRE = sys.argv[2] if len(sys.argv) > 2 else "ll"
OUT = os.path.join(DATA, "search-" + PRE); os.makedirs(OUT, exist_ok=True)
def norm(x):
    x = unicodedata.normalize("NFD", x.lower()).replace("æ", "ae").replace("œ", "oe")
    return "".join(c for c in x if not unicodedata.combining(c)).replace("j", "i").replace("v", "u")
WORD = re.compile(r"[^\W\d_]+")
docs, post = [], collections.defaultdict(list)
for w in json.load(open(os.path.join(DATA, "library", PRE + "-index.json")))["works"]:
    work = json.load(open(os.path.join(DATA, "library", w["id"] + ".json")))
    for ci, c in enumerate(work["chapters"]):
        d = len(docs); docs.append(["L", w["id"], ci])
        for x in {norm(x) for p in c["paras"] for x in WORD.findall(p) if len(x) > 1}: post[x].append(d)
shards = collections.defaultdict(dict)
for w, ds in post.items():
    key = re.sub(r"[^a-z]", "_", w[:2].ljust(2, "_"))
    prev, out = 0, []
    for d in ds: out.append(d - prev); prev = d
    shards[key][w] = out
for f in glob.glob(os.path.join(OUT, "*.json")): os.remove(f)
buckets, cur, size, where = [], {}, 0, {}
for k in sorted(shards):
    n = len(json.dumps(shards[k], separators=(",", ":")))
    if cur and size + n > 1_500_000: buckets.append(cur); cur, size = {}, 0
    cur.update(shards[k]); size += n; where[k] = len(buckets)
if cur: buckets.append(cur)
for i, v in enumerate(buckets): json.dump(v, open(os.path.join(OUT, f"s{i}.json"), "w"), separators=(",", ":"))
json.dump({"docs": docs, "where": where}, open(os.path.join(OUT, "docs.json"), "w"), separators=(",", ":"))
print(len(docs), "documents,", len(post), "words,", len(buckets), "shards,", sum(os.path.getsize(f) for f in glob.glob(OUT + "/*.json")) // 1024, "KB")
