"""Convert the 1960 Code of Rubrics (as published by Divinum Officium) into data/rubrics.json for the page.
Usage: python3 -I tools/rubrics/build_rubrics.py <divinum-officium repo> data
Each document: id, title, note, lang, chapters [{title, paras: [text]}]. A paragraph that starts "91. " is rubric no. 91;
indented sub-items keep a leading "  "."""
import sys, os, re, json, html
DO, DATA = sys.argv[1], sys.argv[2]
R = os.path.join(DO, "web", "www", "horas", "Help", "Rubrics")
DOCS = [
    ("general", "General Rubrics", "Rubricae generales (1960), in English: the liturgical day, its classes, precedence, occurrence and concurrence.", "General Rubrics.html", "en"),
    ("breviary", "Rubrics of the Breviary", "Rubricae generales Breviarii Romani (1960), in English: how each hour of the Office is arranged and said.", "Breviary 1960.html", "en"),
    ("missal", "Rubrics of the Missal", "Rubricae generales Missalis Romani (1960), in English: the kinds of Mass, its parts, and how it is celebrated.", "Missal1960 rubrics.html", "en"),
    ("tables", "Tables of liturgical days", "Which Sundays, ferias, vigils, octaves and feasts belong to each class (1960).", "Tables 1960.txt", "en"),
    ("instructum", "Rubricarum instructum", "John XXIII’s motu proprio of 25 July 1960 approving the new Code of Rubrics (Latin).", "Rubricarum Instructum.html", "la"),
    ("variationes", "Variationes in Breviario et Missali (1960)", "The changes the 1960 Code made in the Breviary and Missal, title by title (Latin).", "Variationes1960.html", "la"),
    ("cumnostra", "Cum nostra (1955)", "The 1955 decree simplifying the rubrics: the step between Divino afflatu and 1960 (English).", "1955.txt", "en", {"prose": True}),
    ("divinoafflatu", "Rubricae ad normam Bullae Divino afflatu (1911)", "The rubrics of the Breviary as reformed by St Pius X (Additiones et variationes), in force until 1955–1960 (Latin).", "rubrics.txt", "la", {"prose": True, "heads": r"^~?\s*Titulus\s+[IVXL]+"}),
    ("tabellae", "Tabellae occurrentiae et concurrentiae (1911)", "The tables of occurrence and concurrence under Divino afflatu, with their Notanda (Latin).", ["Tabellae.txt", "Notanda.txt"], "la", {"titles": ["Tabellae", "Notanda in praecedentes tabellas"]}),
    ("tridentinum", "Rubricae generales Breviarii (1568–1911)", "The general rubrics of the Breviary of St Pius V (Tridentine), in thirty-seven titles (Latin).", [f"R{i:02d}.txt" for i in range(1, 38)], "la", {"prose": True, "first": True}),
    ("monastic", "Rubricae generales Breviarii Monastici (1963)", "The general rubrics of the Benedictine Breviary after the 1960 Code (Latin).", "Monastic rubrics.html", "la"),
]
def text_of(path):
    t = open(path, encoding="utf-8", errors="replace").read()
    if path.endswith(".txt"):
        return re.sub(r"\r", "", t)
    t = re.sub(r"(?is)<script.*?</script>|<style.*?</style>|<head.*?</head>", "", t)
    t = re.sub(r"(?is)<P ALIGN=CENTER><FONT SIZE=1>.*?</P>", "", t)
    t = re.sub(r"(?is)<h[1-4][^>]*>(.*?)</h[1-4]>", lambda m: "\n\n## " + re.sub(r"<[^>]+>", "", m.group(1)).strip() + "\n\n", t)
    t = re.sub(r"(?i)<br\s*/?>", "\n", t)
    t = re.sub(r"(?i)</?p[^>]*>", "\n\n", t)
    t = re.sub(r"<[^>]+>", "", t)
    return html.unescape(t).replace(" ", " ")
