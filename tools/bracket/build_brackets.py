#!/usr/bin/env python3
"""Answer keys for the sentence-bracketing trainer, from the PROIEL treebank's dependency trees (Vulgate New Testament).

Usage: python3 -I tools/bracket/build_brackets.py <proiel-treebank>/latin-nt.xml data
Writes data/brk/<book>.json: {"code": book, "ch": {"<chapter>": {"<verse>": [clauses, phrases]}}}
  clauses: [[a, b], ...] word indices (0-based, within the verse's Latin as the app splits it, /[A-Za-z]+/) of each
           subordinate clause (finite verb, or participle + finite auxiliary), nested spans allowed;
  phrases: [[a, b, kind], ...] participle and infinitive phrases with their own words: "abl" ablative absolute,
           "aci" accusative (or other subject) + infinitive, "ptc" participial phrase.
Verses the alignment can't match well are left out; the app then falls back on its rules.
"""
import sys, json, re, os, difflib, xml.etree.ElementTree as ET
from collections import defaultdict

XML, DATA = sys.argv[1], sys.argv[2]
BOOKS = {"MATT": "mt", "MARK": "mk", "LUKE": "lk", "JOHN": "jn", "ACTS": "ac", "ROM": "rm", "1COR": "1co", "2COR": "2co",
         "GAL": "ga", "EPH": "eph", "PHIL": "ph", "COL": "col", "1THESS": "1th", "2THESS": "2th", "1TIM": "1tm", "2TIM": "2tm",
         "TIT": "ti", "PHILEM": "phm", "HEB": "hb", "JAS": "jas", "1PET": "1pt", "2PET": "2pt", "1JOHN": "1jn", "2JOHN": "2jn",
         "3JOHN": "3jn", "JUDE": "jd", "REV": "ap"}
def norm(w):
    w = w.lower().replace("j", "i").replace("v", "u").replace("y", "i")
    w = w.replace("h", "").replace("ae", "e").replace("oe", "e")
    return re.sub(r"(.)\1", r"\1", w)

finite = lambda t: t.get("part-of-speech") == "V-" and len(t.get("morphology", "")) > 3 and t.get("morphology")[3] in "ism"
mood = lambda t: (t.get("morphology") or "----")[3] if t.get("part-of-speech") == "V-" else ""

# --- tokens by verse, and clause / phrase spans as sets of token ids, per sentence ---
verse_toks = defaultdict(list)            # (book, ch, v) -> [(tid, form)]
spans = []                                # (kind, [tids], book) ; kind "c" clause or phrase kind
root = ET.parse(XML).getroot()
for sent in root.iter("sentence"):
    toks = list(sent.iter("token"))
    by = {t.get("id"): t for t in toks}
    kids = defaultdict(list)
    for t in toks:
        if t.get("head-id"): kids[t.get("head-id")].append(t)
    for t in toks:
        if t.get("form"):
            cp = t.get("citation-part", "")
            m = re.match(r"(\S+) (\d+)\.(\d+)", cp)
            if m and m.group(1) in BOOKS: verse_toks[(BOOKS[m.group(1)], int(m.group(2)), int(m.group(3)))].append((t.get("id"), t.get("form")))
    def sub(t):
        out, st = [], [t]
        while st:
            x = st.pop(); out.append(x); st.extend(kids[x.get("id")])
        return out
    def words(ts): return [x for x in ts if x.get("form")]
    def is_clause_verb(t):
        if t.get("part-of-speech") != "V-": return False
        if finite(t): return t.get("relation") != "aux"
        return any(k.get("relation") == "aux" and finite(k) for k in kids[t.get("id")])   # factum est
    def up(t):                     # nearest ancestor that isn't a coordinator
        h = by.get(t.get("head-id"))
        while h is not None and (h.get("part-of-speech") == "C-" or h.get("empty-token-sort") == "C"):
            h = by.get(h.get("head-id"))
        return h
    def has_clause_verb(t):        # a subordinator governing a verb (through coordinators)
        st = list(kids[t.get("id")])
        while st:
            x = st.pop()
            if is_clause_verb(x): return True
            if x.get("part-of-speech") == "C-" or x.get("empty-token-sort") in ("C", "V"): st.extend(kids[x.get("id")])
        return False
    for t in toks:
        pos, rel = t.get("part-of-speech"), t.get("relation")
        if pos == "G-" and has_clause_verb(t):
            spans.append(("c", [x.get("id") for x in words(sub(t))]))
        elif is_clause_verb(t) or (t.get("empty-token-sort") == "V" and rel not in ("pred", "parpred", "voc", None)):
            a = up(t)
            if a is not None and a.get("part-of-speech") == "G-": continue          # counted with its conjunction
            if rel in ("pred", "parpred", "voc", None):
                continue                                                             # main clause
            ws = words(sub(t))
            if t.get("empty-token-sort") == "V" and not ws: continue
            spans.append(("c", [x.get("id") for x in ws]))
        elif pos == "V-" and mood(t) in "pn" and rel not in ("aux",) and not any(k.get("relation") == "aux" and finite(k) for k in kids[t.get("id")]):
            ws = words(sub(t))
            if len(ws) < 2: continue
            subj = [k for k in kids[t.get("id")] if k.get("relation") == "sub"]
            mo = t.get("morphology")
            if mood(t) == "p" and subj and len(mo) > 6 and mo[6] == "b": kind = "abl"
            elif mood(t) == "n" and subj: kind = "aci"
            elif mood(t) == "p" and rel in ("xadv", "adv", "atr", "apos", "xobj") and len(ws) >= 3: kind = "ptc"
            else: continue
            spans.append((kind, [x.get("id") for x in ws]))

