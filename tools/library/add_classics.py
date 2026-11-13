"""Last step of the Library build: put Boethius (Loeb, Latin and English; build_boethius.py) and the Latin Library shelf
(build_latinlibrary.py) into data/library/index.json, with the sizes of the Latin Library and Vatican documents shelves.
    python3 -I tools/library/add_classics.py data/library"""
import json, os, re, sys
D = sys.argv[1]
idx = json.load(open(f"{D}/index.json"))
def info(wid):
    w = json.load(open(f"{D}/{wid}.json"))
    return {"words": sum(len(re.findall(r"[^\W\d_]+", p)) for c in w["chapters"] for p in c["paras"]), "chapters": [c["title"] for c in w["chapters"]]}
EN = "English (Loeb, 1918: the 1609 translation revised by H. F. Stewart; the tractates by Stewart and Rand)"
add = [
    {"id": "rd-boethius", "group": "fathers", "title": "De consolatione Philosophiae", "author": "Boethius",
     "note": "The Consolation of Philosophy: Lady Philosophy and the prisoner, book by book, each poem (metrum) and prose (prosa) in turn; Latin with the facing English.", "en": EN, "remote": True},
    {"id": "rd-boethius-opuscula", "group": "fathers", "title": "Opuscula sacra", "author": "Boethius",
     "note": "The theological tractates St Thomas commented: De Trinitate, De hebdomadibus, Contra Eutychen; Latin with English.", "en": EN, "remote": True},
    {"id": "pontificale", "group": "rites", "title": "Pontificale Romanum", "author": "Benedict XIV and Leo XIII, 1895",
     "note": "The bishop's book: confirmation, tonsure and every order to the episcopate, blessings of abbots and virgins, the dedication of a church and consecration of altars, chalices and bells, the synod. Latin; rubrics in red.",
     "caveat": "Rubrics are marked in red by machine from a plain transcription; a few may be missed or marked wrongly.", "remote": True},
]
for a in add:
    a.update(info(a["id"]))
    old = next((i for i, w in enumerate(idx["works"]) if w["id"] == a["id"]), None)
    if old is None:
        at = max((i for i, w in enumerate(idx["works"]) if w.get("group") == a["group"]), default=len(idx["works"]) - 1) + 1
        idx["works"].insert(at, a)
    else: idx["works"][old] = a
idx["groups"] = [[g, "Catechism, Ritual and Pontifical" if g == "rites" else l] for g, l in idx["groups"]]
if os.path.exists(f"{D}/ll-index.json"):
    ll = json.load(open(f"{D}/ll-index.json"))
    idx["latinlibrary"] = {"works": len(ll["works"]), "words": sum(w["words"] for w in ll["works"])}
if os.path.exists(f"{D}/va-index.json"):
    va = json.load(open(f"{D}/va-index.json"))
    idx["vatican"] = {"works": len(va["works"]), "words": sum(w["words"] for w in va["works"])}
json.dump(idx, open(f"{D}/index.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("index:", len(idx["works"]), "works;", idx.get("latinlibrary"))
