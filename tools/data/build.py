"""Build per-book NT data + a shared lexicon for Lectio Vulgata.
Sources: Clementine Vulgate + Douay-Rheims (scrollmapper/bible_databases),
PROIEL Latin NT treebank (CC BY-NC-SA), Whitaker's Words DICTLINE (glosses)."""
import json, re, sys, os, difflib, collections
import xml.etree.ElementTree as ET

SRC = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

NT = [  # (source name, short code, PROIEL code, display name)
 ("Matthew","mt","MATT","Matthew"),("Mark","mk","MARK","Mark"),("Luke","lk","LUKE","Luke"),("John","jn","JOHN","John"),
 ("Acts","ac","ACTS","Acts"),("Romans","rm","ROM","Romans"),("I Corinthians","1co","1COR","1 Corinthians"),
 ("II Corinthians","2co","2COR","2 Corinthians"),("Galatians","ga","GAL","Galatians"),("Ephesians","eph","EPH","Ephesians"),
 ("Philippians","ph","PHIL","Philippians"),("Colossians","col","COL","Colossians"),("I Thessalonians","1th","1THESS","1 Thessalonians"),
 ("II Thessalonians","2th","2THESS","2 Thessalonians"),("I Timothy","1tm","1TIM","1 Timothy"),("II Timothy","2tm","2TIM","2 Timothy"),
 ("Titus","ti","TIT","Titus"),("Philemon","phm","PHILEM","Philemon"),("Hebrews","hb","HEB","Hebrews"),("James","jas","JAS","James"),
 ("I Peter","1pt","1PET","1 Peter"),("II Peter","2pt","2PET","2 Peter"),("I John","1jn","1JOHN","1 John"),("II John","2jn","2JOHN","2 John"),
 ("III John","3jn","3JOHN","3 John"),("Jude","jd","JUDE","Jude"),("Revelation of John","ap","REV","Apocalypse")]

import unicodedata
def lig(s):
    s = s.replace("æ","ae").replace("Æ","Ae").replace("œ","oe").replace("Œ","Oe")
    return "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c))
WORD = re.compile(r"[A-Za-z]+")
def n1(w):
    return lig(w).lower().replace("j","i").replace("v","u")
def n2(w):
    w = n1(w)
    w = w.replace("ae","e").replace("oe","e").replace("y","i").replace("h","").replace("ph","f")
    w = re.sub(r"(.)\1", r"\1", w)
    for a,b in (("adp","ap"),("adt","at"),("inm","im"),("conp","comp"),("adc","acc"),("adf","aff"),("ads","ass"),("conl","coll"),("inl","ill"),("inr","irr"),("mn","n"),("ihs","ies"),("nct","nt")):
        w = w.replace(a,b)
    w = re.sub(r"(.)\1", r"\1", w)
    return w

# ---------- texts ----------
V = {b["name"]: b for b in json.load(open(f"{SRC}/bd/formats/json/VulgClementine.json"))["books"]}
D = {b["name"]: b for b in json.load(open(f"{SRC}/bd/formats/json/DRC.json"))["books"]}

# ---------- treebank ----------
tok_by_verse = collections.defaultdict(list)
ana_index = {}
analyses = []          # [lemma_id, pos, morph]
lemmas = []            # lemma strings
lemma_index = {}
lemma_pos = {}
form_counts = collections.defaultdict(collections.Counter)

def aid(lemma, pos, morph):
    lem = re.sub(r"#\d+$", "", lemma)
    if lem not in lemma_index:
        lemma_index[lem] = len(lemmas); lemmas.append(lem); lemma_pos[lem] = pos
    key = (lem, pos, morph)
    if key not in ana_index:
        ana_index[key] = len(analyses); analyses.append([lemma_index[lem], pos, morph])
    return ana_index[key]

for ev, el in ET.iterparse(f"{SRC}/pt/latin-nt.xml"):
    if el.tag == "token":
        form = el.get("form"); cit = el.get("citation-part")
        if form and cit and el.get("lemma"):
            a = aid(el.get("lemma"), el.get("part-of-speech"), el.get("morphology"))
            bk, cv = cit.split(" ")
            ch, vs = cv.split(".")
            tok_by_verse[(bk, int(ch), int(vs))].append((n1(form), n2(form), a))
            form_counts[n1(form)][a] += 1
            form_counts["~" + n2(form)][a] += 1
        el.clear()
