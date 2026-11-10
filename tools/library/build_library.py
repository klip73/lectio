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
# More works, read by a general rule (build_auto): headings in a file start chapters; long chapters are cut into readable parts.
# group: the Library's shelves. Files are relative to the Latin Library collection.
OT = [("genesis", "Genesis"), ("exodus", "Exodus"), ("leviticus", "Leviticus"), ("numbers", "Numeri"), ("deuteronomy", "Deuteronomium"),
      ("joshua", "Iosue"), ("judges", "Iudicum"), ("ruth", "Ruth"), ("samuel1", "I Regum (1 Samuel)"), ("samuel2", "II Regum (2 Samuel)"),
      ("kings1", "III Regum (1 Kings)"), ("kings2", "IV Regum (2 Kings)"), ("chronicles1", "I Paralipomenon"), ("chronicles2", "II Paralipomenon"),
      ("ezra", "I Esdrae (Ezra)"), ("nehemiah", "II Esdrae (Nehemiah)"), ("tobia", "Tobias"), ("judith", "Iudith"), ("esther", "Esther"),
      ("job", "Iob"), ("proverbs", "Proverbia"), ("ecclesiastes", "Ecclesiastes"), ("songofsongs", "Canticum Canticorum"), ("wisdom", "Sapientia"),
      ("sirach", "Ecclesiasticus"), ("isaiah", "Isaias"), ("jeremiah", "Ieremias"), ("lamentations", "Lamentationes"), ("baruch", "Baruch"),
      ("ezekiel", "Ezechiel"), ("daniel", "Daniel"), ("hosea", "Osee"), ("joel", "Ioel"), ("amos", "Amos"), ("obadiah", "Abdias"), ("jonah", "Ionas"),
      ("micah", "Michaeas"), ("nahum", "Nahum"), ("habakkuk", "Habacuc"), ("zephaniah", "Sophonias"), ("haggai", "Aggaeus"), ("zacharias", "Zacharias"),
      ("malachias", "Malachias"), ("macabees1", "I Machabaeorum"), ("macabees2", "II Machabaeorum")]
