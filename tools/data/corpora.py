"""Extract the non-NT exam corpora as parallel Latin/English rows.
Output: corpora.json = {parts: {id: {books: [{code, name, group, chapters: [{label, title, rows: [[la, en, label]]}]}]}}}"""
import re, json, sys, os, glob, unicodedata, collections, hashlib

SRC, GUT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

def clean_la(s):
    s = s.replace("æ", "ae").replace("Æ", "Ae").replace("œ", "oe").replace("Œ", "Oe").replace("ǽ", "ae").replace("Ǽ", "Ae")
    s = "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip()
def clean_en(s):
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = re.sub(r"_([^_]+)_", r"\1", s)
    return re.sub(r"\s+", " ", s).strip()
WORD = re.compile(r"[A-Za-z]+")
nwords = lambda s: len(WORD.findall(s))

ROMAN = {v: i for i, v in enumerate("I II III IV V VI VII VIII IX X XI XII XIII XIV XV XVI XVII XVIII XIX XX".split(), 1)}
ORD_LA = ["primum", "secundum", "tertium", "quartum", "quintum", "sextum", "septimum", "octavum", "nonum", "decimum", "undecimum", "duodecimum"]

# ---------------- Summa: Latin ----------------
def summa_latin(path):
    t = open(path, encoding="latin-1").read()
    t = re.sub(r"[ \t]+", " ", t)
    parts = re.split(r"\n\s*ARTICULUS ([IVXL]+|\d+)\s*\n", t)
    arts = {}
    for k in range(1, len(parts), 2):
        tok = parts[k].strip()
        num = int(tok) if tok.isdigit() else ROMAN.get(tok)
        body = parts[k + 1]
        body = re.sub(r"\s+", " ", body)
        m = re.search(r"Ad \w+ sic proceditur\.", body)
        if not num or not m: continue
        title = body[:m.start()].strip()
        rest = body[m.end():]
        sc = re.search(r"\bSed contra\b", rest)
        rp = re.search(r"\bRespondeo dicendum\b", rest)
        if not sc or not rp or rp.start() < sc.start(): continue
        objs_txt = rest[:sc.start()]
        # objections: intro "Videtur quod ..." then " 1. ", " 2. " ...
        secs = {}
        pos = [(m.start(), int(m.group(1))) for m in re.finditer(r"(?:^|\s)(\d{1,2})\.\s+(?=[A-Z])", objs_txt)]
        seq, want = [], 1
        for p, n in pos:
            if n == want: seq.append((p, n)); want += 1
        if not seq: continue
        intro = objs_txt[:seq[0][0]].strip()
        for i, (p, n) in enumerate(seq):
            end = seq[i + 1][0] if i + 1 < len(seq) else len(objs_txt)
            txt = re.sub(r"^\s*\d{1,2}\.\s+", "", objs_txt[p:end]).strip()
            secs[f"obj{n}"] = (intro + " " + txt) if n == 1 else txt
        secs["sc"] = rest[sc.start():rp.start()].strip()
        replies_txt = rest[rp.start():]
        rx = re.compile(r"\bAd (" + "|".join(ORD_LA) + r")\b(?=[^.]{0,60}?dicendum)")
        ms = list(rx.finditer(replies_txt))
        secs["resp"] = replies_txt[:ms[0].start()].strip() if ms else replies_txt.strip()
        for i, mm in enumerate(ms):
            end = ms[i + 1].start() if i + 1 < len(ms) else len(replies_txt)
            n = ORD_LA.index(mm.group(1)) + 1
            secs.setdefault(f"ad{n}", replies_txt[mm.start():end].strip())
        arts[num] = (title, secs)
    return arts

