/* ---------- Sunday preparation: everything for preaching on one Sunday's Gospel ----------
   The proper of the Mass (Introit to Postcommunion), the Epistle and the Gospel (Latin and English), the Gospel antiphons
   at Lauds and Vespers, the homily of Matins, St Thomas's Catena Aurea on those very verses (the Fathers, in Latin with
   the Oxford English), St Thomas's own lectures on the Gospel and the Epistle (lectura-map.json), the Summa articles that
   cite the Gospel chapter, and the Catechism and the Church's documents that cite the Gospel and Epistle verses (vc/). */
const GOSPEL_NAME = { mt: "Matthew", mk: "Mark", lk: "Luke", jn: "John" };
const NT_NAME = { ...GOSPEL_NAME, ac: "Acts", rm: "Romans", "1co": "1 Corinthians", "2co": "2 Corinthians", ga: "Galatians", eph: "Ephesians", ph: "Philippians", col: "Colossians", "1th": "1 Thessalonians", "2th": "2 Thessalonians", "1tm": "1 Timothy", "2tm": "2 Timothy", ti: "Titus", phm: "Philemon", hb: "Hebrews", jas: "James", "1pt": "1 Peter", "2pt": "2 Peter", "1jn": "1 John", "2jn": "2 John", "3jn": "3 John", jd: "Jude", ap: "Apocalypse" };
/* the Missal's abbreviations (Divinum Officium) → book codes; Old Testament lessons get no code */
const EPI_CODE = [[/^(1|I)\.? ?Cor/, "1co"], [/^(2|II)\.? ?Cor/, "2co"], [/^(1|I)\.? ?Thes/, "1th"], [/^(2|II)\.? ?Thes/, "2th"], [/^(1|I)\.? ?Tim/, "1tm"], [/^(2|II)\.? ?Tim/, "2tm"],
  [/^(1|I)\.? ?Pet/, "1pt"], [/^(2|II)\.? ?Pet/, "2pt"], [/^(1|I)\.? ?(Ioann|Joann|John)/, "1jn"], [/^(2|II)\.? ?(Ioann|Joann|John)/, "2jn"], [/^(3|III)\.? ?(Ioann|Joann|John)/, "3jn"],
  [/^Act/, "ac"], [/^Rom/, "rm"], [/^Gal/, "ga"], [/^Eph/, "eph"], [/^Phil(?!em)/, "ph"], [/^Col/, "col"], [/^Tit/, "ti"], [/^Philem/, "phm"], [/^Heb/, "hb"], [/^(Jac|Iac|Ias|Jas)/, "jas"], [/^(Jud|Iud)/, "jd"], [/^Apo/, "ap"]];
