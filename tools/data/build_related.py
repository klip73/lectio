"""Related words for the app's lexicon: Latin words of like and opposite meaning, and words in other languages that come from
(or share a root with) each Latin word.

Usage: python3 -I tools/data/build_related.py <omw-data checkout> <english-wordnet checkout>
Writes data/rel/<letter>.json: { lemma: { "s": [...], "a": [...], "c": { "en": [...], "it": [...], ... }, "g": "..." } }

How:
- Each Latin word's English meanings come from its gloss (Whitaker's Words, in data/lexicon.json). Its senses are the
  Princeton WordNet 3.0 synsets of those English words (first senses only, same part of speech), plus the synsets the
  Latin Wiktionary-to-WordNet table (Open Multilingual Wordnet, "wikt", CC BY-SA) gives it directly.
- Like meaning ("s"): other Latin words of the same part of speech whose main meaning shares a synset, or whose first
  gloss is the same English word. Ranked by how much they share; at most 6.
- Opposite ("a"): English antonyms (Open English WordNet) of the word's main meaning, turned back into Latin words whose
  main meaning is that antonym. At most 4.
- Other languages ("c"): the English, Italian, Spanish, French, Portuguese and Romanian words of the same synsets
  (Open Multilingual Wordnet: PWN, MultiWordNet/IWN, MCR, WOLF, OpenWN-PT, RoWN) that look like the Latin word,
  i.e. are very probably descended from it or borrowed from it. Look-alikes only: a translation that doesn't share
  the root is left out.
- Greek and other cognates ("g"): the etymology at the head of the Lewis & Short entry (data/ls), when it names one.
"""
import sys, os, re, json, glob, unicodedata
from difflib import SequenceMatcher
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OMW, EWN = sys.argv[1], sys.argv[2]
lex = json.load(open(os.path.join(ROOT, "data", "lexicon.json")))

def plain(s):
    s = unicodedata.normalize("NFD", s or "").lower()
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.replace("æ", "ae").replace("œ", "oe")
def latnorm(s): return re.sub(r"[^a-z]", "", plain(s).replace("j", "i").replace("v", "u"))

POSMAP = {"N": "n", "V": "v", "A": "a", "D": "r"}
pos_of = {}
for li, pos, *_ in lex["ana"]:
    pos_of.setdefault(li, pos)
freq_rank = {f[0]: i for i, f in enumerate(lex["freq"])}

# ---------- WordNet tables ----------
def tab(path, lang):
    out = defaultdict(set)   # synset -> lemmas
    for line in open(path, encoding="utf-8"):
        if line.startswith("#"): continue
        p = line.rstrip("\n").split("\t")
        if len(p) < 3 or not p[1].endswith("lemma"): continue
        out[p[0]].add(p[2].replace("_", " "))
    return out
W = os.path.join(OMW, "wns")
eng = tab(os.path.join(W, "eng", "wn-data-eng.tab"), "eng")
eng_word = defaultdict(list)   # (word, pos) -> synsets in file order (PWN lists commonest sense first per word only roughly)
for line in open(os.path.join(W, "eng", "wn-data-eng.tab"), encoding="utf-8"):
    if line.startswith("#"): continue
    s, t, w = line.rstrip("\n").split("\t")[:3]
    pos = s[-1].replace("s", "a")
    eng_word[(w.lower().replace("_", " "), pos)].append(s)
LANGS = {"it": ("ita", "wn-data-ita.tab"), "es": ("mcr", "wn-data-spa.tab"), "fr": ("fra", "wn-data-fra.tab"), "pt": ("por", "wn-data-por.tab"), "ro": ("ron", "wn-data-ron.tab")}
other = {k: tab(os.path.join(W, d, f), k) for k, (d, f) in LANGS.items()}
wikt = tab(os.path.join(W, "wikt", "wn-wikt-lat.tab"), "lat")
lat_syn = defaultdict(set)
for s, ws in wikt.items():
    for w in ws: lat_syn[latnorm(w)].add(s)

