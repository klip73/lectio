"""More Library works from sources other than The Latin Library, written ready-made for build_library.py to shelve:
  - Catena Aurea on the four Gospels (St Thomas), Latin and English, one lectio per chapter, with the Vulgate text of
    the verses at the head of each lectio (the source heads them in Greek) and a map Gospel verse -> lectio;
  - Rituale Romanum (1952 typical edition), Latin, one rite per chapter, rubrics marked;
  - Catechismus Romanus (Council of Trent, 1566), Latin from a scanned edition with misreadings corrected where the
    corrected word is certain, and an English translation per chapter (machine translation, labelled so);
  - Codex Iuris Canonici 1917, Latin, by titulus, with a map canon -> chapter for the canon lookup.
Usage: python3 -I tools/library/build_extra.py <corpus-thomisticum> <magisterium> <rituale dir> <cic1917.txt> data <genforms.json> <out dir> <tll>
  corpus-thomisticum: github.com/antstratfordlol-bit/corpus-thomisticum (Catena-aurea.*.md)
  magisterium:        github.com/realitix/magisterium (A-pre-vatican-ii/catechismes/1566-romain-trente)
  rituale dir:        the rituale/ folder of github.com/Noslenor/my_website (texts/, shared/, contents.txt)
  cic1917.txt:        pdftotext -layout of the 1917 Code PDF kept in magisterium (A-pre-vatican-ii/droit-canonique/1917-cic-pio-benedictino)
Writes <out dir>/<id>.json (the works, in the Library's format) and <out dir>/extra.json (their index entries)."""
import sys, os, re, json, glob, unicodedata
CT, MAG, RIT, CIC, DATA, GENF, OUT = sys.argv[1:8]
os.makedirs(OUT, exist_ok=True)

def norm(x):
    x = unicodedata.normalize("NFD", x.lower()).replace("æ", "ae").replace("œ", "oe")
    return "".join(c for c in x if not unicodedata.combining(c)).replace("j", "i").replace("v", "u")

# ---------- words known to the app: for correcting misread words in the scanned Catechism ----------
# A word is known if the app's morphology makes it or it occurs in The Latin Library (argument 8: the CLTK collection);
# a misread word is replaced only by its likeliest known reading, ranked by how often each occurs there.
import collections
FREQ = collections.Counter()
if len(sys.argv) > 8:
    for f in glob.glob(os.path.join(sys.argv[8], "**", "*.txt"), recursive=True):
        FREQ.update(norm(x) for x in re.findall(r"[A-Za-zÀ-ÿ]+", open(f, encoding="utf-8", errors="replace").read()))
KNOWN = {norm(k) for k in json.load(open(GENF))} | set(FREQ)
# Misreadings typical of this scan (letter -> what it was read as), tried one or two at a time
CONF = [("e", "c"), ("i", "l"), ("u", "n"), ("n", "u"), ("m", "rn"), ("ri", "n"), ("i", "t"), ("t", "i"), ("e", "o"), ("a", "e"),
        ("s", "f"), ("f", "s"), ("h", "b"), ("o", "c"), ("u", "ii"), ("li", "h"), ("d", "cl"), ("in", "m"), ("ae", "e"), ("c", "e"), ("q", "g"), ("m", "ra"), ("m", "ni"), ("fl", "fi"), ("um", "nm")]
def variants(w):
    out = set()
    for a, b in CONF:   # b was printed where a was meant
        i = w.find(b)
        while i >= 0:
            out.add(w[:i] + a + w[i + len(b):]); i = w.find(b, i + 1)
    return out