print("tokens indexed", sum(len(v) for v in tok_by_verse.values()), "analyses", len(analyses), "lemmas", len(lemmas))


# ---------- other Latin treebanks (UD) for form lookups outside the NT ----------
UD_POS = {"NOUN": "Nb", "PROPN": "Ne", "ADJ": "A-", "VERB": "V-", "AUX": "V-", "ADV": "Df", "ADP": "R-", "CCONJ": "C-",
          "SCONJ": "G-", "NUM": "Ma", "INTJ": "I-", "PART": "Df", "X": "F-"}
def ud_tag(upos, feats):
    f = dict(kv.split("=", 1) for kv in feats.split("|") if "=" in kv) if feats != "_" else {}
    pos = UD_POS.get(upos)
    if upos in ("PRON", "DET"):
        pt = f.get("PronType", "")
        if pt == "Prs":
            pos = "Ps" if f.get("Poss") == "Yes" else ("Pk" if f.get("Reflex") == "Yes" else "Pp")
        else:
            pos = {"Rel": "Pr", "Int": "Pi", "Dem": "Pd", "Ind": "Px", "Tot": "Px", "Neg": "Px", "Con": "Px"}.get(pt, "Px" if upos == "PRON" else "A-")
    if not pos: return None
    vf, mood, tense, asp = f.get("VerbForm", ""), f.get("Mood", ""), f.get("Tense", ""), f.get("Aspect", "")
    te = "-"
    if tense == "Pres": te = "p"
    elif tense == "Fut": te = "t" if asp == "Perf" else "f"
    elif tense == "Pqp": te = "l"
    elif tense == "Past": te = "i" if asp == "Imp" else "r"
    mo = {"Inf": "n", "Part": "p", "Ger": "d", "Gdv": "g", "Sup": "u"}.get(vf) or {"Ind": "i", "Sub": "s", "Imp": "m"}.get(mood, "-")
    pe = (f.get("Person", "-") or "-")[:1]
    nu = {"Sing": "s", "Plur": "p"}.get(f.get("Number"), "-")
    vo = {"Act": "a", "Pass": "p"}.get(f.get("Voice"), "-")
    ge = {"Masc": "m", "Fem": "f", "Neut": "n"}.get(f.get("Gender", "").split(",")[0], "-")
    ca = {"Nom": "n", "Acc": "a", "Gen": "g", "Dat": "d", "Abl": "b", "Voc": "v", "Loc": "l"}.get(f.get("Case"), "-")
    de = {"Cmp": "c", "Sup": "s", "Pos": "p"}.get(f.get("Degree"), "-")
    if pos != "V-": te = mo = vo = "-"
    if pos == "V-" and mo in ("i", "s", "m", "n"): ge = ca = "-"
    m = f"{pe}{nu}{te}{mo}{vo}{ge}{ca}{de}-" + ("n" if pos in ("Df", "R-", "C-", "G-", "I-") else "i")
    return pos, m
ud_n = 0
import glob as _glob
for fpath in sorted(_glob.glob(f"{SRC}/ud-*/*.conllu")):
    for line in open(fpath, encoding="utf-8"):
        if not line or line[0] == "#" or line == "\n": continue
        c = line.rstrip("\n").split("\t")
        if len(c) < 6 or not c[0].isdigit(): continue
        form, lemma, upos, feats = lig(c[1]), c[2], c[3], c[5]
        if not WORD.fullmatch(form) or lemma in ("_", ""): continue
        t = ud_tag(upos, feats)
        if not t: continue
        lem = re.sub(r"[0-9#]+$", "", lig(lemma)).replace("j", "i").replace("J", "I")
        if not lem or not WORD.fullmatch(lem): continue
        a = aid(lem, t[0], t[1])
        form_counts[n1(form)][a] += 1
        form_counts["~" + n2(form)][a] += 1
        ud_n += 1