# ---------------- Summa: English (Gutenberg, Dominican Fathers) ----------------
def summa_english(path):
    t = open(path, encoding="utf-8", errors="replace").read()
    t = t[t.index("QUESTION 1\n"):]
    t = t[:t.index("*** END OF THE PROJECT")]
    qs = {}
    for qm in re.finditer(r"\nQUESTION (\d+)\n(.*?)(?=\nQUESTION \d+\n|\Z)", "\n" + t, re.S):
        q = int(qm.group(1)); body = qm.group(2)
        qtitle = body.strip().split("\n")[0].strip()
        arts = {}
        for am in re.finditer(r"\n(\w+) ARTICLE \[I, Q\. \d+, Art\. (\d+)\]\n(.*?)(?=\n\w+ ARTICLE \[I, Q\.|\Z)", body, re.S):
            num = int(am.group(2)); ab = am.group(3).split("_______________________")[0]
            paras = [p.strip() for p in re.split(r"\n\s*\n", ab) if p.strip()]
            title = paras[0].replace("\n", " ") if paras else ""
            secs, cur = {}, None
            for p in paras[1:]:
                p1 = p.replace("\n", " ")
                m = re.match(r"(?:Objection|Obj\.) (\d+):\s*(.*)", p1)
                r = re.match(r"Reply Objs?\. (\d+)(?:[^:]{0,30})?:\s*(.*)", p1)
                if m: cur = f"obj{m.group(1)}"; secs[cur] = m.group(2)
                elif p1.startswith("_On the contrary,_"): cur = "sc"; secs[cur] = p1[len("_On the contrary,_"):].strip()
                elif p1.startswith("_I answer that,_"): cur = "resp"; secs[cur] = p1[len("_I answer that,_"):].strip()
                elif r: cur = f"ad{r.group(1)}"; secs.setdefault(cur, r.group(2))
                elif cur: secs[cur] += " " + p1
            arts[num] = (title, secs)
        qs[q] = (qtitle, arts)
    return qs

LABEL = lambda k: ("Objection " + k[3:]) if k.startswith("obj") else ("Sed contra" if k == "sc" else ("Respondeo" if k == "resp" else "Reply " + k[2:]))
ORDER = lambda k: (0, int(k[3:])) if k.startswith("obj") else ((1, 0) if k == "sc" else ((2, 0) if k == "resp" else (3, int(k[2:]))))

def build_summa():
    en = summa_english(GUT)
    books, stats = [], collections.Counter()
    for f in sorted(glob.glob(f"{SRC}/tll/aquinas/q1.*.txt"), key=lambda p: int(re.search(r"q1\.(\d+)", p).group(1))):
        q = int(re.search(r"q1\.(\d+)", f).group(1))
        la = summa_latin(f)
        if q not in en: continue
        qtitle, earts = en[q]
        chapters = []
        for a in sorted(la):
            if a not in earts: stats["art_missing_en"] += 1; continue
            ltitle, lsecs = la[a]; etitle, esecs = earts[a]
            rows = []
            for k in sorted(set(lsecs) & set(esecs), key=ORDER):
                L, E = clean_la(lsecs[k]), clean_en(esecs[k])
                if nwords(L) < 5 or nwords(E) < 5: continue
                ratio = nwords(E) / max(1, nwords(L))
                if not (0.7 < ratio < 2.6): stats["bad_ratio"] += 1; continue
                rows.append([L, E, LABEL(k)]); stats["sections"] += 1
            stats["sec_unmatched"] += len(set(lsecs) ^ set(esecs))
            if rows: chapters.append({"label": f"Article {a}", "title": clean_en(etitle), "rows": rows})
        if chapters:
            books.append({"code": f"st{q}", "name": f"Question {q}", "title": qtitle.title(), "chapters": chapters})
    print("summa", len(books), "questions", sum(len(b["chapters"]) for b in books), "articles", dict(stats))
    return books

# ---------------- Breviary (Divinum Officium) ----------------
DO = f"{SRC}/do/web/www/horas"
def sections(path):
    try: t = open(path, encoding="utf-8").read()
    except FileNotFoundError: return {}
    out, cur = {}, None
    for line in t.split("\n"):
        m = re.match(r"^\[([^\]]+)\]\s*(.*)$", line)
        if m:
            name = m.group(1).strip(); cond = m.group(2).strip()
            cur = name if not cond else None  # skip conditional variants
            if cur is not None and cur in out: cur = None
            if cur is not None: out[cur] = []
            continue
        if cur is not None: out[cur].append(line)
    return {k: "\n".join(v).strip() for k, v in out.items()}
def resolve(lang, rel, sec, depth=0):
    """Follow @File:Section references."""
    secs = sections(f"{DO}/{lang}/{rel}.txt")
    txt = secs.get(sec)
    if txt is None or depth > 3: return None
    m = re.match(r"^@([^:\n]+?)(?::([^\n]+))?\s*$", txt.split("\n")[0])
    if m and len(txt.split("\n")) <= 2:
        return resolve(lang, m.group(1), (m.group(2) or sec).strip(), depth + 1)
    if "\n@" in "\n" + txt: return None
    return txt

