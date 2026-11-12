"""St Thomas's other works for the Library, Latin with the English where there is one, from github.com/antstratfordlol-bit/corpus-thomisticum
(Corpus Thomisticum / Kenny's edition; English mostly the Dominican and other public-domain translations): the Summa contra Gentiles,
the disputed questions, the Sentences, the Scripture and Aristotle commentaries, the opuscula, and Cajetan on the Summa.
Each anchored section ({#…}) becomes a chapter; the English section with the same anchor is shown beneath it.
Usage: python3 -I tools/library/build_opera.py <corpus-thomisticum> <out dir>
Writes <out dir>/ct-*.json and <out dir>/extra-opera.json (index entries; "remote": the online page reads them from the phone app's site)."""
import sys, os, re, json, glob
CT, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
SKIP = re.compile(r"^(Summa\.|Catena-aurea|De-ente-et-essentia|In-orationem-dominicam)")
EN_WORDS = set("the of and to is that for by with which as be are this was he his it from not but they have has an or their what when who would will".split())
ENGLISH = re.compile(r"(\b(the|of|and|to|is|by|translated|contents|commentary|text|on)\b|^\s*(book|chapter|lecture|article|question|part|lesson|section|reply)\b|^\s*[\dIVXLC]+\.?\s*$)", re.I)
GREEK = re.compile(r"[Ͱ-Ͽἀ-῿]")
HEAD = re.compile(r"^(#{1,6})\s+(.*?)\s*(?:\{#([^}]+)\})?\s*$")
LA = [(r"^ARTICLE\b", "Articulus"), (r"^LECTURE\b", "Lectio"), (r"^CHAPTER\b", "Caput"), (r"^BOOK\b", "Liber"), (r"^QUESTION\b", "Quaestio"), (r"^PART\b", "Pars")]
def latin_head(t):
    t = t.replace("*", "").strip()
    for a, b in LA: t = re.sub(a, b, t, flags=re.I)
    return t[:1].upper() + t[1:].lower() if t.isupper() and len(t) > 3 and not re.fullmatch(r"[IVXLC]+", t) else t
def split(path):
    t = open(path, encoding="utf-8").read()
    meta = {}
    if t.startswith("---"):
        fm, t = t[3:].split("\n---\n", 1)
        for l in fm.split("\n"):
            m = re.match(r"^([\w-]+):\s*(.*)$", l)
            if m: meta[m.group(1)] = m.group(2).strip().strip('"')
    secs, cur, stack = [], None, []
    for line in t.split("\n"):
        m = HEAD.match(line)
        if m:
            lvl = len(m.group(1))
            if m.group(3):
                # a division with no text of its own (Quaestio 1, before its Prooemium at the same level) stays the parent
                keep = [x for x in stack if x[0] < lvl]
                if stack and stack[-1][0] == lvl and cur is not None and not "".join(cur["paras"]).strip() and cur["a"] == stack[-1][2]:
                    keep.append((lvl - 0.5, stack[-1][1], stack[-1][2]))
                stack = keep
                parent = " · ".join(x[1] for x in stack)
                title = latin_head(m.group(2))
                stack.append((lvl, title, m.group(3)))
                cur = {"a": m.group(3), "base": title, "title": (parent + " · " + title) if parent else title, "paras": []}; secs.append(cur)
            elif cur is not None and lvl > 1 and not ENGLISH.search(m.group(2)):
                # an unanchored Latin heading (an article's question, "Et primo quaeritur…") starts a part of its division
                parent = " · ".join(x[1] for x in stack if x[1] != "Prooemium")
                t2 = latin_head(m.group(2))
                if len(t2) > 70: t2 = t2[:68].rsplit(" ", 1)[0] + "…"
                cur = {"a": cur["a"] + "#" + str(len(secs)), "title": (parent + " · " + t2) if parent else t2, "paras": []}; secs.append(cur)
            continue   # other headings without an anchor are the source's English captions
        if cur is None:   # a short work with no divisions: all of it is one chapter
            cur = {"a": "_all", "title": latin_head(meta.get("title", "Textus")), "paras": []}; secs.append(cur)
        cur["paras"].append(line)
    # name a division by its anchor's ancestors when they exist (qd-ver.1.5 is Quaestio 1 · Articulus V)
    base = {x["a"]: x["base"] for x in secs if "base" in x}
    for x in secs:
        if "base" not in x: continue
        parts = x["a"].split(".")
        chain = [base[".".join(parts[:k])] for k in range(2, len(parts)) if ".".join(parts[:k]) in base]
        if chain: x["title"] = " · ".join(chain + [x["base"]])
    for s in secs:
        body = re.sub(r'<a id="[^"]*"></a>', "", "\n".join(s["paras"]))
        ps = [re.sub(r"\s+", " ", p).strip() for p in body.split("\n\n")]
        ps = [re.sub(r"^\*\*\[\d+\]\*\*\s*", "", p) for p in ps]   # Corpus Thomisticum paragraph numbers
        ps = [re.sub(r"\[L\d+[^\]]*\]\s*", "", p).replace("*", "").strip() for p in ps]
        s["paras"] = [p for p in ps if p and not GREEK.search(p) and not p.startswith("<")]
    return meta, secs
