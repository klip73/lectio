"""Apply hand corrections (fixes.json) to built data. Run after build.py, before validate.py:
    python3 -I tools/data/apply_fixes.py ../data tools/data/fixes.json
Each fix names a word in a verse and the parsing it should have; reported errors go here."""
import json, re, sys
D, FIX = sys.argv[1], sys.argv[2]
lex = json.load(open(f"{D}/lexicon.json"))
fixes = json.load(open(FIX))
lem_ids = {}
for i, l in enumerate(lex["lemmas"]): lem_ids.setdefault(l[0], i)
ana_ix = {tuple(a): i for i, a in enumerate(lex["ana"])}
books, done = {}, 0
for f in fixes:
    b = books.setdefault(f["book"], json.load(open(f"{D}/{f['book']}.json")))
    row = next(v for v in b["ch"][f["ch"] - 1] if v[0] == f["v"])
    words = re.findall(r"[A-Za-z]+", row[1])
    hits = [k for k, w in enumerate(words) if w.lower() == f["word"].lower()]
    k = hits[f.get("n", 1) - 1]
    li = lem_ids[f["lemma"]]
    key = (li, f["pos"], f["m"])
    if key not in ana_ix: ana_ix[key] = len(lex["ana"]); lex["ana"].append(list(key))
    row[3][k] = ana_ix[key]; done += 1
for code, b in books.items(): json.dump(b, open(f"{D}/{code}.json", "w"), ensure_ascii=False, separators=(",", ":"))
json.dump(lex, open(f"{D}/lexicon.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(f"applied {done} fixes")