def office_name(rel):
    """The feast's English name from its [Officium] or [Name] section, shortened."""
    n = ""
    for lang in ("English", "Latin"):
        secs = sections(f"{DO}/{lang}/{rel}.txt")
        n = (secs.get("Officium") or secs.get("Name") or (secs.get("Rank") or "").split(";;")[0]).split("\n")[0].strip()
        if n and not n.startswith("@"): break
        n = ""
    if not n: return ""
    if not n.isascii(): n = clean_la(n)
    n = re.sub(r"\s+", " ", n).replace("Commune Apostolorum", "Common of Apostles")
    return n if len(n) <= 60 else n[:57].rsplit(" ", 1)[0] + "…"
DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
SEASON = [("Adv", "Advent"), ("Nat", "Christmastide"), ("Epi", "After Epiphany"), ("Quadp", "Septuagesima"), ("Quad", "Lent"),
          ("Pasc", "Eastertide"), ("Pent", "After Pentecost")]
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
def day_name(rel):
    base = os.path.basename(rel)
    m = re.match(r"(Adv|Epi|Quadp|Quad|Pasc|Pent)(\d+)-(\d)", base)
    if m:
        season = dict(SEASON)[m.group(1)]
        return season, f"{season} week {int(m.group(2))}, {DAYS[int(m.group(3))]}"
    m = re.match(r"Nat(\d+)", base)
    if m: return "Christmastide", f"Christmastide, day {int(m.group(1))}"
    m = re.match(r"(\d{2})(\d)-(\d)", base)
    if m: return "Summer & autumn", f"{MONTHS[int(m.group(1)) - 1]} week {int(m.group(2))}, {DAYS[int(m.group(3))]}"
    m = re.match(r"(\d{2})-(\d{2})", base)
    name = office_name(rel)
    if m:
        d = f"{MONTHS[int(m.group(1)) - 1]} {int(m.group(2))}"
        return f"Saints: {MONTHS[int(m.group(1)) - 1]}", (f"{d} · {name}" if name else d)
    if base.startswith("C"): return "Commons of saints", name or ("Common " + base)
    return None, None

LA_HEAD = re.compile(r"^(Homil|Sermo|Ex |Tractat|Liber|Epistola sancti|Expositio)", re.I)
EN_HEAD = re.compile(r"^(Homily|Sermon|From |A Homily|Treatise|Exposition|Discourse|Book|Letter|Taken from|Commentary)", re.I)
FATHER = re.compile(r"(sanct|Papae|Episcop|Presbyter|Doctor|Abbat)", re.I)

def lesson_parts(txt, head_rx):
    """Return (heading, text) of the patristic reading in a lesson, or None."""
    txt = re.sub(r"/:.*?:/", "", txt, flags=re.S)
    lines = [l for l in txt.split("\n") if l.strip()]
    idx = None
    for i, l in enumerate(lines):
        l2 = re.sub(r"^\{[^}]*\}", "", l).strip()
        if head_rx.match(l2): idx = i
    if idx is None: return None
    head = re.sub(r"^\{[^}]*\}", "", lines[idx]).strip()
    body = [l for l in lines[idx + 1:] if not l.startswith("!") and not l.startswith("&") and not l.startswith("$") and not l.startswith("@")]
    body = [re.sub(r"^v\.\s*", "", l) for l in body]
    return head, " ".join(body)

