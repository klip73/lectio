"""The whole Latin Library (thelatinlibrary.com, public domain; the Classical Language Toolkit's copy,
github.com/cltk/lat_text_latin_library) as Library works: classical, Christian, medieval and Neo-Latin.
    python3 -I tools/library/build_latinlibrary.py <lat_text_latin_library dir> data/library
Writes data/library/ll-*.json (one per work: a file, or the numbered books of one work together) and data/library/ll-index.json
(authors, periods and works, loaded only when the Latin Library shelf is opened). Works already on the Library's own shelves
(build_library.py, build_readers.py) are left out. Chapters follow the text's own headings (LIBER, CAPUT, EPISTULA, I., [12]…);
long stretches without headings are cut near 1,500 words and named by the first section number in them."""
import json, os, re, sys, glob
TLL, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
# files the Library already carries
src = open(os.path.join(HERE, "build_library.py"), encoding="utf-8").read() + open(os.path.join(HERE, "build_readers.py"), encoding="utf-8").read()
USED = set(re.findall(r'"([\w./-]+\.txt)"', src))
for pat, lo, hi in re.findall(r'f"([\w/]+)\{i\}\.txt" for i in range\((\d+), (\d+)\)', src):
    USED |= {f"{pat}{i}.txt" for i in range(int(lo), int(hi))}
for g in re.findall(r'"glob:([\w/*.]+)"', src):
    USED |= {os.path.relpath(x, TLL) for x in glob.glob(os.path.join(TLL, g))}
SKIP_DIRS = {"bible"}   # the Vulgate is in the app already
SKIP = re.compile(r"^aquinas/(q\d|p\d|prologus)")   # the Summa: complete in its own reader
# titles for works whose files carry only a book number in their heading
TITLES = {"livy/liv": ("Livy", "Ab urbe condita"), "juvenal/juvenal": ("Juvenal", "Saturae"), "martial/martial": ("Martial", "Epigrammata"),
  "justin/justin": ("Justin", "Epitoma historiarum Philippicarum Pompei Trogi"), "apuleius/apuleius": ("Apuleius", "Metamorphoses"),
  "vergil/aen": ("Vergil", "Aeneis"), "vergil/geo": ("Vergil", "Georgica"), "vergil/ec": ("Vergil", "Eclogae"), "horace/carm": ("Horace", "Carmina"),
  "ovid/ovid.met": ("Ovid", "Metamorphoses"), "ovid/ovid.amor": ("Ovid", "Amores"), "ovid/ovid.artis": ("Ovid", "Ars amatoria"), "ovid/ovid.fasti": ("Ovid", "Fasti"),
  "ovid/ovid.tristia": ("Ovid", "Tristia"), "ovid/ovid.ponto": ("Ovid", "Epistulae ex Ponto"), "ovid/ovid.her": ("Ovid", "Heroides"),
  "caesar/gall": ("Caesar", "De bello Gallico"), "caesar/bc": ("Caesar", "De bello civili")}
FOOT = re.compile(r"^(The Latin Library|The Classics Page|The Classics Homepage|Christian Latin|Medieval Latin|Neo-Latin|The Miscellany|Latin Library)$", re.I)
PERIOD_FOOT = [("Christian Latin", "christian"), ("Medieval Latin", "medieval"), ("Neo-Latin", "neolatin")]
# periods by author folder / file prefix (the Latin Library's own grouping); anything unknown falls to its footer, then "later"
CLASSICAL = set("""12tables ammianus apicius appendix apuleius ausonius caesar cato catullus celsus cicero claudian columella curtius ennius eutropius
florus frontinus gellius germanicus gratius hirtius horace hyginus justin juvenal livy lucan lucilius lucretius macrobius manilius martial
nemesianus nepos ovid persius petronius phaedr plautus pliny pomponius propertius quintilian sallust sen seneca sha silius solinus statius
suetonius sulpicia tacitus terence tibullus valerius varro vegetius velleius vergil vitruvius calpurnius dares dictys festus fronto gaius
grattius laberius naevius pacuvius publilius rutilius servius symmachus avianus avienus censorinus charisius donatus firmicus frontinus
historiaaugusta justinian palladius pervig porcius priapea quintus scribonius sidonius varro victor""".split())
CHRISTIAN = set("""ambrose arnobius augustine cassiodorus commodianus cyprian hilary jerome lactantius leothegreat minucius orosius prudentius
sedulius sulpicius tertullian vincentius victorinus boethius gregory isidore benedict caesarius cassian dracontius ennodius fulgentius
juvencus martinbraga paulinus salvian theodosius venantius fortunat avitus""".split())
NEOLATIN = set("""addison bacon buchanan campion descartes erasmus galileo kepler landor melanchthon milton mirandola more newton petrarch
politian pontano sannazaro spinoza vida valla xylander bultelius luther calvin grotius""".split())
def period_of(key, foot):
    k = key.lower()
    for name, p in PERIOD_FOOT:
        if foot and name in foot: return p
    for s, p in ((CLASSICAL, "classical"), (CHRISTIAN, "christian"), (NEOLATIN, "neolatin")):
        if any(k == a or k.startswith(a) for a in s): return p
    return "medieval"
