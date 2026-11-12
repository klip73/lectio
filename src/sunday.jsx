/* ---------- Sunday preparation: everything for preaching on one Sunday's Gospel ----------
   The Gospel of the Mass and the homily of Matins (Latin and English), St Thomas's Catena Aurea on those very verses
   (the Fathers, in Latin with the Oxford English), and the Summa articles that cite that Gospel chapter. */
const GOSPEL_NAME = { mt: "Matthew", mk: "Mark", lk: "Luke", jn: "John" };
function nextSunday(iso) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); return isoOf(d); }
function addDays(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return isoOf(d); }
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
function SundayPrep({ onTap, onTable, onOpen }) {
  const today = isoOf(new Date());
  const [date, setDate] = useState(() => nextSunday(today));
  const [mass, setMass] = useState(null);
  const [mat, setMat] = useState(null);
  const [cat, setCat] = useState(null);       // { work, lectios: [chapter index] }
  const [cites, setCites] = useState(null);
  const [sidx, setSidx] = useState(null);
  const [err, setErr] = useState("");
  const [en, setEn] = useState(true);
  const help = useWordHelp(() => libGet("forms"), onTap);
  useEffect(() => {
    let alive = true; setMass(null); setMat(null); setCat(null); setCites(null); setErr("");
    Promise.all([officeDay(date, "x"), officeDay(date, "m")]).then(([x, m]) => {
      if (!alive) return;
      if (x.missing) { setErr("This calendar doesn’t reach that date yet."); return; }
      setMass(x); setMat(m);
    }).catch(() => alive && setErr("The day didn’t load. Check your connection and try again."));
    return () => { alive = false; };
  }, [date]);
  const gos = mass ? massGospel(mass) : null;
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
  const hom = mat ? matinsHomily(mat) : null;
  /* Summa articles citing the chapter, the ones whose quotation shares most words with this Gospel first */
  const gw = new Set(gos ? gos.la.join(" ").split(/[^A-Za-zÀ-ÿæœ]+/).map(normForm).filter(w => w.length > 3) : []);
  const ranked = (cites || []).map(c => ({ c, s: (c[3] || "").split(/[^A-Za-z]+/).map(normForm).filter(w => gw.has(w)).length })).sort((a, b) => b.s - a.s).slice(0, 10);
  const artTitle = (p, q, a) => { const part = sidx && sidx.parts.find(x => x.id === p), qr = part && part.qs.find(x => x[0] === q); return qr ? (qr[2][a - 1] || qr[1]) : ""; };
  const lat = "lt latin text-[1.05rem] leading-[1.75] text-ink";
  const pair = (la, e, i) => (
    <div key={i} className={en && e ? "grid gap-x-6 gap-y-1 sm:grid-cols-2" : ""}>
      <p lang="la" className={lat}><OfficeText line={la} latin onWord={help.pick} sel={help.word} /></p>
      {en && e && <p lang="en" className="text-[15px] leading-snug text-soft"><OfficeText line={e} /></p>}
    </div>
  );
  const title = mass && !mass.missing ? (mass.ht && mass.ht.x ? mass.ht.x.split(" ~ ")[0] : mass.t) : "";
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
        <p className="mt-1 text-[13px] text-soft">For preaching or for lectio: the Gospel, the Fathers on it, and St Thomas. Tap any Latin word for its parsing.</p>
      </section>
      {err && <p className="text-[14px] text-warn">{err}</p>}
      {!err && !mass && <p className="text-[15px] text-soft">Loading…</p>}
      {mass && !gos && <p className="text-[14px] text-soft">No Gospel was found for this day’s Mass.</p>}
      {gos && (
        <section className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="The Gospel">
          <h3 className="smallcaps text-[14px] font-semibold text-rubric">The Gospel · {GOSPEL_NAME[gos.b]} {gos.c}:{gos.v1}{gos.v2 !== gos.v1 ? "–" + gos.v2 : ""}</h3>
          {gos.la.map((l, i) => pair(l, gos.en[i], i))}
        </section>
      )}
      {hom && hom.lines.length > 0 && (
        <section className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="The homily at Matins">
          <h3 className="smallcaps text-[14px] font-semibold text-rubric">The homily at Matins{hom.head ? <span className="font-normal normal-case text-soft"> · <span lang="la" className="latin">{hom.head.replace(/\^/g, "")}</span></span> : null}</h3>
          {hom.lines.filter(([l]) => l !== hom.head).map(([l, e], i) => pair(l, e, i))}
        </section>
      )}
      {gos && cat && (
        <section className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Catena Aurea">
          <h3 className="smallcaps text-[14px] font-semibold text-rubric">The Fathers on these verses · Catena Aurea</h3>
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
      {gos && cites && (
        <section className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="St Thomas">
          <h3 className="smallcaps text-[14px] font-semibold text-rubric">St Thomas on {GOSPEL_NAME[gos.b]} {gos.c} · Summa Theologiae</h3>
          {!ranked.length ? <p className="text-[14px] text-soft">The Summa doesn’t cite this chapter.</p> : (
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
          <p className="text-[12px] text-soft">Articles that quote {GOSPEL_NAME[gos.b]} {gos.c}, those quoting these verses’ words first.</p>
        </section>
      )}
      {help.panel(`Sunday preparation, ${date}`, onTable)}
    </div>
  );
}