# --- align each verse's PROIEL tokens with the app's words ---
out = defaultdict(lambda: defaultdict(dict))
stats = {"verses": 0, "kept": 0, "clauses": 0, "phrases": 0}
tid_at = {}                                  # token id -> (book, ch, v, word index)
for code in sorted(set(b for b in BOOKS.values())):
    fn = os.path.join(DATA, code + ".json")
    if not os.path.exists(fn): continue
    book = json.load(open(fn))
    for ci, ch in enumerate(book["ch"], 1):
        for v in ch:
            vn = v[0]; ws = re.findall(r"[A-Za-z]+", v[1])
            pt = verse_toks.get((code, ci, vn))
            stats["verses"] += 1
            if not pt: continue
            a = [norm(w) for w in ws]; b = [norm(f) for _, f in pt]
            sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
            got = 0
            for op, i1, i2, j1, j2 in sm.get_opcodes():
                if op == "equal" or (op == "replace" and i2 - i1 == j2 - j1):
                    for k in range(i2 - i1):
                        if op == "equal" or difflib.SequenceMatcher(None, a[i1 + k], b[j1 + k]).ratio() >= 0.6:
                            tid_at[pt[j1 + k][0]] = (code, ci, vn, i1 + k); got += 1
            if got < 0.85 * max(len(ws), len(pt)): continue
            stats["kept"] += 1
            out[code][str(ci)][str(vn)] = [[], []]
CONJ = {"et", "atque", "ac", "que", "sed", "autem", "enim", "vero", "uero", "aut", "vel", "uel", "nam", "igitur", "ergo", "itaque", "tamen"}
for kind, tids in spans:
    pos = [tid_at[t] for t in tids if t in tid_at]
    if not pos: continue
    # a span may run into the next verse: keep the part in the verse where it starts
    key = min(pos, key=lambda p: (p[2], p[3]))[:3]
    idx = sorted(p[3] for p in pos if p[:3] == key)
    code, ci, vn = key
    slot = out.get(code, {}).get(str(ci), {}).get(str(vn))
    if slot is None or len(idx) < (1 if kind == "c" else 2): continue
    s, e = idx[0], idx[-1]
    if kind == "c": slot[0].append([s, e]); stats["clauses"] += 1
    else: slot[1].append([s, e, kind]); stats["phrases"] += 1
# tidy: drop duplicates and spans that cross another (keep the longer), sort
def tidy(sp):
    sp = sorted({tuple(x) for x in sp}, key=lambda x: (x[0], -x[1]))
    keep = []
    for x in sorted(sp, key=lambda x: -(x[1] - x[0])):
        if all(not (y[0] < x[0] <= y[1] < x[1] or x[0] < y[0] <= x[1] < y[1]) for y in keep): keep.append(x)
    return sorted([list(x) for x in keep], key=lambda x: (x[0], -x[1]))
os.makedirs(os.path.join(DATA, "brk"), exist_ok=True)
for code, chs in out.items():
    for c in chs.values():
        for vn, (cl, ph) in c.items():
            cl = tidy(cl)
            ph = [x for x in tidy(ph) if all(not (y[0] < x[0] <= y[1] < x[1] or x[0] < y[0] <= x[1] < y[1]) for y in cl)]
            c[vn] = [cl, ph]
    json.dump({"code": code, "ch": chs}, open(os.path.join(DATA, "brk", code + ".json"), "w"), separators=(",", ":"))
print(stats)
