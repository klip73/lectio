/* ---------- The whole Summa Theologiae, Latin with the Dominican English, article by article ----------
   Data: data/summa/ (tools/summa/build_summa.py). Each word carries its likely parsings, so tapping one shows them;
   the article can be added to My class list in one tap. Your place is kept. */
const SUMMA_POS_KEY = "lectio-vulgata-summa";
const SM_ROLE_L = { obj: "Objections", sc: "Sed contra", resp: "Respondeo", ad: "Replies to the objections" };
function SummaReader({ onTap, onTable, onBack }) {
  const pos0 = readLocal(SUMMA_POS_KEY) || {};
  const [idx, setIdx] = useState(null);
  const [p, setP] = useState(SM_PART[pos0.p] ? pos0.p : "1");
  const [qn, setQn] = useState(pos0.q || 1);
  const [an, setAn] = useState(pos0.a || 1);
  const [q, setQ] = useState(null);
  const [err, setErr] = useState("");
  const [en, setEn0] = useState(pos0.en != null ? pos0.en !== false : getSet("enShow") !== "hidden");
  const [lex, setLex] = useState(null);
  const [tap, setTap] = useState(null);   // { w, entry }
  const [added, setAdded] = useState("");
  const topRef = useRef(null);
  useEffect(() => { loadSummaIndex().then(setIdx).catch(() => setErr("The Summa didn’t load. Check your connection and try again.")); }, []);
  useEffect(() => {
    let alive = true; setQ(null); setTap(null); setAdded("");
    loadSummaQ(p, qn).then(d => { if (alive) setQ(d || null); }).catch(() => alive && setErr("This question didn’t load. Check your connection and try again."));
    return () => { alive = false; };
  }, [p, qn]);
  useEffect(() => { writeLocal(SUMMA_POS_KEY, { p, q: qn, a: an, en }); }, [p, qn, an, en]);
  const setEn = v => setEn0(v);
  if (err) return <p className="text-[14px] text-warn">{err}</p>;
  if (!idx) return <p className="text-[15px] text-soft">Loading the Summa…</p>;
  const part = idx.parts.find(x => x.id === p) || idx.parts[0];
  const qi = part.qs.findIndex(x => x[0] === qn);
  const qrow = part.qs[qi] || part.qs[0];
  const nArts = qrow[2].length;
  const a = Math.min(Math.max(1, an), nArts);
  function go(np, nq, na) {
    setP(np); setQn(nq); setAn(na); setTap(null);
    requestAnimationFrame(() => topRef.current && topRef.current.scrollIntoView({ block: "start" }));
  }
  function step(d) {
    if (d > 0 && a < nArts) return go(p, qn, a + 1);
    if (d < 0 && a > 1) return go(p, qn, a - 1);
    const pi = idx.parts.findIndex(x => x.id === p);
    if (d > 0) { if (qi + 1 < part.qs.length) return go(p, part.qs[qi + 1][0], 1); if (pi + 1 < idx.parts.length) return go(idx.parts[pi + 1].id, idx.parts[pi + 1].qs[0][0], 1); }
    else { if (qi > 0) { const pq = part.qs[qi - 1]; return go(p, pq[0], pq[2].length); } if (pi > 0) { const pp = idx.parts[pi - 1], pq = pp.qs[pp.qs.length - 1]; return go(pp.id, pq[0], pq[2].length); } }
  }
  function pick(w, entry) {
    setTap(t => (t && t.w === w && t.entry === entry ? null : { w, entry }));
    if (!lex) loadLex().then(setLex).catch(() => {});
    else if (onTap) { const r = readings(entry); if (r.ids.length) onTap([lex.lemmas[lex.ana[r.ids[0]][0]][0]]); }
  }
  async function addToClass() {
    setAdded("Adding…");
    try {
      const L = lex || await loadLex(); if (!lex) setLex(L);
      const cur = readClass();
      const s = { t: "sm", p, q: qn, a, parts: ST_PARTS.map(x => x[0]) };
      if (cur.sections.some(x => x.t === "sm" && x.p === p && x.q === qn && x.a === a)) { setAdded("Already in your class quiz."); return; }
      const { cls } = await rebuildClass({ ...cur, sections: [...cur.sections, s] }, L);
      setAdded(`Added: your class quiz now has ${cls.words.length} words. (Study → Class quiz)`);
    } catch (e) { setAdded("Couldn’t add it. Check your connection and try again."); }
  }
  const sel = "rounded-md border border-rule bg-paper px-2 py-1.5 text-[14px] text-ink";
  const la = q ? q.a[a - 1] || [] : [];
  const ws = q ? q.w[a - 1] || [] : [];
  const e = q && q.e ? q.e[a - 1] : null;
  /* group the Latin paragraphs by role, keeping each paragraph's index for its words */
  const groups = [];
  let role = null;
  la.forEach((par, j) => {
    role = stPart(par, role);
    if (!groups.length || groups[groups.length - 1].role !== role) groups.push({ role, items: [] });
    groups[groups.length - 1].items.push(j);
  });
  const enFor = g => !e ? [] : g.role === "obj" ? e.o : g.role === "sc" ? e.c : g.role === "resp" ? e.b : e.r;
  const words = (par, j) => {
    const toks = par.split(/([A-Za-z]+)/);
    let k = -1;
    return toks.map((t, i) => {
      if (i % 2 === 0) return t;
      k++;
      const entry = ws[j] ? ws[j][k] : -1, my = k;
      return <span key={i} role="button" tabIndex={0} className={`lw${tap && tap.w === t && tap.j === j && tap.k === my ? " sel" : ""}`}
        onClick={() => { pick(t, entry); setTap({ w: t, entry, j, k: my }); }}
        onKeyDown={ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); pick(t, entry); setTap({ w: t, entry, j, k: my }); } }}>{t}</span>;
    });
  };
  return (
    <div className="flex flex-col gap-3">
      <div ref={topRef} className="scroll-mt-16 flex flex-wrap items-center gap-2">
        <button type="button" className="text-[14px] text-rubric underline underline-offset-2" onClick={onBack}>‹ Library</button>
        <span lang="la" className="latin text-[15px] font-bold text-ink">Summa Theologiae</span>
        <span className="text-[13px] text-soft">St Thomas Aquinas</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="sr-p" className="sr-only">Part</label>
        <select id="sr-p" value={p} onChange={ev => { const np = ev.target.value; go(np, idx.parts.find(x => x.id === np).qs[0][0], 1); }} className={sel}>
          {idx.parts.map(x => <option key={x.id} value={x.id}>{SM_PART[x.id]} · {x.name}</option>)}
        </select>
        <label htmlFor="sr-q" className="sr-only">Question</label>
        <select id="sr-q" value={qrow[0]} onChange={ev => go(p, +ev.target.value, 1)} className={`${sel} min-w-0 flex-1 basis-60`}>
          {part.qs.map(x => <option key={x[0]} value={x[0]}>q. {x[0]}: {(x[3] || x[1]).length > 64 ? (x[3] || x[1]).slice(0, 62) + "…" : x[3] || x[1]}</option>)}
        </select>
        <label htmlFor="sr-a" className="sr-only">Article</label>
        <select id="sr-a" value={a} onChange={ev => go(p, qn, +ev.target.value)} className={`${sel} min-w-0 basis-full`}>
          {qrow[2].map((t, i) => <option key={i} value={i + 1}>a. {i + 1}: {((qrow[4] && qrow[4][i]) || t || "").slice(0, 80)}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Btn onClick={() => step(-1)} aria-label="Previous article">‹</Btn>
        <Btn onClick={() => step(1)} aria-label="Next article">›</Btn>
        <label className="flex items-center gap-2 text-[14px] text-ink"><input type="checkbox" checked={en} onChange={ev => setEn(ev.target.checked)} className="h-4 w-4 accent-[var(--rubric)]" />English</label>
        <Btn onClick={addToClass}>Add to my class quiz</Btn>
        <TextExport getBook={async () => ({ title: `Summa Theologiae ${SM_PART[p]} q. ${qn}`, author: "St Thomas Aquinas", file: `Summa-${SM_PART[p]}-q${qn}`,
          chapters: q.a.map((pars, ai) => { const ee = q.e ? q.e[ai] : null; return { title: `a. ${ai + 1}: ${qrow[2][ai] || ""}`, paras: pars.map(t => ({ la: t })).concat(en && ee ? [ee.o, ee.c, ee.b, ee.r].flat().filter(Boolean).map(t => ({ la: "", en: t })) : []) }; }) })}
          printTitle={`Summa ${SM_PART[p]} q. ${qn} a. ${a}`} printHtml={() => `<h1>Summa ${SM_PART[p]}, q. ${qn}, a. ${a}</h1><p class="small">${escHtml(qrow[2][a - 1] || "")}</p>` + la.map(t => `<p>${escHtml(t)}</p>`).join("") + (en && e ? [e.o, e.c, e.b, e.r].flat().filter(Boolean).map(t => `<p class="en">${escHtml(t)}</p>`).join("") : "")} />
        {added && <span className="text-[13px] text-ok" aria-live="polite">{added}</span>}
      </div>
      {q && <PhraseTips text={la.join(" ")} kinds={["thomas"]} />}
      {!q ? <p className="text-[15px] text-soft">Loading…</p> : (
        <article className="flex flex-col gap-4 rounded-lg border border-rule bg-leaf px-5 py-5 sm:px-8">
          <header>
            <p className="smallcaps text-[13px] text-soft">Summa {SM_PART[p]}, q. {qn}, a. {a}</p>
            <h2 lang="la" className="latin text-[1.1rem] font-bold leading-snug text-ink">{qrow[2][a - 1] || `Articulus ${a}`}</h2>
            {en && e && e.t && <p className="text-[14px] italic text-soft">{e.t}</p>}
          </header>
          {groups.map((g, gi) => {
            const eng = enFor(g);
            const paired = en && eng.length === g.items.length;
            return (
              <section key={gi} className="flex flex-col gap-2">
                <h3 className="smallcaps text-[14px] font-semibold text-rubric">{SM_ROLE_L[g.role]}</h3>
                {g.items.map((j, ii) => (
                  <div key={j} className={paired ? "grid gap-x-6 gap-y-1 sm:grid-cols-2" : ""}>
                    <p lang="la" className="lt latin text-[1.05rem] leading-[1.75] text-ink">{words(la[j], j)}</p>
                    {paired && <p lang="en" className="text-[15px] leading-snug text-soft">{eng[ii]}</p>}
                  </div>
                ))}
                {en && !paired && eng.length > 0 && <div lang="en" className="flex flex-col gap-1 border-l-2 border-rule pl-3">{eng.map((t, i) => <p key={i} className="text-[15px] leading-snug text-soft">{t}</p>)}</div>}
              </section>
            );
          })}
        </article>
      )}
      <div className="flex justify-between">
        <Btn onClick={() => step(-1)}>‹ Previous article</Btn>
        <Btn variant="primary" onClick={() => step(1)}>Next article ›</Btn>
      </div>
      <p className="text-[12px] text-soft">Latin: Corpus Thomisticum text (via github.com/androur/Summa-Theologica-Latin). English: the Dominican Fathers’ translation (Benziger, 1947; public domain). Tap a word for its parsing; most are matched by form, so check them against the sentence.</p>
      {tap && (
        <div className="fixed inset-x-0 bottom-0 z-20 max-h-[45vh] overflow-auto border-t border-rule bg-paper px-4 pb-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="mx-auto max-w-[46rem]">
            {!lex ? <p className="mt-4 text-[14px] text-soft">Looking up…</p>
              : readings(tap.entry).ids.length ? <WordPanel lex={lex} word={tap.w} entry={tap.entry} onClose={() => setTap(null)} where={`Summa ${SM_PART[p]} q. ${qn} a. ${a}`} onTable={onTable} />
              : <LsGuessPanel word={tap.w} onClose={() => setTap(null)} />}
          </div>
        </div>
      )}
    </div>
  );
}
