"""More Library books from James Penfold's Lexicon Scholasticum: the seminary manuals and Boethius from its reading-additions.json
(Zigliara, Summa philosophica I–III; Mazzella, De Religione et Ecclesia; Boethius, Consolatio Philosophiae: public-domain books,
read by machine from scans, so misread words are corrected where one reading is clear), and, when given, the school readers and
other texts exported from its study.sqlite3 (SELECT * FROM sections WHERE book_id IN (…)) as CSV.
Usage: python3 -I tools/library/build_readers.py <reading-additions.json> <out dir> <tll> <genforms.json> [<readers.csv>]\n(The school authors come from The Latin Library collection, <tll>.)
Writes <out dir>/rd-*.json and <out dir>/extra-readers.json (index entries)."""
import sys, os, re, json, csv
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ocrfix
ADD, OUT, TLL, GENF = sys.argv[1:5]
CSV = sys.argv[5] if len(sys.argv) > 5 else None
os.makedirs(OUT, exist_ok=True)
ocrfix.load(TLL, GENF)
TAKE = {   # id in his app -> (our id, shelf, title, author, note, scanned?)
    "user-calibre-dae5a51839d7beed27a9": ("rd-zigliara-1", "manuals", "Summa philosophica I: Logica, Ontologia", "Tommaso Maria Zigliara", "The classic Thomist manual of philosophy for seminaries (Rome, 1876; 14th ed.): logic and ontology.", True),
    "user-calibre-3d6c05438e455cc63491": ("rd-zigliara-2", "manuals", "Summa philosophica II: Cosmologia, Psychologia, Theologia naturalis", "Tommaso Maria Zigliara", "Zigliara's second volume: the world, the soul, and God known by reason.", True),
    "user-calibre-55e16f8a586dd68db08f": ("rd-zigliara-3", "manuals", "Summa philosophica III: Ethica, Ius naturae", "Tommaso Maria Zigliara", "Zigliara's third volume: ethics and natural law.", True),
    "user-calibre-b29a2c12aababa9a3167": ("rd-mazzella", "manuals", "De Religione et Ecclesia", "Camillo Mazzella", "Fundamental theology of the Roman College (1880s): religion, revelation and the Church.", True),
    "user-calibre-4c7bf7c73e2c6d43b429": ("rd-boethius", "fathers", "De consolatione Philosophiae", "Boethius", "The Consolation of Philosophy, in prose and verse.", False),
    "reader-latin-pg-8997": ("rd-fabulae-faciles", "readers", "Fabulae Faciles", "Francis Ritchie", "A first Latin reader: Perseus, Hercules, the Argonauts, Ulysses, in easy Latin.", False),
    "reader-latin-pg-57615": ("rd-appleton", "readers", "Fabulae: Narratives and Dialogues", "R. B. Appleton", "Short graded stories and dialogues for beginners.", False),
    "reader-latin-pg-33311": ("rd-viri-romae", "readers", "Viri Romae (selections)", "C. F. Lhomond", "Lives of famous Romans in simple Latin: the classic school reader.", False),
    "reader-latin-pg-74851": ("rd-crusoe", "readers", "Robinson Crusoe (Latin)", "G. F. Goffeaux, ed. P. A. Barnett", "Robinson Crusoe told in easy Latin.", False),
    "reader-latin-ora_maritima": ("rd-ora-maritima", "readers", "Ora Maritima", "E. A. Sonnenschein", "A Latin story for beginners, with the grammar met as it comes.", False),
    "reader-latin-pro_patria": ("rd-pro-patria", "readers", "Pro Patria", "E. A. Sonnenschein", "The sequel to Ora Maritima.", False),
    "latinlibrary-phaedrus-fables": ("rd-phaedrus", "readers", "Fabulae", "Phaedrus", "Aesop's fables in Latin verse: short and much read in schools.", False),
    "latinlibrary-eutropius-breviarium": ("rd-eutropius", "readers", "Breviarium historiae Romanae", "Eutropius", "Roman history in plain, short Latin: a favourite first author.", False),
    "latinlibrary-lhomond-lhomond.viris": ("rd-de-viris", "readers", "De viris illustribus urbis Romae", "C. F. Lhomond", "The full De viris illustribus.", False),
    "latinlibrary-erasmus-moriae": ("rd-erasmus-moriae", "medieval", "Moriae encomium", "Erasmus", "The Praise of Folly.", False),
    "latinlibrary-erasmus-querela": ("rd-erasmus-querela", "medieval", "Querela pacis", "Erasmus", "The Complaint of Peace.", False),
    "latinlibrary-erasmus-inst": ("rd-erasmus-inst", "medieval", "Institutio principis Christiani", "Erasmus", "The Education of a Christian Prince.", False),
    "perseus-latin-addition-stoa0238.stoa004.perseus-lat2": ("rd-cathemerinon", "hymns", "Cathemerinon", "Prudentius", "Hymns for the hours of the day: several are Breviary hymns.", False),
    "perseus-latin-addition-stoa0162.stoa004.perseus-lat2": ("rd-jerome-ep", "fathers", "Epistulae (selectae)", "St Jerome", "Eighteen of St Jerome's letters.", False),
}
HEADER = re.compile(r"^\s*(\d+\s+)?([A-Z][A-Z .,;:'’()-]{6,}?)(\s+\d+)?\s*$")
def clean_page(t, scanned):
    lines = [l.strip() for l in t.split("\n")]
    head = ""
    # a running head ("32 DISP. I. DE RELIGIONE GENERATIM.") opens most scanned pages
    for i, l in enumerate(lines[:3]):
        m = re.match(r"^\s*\d*\s*((?:DISP|ART|CAP|LIB|QUAEST|PARS|SECT)[A-Z.]*\s.*?)\s*\d*\s*$", l)
        if m: head = m.group(1).strip(" .") ; lines[i] = ""; break
    paras = re.split(r"\n\s*\n", "\n".join(lines))
    out = []
    for p in paras:
        p = re.sub(r"-\s*\n\s*", "", p)               # words broken at the line end
        p = re.sub(r"\s+", " ", p).strip()
        if not p or len(re.findall(r"[A-Za-z]{2,}", p)) < 3: continue   # page numbers, scan noise
        if scanned: p = ocrfix.fix_text(re.sub(r"[»«—|^*_]+", " ", p)).replace("  ", " ")
        out.append(p)
    return head, out
