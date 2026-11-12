"""Wiktionary's Latin word forms (form -> dictionary word and parsing), for words the parsed texts never met.
Source: the Latin rows of the `forms` table of Lexicon Scholasticum (James Penfold's app, from Wiktionary via Wiktextract;
Wiktionary text CC BY-SA), exported with  SELECT form, lemma, pos, features FROM forms WHERE language='latin'.
Only forms that occur in the app's own texts (the Library, the Summa, the 1960 Office and Mass) are kept.
Usage: python3 -I tools/data/build_wkt.py <latin-forms.csv> data
Writes data/wkt/where.json (two or three letters -> file) and data/wkt/w<n>.json (form -> [[lemma, part of speech, parsing], …])."""
import sys, os, re, json, glob, csv, unicodedata, collections
SRC, DATA = sys.argv[1], sys.argv[2]
OUT = os.path.join(DATA, "wkt"); os.makedirs(OUT, exist_ok=True)
csv.field_size_limit(10 ** 8)
def norm(x):
    x = unicodedata.normalize("NFD", x.lower()).replace("æ", "ae").replace("œ", "oe")
    return re.sub(r"[^a-z]", "", "".join(c for c in x if not unicodedata.combining(c)).replace("j", "i").replace("v", "u"))
# every word of the app's texts
words = set()
for f in glob.glob(os.path.join(DATA, "search", "s*.json")): words.update(json.load(open(f)))
WORD = re.compile(r"[^\W\d_]+")
def scan(x):
    if isinstance(x, str): words.update(norm(w) for w in WORD.findall(x))
    elif isinstance(x, list): [scan(y) for y in x]
    elif isinstance(x, dict): [scan(y) for y in x.values()]
for f in glob.glob(os.path.join(DATA, "office", "*.json")): scan(json.load(open(f, encoding="utf-8")))
print("words in the app's texts:", len(words))
ORDER = ["first-person", "second-person", "third-person", "nominative", "genitive", "dative", "accusative", "ablative", "vocative", "locative",
         "singular", "plural", "masculine", "feminine", "neuter", "present", "imperfect", "future", "perfect", "pluperfect", "future-perfect",
         "active", "passive", "indicative", "subjunctive", "imperative", "infinitive", "participle", "gerund", "gerundive", "supine", "comparative", "superlative"]
AB = {"first-person": "1st", "second-person": "2nd", "third-person": "3rd", "nominative": "nom.", "genitive": "gen.", "dative": "dat.", "accusative": "acc.",
      "ablative": "abl.", "vocative": "voc.", "locative": "loc.", "singular": "sg.", "plural": "pl.", "masculine": "m.", "feminine": "f.", "neuter": "n.",
      "present": "pres.", "imperfect": "impf.", "future": "fut.", "perfect": "perf.", "pluperfect": "plpf.", "future-perfect": "fut. perf.", "active": "act.",
      "passive": "pass.", "indicative": "ind.", "subjunctive": "subj.", "imperative": "impv.", "infinitive": "inf.", "participle": "part.", "gerund": "gerund",
      "gerundive": "gerundive", "supine": "supine", "comparative": "comp.", "superlative": "superl."}
POS = {"verb": "verb", "noun": "noun", "adj": "adj.", "name": "name", "adv": "adv.", "pron": "pron.", "det": "det.", "num": "num.", "prep": "prep.", "conj": "conj.", "intj": "interj."}
out = collections.defaultdict(list)
n = 0
for r in csv.DictReader(open(SRC, encoding="utf-8")):
    k = norm(r["form"])
    if k not in words or r["pos"] not in POS: continue
    fs = set(json.loads(r["features"] or "[]"))
    label = " ".join(AB[f] for f in ORDER if f in fs)
    item = [r["lemma"], POS[r["pos"]], label]
    if item not in out[k] and len(out[k]) < 8: out[k].append(item); n += 1
# merge readings of the same word (clericus / clēricus: keep the marked spelling), drop a headword's bare entry for
# itself when real parsings exist, and keep at most six
def tidy(items, form):
    g = collections.OrderedDict()
    for lem, pos, lab in items:
        k = (norm(lem), pos)
        e = g.setdefault(k, [lem, pos, []])
        if lem != norm(lem) and e[0] == norm(e[0]): e[0] = lem
        if lab and lab not in e[2]: e[2].append(lab)
    def lean(ls):   # "gen." is covered by "gen. sg."
        sets = [set(x.split()) for x in ls]
        return [x for i, x in enumerate(ls) if not any(j != i and sets[i] < sets[j] for j in range(len(ls)))]
    res = [[l, p, "; ".join(lean(ls))] for l, p, ls in g.values()]
    parsed = [x for x in res if x[2]]
    return (parsed + [x for x in res if not x[2] and norm(x[0]) not in {norm(y[0]) for y in parsed} and norm(x[0]) != form])[:6] if parsed else res[:6]
out = {k: tidy(v, k) for k, v in out.items()}
for f in glob.glob(os.path.join(OUT, "*.json")): os.remove(f)
shards = collections.defaultdict(dict)
for k, v in out.items(): shards[k[:2].ljust(2, "_")][k] = v
for k2 in list(shards):
    if len(json.dumps(shards[k2], ensure_ascii=False)) > 400_000:
        for k, v in shards.pop(k2).items(): shards[k[:3].ljust(3, "_")][k] = v
buckets, cur, size, where = [], {}, 0, {}
for k in sorted(shards):
    s = len(json.dumps(shards[k], ensure_ascii=False, separators=(",", ":")))
    if cur and size + s > 400_000: buckets.append(cur); cur, size = {}, 0
    cur.update(shards[k]); size += s; where[k] = len(buckets)
if cur: buckets.append(cur)
for i, b in enumerate(buckets): json.dump(b, open(os.path.join(OUT, f"w{i}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
json.dump(where, open(os.path.join(OUT, "where.json"), "w"), separators=(",", ":"))
sizes = [os.path.getsize(os.path.join(OUT, f"w{i}.json")) for i in range(len(buckets))]
print(f"{len(out)} of the texts' words have Wiktionary forms ({n} readings); {len(buckets)} files, largest {max(sizes) // 1024} KB, total {sum(sizes) // 1024} KB")