function parseEpiRef(ref) {
  const r = ref.replace(/\^/g, "").trim();
  const hit = EPI_CODE.find(([rx]) => rx.test(r));
  const m = r.match(/(\d+)\s*[:,]\s*(\d+)(?:\s*-\s*(\d+))?\.?\s*$/) || r.match(/(\d+)\s*[:,]\s*(\d+)(?:\s*-\s*(\d+))?/);
  return hit && m ? { b: hit[1], c: +m[1], v1: +m[2], v2: +(m[3] || m[2]) } : null;
}
function nextSunday(iso) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); return isoOf(d); }
function addDays(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return isoOf(d); }
const isRef = l => /^\^[^^]*\^$/.test(l) && /\d/.test(l) && l.length < 60;
/* the Gospel of a Mass: its reference, and the Latin and English lines after it */
function massGospel(day) {
  for (const [la, en] of day.sections || []) {
    const i = la.findIndex(l => /^\*Evangelium\*$/.test(l));
    if (i < 0) continue;
    const r = la.findIndex((l, k) => k > i && /^\^(Matt|Marc|Mark|Luc|Luke|Joann|Ioann|John) \d+:\d+/.test(l));
    if (r < 0) return null;
    const m = la[r].match(/^\^(\w+) (\d+):(\d+)(?:-(\d+))?/);
    const end = la.findIndex((l, k) => k > r && /Laus tibi/.test(l));
    const idx = []; for (let k = r + 1; k < (end < 0 ? la.length : end); k++) idx.push(k);
    /* the English column has its own line count: take its lines between its own reference and "Praise be to Thee" */
    const er = en.findIndex(l => /^\^(Matt|Marc|Mark|Luc|Luke|Joann|Ioann|John) \d+:\d+/.test(l));
    const ee = en.findIndex((l, k) => k > er && /Praise be to Thee|Laus tibi/.test(l));
    const enL = er < 0 ? [] : en.slice(er + 1, ee < 0 ? en.length : ee);
    const laL = idx.map(k => la[k]);
    return { b: GOSPEL_CODE[m[1]], c: +m[2], v1: +m[3], v2: +(m[4] || m[3]), ref: la[r].replace(/\^/g, ""), la: laL, en: laL.map((_, i) => (enL.length === laL.length ? enL[i] : i === 0 ? enL.join(" ") : "")) };
  }
  return null;
}
/* the Epistle (or lesson) of a Mass: "Léctio Epístolæ…", its reference, the text up to "Deo grátias" */
function massEpistle(day) {
  for (const [la, en] of day.sections || []) {
    if (la[0] !== "*Lectio*") continue;
    const r = la.findIndex(isRef);
    if (r < 0) return null;
    const body = l => !/^\^/.test(l) && !/^\*/.test(l);
    const laL = la.slice(r + 1).filter(body);
    const er = en.findIndex(isRef);
    const enL = (er < 0 ? en.slice(1) : en.slice(er + 1)).filter(body);
    const ref = la[r].replace(/\^/g, "").trim();
    return { ...(parseEpiRef(ref) || {}), ref, title: la[1] && !/^\^/.test(la[1]) ? la[1] : "", la: laL, en: laL.map((_, i) => (enL.length === laL.length ? enL[i] : i === 0 ? enL.join(" ") : "")) };
  }
  return null;
}
/* Latin and English lines side by side; when the counts differ, pair the runs between Scripture references instead */
function alignLines(laL, enL) {
  if (enL.length === laL.length) return laL.map((l, k) => [l, enL[k]]);
  const runs = ls => ls.reduce((a, l) => { if (isRef(l) || !a.length) a.push([l]); else a[a.length - 1].push(l); return a; }, []);
  const lr = runs(laL), er = runs(enL);
  if (lr.length !== er.length) return laL.map(l => [l, ""]);
  const out = [];
  lr.forEach((run, k) => {
    const e = er[k], head = isRef(run[0]) && isRef(e[0]);
    if (head) out.push([run[0], e[0]]);
    const lb = head ? run.slice(1) : run, eb = head ? e.slice(1) : e;
    if (lb.length === eb.length) lb.forEach((l, j) => out.push([l, eb[j]]));
    else lb.forEach((l, j) => out.push([l, j === 0 ? eb.join(" ") : ""]));
  });
  return out;
}
/* one proper of the Mass: the chant or prayer itself, without the rubrics, the dialogue and the standard conclusion */
const SP_PROPERS = [["Introitus", "Introit"], ["Oratio", "Collect"], ["Graduale", "Gradual"], ["Tractus", "Tract"], ["Sequentia", "Sequence"], ["Offertorium", "Offertory"], ["Secreta", "Secret"], ["Communio", "Communion"], ["Postcommunio", "Postcommunion"]];
const DIALOGUE = /Dóminus vobíscum|Et cum spíritu tuo|^Orémus\.?$|^\^℟\.\^ Amen\.?$|Glória Patri, et Fílio|Sicut erat in princípio|^\^[SM℣℟]\.\^ (Amen|Dóminus)|^er Dóminum|^er eúndem|^ui tecum|^ui vivis|^ui cum/;
const DIALOGUE_EN = /The Lord be with you|And with thy spirit|^Let us pray\.?$|^\^℟\.\^ Amen\.?$|Glory be to the Father|As it was in the beginning|^hrough|^ho liv|^ho with/;
function massProper(day, head) {
  for (const [la, en] of day.sections || []) {
    const i = la.findIndex(l => l === "*" + head + "*");
    if (i < 0) continue;
    const ei = en.findIndex(l => /^\*[^*]+\*$/.test(l) && l.length > 3);
    const keep = (l, rx) => l && !DIALOGUE.test(l) && !rx.test(l) && !/^\*.\*$/.test(l) && (!/^\^[^^]*\^$/.test(l) || isRef(l)) && !/^\*[^*]+\*$/.test(l) && !/^\{/.test(l);
    const laL = la.slice(i + 1).filter(l => keep(l, DIALOGUE_EN));
    const enL = ei < 0 ? [] : en.slice(ei + 1).filter(l => keep(l, DIALOGUE_EN));
    if (!laL.some(l => !isRef(l))) return null;
    return alignLines(laL, enL);
  }
  return null;
}
/* the antiphon of the Benedictus or the Magnificat: usually drawn from the Sunday's Gospel */
function canticleAnt(day, name) {
  for (const [la, en] of day.sections || []) {
    if (!la[0] || la[0].indexOf("Canticum: " + name) < 0) continue;
    const k = la.findIndex(l => /^\^Ant\.\^/.test(l));
    if (k < 0) return null;
    const ek = en.findIndex(l => /^\^Ant\.\^/.test(l));
    return [la[k].replace(/^\^Ant\.\^\s*/, ""), ek < 0 ? "" : en[ek].replace(/^\^Ant\.\^\s*/, "")];
  }
  return null;
}
/* the homily at Matins: the lesson whose heading names a homily or sermon, else the last lesson */
function matinsHomily(day) {
  let found = null;
  for (const [la, en] of day.sections || []) {
    const li = la.findIndex(l => /^\*Lectio \d+\*$/.test(l));
    if (li < 0) continue;
    const end = la.findIndex((l, k) => k > li && /Tu autem/.test(l));
    const hk = la.findIndex((l, k) => k > li && /^(Homil|Sermo|Ex Homil|Ex Sermone|Tractatus)/.test(l));
    const from = hk > 0 ? hk : li + 1;
    const lines = []; for (let k = from; k < (end < 0 ? la.length : end); k++) lines.push([la[k], en[k] || ""]);
    const item = { head: hk > 0 ? la[hk] : "", lines: lines.filter(([l]) => !/^\^[^^]*\^$/.test(l) || hk < 0) };
    if (hk > 0) found = item; else if (!found || !found.head) found = item;
  }
  return found;
}
const overlaps = (r, g) => r.c === g.c && r.v1 <= g.v2 && r.v2 >= g.v1;
/* St Thomas's lectures on these verses: the parts of the lectura, in order, with the verses each covers */
function useLectura(g) {
  const [res, setRes] = useState(null);
  useEffect(() => {
    if (!g || !g.b) { setRes(null); return; }
    let alive = true; setRes(null);
    Promise.all([libGet("lectura-map"), libGet("index").catch(() => null)]).then(([map, idx]) => {
      const titleOf = (wid, ci) => { const w = idx && idx.works.find(x => x.id === wid); return w && w.chapters[ci] ? w.chapters[ci] : ""; };
      const parts = [];
      for (const [c, a, z, wid, ci] of map[g.b] || []) {
        if (c !== g.c || a > g.v2 || z < g.v1) continue;
        const p = parts.find(x => x.wid === wid && x.ci === ci);
        if (p) { p.a = Math.min(p.a, a); p.z = Math.max(p.z, z); } else parts.push({ wid, ci, a: Math.max(a, g.v1), z: Math.min(z, g.v2), t: titleOf(wid, ci) });
      }
      if (alive) setRes({ parts, hasWork: !!(map[g.b] || []).length });
    }).catch(() => alive && setRes({ parts: [], err: true }));
    return () => { alive = false; };
  }, [g && g.b, g && g.c, g && g.v1, g && g.v2]);
  return res;
}
/* the Catechism and the Vatican documents that cite these verses (in the text or in a note) */
function useChurchDocs(g) {
  const [res, setRes] = useState(null);
  useEffect(() => {
    if (!g || !g.b || !NT_NAME[g.b]) { setRes(null); return; }
    let alive = true; setRes(null);
    Promise.all([libGet("vc/" + g.b).catch(e => (/404/.test(String(e)) ? {} : Promise.reject(e))), libGet("va-index")]).then(([vc, idx]) => {
      const byId = {}; idx.works.forEach(w => { byId[w.id] = w; });
      const rows = (vc[String(g.c)] || []).filter(([a, z]) => z !== 999 && a <= g.v2 && z >= g.v1);
      const ccc = [], docs = new Map();
      for (const [a, z, wid, ci, lab] of rows) {
        if (wid === "va-ccc") { if (lab && !ccc.some(x => x.lab === lab)) ccc.push({ lab, ci, a, z }); continue; }
        const w = byId[wid]; if (!w) continue;
        const d = docs.get(wid) || { w, parts: [] };
        if (!d.parts.some(p => p.ci === ci)) d.parts.push({ ci, lab, a, z });
        docs.set(wid, d);
      }
      ccc.sort((x, y) => +x.lab - +y.lab);
      const rank = { vat2: 0, councils: 1, popes: 2, curia: 3, law: 4, liturgy: 5 };
      const list = [...docs.values()].sort((x, y) => ((rank[x.w.sec] ?? 6) - (rank[y.w.sec] ?? 6)) || (y.w.date || "").localeCompare(x.w.date || ""));
      if (alive) setRes({ ccc, docs: list });
    }).catch(() => alive && setRes({ ccc: [], docs: [], err: true }));
    return () => { alive = false; };
  }, [g && g.b, g && g.c, g && g.v1, g && g.v2]);
  return res;
}
const verseLabel = (g, a, z) => (a === z ? `v. ${a}` : `vv. ${a}–${z}`);
const SP_SECTION = "flex scroll-mt-16 flex-col gap-2 rounded-lg border border-rule bg-leaf px-5 py-4";
const SP_H3 = "smallcaps text-[14px] font-semibold text-rubric";
/* a folded part of a Library work, loaded when it is opened */
function LazyPart({ wid, ci, label, sub, open0, pair, onOpen }) {
  const [open, setOpen] = useState(!!open0);
  const [work, setWork] = useState(null), [err, setErr] = useState(false);
  useEffect(() => { if (open && !work) libGet(wid).then(setWork).catch(() => setErr(true)); }, [open]);
  const ch = work && work.chapters[ci];
  return (
    <details open={open} onToggle={e => setOpen(e.currentTarget.open)} className="rounded-md border border-rule bg-paper px-3 py-2">
      <summary className="cursor-pointer text-[14px] font-semibold text-ink">{label}{sub && <span className="font-normal text-soft"> · {sub}</span>}</summary>
      {open && <div className="mt-2 flex flex-col gap-3">
        {err ? <p className="text-[14px] text-warn">This didn’t load. Check your connection and try again.</p>
          : !ch ? <p className="text-[14px] text-soft">Loading…</p>
          : ch.paras.map((p, i) => pair(p, ch.en ? ch.en[i] : "", i))}
        {onOpen && <button type="button" className="self-start text-[13px] text-rubric underline underline-offset-2" onClick={() => onOpen(wid, ci)}>Open in the Library</button>}
      </div>}
    </details>
  );
}
/* Catechism paragraphs, shown in full when opened */
function CccParas({ items, pair, onOpen }) {
  const [open, setOpen] = useState(false);
  const [ccc, setCcc] = useState(null), [err, setErr] = useState(false);
  useEffect(() => { if (open && !ccc) libGet("va-ccc").then(setCcc).catch(() => setErr(true)); }, [open]);
  const paraOf = it => { const ch = ccc && ccc.chapters[it.ci]; if (!ch) return null; const k = ch.paras.findIndex(p => new RegExp("^\\s*" + it.lab + "\\b").test(p)); return k < 0 ? null : [ch.paras[k], ch.en ? ch.en[k] : ""]; };
  return (
    <details open={open} onToggle={e => setOpen(e.currentTarget.open)} className="rounded-md border border-rule bg-paper px-3 py-2">
      <summary className="cursor-pointer text-[14px] font-semibold text-ink">Catechism of the Catholic Church <span className="font-normal text-soft">· {items.length === 1 ? "§ " : "§§ "}{items.map(x => x.lab).join(", ")}</span></summary>
      {open && <div className="mt-2 flex flex-col gap-3">
        {err ? <p className="text-[14px] text-warn">The Catechism didn’t load. Check your connection and try again.</p>
          : !ccc ? <p className="text-[14px] text-soft">Loading…</p>
          : items.map(it => { const p = paraOf(it); return (
            <div key={it.lab} className="flex flex-col gap-1">
              {p ? pair(p[0], p[1], it.lab) : <p className="text-[14px] text-soft">§ {it.lab}</p>}
              {onOpen && <button type="button" className="self-start text-[12px] text-rubric underline underline-offset-2" onClick={() => onOpen("va-ccc", it.ci, (p && (p[0].match(/[A-Za-zÀ-ÿ]{5,}/) || [""])[0]) || "")}>§ {it.lab} in the Library</button>}
            </div>); })}
        <p className="text-[12px] text-soft">Editio typica latina (1997). The English is the Vatican’s where the Library has it.</p>
      </div>}
    </details>
  );
}
function ChurchDocs({ g, res, pair, onOpen }) {
  const [all, setAll] = useState(false);
  if (!res) return <p className="text-[14px] text-soft">Loading…</p>;
  if (res.err) return <p className="text-[14px] text-warn">The Vatican documents didn’t load. Check your connection and try again.</p>;
  if (!res.ccc.length && !res.docs.length) return <p className="text-[14px] text-soft">No document on the Vatican shelf cites {NT_NAME[g.b]} {g.c}:{g.v1}{g.v2 !== g.v1 ? "–" + g.v2 : ""}.</p>;
  const shown = all ? res.docs : res.docs.slice(0, 8);
  return (
    <div className="flex flex-col gap-2">
      {res.ccc.length > 0 && <CccParas items={res.ccc} pair={pair} onOpen={onOpen} />}
      {shown.length > 0 && <ul className="flex flex-col gap-1.5">
        {shown.map(({ w, parts }) => (
          <li key={w.id}>
            <button type="button" onClick={() => onOpen && onOpen(w.id, parts[0].ci)} className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-left hover:border-soft">
              <span lang="la" className="latin block text-[14px] font-semibold text-ink">{w.title}</span>
              <span className="block text-[12px] text-soft">{w.author}{w.ay ? ` · ${w.ay}` : ""} · {parts.map(p => (w.chapters[p.ci] || "").replace(/^.* · /, "") + (p.lab ? " (" + p.lab + ")" : "")).slice(0, 3).join("; ")}{parts.length > 3 ? "…" : ""} · {verseLabel(g, parts[0].a, parts[0].z)}</span>
            </button>
          </li>
        ))}
      </ul>}
      {res.docs.length > 8 && <button type="button" className="self-start text-[13px] text-rubric underline underline-offset-2" onClick={() => setAll(x => !x)}>{all ? "Show fewer" : `Show all ${res.docs.length} documents`}</button>}
    </div>
  );
}
function LecturaParts({ g, res, pair, onOpen }) {
  if (!res) return <p className="text-[14px] text-soft">Loading…</p>;
  if (res.err) return <p className="text-[14px] text-warn">St Thomas’s lectures didn’t load. Check your connection and try again.</p>;
  if (!res.parts.length) return <p className="text-[14px] text-soft">{res.hasWork ? "The Library’s copy of this lectura has no text for these verses." : `St Thomas left no lectura on ${NT_NAME[g.b] || "this book"}.`}</p>;
  return res.parts.map((p, n) => <LazyPart key={p.wid + p.ci} wid={p.wid} ci={p.ci} open0={n === 0} label={`${NT_NAME[g.b]} ${g.c}, ${verseLabel(g, p.a, p.z)}`} sub={[p.t, p.wid === "ct-super-matthaeum-petri-de-scala" ? "reportatio Petri de Scala" : ""].filter(Boolean).join(", ")} pair={pair} onOpen={onOpen} />);
}
function SundayPrep({ onTap, onTable, onOpen }) {
  const today = isoOf(new Date());
  const [date, setDate] = useState(() => nextSunday(today));
  const [mass, setMass] = useState(null);
  const [mat, setMat] = useState(null);
  const [hours, setHours] = useState(null);   // { l, v, sat }: Lauds, Vespers, Saturday's Vespers
  const [cat, setCat] = useState(null);       // { work, lectios: [chapter index] }
  const [cites, setCites] = useState(null);
  const [sidx, setSidx] = useState(null);
  const [err, setErr] = useState("");
  const [en, setEn] = useState(true);
  const help = useWordHelp(() => libGet("forms"), onTap);
  useEffect(() => {
    let alive = true; setMass(null); setMat(null); setHours(null); setCat(null); setCites(null); setErr("");
    Promise.all([officeDay(date, "x"), officeDay(date, "m")]).then(([x, m]) => {
      if (!alive) return;
      if (x.missing) { setErr("This calendar doesn’t reach that date yet."); return; }
      setMass(x); setMat(m);
    }).catch(() => alive && setErr("The day didn’t load. Check your connection and try again."));
    Promise.all([officeDay(date, "l"), officeDay(date, "v"), officeDay(addDays(date, -1), "v").catch(() => null)])
      .then(([l, v, sat]) => alive && setHours({ l, v, sat })).catch(() => alive && setHours({}));
    return () => { alive = false; };
  }, [date]);
  const gos = mass ? massGospel(mass) : null;
  const epi = mass ? massEpistle(mass) : null;
  useEffect(() => {
    if (!gos) return;
    let alive = true;
    libGet("catena-map").then(async map => {
      const hits = (map[gos.b] || []).filter(([c, a, z]) => c === gos.c && a <= gos.v2 && z >= gos.v1).map(x => x[3]);
      if (!hits.length) { if (alive) setCat({ work: null, lectios: [] }); return; }
      const work = await libGet("catena-" + gos.b);
      if (alive) setCat({ work, lectios: hits });
    }).catch(() => alive && setCat({ work: null, lectios: [], err: true }));
    getJSON("data/summa/cites.json").then(c => { if (alive) setCites((c[gos.b] || {})[String(gos.c)] || []); }).catch(() => alive && setCites([]));
    if (!sidx) loadSummaIndex().then(s => alive && setSidx(s)).catch(() => {});
    return () => { alive = false; };
  }, [gos && gos.b, gos && gos.c, gos && gos.v1, gos && gos.v2]);
  const lecG = useLectura(gos), lecE = useLectura(epi && epi.b ? epi : null);
  const docsG = useChurchDocs(gos), docsE = useChurchDocs(epi && epi.b ? epi : null);
  const hom = mat ? matinsHomily(mat) : null;
  const propers = mass ? SP_PROPERS.map(([k, name]) => [name, massProper(mass, k)]).filter(([, p]) => p) : [];
  const ants = [];
  if (hours) {
    const satIsSunday = hours.sat && !hours.sat.missing && hours.sat.ht && /Dominica/.test(hours.sat.ht.v || "");
    const a1 = satIsSunday ? canticleAnt(hours.sat, "Magnificat") : null, b = hours.l && !hours.l.missing ? canticleAnt(hours.l, "Benedictus") : null, a2 = hours.v && !hours.v.missing ? canticleAnt(hours.v, "Magnificat") : null;
    if (a1) ants.push(["At the Magnificat, I Vespers (Saturday)", a1]);
    if (b) ants.push(["At the Benedictus, Lauds", b]);
    if (a2 && (!a1 || a2[0] !== a1[0])) ants.push(["At the Magnificat, II Vespers", a2]);
  }
  /* Summa articles citing the chapter, the ones whose quotation shares most words with this Gospel first */
  const gw = new Set(gos ? gos.la.join(" ").split(/[^A-Za-zÀ-ÿæœ]+/).map(normForm).filter(w => w.length > 3) : []);
  const ranked = (cites || []).map(c => ({ c, s: (c[3] || "").split(/[^A-Za-z]+/).map(normForm).filter(w => gw.has(w)).length })).sort((a, b) => b.s - a.s).slice(0, 10);
  const artTitle = (p, q, a) => { const part = sidx && sidx.parts.find(x => x.id === p), qr = part && part.qs.find(x => x[0] === q); return qr ? (qr[2][a - 1] || qr[1]) : ""; };
  const lat = "lt latin text-[1.05rem] leading-[1.75] text-ink";
  const pair = (la, e, i) => isRef(la)
    ? <p key={i} className="text-[12px] text-soft">{la.replace(/\^/g, "")}</p>
    : (
      <div key={i} className={en && e ? "grid gap-x-6 gap-y-1 sm:grid-cols-2" : ""}>
        <p lang="la" className={lat}><OfficeText line={la} latin onWord={help.pick} sel={help.word} /></p>
        {en && e && <p lang="en" className="text-[15px] leading-snug text-soft"><OfficeText line={e} /></p>}
      </div>
    );
  const title = mass && !mass.missing ? (mass.ht && mass.ht.x ? mass.ht.x.split(" ~ ")[0] : mass.t) : "";
  const gref = g => `${NT_NAME[g.b] || ""} ${g.c}:${g.v1}${g.v2 !== g.v1 ? "–" + g.v2 : ""}`;
  const nav = [propers.length && ["sp-propers", "Propers"], epi && ["sp-epistle", "Epistle"], gos && ["sp-gospel", "Gospel"], hom && hom.lines.length && ["sp-homily", "Homily"],
    gos && ["sp-fathers", "Fathers"], gos && ["sp-thomas", "St Thomas"], gos && ["sp-church", "Catechism & Church"]].filter(Boolean);
  const jump = id => { const el = document.getElementById(id); if (el) el.scrollIntoView({ block: "start", behavior: "smooth" }); };
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Sunday">
        <div className="flex flex-wrap items-center gap-2">
          <Btn onClick={() => setDate(d => addDays(d, -7))} aria-label="Previous Sunday">‹</Btn>
          <label htmlFor="sunday-date" className="sr-only">Sunday</label>
          <input id="sunday-date" type="date" value={date} onChange={e => e.target.value && setDate(nextSunday(e.target.value))} className="rounded-md border border-rule bg-paper px-2 py-1.5 text-[15px] text-ink" />
          <Btn onClick={() => setDate(d => addDays(d, 7))} aria-label="Next Sunday">›</Btn>
          {date !== nextSunday(today) && <Btn onClick={() => setDate(nextSunday(today))}>This Sunday</Btn>}
          <label className="ml-auto flex items-center gap-2 text-[14px] text-ink"><input type="checkbox" checked={en} onChange={e => setEn(e.target.checked)} className="h-4 w-4 accent-[var(--rubric)]" />English</label>
        </div>
        {title && <h2 lang="la" className="latin mt-2 text-[1.15rem] font-bold text-ink">{title}</h2>}
        <p className="mt-1 text-[13px] text-soft">For preaching or for lectio: the Mass, the Fathers, St Thomas and the Church’s teaching on this Sunday’s Gospel and Epistle. Tap any Latin word for its parsing.</p>
        {nav.length > 2 && <nav aria-label="On this page" className="mt-2 flex flex-wrap gap-1.5">
          {nav.map(([id, name]) => <button key={id} type="button" onClick={() => jump(id)} className="rounded-full border border-rule bg-paper px-2.5 py-0.5 text-[13px] text-ink hover:border-soft">{name}</button>)}
        </nav>}
      </section>
      {err && <p className="text-[14px] text-warn">{err}</p>}
      {!err && !mass && <p className="text-[15px] text-soft">Loading…</p>}
      {propers.length > 0 && (
        <section id="sp-propers" className={SP_SECTION} aria-label="The proper of the Mass">
          <h3 className={SP_H3}>The proper of the Mass</h3>
          {propers.map(([name, lines], n) => (
            <details key={name} open={n === 0} className="rounded-md border border-rule bg-paper px-3 py-2">
              <summary className="cursor-pointer text-[14px] font-semibold text-ink">{name}{lines.find(([l]) => isRef(l)) ? <span className="font-normal text-soft"> · {lines.find(([l]) => isRef(l))[0].replace(/\^/g, "")}</span> : null}</summary>
              <div className="mt-2 flex flex-col gap-2">{lines.filter(([l], k) => !(k === 0 && isRef(l))).map(([l, e], i) => pair(l, e, i))}</div>
            </details>
          ))}
        </section>
      )}
      {epi && (
        <section id="sp-epistle" className={SP_SECTION} aria-label="The Epistle">
          <h3 className={SP_H3}>The Epistle · {epi.b ? gref(epi) : epi.ref}</h3>
          {epi.title && <p lang="la" className="latin text-[14px] text-soft">{epi.title}</p>}
          {epi.la.map((l, i) => pair(l, epi.en[i], i))}
          {epi.b && <>
            <h4 className="mt-2 text-[13px] font-semibold text-ink">St Thomas on these verses</h4>
            <LecturaParts g={epi} res={lecE} pair={pair} onOpen={onOpen} />
            <h4 className="mt-2 text-[13px] font-semibold text-ink">The Catechism and the Church’s documents</h4>
            <ChurchDocs g={epi} res={docsE} pair={pair} onOpen={onOpen} />
          </>}
        </section>
      )}
      {mass && !gos && <p className="text-[14px] text-soft">No Gospel was found for this day’s Mass.</p>}
      {gos && (
        <section id="sp-gospel" className={SP_SECTION} aria-label="The Gospel">
          <h3 className={SP_H3}>The Gospel · {GOSPEL_NAME[gos.b]} {gos.c}:{gos.v1}{gos.v2 !== gos.v1 ? "–" + gos.v2 : ""}</h3>
          {gos.la.map((l, i) => pair(l, gos.en[i], i))}
          {ants.length > 0 && <div className="mt-2 flex flex-col gap-2 border-t border-rule pt-2">
            <h4 className="text-[13px] font-semibold text-ink">The Gospel antiphons of the Office</h4>
            {ants.map(([where, [la, e]]) => <div key={where} className="flex flex-col gap-0.5"><span className="text-[12px] text-soft">{where}</span>{pair(la, e, where)}</div>)}
          </div>}
        </section>
      )}
      {hom && hom.lines.length > 0 && (
        <section id="sp-homily" className={SP_SECTION} aria-label="The homily at Matins">
          <h3 className={SP_H3}>The homily at Matins{hom.head ? <span className="font-normal normal-case text-soft"> · <span lang="la" className="latin">{hom.head.replace(/\^/g, "")}</span></span> : null}</h3>
          {hom.lines.filter(([l]) => l !== hom.head).map(([l, e], i) => pair(l, e, i))}
        </section>
      )}
      {gos && cat && (
        <section id="sp-fathers" className={SP_SECTION} aria-label="Catena Aurea">
          <h3 className={SP_H3}>The Fathers on these verses · Catena Aurea</h3>
          {cat.err ? <p className="text-[14px] text-warn">The Catena didn’t load. Check your connection and try again.</p>
            : !cat.lectios.length ? <p className="text-[14px] text-soft">St Thomas’s Catena has no lectio for these verses.</p>
            : cat.lectios.map((ci, n) => {
              const ch = cat.work.chapters[ci];
              const body = ch.head ? ch.paras.slice(1) : ch.paras, eb = ch.en ? (ch.head ? ch.en.slice(1) : ch.en) : [];
              return (
                <details key={ci} open={n === 0} className="rounded-md border border-rule bg-paper px-3 py-2">
                  <summary className="cursor-pointer text-[14px] font-semibold text-ink">{ch.title} <span className="font-normal text-soft">· {body.length} passages</span></summary>
                  <div className="mt-2 flex flex-col gap-3">
                    {body.map((p, i) => pair(p, eb[i], i))}
                    {onOpen && <button type="button" className="self-start text-[13px] text-rubric underline underline-offset-2" onClick={() => onOpen("catena-" + gos.b, ci)}>Open in the Library</button>}
                  </div>
                </details>
              );
            })}
        </section>
      )}
      {gos && (
        <section id="sp-thomas" className={SP_SECTION} aria-label="St Thomas">
          <h3 className={SP_H3}>St Thomas on {GOSPEL_NAME[gos.b]} {gos.c}</h3>
          <h4 className="text-[13px] font-semibold text-ink">His lectures on the Gospel</h4>
          <LecturaParts g={gos} res={lecG} pair={pair} onOpen={onOpen} />
          <h4 className="mt-2 text-[13px] font-semibold text-ink">The Summa Theologiae</h4>
          {!cites ? <p className="text-[14px] text-soft">Loading…</p> : !ranked.length ? <p className="text-[14px] text-soft">The Summa doesn’t cite this chapter.</p> : (
            <ul className="flex flex-col gap-1.5">
              {ranked.map(({ c: [p, q, a, quote] }) => (
                <li key={`${p}-${q}-${a}`}>
                  <button type="button" onClick={() => onOpen && onOpen("summa", 0, null, { p, q, a })} className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-left hover:border-soft">
                    <span className="block text-[14px] font-semibold text-ink">Summa {SM_PART[p]}, q. {q}, a. {a}<span className="font-normal text-soft">{artTitle(p, q, a) ? " · " + artTitle(p, q, a) : ""}</span></span>
                    {quote && <span lang="la" className="latin block text-[14px] leading-snug text-soft">“{quote}…”</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {ranked.length > 0 && <p className="text-[12px] text-soft">Articles that quote {GOSPEL_NAME[gos.b]} {gos.c}, those quoting these verses’ words first.</p>}
        </section>
      )}
      {gos && (
        <section id="sp-church" className={SP_SECTION} aria-label="The Catechism and the Church's documents">
          <h3 className={SP_H3}>The Catechism and the Church’s documents on {gref(gos)}</h3>
          <ChurchDocs g={gos} res={docsG} pair={pair} onOpen={onOpen} />
          <p className="text-[12px] text-soft">Documents on the Library’s Vatican shelf that cite these verses, in the text or in a note: the councils first, then the popes (newest first), the Curia and the liturgical books. Found by their references, so a loose citation can slip in.</p>
        </section>
      )}
      {help.panel(`Sunday preparation, ${date}`, onTable)}
    </div>
  );
}