# PWN sense order: the sense index isn't in the tab, so use EWN's entries (senses listed in frequency order) where the
# synset ids are PWN-3.0-like for old synsets. Fallback: tab order.
ewn_order = {}
ant = defaultdict(set)
for f in sorted(glob.glob(os.path.join(EWN, "src", "yaml", "entries-*.yaml"))):
    word, pos, k = None, None, 0
    for line in open(f, encoding="utf-8"):
        if not line.startswith(" ") and line.rstrip().endswith(":"):
            word = line.rstrip()[:-1].strip("'\"").lower(); continue
        m = re.match(r"^  ([nvars]):\s*$", line)
        if m: pos = m.group(1).replace("s", "a"); k = 0; continue
        m = re.match(r"^\s+synset: (\d{8}-[nvars])", line)
        if m and word:
            ewn_order.setdefault((word, pos), []).append(m.group(1)); continue
        m = re.match(r"^\s+- '([^%']+)%", line)
        if m and word and pos:   # an antonym target inside a sense block (also matches other relations' lists, filtered below)
            pass
    # second pass for antonyms only (simple state machine)
    word = pos = None; in_ant = False
    for line in open(f, encoding="utf-8"):
        if not line.startswith(" ") and line.rstrip().endswith(":"):
            word = line.rstrip()[:-1].strip("'\"").lower(); in_ant = False; continue
        m = re.match(r"^  ([nvars]):\s*$", line)
        if m: pos = m.group(1).replace("s", "a"); in_ant = False; continue
        if re.match(r"^\s+(- )?antonym:\s*$", line): in_ant = True; continue
        if in_ant:
            m = re.match(r"^\s+- '([^%']+)%", line)
            if m: ant[(word, pos)].add(m.group(1).replace("_", " ").lower()); continue
            in_ant = False

def senses(word, pos, n=2):
    w = word.lower()
    ss = [s for s in ewn_order.get((w, pos), []) if s in eng] or eng_word.get((w, pos), [])
    return ss[:n]

# ---------- English meanings of each Latin word ----------
DROP = re.compile(r"\([^)]*\)|\[[^\]]*\]|\bL\+S\b")
STOPW = set("a an the of to be in on at by for one oneself someone something thing person who which that with from into upon as or and his her its their my your".split())
def meanings(gloss, pos):
    """English head words of the gloss's senses, main sense first: 'restraint/self-control/abstinence' -> restraint, self-control..."""
    out = []
    g = DROP.sub("", gloss or "")
    for part in re.split(r"[;]", g):
        for alt in re.split(r"[,/]", part):
            words = [w for w in re.findall(r"[A-Za-z][A-Za-z'-]*", alt)]
            if pos == "v" and words and words[0].lower() == "to": words = words[1:]
            words = [w for w in words if w.lower() not in STOPW]
            if not words: continue
            phrase = " ".join(words).lower()
            if (phrase, pos) in eng_word or (phrase, pos) in ewn_order: out.append(phrase)
            elif len(words) > 1 and ((words[-1].lower(), pos) in eng_word): out.append(words[-1].lower())
            elif (words[0].lower(), pos) in eng_word: out.append(words[0].lower())
    seen, res = set(), []
    for w in out:
        if w not in seen: seen.add(w); res.append(w)
    return res

entries = {}
for li, row in enumerate(lex["lemmas"]):
    lemma, gloss = row[0], (row[1] if len(row) > 1 else "")
    head = row[2] if len(row) > 2 else lemma
    if not gloss or gloss.startswith("(proper name)") or lemma[:1].isupper(): continue
    p = POSMAP.get((pos_of.get(li) or "?")[0])
    if not p or lemma in entries: continue
    ms = meanings(gloss, p)
    syn = []
    for i, w in enumerate(ms[:4]):
        for s in senses(w, p, 2 if i == 0 else 1): syn.append(s)
    for s in lat_syn.get(latnorm(lemma), ()):
        if s[-1].replace("s", "a") == p and s not in syn: syn.append(s)
    forms = [x.strip() for x in re.sub(r"\([^)]*\)", "", head).split(",") if x.strip()]
    entries[lemma] = {"li": li, "p": p, "m": ms, "syn": syn, "forms": forms, "head": head}
print(len(entries), "words with an English meaning")

# ---------- like meaning ----------
by_syn = defaultdict(set); by_first = defaultdict(set)
for l, e in entries.items():
    for s in e["syn"][:3]: by_syn[s].add(l)
    if e["m"]: by_first[(e["m"][0], e["p"])].add(l)
def rank(l): return freq_rank.get(entries[l]["li"], 10 ** 6)

def latin_stems(e):
    """Stems Romance and English words grow from: the lemma, the genitive / infinitive / supine, less their endings."""
    out = set()
    for f in e["forms"][:4]:
        f = latnorm(f.split(" ")[0])
        if len(f) < 3: continue
        out.add(f)
        for end in ("tionis", "tatis", "tudinis", "ionis", "oris", "inis", "atis", "itis", "ntis", "is", "ae", "i", "us", "um", "a", "o", "or", "are", "ere", "ire", "ari", "eri", "iri", "x", "s", "e"):
            if f.endswith(end) and len(f) - len(end) >= 3: out.add(f[: -len(end)]); break
    return out
def looks_like(word, stems, lang):
    w = re.sub(r"[^a-z]", "", plain(word).replace("j", "i").replace("v", "u").replace("y", "i"))
    if len(w) < 3 or " " in word.strip(): return False
    for st in stems:
        st2 = st.replace("ph", "f").replace("th", "t").replace("ch", "c")
        for a in {st, st2}:
            n = min(len(a), len(w))
            pre = 0
            while pre < n and a[pre] == w[pre]: pre += 1
            r = SequenceMatcher(None, a, w[: len(a) + 3]).ratio()
            if pre >= min(4, len(a)) and r >= 0.62: return True
            if lang in ("fr", "pt", "ro") and pre >= 3 and r >= 0.72: return True
    return False