def build(doc):
    did, title, note, fname, lang = doc[:5]
    opt = doc[5] if len(doc) > 5 else {}
    if isinstance(fname, list):
        # several files: each its own chapter, titled by its first line (or the given titles)
        chapters = []
        for k, f in enumerate(fname):
            t = text_of(os.path.join(R, f)).strip()
            first, _, rest = t.partition("\n")
            tt = opt["titles"][k] if "titles" in opt else first.strip()
            body = rest if "titles" not in opt else t
            paras = [re.sub(r"\s+", " ", b).strip() for b in re.split(r"\n\s*\n", body) if b.strip()] if opt.get("prose") else [l.rstrip() for l in body.split("\n") if l.strip()]
            chapters.append({"title": tt, "paras": paras})
        return {"id": did, "title": title, "note": note, "lang": lang, "chapters": chapters}
    t = text_of(os.path.join(R, fname))
    if opt.get("prose"):
        chapters, cur = [], None
        for b in re.split(r"\n\s*\n", t):
            b = b.strip()
            if not b: continue
            one = re.sub(r"\s+", " ", b)
            if (opt.get("heads") and re.match(opt["heads"], one) and len(one) < 120) or (b.isupper() and len(b) < 80) or (len(one) < 60 and "\n" not in b and not re.match(r"^\d+\.", one) and not one.endswith(".")):
                one = one.lstrip("~ ")
                cur = {"title": one if not one.isupper() else one.capitalize(), "paras": []}; chapters.append(cur); continue
            if cur is None: cur = {"title": "", "paras": []}; chapters.append(cur)
            cur["paras"].append(one)
        return {"id": did, "title": title, "note": note, "lang": lang, "chapters": [c for c in chapters if c["paras"]]}
    chapters, cur = [], None
    blocks = [b for b in re.split(r"\n\s*\n", t)]
    for b in blocks:
        lines = [l.rstrip() for l in b.split("\n") if l.strip()]
        if not lines: continue
        for l in lines:
            s = l.strip()
            if s.startswith("## "):
                cur = {"title": s[3:].strip(), "paras": []}; chapters.append(cur); continue
            if fname.endswith(".txt") and s.isupper() and len(s) < 60:
                cur = {"title": s.capitalize(), "paras": []}; chapters.append(cur); continue
            if cur is None: cur = {"title": "", "paras": []}; chapters.append(cur)
            indent = len(l) - len(l.lstrip()) >= 2
            if not indent and cur["paras"] and not re.match(r"^\d+\.\s", s) and not fname.endswith(".txt") and cur["paras"][-1] and not cur["paras"][-1].startswith("  ") and len(lines) > 1 and l is not lines[0]:
                cur["paras"][-1] += "\n" + s
            else:
                cur["paras"].append(("  " if indent else "") + s)
    # The table of contents at the top of each HTML document repeats the chapter titles; drop chapters with no text.
    chapters = [c for c in chapters if c["paras"]]
    # A table of contents ("CHAPTER I : GENERAL NORMS 138-141") is a chapter whose lines all end in paragraph ranges.
    chapters = [c for c in chapters if not (len(c["paras"]) > 2 and not any(re.match(r"^\d+\.\s", p) for p in c["paras"]) and sum(bool(re.search(r"\d+\s*-\s*\d+\s*$", p)) for p in c["paras"]) >= 3)]
    if chapters and not chapters[0]["title"] and all(len(p) < 90 for p in chapters[0]["paras"]) and lang == "en": chapters = chapters[1:]
    return {"id": did, "title": title, "note": note, "lang": lang, "chapters": chapters}
out = [build(d) for d in DOCS]
json.dump({"source": "Divinum Officium (divinumofficium.com), Help/Rubrics", "docs": out}, open(os.path.join(DATA, "rubrics.json"), "w"), ensure_ascii=False, separators=(",", ":"))
for d in out:
    n = sum(len(c["paras"]) for c in d["chapters"])
    nums = [int(m.group(1)) for c in d["chapters"] for p in c["paras"] for m in [re.match(r"^(\d+)\.\s", p)] if m]
    print(f'{d["id"]}: {len(d["chapters"])} chapters, {n} paragraphs, numbered {min(nums) if nums else "-"}-{max(nums) if nums else "-"}')