fixed = {}
def fix_word(w):
    if len(w) < 3 or norm(w) in KNOWN or not w.isalpha(): return w
    if w in fixed: return fixed[w]
    cap = w[:1].isupper()
    lw = w.lower()
    one = [v for v in variants(lw) if norm(v) in KNOWN]
    if not one:
        two = {v2 for v in variants(lw) for v2 in variants(v) if norm(v2) in KNOWN}
        one = sorted(two)
    r = w
    if one:
        best = sorted(one, key=lambda v: -FREQ[norm(v)])
        f1, f2 = FREQ[norm(best[0])], (FREQ[norm(best[1])] if len(best) > 1 and norm(best[1]) != norm(best[0]) else 0)
        if (f1 >= 3 and f1 >= 4 * f2) or (len({norm(v) for v in one}) == 1 and not FREQ):
            r = best[0]; r = r.upper() if w.isupper() else r[:1].upper() + r[1:] if cap else r
    fixed[w] = r
    return r
def fix_text(t):
    t = t.replace("~", "").replace("  ", " ")
    return re.sub(r"[A-Za-zÀ-ÿ]+", lambda m: fix_word(m.group(0)), t).strip()

works = []
def write(w, ch, **meta):
    json.dump({"id": w["id"], "title": w["title"], "author": w["author"], "verse": False, "chapters": ch, **meta},
              open(os.path.join(OUT, w["id"] + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
    works.append({**w, "chapters": [c["title"] for c in ch], "words": sum(len(re.findall(r"[^\W\d_]+", p)) for c in ch for p in c["paras"])})
    print(f'{w["id"]}: {len(ch)} chapters, {works[-1]["words"]} words; {ch[0]["title"]!r}: {ch[0]["paras"][0][:70]!r}')

# ---------- Catena Aurea ----------
GOSPELS = [("Matt", "mt", "Matthaeum", "Matthew"), ("Mark", "mk", "Marcum", "Mark"), ("Luke", "lk", "Lucam", "Luke"), ("John", "jn", "Ioannem", "John")]
def md_sections(path):
    t = open(path, encoding="utf-8").read()
    if t.startswith("---"): t = t.split("\n---\n", 1)[1]
    parts = re.split(r"(?m)^## (.*?) \{#(catena\.[^}]+)\}\s*$", t)
    return {parts[i + 1]: (parts[i], [p.strip() for p in re.split(r"\n\s*\n", parts[i + 2]) if p.strip()]) for i in range(1, len(parts), 3)}
def unstar(p): return re.sub(r"\*\*([^*]+)\*\*\s*[:;]?", lambda m: m.group(1).strip().rstrip(":;") + ":", p).replace("**", "").strip()
GREEK = re.compile(r"[Ͱ-Ͽἀ-῿]")
catmap = {}
for B, code, la_name, en_name in GOSPELS:
    la, en = md_sections(os.path.join(CT, f"Catena-aurea.{B}.la.md")), md_sections(os.path.join(CT, f"Catena-aurea.{B}.en.md"))
    nt = json.load(open(os.path.join(DATA, code + ".json")))["ch"]
    ch, cmap = [], []
    for key, (head, lb) in la.items():
        k = key.split(".")
        eb = [p for p in (en.get(key, ("", []))[1]) if not re.fullmatch(r"\*\*Lectio \d+\*\*", p)]
        if len(k) == 3 and k[2] in ("dedicatio", "prooemium"):
            title = "Epistola dedicatoria" if k[2] == "dedicatio" else "Prooemium"
            paras = [unstar(p) for p in lb if not GREEK.search(p)]
            ch.append({"title": title, "paras": paras, **({"en": [unstar(p) for p in eb]} if len(eb) == len(paras) else {})})
            continue
        if len(k) != 4: continue   # chapter headings (Caput N) carry no text of their own
        c, lec = int(re.match(r"\d+", k[2]).group(0)), int(re.match(r"\d+", k[3]).group(0))
        # verses: numbered in the English lemma ("6-8. David…", "1. And seeing…") or the Greek one ("1 ἰδὼν…")
        lemma_en = eb[0] if eb else ""
        nums = [int(x) for a, b in re.findall(r"(?:^|\s)(\d+)(?:-(\d+))?\.\s", lemma_en) for x in (a, b) if x]
        if not nums and lb and GREEK.search(lb[0]): nums = [int(x) for x in re.findall(r"(?:^|\s)(\d+)\s", lb[0])]
        vs = nt[c - 1] if c - 1 < len(nt) else []
        if nums:
            v1, v2 = min(nums), max(nums)
            vul = [f"{v[0]} {v[1]}" for v in vs if v1 <= v[0] <= v2]
        else:
            v1 = v2 = None; vul = []
        body_la = [unstar(p) for p in lb if not GREEK.search(p)]
        body_en = [unstar(p) for p in eb[1:]] if eb and re.match(r"^\d", eb[0]) else [unstar(p) for p in eb]
        paras = ([" ".join(vul)] if vul else []) + body_la
        ens = ([lemma_en] if vul else []) + body_en
        ref = f" ({c}, {v1}–{v2})" if v1 and v2 != v1 else f" ({c}, {v1})" if v1 else ""
        item = {"title": f"Caput {c}, lectio {lec}{ref}", "paras": paras}
        if len(ens) == len(paras): item["en"] = ens
        if vul: item["head"] = 1   # the first paragraph is the Gospel text
        ch.append(item)
        if v1: cmap.append([c, v1, v2, len(ch) - 1])
    catmap[code] = cmap
    write({"id": "catena-" + code, "group": "thomas", "title": f"Catena Aurea in {la_name}", "author": "St Thomas Aquinas",
           "note": f"The Fathers on the Gospel of St {en_name}, verse by verse, gathered by St Thomas. Latin with the English of the Oxford translation (1841–45, ed. Newman).",
           "en": "English (Oxford translation, 1841–45)"}, ch)
json.dump(catmap, open(os.path.join(OUT, "catena-map.json"), "w"), separators=(",", ":"))

# ---------- Rituale Romanum ----------
def rit_lines(path, shared):
    out = []
    for l in open(path, encoding="utf-8"):
        l = l.rstrip("\n")
        if not l.strip() or l.startswith("//"): continue
        if l.startswith("@"):
            sp = os.path.join(shared, l[1:].strip() + ".txt")
            if os.path.exists(sp): out += rit_lines(sp, shared)
            continue
        out.append(l)
    return out
def rit_clean(s): return re.sub(r"[*_]([^*_]+)[*_]", r"\1", s).strip()
order = [re.sub(r"\s*//.*$", "", l).strip() for l in open(os.path.join(RIT, "contents.txt"), encoding="utf-8") if l.strip() and not l.startswith("//")]
rites = []
for f in [x for x in order if x]:
    cur = None
    for l in rit_lines(os.path.join(RIT, "texts", f), os.path.join(RIT, "shared")):
        if l.startswith("#"):
            p = [x.strip() for x in l[1:].split("|")]
            cur = {"title": p[1], "cat": p[3] if len(p) > 3 else "", "ref": p[4] if len(p) > 4 else "", "paras": [], "r": []}
            rites.append(cur); continue
        m = re.match(r"^([rthvxn]):\s?(.*)$", l)
        if not m or cur is None or m.group(1) == "n": continue
        latin = m.group(2).split("||")[0].strip()
        if not latin: continue
        kind = m.group(1)
        txt = rit_clean(latin)
        if kind == "v": txt = "℣. " + txt
        if kind == "x": txt = "℟. " + txt
        if kind in ("r", "h"): cur["r"].append(len(cur["paras"]))
        cur["paras"].append(txt)
cats = {"Sacraments": "Sacramenta", "Blessings": "Benedictiones"}
rch = [{"title": f'{x["title"]}{" · " + x["ref"] if x["ref"] else ""}', "paras": x["paras"], "r": x["r"]} for x in rites if x["paras"]]
write({"id": "rituale", "group": "rites", "title": "Rituale Romanum", "author": "1952 typical edition",
       "note": "The priest's book of the sacraments, blessings, processions and exorcism, rite by rite. Latin; rubrics in red."}, rch)

# ---------- Catechismus Romanus ----------
CR = os.path.join(MAG, "magisterium/A-pre-vatican-ii/catechismes/1566-romain-trente")
CAP = re.compile(r"^(C\s?A\s?P\s?U\s?T|GAPUT)\b")
SUB_LA = re.compile(r"^[IVXLCHnmlU/1]{1,6}\.?\s+\S")
SUB_EN = re.compile(r"^[IVXLC]+\.\s")
def paras_of(path): return [p.strip().replace("\n", " ") for p in re.split(r"\n\s*\n", open(path, encoding="utf-8").read()) if p.strip()]
PARS = [("00-praefatio", "Praefatio"), ("01-pars-prima", "Pars I: De Symbolo"), ("02-pars-secunda", "Pars II: De Sacramentis"),
        ("03-pars-tertia", "Pars III: De Decalogo"), ("04-pars-quarta", "Pars IV: De Oratione Dominica"), ("05-praxis-concionatoria", "Praxis concionatoria")]
cch = []
def roman(n): return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"][n]
for slug, pname in PARS:
    lp = paras_of(os.path.join(CR, f"1566_catechismus-romanus_{slug}.la.md"))
    ep_path = os.path.join(CR, f"1566_catechismus-romanus_{slug}.en.md")
    ep = paras_of(ep_path) if os.path.exists(ep_path) else []
    def chapters(ps, cap):
        out, cur = [], None
        for p in ps:
            if cap.match(p): cur = {"head": p, "paras": []}; out.append(cur); continue
            if cur is None:
                if re.match(r"^(PARS|PART|PRAEFATIO|PREFACE)\b", p, re.I) and len(p) < 60: continue
                cur = {"head": "", "paras": []}; out.append(cur)
            cur["paras"].append(p)
        return out
    lc, ec = chapters(lp, CAP), chapters(ep, re.compile(r"^CHAPTER\b"))
    pair = len(lc) == len(ec)
    for i, c in enumerate(lc):
        head = re.sub(r"^(C\s?A\s?P\s?U\s?T|GAPUT)\s+\S+\.?\s*", "", c["head"]).strip()
        num = f"Caput {roman(i + 1)}" if c["head"] else ""
        base = " · ".join(x for x in [pname, num + (". " + fix_text(head) if head else "")] if x)
        la = [fix_text(p) for p in c["paras"]]
        en = ec[i]["paras"] if pair and i < len(ec) else []
        # cut long chapters at their numbered questions, about 2,000 words a part; English cut at the same question, or in proportion
        subs_la = [j for j, p in enumerate(la) if SUB_LA.match(p) and len(p) < 220]
        subs_en = [j for j, p in enumerate(en) if SUB_EN.match(p) and len(p) < 260]
        cuts, n = [0], 0
        for j, p in enumerate(la):
            if j in subs_la and n >= 2000: cuts.append(j); n = 0
            n += len(p.split())
        cuts.append(len(la))
        for k in range(len(cuts) - 1):
            a, b = cuts[k], cuts[k + 1]
            if len(subs_la) == len(subs_en) and en:
                ea = 0 if a == 0 else subs_en[subs_la.index(a)]
                eb = len(en) if b == len(la) else subs_en[subs_la.index(b)]
            else:
                ea, eb = round(a / max(1, len(la)) * len(en)), round(b / max(1, len(la)) * len(en))
            item = {"title": base + (f" ({k + 1})" if len(cuts) > 2 else ""), "paras": la[a:b]}
            if en: item["enb"] = en[ea:eb]
            cch.append(item)
write({"id": "catechismus", "group": "rites", "title": "Catechismus Romanus", "author": "Council of Trent, 1566",
       "note": "The Catechism of the Council of Trent, written for parish priests: the Creed, the Sacraments, the Commandments, the Our Father.",
       "en": "English (a recent machine translation: a help, not an authority)",
       "caveat": "Latin read by machine from a scanned edition; misread words are corrected where only one word fits, but a few misprints remain."}, cch)
print("  catechism: corrected", sum(1 for k, v in fixed.items() if k != v), "distinct misread words")

# ---------- Codex Iuris Canonici 1917 ----------
t = open(CIC, encoding="utf-8").read()
lines = []
for l in t.split("\n"):
    s = l.strip()
    if not s or re.fullmatch(r"\d{1,4}", s) or s.startswith("\f") or s == "CODEX IURIS CANONICI (1917)": continue
    lines.append(s)
txt = "\n".join(lines)
txt = re.sub(r"Can\.\s*\n\s*(\d)", r"Can. \1", txt)
txt = re.sub(r"Can\.(?=[0-9lOI])", "Can. ", txt)
txt = re.sub(r"Can\. ([0-9lOI]+)\.", lambda m: "Can. " + m.group(1).replace("l", "1").replace("O", "0").replace("I", "1") + ".", txt)
txt = re.sub(r"(?<!\n)\s*Can\. (\d+)\. ", r"\nCan. \1. ", txt)   # a canon that begins mid-line
txt = re.sub(r"\bpar\. ([0-9lI]+)\.", lambda m: "§ " + m.group(1).replace("l", "1").replace("I", "1") + ".", txt)
txt = re.sub(r"\b([0-9l]{1,2})\.deg\.", lambda m: m.group(1).replace("l", "1") + "°", txt)
HEADS = re.compile(r"^(LIBER|PARS|SECTIO|TITULUS|CAPUT|ART\.|ARTICULUS)\b")
def tc(x):
    if not x.isupper(): return x
    return " ".join(w if re.fullmatch(r"[IVXLC]+\.?", w) else w.lower() if w.lower() in ("de", "et", "in", "ad", "a", "ab", "e", "ex", "cum", "pro", "sub", "super") else w.capitalize() for w in x.split())
lns = txt.split("\n")
cch2, cur, where, stamp = [], None, {"LIBER": "", "PARS": ""}, None
i = 0
while i < len(lns):
    s = lns[i]
    if HEADS.match(s) and len(s) < 60:
        nxt = lns[i + 1] if i + 1 < len(lns) else ""
        name = nxt if nxt and not nxt.startswith("Can.") and not HEADS.match(nxt) and len(nxt) < 140 else ""
        hd = tc(s.rstrip(".")) + (". " + tc(name.rstrip(".")) if name else "")
        kw = s.split()[0].rstrip(".")
        if kw in ("LIBER", "PARS"):
            where[kw] = hd
            if kw == "LIBER": where["PARS"] = ""
        elif kw in ("TITULUS", "SECTIO"):
            cur = {"title": " · ".join(x for x in [where["LIBER"], where["PARS"], hd] if x), "paras": []}; cch2.append(cur); stamp = dict(where)
        elif cur is not None:
            cur.setdefault("r", []).append(len(cur["paras"])); cur["paras"].append(hd)
        i += 2 if name else 1
        continue
    if cur is None or stamp != where:   # canons directly under a book or part
        cur = {"title": " · ".join(x for x in [where["LIBER"], where["PARS"]] if x) or "Codex Iuris Canonici", "paras": []}; cch2.append(cur); stamp = dict(where)
    if re.match(r"^Can\. \d+\. ", s) or not cur["paras"]:
        cur["paras"].append(s)
    else:
        last = cur["paras"][-1]
        cur["paras"][-1] = last[:-1] + s if last.endswith("-") else last + " " + s
    i += 1
cch2 = [c for c in cch2 if c["paras"]]
canons = {}
for ci, c in enumerate(cch2):
    for p in c["paras"]:
        m = re.match(r"^Can\. (\d+)\. ", p)
        if m: canons.setdefault(int(m.group(1)), ci)
print("  1917 code: canons found", len(canons), "of 2414; missing e.g.", [n for n in range(1, 2415) if n not in canons][:15])
write({"id": "cic1917", "group": "canon", "title": "Codex Iuris Canonici (1917)", "author": "Pius X and Benedict XV, 1917",
       "note": "The Pio-Benedictine Code, the Church's law from 1918 to 1983, in five books, by titulus. Look up any canon above."},
      cch2, canons=canons)
json.dump([{k: v for k, v in w.items() if k != "chapters_full"} for w in works], open(os.path.join(OUT, "extra.json"), "w"), ensure_ascii=False, separators=(",", ":"))
