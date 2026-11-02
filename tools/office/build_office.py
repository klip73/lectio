"""Build the daily Office (Matins) for a range of dates with the Divinum Officium programs (1960 rubrics).
Usage: python3 -I tools/office/build_office.py <divinum-officium repo> tools/office/perllib <raw out dir> <first date YYYY-MM-DD> <days>
Writes <out>/days-YYYY.json (each day: title, rank, tempora, and the ids of its sections) and <out>/pieces.json (each section once,
Latin and English as lines; ^...^ marks red rubric text, *...* marks a heading)."""
import sys, os, re, json, html, hashlib, subprocess, datetime
from concurrent.futures import ThreadPoolExecutor
DO, LIB, OUT, FIRST, NDAYS = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5])
HORAS = os.path.join(DO, "web", "cgi-bin", "horas")
HOURS = {"m": "prayMatutinum"}

def run(date, cmd):
    r = subprocess.run(["perl", "-I" + LIB, "officium.pl", f"date={date.strftime('%m-%d-%Y')}", "version=Rubrics 1960 - 1960",
                        f"command={cmd}", "lang1=Latin", "lang2=English"], cwd=HORAS, capture_output=True, timeout=120)
    return r.stdout.decode("utf-8", "replace")

def cell(h):
    h = re.sub(r"<DIV ALIGN='right'>.*?</DIV>", "", h, flags=re.S)
    h = re.sub(r"<FONT SIZE='\+1' COLOR=\"red\"><B><I>(.*?)</I></B></FONT>", lambda m: "\n*" + m.group(1) + "*\n", h, flags=re.S)
    h = re.sub(r"<FONT SIZE='\+2' COLOR=\"red\"><B><I>(.*?)</I></B></FONT>", r"\1", h, flags=re.S)        # drop-cap initial
    h = re.sub(r"<span style='color:red[^']*'>(.*?)</span>", r"^\1^", h, flags=re.S)
    h = re.sub(r"<FONT[^>]*COLOR=\"?red\"?[^>]*>(.*?)</FONT>", lambda m: "^" + re.sub(r"<[^>]+>", "", m.group(1)) + "^", h, flags=re.S)
    h = re.sub(r"<br\s*/?>", "\n", h, flags=re.I)
    h = re.sub(r"<[^>]+>", "", h)
    h = html.unescape(h).replace(" ", " ")
    lines = [re.sub(r"[ \t]+", " ", l).strip() for l in h.split("\n")]
    lines = [l.replace("^^", "") for l in lines if l and l != "^ ^"]
    return lines

def parse(page):
    m = re.search(r"<P ALIGN=CENTER><FONT COLOR=\"?red\"?>(.*?)</FONT>", page, re.S | re.I)
    head = re.findall(r"<P[^>]*ALIGN=['\"]?CENTER['\"]?[^>]*>(.*?)</P>", page, re.S | re.I)
    title = tempora = ""
    for hd in head:
        txt = html.unescape(re.sub(r"<[^>]+>", "\n", hd))
        ls = [l.strip() for l in txt.split("\n") if l.strip()]
        if ls and "~" in ls[0] and not title:
            title = ls[0]
            i = next((k for k, l in enumerate(ls[1:], 1) if l.startswith("Tempora") or l.startswith("Commemoratio")), None)
            if i is not None:
                tempora = ls[i] if not ls[i].endswith(":") else (ls[i] + " " + ls[i + 1] if i + 1 < len(ls) else "")
    rows = []
    for tr in re.findall(r"<TR>(.*?)</TR>", page, re.S):
        tds = re.findall(r"<TD[^>]*>(.*?)</TD>", tr, re.S)
        if len(tds) >= 2: rows.append((cell(tds[0]), cell(tds[1])))
    return title, tempora, rows

def main():
    os.makedirs(OUT, exist_ok=True)
    pieces_path = os.path.join(OUT, "pieces.json")
    pieces = json.load(open(pieces_path)) if os.path.exists(pieces_path) else {}
    start = datetime.date.fromisoformat(FIRST)
    dates = [start + datetime.timedelta(d) for d in range(NDAYS)]
    with ThreadPoolExecutor(8) as ex:
        pages = list(ex.map(lambda d: run(d, HOURS["m"]), dates))
    years = {}
    for d, page in zip(dates, pages):
        title, tempora, rows = parse(page)
        ids = []
        for la, en in rows:
            key = hashlib.sha1(json.dumps([la, en], ensure_ascii=False).encode()).hexdigest()[:10]
            pieces[key] = [la, en]
            ids.append(key)
        name, _, rank = title.partition("~")
        y = years.setdefault(d.year, json.load(open(os.path.join(OUT, f"days-{d.year}.json"))) if os.path.exists(os.path.join(OUT, f"days-{d.year}.json")) else {})
        y[d.strftime("%m-%d")] = {"t": name.strip(), "k": rank.strip(), "o": tempora.replace("Tempora: ", ""), "m": ids}
    for yr, days in years.items():
        json.dump(days, open(os.path.join(OUT, f"days-{yr}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(pieces, open(pieces_path, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(dates)} days, {len(pieces)} distinct sections")

main()