print("UD tokens", ud_n, "analyses", len(analyses), "lemmas", len(lemmas))

def fallback(word):
    c = form_counts.get(n1(word)) or form_counts.get("~" + n2(word))
    if not c: return None
    tot = sum(c.values())
    top = [a for a, k in c.most_common(3) if k / tot >= 0.12]
    return top

# ---------- glosses from Whitaker's DICTLINE ----------
POSMAP = {"N": "N", "A": "ADJ", "V": "V", "D": "ADV", "R": "PREP", "C": "CONJ", "G": "CONJ", "I": "INTERJ", "M": "NUM", "P": "PRON"}
END = {"N": ["", "a", "us", "um", "es", "u", "is", "on", "e", "os", "as", "er", "x"],
       "ADJ": ["", "us", "is", "a", "um", "er", "e", "x", "ns", "s"],
       "V": ["o", "eo", "io", "or", "eor", "ior", "t", "it"],
       "NUM": ["", "us", "o", "es", "i", "a", "um"],
       "ADV": [""], "PREP": [""], "CONJ": [""], "INTERJ": [""]}
FREQ = "ABCDEF"
dict_idx = collections.defaultdict(list)
for line in open(f"{SRC}/ww/DICTLINE.GEN", encoding="latin-1"):
    stems = [line[i:i + 19].strip() for i in range(0, 76, 19)]
    codes = line[76:110].split()
    if not codes: continue
    pos = codes[0]
    freq = line[76:110].rstrip()[-3]
    rank = FREQ.index(freq) if freq in FREQ else 7
    mean = re.sub(r"\[[^\]]*\]", "", line[110:]).strip()
    parts = [p.strip(" ;,") for p in mean.split(";") if p.strip(" ;,")]
    gloss = "; ".join(parts[:2])[:90]
    if not gloss: continue
    s1 = stems[0].replace("j", "i").replace("v", "u")
    if pos not in END: continue
    for e in END[pos]:
        dict_idx[(s1 + e, pos)].append((rank, gloss))


# stem index for guessing unknown words
STEMS = collections.defaultdict(list)
for line in open(f"{SRC}/ww/DICTLINE.GEN", encoding="latin-1"):
    stems = [line[i:i + 19].strip().replace("j", "i").replace("v", "u") for i in range(0, 76, 19)]
    codes = line[76:110].split()
    if not codes or codes[0] not in ("N", "ADJ", "V", "ADV"): continue
    freq = line[76:110].rstrip()[-3]
    rank = FREQ.index(freq) if freq in FREQ else 7
    mean = re.sub(r"\[[^\]]*\]", "", line[110:]).strip()
    parts = [p.strip(" ;,") for p in mean.split(";") if p.strip(" ;,")]
    gloss = "; ".join(parts[:2])[:90]
    pos = codes[0]; s1 = stems[0]
    if pos == "V":
        conj, var = codes[1], codes[2]
        dep = "DEP" in codes
        end = {"1": "o", "2": "eo", "4": "io"}.get(conj, "io" if var == "4" else "o")
        lemma = s1 + (end[:-1] + "or" if dep else end)
    elif pos == "N":
        d, v = codes[1], codes[2]
        lemma = s1 + {"1": "a", "2": {"1": "us", "2": "um", "3": ""}.get(v, "us"), "4": "us", "5": "es"}.get(d, "")
    elif pos == "ADJ":
        lemma = s1 + ("us" if codes[1] == "1" and codes[2] in ("1",) else "")
    else:
        lemma = s1
    for st in set(stems):
        if len(st) >= 3 and st != "zzz":
            STEMS[st].append((rank, -len(st), lemma, pos, gloss))
GPOS = {"N": "N?", "ADJ": "A?", "V": "V?", "ADV": "D?"}
def guess(word):
    w = n1(word)
    for L in range(len(w), 2, -1):
        if len(w) - L > 7: break
        hits = STEMS.get(w[:L])
        if hits:
            verbal = bool(VERB_END.search(w))
            r, _, lemma, pos, gloss = sorted(hits, key=lambda h: (0 if (h[3] == "V") == verbal else 1, h[0]))[0]
            a = aid(lemma, GPOS[pos], "??")
            GUESS_GLOSS[lemma] = GUESS_GLOSS.get(lemma) or gloss
            return a
    return None
