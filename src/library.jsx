/* ---------- Library: classic Church texts in Latin (The Latin Library), read chapter by chapter with word help ---------- */
const LIB_KEY = "lectio-vulgata-library";
const libCache = {};
function libGet(name) {
  if (!libCache[name]) libCache[name] = getJSON(`data/library/${name}.json`).catch(e => { delete libCache[name]; throw e; });
  return libCache[name];
}
function LibraryMode({ onTap, onTable }) {
  const [idx, setIdx] = useState(null);
  const [err, setErr] = useState("");
  const [pos, setPos0] = useState(() => readLocal(LIB_KEY) || {});   // { work: chapter index, _open: work }
  const setPos = p => { setPos0(p); writeLocal(LIB_KEY, p); };
  const open = pos._open || null;
  const [work, setWork] = useState(null);
  const help = useWordHelp(() => libGet("forms"), onTap);
  const topRef = useRef(null);
  useEffect(() => { libGet("index").then(setIdx).catch(() => setErr("The library didn’t load. Check your connection and try again.")); }, []);
  useEffect(() => {
    if (!open || open === "summa") { setWork(null); return; }
    let alive = true; setWork(null);
    libGet(open).then(w => alive && setWork(w)).catch(() => alive && setErr("This book didn’t load. Check your connection and try again."));
    return () => { alive = false; };
  }, [open]);
  if (open === "summa" && !(OFFLINE && !APP)) return <SummaReader onTap={onTap} onTable={onTable} onBack={() => setPos({ ...pos, _open: null })} />;
  if (err) return <p className="text-[14px] text-warn">{err}</p>;
  if (!idx) return <p className="text-[15px] text-soft">Loading the library…</p>;
  if (!open) {
    return (
      <div className="flex flex-col gap-3">
        <section className="rounded-lg border border-rule bg-leaf px-5 py-4">
          <h2 className="latin text-[1.15rem] font-bold text-ink">Library</h2>
          <p className="mt-1 text-[14px] leading-snug text-soft">Classics of the Church in Latin, for reading a little every day. Latin only: tap any word for its parsing, and it joins your vocabulary deck. Your place in each book is kept.</p>
        </section>
        {!(OFFLINE && !APP) && <button type="button" onClick={() => setPos({ ...pos, _open: "summa" })} className="rounded-lg border border-rubric bg-leaf px-4 py-3 text-left hover:bg-rubrictint">
          <span lang="la" className="latin block text-[1.08rem] font-bold text-ink">Summa Theologiae</span>
          <span className="block text-[13px] text-rubric">St Thomas Aquinas · complete</span>
          <span className="mt-1 block text-[13px] leading-snug text-soft">All four parts, every question and article, Latin beside the Dominican English. Tap any word for its parsing; add any article to your class quiz in one tap.</span>
        </button>}
        {(idx.groups || [["exam", ""]]).map(([g, gl]) => {
          const ws = idx.works.filter(w => (w.group || "exam") === g && (!OFFLINE || APP || w.offline));
          if (!ws.length) return null;
          const shelf = g === "ot"
            ? <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">{ws.map(w => <button key={w.id} type="button" onClick={() => setPos({ ...pos, _open: w.id })} className="rounded-md border border-rule bg-leaf px-2.5 py-1.5 text-left text-[14px] hover:border-soft"><span lang="la" className="latin">{w.title}</span>{pos[w.id] != null && <span className="num ml-1 text-[11px] text-soft">· {pos[w.id] + 1}</span>}</button>)}</div>
            : <div className="grid gap-2 sm:grid-cols-2">{ws.map(w => {
              const at = pos[w.id];
              return (
                <button key={w.id} type="button" onClick={() => setPos({ ...pos, _open: w.id })} className="rounded-lg border border-rule bg-leaf px-4 py-3 text-left hover:border-soft">
                  <span lang="la" className="latin block text-[1.02rem] font-bold text-ink">{w.title}</span>
                  <span className="block text-[13px] text-rubric">{w.author}</span>
                  {w.note && <span className="mt-1 block text-[13px] leading-snug text-soft">{w.note}</span>}
                  <span className="num mt-1 block text-[12px] text-soft">{w.chapters.length} {w.group === "ot" ? "chapters" : "parts"} · {w.words >= 1000 ? Math.round(w.words / 1000) + "k" : w.words} words{at != null ? ` · reading ${w.group === "ot" ? "chapter" : "part"} ${at + 1}` : ""}</span>
                </button>
              );
            })}</div>;
          return g === "ot"
            ? <details key={g} className="rounded-lg border border-rule bg-paper px-4 py-3"><summary className="cursor-pointer smallcaps text-[15px] font-semibold text-rubric">{gl} <span className="font-normal normal-case text-soft">· {ws.length} books, Latin only</span></summary><div className="mt-3">{shelf}</div></details>
            : <section key={g} className="flex flex-col gap-2">{gl && <h3 className="smallcaps text-[15px] font-semibold text-rubric">{gl}</h3>}{shelf}</section>;
        })}
        {OFFLINE && !APP && <p className="text-[13px] text-soft">This offline copy carries the first eight works; the whole Library and the complete Summa are in the phone app and the online page.</p>}
        <p className="text-[12px] text-soft">Texts: The Latin Library (thelatinlibrary.com), via the Classical Language Toolkit. Word help covers the words these texts share with the parsed exam texts.</p>
      </div>
    );
  }
  if (!work) return <p className="text-[15px] text-soft">Loading…</p>;
  const ci = Math.min(pos[work.id] || 0, work.chapters.length - 1);
  const ch = work.chapters[ci];
  const go = i => { setPos({ ...pos, [work.id]: i }); help.clear(); requestAnimationFrame(() => topRef.current && topRef.current.scrollIntoView({ block: "start" })); };
  return (
    <div className="flex flex-col gap-3">
      <div ref={topRef} className="scroll-mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="text-[14px] text-rubric underline underline-offset-2" onClick={() => setPos({ ...pos, _open: null })}>‹ Library</button>
        <span lang="la" className="latin text-[15px] font-bold text-ink">{work.title}</span>
        <span className="text-[13px] text-soft">{work.author}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={() => go(ci - 1)} disabled={ci === 0} aria-label="Previous chapter">‹</Btn>
        <label htmlFor="lib-ch" className="sr-only">Chapter</label>
        <select id="lib-ch" value={ci} onChange={e => go(+e.target.value)} className="min-w-0 flex-1 basis-48 rounded-md border border-rule bg-leaf px-2 py-1.5 text-[14px] text-ink">
          {work.chapters.map((c, i) => <option key={i} value={i}>{c.title.length > 70 ? c.title.slice(0, 68) + "…" : c.title}</option>)}
        </select>
        <Btn onClick={() => go(ci + 1)} disabled={ci === work.chapters.length - 1} aria-label="Next chapter">›</Btn>
      </div>
      <article className="rounded-lg border border-rule bg-leaf px-5 py-5 sm:px-8">
        <h2 lang="la" className="latin mb-3 text-[1.05rem] font-bold text-rubric">{ch.title}</h2>
        <div lang="la" className="lt flex flex-col gap-3">
          {ch.paras.map((p, i) => (
            <p key={i} className={`latin text-[1.08rem] leading-[1.8] text-ink${work.verse ? " whitespace-pre-line" : ""}`}>
              <OfficeText line={p} latin onWord={help.pick} sel={help.word} />
            </p>
          ))}
        </div>
      </article>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="num text-[13px] text-soft">Chapter {ci + 1} of {work.chapters.length}</span>
        {ci < work.chapters.length - 1 && <Btn variant="primary" onClick={() => go(ci + 1)}>Next chapter →</Btn>}
      </div>
      {help.panel(work.title, onTable)}
    </div>
  );
}