LANG_ORDER = ["en", "it", "es", "fr", "pt", "ro"]
EN_VOCAB = defaultdict(set)   # first 4 letters -> single English words (WordNet)
for (w, _p) in eng_word:
    if re.fullmatch(r"[a-z]{5,14}", w): EN_VOCAB[w[:4]].add(w)
def en_root(stems):
    hits = set()
    for st in stems:
        if len(st) < 5: continue
        for w in EN_VOCAB.get(st[:4], ()):
            k = 0
            while k < min(len(st), len(w)) and st[k] == w[k]: k += 1
            if k >= len(st) and (w == st or re.search(r"(al|ality|ity|ive|ion|ions|ous|ent|ence|ency|ant|ance|ate|ify|ific|ude|ure|or|ory|ary|ible|able|ic|ism|ist|ize|ise)$", w)): hits.add(w)
    return hits
out = {}
for l, e in entries.items():
    rec = {}
    p = e["p"]
    cand = defaultdict(float)
    for i, s in enumerate(e["syn"][:4]):
        for o in by_syn.get(s, ()):
            if o != l and entries[o]["p"] == p:
                both = entries[o]["syn"][:1] == [s]
                cand[o] += (2.0 if both else 1.0) if i == 0 else (1.0 if both else 0.5)
    if e["m"]:
        for o in by_first.get((e["m"][0], p), ()):
            if o != l: cand[o] += 1.5
    sims, seen = [], {latnorm(l)}
    for o in sorted(cand, key=lambda o: (-cand[o], rank(o))):
        if cand[o] < 2 or latnorm(o) in seen: continue
        seen.add(latnorm(o)); sims.append(o)
    if sims: rec["s"] = sims[:6]
    # opposite
    opp = []
    if e["m"]:
        for a in sorted(ant.get((e["m"][0], p), ())):
            for o in sorted(by_first.get((a, p), ()), key=rank):
                if o != l and latnorm(o) not in {latnorm(x) for x in opp}: opp.append(o)
    if opp: rec["a"] = opp[:4]
    # other languages
    stems = latin_stems(e)
    cog = {}
    pools = {"en": set()}
    for s in e["syn"][:5]:
        pools["en"] |= eng.get(s, set())
        for k in LANGS: pools.setdefault(k, set()).update(other[k].get(s, set()))
    pools["en"] |= set(e["m"])
    for k in LANG_ORDER:
        hits = sorted({w for w in pools.get(k, ()) if looks_like(w, stems, k)}, key=lambda w: (len(w), w))
        if hits: cog[k] = hits[:4]
    more = sorted(en_root(stems) - set(cog.get("en", [])), key=lambda w: (len(w), w))
    if more: rec["d"] = more[:6]
    if cog: rec["c"] = cog
    if rec: out[l] = rec

# ---------- Lewis & Short etymologies: Greek and Sanskrit cognates ----------
ls_ety = {}
for f in glob.glob(os.path.join(ROOT, "data", "ls", "l[0-9]*.json")):
    for k, arr in json.load(open(f)).items():
        for ent in arr:
            head, first = ent[0], ent[1] if len(ent) > 1 else ""
            m = re.search(r"\[([^\]]{3,200})\]", first) or re.search(r"((?:etym\.|kindr\. with|cf\.|root)[^.;]{0,80}(?:Gr\.|Sanscr\.)[^;]{0,80})", first)
            seg = m.group(1) if m else ""
            gr = re.findall(r"[Ͱ-Ͽἀ-῿]+(?:[ -][Ͱ-Ͽἀ-῿]+)?", seg or first[:200])
            if gr and (("Gr." in (seg or first[:200])) or seg):
                ls_ety.setdefault(latnorm(head), "Greek " + ", ".join(dict.fromkeys(gr[:3])))
n_g = 0
for l in entries:
    g = ls_ety.get(latnorm(l))
    if g: out.setdefault(l, {})["g"] = g; n_g += 1

shards = defaultdict(dict)
for l, r in out.items():
    k = latnorm(l)[:1] or "_"
    shards[k][l] = r
d = os.path.join(ROOT, "data", "rel")
os.makedirs(d, exist_ok=True)
for f in glob.glob(os.path.join(d, "*.json")): os.remove(f)
for k, v in shards.items():
    json.dump(v, open(os.path.join(d, k + ".json"), "w"), ensure_ascii=False, separators=(",", ":"), sort_keys=True)
cnt = lambda key: sum(1 for r in out.values() if key in r)
print(f"{len(out)} words: like {cnt('s')}, opposite {cnt('a')}, other languages {cnt('c')}, Greek {n_g}")
