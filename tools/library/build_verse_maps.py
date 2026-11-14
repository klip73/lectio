"""Verse maps for Sunday preparation, built from what is already in data/:
  1. data/library/lectura-map.json: St Thomas's lecturae on the Gospels and St Paul (ct-super-*), verse by verse.
     {book: [[chapter, v1, v2, workId, part], ...]}. Thomas quotes each lemma before expounding it, so each Vulgate verse
     (data/<book>.json) goes to the part of the lectura that shares most three-word runs with it; runs of verses going to
     the same part are joined.
  2. data/library/vc/<book>.json: the Vatican documents (va-*) that cite a New Testament verse, in the text or in a note.
     {chapter: [[v1, v2, workId, part, label], ...]}. Notes are tied back to the part whose text carries their number,
     "(12)" or a superscript; a note whose number isn't found stays with the Notae part. label: the Catechism's paragraph
     number(s), else "n. 12" when the paragraph is numbered, else "".
    python3 -I tools/library/build_verse_maps.py data
"""
import sys, os, re, json, glob, collections

DATA = sys.argv[1] if len(sys.argv) > 1 else "data"
LIB = os.path.join(DATA, "library")

def norm(s):
    s = s.lower().replace("æ", "ae").replace("œ", "oe").replace("j", "i").replace("v", "u")
    s = re.sub(r"[áàâä]", "a", s); s = re.sub(r"[éèêë]", "e", s); s = re.sub(r"[íìîï]", "i", s)
    s = re.sub(r"[óòôö]", "o", s); s = re.sub(r"[úùûü]", "u", s); s = s.replace("ý", "y")
    return re.findall(r"[a-z]+", s)

def tri(words):
    return {" ".join(words[i:i + 3]) for i in range(len(words) - 2)}

def chap_text(c):
    return " ".join(c.get("paras", []))

