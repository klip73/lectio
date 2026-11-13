"""Boethius from the Loeb edition (Stewart and Rand, 1918; public domain; Project Gutenberg #13316, github.com/GITenberg/
The-Theological-Tractates-and-The-Consolation-of-Philosophy_13316): the Latin with the facing English, section by section.
    python3 -I tools/library/build_boethius.py <13316.txt> data/library
Writes rd-boethius.json (De consolatione Philosophiae: Liber I–V, each Metrum and Prosa a chapter, verse kept in lines) and
rd-boethius-opuscula.json (the five theological tractates, which St Thomas commented: De Trinitate, De hebdomadibus…).
In the Gutenberg text the Latin is set flush left and the English indented; footnotes are dropped."""
import json, re, sys, os
SRC, OUT = sys.argv[1], sys.argv[2]
L = open(SRC, encoding="utf-8").read().replace("\r", "").split("\n")
start = next(i for i, l in enumerate(L) if l.startswith("ANICII MANLII SEVERINI BOETHII"))
end = next(i for i, l in enumerate(L) if l.startswith("SYMMACHI VERSVS"))
L = L[start:end]
def blocks(lines):
    out, cur = [], []
    for l in lines:
        if not l.strip():
            if cur: out.append(cur); cur = []
        else: cur.append(l.rstrip())
    if cur: out.append(cur)
    return out
ROM = re.compile(r"^\s*([IVXL]+)\.\s*$")
def lang(b):
    return "la" if any(not l.startswith(" ") for l in b) else "en"
def roman(n):
    return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"][n]
def clean_la(b, verse):
    if verse: return "\n".join(re.sub(r"\s+\d+$", "", l.strip()) for l in b)
    return re.sub(r"\s+", " ", " ".join(l.strip() for l in b)).strip()
def clean_en(b, verse):
    if verse: return "\n".join(re.sub(r"\[\d+\]", "", l.strip()) for l in b)
    return re.sub(r"\s+", " ", re.sub(r"\[\d+\]", "", " ".join(l.strip() for l in b))).replace("_", "").strip()
def is_verse_la(bs):
    lines = [l for b in bs for l in b]
    return len(lines) >= 2 and (any(re.search(r"\s{3,}\d+$", l) for l in lines) or sum(len(l.strip()) < 62 for l in lines) / len(lines) > 0.85)
# 1. segments: a header (I., II.… flush or indented) and the blocks after it; markers (book and treatise titles) between
segs = []
for b in blocks(L):
    if re.match(r"^\s*\[\d+\]", b[0]): continue                     # footnotes
    if len(b) == 1 and ROM.match(b[0]): segs.append({"n": ROM.match(b[0]).group(1), "b": []}); continue
    if all(re.fullmatch(r"[A-Z][A-Z .,]*", l.strip()) for l in b):
        if lang(b) == "la": segs.append({"mark": " ".join(l.strip() for l in b)})
        continue                                                          # English titles ("THE SECOND BOOK OF BOETHIUS")
    if not segs or "mark" in segs[-1]: segs.append({"n": None, "b": []})
    segs[-1]["b"].append(b)
# 2. Latin segments start chapters; the English segment after one is its translation
TRACT = [("QVOMODO TRINITAS", "De Trinitate"),
         ("VTRVM PATER", "Utrum Pater et Filius et Spiritus Sanctus substantialiter praedicentur"),
         ("QVOMODO SVBSTANTIAE", "De hebdomadibus"),
         ("DE FIDE CATHOLICA", "De fide catholica"),
         ("CONTRA EVTYCHEN", "Contra Eutychen et Nestorium")]
tract, cons = [], []
work, book, tname = "tract", 0, ""
last = None
for sg in segs:
    if "mark" in sg:
        m = sg["mark"].upper()
        for key, name in TRACT:
            if key in m: work, tname = "tract", name
        if "PHILOSOPHIAE CONSOLATIONIS" in m and "EXPLICIT" not in m and book == 0: work, book = "cons", 1
        bm = re.search(r"INCIPIT LIBER ([IV]+)", m)
        if bm and work == "cons": book = {"II": 2, "III": 3, "IV": 4, "V": 5}.get(bm.group(1), book)
        continue
    bs = sg["b"]
    if not bs: continue
    la_blocks = [b for b in bs if lang(b) == "la"]
    en_blocks = [b for b in bs if lang(b) == "en"]
    if la_blocks:
        verse = work == "cons" and is_verse_la(la_blocks)
        if work == "cons": title = f"Liber {roman(book)} · {'Metrum' if verse else 'Prosa'} {sg['n'] or '?'}"
        else: title = tname + (" · " + sg["n"] if sg["n"] else " · Prooemium")
        lp = [clean_la(b, verse) for b in la_blocks] if not verse else [clean_la([l for b in la_blocks for l in b], True)]
        last = {"title": title, "paras": lp, "_v": verse, "_en": []}
        if verse: last["v"] = 1
        (cons if work == "cons" else tract).append(last)
        if en_blocks: last["_en"] += en_blocks                          # an English part with no header of its own
    elif last is not None and not last["_en"]:
        last["_en"] = en_blocks
for ch in cons + tract:
    verse, en = ch.pop("_v"), ch.pop("_en")
    ep = [clean_en(b, verse) for b in en] if not verse else ([clean_en([l for b in en for l in b], True)] if en else [])
    if len(ep) == len(ch["paras"]): ch["en"] = ep
    elif ep: ch["enb"] = ep
prev = {}
for ch in cons:
    m = re.match(r"(Liber \w+) · (Metrum|Prosa) (\S+)$", ch["title"])
    k = (m.group(1), m.group(2))
    if m.group(3) == "?": ch["title"] = f"{m.group(1)} · {m.group(2)} {roman(prev.get(k, 0) + 1)}"
    prev[k] = prev.get(k, 0) + 1
# Book I opens with a poem, the others with prose: number Metrum and Prosa within each book as printed
def emit(oid, title, chapters):
    json.dump({"id": oid, "title": title, "author": "Boethius", "verse": False, "chapters": chapters}, open(os.path.join(OUT, oid + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
    words = sum(len(re.findall(r"[^\W\d_]+", p)) for c in chapters for p in c["paras"])
    print(oid, len(chapters), "chapters", words, "words;", sum(1 for c in chapters if "en" in c), "aligned,", sum(1 for c in chapters if "enb" in c), "English after")
    return words
w1 = emit("rd-boethius", "De consolatione Philosophiae", cons)
w2 = emit("rd-boethius-opuscula", "Opuscula sacra (the theological tractates)", tract)
json.dump({"rd-boethius": {"words": w1, "chapters": [c["title"] for c in cons]}, "rd-boethius-opuscula": {"words": w2, "chapters": [c["title"] for c in tract]}},
          open(os.path.join(OUT, "..", "..", "tools", "library", "boethius-index.json") if False else "/tmp/boethius-index.json", "w"))