GUESS_GLOSS = {}
VERB_END = re.compile(r"(mus|tis|nt|ris|tur|mur|mini|ntur|re|ri|isse|ns|ntis|nti|nte|ntem|ntes|ntium|ntibus|ndi|ndo|ndum|nda|ndus|ndae|ndarum|ndorum|turus|tura|turum|bo|bis|bit|bimus|bitis|bunt|bam|bas|bat|bant|ui|uit|uerunt|erunt|isti|it)$")
ENCL = [("cum", ("me", "te", "se", "nobis", "uobis")), ("que", None), ("ne", None)]

# ---------- assign word parsings (shared by every text) ----------
stats = collections.Counter()
PFREQ = collections.defaultdict(collections.Counter)   # part -> lemma id -> count
LEX_EX = {}

def ids_for(la, toks, part, ref):
    words = WORD.findall(la)
    ids = [None] * len(words)
    if toks:
        sm = difflib.SequenceMatcher(None, [n1(w) for w in words], [t[0] for t in toks], autojunk=False)
        for op, i1, i2, j1, j2 in sm.get_opcodes():
            if op == "equal":
                for k in range(i2 - i1): ids[i1 + k] = toks[j1 + k][2]
            elif op == "replace":
                used = set()
                for i in range(i1, i2):
                    for j in range(j1, j2):
                        if j not in used and toks[j][1] == n2(words[i]):
                            ids[i] = toks[j][2]; used.add(j); break
        used = set(x for x in ids if isinstance(x, int))
        for i, w in enumerate(words):
            if ids[i] is not None: continue
            a1, a2 = n1(w), n2(w)
            for t in toks:
                if (t[0] == a1 or t[1] == a2) and t[2] not in used:
                    ids[i] = t[2]; used.add(t[2]); break
            if ids[i] is None:
                for j in range(len(toks) - 1):
                    for k in (2, 3):
                        seg = toks[j:j + k]
                        if len(seg) < k: continue
                        if a1 in ("".join(t[0] for t in seg), "".join(t[0] for t in reversed(seg))):
                            ids[i] = "+".join(str(t[2]) for t in seg); break
                    if ids[i] is not None: break
    for i, w in enumerate(words):
        if ids[i] is not None:
            stats[part + ":context"] += 1; continue
        fb = fallback(w)
        if fb:
            ids[i] = fb; stats[part + ":lookup"] += 1; continue
        lw = n1(w); done = False
        for suf, heads in ENCL:
            if lw.endswith(suf) and len(lw) > len(suf) + 1:
                head = lw[:-len(suf)]
                if heads and head not in heads: continue
                h = fallback(head); t = fallback(suf)
                if h and t:
                    ids[i] = f"{h[0]}+{t[0]}"; stats[part + ":lookup"] += 1; done = True; break
        if done: continue
        g = guess(w)
        if g is not None: ids[i] = [g]; stats[part + ":guess"] += 1
        else: ids[i] = -1; stats[part + ":none"] += 1
    for i, e in enumerate(ids):
        parts_ = [e] if isinstance(e, int) else ([int(x) for x in e.split("+")] if isinstance(e, str) else (e[:1] if isinstance(e, list) else []))
        for a in parts_:
            if a < 0: continue
            li, pos, m = analyses[a]
            if pos == "Ne" or m == "??": continue
            PFREQ[part][li] += 1
            if li not in LEX_EX:
                lo, hi = max(0, i - 6), min(len(words), i + 7)
                sp = [mm.span() for mm in WORD.finditer(la)]
                a0, a1 = sp[i]
                snip = la[sp[lo][0]:a0] + "[[" + la[a0:a1] + "]]" + la[a1:sp[hi - 1][1]]
                LEX_EX[li] = [ref, ("… " if lo else "") + snip + (" …" if hi < len(words) else "")]
    return ids

FILES = {}       # code -> book object written to data/<code>.json
PARTS = []       # [{id, name, books: [[code, name, versesPerChapter, chapterLabels?]]}]

