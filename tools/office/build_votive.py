"""Votive Masses (Missale Romanum, 1960 rubrics) for the Liturgy's Mass tab: data/office/votive.json.
Usage: python3 -I tools/office/build_votive.py <divinum-officium repo> tools/office/perllib

Two kinds:
- the votive Masses Divinum Officium has as such (its "Votive" menu: St Joseph, the Passion, Our Lady, the dead, the
  dedication, the Propagation of the Faith, the anniversary of the Pope's election), run through missa.pl with
  votive=<code> on a ferial day of each season, since their texts change with the season (Alleluia or Tract,
  Paschaltide verses);
- the traditional weekday votives whose texts are those of a feast (Holy Trinity, the Angels, Ss. Peter and Paul,
  the Holy Ghost, the Blessed Sacrament, the Holy Cross, the Sacred Heart): the feast's own Mass, run on its date.
  Said as a votive Mass these drop the feast's Sequence and, outside a solemn votive, the Gloria and the Creed (Rubricae
  generales nn. 385-388): the app says so above the texts.
Each Mass keeps its sections as [Latin lines, English lines], marked up as the daily Mass is (build_office.py)."""
import sys, os, re, json, datetime, hashlib
DO, LIB = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# reuse build_office.py's page parser
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_office.py"), encoding="utf-8").read()
src = src[: src.index("def main():")]
sys.argv = [sys.argv[0], DO, LIB, "/tmp/votive-unused", "2027-01-01", "1"]
ns = {"__name__": "build_office_lib"}
exec(compile(src, "build_office.py", "exec"), ns)
parse, MISSA = ns["parse"], ns["MISSA"]
import subprocess

def mass(date, votive=None):
    args = ["perl", "-I" + LIB, "missa.pl", f"date={date.strftime('%m-%d-%Y')}", "version=Rubrics 1960 - 1960", "command=praySanctaMissa", "lang1=Latin", "lang2=English", "rubrics=1"]
    if votive: args.append("votive=" + votive)
    r = subprocess.run(args, cwd=MISSA, capture_output=True, timeout=120)
    title, tempora, rows = parse(r.stdout.decode("utf-8", "replace"))
    return title, [[la, en] for la, en in rows]

D = datetime.date
SEASONS = [("pa", "After Pentecost and Epiphany", D(2027, 7, 13)), ("adv", "Advent", D(2026, 12, 1)), ("nat", "Christmastide to 2 February", D(2027, 1, 12)),
           ("sept", "Septuagesima and Lent", D(2027, 2, 3)), ("pasc", "Paschaltide", D(2027, 4, 13))]
VOTIVE = [
    # id, Latin title, English, the weekday it is traditionally said, DO votive code or a feast's date
    ("trinitas", "Missa votiva de Sanctissima Trinitate", "The Most Holy Trinity", "Monday", D(2027, 5, 23)),
    ("angeli", "Missa votiva de Angelis", "The Holy Angels", "Tuesday", D(2027, 9, 29)),
    ("joseph", "Missa votiva de S. Joseph", "St Joseph", "Wednesday", "V4"),
    ("apostoli", "Missa votiva de Ss. Petro et Paulo", "Ss. Peter and Paul", "Wednesday", D(2027, 6, 29)),
    ("spiritus", "Missa votiva de Spiritu Sancto", "The Holy Ghost", "Thursday", D(2027, 5, 16)),
    ("eucharistia", "Missa votiva de Ss. Eucharistiae Sacramento", "The Most Holy Sacrament", "Thursday", D(2027, 5, 27)),
    ("cruce", "Missa votiva de Sancta Cruce", "The Holy Cross", "Friday", D(2027, 9, 14)),
    ("passione", "Missa votiva de Passione D. N. Jesu Christi", "The Passion of Our Lord", "Friday", "V6"),
    ("cor", "Missa votiva de Sacratissimo Corde Jesu", "The Sacred Heart", "First Friday", D(2027, 6, 4)),
    ("bvm", "Missa votiva de Sancta Maria", "Our Lady", "Saturday", "C11"),
    ("defuncti", "Missa quotidiana pro defunctis", "For the dead (daily Requiem)", "", "C9"),
    ("dedicatio", "Missa in anniversario Dedicationis Ecclesiae", "Anniversary of the dedication of a church", "", "C8"),
    ("propaganda", "Missa pro Propagatione Fidei", "For the Propagation of the Faith", "", "Propaganda"),
    ("coronatio", "Missa in anniversario Electionis Summi Pontificis", "Anniversary of the Pope's election", "", "Coronatio"),
]
out = {"list": [], "m": {}}
for vid, la, en, wd, how in VOTIVE:
    rec = {"id": vid, "la": la, "en": en, "wd": wd, "feast": not isinstance(how, str), "v": {}}
    if isinstance(how, str):
        seen = {}
        for sid, sname, date in SEASONS:
            title, secs = mass(date, how)
            h = hashlib.sha1(json.dumps(secs, ensure_ascii=False).encode()).hexdigest()
            if h in seen: rec["v"][sid] = seen[h]; continue
            key = f"{vid}-{sid}"
            out["m"][key] = secs; rec["v"][sid] = key; seen[h] = key
    else:
        title, secs = mass(how)
        out["m"][vid] = secs; rec["v"] = {"all": vid}; rec["src"] = title.split("~")[0].strip()
    n = len({k for k in rec["v"].values()})
    print(f"{vid}: {n} text(s), {len(out['m'][next(iter(rec['v'].values()))])} sections")
    out["list"].append(rec)
# each section once: "p" holds them, each Mass a list of keys
pieces = {}
def pid(sec):
    k = hashlib.sha1(json.dumps(sec, ensure_ascii=False).encode()).hexdigest()[:8]
    pieces[k] = sec
    return k
out["m"] = {k: [pid(x) for x in secs] for k, secs in out["m"].items()}
out["p"] = pieces
json.dump(out, open(os.path.join(ROOT, "data", "office", "votive.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("data/office/votive.json:", os.path.getsize(os.path.join(ROOT, "data", "office", "votive.json")) // 1024, "KB")
