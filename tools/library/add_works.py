"""Add ready-made works (build_opera.py, build_readers.py) to the Library without rebuilding it: copies the works into
data/library/, puts them on their shelves in index.json (replacing any earlier copy), and adds their words to forms.json the way
build_library.py does (parsings from the parsed corpora, then forms made by src/morph.js).
Usage: python3 -I tools/library/add_works.py data <genforms.json> <extra-*.json> [<extra-*.json> …]"""
import sys, os, re, json, shutil, collections, unicodedata
DATA, GENF, LISTS = sys.argv[1], sys.argv[2], sys.argv[3:]
LIB = os.path.join(DATA, "library")
def norm(x):
    x = unicodedata.normalize("NFD", x.lower()).replace("æ", "ae").replace("œ", "oe")
    return "".join(c for c in x if not unicodedata.combining(c)).replace("j", "i").replace("v", "u")
GROUPS = [["exam", "Spiritual classics"], ["readers", "First readers"], ["thomas", "St Thomas Aquinas"], ["opera", "St Thomas: the other works (Corpus Thomisticum)"],
          ["manuals", "Seminary manuals"], ["rites", "Catechism and the Roman Ritual"], ["canon", "Canon law"], ["fathers", "Fathers of the Church"],
          ["medieval", "Middle Ages and Renaissance"], ["hymns", "Hymns and poetry"], ["ot", "Old Testament: Vulgate and Douay-Rheims"]]
ix = json.load(open(os.path.join(LIB, "index.json")))
order = [g[0] for g in GROUPS]
new = []
for lst in LISTS:
    d = os.path.dirname(os.path.abspath(lst))
    for e in json.load(open(lst)):
        shutil.copy(os.path.join(d, e["id"] + ".json"), os.path.join(LIB, e["id"] + ".json"))
        new.append({k: e[k] for k in ("id", "title", "author", "note", "words", "chapters", "group", "en", "caveat", "remote") if k in e})
ids = {e["id"] for e in new}
works = [w for w in ix["works"] if w["id"] not in ids] + new
works.sort(key=lambda w: order.index(w.get("group", "exam")) if w.get("group", "exam") in order else 99)   # stable within a shelf
ix["works"], ix["groups"] = works, GROUPS
json.dump(ix, open(os.path.join(LIB, "index.json"), "w"), ensure_ascii=False, separators=(",", ":"))
# word forms for tapping
words = set()
for e in new:
    for c in json.load(open(os.path.join(LIB, e["id"] + ".json")))["chapters"]:
        for p in c["paras"]: words.update(norm(x) for x in re.findall(r"[^\W\d_]+", p))
forms = json.load(open(os.path.join(LIB, "forms.json")))
todo = {w for w in words if w not in forms}
lex = json.load(open(os.path.join(DATA, "lexicon.json")))
known = collections.defaultdict(collections.Counter)
for p in lex["parts"]:
    for b in p["books"]:
        book = json.load(open(os.path.join(DATA, b[0] + ".json")))
        for chp in book["ch"]:
            for v in chp:
                for x, e in zip(re.findall(r"[A-Za-z]+", v[1]), v[3]):
                    nx = norm(x)
                    if nx in todo:
                        for i in ([e] if isinstance(e, int) and e >= 0 else e if isinstance(e, list) else []): known[nx][i] += 1
GEN = json.load(open(GENF))
added = 0
for x in todo:
    ent = [i for i, _ in known[x].most_common(4)] if x in known else [GEN[x]] if x in GEN else None
    if ent: forms[x] = ent; added += 1
json.dump(dict(sorted(forms.items())), open(os.path.join(LIB, "forms.json"), "w"), separators=(",", ":"))
print(f"{len(new)} works added ({sum(e['words'] for e in new)} words); forms: {added} new of {len(todo)} unseen words; library now {len(works)} works")
