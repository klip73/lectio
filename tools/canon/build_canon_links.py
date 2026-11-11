"""Where each canon of the 1983 Code is on the Vatican's website (Latin and English pages), for the Library's canon lookup.
Only the web addresses and book numbers are kept: the texts are under copyright (Libreria Editrice Vaticana; the English is the
Canon Law Society of America's translation), so the app opens them on vatican.va instead of copying them.
Usage: python3 -I tools/canon/build_canon_links.py <codex-iuris-reader>/dist/data/corpus.json data
(github.com/joconn819/codex-iuris-reader: a reader built from the Vatican's pages; used here only for its per-canon links)"""
import sys, os, json
src, DATA = sys.argv[1], sys.argv[2]
d = json.load(open(src))
urls, idx = [], {}
def u(x):
    if x not in idx: idx[x] = len(urls); urls.append(x)
    return idx[x]
canons = {}
for c in d["canons"]:
    n = str(c["n"]).strip()
    if n and n not in canons: canons[n] = [int(c.get("book") or 0), u(c.get("laSource") or ""), u(c.get("enSource") or "")]
books = {"1": "De normis generalibus · General norms", "2": "De populo Dei · The People of God", "3": "De Ecclesiae munere docendi · The teaching office",
         "4": "De Ecclesiae munere sanctificandi · The sanctifying office", "5": "De bonis Ecclesiae temporalibus · Temporal goods",
         "6": "De sanctionibus poenalibus in Ecclesia · Penal sanctions", "7": "De processibus · Processes"}
json.dump({"urls": urls, "canons": canons, "books": books, "count": len(canons)}, open(os.path.join(DATA, "canon1983.json"), "w"), separators=(",", ":"))
print(len(canons), "canons,", len(urls), "pages")