AUTO = [
    # St Thomas
    {"id": "deente", "group": "thomas", "title": "De ente et essentia", "author": "St Thomas Aquinas", "files": ["aquinas/ente.txt"], "note": "On being and essence: the young Thomas’s short metaphysics, a classic first text."},
    {"id": "princindiv", "group": "thomas", "title": "De principio individuationis", "author": "St Thomas Aquinas (attributed)", "files": ["aquinas/princ.txt"], "note": "On what makes an individual: a short treatise."},
    {"id": "modostudendi", "group": "thomas", "title": "Epistola de modo studendi", "author": "St Thomas Aquinas", "files": ["aquinas/epist.txt"], "note": "Sixteen counsels on how to study, to Brother John."},
    {"id": "paternoster", "group": "thomas", "title": "Expositio in Orationem Dominicam", "author": "St Thomas Aquinas", "files": ["aquinas/expositio.txt"], "note": "Sermons on the Our Father, petition by petition."},
    # Fathers
    {"id": "civdei", "group": "fathers", "title": "De civitate Dei", "author": "St Augustine", "files": [f"augustine/civ{i}.txt" for i in range(1, 23)], "books": [f"Liber {r}" for r in "I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX XXI XXII".split()], "note": "The City of God, in twenty-two books."},
    {"id": "trinitate", "group": "fathers", "title": "De Trinitate", "author": "St Augustine", "files": [f"augustine/trin{i}.txt" for i in range(1, 16)], "books": [f"Liber {r}" for r in "I II III IV V VI VII VIII IX X XI XII XIII XIV XV".split()], "note": "On the Trinity, in fifteen books."},
    {"id": "sermaug", "group": "fathers", "title": "Sermones", "author": "St Augustine", "files": "glob:augustine/serm*.txt", "pertitle": True, "note": "Thirty-eight sermons: the voice of many Matins lessons."},
    {"id": "catechizandis", "group": "fathers", "title": "De catechizandis rudibus", "author": "St Augustine", "files": ["augustine/catechizandis.txt"], "note": "How to teach the faith to beginners."},
    {"id": "regaug", "group": "fathers", "title": "Regula", "author": "St Augustine", "files": ["augustine/reg.txt"], "note": "The Rule of St Augustine."},
    {"id": "mysteriis", "group": "fathers", "title": "De mysteriis", "author": "St Ambrose", "files": ["ambrose/mysteriis.txt"], "note": "On the sacraments of initiation, to the newly baptised."},
    {"id": "hieronymus", "group": "fathers", "title": "Epistulae et Vitae", "author": "St Jerome", "files": ["jerome/epistulae.txt", "jerome/vitapauli.txt", "jerome/vitamalchus.txt"], "books": ["Epistulae 1–10", "Vita S. Pauli", "Vita Malchi"], "note": "Letters, and the lives of Paul the first hermit and of Malchus."},
    {"id": "apologeticum", "group": "fathers", "title": "Apologeticum", "author": "Tertullian", "files": ["tertullian/tertullian.apol.txt"], "note": "The defence of the Christians to the governors of Rome."},
    {"id": "tertull", "group": "fathers", "title": "De oratione, De baptismo, De paenitentia, De praescriptione", "author": "Tertullian", "files": ["tertullian/tertullian.oratione.txt", "tertullian/tertullian.baptismo.txt", "tertullian/tertullian.paen.txt", "tertullian/tertullian.praescrip.txt"], "books": ["De oratione", "De baptismo", "De paenitentia", "De praescriptione haereticorum"], "note": "On prayer (with the Our Father), baptism, penance, and the rule of faith against heretics."},
    {"id": "octavius", "group": "fathers", "title": "Octavius", "author": "Minucius Felix", "files": ["minucius.txt"], "note": "A dialogue between a Christian and a pagan at Ostia."},
    {"id": "mortibus", "group": "fathers", "title": "De mortibus persecutorum", "author": "Lactantius", "files": ["lactantius/demort.txt"], "note": "How the persecutors died: the Great Persecution and Constantine."},
    # Middle Ages
    {"id": "bedehe", "group": "medieval", "title": "Historia ecclesiastica gentis Anglorum", "author": "St Bede", "files": [f"bede/bede{i}.txt" for i in range(1, 6)], "books": ["Liber I", "Liber II", "Liber III", "Liber IV", "Liber V"], "note": "The conversion of England: St Augustine of Canterbury, St Cuthbert, St Hilda."},
    {"id": "martinus", "group": "medieval", "title": "Vita S. Martini", "author": "Sulpicius Severus", "files": ["sulpiciusseverusmartin.txt"], "note": "St Martin of Tours: soldier, monk, bishop."},
    {"id": "didascalicon", "group": "medieval", "title": "Didascalicon", "author": "Hugh of St Victor", "files": [f"hugo/hugo{i}.txt" for i in range(1, 7)], "books": [f"Liber {r}" for r in "I II III IV V VI".split()], "note": "On the study of reading: the arts, Scripture, and how to read."},
    {"id": "contemptu", "group": "medieval", "title": "De contemptu mundi", "author": "Bernard of Cluny", "files": ["bernardcluny1.txt", "bernardcluny2.txt"], "verse": True, "books": ["Liber I", "Liber II"], "note": "On the last things, in dactylic verse (Jerusalem the golden)."},
    # Hymns and poetry
    {"id": "prudentius", "group": "hymns", "title": "Peristephanon et Psychomachia", "author": "Prudentius", "files": [f"prudentius/prud{i}.txt" for i in range(1, 15)] + ["prudentius/prud.psycho.txt"], "verse": True, "pertitle": True, "note": "Hymns to the martyrs, and the battle of the virtues: source of Breviary hymns."},
    {"id": "sedulius", "group": "hymns", "title": "Carmen paschale", "author": "Sedulius", "files": [f"sedulius{i}.txt" for i in range(1, 6)] + ["sedulius.solis.txt"], "verse": True, "books": ["Liber I", "Liber II", "Liber III", "Liber IV", "Liber V", "A solis ortus cardine"], "note": "The Gospel in verse; A solis ortus cardine is in the Breviary."},
    {"id": "fortunatus", "group": "hymns", "title": "Hymni", "author": "Venantius Fortunatus", "files": ["fortunat.txt", "venantius.txt"], "verse": True, "pertitle": True, "note": "Vexilla Regis and the hymns of the Holy Cross."},
    {"id": "hymnicantica", "group": "hymns", "title": "Hymni et cantica", "author": "Medieval and later", "files": ["hymni.txt", "diesirae.txt"], "verse": True, "note": "Veni Emmanuel, Adeste fideles, Dies irae and other hymns and carols."},
    # Documents
] + [{"id": "ot-" + f, "group": "ot", "title": t, "author": "Biblia Vulgata", "files": [f"bible/{f}.txt"], "bible": True, "bd": i, "note": ""} for i, (f, t) in enumerate(OT)]
# The Old Testament comes from the Clementine Vulgate with the Douay-Rheims (bible_databases, as the New Testament), when given:
BD = sys.argv[4] if len(sys.argv) > 4 else None
BD_BOOKS = None
if BD:
    vul = json.load(open(os.path.join(BD, "VulgClementine.json")))["books"]; drc = json.load(open(os.path.join(BD, "DRC.json")))["books"]
    ot = [i for i, b in enumerate(vul[:46]) if b["name"] != "Psalms"]   # the Psalms are an exam part already
    BD_BOOKS = [(vul[i], drc[i]) for i in ot]
