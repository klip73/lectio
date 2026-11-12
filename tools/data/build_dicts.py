"""Two more dictionaries for the word panel, from the Latin dictionary entries of James Penfold's Lexicon Scholasticum
(github.com/piakobos/lexiconscholasticum), exported as CSV (lemma, normalized_lemma, dictionary, definition_html) with
  SELECT lemma, normalized_lemma, dictionary, definition_html FROM entries WHERE language='latin' AND dictionary <> 'Lewis & Short'
(in two halves, normalized_lemma < 'm' and >= 'm'):
  - Wiktionary (CC BY-SA): the English senses of each Latin word, with its labels (Ecclesiastical, Late Latin…);
    inflected-form entries are left out (data/wkt has the forms);
  - Du Cange, Glossarium mediae et infimae Latinitatis (1883–87; digital edition of the École nationale des chartes):
    the Latin of the Middle Ages and of the Church, in Latin.
Usage: python3 -I tools/data/build_dicts.py data <csv> [<csv> …]
Writes data/dict/wk/ and data/dict/dc/: where.json (two or three letters -> file) and <n>.json (headword -> entries)."""
import sys, os, re, json, glob, csv, html, unicodedata, collections
DATA, SRCS = sys.argv[1], sys.argv[2:]
csv.field_size_limit(10 ** 9)
def norm(x):
    x = unicodedata.normalize("NFD", x.lower()).replace("æ", "ae").replace("œ", "oe")
    return re.sub(r"[^a-z]", "", "".join(c for c in x if not unicodedata.combining(c)).replace("j", "i").replace("v", "u"))
def text(h): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).replace(" ,", ",").replace(" .", ".").replace(" :", ":").strip()
KEEP_TAGS = re.compile(r"^(Ecclesiastical|Late-Latin|Medieval-Latin|New-Latin|Classical-Latin|Old-Latin|Vulgar-Latin|figuratively|transitive|intransitive|impersonal|with-accusative|with-ablative|with-dative|with-genitive|poetic|rare|plural|especially|law|philosophy|Christianity|theology|grammar|rhetoric)$")
wk, dc = collections.defaultdict(list), collections.defaultdict(list)
for f in SRCS:
    for r in csv.DictReader(open(f, encoding="utf-8")):
        h, d = r["definition_html"], r["dictionary"]
        if d == "Wiktionary Latin":
            senses = []
            for li in re.findall(r"<li>(.*?)</li>", h, re.S):
                m = re.search(r'class="sense-tags">([^<]*)</span>', li)
                tags = [t.strip() for t in (m.group(1).split(",") if m else [])]
                if "form-of" in tags: continue
                s = text(re.sub(r'<span class="sense-tags">[^<]*</span>', "", li))
                keep = [t.replace("-", " ") for t in tags if KEEP_TAGS.match(t)]
                if s: senses.append((f"({', '.join(keep)}) " if keep else "") + s)
            if not senses: continue
            pos = re.search(r'class="gramgrp">([^<]*)<', h)
            k = norm(r["lemma"])
            if k: wk[k].append([r["lemma"], pos.group(1) if pos else "", senses[:12]])
        elif d == "Du Cange":
            lem = re.sub(r"^\d+\.\s*", "", r["lemma"]).strip()
            k = norm(lem)
            t = text(h)
            t = re.sub(r"^\d+\.\s*", "", t)
            if len(t) > 5000: t = t[:5000].rsplit(" ", 1)[0] + " …"
            if k and t: dc[k].append([lem, t])
def pack(groups, out, cap=400_000):
    os.makedirs(out, exist_ok=True)
    for f in glob.glob(os.path.join(out, "*.json")): os.remove(f)
    shards = collections.defaultdict(dict)
    for k, v in groups.items(): shards[k[:2].ljust(2, "_")][k] = v[:6]
    for k2 in list(shards):
        if len(json.dumps(shards[k2], ensure_ascii=False)) > cap:
            for k, v in shards.pop(k2).items(): shards[k[:3].ljust(3, "_")][k] = v
    buckets, cur, size, where = [], {}, 0, {}
    for k in sorted(shards):
        s = len(json.dumps(shards[k], ensure_ascii=False, separators=(",", ":")))
        if cur and size + s > cap: buckets.append(cur); cur, size = {}, 0
        cur.update(shards[k]); size += s; where[k] = len(buckets)
    if cur: buckets.append(cur)
    for i, b in enumerate(buckets): json.dump(b, open(os.path.join(out, f"{i}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(where, open(os.path.join(out, "where.json"), "w"), separators=(",", ":"))
    sizes = [os.path.getsize(os.path.join(out, f"{i}.json")) for i in range(len(buckets))]
    print(f"{out}: {len(groups)} headwords, {len(buckets)} files, largest {max(sizes) // 1024} KB, total {sum(sizes) // 1024} KB")
pack(wk, os.path.join(DATA, "dict", "wk"))
pack(dc, os.path.join(DATA, "dict", "dc"), cap=600_000)