def read(path):
    t = open(path, encoding="utf-8", errors="replace").read().replace("\r", "").replace(" ", " ")
    lines = [l.rstrip() for l in t.split("\n")]
    while lines and not lines[0].strip(): lines.pop(0)
    head = lines.pop(0).strip() if lines else ""
    foot = " ".join(l.strip() for l in lines[-6:])
    body = [l for l in lines if not FOOT.match(l.strip())]
    # trailing "Author" line before the footer
    while body and (not body[-1].strip() or (len(body[-1].strip()) < 40 and body[-1].strip().split(" ")[0] in head)): body.pop()
    return head, foot, body
def blocks(body):
    out, cur = [], []
    for l in body:
        if not l.strip():
            if cur: out.append(cur); cur = []
        else: cur.append(l.strip())
    if cur: out.append(cur)
    return out
def is_verse(bs):
    lines = [l for b in bs for l in b]
    if len(lines) < 8: return False
    short = sum(1 for l in lines if len(l) < 75)
    multi = sum(1 for b in bs if len(b) > 1)
    return short / len(lines) > 0.8 and multi >= max(2, len(bs) * 0.4)
HEAD = re.compile(r"^(LIBER|LIBRI|CAPUT|CAP\.|CAPITULUM|CAPITVLVM|EPISTULA|EPISTOLA|EPIST\.|SERMO|HOMILIA|PROLOGUS|PROLOGVS|PRAEFATIO|PRÆFATIO|PROOEMIUM|PROHOEMIUM|ARGUMENTUM|ACTUS|ACTVS|SCAENA|SCENA|CARMEN|ODE|ELEGIA|SATURA|SATVRA|DISTINCTIO|QUAESTIO|QVAESTIO|ARTICULUS|TITULUS|LECTIO|PARS|BOOK|Liber|Caput|Epistula|Epistola|Sermo|Carmen)\b.*$")
ROMAN = re.compile(r"^\(?[IVXLCDM]+\.?\)?\s*$|^\[?[IVXLCDM]+\]\.?\s*$")
NUM = re.compile(r"^\[\s*(\d+[a-z]?)\s*\]|^(\d+)\.\s|^\((\d+)\)\s")
RFIX = re.compile(r"\b([IVXLCDM][ivxlcdm]+)\b")
def fix_roman(t): return RFIX.sub(lambda m: m.group(1).upper() if re.fullmatch(r"[ivxlcdm]+", m.group(1)[1:]) and re.fullmatch(r"M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})", m.group(1).upper()) else m.group(1), t)
def is_heading(b):
    if len(b) != 1: return False
    s = b[0].strip()
    if len(s) > 90: return False
    if ROMAN.match(s): return True
    if HEAD.match(s) and len(s) < 90: return True
    letters = re.sub(r"[^A-Za-z]", "", s)
    return len(letters) >= 4 and s.upper() == s and len(s) < 70
def chapters_of(files):
    """files: [(label, path)] -> chapters, verse?"""
    chs, verse_all = [], []
    for label, path in files:
        head, foot, body = read(path)
        bs = blocks(body)
        # the work's own title line(s) repeated at the top
        while bs and len(bs[0]) == 1 and len(bs[0][0]) < 120 and (bs[0][0].upper() == bs[0][0] or bs[0][0] in head or re.search(r"\b(LIBER|Liber|BOOK)\b", bs[0][0])) and not ROMAN.match(bs[0][0]): bs.pop(0)
        verse = is_verse(bs)
        verse_all.append(verse)
        cur, words, base, part = None, 0, label, 0
        def new(t):
            nonlocal cur, words
            cur = {"title": " · ".join(x for x in (label, t) if x) or "Textus", "paras": []}
            if verse: cur["v"] = 1
            chs.append(cur); words = 0
        for b in bs:
            if is_heading(b):
                t = b[0].strip(" .")
                t = fix_roman(t.title()) if t.isupper() and len(t) > 6 else t
                if cur is not None and not cur["paras"]:
                    cur["title"] += " · " + t
                else: new(t)
                base, part = cur["title"], 0
                continue
            text = "\n".join(re.sub(r"\s+\d{1,4}$", "", l) for l in b) if verse else " ".join(b)
            text = re.sub(r"[ \t]+", " ", text).strip()
            if not re.search(r"[A-Za-z]{2}", text): continue
            n = len(text.split())
            if cur is None: new("")
            elif words + n > (2200 if verse else 1600) and words > 300:
                m = NUM.match(text); part += 1
                prev = cur
                cur = {"title": " · ".join(x for x in (base, ("§ " + next(g for g in m.groups() if g)) if m else f"pars {part + 1}") if x), "paras": []}
                if verse: cur["v"] = 1
                if part == 1 and not NUM.match(prev["paras"][0] if prev["paras"] else ""): prev["title"] = " · ".join(x for x in (base, "pars 1") if x)
                chs.append(cur); words = 0
            cur["paras"].append(text); words += n
    chs = [c for c in chs if c["paras"]]
    return chs, (sum(verse_all) > len(verse_all) / 2)