works = []
def emit(oid, shelf, title, author, note, chapters, scanned):
    chapters = [c for c in chapters if c["paras"]]
    if not chapters: print("EMPTY", oid); return
    json.dump({"id": oid, "title": title, "author": author, "verse": False, "chapters": chapters}, open(os.path.join(OUT, oid + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
    words = sum(len(re.findall(r"[^\W\d_]+", p)) for c in chapters for p in c["paras"])
    works.append({"id": oid, "group": shelf, "title": title, "author": author, "note": note, "words": words, "chapters": [c["title"] for c in chapters], "remote": True,
                  **({"caveat": "Read by machine from a scanned book; misread words are corrected where one reading is clear, but some remain."} if scanned else {})})
    print(f"{oid}: {len(chapters)} chapters, {words} words; {chapters[min(3, len(chapters) - 1)]['title']!r}: {chapters[min(3, len(chapters) - 1)]['paras'][0][:90]!r}")
# 1. the scanned books: ten printed pages to a chapter, named by their running head
for x in json.load(open(ADD, encoding="utf-8")):
    b = x["book"]
    if b["id"] not in TAKE: continue
    oid, shelf, title, author, note, scanned = TAKE[b["id"]]
    pages = [(s.get("title") or "", *clean_page(s.get("text") or "", scanned)) for s in x["sections"]]
    chapters = []
    per = 10 if scanned else 1
    for i in range(0, len(pages), per):
        grp = pages[i:i + per]
        paras = [p for _, _, ps in grp for p in ps]
        heads = [h for _, h, _ in grp if h]
        nums = [m.group(1) for t, _, _ in grp for m in [re.search(r"(\d+)", t)] if m]
        label = (heads[0].title() + " · " if heads else "") + (f"pp. {nums[0]}–{nums[-1]}" if nums else f"Part {i // per + 1}")
        chapters.append({"title": label if scanned else (grp[0][0] or f"Part {i + 1}"), "paras": paras})
    emit(oid, shelf, title, author, note, chapters, scanned)
# 2. texts exported from study.sqlite3, one row per section
if CSV:
    csv.field_size_limit(10 ** 9)
    rows = {}
    for r in csv.DictReader(open(CSV, encoding="utf-8")):
        rows.setdefault(r["book_id"], []).append(r)
    for bid, rs in rows.items():
        if bid not in TAKE: continue
        oid, shelf, title, author, note, scanned = TAKE[bid]
        rs.sort(key=lambda r: int(r.get("position") or 0))
        chapters = []
        for k, r in enumerate(rs):
            txt = r.get("text") or ""
            paras = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", txt) if p.strip()]
            t = (r.get("title") or "").strip() or (paras[0][:60] if paras and len(paras[0]) < 60 else f"Pars {k + 1}")
            chapters.append({"title": t, "paras": paras})
        emit(oid, shelf, title, author, note, chapters, False)
# 3. school authors from The Latin Library collection (also on his shelf): headings start chapters, long ones are cut
TLL_BOOKS = [
    ("rd-phaedrus", "readers", "Fabulae Aesopiae", "Phaedrus", "Aesop's fables in Latin verse, one to a page: short and much read in schools.",
     ["phaedr1.txt", "phaedr2.txt", "phaedr3.txt", "phaedr4.txt", "phaedr5.txt", "phaedrapp.txt"], ["Liber I", "Liber II", "Liber III", "Liber IV", "Liber V", "Appendix Perottina"], r"^([IVXLC]+\.\s+\S.*|Prologus|Epilogus|Prologus\s+.*)$", True),
    ("rd-eutropius", "readers", "Breviarium historiae Romanae", "Eutropius", "Roman history from Romulus to Jovian in plain, short Latin: a favourite first author.",
     [f"eutropius/eutropius{i}.txt" for i in range(1, 11)], [f"Liber {r}" for r in "I II III IV V VI VII VIII IX X".split()], None, False),
    ("rd-de-viris", "readers", "De viris illustribus urbis Romae", "C. F. Lhomond", "Lives of famous Romans in simple Latin, written for schoolboys: the classic first reader.",
     ["lhomond.viris.txt"], [""], "UPPER", False),
    ("rd-lhomond-hist", "readers", "Epitome historiae sacrae", "C. F. Lhomond", "Bible history in easy Latin, for beginners.",
     ["lhomond.historiae.txt"], [""], r"^\d+\.\s+\S.*$", False),
    ("rd-erasmus-moriae", "medieval", "Moriae encomium", "Erasmus", "The Praise of Folly.", ["erasmus/moriae.txt"], [""], None, False),
    ("rd-erasmus-querela", "medieval", "Querela pacis", "Erasmus", "The Complaint of Peace.", ["erasmus/querela.txt"], [""], None, False),
    ("rd-erasmus-inst", "medieval", "Institutio principis Christiani", "Erasmus", "The Education of a Christian Prince.", ["erasmus/inst.txt"], [""], None, False),
]
def tll_blocks(path, verse):
    t = open(os.path.join(TLL, path), encoding="utf-8", errors="replace").read().replace("\r", "")
    lines = [l.strip() for l in t.split("\n")][1:]
    out, cur = [], []
    for l in lines:
        if l in ("The Latin Library", "The Classics Page", "Neo-Latin", "Christian Latin") or re.fullmatch(r"[\d\s]+", l or "x"): continue
        if not l:
            if cur: out.append(cur); cur = []
            continue
        cur.append(l)
    if cur: out.append(cur)
    return [("\n" if verse else " ").join(b) for b in out]
for oid, shelf, title, author, note, files, books, head, verse in TLL_BOOKS:
    chapters, cur = [], None
    for f, bk in zip(files, books):
        cur = None
        for blk in tll_blocks(f, verse):
            one = blk.split("\n")[0].strip()
            if head == "UPPER" and blk.isupper() and len(blk) < 90 and chapters is not None and any(c for c in chapters) or (head == "UPPER" and blk.isupper() and len(blk) < 90 and cur is not None):
                cur = {"title": blk.strip(" .").title(), "paras": []}; chapters.append(cur); continue
            if blk.isupper() and len(blk) < 120: continue          # the work's title line
            if head and head != "UPPER" and re.match(head, one) and len(one) < 90:
                cur = {"title": (bk + " · " if bk else "") + one.strip(" ."), "paras": []}; chapters.append(cur)
                rest = blk[len(one):].strip()
                if rest: cur["paras"].append(rest)
                continue
            if cur is None or (not head and sum(len(p.split()) for p in cur["paras"]) > 1200):
                cur = {"title": (bk + (" · " if bk else "") + f"pars {sum(1 for c in chapters if c['title'].startswith(bk)) + 1}") if not head or cur is None else cur["title"], "paras": []}
                if not head or not chapters or chapters[-1] is not cur: chapters.append(cur)
            cur["paras"].append(blk)
    emit(oid, shelf, title, author, note, chapters, False)
    if verse: json.dump({**json.load(open(os.path.join(OUT, oid + ".json"))), "verse": True}, open(os.path.join(OUT, oid + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
json.dump(works, open(os.path.join(OUT, "extra-readers.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print(len(works), "books")
