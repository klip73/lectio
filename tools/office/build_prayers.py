"""Build data/prayers.json: the priest's prayers before and after Mass, and the Breviary's appendix (prayers before and after the
Office, Gradual and Penitential Psalms, Litanies, Commendation of a soul, grace at meals, prayers for a journey), from Divinum Officium.
Usage: python3 -I tools/office/build_prayers.py <divinum-officium repo> tools/office/perllib data"""
import sys, os, re, json, html, subprocess
DO, LIB, DATA = (os.path.abspath(a) for a in sys.argv[1:4])
HORAS = os.path.join(DO, "web", "cgi-bin", "horas"); MISSA = os.path.join(DO, "web", "cgi-bin", "missa")
ITEMS = [
    ("ante-missam", "Before Mass: the vesting prayers", "missa", "Ante"),
    ("post-missam", "Thanksgiving after Mass", "missa", "Post"),
    ("officium", "Before and after the Divine Office", "horas", "Ante et Post Divinum Officium"),
    ("graduales", "The Gradual Psalms", "horas", "Psalmi graduales"),
    ("paenitentiales", "The Seven Penitential Psalms", "horas", "Septem psalmi paenitentiales"),
    ("litaniae", "The Litanies", "horas", "Litaniae"),
    ("commendatio", "The Commendation of a soul", "horas", "Ordo Commendationis Animae"),
    ("mensa", "Blessing before and after meals", "horas", "Benedictio mensae"),
    ("itinerarium", "Prayers for a journey", "horas", "Itinerarium"),
]
def run(where, name):
    if where == "missa":
        args = ["perl", "-I" + LIB, "mpopup.pl", f"popup={name}", "rubrics=1", "lang1=Latin", "lang2=English", "version=Rubrics 1960 - 1960"]
        cwd = MISSA
    else:
        args = ["perl", "-I" + LIB, "officium.pl", "date=11-03-2026", "version=Rubrics 1960 - 1960", f"command=appendix {name}", "lang1=Latin", "lang2=English"]
        cwd = HORAS
    return subprocess.run(args, cwd=cwd, capture_output=True, timeout=120).stdout.decode("utf-8", "replace")
def cell(h):
    h = re.sub(r"<DIV ALIGN='right'>.*?</DIV>", "", h, flags=re.S)
    h = re.sub(r"<FONT SIZE='\+1' COLOR=\"red\"><B><I>(.*?)</I></B></FONT>", lambda m: "\n*" + m.group(1) + "*\n", h, flags=re.S)
    h = re.sub(r"<FONT SIZE='\+2' COLOR=\"red\"><B><I>(.*?)</I></B></FONT>", r"\1", h, flags=re.S)
    h = re.sub(r"<span style='color:red[^']*'>(.*?)</span>", r"^\1^", h, flags=re.S)
    h = re.sub(r"<FONT[^>]*COLOR=\"?red\"?[^>]*>(.*?)</FONT>", lambda m: "^" + re.sub(r"<[^>]+>", "", m.group(1)) + "^", h, flags=re.S)
    h = re.sub(r"<br\s*/?>", "\n", h, flags=re.I)
    h = re.sub(r"<[^>]+>", "", h)
    h = html.unescape(h).replace(" ", " ")
    lines = [re.sub(r"[ \t]+", " ", l).strip() for l in h.split("\n")]
    return [l.replace("^^", "") for l in lines if l and l != "^ ^" and not re.fullmatch(r"\^?(Top|Next|\d+)\^?", l)]
out = []
for pid, title, where, name in ITEMS:
    page = run(where, name)
    rows = []
    for tr in re.findall(r"<TR>(.*?)</TR>", page, re.S):
        tds = re.findall(r"<TD[^>]*>(.*?)</TD>", tr, re.S)
        if len(tds) >= 2:
            la, en = cell(tds[0]), cell(tds[1])
            if en == la: en = []          # no English translation: Divinum Officium repeats the Latin
            rows.append([la, en])
    has_en = any(r[1] for r in rows)
    out.append({"id": pid, "title": title, "la": name if where == "horas" else ("Ante Missam" if name == "Ante" else "Gratiarum actio post Missam"), "en": has_en, "rows": rows})
    print(f"{pid}: {len(rows)} sections, English: {has_en}, {sum(len(r[0]) for r in rows)} Latin lines")
json.dump({"source": "Divinum Officium", "items": out}, open(os.path.join(DATA, "prayers.json"), "w"), ensure_ascii=False, separators=(",", ":"))
