"""Build the Latin library (classic Church texts, Latin only) from The Latin Library collection (CLTK).
Usage: python3 -I tools/library/build_library.py <lat_text_latin_library repo> data
Writes data/library/index.json (works and chapter titles), data/library/<work>.json (chapters of paragraphs) and
data/library/forms.json (word form -> parsing ids from the parsed corpora, for tapping words)."""
import sys, os, re, json, collections, unicodedata
TLL, DATA = sys.argv[1], sys.argv[2]
OUT = os.path.join(DATA, "library"); os.makedirs(OUT, exist_ok=True)
ROMAN = {"PRIMUM": "I"}
WORKS = [
    {"id": "imitatio", "title": "De imitatione Christi", "author": "Thomas à Kempis", "files": [f"kempis/kempis{i}.txt" for i in range(1, 5)],
     "head": r"^Cap\.\s*([IVXL\d]+)\.\s*(.*)$", "book": r"^Liber\s+\w+\s*$", "note": "The Imitation of Christ, in four books: the classic of spiritual reading."},
    {"id": "regula", "title": "Regula S. Benedicti", "author": "St Benedict", "files": ["benedict.txt"],
     "head": r"^(Incipit prologus|Caput\s+\d+:.*)$", "note": "The Rule of St Benedict: a prologue and 73 short chapters, often read a little each day."},
    {"id": "confessiones", "title": "Confessiones", "author": "St Augustine", "files": [f"augustine/conf{i}.txt" for i in range(1, 14)],
     "section": r"^(\d+)\.(\d+)\.(\d+)\s*$", "note": "The Confessions, thirteen books, by chapter."},
    {"id": "leo", "title": "Sermones de Quadragesima", "author": "St Leo the Great", "files": ["leothegreat/quadragesima1.txt", "leothegreat/quadragesima2.txt"],
     "perfile": True, "titles": ["Sermo XXXIX: De Quadragesima I", "Sermo XL: De Quadragesima II"], "note": "Two Lenten sermons of St Leo, whose homilies are read at Matins: exam part 3 in style."},
    {"id": "ambrosius", "title": "Hymni", "author": "St Ambrose", "files": ["ambrose/hymns.txt"], "verse": True,
     "head": r"^(HYMNUS\s+[IVXL]+\.?)\s*$", "note": "The hymns of St Ambrose, model of the Office hymn: exam part 4 in style."},
    {"id": "proslogion", "title": "Proslogion", "author": "St Anselm", "files": ["anselmproslogion.txt"],
     "head": r"^(Prooemium|\d+\s+[A-Z].*)$", "note": "Faith seeking understanding: the ontological argument, in 26 short chapters."},
    {"id": "itinerarium", "title": "Itinerarium mentis in Deum", "author": "St Bonaventure", "files": ["bonaventura.itinerarium.txt"],
     "head": r"^(PROLOGUS.*|CAPUT\s+\w+)\s*$", "note": "The Journey of the Mind into God, in a prologue and seven chapters."},
    {"id": "symbola", "title": "Symbola", "author": "The Creeds", "files": ["creeds.txt"],
     "head": r"^(Symbolum.*)$", "note": "The Apostles’, Nicene and Athanasian Creeds."},
]
TRAIL = re.compile(r"^(Christian Latin|The Latin Library|The Classics Page|Medieval Latin|Neo-Latin)\s*$")
def blocks(path, verse):
    t = open(os.path.join(TLL, path), encoding="utf-8", errors="replace").read().replace("\r", "")
    lines = [l.rstrip() for l in t.split("\n")]
    lines = lines[1:]  # the first line is the page title
    out, cur = [], []
    for l in lines:
        s = l.strip()
        if TRAIL.match(s): continue
        if not s:
            if cur: out.append(cur); cur = []
            continue
        cur.append(s)
    if cur: out.append(cur)
    return out
