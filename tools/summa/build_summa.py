"""The whole Summa Theologiae in Latin (all four parts), for My class list: every question and article, each word linked to
its likely parsings, so a class's sections (objections / sed contra / respondeo / replies) can be turned into vocabulary.
Usage: node tools/summa/generated_forms.mjs data /tmp/genforms.json
       python3 -I tools/summa/build_summa.py <SummaTheologica.txt from github.com/androur/Summa-Theologica-Latin> data /tmp/genforms.json
Writes data/summa/index.json (parts, questions with titles, article titles) and data/summa/<part>-<k>.json, twenty questions
to a file (k = (question - 1) // 20): {"<question>": {"a": [[paragraph, ...] per article], "w": [[[ids per word] per paragraph] per article]}}; a word's entry is an analysis id,
a list of possible ids (most likely first), or -1 when the parsed corpora don't know the form."""
import sys, os, re, json, unicodedata, collections
SRC, DATA = sys.argv[1], sys.argv[2]
GEN = json.load(open(sys.argv[3])) if len(sys.argv) > 3 else {}   # forms made by the app's morphology generator
OUT = os.path.join(DATA, "summa")
PARTS = [("1", "Prima Pars"), ("1-2", "Prima Secundae"), ("2-2", "Secunda Secundae"), ("3", "Tertia Pars")]
WORD = re.compile(r"[A-Za-z]+")

def norm(w):
    w = unicodedata.normalize("NFD", w.lower()).replace("æ", "ae").replace("œ", "oe")
    w = "".join(c for c in w if not unicodedata.combining(c))
    return w.replace("j", "i").replace("v", "u")

# Form -> analysis ids, from every parsed text in the app (weighted by how often each analysis occurs for that form).
lex = json.load(open(os.path.join(DATA, "lexicon.json")))
known = collections.defaultdict(collections.Counter)
for p in lex["parts"]:
    for b in p["books"]:
        book = json.load(open(os.path.join(DATA, b[0] + ".json")))
        for ch in book["ch"]:
            for v in ch:
                for w, e in zip(WORD.findall(v[1]), v[3]):
                    ids = [e] if isinstance(e, int) and e >= 0 else e if isinstance(e, list) else []
                    for i in ids: known[norm(w)][i] += 1
def entry(w):
    c = known.get(norm(w))
    if not c:
        g = GEN.get(norm(w))
        return [g] if g is not None else -1   # a list: the dictionary word is known, the exact parsing isn't
    top = [i for i, _ in c.most_common(3)]
    return top[0] if len(top) == 1 else top

ORD = ["Primo", "Secundo", "Tertio", "Quarto", "Quinto", "Sexto", "Septimo", "Octavo", "Nono", "Decimo", "Undecimo", "Duodecimo",
       "Decimotertio", "Decimoquarto", "Decimoquinto", "Decimosexto", "Decimoseptimo", "Decimooctavo", "Decimonono", "Vicesimo"]
def art_titles(pro, n):
    """'Primo, utrum ... Secundo, utrum ...' in the prooemium gives each article's question."""
    out = []
    for k in range(n):
        m = re.search(r"\b" + ORD[k] + r"\b,?\s*(.*?)(?=\b(?:" + "|".join(ORD[k + 1:k + 3] or ["$^"]) + r")\b|$)", pro) if k < len(ORD) else None
        t = m.group(1).strip().rstrip(".,; ") if m else ""
        out.append(t[:1].upper() + t[1:150] if t else "")
    return out
def q_title(pro):
    s = re.split(r"(?<=[.?])\s", pro.strip())[0]
    s = re.sub(r"^(Deinde|Consequenter|Postea|Post hoc|Nunc|Iam|Et primo|Primo)\s+", "", s)
    s = re.sub(r"^(considerandum|consequenter considerandum|agendum|dicendum)\s+est\s+", "", s)
    return (s[:1].upper() + s[1:]).rstrip(".")[:110]

lines = open(SRC, encoding="utf-8").read().split("\n")
parts, cur = [], None
for l in lines:
    if l == "Quaestio 1": parts.append([])
    parts[-1].append(l)
assert len(parts) == 4, len(parts)
index, unknown, total = {"parts": [], "source": "Corpus Thomisticum text via github.com/androur/Summa-Theologica-Latin (MIT)"}, 0, 0
for (pid, pname), L in zip(PARTS, parts):
    os.makedirs(OUT, exist_ok=True)
    qs, q, art, pro, mode, chunks = [], None, None, "", None, collections.defaultdict(dict)
    def flush():
        if q is None: return
        arts = q["arts"]
        titles = art_titles(q["pro"], len(arts))
        qs.append([q["n"], q_title(q["pro"]), titles])
        w = [[[entry(x) for x in WORD.findall(par)] for par in a] for a in arts]
        chunks[(q["n"] - 1) // 20][str(q["n"])] = {"a": arts, "w": w}
    for l in L:
        m = re.match(r"Quaestio (\d+)$", l)
        if m: flush(); q = {"n": int(m.group(1)), "pro": "", "arts": []}; mode = "q"; continue
        if l == "Prooemium": mode = "pro"; continue
        m = re.match(r"Articulus (\d+)$", l)
        if m: q["arts"].append([]); mode = "a"; continue
        if not l.strip(): continue
        if mode == "pro": q["pro"] += (" " if q["pro"] else "") + l.strip()
        elif mode == "a":
            q["arts"][-1].append(l.strip())
            for x in WORD.findall(l):
                total += 1
                if norm(x) not in known and norm(x) not in GEN: unknown += 1
    flush()
    for k, c in chunks.items():
        json.dump(c, open(os.path.join(OUT, f"{pid}-{k}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    index["parts"].append({"id": pid, "name": pname, "qs": qs})
    print(pid, len(qs), "questions,", sum(len(x[2]) for x in qs), "articles")
json.dump(index, open(os.path.join(OUT, "index.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print(f"word forms known to the parsings: {100 - unknown * 100 / total:.1f}% of {total}")