# New Testament
books = []
for src, code, pcode, disp in NT:
    chapters = []
    for ca, cd in zip(V[src]["chapters"], D[src]["chapters"]):
        verses = []
        for va, vd in zip(ca["verses"], cd["verses"]):
            la = lig(va["text"]).strip()
            toks = tok_by_verse.get((pcode, ca["chapter"], va["verse"]), [])
            verses.append([va["verse"], la, vd["text"].strip(), ids_for(la, toks, "nt", f"{disp} {ca['chapter']}:{va['verse']}")])
        chapters.append(verses)
    FILES[code] = {"code": code, "name": disp, "ch": chapters}
    books.append([code, disp, [len(c) for c in chapters]])
PARTS.append({"id": "nt", "name": "New Testament", "ref": "Douay-Rheims", "books": books})

# Psalms (Clementine Vulgate = Gallican Psalter; Douay-Rheims)
ps_la, ps_en = V["Psalms"]["chapters"], D["Psalms"]["chapters"]
chapters = []
for ca, cd in zip(ps_la, ps_en):
    if len(ca["verses"]) != len(cd["verses"]): stats["ps_mismatch"] += 1
    verses = []
    for va, vd in zip(ca["verses"], cd["verses"]):
        la = lig(va["text"]).strip()
        verses.append([va["verse"], la, vd["text"].strip(), ids_for(la, [], "ps", f"Psalm {ca['chapter']}:{va['verse']}")])
    chapters.append(verses)
FILES["ps"] = {"code": "ps", "name": "Psalms", "ch": chapters}
PARTS.append({"id": "ps", "name": "Psalms", "ref": "Douay-Rheims", "books": [["ps", "Psalms", [len(c) for c in chapters], [f"Psalm {i + 1}" for i in range(len(chapters))]]]})

# Summa, Matins sermons, hymns
CORP = json.load(open(sys.argv[3]))
for pid, pname, refname in (("st", "Summa Theologiae", "English Dominican translation"), ("se", "Matins sermons", "Divinum Officium English"), ("hy", "Office hymns", "Divinum Officium English (verse translation)")):
    books = []
    for b in CORP[pid]:
        chapters, meta = [], []
        for ch in b["chapters"]:
            rows = []
            for i, (la, en, label) in enumerate(ch["rows"]):
                ref = f"{b.get('name')}, {ch['label']}" if pid != "hy" else ch["label"]
                if pid == "st": ref = f"Summa I q.{b['code'][2:]} {ch['label'].replace('Article ', 'a.')}"
                rows.append([i + 1, la, en, ids_for(la, [], pid, ref), label])
            chapters.append(rows)
            meta.append({k: ch[k] for k in ("label", "title", "la_title") if ch.get(k)})
        FILES[b["code"]] = {"code": b["code"], "name": b["name"], "title": b.get("title", ""), "meta": meta, "ch": chapters}
        books.append([b["code"], b["name"] + (f": {b['title']}" if b.get("title") else ""), [len(c) for c in chapters], [m["label"] for m in meta]])
    PARTS.append({"id": pid, "name": pname, "ref": refname, "books": books})
PARTS = [next(p for p in PARTS if p["id"] == k) for k in ("nt", "st", "se", "hy", "ps")]
tot = collections.Counter()
for k, v in stats.items():
    if ":" in k: tot[k.split(":")[0]] += v
print({p: {k.split(":")[1]: round(v / tot[p] * 100, 1) for k, v in stats.items() if k.startswith(p + ":")} for p in tot})