def build(w):
    chapters, cur, book = [], None, ""
    head = re.compile(w["head"]) if "head" in w else None
    for fi, f in enumerate(w["files"]):
        if "section" in w: book = f"Liber {fi + 1}"
        bl = blocks(f, w.get("verse"))
        if w.get("perfile"):
            # One chapter per file, titled from its heading block (e.g. "DE QUADRAGESIMA I · SERMO XXXIX [Al. XXXVIII]").
            k = next(i for i, b in enumerate(bl) if any(re.match(r"^(SERMO|DE QUADRAGESIMA)", x.strip(), re.I) for x in b))
            hb = [x for x in bl[k] if not re.match(r"^LEO THE GREAT$", x.strip())]
            cur = {"title": w["titles"][fi], "paras": []}; chapters.append(cur)
            bl = bl[k + 1:]
        for b in bl:
            first = b[0]
            if "book" in w and re.match(w["book"], first) and len(b) == 1:
                book = first.strip(); continue
            if "section" in w:
                m = re.match(w["section"], first)
                if m and len(b) == 1:
                    key = f"{m.group(1)}.{m.group(2)}"
                    if not cur or cur.get("key") != key:
                        cur = {"key": key, "title": f"Liber {m.group(1)}, caput {m.group(2)}", "paras": []}; chapters.append(cur)
                    continue
                if cur is None: continue   # the book title line before 1.1.1
                cur["paras"].append(" ".join(b)); continue
            if head and re.match(head, first):
                title = first.strip()
                if "book" in w and book: title = f"{book} · {title}"
                cur = {"title": title, "paras": []}; chapters.append(cur)
                rest = b[1:]
                if not rest: continue
                b = rest
            if cur is None:
                if all(x.isupper() or len(x) < 60 for x in b): continue   # work title, author line, table of contents
                cur = {"title": w["title"], "paras": []}; chapters.append(cur)
            cur["paras"].append("\n".join(b) if w.get("verse") else " ".join(b))
    def toc(p):
        toks = p.split()
        return len(toks) > 3 and sum(bool(re.fullmatch(r"[IVXLC]+|Prooemium", t)) for t in toks) > 0.6 * len(toks)
    chapters = [{"title": c["title"], "paras": [p for p in c["paras"] if p.strip() and not toc(p)]} for c in chapters]
    chapters = [c for c in chapters if c["paras"]]
    return chapters
def norm(x):
    x = unicodedata.normalize("NFD", x.lower()).replace("æ", "ae").replace("œ", "oe")
    return "".join(c for c in x if not unicodedata.combining(c)).replace("j", "i").replace("v", "u")
index, words = [], set()
for w in WORKS:
    ch = build(w)
    json.dump({"id": w["id"], "title": w["title"], "author": w["author"], "verse": bool(w.get("verse")), "chapters": ch},
              open(os.path.join(OUT, w["id"] + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
    nw = sum(len(re.findall(r"[^\W\d_]+", p)) for c in ch for p in c["paras"])
    index.append({"id": w["id"], "title": w["title"], "author": w["author"], "note": w["note"], "words": nw, "chapters": [c["title"] for c in ch]})
    for c in ch:
        for p in c["paras"]: words.update(norm(x) for x in re.findall(r"[^\W\d_]+", p))
    print(f'{w["id"]}: {len(ch)} chapters, {nw} words; first: {ch[0]["title"]!r}: {ch[0]["paras"][0][:70]!r}')
json.dump({"source": "The Latin Library (thelatinlibrary.com), via the CLTK collection", "works": index}, open(os.path.join(OUT, "index.json"), "w"), ensure_ascii=False, separators=(",", ":"))
lex = json.load(open(os.path.join(DATA, "lexicon.json")))
known = collections.defaultdict(collections.Counter)
for p in lex["parts"]:
    for b in p["books"]:
        book = json.load(open(os.path.join(DATA, b[0] + ".json")))
        for chp in book["ch"]:
            for v in chp:
                for x, e in zip(re.findall(r"[A-Za-z]+", v[1]), v[3]):
                    for i in ([e] if isinstance(e, int) and e >= 0 else e if isinstance(e, list) else []): known[norm(x)][i] += 1
forms = {x: [i for i, _ in known[x].most_common(4)] for x in sorted(words) if x in known}
json.dump(forms, open(os.path.join(OUT, "forms.json"), "w"), separators=(",", ":"))
print(f"forms: {len(forms)} of {len(words)} words known")