def english(p):
    w = re.findall(r"[A-Za-z]+", p.lower())
    if re.match(r"^(Chapter|Part|Book|Lecture|Question|Article|Section|Commentary)\b", p) or re.search(r"\btranslated\b|\bO\.P\.|\bS\.J\.", p): return True
    return len(w) >= 3 and sum(x in EN_WORDS for x in w) / len(w) > 0.12
GROUPS = [("Summa-contra-Gentiles", "Summa contra Gentiles"), ("Compendium", "Compendium theologiae"), ("QD-", "Quaestiones disputatae"), ("Quaestiones-quodlibetales", "Quaestiones disputatae"),
          ("Scriptum-super-Sententiis", "Scriptum super Sententiis"), ("Super-I|Super-II|Super-Ro|Super-Gal|Super-Eph|Super-Phil|Super-Col|Super-Tit|Super-Heb|Super-Io|Super-Mat|Expositio-super-Iob|Super-Isa|Super-Iere|Super-Thr|In-Psalmos", "Scripture"),
          ("In-Symbolum|In-salutationem", "Opuscula"), ("In-|Super-Boe|Super-De-div|Super-Librum", "Aristotle and others"), ("Cajetan", "Cajetan on the Summa")]
def kind(f):
    for pat, g in GROUPS:
        if re.match(pat, f): return g
    return "Opuscula"
ORDER = ["Summa contra Gentiles", "Compendium theologiae", "Quaestiones disputatae", "Scriptum super Sententiis", "Scripture", "Aristotle and others", "Opuscula", "Cajetan on the Summa"]
works = []
for f in sorted(glob.glob(os.path.join(CT, "*.la.md"))):
    base = os.path.basename(f)[:-6]
    if SKIP.match(base): continue
    meta, la = split(f)
    for x in la: x["paras"] = [p for p in x["paras"] if not english(p)]
    enp = os.path.join(CT, base + ".en.md")
    en = {s["a"]: s["paras"] for s in split(enp)[1]} if os.path.exists(enp) else {}
    ch = []
    for s in la:
        if not s["paras"]: continue
        e = en.get(s["a"], [])
        # long sections in parts of about 2,500 words; the English cut in proportion
        tot = sum(len(p.split()) for p in s["paras"])
        if tot <= 3300:
            ch.append({"title": s["title"], "paras": s["paras"], **({"enb": e} if e else {})}); continue
        cuts, n = [0], 0
        for j, p in enumerate(s["paras"]):
            if n >= 2500: cuts.append(j); n = 0
            n += len(p.split())
        cuts.append(len(s["paras"]))
        for k in range(len(cuts) - 1):
            a, b = cuts[k], cuts[k + 1]
            ea, eb = round(a / len(s["paras"]) * len(e)), round(b / len(s["paras"]) * len(e))
            ch.append({"title": f'{s["title"]} ({k + 1})', "paras": s["paras"][a:b], **({"enb": e[ea:eb]} if e[ea:eb] else {})})
    if not ch: print("EMPTY", base); continue
    wid = "ct-" + re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
    title = re.sub(r"\s+—\s+", " ", meta.get("title", base.replace("-", " "))).replace("*", "")
    author = "Cajetan" if base.startswith("Cajetan") else "St Thomas Aquinas"
    k = kind(base)
    auth = meta.get("authenticity", "")
    note = k + (" · " + {"reportatio": "taken down by a student (reportatio)", "doubtful": "authorship doubtful", "spurious": "not by St Thomas"}.get(auth, "") if auth in ("reportatio", "doubtful", "spurious") else "") + (" · with English" if any("enb" in c for c in ch) else "")
    json.dump({"id": wid, "title": title, "author": author, "verse": False, "chapters": ch}, open(os.path.join(OUT, wid + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
    words = sum(len(re.findall(r"[^\W\d_]+", p)) for c in ch for p in c["paras"])
    works.append({"id": wid, "group": "opera", "title": title, "author": author, "note": note, "words": words, "chapters": [c["title"] for c in ch], "remote": True,
                  **({"en": "English (the public-domain translation in the Corpus Thomisticum collection)"} if any("enb" in c for c in ch) else {}), "_k": ORDER.index(k)})
works.sort(key=lambda w: (w.pop("_k"), w["title"]))
json.dump(works, open(os.path.join(OUT, "extra-opera.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print(len(works), "works,", sum(w["words"] for w in works), "Latin words,", sum(len(w["chapters"]) for w in works), "chapters")
for w in works[:200]: print(" ", w["id"], "|", w["title"][:50], "|", len(w["chapters"]), "|", w["note"])