# ---------- 1. St Thomas's lecturae ----------
LECTURAE = {
    "mt": ["ct-super-matthaeum", "ct-super-matthaeum-petri-de-scala"], "jn": ["ct-super-ioannem"],
    "rm": ["ct-super-romanos"], "1co": ["ct-super-i-corinthios", "ct-super-i-corinthios-reportatio"],
    "2co": ["ct-super-ii-corinthios"], "ga": ["ct-super-galatas"], "eph": ["ct-super-ephesios"],
    "ph": ["ct-super-philippenses"], "col": ["ct-super-colossenses"], "1th": ["ct-super-i-thessalonicenses"],
    "2th": ["ct-super-ii-thessalonicenses"], "1tm": ["ct-super-i-timotheum"], "2tm": ["ct-super-ii-timotheum"],
    "ti": ["ct-super-titum"], "phm": ["ct-super-philemonem"], "hb": ["ct-super-hebraeos"],
}
lmap = {}
for book, works in LECTURAE.items():
    bible = json.load(open(os.path.join(DATA, book + ".json"), encoding="utf-8"))
    parts = []  # (workId, part, trigram set)
    said = {}   # (workId, part) -> the chapter its title names ("6-2" = chapter 6, lecture 2), when it names one
    for wid in works:
        p = os.path.join(LIB, wid + ".json")
        if not os.path.exists(p): continue
        w = json.load(open(p, encoding="utf-8"))
        for i, c in enumerate(w["chapters"]):
            parts.append((wid, i, tri(norm(chap_text(c)))))
            t = re.match(r"^(\d+)-\d+$", c.get("title", ""))
            if t: said[(wid, i)] = int(t.group(1))
    if not parts: continue
    df = collections.Counter(t for _, _, ts in parts for t in ts)  # common runs ("et dixit eis") say little
    rows = []
    for ci, verses in enumerate(bible["ch"]):
        for v in verses:
            vt = [t for t in tri(norm(v[1])) if df[t] <= 6]
            if len(vt) < 1: continue
            best, score = None, 0
            for wid, i, ts in parts:
                s = sum(1 for t in vt if t in ts)
                if s > score: best, score = (wid, i), s
            if best and score >= max(2, min(4, len(vt) // 3)):
                rows.append([ci + 1, v[0], v[0], best[0], best[1]])
    # a verse quoted again later ("ut supra dictum est") can win a part far off: the lectura goes in order, so a verse whose
    # part none of its neighbours share, while two or more of them agree, takes their part
    fixed = []
    for i, r in enumerate(rows):
        nb = [tuple(x[3:]) for x in rows[max(0, i - 2):i] + rows[i + 1:i + 3] if x[0] == r[0]]
        mode = collections.Counter(nb).most_common(1)
        if nb and tuple(r[3:]) not in nb and mode and mode[0][1] >= 2: r = r[:3] + list(mode[0][0])
        fixed.append(r)
    # a part that expounds another chapter (most of its verses lie there) keeps only those
    home = collections.defaultdict(collections.Counter)
    for r in fixed: home[tuple(r[3:])][r[0]] += 1
    fixed = [r for r in fixed if said.get(tuple(r[3:]), r[0]) == r[0]]
    rows = [r for r in fixed if home[tuple(r[3:])].most_common(1)[0][0] == r[0] or home[tuple(r[3:])][r[0]] >= 0.4 * sum(home[tuple(r[3:])].values())]
    out = []
    for r in rows:
        if out and out[-1][0] == r[0] and out[-1][3:] == r[3:] and r[1] - out[-1][2] <= 2: out[-1][2] = r[2]
        else: out.append(r)
    lmap[book] = out
    print(book, len(out), "ranges from", sum(1 for _ in rows), "verses")
json.dump(lmap, open(os.path.join(LIB, "lectura-map.json"), "w", encoding="utf-8"), separators=(",", ":"))

# ---------- 2. Vatican documents citing the New Testament ----------
BOOKS = [  # (regex for the abbreviation, code); the numbered ones first
    (r"(?:1|I)\.? ?(?:Cor|Corinth)", "1co"), (r"(?:2|II)\.? ?(?:Cor|Corinth)", "2co"),
    (r"(?:1|I)\.? ?(?:Thes|Thess|Th)", "1th"), (r"(?:2|II)\.? ?(?:Thes|Thess|Th)", "2th"),
    (r"(?:1|I)\.? ?(?:Tim|Tm)", "1tm"), (r"(?:2|II)\.? ?(?:Tim|Tm)", "2tm"),
    (r"(?:1|I)\.? ?(?:Pt|Pe|Petr|Pet|Petri)", "1pt"), (r"(?:2|II)\.? ?(?:Pt|Pe|Petr|Pet|Petri)", "2pt"),
    (r"(?:1|I)\.? ?(?:Io|Ioan|Ioann|Ioh|Jo|Joan|Joann)", "1jn"), (r"(?:2|II)\.? ?(?:Io|Ioan|Ioann|Jo)", "2jn"),
    (r"(?:3|III)\.? ?(?:Io|Ioan|Ioann|Jo)", "3jn"),
    (r"Mt|Matth|Matt|Mat", "mt"), (r"Mc|Marc|Mar", "mk"), (r"Lc|Luc|Luk", "lk"),
    (r"Io|Ioan|Ioann|Ioh|Joan|Joann|Jo", "jn"), (r"Act|Acts|Act\. Ap", "ac"), (r"Rom|Rm", "rm"),
    (r"Gal", "ga"), (r"Eph|Ephes", "eph"), (r"Phil|Philipp|Phl|Philip", "ph"), (r"Col|Coloss", "col"),
    (r"Tit", "ti"), (r"Phlm|Philem|Phm", "phm"), (r"Heb|Hebr", "hb"), (r"Iac|Iacob|Jac|Ias", "jas"),
    (r"Iud|Iudae|Jud", "jd"), (r"Apc|Apoc|Ap", "ap"),
]
BOOK_RE = "|".join(f"(?P<b{i}>{rx})" for i, (rx, _) in enumerate(BOOKS))
NUM = r"(?:\d{1,3}|[IVXL]{1,7})"
VS = r"\d{1,3}[a-c]?(?:\s?[-–]\s?\d{1,3}[a-c]?)?"
VLIST = rf"{VS}(?:\s?(?:\.|et|,)\s?{VS})*"
CITE = re.compile(rf"(?<![A-Za-z])(?:{BOOK_RE})\.?\s?(?P<c>{NUM})(?:\s?[,:]\s?(?P<v>{VLIST}))?(?P<more>(?:\s?;\s?{NUM}\s?[,:]\s?{VLIST})*)")
MORE = re.compile(rf"(?P<c>{NUM})\s?[,:]\s?(?P<v>{VLIST})")
ROMAN = {"I": 1, "V": 5, "X": 10, "L": 50}
CHAPTERS = {b: len(json.load(open(os.path.join(DATA, b + ".json"), encoding="utf-8"))["ch"]) for _, b in BOOKS}

def num(s):
    if s.isdigit(): return int(s)
    n = 0
    for i, ch in enumerate(s):
        v = ROMAN[ch]; n += -v if i + 1 < len(s) and ROMAN[s[i + 1]] > v else v
    return n

def verses(vs):
    out = []
    if not vs: return [(1, 999)]
    for part in re.split(r"\s?(?:\.|et)\s?", vs):
        for p in re.split(r"\s?,\s?", part):  # a comma after the chapter's verse is another verse ("1, 14, 17")
            m = re.match(r"(\d+)[a-c]?(?:\s?[-–]\s?(\d+))?", p.strip())
            if m: out.append((int(m.group(1)), int(m.group(2) or m.group(1))))
    return out

def cites(text):
    for m in CITE.finditer(text):
        i = next(i for i in range(len(BOOKS)) if m.group(f"b{i}"))
        book = BOOKS[i][1]
        groups = [(m.group("c"), m.group("v"))] + [(x.group("c"), x.group("v")) for x in MORE.finditer(m.group("more") or "")]
        for c, v in groups:
            c = num(c)
            if not (1 <= c <= CHAPTERS[book]): continue
            if not v and book in ("jn", "ap") and m.group(0).startswith(("Io", "Ap")) and len(m.group(0)) < 6: continue  # "Io 3" alone: too often not a citation
            for a, b in verses(v):
                if 0 < a <= b < 200 or b == 999: yield book, c, a, b

MARK = re.compile(r"\((\d{1,3})\)|([¹²³⁴⁵⁶⁷⁸⁹⁰]+)")
SUP = str.maketrans("¹²³⁴⁵⁶⁷⁸⁹⁰", "1234567890")

def label(wid, para):
    m = re.match(r"\s*(\d{1,4})\b", para)
    if not m: return ""
    return m.group(1) if wid == "va-ccc" else "n. " + m.group(1)

vc = collections.defaultdict(lambda: collections.defaultdict(set))
idx = json.load(open(os.path.join(LIB, "va-index.json"), encoding="utf-8"))
for w in idx["works"]:
    p = os.path.join(LIB, w["id"] + ".json")
    if not os.path.exists(p): continue
    work = json.load(open(p, encoding="utf-8"))
    wid = w["id"]
    pending = {}  # note number -> (part, label) since the last Notae part
    for pi, c in enumerate(work["chapters"]):
        notes = re.search(r"\bNotae\b", c.get("title", "")) is not None
        for para in c.get("paras", []):
            if notes:
                m = re.match(r"\s*\((\d{1,3})\)", para)
                where = pending.get(int(m.group(1))) if m else None
                part, lab = where if where else (pi, "")
                for book, ch, a, b in cites(para): vc[book][ch].add((a, b, wid, part, lab))
                continue
            lab = label(wid, para)
            for mk in MARK.finditer(para):
                n = int(mk.group(1) or mk.group(2).translate(SUP))
                pending[n] = (pi, lab)
            for book, ch, a, b in cites(para): vc[book][ch].add((a, b, wid, pi, lab))
        if notes: pending = {}
os.makedirs(os.path.join(LIB, "vc"), exist_ok=True)
total = 0
for book, chs in vc.items():
    out = {}
    for ch, rows in chs.items():
        rows = sorted(rows, key=lambda r: (r[2], r[3], r[0]))
        out[str(ch)] = [list(r) for r in rows]; total += len(rows)
    json.dump(out, open(os.path.join(LIB, "vc", book + ".json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("Vatican citations:", total, "in", len(vc), "books")