def roman(n):
    out = ""
    for v, s in ((1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"), (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")):
        while n >= v: out += s; n -= v
    return out
# group files into works: numbered books of one work go together (off1, off2… ; aen1…)
files = sorted(os.path.relpath(p, TLL) for p in glob.glob(os.path.join(TLL, "**", "*.txt"), recursive=True))
groups = {}
for f in files:
    d = os.path.dirname(f)
    if d.split("/")[0] in SKIP_DIRS or SKIP.match(f) or f in USED or os.path.basename(f) in ("README.txt", "index.txt", "indices.txt", "classics.txt"): continue
    stem = os.path.basename(f)[:-4]
    m = re.match(r"^(.*?)[._-]?(\d+)([a-z]?)$", stem)
    numbered = bool(m) and (bool(m.group(1)) or bool(d))
    key = (d, (m.group(1) or os.path.basename(d)) if numbered else stem)
    groups.setdefault(key, []).append((int(m.group(2)) if numbered else 0, m.group(3) if numbered else "", f))
works, seen_ids = [], set()
for (d, base), fs in sorted(groups.items()):
    fs.sort()
    first_head = read(os.path.join(TLL, fs[0][2]))[0]
    foot = " ".join(read(os.path.join(TLL, x[2]))[1] for x in fs[:2])
    a, _, t = first_head.partition(":")
    author, title = (a.strip(), t.strip()) if t else ((d.split("/")[0].title() if d else ""), first_head.strip())
    BOOKISH = re.compile(r"^(Liber|Book|Bk\.?|Pars|Part|Satura|Satire|Carmen|Ode|Elegy|Volume|Vol\.?|Praefatio|Preface)?\s*([IVXLC]+|\d+)?[a-z]?\.?$", re.I)
    if t and BOOKISH.match(title): author, title = (d.split("/")[0].title() if d else ""), a.strip()   # "Metamorphoses: Liber I"
    if len(fs) > 1:
        title = re.sub(r"[,.]?\s*(Liber|Book|Bk\.?|Pars|Part|Ep\.?|Epistula|Epistulae|Satura|Carmen|Sermo|Volume|Vol\.?)?\s*([IVXLC]+|\d+)[a-z]?\.?\s*$", "", title).strip(" ,.:") or title
    if author and title.lower().startswith(author.lower()) and len(title) - len(author) < 6: title = ""
    tk = (d + "/" if d else "") + base
    if tk in TITLES: author, title = TITLES[tk]
    elif not title or BOOKISH.match(title): title = (author + ", " if author else "") + base.replace(".", " ").title()
    if title.isupper(): title = fix_roman(title.title()).replace(" De ", " de ").replace(" Et ", " et ").replace(" In ", " in ").replace(" Ad ", " ad ")
    if author.isupper(): author = author.title()
    labels = []
    for n, suf, f in fs:
        labels.append(f"{roman(n)}{suf}" if len(fs) > 1 and n else (f"{suf}" if len(fs) > 1 else ""))
    chs, verse = chapters_of([(lab, os.path.join(TLL, f)) for lab, (_, _, f) in zip(labels, fs)])
    if not chs: continue
    wid = "ll-" + re.sub(r"[^a-z0-9]+", "-", (d.replace("/", "-") + "-" + base if d else base).lower()).strip("-")
    while wid in seen_ids or wid == "ll-index": wid += "x"
    seen_ids.add(wid)
    words = sum(len(re.findall(r"[^\W\d_]+", p)) for c in chs for p in c["paras"])
    if words < 40: continue
    per = period_of(d.split("/")[0] if d else base, foot)
    json.dump({"id": wid, "title": title, "author": author, "verse": verse, "chapters": chs}, open(os.path.join(OUT, wid + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
    works.append({"id": wid, "title": title, "author": author or "Anonymous", "period": per, "words": words, "chapters": [c["title"] for c in chs], "src": [x[2] for x in fs]})
PERIODS = [["classical", "Classical (to c. AD 200)"], ["christian", "Christian Latin (the Fathers and late antiquity)"], ["medieval", "Medieval Latin"], ["neolatin", "Neo-Latin (Renaissance and after)"]]
json.dump({"periods": PERIODS, "works": works}, open(os.path.join(OUT, "ll-index.json"), "w"), ensure_ascii=False, separators=(",", ":"))
tot = sum(w["words"] for w in works)
from collections import Counter
print(f"{len(works)} works, {tot:,} words; by period {dict(Counter(w['period'] for w in works))}")