MANUAL = {
 "sum":"be, exist","possum":"be able, can","eo":"go","fero":"bear, carry; bring","uolo":"wish, want","nolo":"be unwilling","malo":"prefer",
 "fio":"become; be made, be done","is":"he, she, it; this, that","hic":"this; he","ille":"that; he","ipse":"himself, herself; the very; the same",
 "iste":"that (of yours)","idem":"the same","qui":"who, which, that","quis":"who? what?; anyone","quisque":"each, every",
 "aliquis":"someone, something","quisquam":"anyone, anything","quidam":"a certain (one)","ego":"I","tu":"you (sing.)","nos":"we",
 "uos":"you (pl.)","sui":"himself, herself, themselves (reflexive)","se":"himself, herself, themselves (reflexive)",
 "suus":"his/her/their own","meus":"my, mine","tuus":"your (sing.)","noster":"our","uester":"your (pl.)","unus":"one; alone",
 "quicumque":"whoever, whatever","quisquis":"whoever, whatever","nemo":"no one","nihil":"nothing","alius":"other, another",
 "omnis":"all, every","quod":"because, that","ut":"so that, that; as, when","cum":"with; when, since, although","inquam":"say",
 "aio":"say","coepi":"began","memini":"remember","odi":"hate","noui":"know","ecce":"behold!","amen":"amen; truly",
 "Iesus":"Jesus","Christus":"Christ","Deus":"God","Dominus":"Lord","Spiritus":"Spirit","Petrus":"Peter","Paulus":"Paul",
 "Iohannes":"John","Maria":"Mary","Israhel":"Israel","Hierusalem":"Jerusalem","Moyses":"Moses","Abraham":"Abraham",
 "interrogo":"ask, question","respondeo":"answer","dico":"say, speak, tell","uenio":"come","uideo":"see","facio":"do, make",
 "nescio":"not know","inuicem":"one another, mutually","propter":"because of, on account of","autem":"but, however; now, moreover",
 "enim":"for, indeed","ergo":"therefore","uero":"but, indeed","quia":"because; that","quoniam":"because, since; that",
 "nisi":"unless, except","sicut":"just as, as","tamquam":"as if, just as","ecclesia":"church, assembly","apostolus":"apostle",
 "euangelium":"gospel","discipulus":"disciple","scriba":"scribe","pharisaeus":"Pharisee","angelus":"angel, messenger",
 "baptizo":"baptize","baptisma":"baptism","propheta":"prophet","sabbatum":"sabbath","synagoga":"synagogue","daemonium":"demon",
 "testimonium":"testimony, witness",
 "Iudaei":"the Jews","Iudaeus":"Jewish; a Jew","at":"but","nam":"for","Pharisaeus":"Pharisee","oportet":"it is necessary, one must",
 "etiam":"also, even","met":"(emphatic suffix) -self","unusquisque":"each one","tertius":"third","igitur":"therefore",
 "assumo":"take up, receive","tenebrae":"darkness","licet":"it is permitted, lawful","pascha":"Passover, the paschal lamb",
 "summus":"highest; chief (as in chief priest)","uerumtamen":"nevertheless, but","ue":"or (enclitic)","diuitiae":"riches",
 "Nazarenus":"of Nazareth, Nazarene","uidua":"widow","nuptiae":"wedding, marriage feast","alioqui":"otherwise","alioquin":"otherwise",
 "desum":"be lacking, fail","absum":"be away, be absent","Sadducaei":"Sadducees","prior":"former, first, earlier","sextus":"sixth",
 "proximus":"nearest; neighbour","Graeci":"Greeks","Galilaei":"Galileans","prout":"according as, just as","etenim":"for indeed",
 "mendax":"lying; liar","necesse":"necessary","prosum":"benefit, profit (+ dat.)","nonus":"ninth","quotquot":"as many as",
 "ambo":"both","Samaritani":"Samaritans","uterque":"each (of two), both","seorsum":"apart, privately","sorsum":"apart, privately",
 "quartus":"fourth","Israhelitae":"Israelites","Israelitae":"Israelites","quot":"how many; as many as","quisnam":"who then? what then?",
 "adsum":"be present, be at hand","cumque":"-ever (with relatives)","insidiae":"ambush, plot","obuiam":"to meet, in the way of",
 "osanna":"hosanna","bis":"twice","secundus":"second; favourable","primus":"first","septimus":"seventh","quintus":"fifth",
 "octauus":"eighth","decimus":"tenth","undecimus":"eleventh","duodecim":"twelve","dexter":"right (hand)","dextera":"right hand",
 "exsurgo":"rise up","exurgo":"rise up","apprehendo":"seize, lay hold of","comprehendo":"seize, grasp; understand",
 "exsulto":"rejoice, exult","exulto":"rejoice, exult","ungo":"anoint","unguo":"anoint","exstinguo":"extinguish, quench",
 "extinguo":"extinguish, quench","exspiro":"breathe out, expire","expiro":"breathe out, expire","Galilaea":"Galilee","peccatum":"sin","pecco":"sin","resurrectio":"resurrection","uita":"life","mundus":"world",
}
MANUAL_LC = {k.lower(): v for k, v in MANUAL.items()}
glossed = 0
gl = []
for lem in lemmas:
    key = lem.replace("j", "i").replace("v", "u")
    g = MANUAL.get(lem) or MANUAL.get(key) or MANUAL_LC.get(key.lower())
    variants = [key]
    if "(" in key:
        variants = [re.sub(r"\((.*?)\)", r"\1", key), re.sub(r"\(.*?\)", "", key)]
        g = g or MANUAL.get(variants[0]) or MANUAL.get(variants[1])
    if not g:
        pos = POSMAP.get(lemma_pos[lem][0]) if not lemma_pos[lem].endswith("?") else None
        cand = None
        for kv in variants:
            cand = cand or dict_idx.get((kv.lower(), pos)) or (dict_idx.get((kv.lower(), "ADJ")) if pos in ("NUM", "PRON") else None)
        if cand:
            g = sorted(cand)[0][1]
    if not g and lem in GUESS_GLOSS and lemma_pos[lem].endswith("?"):
        g = GUESS_GLOSS[lem]
    if not g and lemma_pos[lem] == "Ne":
        g = "(proper name)"
    if g: glossed += 1
    gl.append(g or "")
