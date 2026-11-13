"""Vatican documents with a Latin text: popes' letters (Leo X to Leo XIV), the ecumenical councils (Nicaea to Vatican II),
the Roman Curia, the 1997 Catechism (editio typica latina) and its Compendium, the 1983 Code and the Eastern Code, the
liturgical books and instructions. From github.com/realitix/magisterium, which took most of them from vatican.va
(© Libreria Editrice Vaticana / Dicasterium pro Communicatione for the newer ones); the English is the Vatican's where it has one.
    python3 -I tools/library/build_vatican.py <magisterium repo>/magisterium data/library
Writes data/library/va-*.json (one per document; the Catechism, Trent, the 1983 Code and the Eastern Code each as one work)
and data/library/va-index.json. Works already on the Library's shelves (the Roman Catechism, the 1917 Code, the 1895
Pontificale) are left out.

Each document is cut at its headings (Caput I, Pars prima…), long parts again at numbered paragraphs (about 1,200 words a
part); footnotes go to a last part, Notae. English: where both texts number their paragraphs, each part gets the English of
the same numbers (beside the Latin when the paragraphs pair off one to one, else after it); otherwise the English is shared
out by length (after the Latin, marked as approximate)."""
import sys, os, re, json, glob, collections
try:
    import yaml
except ImportError:
    yaml = None
SRC, OUT = sys.argv[1], sys.argv[2]

SKIP = re.compile(r"1566-romain-trente|1917-05-27_codex-iuris-canonici|1895-pontifical-romain-leo-xiii")
COMBINE = [  # (pattern on the file stem, id, title, author)
    (r"^1997-08-15_ccc-lt_", "va-ccc", "Catechismus Catholicae Ecclesiae", "Editio typica latina, 1997"),
    (r"^1545_trente", "va-trent", "Concilium Tridentinum", "Council of Trent (1545–1563)"),
    (r"codex-iuris-canonici-(liber-\d+|index)_code$", "va-cic1983", "Codex Iuris Canonici (1983)", "John Paul II"),
    (r"codex-canonum-ecclesiarum-orientalium-\d_code$", "va-cceo", "Codex Canonum Ecclesiarum Orientalium (1990)", "John Paul II"),
]

def meta_of(stem_path):
    p = stem_path + ".meta.yaml"
    if not os.path.exists(p): return {}
    t = open(p, encoding="utf-8").read()
    if yaml: return yaml.safe_load(t) or {}
    m = {}
    for k in ("incipit", "auteur", "type", "date", "titre_original"):
        x = re.search(rf"^{k}: ['\"]?(.*?)['\"]?$", t, re.M)
        if x: m[k] = x.group(1)
    return m

POPES = {"Léon": "Leo", "Pie": "Pius", "Benoît": "Benedict", "Grégoire": "Gregory", "Jean-Paul": "John Paul", "Jean": "John",
         "Clément": "Clement", "Sixte": "Sixtus", "Alexandre": "Alexander", "François": "Francis", "Paul": "Paul", "Innocent": "Innocent",
         "Jules": "Julius", "Sylvestre": "Sylvester", "Damase": "Damasus", "Célestin": "Celestine", "Vigile": "Vigilius", "Agathon": "Agatho",
         "Hadrien": "Adrian", "Calixte": "Callixtus", "Eugène": "Eugene", "Martin": "Martin", "Yves de Chartres": "Ivo of Chartres", "Gratien": "Gratian"}
BODIES = {"Congrégation pour la doctrine de la foi": "Congregation for the Doctrine of the Faith",
          "Dicastère pour la doctrine de la foi": "Dicastery for the Doctrine of the Faith",
          "Saint-Office": "Holy Office",
          "Congrégation pour le culte divin et la discipline des sacrements": "Congregation for Divine Worship",
          "Congrégation pour le Culte Divin et la Discipline des Sacrements": "Congregation for Divine Worship",
          "Sacrée Congrégation pour le Culte Divin": "Congregation for Divine Worship",
          "Congrégation des rites": "Congregation of Rites", "Congrégation pour le clergé": "Congregation for the Clergy"}
def english_author(a):
    a = (a or "").strip()
    if a in BODIES: return BODIES[a]
    a = re.sub(r"\s*\(.*?\)", "", a).replace("Ier", "I").replace("+", " / ")
    for fr, en in sorted(POPES.items(), key=lambda x: -len(x[0])):
        a = re.sub(rf"(^|/ ?){re.escape(fr)}\b", lambda m: m.group(1) + en, a)
    return a.split(" / Sacra")[0].split(" / Congr")[0].strip()

