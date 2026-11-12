/* ---------- Exam sitting: one part, or a full five-part mock ---------- */
const EXAM_KEY = "lectio-vulgata-exam";
const WC = t => (t.match(WORD_RE) || []).length;
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const SIZES = { short: { w: 25, label: "Short (about 25 words, 1–2 sentences)" }, medium: { w: 50, label: "Medium (about 50 words)" }, long: { w: 100, label: "Long (about 100 words, written-exam size)" } };
const SENT_RE = /[^.;:?!]+[.;:?!]+["”’)]*\s*|[^.;:?!]+$/g;
async function pickSection(part, size, blind) {
  const target = (SIZES[size] || SIZES.short).w;
  const { idx } = await loadPassages();
  const all = idx[part] || [];
  let pool = all.filter(r => r[3] >= 25 && r[3] <= 90);
  if (blind && BLIND_PARTS.has(part)) { const fresh = pool.filter(r => !familiar(r[0], r[1])); if (fresh.length) pool = fresh; }
  const src = pool.length ? pool : all;
  const r = src[Math.floor(Math.random() * src.length)];
  const [code, c, v] = r;
  const book = await loadBook(code);
  const ch = book.ch[c - 1];
  const at = Math.max(0, ch.findIndex(x => x[0] === v));
  let v1 = at + 1, v2 = at + 1, excerpt = 0;
  if (part === "nt" || part === "ps" || part === "hy") {
    if (part === "hy" && size === "long") { v1 = 1; v2 = ch.length; }
    else {
      let i = at, j = at, w = WC(ch[at][1]);
      while (w < target && j + 1 < ch.length) { j++; w += WC(ch[j][1]); }
      while (w < target && i > 0) { i--; w += WC(ch[i][1]); }
      v1 = i + 1; v2 = j + 1;
    }
  } else if (part === "st") {
    if (size === "long") {
      let i = ch.findIndex(x => x[4] === "Respondeo"); if (i < 0) i = at;
      let j = i, w = WC(ch[i][1]);
      while (w < 110 && j + 1 < ch.length) { j++; w += WC(ch[j][1]); }
      v1 = i + 1; v2 = j + 1;
    } else {
      // the section of this article closest in length to the target
      let best = at, bd = 1e9;
      ch.forEach((x, k) => { const d = Math.abs(WC(x[1]) - target); if (d < bd) { bd = d; best = k; } });
      v1 = v2 = best + 1;
      if (WC(ch[best][1]) > target * 1.8) excerpt = target;
    }
  } else {
    v1 = 1; v2 = ch.length;
    if (size !== "long") excerpt = target;
  }
  return { part, b: code, c, v1, v2, d: r[3] / 100, excerpt, text: "" };
}
/* ---------- A mock exam from today's liturgy ----------
   Part 1: the Gospel of today's Mass; 2: a Summa article that cites that Gospel chapter (its respondeo); 3: the last
   lesson of today's Matins (the homily or the saint's life); 4: today's Matins hymn; 5: the first psalm of Vespers.
   Parts the day doesn't supply are drawn as usual. Office texts carry their own rows (Latin, English, word ids). */
const GOSPEL_CODE = { Matt: "mt", Marc: "mk", Mark: "mk", Luc: "lk", Luke: "lk", Joann: "jn", Ioann: "jn", John: "jn" };
const unmark = l => l.replace(/\^[^^]*\^/g, "").replace(/\{[^}]*\}/g, "").replace(/\s+/g, " ").trim();
async function wordIds(latin) {
  const forms = await libGet("forms");
  return (latin.match(/[A-Za-zÀ-ÿæœÆŒ]+/g) || []).map(w => { const f = forms[normForm(w)]; return f ? (f.length === 1 ? f[0] : f) : -1; });
}
async function officeRows(pairs) {
  return Promise.all(pairs.map(async ([la, en], i) => [i + 1, la, en, await wordIds(la)]));
}
function capWords(pairs, target) {
  const out = []; let w = 0;
  for (const p of pairs) { out.push(p); w += WC(p[0]); if (w >= target) break; }
  return out;
}
async function officeMock(size, blind) {
  const iso = isoOf(new Date());
  const target = (SIZES[size] || SIZES.short).w;
  const secs = {};
  const [mass, mat, ves] = await Promise.all(["x", "m", "v"].map(h => officeDay(iso, h).catch(() => null)));
  const day = mass && !mass.missing ? mass.t : "";
  let gos = null;
  /* 1. The Gospel of the Mass, from the app's New Testament (so word help and marking work as usual) */
  if (mass && mass.sections) for (const [la] of mass.sections) {
    const i = la.findIndex(l => /^\*Evangelium\*$/.test(l));
    if (i < 0) continue;
    const ref = la.slice(i).map(l => l.match(/^\^(Matt|Marc|Mark|Luc|Luke|Joann|Ioann|John) (\d+):(\d+)(?:-(\d+))?/)).find(Boolean);
    if (ref) gos = { b: GOSPEL_CODE[ref[1]], c: +ref[2], v1: +ref[3], v2: +(ref[4] || ref[3]) };
    break;
  }
  if (gos) {
    const book = await loadBook(gos.b);
    const ch = book.ch[gos.c - 1] || [];
    let v2 = gos.v1, w = 0;
    for (const v of ch) { if (v[0] < gos.v1 || v[0] > gos.v2) continue; v2 = v[0]; w += WC(v[1]); if (w >= target) break; }
    secs.nt = { part: "nt", b: gos.b, c: gos.c, v1: gos.v1, v2, d: 0.5, excerpt: 0, text: "", from: "Today’s Gospel" };
  }
  /* 2. A Summa article citing that Gospel chapter: its respondeo */
  try {
    const cites = gos ? (await getJSON("data/summa/cites.json"))[gos.b] : null;
    const list = cites && cites[String(gos.c)];
    if (list && list.length) {
      const [p, qn, a] = list[Math.floor(Math.random() * list.length)];
      const q = await loadSummaQ(p, qn);
      const paras = q.a[a - 1] || [];
      let role = null, j0 = -1;
      paras.forEach((par, j) => { role = stPart(par, role); if (role === "resp" && j0 < 0) j0 = j; });
      if (j0 >= 0) {
        const e = q.e ? q.e[a - 1] : null;
        const la = paras[j0], en = e && e.b ? e.b.join(" ") : "";
        const sents = la.match(SENT_RE) || [la];
        let txt = "", w = 0;
        for (const t of sents) { txt += t; w += WC(t); if (w >= target) break; }
        txt = txt.trim();
        const ids = (q.w[a - 1] || [])[j0] || [];
        secs.st = { part: "st", b: "", c: 0, v1: 1, v2: 1, d: 0.6, excerpt: 0, text: "", label: `Summa ${SM_PART[p]}, q. ${qn}, a. ${a} · Respondeo`, sub: "cites today’s Gospel",
          rows: [[1, txt, en, ids.slice(0, WC(txt)), "Respondeo", WC(txt) < WC(la) - 3]] };
      }
    }
  } catch (e) {}
  /* 3. The last lesson of Matins, 4. its hymn */
  if (mat && mat.sections) {
    let lesson = null, hymn = null;
    for (const [la, en] of mat.sections) {
      const hi = la.findIndex(l => /^\*Hymnus\*$/.test(l));
      if (hi >= 0 && !hymn) {
        const st = [];
        let cur = null;
        for (let k = hi + 1; k < la.length; k++) {
          const l = la[k], e = en[k] || "";
          if (/^\{/.test(l)) continue;
          const dc = l.match(/^\*(\S)\*$/);
          if (dc) { cur = { la: [], en: [] }; st.push(cur); la[k + 1] = dc[1] + la[k + 1]; const de = e.match(/^\*(\S)\*$/); if (de && en[k + 1] != null) en[k + 1] = de[1] + en[k + 1]; continue; }
          if (/^\*/.test(l) || /^\^/.test(l)) break;
          if (!cur) { cur = { la: [], en: [] }; st.push(cur); }
          cur.la.push(unmark(l)); cur.en.push(unmark(e));
        }
        if (st.length) hymn = st;
      }
      const li = la.findIndex(l => /^\*Lectio \d+\*$/.test(l));
      if (li >= 0) {
        const end = la.findIndex((l, k) => k > li && /Tu autem/.test(l));
        const body = [];
        for (let k = li + 1; k < (end < 0 ? la.length : end); k++) {
          const l = la[k];
          if (/^\^/.test(l) && unmark(l) === "") continue;            // a reference line
          if (/^(Homil|Sermo|Léctio|Lectio|De |Ex )/.test(l) && l.length < 90) continue;   // the lesson's heading
          if (/^\^[^^]+\^$/.test(l)) continue;
          body.push([unmark(l), unmark(en[k] || "")]);
        }
        if (body.length && body.some(b => WC(b[0]) > 15)) lesson = body;   // keep the last one
      }
    }
    if (lesson) {
      /* break the lesson into sentences, keeping the English with the paragraph it belongs to */
      const pairs = capWords(lesson, target);
      const rows = await officeRows(pairs);
      if (size !== "long" && rows.length === 1 && WC(rows[0][1]) > target * 1.6) {
        const sents = rows[0][1].match(SENT_RE) || [rows[0][1]];
        let t = "", w = 0;
        for (const s of sents) { t += s; w += WC(s); if (w >= target) break; }
        rows[0] = [1, t.trim(), rows[0][2], rows[0][3].slice(0, WC(t)), "", true];
      }
      secs.se = { part: "se", b: "", c: 0, v1: 1, v2: 1, d: 0.6, excerpt: 0, text: "", label: `Matins, today’s last lesson`, sub: day, rows };
    }
    if (hymn) {
      const take = size === "long" ? hymn : hymn.slice(0, size === "medium" ? 2 : 1);
      const rows = await officeRows(take.map(s => [s.la.join(" / "), s.en.join(" / ")]));
      secs.hy = { part: "hy", b: "", c: 0, v1: 1, v2: rows.length, d: 0.6, excerpt: 0, text: "", label: `Matins hymn: ${take[0].la[0].replace(/[,.;:]$/, "")}`, sub: day, rows };
    }
  }
  /* 5. The first psalm of Vespers */
  if (ves && ves.sections) {
    for (const [la] of ves.sections) {
      const m = la.map(l => l.match(/^\^Psalmus (\d+)/)).find(Boolean);
      if (!m) continue;
      const c = +m[1], book = await loadBook("ps"), ch = book.ch[c - 1];
      if (!ch) break;
      let w = 0, v2 = ch[0][0];
      for (const v of ch) { v2 = v[0]; w += WC(v[1]); if (w >= target) break; }
      secs.ps = { part: "ps", b: "ps", c, v1: ch[0][0], v2, d: 0.5, excerpt: 0, text: "", from: "Today’s Vespers" };
      break;
    }
  }
  const out = [];
  for (const p of PART_IDS) out.push(secs[p] || await pickSection(p, size, blind));
  return { sections: out, day };
}
/* An excerpt keeps whole Latin sentences from the start until the word target is reached. */
function secRows(book, s) {
  const rows = book.ch[s.c - 1].slice(s.v1 - 1, s.v2);
  if (!s.excerpt || rows.length !== 1) return rows;
  const v = rows[0];
  const sents = v[1].match(SENT_RE) || [v[1]];
  let la = "", w = 0;
  for (const t of sents) { la += t; w += WC(t); if (w >= s.excerpt) break; }
  la = la.trim();
  if (WC(la) >= WC(v[1]) - 3) return rows;
  return [[v[0], la, v[2], v[3].slice(0, WC(la)), v[4], true]];
}
const secLabel = (s, d) => s.label || passageLabel(s.b, s.c, d.rows, d.book) + (s.from ? ` (${s.from.toLowerCase()})` : "");
const isExcerpt = rows => rows.length === 1 && rows[0][5] === true;
const GRADE_L = { got: "Got it", partly: "Partly", review: "Needs review" };
const GRADE_C = { got: "text-ok", partly: "text-mid", review: "text-warn" };
const GRADE_BG = { got: "bg-oktint text-ok", partly: "bg-midtint text-mid", review: "bg-warntint text-warn" };

function ExamMode({ prog, onRecord, sessionGrade, tutor, onQuiz, focusMode, setFocusMode, blind, setBlind }) {
  const saved = useMemo(() => {
    const x = readLocal(EXAM_KEY) || {};
    let cfg = { mins: 5, help: false, ...(x.cfg || {}) };
    if (!SIZES[cfg.size]) { cfg.size = "short"; cfg.oral = true; if (cfg.mins === 30) cfg.mins = 5; }
    if (!["mock", "today", "sight", ...PART_IDS].includes(cfg.scope)) cfg.scope = "nt";
    let run = x.run || null;
    if (run && !run.sections) run = run.b ? { ...run, sections: [{ part: "nt", b: run.b, c: run.c, v1: run.v1, v2: run.v2, d: 0.55, text: run.text || "" }] } : null;
    return { cfg, run };
  }, []);
  const [cfg, setCfg] = useState(saved.cfg);
  const [run, setRun] = useState(saved.run);
  const [data, setData] = useState(null);
  const [lex, setLex] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [word, setWord] = useState(null);

  useEffect(() => { writeLocal(EXAM_KEY, { cfg, run }); }, [cfg, run]);
  const runKey = run ? run.start : null;
  useEffect(() => {
    if (!run) { setData(null); return; }
    let alive = true;
    setData(null);
    Promise.all([Promise.all(run.sections.map(s => (s.rows ? null : loadBook(s.b)))), loadLex()])
      .then(([books, lx]) => { if (alive) { setData(books.map((bk, i) => ({ book: bk, rows: run.sections[i].rows || secRows(bk, run.sections[i]) }))); setLex(lx); } })
      .catch(() => { if (alive) setErr("The passage didn’t load. Check your connection and try again."); });
    return () => { alive = false; };
  }, [runKey]);

  const running = !!(run && !run.end);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  const limit = run && run.mins ? run.mins * 60 : 0;
  const elapsed = run ? Math.max(0, Math.floor(((run.end || now) - run.start) / 1000)) : 0;
  const left = limit ? Math.max(0, limit - elapsed) : null;
  useEffect(() => { if (running && limit && left === 0) setRun(r => ({ ...r, end: r.start + limit * 1000, timeUp: true })); }, [running, left]);

  async function start(over) {
    const c = { ...cfg, ...(over || {}) };
    if (over) setCfg(c);
    setBusy(true); setErr(""); setWord(null);
    try {
      let sections = [], day = "";
      if (c.scope === "today") ({ sections, day } = await officeMock(c.size, blind));
      else if (c.scope === "sight") sections = [await pickSection(PART_IDS[Math.floor(Math.random() * PART_IDS.length)], "short", true)];
      else for (const p of (c.scope === "mock" ? PART_IDS : [c.scope])) sections.push(await pickSection(p, c.size, blind));
      await loadLex();
      setRun({ sections, mins: c.mins, help: c.help, oral: !!c.oral, partner: !!c.partner, size: c.scope === "sight" ? "short" : c.size, start: Date.now(), lookups: 0,
        mock: c.scope === "mock" || c.scope === "today", today: c.scope === "today" ? day || "today" : "", sight: c.scope === "sight" ? (run && run.sight ? run.sight + 1 : 1) : 0 });
      setNow(Date.now());
    } catch (e) {
      setErr("The passage didn’t load. Check your connection and try again.");
    } finally { setBusy(false); }
  }
  function finish() { setRun(r => ({ ...r, end: Date.now() })); setWord(null); }
  function setText(i, t) { setRun(r => ({ ...r, sections: r.sections.map((s, j) => (j === i ? { ...s, text: t } : s)) })); }
  function pickWord(k) {
    if (word !== k && running) setRun(r => ({ ...r, lookups: (r.lookups || 0) + 1 }));
    setWord(word === k ? null : k);
  }

  const history = (prog.sittings || []).slice().reverse().slice(0, 8);
  /* When the sitting ends, mark every part straight away if AI marking is on. */
  const autoRef = useRef(null);
  useEffect(() => {
    if (!run || !run.end || !data || !lex || tutor.avail !== true || autoRef.current === run.start) return;
    autoRef.current = run.start;
    data.forEach((d, i) => {
      const s = run.sections[i], tkey = `exam:${run.start}:${i}`;
      if (!s || !s.text.trim() || tutor.fbs[tkey]) return;
      const label = secLabel(s, d) + (isExcerpt(d.rows) ? " (opening)" : "");
      tutor.run(tkey, d.rows, label + (isExcerpt(d.rows) ? ". The student translated only the Latin shown; the reference covers more, so ignore its extra text" : "") + (run.oral ? ". This was an oral sight translation, spoken and transcribed by speech recognition; ignore transcription slips and be lenient on wording" : ""), s.text, lex, s.part);
    });
  }, [run && run.end, data, lex, tutor.avail]);

  if (!run) {
    return (
      <>
        <section className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Quick starts">
          <span className="smallcaps text-[13px] font-semibold text-rubric">Quick start</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={busy} onClick={() => start({ scope: "sight", mins: 2, help: false })} className="rounded-md border border-rule bg-paper px-4 py-3 text-left hover:border-soft disabled:opacity-50">
              <span className="block text-[15px] font-semibold text-ink">Timed sight-reading</span>
              <span className="block text-[13px] leading-snug text-soft">A sentence or two you haven’t studied, from any exam part, 2 minutes each; then the next one. Builds speed at sight.</span>
            </button>
            <button type="button" disabled={busy} onClick={() => start({ scope: "today", size: cfg.size === "long" ? "long" : "medium", mins: cfg.size === "long" ? 90 : 30 })} className="rounded-md border border-rule bg-paper px-4 py-3 text-left hover:border-soft disabled:opacity-50">
              <span className="block text-[15px] font-semibold text-ink">Mock exam from today’s liturgy</span>
              <span className="block text-[13px] leading-snug text-soft">All five parts from what the Church prays today: the Mass Gospel, the Matins lesson and hymn, the Vespers psalm, and a Summa article citing the Gospel.</span>
            </button>
          </div>
        </section>
        <section className="rounded-lg border border-rule bg-leaf px-5 py-6 sm:px-8" aria-label="Set up a sitting">
          <h2 className="latin text-[1.15rem] font-bold text-ink">Practice exam sitting</h2>
          <p className="mt-1 max-w-prose text-[15px] text-soft">
            {cfg.scope === "mock" || cfg.scope === "today"
              ? "One unseen passage from each of the five exam parts, against a single clock, with word help switched off."
              : cfg.scope === "sight" ? "Short unseen passages, one after another, each against the clock."
              : "An unseen passage at exam difficulty, against the clock, with word help switched off."}
            {cfg.oral
              ? " Read the Latin aloud, then translate it aloud at sight, as in the oral exam. Then reveal the reference and grade yourself."
              : " Write your translation, then compare, check and grade it."}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label htmlFor="exam-scope" className="flex flex-col gap-1 text-[14px] text-ink">
              What to sit
              <select id="exam-scope" value={cfg.scope}
                onChange={e => { const v = e.target.value; setCfg(c => ({ ...c, scope: v })); }}
                className="rounded-md border border-rule bg-paper px-2 py-1.5 text-[15px]">
                <option value="mock">Full mock exam (all five parts)</option>
                <option value="today">Mock exam from today’s liturgy (Gospel, Matins lesson and hymn, Vespers psalm, a Summa article on the Gospel)</option>
                <option value="sight">Sight-reading: one short unseen passage after another</option>
                {PARTS.map((p, i) => <option key={p.id} value={p.id}>{i + 1}. {p.name}</option>)}
              </select>
            </label>
            <label htmlFor="exam-size" className="flex flex-col gap-1 text-[14px] text-ink">
              Length{cfg.scope === "mock" ? " of each part" : ""}
              <select id="exam-size" value={cfg.size} onChange={e => setCfg({ ...cfg, size: e.target.value })}
                className="rounded-md border border-rule bg-paper px-2 py-1.5 text-[15px]">
                {Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label htmlFor="exam-mins" className="flex flex-col gap-1 text-[14px] text-ink">
              Time limit
              <select id="exam-mins" value={cfg.mins} onChange={e => setCfg({ ...cfg, mins: +e.target.value })}
                className="rounded-md border border-rule bg-paper px-2 py-1.5 text-[15px]">
                {[[1, "1 minute"], [2, "2 minutes"], [3, "3 minutes"], [5, "5 minutes"], [10, "10 minutes"], [15, "15 minutes"], [20, "20 minutes"], [30, "30 minutes"], [45, "45 minutes"], [60, "1 hour"], [90, "1 hour 30"], [120, "2 hours"], [0, "No limit"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label htmlFor="exam-oral" className="flex items-center gap-2 self-end pb-1.5 text-[14px] text-ink">
              <input id="exam-oral" type="checkbox" checked={!!cfg.oral} onChange={e => setCfg({ ...cfg, oral: e.target.checked })} className="h-4 w-4 accent-[var(--rubric)]" />
              Oral: translate aloud, no typing
            </label>
            <label htmlFor="exam-partner" className="flex items-center gap-2 text-[14px] text-ink sm:col-span-2">
              <input id="exam-partner" type="checkbox" checked={!!cfg.partner} onChange={e => setCfg({ ...cfg, partner: e.target.checked })} className="h-4 w-4 accent-[var(--rubric)]" />
              Practising with a partner: show the examiner’s key (reference translation and questions) for them during the sitting
            </label>
            <label htmlFor="exam-help" className="flex items-center gap-2 self-end pb-1.5 text-[14px] text-ink">
              <input id="exam-help" type="checkbox" checked={cfg.help} onChange={e => setCfg({ ...cfg, help: e.target.checked })} className="h-4 w-4 accent-[var(--rubric)]" />
              Allow word lookups (counted)
            </label>
            {setBlind && (
              <label htmlFor="exam-blind" className="flex items-center gap-2 text-[14px] text-ink sm:col-span-2">
                <input id="exam-blind" type="checkbox" checked={!!blind} onChange={e => setBlind(e.target.checked)} className="h-4 w-4 accent-[var(--rubric)]" />
                Blind: hide New Testament and Psalm references until the end, and avoid the Gospels and best-known psalms
              </label>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Btn variant="primary" onClick={() => start()} disabled={busy}>{busy ? "Preparing…" : "Start sitting"}</Btn>
            {err && <span className="text-[14px] text-warn">{err}</span>}
          </div>
        </section>
        {history.length > 0 && (
          <section aria-label="Past sittings">
            <h2 className="smallcaps mb-2 text-[15px] font-semibold text-rubric">Past sittings</h2>
            <div className="overflow-x-auto">
              <table className="num w-full min-w-[30rem] text-left text-[14px]">
                <thead className="text-soft">
                  <tr className="border-b border-rule"><th className="py-1.5 pr-3 font-medium">Date</th><th className="py-1.5 pr-3 font-medium">Sitting</th><th className="py-1.5 pr-3 font-medium">Time</th><th className="py-1.5 font-medium">Your grades</th></tr>
                </thead>
                <tbody>
                  {history.map(s => (
                    <tr key={s.at} className="border-b border-rule align-top">
                      <td className="py-1.5 pr-3 text-soft">{new Date(s.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                      <td className="py-1.5 pr-3 text-ink">{s.ref}{s.lookups ? <span className="text-soft"> · {s.lookups} lookups</span> : null}</td>
                      <td className="py-1.5 pr-3 text-ink">{mmss(s.secs)}</td>
                      <td className="py-1.5">
                        {s.parts ? (
                          <span className="flex flex-wrap gap-1">
                            {s.parts.map((q, i) => (
                              <span key={i} title={`${PART_INFO[q.p].short}${q.errs != null ? `, ${q.errs} mistakes marked` : ""}`}
                                className={`rounded px-1.5 py-0.5 text-[12px] ${q.g ? GRADE_BG[q.g] : "bg-paper text-soft"}`}>
                                {PART_IDS.indexOf(q.p) + 1}. {q.g ? GRADE_L[q.g] : "–"}
                              </span>
                            ))}
                          </span>
                        ) : <span className={GRADE_C[s.grade] || ""}>{GRADE_L[s.grade] || "–"}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </>
    );
  }

  const secs = Math.min(elapsed, limit || elapsed);
  const hideRef = part => blind && running && BLIND_PARTS.has(part);
  const title = (run.today ? `Mock exam from today’s liturgy` : run.sight ? `Sight-reading · passage ${run.sight}` : run.mock ? "Mock exam: all five parts" : hideRef(run.sections[0].part) ? PART_INFO[run.sections[0].part].short + " · reference hidden" : (data ? secLabel(run.sections[0], data[0]) : "")) + (run.oral ? " (oral)" : "");
  const results = (data || []).map((d, i) => {
    const s = run.sections[i];
    const tkey = `exam:${run.start}:${i}`;
    const tstate = tutor.fbs[tkey];
    const tres = tstate && tstate.status === "done" && normText(tstate.text) === normText(s.text) ? tstate.result : null;
    const cov = run.end && s.text.trim() && s.part !== "hy" && !isExcerpt(d.rows) ? coverage(s.text, d.rows.map(v => v[2]).join(" ")) : null;
    const tags = lex ? autoTags(lex, d.rows) : [];
    return { s, d, i, tkey, tstate, tres, cov, tags };
  });
  const rec = {
    ref: title, at: run.start, secs, len: results.reduce((n, r) => n + r.d.rows.length, 0), lookups: run.lookups || 0,
    parts: results.map(r => ({ p: r.s.part, g: null, cov: r.cov && r.cov.total ? Math.round(r.cov.hit / r.cov.total * 100) : null, errs: r.tres ? r.tres.issues.filter(x => x.severity === "error").length : null }))
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule bg-leaf px-5 py-3">
        <span className="smallcaps text-[15px] font-semibold text-rubric">{title}</span>
        <span className={`num latin text-[1.3rem] font-bold ${left != null && left <= 60 && running ? "text-warn" : "text-ink"}`} aria-live="off">
          {limit ? mmss(running ? left : Math.max(0, limit - elapsed)) : mmss(elapsed)}
          <span className="ml-1.5 font-sans text-[13px] font-normal text-soft">{running ? (limit ? "left" : "elapsed") : run.timeUp ? "time’s up" : "finished"}</span>
        </span>
        {running && !focusMode && setFocusMode && <Btn onClick={() => setFocusMode(true)} title="Large text, nothing else on screen">Focus mode</Btn>}
      </div>
      {!data && <p className="text-[15px] text-soft">{err || "Loading the passages…"}</p>}

      {results.map(({ s, d, i, tkey, tstate, tres, cov, tags }) => {
        const active = typeof tutor.active === "string" && tutor.active.startsWith(i + ":") ? +tutor.active.split(":")[1] : null;
        const setActive = n => tutor.setActive(n == null ? null : `${i}:${n}`);
        const marks = tres ? Object.fromEntries(Object.entries(latinMarks(d.rows, tres, true, active)).map(([k, v]) => [`${i}:${k}`, v])) : null;
        let wordText = null, wordEntry = null;
        if (word && word.startsWith(i + ":")) {
          const [, vi, k] = word.split(":").map(Number);
          const v = d.rows[vi];
          if (v) { wordText = (v[1].match(WORD_RE) || [])[k]; wordEntry = v[3][k]; }
        }
        const label = secLabel(s, d) + (isExcerpt(d.rows) ? " (opening)" : "");
        const sub = hideRef(s.part) ? "" : (s.sub != null ? s.sub : passageSub(s.b, s.c, d.book));
        const g = sessionGrade(`${run.start}:${i}`);
        const suggest = tres ? tres.verdict : cov && cov.total ? (cov.hit / cov.total >= 0.8 ? "got" : cov.hit / cov.total >= 0.5 ? "partly" : "review") : null;
        const over = feedbackScores(tres);
        const ai = tres ? SCORE[tres.verdict] : null;
        return (
          <section key={i} className="flex flex-col gap-4" aria-label={`Part ${PART_IDS.indexOf(s.part) + 1}`}>
            <article className="rounded-lg border border-rule bg-leaf px-5 py-6 sm:px-8 sm:py-7">
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="smallcaps text-[14px] font-semibold text-rubric">{run.mock ? `Part ${PART_IDS.indexOf(s.part) + 1} · ${PART_INFO[s.part].short}` : PART_INFO[s.part].short}</span>
                <span className="text-[13px] text-soft">{hideRef(s.part) ? "Reference hidden" : label}</span>
              </div>
              {sub && <p className="mb-2 text-[13px] italic text-soft">{sub}</p>}
              <p lang="la" className={`lt latin mt-2 text-[1.18rem] leading-[1.85] text-ink sm:text-[1.28rem]${s.part === "hy" ? " whitespace-pre-line" : ""}`}>
                {d.rows.map((v, vi) => (
                  <span key={vi}>
                    {rowTag(v) && <sup className="num mr-0.5 text-[0.6em] font-bold text-rubric">{rowTag(v)}</sup>}
                    {run.help || run.end
                      ? <LatinWords text={s.part === "hy" ? v[1].replace(/ \/ /g, "\n") : v[1]} ids={v[3]} prefix={`${i}:${vi}:`} selected={word} onPick={pickWord} marks={run.end ? marks : null} />
                      : <AccentText text={s.part === "hy" ? v[1].replace(/ \/ /g, "\n") : v[1]} />}
                    {s.part === "hy" ? "\n\n" : " "}
                  </span>
                ))}
              </p>
              <WordPanel lex={lex} word={wordText} entry={wordEntry} onClose={() => setWord(null)} where={label} />
              {(run.help || run.end) && <p className="mt-3 text-[12px] text-soft">{run.end ? "Tap any word to check its parsing." : `Word lookups are on and counted: ${run.lookups || 0} so far.`}</p>}
            </article>

            {run.partner && running && (
              <details className="rounded-lg border border-rule bg-paper px-4 py-3">
                <summary className="cursor-pointer text-[14px] font-medium text-rubric">Examiner’s key (for your partner)</summary>
                <p className="latin mt-2 text-[1rem] italic leading-relaxed text-ink">{d.rows.map((v, vi) => <span key={vi}>{v[2]} </span>)}</p>
                <div className="mt-3"><ExaminerQuiz lex={lex} verses={d.rows} seed={tkey} showKey /></div>
              </details>
            )}
            {run.oral && running && (
              <p className="text-[14px] text-soft">Read the Latin aloud, then tap Speak and translate it aloud. Your words appear below as text{tutor.avail ? " and are marked when you finish" : ""}; nothing is recorded.{run.mock && i < results.length - 1 ? " Then go on to the next part." : ""}</p>
            )}
            <div className="flex flex-col gap-2">
              <label htmlFor={`exam-translation-${i}`} className="smallcaps text-[15px] text-soft">
                {run.oral ? "What you said" : `Your translation${run.mock ? ` · part ${PART_IDS.indexOf(s.part) + 1}` : ""}`}
              </label>
              {running && <Dictate value={s.text} onChange={t => setText(i, t)} label={run.oral ? "Speak your translation" : "Speak"} />}
              <textarea id={`exam-translation-${i}`} rows={run.oral ? 3 : s.part === "nt" || s.part === "st" ? 8 : 6} value={s.text} readOnly={!running && !run.oral}
                onChange={e => setText(i, e.target.value)}
                placeholder={run.oral ? "Tap Speak, or type what you said…" : "Translate the whole passage here…"}
                className="w-full resize-y rounded-md border border-rule bg-leaf px-4 py-3 text-[16px] leading-relaxed text-ink placeholder:text-soft read-only:bg-paper"
                style={{ fontFamily: "var(--font-latin)" }} />
            </div>

            {!running && (
              <>
                <section className="reveal flex flex-col gap-3 border-l-2 border-rubric pl-4" aria-label="Reference translation">
                  <span className="smallcaps text-[14px] text-rubric">{PART_INFO[s.part].ref}</span>
                  <p className="latin text-[1.05rem] italic leading-relaxed text-ink">
                    {d.rows.map((v, vi) => <span key={vi}>{rowTag(v) && <sup className="num mr-0.5 text-[0.65em] not-italic text-rubric">{rowTag(v)}</sup>}{v[2]} </span>)}
                  </p>
                  {s.part === "hy" && <p className="text-[13px] text-soft">This is a rhymed verse translation, so it departs from the Latin. Use it for the sense, and the tutor for accuracy.</p>}
                  {isExcerpt(d.rows) && <p className="text-[13px] text-soft">You translated the opening only; the reference covers the whole {s.part === "se" ? "lesson" : "section"}.</p>}
                  {tres && tres.issues.length > 0 && (
                    <div>
                      <span className="smallcaps text-[14px] text-soft">Yours, marked</span>
                      <p className="latin mt-1 whitespace-pre-wrap text-[1rem] leading-relaxed text-ink">
                        <MarkedText text={s.text} fb={tres} active={active} setActive={setActive} />
                      </p>
                    </div>
                  )}
                  <Coverage cov={cov} />
                  {s.text.trim() && (
                    <TutorPanel state={tstate} avail={tutor.avail} stale={!!(tstate && tstate.status !== "loading" && normText(tstate.text) !== normText(s.text))}
                      onRun={() => tutor.run(tkey, d.rows, label + (isExcerpt(d.rows) ? ". The student translated only the Latin shown; the reference covers more, so ignore its extra text" : "") + (run.oral ? ". This was an oral sight translation, spoken and transcribed by speech recognition; ignore transcription slips and be lenient on wording" : ""), s.text, lex, s.part)} onStop={() => tutor.stop(tkey)}
                      active={active} setActive={setActive} />
                  )}
                </section>
                <ExaminerQuiz lex={lex} verses={d.rows} seed={tkey} onAnswer={onQuiz} />
                <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-4">
                  <span className="mr-1 text-[15px] text-soft">{run.mock ? `How did part ${PART_IDS.indexOf(s.part) + 1} go?` : "How did the sitting go?"}</span>
                  {["review", "partly", "got"].map(k => (
                    <Btn key={k} variant={k === "review" ? "warn" : k === "partly" ? "mid" : "ok"} pressed={g === k} hint={suggest === k}
                      onClick={() => onRecord(rec, i, s, tags, k, over, ai)}>
                      {k === "review" ? "↻ Needs Review" : k === "partly" ? "~ Partly" : "✓ Got It"}
                    </Btn>
                  ))}
                </div>
              </>
            )}
          </section>
        );
      })}

      {running && data && (
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" onClick={finish}>{run.oral ? "Finish and reveal" : "Finish and check"}</Btn>
          <Btn onClick={() => { setRun(null); setWord(null); }}>Abandon</Btn>
        </div>
      )}
      {!running && (
        <div className="flex flex-wrap justify-end gap-2">
          {run.sight ? <>
            <Btn onClick={() => { setRun(null); setWord(null); }}>Stop</Btn>
            <Btn variant="primary" disabled={busy} onClick={() => start({ scope: "sight" })}>{busy ? "Preparing…" : "Next unseen passage →"}</Btn>
          </> : <Btn variant="primary" onClick={() => { setRun(null); setWord(null); }}>New sitting →</Btn>}
        </div>
      )}
    </>
  );
}