print("lemmas glossed", glossed, "/", len(lemmas))


# ---------- global frequency, weighting the five exam texts equally ----------
score = collections.Counter(); count = collections.Counter()
for p, c in PFREQ.items():
    t = sum(c.values()) or 1
    for li, n in c.items():
        score[li] += n / t; count[li] += n
RANK = {li: r for r, (li, _) in enumerate(score.most_common(), 1)}
freq = [[li, count[li]] + LEX_EX[li] for li, _ in score.most_common()
        if count[li] >= 3 and gl[li] and not lemma_pos[lemmas[li]].startswith("Ne") and li in LEX_EX][:2500]

# ---------- passages: blocks, grammar tags, difficulty ----------
def blocks_for(rows):
    out, cur, w = [], [], 0
    for v in rows:
        n = len(WORD.findall(v[1]))
        if cur and (w + n > 45 or len(cur) >= 4):
            out.append(cur); cur, w = [], 0
        cur.append(v); w += n
    if cur: out.append(cur)
    return out
SAY = {"dico", "aio", "inquam", "credo", "puto", "existimo", "arbitror", "scio", "nescio", "sentio", "audio", "intellego", "intelligo",
       "cognosco", "nego", "spero", "ostendo", "affirmo", "assero", "probo", "dubito", "doceo", "respondeo", "ignoro", "confiteor", "testor"}
AUTO = ["dep", "subj", "absl", "ind", "part", "imp", "comp", "fut", "pass", "perf", "rel", "abl", "dat", "gen"]
def first_ids(e):
    if isinstance(e, int): return [e] if e >= 0 else []
    if isinstance(e, str): return [int(x) for x in e.split("+")]
    if isinstance(e, list): return e[:1]
    return []
