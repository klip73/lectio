"""The Pontificale Romanum (Benedict XIV and Leo XIII, 1895 edition; public domain), from the Latin transcription kept in
github.com/realitix/magisterium (A-pre-vatican-ii/liturgie/1895-pontifical-romain-leo-xiii, after liturgialatina).
    python3 -I tools/library/build_pontificale.py <…_pontifical.la.md> data/library
Writes data/library/pontificale.json: one rite to a chapter (confirmation, the orders from tonsure to the episcopate,
blessings of abbots and virgins, the dedication of a church and consecration of altars, blessings of bells, chalices…,
the synod, degradation, excommunication). Paragraphs that are rubrics (what the bishop does) are marked red."""
import json, re, sys, os
SRC, OUT = sys.argv[1], sys.argv[2]
L = open(SRC, encoding="utf-8").read().replace("\r", "").split("\n")
# page furniture: "http://members.aol.com/… (7 of 9)2006-09-16 21:11:09" and the running title on the next line
clean, skip = [], 0
for l in L:
    if re.match(r"^\s*https?://", l): skip = 2; continue
    if skip:
        skip -= 1
        if not l.strip(): continue
        if skip == 0 or len(l.strip()) < 70 and not l.strip().endswith((".", ":", ",", ";")): continue
    clean.append(l)
HEAD = re.compile(r"^(DE |ORDO |ITINERARIUM|BENEDICTIO |MODUS |FORMA |APPENDIX|PRAEFATIO|RITUS |INSTRUCTIO)[A-Z ,.;:'()-]+$")
start = next(i for i, l in enumerate(clean) if l.strip() == "DE CONFIRMANDIS")
chapters, cur = [], None
pending_head = False
for l in clean[start:]:
    s = l.strip()
    if HEAD.match(s) and len(s) < 90:
        if cur and not cur["paras"]: cur["title"] += " " + s.title(); continue
        cur = {"title": s.title().replace(" De ", " de ").replace(" Et ", " et ").replace(" In ", " in "), "paras": []}; chapters.append(cur)
        pending_head = True; continue
    if cur is None: continue
    if pending_head and s and s.isupper() and len(s) < 60:   # a heading wrapped onto a second line
        cur["title"] += " " + s.title(); continue
    pending_head = False
    if not s:
        if cur["paras"] and cur["paras"][-1] != "": cur["paras"].append("")
        continue
    # join wrapped lines: a new paragraph starts after a line ending a sentence or with V./R./Oremus/a short line
    starts = re.match(r"^(V\.|R\.|℣|℟|Oremus|Oratio|Praefatio|Antiphona|Psalmus|Hymnus|Lectio|Responsorium|Litaniae|Kyrie|Pater noster|Credo|Gloria|Benedicamus|Tum |Deinde |Postea |Mox |Et |Quo facto|Quibus|His |Hoc |Finita|Dicto|Sequitur|Si |Ubi |Interim|Pontifex|Ordinandi?|Electus|Consecrator|Archidiaconus)", s)
    prev = cur["paras"][-1] if cur["paras"] else ""
    if prev and prev != "" and not re.search(r"[.:!?]$|Amen\.?$", prev) and not starts:
        cur["paras"][-1] = (prev[:-1] if prev.endswith("-") else prev + " ") + s
    elif prev and prev != "" and re.search(r"[a-z,;]$", prev):
        cur["paras"][-1] = prev + " " + s
    else:
        if cur["paras"] and cur["paras"][-1] == "": cur["paras"].pop()
        cur["paras"].append(s)
RUB_START = re.compile(r"^(Tunc|Respondet|Tum|Deinde|Postea|Mox|Quo facto|Quibus|His|Hoc|Finita|Dicto|Sequitur|Si |Ubi |Interim|Pontifex|Ordinandi?|Electus|Consecrator|Archidiaconus|Cum |Postquam|Statim|Ad |In |Dum |Et |Primo|Itaque|Notandum|Debet|Ordinatio|Consecratio|Benedictio|Hic |Ibi |Facta|Peracta|Absoluta|Expleta|Completa|Accepto|Accepta|Data|Datis|Lecta|Lecto|Cantato|Cantata|Dictis)\b")
PRAYER = re.compile(r"^(Oremus|Deus|Domine|Omnipotens|Exaudi|Adesto|Accipe|Benedic|Sancte|Per |Qui |R\.|V\.|℣|℟|Kyrie|Pater|Ave|Gloria|Credo|Amen|Ant\.|Antiphona|Psalmus|Dominus|Vere|Te |Respice|Propitiare|Concede|Praesta|Suscipe|Veni|Emitte|Ecce|Flectamus|Levate)")
# sub-headings ("Forma Juramenti.", "Benedictio Salis.") stay inside their rite, as a heading line
merged = []
for c in chapters:
    if merged and (c["title"].endswith(".") or (c["title"].startswith("Benedictio ") and len(c["title"]) < 70)):
        merged[-1]["paras"] += ["▸ " + c["title"]] + c["paras"]
    else: merged.append(c)
chapters = merged
VERB = re.compile(r"\b(Pontifex|Ordinand\w*|Archidiacon\w*|Electus|Consecrator|dicit|dicens|dicunt|accedit|genuflect\w*|surgit|sedet|imponit|tradit|ponit|vadit|incipit|cantatur|cantantur|dicitur|accipit|tangit|facit|redit|ungit|benedicit|aspergit|incensat|inclinat|stans|sedens|mitra|faldistorio|interrogat|respondet|annuntiat|prosequitur|legitur|leguntur|vocat|praesentat|admonet|ascendit|descendit|procedit)\b")
PRAYERISH = re.compile(r"\b(Per Dominum|Per Christum|Per eundem|Qui tecum|Qui vivis|Amen\.?$|quaesumus|digneris)")
for c in chapters:
    c["paras"] = [p for p in c["paras"] if p]
    r = [i for i, p in enumerate(c["paras"]) if p.startswith("▸ ") or (not PRAYER.match(p) and not PRAYERISH.search(p) and (RUB_START.match(p) or (p.endswith(":") and len(p) < 160)) and VERB.search(p))]
    if r: c["r"] = r
chapters = [c for c in chapters if c["paras"]]
json.dump({"id": "pontificale", "title": "Pontificale Romanum", "author": "Benedict XIV and Leo XIII, 1895", "verse": False, "chapters": chapters},
          open(os.path.join(OUT, "pontificale.json"), "w"), ensure_ascii=False, separators=(",", ":"))
words = sum(len(re.findall(r"[^\W\d_]+", p)) for c in chapters for p in c["paras"])
print(len(chapters), "rites,", words, "words;", sum(len(c.get("r", [])) for c in chapters), "rubric paragraphs")
print([c["title"] for c in chapters][:60])