def build_bd(w):
    v, d = BD_BOOKS[w["bd"]]
    en = {c["chapter"]: {x["verse"]: x["text"] for x in c["verses"]} for c in d["chapters"]}
    return [{"title": f'{w["title"]} {c["chapter"]}', "paras": [f'{x["verse"]} {x["text"].strip()}' for x in c["verses"]],
             "en": [en.get(c["chapter"], {}).get(x["verse"], "") for x in c["verses"]]} for c in v["chapters"]]
GROUPS = [["exam", "Spiritual classics"], ["thomas", "St Thomas Aquinas"], ["fathers", "Fathers of the Church"], ["medieval", "Middle Ages"],
          ["hymns", "Hymns and poetry"], ["ot", "Old Testament: Vulgate and Douay-Rheims"]]
HEAD = re.compile(r"^(CAPUT|Caput|CAP\.|LIBER|Liber|PROLOGUS|Prologus|PRAEFATIO|Praefatio|PROOEMIUM|Prooemium|SERMO|Sermo|EPISTULA|EPISTOLA|Epistula|Epistola|Articulus|ARTICULUS|HYMNUS|Hymnus|Hymnum|PARS|Pars)\b.{0,80}$")
ROMAN_LINE = re.compile(r"^\[?\(?([IVXLC]+|\d+)\.?\)?\]?\.?$")
def tcase(t):
    """Title case for ALL-CAPS headings, keeping Roman numerals (Sermo II) and small Latin words (de, et, in) as they should be."""
    t = t.strip().strip(".")
    if not t.isupper(): return t
    out = []
    for w in t.split():
        if re.fullmatch(r"[IVXLC]+\.?", w): out.append(w)
        elif w.lower() in ("de", "et", "in", "ad", "cum", "ex", "a", "ab", "e", "per", "pro", "sub", "super", "contra", "of", "the", "and"): out.append(w.lower())
        else: out.append(w.capitalize())
    s2 = " ".join(out)
    return s2[:1].upper() + s2[1:]
def clean_title(t):
    t = re.sub(r"^(Augustini|Sancti \w+|S\. \w+|Prudenti|Sedulius)\s+", "", t)
    return t[:1].upper() + t[1:]