def analyse(block):
    c = collections.Counter(); lem = set(); toks = rare = sents = 0
    for v in block:
        sents += max(1, len(re.findall(r"[.;:?!]", v[1])))
        for e in v[3]:
            ids = first_ids(e)
            toks += 1
            if not ids: rare += 1; continue
            for a in ids:
                li, pos, m = analyses[a]
                lemma = lemmas[li]; lem.add(lemma)
                if pos.startswith("Ne"): continue
                if m == "??" or RANK.get(li, 99999) > 1200: rare += 1
                if m == "??": continue
                if pos == "Pr": c["rel"] += 1
                if pos != "V-" and m[7] in "cs": c["comp"] += 1
                if pos == "V-":
                    if m[3] == "s": c["subj"] += 1
                    if m[3] == "m": c["imp"] += 1
                    if m[3] in "pdg": c["part"] += 1
                    if m[3] == "n": c["inf"] += 1
                    if m[2] in "ft": c["fut"] += 1
                    if m[2] in "rlt": c["perf"] += 1
                    if m[4] == "p": c["dep" if lemma.endswith("or") else "pass"] += 1
                    if m[3] == "p" and m[6] == "b": c["absl"] += 1
                if m[6] == "b": c["abl"] += 1
                if m[6] == "g": c["gen"] += 1
                if m[6] == "d": c["dat"] += 1
    if lem & SAY and (c["inf"] or lem & {"quod", "quia", "quoniam"}): c["ind"] += 1
    tags = [t for t in AUTO if (c[t] >= 2 if t in ("abl", "gen", "dat") else c[t] >= 1)][:5]
    cx = (c["subj"] + c["part"] + c["inf"] + c["rel"] + c["absl"] * 2) / max(1, toks)
    return tags, rare / max(1, toks), toks / max(1, sents), cx, toks
INDEX = {}
for part in PARTS:
    rows = []
    for code, *_ in part["books"]:
        for ci, ch in enumerate(FILES[code]["ch"]):
            for bl in blocks_for(ch):
                tags, rr, sl, cx, n = analyse(bl)
                rows.append([code, ci + 1, bl[0][0], rr, sl, cx, ",".join(tags), n])
    def z(i):
        xs = [r[i] for r in rows]; mu = sum(xs) / len(xs); sd = (sum((x - mu) ** 2 for x in xs) / len(xs)) ** .5 or 1
        return [(x - mu) / sd for x in xs]
    zr, zs, zc = z(3), z(4), z(5)
    raw = [.55 * a + .25 * b + .20 * c for a, b, c in zip(zr, zs, zc)]
    order = sorted(range(len(rows)), key=lambda i: raw[i])
    pct = [0] * len(rows)
    for k, i in enumerate(order): pct[i] = round(k / max(1, len(rows) - 1) * 100)
    INDEX[part["id"]] = [[r[0], r[1], r[2], pct[i], r[6], r[7]] for i, r in enumerate(rows)]
    print(part["id"], "passages", len(rows))

# ---------- prune the lexicon to what the texts use, then write ----------
used = set()
for f in FILES.values():
    for ch in f["ch"]:
        for v in ch:
            for e in v[3]:
                if isinstance(e, int) and e >= 0: used.add(e)
                elif isinstance(e, str): used.update(int(x) for x in e.split("+"))
                elif isinstance(e, list): used.update(e)
amap = {a: k for k, a in enumerate(sorted(used))}
lused = sorted({analyses[a][0] for a in used} | {f[0] for f in freq})
lmap = {l: k for k, l in enumerate(lused)}
def remap(e):
    if isinstance(e, int): return amap[e] if e >= 0 else -1
    if isinstance(e, str): return "+".join(str(amap[int(x)]) for x in e.split("+"))
    return [amap[x] for x in e]
for code, f in FILES.items():
    for ch in f["ch"]:
        for v in ch: v[3] = [remap(e) for e in v[3]]
    json.dump(f, open(f"{OUT}/{code}.json", "w"), separators=(",", ":"), ensure_ascii=False)
ana_out = [[lmap[analyses[a][0]], analyses[a][1], analyses[a][2]] for a in sorted(used)]
lem_out = [[lemmas[l], gl[l]] for l in lused]
freq_out = [[lmap[f[0]]] + f[1:] for f in freq]
books_nt = PARTS[0]["books"]
json.dump({"books": books_nt, "parts": PARTS, "lemmas": lem_out, "ana": ana_out, "freq": freq_out, "tokens": sum(count.values())},
          open(f"{OUT}/lexicon.json", "w"), separators=(",", ":"), ensure_ascii=False)
json.dump(INDEX, open(f"{OUT}/passages.json", "w"), separators=(",", ":"), ensure_ascii=False)
print("lexicon: lemmas", len(lem_out), "analyses", len(ana_out), "freq", len(freq_out))
