"""Index of every feast in the 1960 calendar data, for the local calendar's "use the texts of…" picker:
    python3 -I tools/office/build_feasts.py data/office
Writes data/office/feasts.json: [[title, "MM-DD", class 1-4, "YYYY-MM-DD" of a year it is celebrated (its texts), kind]].
A feast only ever commemorated (never celebrated in the built years) gets "" for its date of texts."""
import json, os, re, sys
D = sys.argv[1]
years = json.load(open(f"{D}/index.json"))["years"]
CLS = lambda k: next((n for r, n in (("IV", 4), ("III", 3), ("II", 2), ("I", 1)) if re.search(rf"\b{r}\. classis", k or "")), 0)
FERIA = re.compile(r"^(Feria|Sabbato|Dominica|Die |Diei |In Vigilia|Hebdomad|Dies )|infra Octavam|Quattuor Temporum|Mariæ Sabbato", re.I)
def kind(t):
    if re.search(r"Dedicatione", t): return "dedication"
    saint = re.match(r"(S|SS|Ss|Sanctorum|Sancti|Sanctæ)\.?\s", t) and not re.match(r"Sanctæ Mariæ|Sanctæ Familiæ", t)
    if not saint and re.search(r"Domini|D\. ?N\. ?J|Jesu|Iesu|Christi|Cordis|Trinitat|Transfigur|Crucis|Salvatoris|Nominis|Familiæ|Circumcisio|Epiphan|Ascensio|Corporis|Regis", t): return "lord"
    if not saint and re.search(r"Mariæ|B\. ?M\. ?V", t): return "bvm"
    if re.search(r"Joseph", t): return "confessor"
    if re.search(r"Domini|D\. ?N\. ?J|Jesu|Iesu|Christi|Cordis|Trinitat|Transfigur|Crucis|Salvatoris|Nominis|Familiæ|Circumcisio|Epiphan|Ascensio|Corporis|Regis", t): return "lord"
    if re.search(r"Mariæ|B\. ?M\. ?V|Virginis Mariæ|Beatæ Mariæ", t): return "bvm"
    if re.search(r"Dedicatione", t): return "dedication"
    if re.search(r"Apostol", t): return "apostle"
    if re.search(r"Ecclesiæ Doctoris|Doctor", t): return "doctor"
    if re.search(r"Papæ et Martyris|Episcopi et Martyris|Pontificis et Martyris", t): return "martyr-bishop"
    if re.search(r"Martyr", t) and re.search(r"Virgin", t): return "virgin-martyr"
    if re.search(r"Martyr", t): return "martyr"
    if re.search(r"Papæ et Confessoris|Episcopi et Confessoris", t): return "confessor-bishop"
    if re.search(r"Abbatis", t): return "abbot"
    if re.search(r"Confessoris", t): return "confessor"
    if re.search(r"Virginis", t): return "virgin"
    if re.search(r"Viduæ|Reginæ", t): return "holy-woman"
    if re.search(r"Angel|Michaël|Gabriel|Raphael", t): return "angels"
    return "other"
seen = {}
for y in years:
    days = json.load(open(f"{D}/days-{y}.json"))
    for md, d in sorted(days.items()):
        t = re.sub(r"\s+", " ", d["t"]).strip()
        if not FERIA.search(t):
            if t not in seen: seen[t] = [t, md, CLS(d["k"]), f"{y}-{md}", kind(t)]
            elif not seen[t][3]: seen[t][3] = f"{y}-{md}"; seen[t][2] = CLS(d["k"])
        for c in re.findall(r"Commemoratio(?:\s+ad Laudes tantum)?:\s*([^;]+)", d.get("o") or ""):
            c = re.sub(r"\s+", " ", c).strip()
            if c and not FERIA.search(c) and c not in seen: seen[c] = [c, md, 4, "", kind(c)]
out = sorted(seen.values(), key=lambda r: (r[1], r[0]))
json.dump(out, open(f"{D}/feasts.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "feasts;", sum(1 for r in out if r[3]), "with texts")
