"""Lewis & Short, A Latin Dictionary (1879), for the word panel, from the Perseus Digital Library's XML via
github.com/IohannesArnold/lewis-short-json (CC BY-SA). Entries are grouped by headword with the spelling evened out
(j -> i, v -> u, no marks or homograph numbers), and packed by their first two letters into files of about 400 KB.
Usage: python3 -I tools/data/build_ls.py <lewis-short-json> data
Writes data/ls/where.json (two or three letters -> file number) and data/ls/l<n>.json (headword -> entries [head, notes, senses])."""
import sys, os, re, json, glob, unicodedata, collections
SRC, DATA = sys.argv[1], sys.argv[2]
OUT = os.path.join(DATA, "ls"); os.makedirs(OUT, exist_ok=True)
def norm(x):
    x = unicodedata.normalize("NFD", x.lower()).replace("æ", "ae").replace("œ", "oe")
    return re.sub(r"[^a-z]", "", "".join(c for c in x if not unicodedata.combining(c)).replace("j", "i").replace("v", "u"))
def flat(senses, depth=0):
    out = []
    for s in senses or []:
        if isinstance(s, list): out += flat(s, depth + 1)
        elif isinstance(s, str) and s.strip(): out.append(("· " * depth) + s.strip())
    return out
POS = {"noun": "n.", "verb": "v.", "adjective": "adj.", "adverb": "adv.", "preposition": "prep.", "conjunction": "conj.", "pronoun": "pron.", "interjection": "interj.", "participle": "part."}
groups = collections.defaultdict(list)
n = 0
for f in sorted(glob.glob(os.path.join(SRC, "ls_*.json"))):
    for e in json.load(open(f, encoding="utf-8")):
        key = e.get("key", "")
        k = norm(re.sub(r"\d+$", "", key))
        if not k: continue
        num = int(m.group(0)) if (m := re.search(r"\d+$", key)) else 0
        head = e.get("title_orthography") or re.sub(r"\d+$", "", key)
        bits = [head + (", " + e["title_genitive"] if e.get("title_genitive") else "")]
        if e.get("gender"): bits.append({"M": "m.", "F": "f.", "N": "n.", "C": "comm."}.get(e["gender"], e["gender"]))
        elif e.get("part_of_speech") in POS and e["part_of_speech"] != "noun": bits.append(POS[e["part_of_speech"]])
        notes = (e.get("main_notes") or "").strip().strip(",. ")
        groups[k].append((num, [" ".join(bits), notes, flat(e.get("senses"))]))
        n += 1
for f in glob.glob(os.path.join(OUT, "*.json")): os.remove(f)
shards = collections.defaultdict(dict)
for k, es in groups.items():
    shards[k[:2].ljust(2, "_")][k] = [x for _, x in sorted(es, key=lambda t: t[0])]
# a two-letter group over 400 KB (co-, in-, pr-…) is split by three letters; the page tries three letters, then two
for k2 in list(shards):
    if len(json.dumps(shards[k2], ensure_ascii=False)) > 400_000:
        for k, v in shards.pop(k2).items(): shards[k[:3].ljust(3, "_")][k] = v
buckets, cur, size, where = [], {}, 0, {}
for k in sorted(shards):
    s = len(json.dumps(shards[k], ensure_ascii=False, separators=(",", ":")))
    if cur and size + s > 400_000: buckets.append(cur); cur, size = {}, 0
    cur.update(shards[k]); size += s; where[k] = len(buckets)
if cur: buckets.append(cur)
for i, b in enumerate(buckets): json.dump(b, open(os.path.join(OUT, f"l{i}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
json.dump(where, open(os.path.join(OUT, "where.json"), "w"), separators=(",", ":"))
sizes = [os.path.getsize(os.path.join(OUT, f"l{i}.json")) for i in range(len(buckets))]
print(f"{n} entries, {len(groups)} headwords, {len(buckets)} files, largest {max(sizes) // 1024} KB, total {sum(sizes) // 1024} KB")