def build_sermons():
    groups = collections.OrderedDict()
    seen = set(); stats = collections.Counter()
    files = sorted(glob.glob(f"{DO}/Latin/Tempora/*.txt")) + sorted(glob.glob(f"{DO}/Latin/Sancti/*.txt")) + sorted(glob.glob(f"{DO}/Latin/Commune/C*.txt"))
    for f in files:
        rel = os.path.relpath(f, f"{DO}/Latin")[:-4]
        if re.search(r"(Cist|OP|M)$", rel.split("/")[0]): continue
        if re.search(r"[a-z]$", os.path.basename(rel)) and not os.path.basename(rel).startswith("C"): continue
        group, day = day_name(rel)
        if not group: continue
        for n in range(1, 10):
            la = resolve("Latin", rel, f"Lectio{n}")
            en = resolve("English", rel, f"Lectio{n}")
            if not la or not en: stats["missing"] += 1; continue
            lp, ep = lesson_parts(la, LA_HEAD), lesson_parts(en, EN_HEAD)
            if not lp or not ep or not FATHER.search(lp[0]): stats["not_sermon"] += 1; continue
            L, E = clean_la(lp[1]), clean_en(ep[1])
            if nwords(L) < 25 or not (0.8 < nwords(E) / max(1, nwords(L)) < 2.6): stats["bad"] += 1; continue
            h = hashlib.md5(L[:200].encode()).hexdigest()
            if h in seen: stats["dup"] += 1; continue
            seen.add(h)
            author = re.sub(r"\s+", " ", clean_la(lp[0]))
            groups.setdefault(group, []).append({"label": f"{day} · Lesson {n}", "title": clean_en(ep[0]), "la_title": author, "rows": [[L, E, f"Lesson {n}"]]})
            stats["lessons"] += 1
    books = []
    for i, (g, chs) in enumerate(groups.items()):
        books.append({"code": f"se{i + 1}", "name": g, "chapters": chs})
    print("sermons", [(b["name"], len(b["chapters"])) for b in books], dict(stats))
    return books

def stanzas(txt):
    txt = re.sub(r"\{[^}]*\}", "", txt)
    txt = re.sub(r"/:.*?:/", "", txt, flags=re.S)
    out = []
    for st in re.split(r"\n_\s*\n", "\n" + txt + "\n"):
        lines = [re.sub(r"^(v\.|\*)\s*", "", l).strip() for l in st.strip().split("\n") if l.strip() and not l.startswith(("!", "@", "&", "$"))]
        lines = [l for l in lines if l not in ("Amen.",)]
        # inline seasonal variants: "line / (sed tempore X) / alternative": keep the Passiontide reading if given, else the default
        kept, k = [], 0
        while k < len(lines):
            m = re.match(r"^\(sed (.+)\)$", lines[k])
            if m and kept and k + 1 < len(lines):
                if "Passion" in m.group(1): kept[-1] = lines[k + 1]
                k += 2; continue
            kept.append(lines[k]); k += 1
        lines = kept
        if lines: out.append(lines)
    return out

def build_hymns():
    hy, seen, stats = [], set(), collections.Counter()
    files = sorted(glob.glob(f"{DO}/Latin/Tempora/*.txt")) + sorted(glob.glob(f"{DO}/Latin/Sancti/*.txt")) + sorted(glob.glob(f"{DO}/Latin/Commune/C*.txt")) + sorted(glob.glob(f"{DO}/Latin/Psalterium/Special/*.txt"))
    for f in files:
        rel = os.path.relpath(f, f"{DO}/Latin")[:-4]
        if re.search(r"(Cist|OP|M)$", rel.split("/")[0]): continue
        for sec in sections(f):
            if not re.match(r"^Hymnus[0-9]?\s", sec) or sec.startswith("HymnusM"): continue
            la, en = resolve("Latin", rel, sec), resolve("English", rel, sec)
            if not la or not en: stats["missing"] += 1; continue
            ls, es = stanzas(la), stanzas(en)
            if len(ls) < 2: stats["short"] += 1; continue
            first = clean_la(ls[0][0]).rstrip(",;:.").strip()
            key = first.lower()
            if key in seen: stats["dup"] += 1; continue
            if len(ls) != len(es): stats["stanza_mismatch"] += 1; continue
            seen.add(key)
            rows = [[clean_la(" / ".join(a)), clean_en(" / ".join(b)), f"Stanza {i + 1}"] for i, (a, b) in enumerate(zip(ls, es))]
            office = {"Vespera": "Vespers", "Laudes": "Lauds", "Matutinum": "Matins", "Completorium": "Compline", "Prima": "Prime", "Tertia": "Terce", "Sexta": "Sext", "Nona": "None"}
            hour = next((v for k, v in office.items() if k in sec), "")
            grp, day = day_name(rel)
            where = day or ("Psalter" if "Psalterium" in rel else "")
            hy.append({"label": first, "title": f"{hour} hymn" + (f", {where}" if where else ""), "rows": rows})
            stats["hymns"] += 1
    hy.sort(key=lambda h: h["label"].lower())
    print("hymns", dict(stats))
    return [{"code": "hy", "name": "Breviary hymns", "chapters": hy}]

json.dump({"st": build_summa(), "se": build_sermons(), "hy": build_hymns()}, open(OUT, "w"), ensure_ascii=False)