COUNCILS = {"nicaea-i": ("Concilium Nicaenum I", "First Council of Nicaea (325)"), "constantinople-i": ("Concilium Constantinopolitanum I", "First Council of Constantinople (381)"),
            "ephese": ("Concilium Ephesinum", "Council of Ephesus (431)"), "chalcedoine": ("Concilium Chalcedonense", "Council of Chalcedon (451)"),
            "constantinople-ii": ("Concilium Constantinopolitanum II", "Second Council of Constantinople (553)"), "constantinople-iii": ("Concilium Constantinopolitanum III", "Third Council of Constantinople (680–681)"),
            "nicee-ii": ("Concilium Nicaenum II", "Second Council of Nicaea (787)"), "constantinople-iv": ("Concilium Constantinopolitanum IV", "Fourth Council of Constantinople (869–870)"),
            "latran-i": ("Concilium Lateranense I", "First Lateran Council (1123)"), "latran-ii": ("Concilium Lateranense II", "Second Lateran Council (1139)"),
            "latran-iii": ("Concilium Lateranense III", "Third Lateran Council (1179)"), "latran-iv": ("Concilium Lateranense IV", "Fourth Lateran Council (1215)"),
            "lyon-i": ("Concilium Lugdunense I", "First Council of Lyon (1245)"), "lyon-ii": ("Concilium Lugdunense II", "Second Council of Lyon (1274)"),
            "vienne": ("Concilium Viennense", "Council of Vienne (1311–1312)"), "constance": ("Concilium Constantiense", "Council of Constance (1414–1418)"),
            "florence": ("Concilium Florentinum", "Council of Florence (1431–1445)"), "latran-v": ("Concilium Lateranense V", "Fifth Lateran Council (1512–1517)"),
            "vatican-i": ("Concilium Vaticanum I", "First Vatican Council (1869–1870)")}
KIND = {"encyclique": "Encyclical", "bulle": "Bull", "constitution-apostolique": "Apostolic constitution", "motu-proprio": "Motu proprio",
        "exhortation-apostolique": "Apostolic exhortation", "lettre": "Letter", "instruction": "Instruction", "instruction-liturgique": "Instruction",
        "declaration": "Declaration", "document": "", "decret": "Decree", "responsum": "Responsum", "notification": "Notification", "normes": "Norms",
        "rescrit": "Rescript", "profession-de-foi": "Profession of faith", "decret-conciliaire": "Decree", "constitution-conciliaire": "Constitution",
        "declaration-conciliaire": "Declaration", "pontifical": "Pontifical", "missel": "Missal", "code-canonique": "Code", "catechisme": "Catechism",
        "concile-oecumenique": "Council", "concile-session": "Session"}
STEMKIND = [(r"_mp$", "Motu proprio"), (r"_const$", "Apostolic constitution"), (r"_instr$", "Instruction"), (r"_decret$", "Decree")]

def section(path):
    if "/conciles-oecumeniques/" in path: return "councils"
    if path.startswith("B-vatican-ii/"): return "vat2"
    if "/curie-romaine/" in path: return "curia"
    if "/catechismes/" in path: return "catechism"
    if "/droit-canonique/" in path: return "law"
    if "/liturgie/" in path: return "liturgy"
    return "popes"
SECTIONS = [["popes", "Popes"], ["councils", "Ecumenical councils"], ["vat2", "Second Vatican Council"], ["curia", "Roman Curia"],
            ["catechism", "Catechism"], ["law", "Canon law"], ["liturgy", "Liturgy"]]

