"""Text checks for the published data. Run before every publish:
    python3 tools/data/validate.py ../data
Exits 1 on errors (broken data); prints warnings for things worth a look."""
import json, re, sys, os, glob, collections

D = sys.argv[1] if len(sys.argv) > 1 else "data"
WORD = re.compile(r"[A-Za-z]+")
errors, warnings = [], []
err = lambda m: errors.append(m)
warn = lambda m: warnings.append(m)

lex = json.load(open(f"{D}/lexicon.json"))
n_ana, n_lem = len(lex["ana"]), len(lex["lemmas"])
idx = json.load(open(f"{D}/passages.json"))
RUBRIC = re.compile(r"/:|:/|\{|\}|^@|\(sed |\brubrica\b|^[RV]\. |\bflexis genibus\b|\bstropha\b", re.I)
codes = {b[0]: (p["id"], b) for p in lex["parts"] for b in p["books"]}

def ids_ok(e):
    if isinstance(e, int): return e == -1 or 0 <= e < n_ana
    if isinstance(e, str): return all(x.isdigit() and int(x) < n_ana for x in e.split("+"))
    if isinstance(e, list): return bool(e) and all(isinstance(x, int) and 0 <= x < n_ana for x in e)
    return False

ratios = collections.defaultdict(list)
for code, (part, meta) in codes.items():
    path = f"{D}/{code}.json"
    if not os.path.exists(path): err(f"{code}: data file missing"); continue
    b = json.load(open(path))
    if [len(c) for c in b["ch"]] != meta[2]: err(f"{code}: chapter sizes differ from the index")
    for ci, ch in enumerate(b["ch"], 1):
        for v in ch:
            where = f"{code} {ci}:{v[0]}"
            la, en, ids = v[1], v[2], v[3]
            if not la.strip() or not en.strip(): err(f"{where}: empty Latin or English"); continue
            if len(ids) != len(WORD.findall(la)): err(f"{where}: {len(ids)} parsings for {len(WORD.findall(la))} words")
            if not all(ids_ok(e) for e in ids): err(f"{where}: parsing id out of range")
            for txt, lang in ((la, "Latin"), (en, "English")):
                if RUBRIC.search(txt): err(f"{where}: rubric or markup left in the {lang}: {RUBRIC.search(txt).group(0)!r}")
            if re.search(r"[æœǽ]|[áéíóú]", la): err(f"{where}: unnormalised characters in the Latin")
            r = len(WORD.findall(en)) / max(1, len(WORD.findall(la)))
            ratios[part].append((r, where))
        if part == "hy":
            nl = [len(v[1].split(" / ")) for v in ch]
            ne = [len(v[2].split(" / ")) for v in ch]
            common = collections.Counter(nl).most_common(1)[0][0]
            if any(n != common for n in nl): warn(f"hymn {b['meta'][ci - 1]['label']}: stanza line counts {nl}")
            if nl != ne: warn(f"hymn {b['meta'][ci - 1]['label']}: Latin lines {nl} vs English lines {ne}")
            if nl and nl[-1] < common: err(f"hymn {b['meta'][ci - 1]['label']}: last stanza (doxology) is short")

for part, rs in ratios.items():
    rs.sort()
    lo = [w for r, w in rs if r < 0.6]; hi = [w for r, w in rs if r > 3.2]
    if lo or hi: warn(f"{part}: {len(lo)} rows with unusually short English, {len(hi)} with unusually long (e.g. {(lo + hi)[:3]})")

for part, rows in idx.items():
    for r in rows:
        if r[0] not in codes: err(f"passages index: unknown book {r[0]}"); break

for f in ("accents.json", "vocab.json"):
    if not os.path.exists(f"{D}/{f}"): err(f"{f} missing")

print(f"checked {len(codes)} books: {len(errors)} errors, {len(warnings)} warnings")
for m in errors[:40]: print("ERROR", m)
for m in warnings[:40]: print("warn ", m)
sys.exit(1 if errors else 0)