def split_long(ch, limit=2200):
    out = []
    for c in ch:
        n, cur, k = 0, [], 1
        tot = sum(len(p.split()) for p in c["paras"])
        if tot <= limit * 1.3: out.append(c); continue
        for p in c["paras"]:
            cur.append(p); n += len(p.split())
            if n >= limit: out.append({"title": f'{c["title"]} ({k})', "paras": cur}); cur, n, k = [], 0, k + 1
        if cur: out.append({"title": f'{c["title"]} ({k})', "paras": cur})
    return out
JUNK = re.compile(r"^(St\.? Thomas Aquinas|ST\.? THOMAS AQUINAS|BERNARD OF CLUNY|VENANTIUS FORTUNATUS|\(A\.D\..*\)|[A-Z][a-z]+(:| of [A-Z][a-z. ]+)?\s*)$")
def build_auto(w):
    chapters = []
    if isinstance(w["files"], str) and w["files"].startswith("glob:"):
        import glob as _g
        w["files"] = sorted((os.path.relpath(x, TLL) for x in _g.glob(os.path.join(TLL, w["files"][5:]))), key=lambda x: int(re.sub(r"\D", "", x) or 0))
    for fi, f in enumerate(w["files"]):
        bl = blocks(f, w.get("verse"))
        book = (w.get("books") or [None] * len(w["files"]))[fi]
        cur = None
        if w.get("bible"):
            big = " ".join(" ".join(b) for b in bl if not TRAIL.match(b[0].strip()))
            if re.search(r"\bCAPUT\s+\d+", big):
                bits = re.split(r"\s*\bCAPUT\s+(\d+)\s*", big)
                for k in range(1, len(bits) - 1, 2):
                    verses = [v.strip() for v in re.split(r"\s(?=\d+\s)", " " + bits[k + 1]) if v.strip()]
                    verses = [v for v in verses if not re.fullmatch(r"[\d\s]+", v)]
                    if verses: chapters.append({"title": f'{w["title"]} {bits[k]}', "paras": verses})
                continue
            for b in bl:
                txt = " ".join(b).strip()
                mc = re.match(r"^(\d+):(\d+)\s+(.*)$", txt)   # "1:1 Anno tertio…" (chapter:verse) layout
                if mc:
                    if cur is None or cur.get("c") != mc.group(1): cur = {"title": f'{w["title"]} {mc.group(1)}', "paras": [], "c": mc.group(1)}; chapters.append(cur)
                    cur["paras"].append(f"{mc.group(2)} {mc.group(3)}")
            for c in chapters: c.pop("c", None)
            continue
        title0 = None
        for bi, b in enumerate(bl):
            first = b[0].strip()
            if JUNK.match(first):
                if len(b) == 1: continue
                b = b[1:]; first = b[0].strip()
            if TRAIL.match(first) or re.fullmatch(r"[\d\s|IVXLC.]+", " ".join(b)) and len(" ".join(b)) < 200: continue
            # a heading: a short all-caps line, a known heading word, or a lone roman numeral
            is_head = len(b) == 1 and (HEAD.match(first) or ROMAN_LINE.match(first) or (first.isupper() and 3 <= len(first) <= 90))
            if not is_head and len(b) > 1 and (HEAD.match(first) or (first.isupper() and len(first) <= 90)) and len(first) < 90:
                is_head, b = True, b   # heading with text following in the same block
                head_txt, rest = first, b[1:]
            else:
                head_txt, rest = first, []
            if is_head:
                if title0 is None and bi < 3 and not ROMAN_LINE.match(first) and not HEAD.match(first):
                    title0 = first   # the work's own title line
                    if not rest: continue
                t = clean_title(tcase(head_txt))
                mr = ROMAN_LINE.match(head_txt.strip())
                if mr: t = "Caput " + mr.group(1).upper()   # a lone numeral heading: "[ii]" → "Caput II"
                if re.fullmatch(r"(?i)(bernard of cluny|st\.? thomas aquinas|venantius fortunatus)", t): continue
                if w.get("pertitle") and cur is None: t = tcase(head_txt)
                cur = {"title": (f"{book} · " if book else "") + t, "paras": []}; chapters.append(cur)
                if rest: cur["paras"].append("\n".join(rest) if w.get("verse") else " ".join(rest))
                continue
            if cur is None:
                cur = {"title": book or (clean_title(tcase(title0)) if title0 and w.get("pertitle") else w["title"]), "paras": []}; chapters.append(cur)
            cur["paras"].append("\n".join(b) if w.get("verse") else " ".join(b))
    chapters = [c for c in chapters if c["paras"]]
    # merge tiny chapters (a heading over a sentence) into the next
    merged = []
    for c in chapters:
        if merged and sum(len(p.split()) for p in merged[-1]["paras"]) < 25 and not w.get("verse") and not w.get("bible"):
            merged[-1] = {"title": merged[-1]["title"], "paras": merged[-1]["paras"] + c["paras"]}
        else: merged.append(c)
    return split_long(merged) if not w.get("bible") else merged
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
index, words, words0 = [], set(), set()
for w in WORKS + AUTO:
    ch = build(w) if w in WORKS else build_bd(w) if (BD_BOOKS and "bd" in w) else build_auto(w)
    if not ch: print("EMPTY", w["id"]); continue
    json.dump({"id": w["id"], "title": w["title"], "author": w["author"] if not (BD_BOOKS and "bd" in w) else "Vulgata Clementina · Douay-Rheims", "verse": bool(w.get("verse")), "chapters": ch},
              open(os.path.join(OUT, w["id"] + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
    nw = sum(len(re.findall(r"[^\W\d_]+", p)) for c in ch for p in c["paras"])
    index.append({"id": w["id"], "title": w["title"], "author": w["author"], "note": w["note"], "words": nw, "chapters": [c["title"] for c in ch],
                  "group": w.get("group", "exam"), **({"offline": True} if w in WORKS else {})})
    for c in ch:
        for p in c["paras"]:
            ws = [norm(x) for x in re.findall(r"[^\W\d_]+", p)]
            words.update(ws)
            if w in WORKS: words0.update(ws)
    print(f'{w["id"]}: {len(ch)} chapters, {nw} words; first: {ch[0]["title"]!r}: {ch[0]["paras"][0][:70]!r}')
json.dump({"source": "The Latin Library (thelatinlibrary.com), via the CLTK collection", "groups": GROUPS, "works": index}, open(os.path.join(OUT, "index.json"), "w"), ensure_ascii=False, separators=(",", ":"))
lex = json.load(open(os.path.join(DATA, "lexicon.json")))
known = collections.defaultdict(collections.Counter)
for p in lex["parts"]:
    for b in p["books"]:
        book = json.load(open(os.path.join(DATA, b[0] + ".json")))
        for chp in book["ch"]:
            for v in chp:
                for x, e in zip(re.findall(r"[A-Za-z]+", v[1]), v[3]):
                    for i in ([e] if isinstance(e, int) and e >= 0 else e if isinstance(e, list) else []): known[norm(x)][i] += 1
GEN = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}   # forms from src/morph.js (tools/summa/generated_forms.mjs): the word, not the parsing
def fentry(x): return [i for i, _ in known[x].most_common(4)] if x in known else [GEN[x]] if x in GEN else None
forms = {x: fentry(x) for x in sorted(words) if fentry(x)}
json.dump(forms, open(os.path.join(OUT, "forms.json"), "w"), separators=(",", ":"))
# The offline copy carries only the first eight works (it is near its size limit), with their own smaller word index.
json.dump({x: forms[x] for x in sorted(words0) if x in forms}, open(os.path.join(OUT, "forms0.json"), "w"), separators=(",", ":"))
print(f"forms: {len(forms)} of {len(words)} words known")