# ---------- markdown to paragraphs ----------
FURNITURE = re.compile(r"Copyright ©|Sancta\*? \*\*Sedes|!\[|/content/vatican|^\s*-{3,}\s*$|^\s*\*{3,}\s*$|^\s*_{3,}\s*$|Libreria Editrice Vaticana\s*$|^\s*\[(Top|Index|Back|Torna)", re.I)
def inline(s):
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", s)
    s = re.sub(r"\[([^\]]*)\]\((?:[^)(]|\([^)]*\))*\)", r"\1", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\\([\\`*_{}\[\]()#+\-.!>|~])", r"\1", s)
    s = s.replace("**", "").replace("__", "")
    s = re.sub(r"(?<![\w*])\*(?!\s)([^*]+?)\*(?!\w)", r"\1", s)
    s = re.sub(r"(?<!\w)_(?!\s)([^_]+?)_(?!\w)", r"\1", s)
    s = s.replace("*", "").replace(" ", " ").replace("&nbsp;", " ")
    return re.sub(r"[ \t]+", " ", s).strip()
NUM = re.compile(r"^(\d{1,4})(?:\.|\s*[-–—]|(?=\s+[A-ZÀ-Ý«\"„“(\[]))\s*(?=\S)")
NOTE = re.compile(r"^(?:\(\d{1,3}\*?\)|\[\d{1,3}\]|\d{1,3}\)|\^?\d{1,3}\^?\s+(?=(?:Cf|cf|Ibid|Ibidem|S\.|AAS|PL|PG|DS|Denz|See|Conc|Pius|Leo|Ioannes|Paulus)\b))\s*")
def paras_of(text):
    """-> list of (kind, text, num): kind 'h' heading, 'p' paragraph, 'n' note"""
    text = re.sub(r"\[\\?\[(\d+)\\?\]\]\([^)]*\)", r"[\1]", text.replace("\r", ""))
    text = re.sub(r"\[\^(\d+)\]:?", r"[\1]", text)
    blocks, cur = [], []
    for line in text.split("\n"):
        if FURNITURE.search(line): line = ""
        if not line.strip():
            if cur: blocks.append(cur); cur = []
            continue
        if re.match(r"^\s*#{1,6}\s", line):
            if cur: blocks.append(cur); cur = []
            blocks.append([line]); continue
        cur.append(line)
    if cur: blocks.append(cur)
    out = []
    heads = collections.Counter(re.sub(r"^#{1,6}\s*", "", " ".join(b)).strip() for b in blocks if len(" ".join(b)) < 80)
    for b in blocks:
        if len(" ".join(b)) < 80 and heads[re.sub(r"^#{1,6}\s*", "", " ".join(b)).strip()] >= 3 and not re.search(r"\b(Caput|Pars|Articulus|Titulus|Canon|Sessio|Liber)\b", " ".join(b), re.I): continue
        if re.search(r"[A-Za-z][0-9][A-Za-z]|\b[A-Z] [A-Z0-9] [A-Z] [A-Z]\b", " ".join(b)) and len(" ".join(b)) < 60: continue
        raw = " ".join(l.strip() for l in b).strip()
        raw = re.sub(r"^>\s*", "", raw).replace(" > ", " ")
        if re.match(r"^\s*[-*+]\s", raw) and len(b) > 1:   # a list: keep its items as lines
            raw = "\n".join(re.sub(r"^\s*[-*+]\s+", "• ", l.strip()) for l in b)
        is_md_head = bool(re.match(r"^#{1,6}\s", raw))
        bold_only = bool(re.match(r"^\*\*[^*]+\*\*$|^\*\*\*[^*]+\*\*\*$|^\*\*[^*]+\*\*\s*\\?\*?$", raw.strip()))
        t = inline(re.sub(r"^#{1,6}\s*", "", raw))
        if not t or not re.search(r"[A-Za-zÀ-ÿ]", t): continue
        if NOTE.match(t) and not NUM.match(t.replace("(", "", 0)):
            out.append(("n", t, None)); continue
        m = NUM.match(t)
        num = int(m.group(1)) if m and not (1000 <= int(m.group(1)) <= 2100 and len(t) < 40) else None
        words = len(t.split())
        caps = t.upper() == t and re.search(r"[A-Z]{3}", t) and words <= 14
        if num is None and (is_md_head or (bold_only and words <= 18) or caps) and words <= 25:
            out.append(("h", t.rstrip(".:"), None)); continue
        out.append(("p", t, num))
    return out

def nice_head(h):
    if h.upper() == h and len(h) > 3:
        h = " ".join(w if re.fullmatch(r"[IVXLCDM]+[.,:]?", w) else w.lower().capitalize() for w in h.split())
        h = re.sub(r"\b(De|Et|In|Ad|Cum|Pro|Ex|Sub|Super|Seu|Vel|Ac|Atque|Ab|A|E)\b(?!$)", lambda m: m.group(1).lower() if m.start() else m.group(1), h)
    return h

def wc(s): return len(s.split())

def chapters_of(items, base_title, target=1200, maxw=1900):
    """items -> chapters [{title, paras, nums}], notes [str]"""
    allnums = {n for _, _, n in items if n is not None}
    items = [(k, t, n if n is not None and any(n + d in allnums for d in (-3, -2, -1, 1, 2, 3)) else None) for k, t, n in items]
    notes = [t for k, t, _ in items if k == "n"]
    body = [x for x in items if x[0] != "n"]
    chs, cur, heads = [], None, []
    def flush_heads():
        nonlocal heads
        hs = [nice_head(x) for x in heads][-2:]; heads = []
        h = " — ".join(hs)
        return h if len(h) <= 90 else hs[-1][:90]
    for k, t, n in body:
        if k == "h":
            heads.append(t); continue
        if heads or cur is None:
            title = flush_heads() if heads else base_title
            cur = {"title": title[:140], "paras": [], "nums": []}; chs.append(cur)
        cur["paras"].append(t); cur["nums"].append(n)
    # tiny chapters: fold into the next
    merged = []
    for c in chs:
        if merged and sum(wc(p) for p in merged[-1]["paras"]) < 150:
            p = merged.pop(); c = {"title": c["title"] if c["title"] != base_title else p["title"], "paras": p["paras"] + c["paras"], "nums": p["nums"] + c["nums"]}
        merged.append(c)
    if len(merged) > 1 and sum(wc(p) for p in merged[-1]["paras"]) < 150:
        last = merged.pop(); merged[-1]["paras"] += last["paras"]; merged[-1]["nums"] += last["nums"]
    chs = merged
    # long chapters: cut at numbered paragraphs (or any paragraph) near the target size
    out = []
    numbered = sum(1 for c in chs for n in c["nums"] if n is not None) >= 5
    for c in chs:
        total = sum(wc(p) for p in c["paras"])
        if total <= maxw: out.append(c); continue
        nparts = max(2, round(total / target)); size = total / nparts
        pieces, acc, start = [], 0, 0
        for i, p in enumerate(c["paras"]):
            if i > start and acc >= size * (len(pieces) + 1) and (not numbered or c["nums"][i] is not None or acc - size * (len(pieces) + 1) > size * 0.6):
                pieces.append((start, i)); start = i
            acc += wc(p)
        pieces.append((start, len(c["paras"])))
        for j, (a, b) in enumerate(pieces):
            ns = [n for n in c["nums"][a:b] if n is not None]
            lab = (f"n. {ns[0]}–{ns[-1]}" if len(ns) > 1 and ns[-1] > ns[0] else f"n. {ns[0]}") if ns else f"pars {j + 1}"
            out.append({"title": f"{c['title']} · {lab}" if len(pieces) > 1 else c["title"], "paras": c["paras"][a:b], "nums": c["nums"][a:b]})
    return out, notes

def group_ids(nums):
    g, out = 0, []
    for n in nums:
        if n is not None: g = n
        out.append(g)
    return out

def attach_english(chs, notes, en_items):
    """sets ch['en'] (paired) or ch['enb'] (after); returns 'num' | 'len' | None"""
    en_body = [(t, n) for k, t, n in en_items if k == "p"]
    en_notes = [t for k, t, _ in en_items if k == "n"]
    la_words = sum(wc(p) for c in chs for p in c["paras"])
    en_words = sum(wc(t) for t, _ in en_body)
    if not en_body or en_words < la_words * 0.35: return None
    la_nums = [n for c in chs for n in c["nums"] if n is not None]
    en_nums = [n for _, n in en_body if n is not None]
    common = set(la_nums) & set(en_nums)
    mode = None
    if len(la_nums) >= 5 and len(common) >= 0.6 * len(set(la_nums)):
        mode = "num"
        en_g = collections.defaultdict(list)
        for (t, _), g in zip(en_body, group_ids([n for _, n in en_body])): en_g[g].append(t)
        done = set(); last_g = 0
        for c in chs:
            gs = []
            for g in group_ids(c["nums"]):
                if gs and gs[-1] == g: continue
                gs.append(g)
            if c["nums"] and c["nums"][0] is None: gs[0] = last_g if chs.index(c) else 0
            last_g = gs[-1] if gs else last_g
            mine = [g for g in gs if g not in done]
            done.update(mine)
            la_g = collections.Counter(group_ids(c["nums"]))
            if c["nums"] and c["nums"][0] is None and chs.index(c): la_g[gs[0]] = la_g.pop(0, 0) + la_g.get(gs[0], 0)
            if mine and all(len(en_g.get(g, [])) == la_g.get(g, 0) for g in mine) and set(mine) == set(gs):
                c["en"] = [t for g in mine for t in en_g.get(g, [])]
                if len(c["en"]) != len(c["paras"]): del c["en"]; c["enb"] = [t for g in mine for t in en_g.get(g, [])]
            else:
                c["enb"] = [t for g in mine for t in en_g.get(g, [])]
    else:
        mode = "len"
        la_cum, s = [], 0
        for c in chs: s += sum(len(p) for p in c["paras"]); la_cum.append(s / max(1, s and la_cum and 1 or 1))
        tot = la_cum[-1] if la_cum else 1
        en_len = [len(t) for t, _ in en_body]; etot = sum(en_len)
        k, acc = 0, 0
        for ci, c in enumerate(chs):
            frac = la_cum[ci] / tot
            start = k
            while k < len(en_body) and (ci == len(chs) - 1 or (acc + en_len[k] / 2) / etot <= frac):
                acc += en_len[k]; k += 1
            c["enb"] = [t for t, _ in en_body[start:k]]
    if notes and en_notes: chs[-1].setdefault("enb_notes", en_notes)
    return mode

def build_doc(parts, base_title):
    """parts: [(la_text, en_text or None, part_label or None)] -> chapters, has_en, mode"""
    allch, modes = [], set()
    for la, en, label in parts:
        items = paras_of(la)
        first_head = next((nice_head(t) for k, t, _ in items if k == "h"), None)
        lab = label or first_head
        chs, notes = chapters_of(items, lab or base_title)
        if not chs: continue
        if en:
            m = attach_english(chs, notes, paras_of(en))
            if m: modes.add(m)
        if notes:
            nc = {"title": "Notae", "paras": notes, "nums": [None] * len(notes)}
            if chs[-1].get("enb_notes"): nc["enb"] = chs[-1].pop("enb_notes")
            chs.append(nc)
        chs[-1].pop("enb_notes", None)
        if label and len(parts) > 1:
            for c in chs:
                if not c["title"].startswith(label): c["title"] = f"{label} · {c['title']}"
        allch += chs
    if len(parts) == 1 and len(allch) > 1:
        pre = {c["title"].split(" · ")[0] for c in allch if c["title"] != "Notae"}
        if len(pre) == 1 and all(" · " in c["title"] for c in allch if c["title"] != "Notae"):
            for c in allch:
                if c["title"] != "Notae": c["title"] = c["title"].split(" · ", 1)[1].replace("pars ", "Pars ")
    for c in allch:
        c["title"] = c["title"].replace(" · pars ", " · Pars ")
        c.pop("nums", None)
        if c.get("enb") == []: c.pop("enb")
    return allch, modes

def roman(n):
    r = ""
    for v, s in ((1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"), (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")):
        while n >= v: r += s; n -= v
    return r

def main():
    files = sorted(glob.glob(os.path.join(SRC, "**", "*.la.md"), recursive=True))
    singles, combined = [], collections.defaultdict(list)
    for f in files:
        rel = os.path.relpath(f, SRC).replace(os.sep, "/")
        if SKIP.search(rel): continue
        stem = os.path.basename(f)[:-6]
        for pat, wid, *_ in COMBINE:
            if re.search(pat, stem): combined[wid].append(f); break
        else: singles.append(f)
    works, seen = [], set()
    def emit(wid, title, author, sec, date, kind, parts, src, ay, path_hint):
        chs, modes = build_doc(parts, title)
        chs = [c for c in chs if c["paras"]]
        if sum(wc(p) for c in chs for p in c["paras"]) < 30: print("  no text (left out):", path_hint); return
        has_en = any(c.get("en") or c.get("enb") for c in chs)
        w = {"id": wid, "title": title, "author": author, "verse": False, "chapters": chs}
        if has_en:
            w["enLabel"] = "English (the Holy See’s translation)"
            if "len" in modes: w["caveat"] = "The English is placed beside the Latin by length, so it may run a paragraph ahead or behind."
        json.dump(w, open(os.path.join(OUT, wid + ".json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        words = sum(len(re.findall(r"[^\W\d_]+", p)) for c in chs for p in c["paras"])
        e = {"id": wid, "title": title, "author": author, "sec": sec, "date": date, "words": words, "chapters": [c["title"] for c in chs], "ay": ay}
        if kind: e["kind"] = kind
        if has_en: e["en"] = 1
        if src: e["src"] = src
        works.append(e)
    def src_of(m):
        for s in m.get("sources") or []:
            if isinstance(s, dict) and s.get("langue") == "la" and s.get("url"): return s["url"]
        return None
    def read(p): return open(p, encoding="utf-8").read() if os.path.exists(p) else None
    def pope_year(rel):
        m = re.search(r"/papes/(\d{4})-", rel); return int(m.group(1)) if m else None

    for f in singles:
        rel = os.path.relpath(f, SRC).replace(os.sep, "/")
        stem_path = f[:-6]; stem = os.path.basename(stem_path)
        m = meta_of(stem_path)
        sec = section(rel)
        date = str(m.get("date") or "")[:10]
        kind = KIND.get(m.get("type") or "", "")
        for pat, k in STEMKIND:
            if not kind and re.search(pat, stem): kind = k
        title = (m.get("titre_original") or m.get("incipit") or stem).strip()
        author = english_author(m.get("auteur"))
        ay = pope_year(rel) or int((date or "0")[:4] or 0)
        cm = re.match(r"^\d{4}_(.+)$", stem)
        if sec == "councils" and cm and cm.group(1) in COUNCILS:
            title, author = COUNCILS[cm.group(1)]; kind = "Council"; ay = int(stem[:4])
        elif sec == "vat2":
            author = "Second Vatican Council"; ay = 1962
        elif sec in ("curia", "liturgy", "law", "catechism"):
            ay = int((date or "0")[:4] or 0)
        title = re.sub(r"\s+", " ", title)
        if title.islower() or title == title.lower(): title = title.capitalize()
        wid = "va-" + re.sub(r"[^a-z0-9]+", "-", re.sub(r"^\d{4}(-\d\d-\d\d)?_", "", stem).lower()).strip("-")[:56]
        wid = re.sub(r"-(enc|encyclique|bulle|const|decl|decret|document|mp|instr|code|missel|pontifical)$", "", wid)
        while wid in seen: wid += "-" + date[:4] if not wid.endswith(date[:4]) else "x"
        seen.add(wid)
        emit(wid, title, author, sec, date, kind, [(read(f), read(stem_path + ".en.md"), None)], src_of(m), ay, rel)

    for pat, wid, title, author in COMBINE:
        fs = combined.get(wid)
        if not fs: continue
        rows = []
        for f in fs:
            stem_path = f[:-6]; stem = os.path.basename(stem_path); m = meta_of(stem_path)
            o = m.get("ouvrage") if isinstance(m.get("ouvrage"), dict) else {}
            order = o.get("partie_index") or 0
            label = None
            if wid == "va-trent":
                s = re.search(r"sess-(\d+)", stem)
                label = f"Sessio {roman(int(s.group(1)))}" if s else ("Bulla indictionis" if "bulla" in stem else "Index sessionum")
                order = int(s.group(1)) if s else (0.5 if "bulla" in stem else 0)
            elif wid == "va-cic1983":
                s = re.search(r"liber-(\d+)", stem)
                label = f"Liber {roman(int(s.group(1)))}" if s else "Index"
                order = int(s.group(1)) if s else 99
            elif wid == "va-cceo":
                s = re.search(r"-(\d)_code$", stem); label = f"Pars {s.group(1)}"; order = int(s.group(1))
            elif wid == "va-ccc":
                pt = o.get("partie_titre") or ""
                s = re.search(r"_p(\d)", stem)
                if s: label = f"Pars {roman(int(s.group(1)))}"
                if "prologo" in stem or pt == "Prologue": label = "Prooemium"
                if not label and pt and not pt.startswith("§"): label = {"Abréviations": "Abbreviationes", "Index général": "Index generalis", "Constitution apostolique Fidei Depositum": "Fidei depositum", "Lettre apostolique Laetamur Magnopere": "Laetamur magnopere"}.get(pt, pt)
            rows.append((order, stem, f, label, m))
        rows.sort(key=lambda r: (r[0], r[1]))
        m0 = rows[0][4]
        parts = [(read(f), read(f[:-6] + ".en.md"), label) for _, _, f, label, _ in rows]
        sec = section(os.path.relpath(rows[0][2], SRC).replace(os.sep, "/"))
        date = str(m0.get("date") or "")[:10]
        seen.add(wid)
        emit(wid, title, author, sec, date, KIND.get(m0.get("type") or "", ""), parts, src_of(m0), int(date[:4] or 0), wid)

    json.dump({"sections": SECTIONS, "source": "Magisterium archive (github.com/realitix/magisterium), texts from vatican.va", "works": works},
              open(os.path.join(OUT, "va-index.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    c = collections.Counter(w["sec"] for w in works)
    print(len(works), "works,", sum(w["words"] for w in works), "Latin words,", sum(1 for w in works if w.get("en")), "with English;", dict(c))

main()
