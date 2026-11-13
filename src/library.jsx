/* ---------- Library: classic Church texts in Latin (The Latin Library), read chapter by chapter with word help ---------- */
const LIB_KEY = "lectio-vulgata-library";
const libCache = {};
/* The larger additions (St Thomas's other works ct-*, the manuals and readers rd-*, the whole Latin Library ll-*) are read by the online page from the
   phone app's site, to keep the page within its size limit. */
function libGet(name) {
  const remote = REMOTE_V && /^(ct|rd|ll)-|^pontificale$/.test(name);
  if (!libCache[name]) libCache[name] = getJSON(`${remote ? APP_SITE : ""}data/library/${name}.json`).catch(e => { delete libCache[name]; throw e; });
  return libCache[name];
}
/* The 1983 Code: its text is under copyright, so the lookup opens the canon on the Vatican's site (Latin and English).
   The 1917 Code (public domain) is in the Library: the lookup opens it at the canon. */
function CanonLookup({ onOpen }) {
  const [n17, setN17] = useState("");
  const [c17, setC17] = useState(null);
  useEffect(() => { if (n17 && !c17) libGet("cic1917").then(w => setC17(w.canons)).catch(() => {}); }, [n17]);
  const k17 = c17 && n17 ? parseInt(n17, 10) : 0;
  const at17 = k17 >= 1 && k17 <= 2414 ? (() => { for (let k = k17; k > 0; k--) if (c17[k] != null) return c17[k]; return 0; })() : null;
  const [d, setD] = useState(null);
  const [n, setN] = useState("");
  useEffect(() => { getJSON("data/canon1983.json").then(setD).catch(() => {}); }, []);
  const c = d && n ? d.canons[String(parseInt(n, 10))] : null;
  const ext = "inline-flex items-center rounded-md border border-rule bg-paper px-3 py-1.5 text-[14px] text-ink hover:border-soft";
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-4 py-3">
        <span lang="la" className="latin text-[1.02rem] font-bold text-ink">Codex Iuris Canonici (1983)</span>
        <span className="text-[13px] leading-snug text-soft">Look up a canon: it opens on the Vatican’s site in Latin and English (the text is under copyright, so it isn’t copied here).</span>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="canon-n" className="text-[14px] text-ink">Can.</label>
          <input id="canon-n" inputMode="numeric" value={n} onChange={e => setN(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1752" className="w-24 rounded-md border border-rule bg-paper px-2 py-1.5 text-[15px] text-ink" />
          {c && <span className="text-[13px] text-soft">Liber {["", "I", "II", "III", "IV", "V", "VI", "VII"][c[0]]}: {(d.books[String(c[0])] || "").split(" · ")[0]}</span>}
          {n && d && !c && <span className="text-[13px] text-warn">The Code has canons 1–{d.count}.</span>}
        </div>
        {c && (
          <div className="flex flex-wrap gap-2">
            <a className={ext} href={d.urls[c[1]]} target="_blank" rel="noopener noreferrer">Latin ↗</a>
            <a className={ext} href={d.urls[c[2]]} target="_blank" rel="noopener noreferrer">English ↗</a>
            <span className="self-center text-[12px] text-soft">On the Latin page, find “Can. {parseInt(n, 10)}”.</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-4 py-3">
        <span lang="la" className="latin text-[1.02rem] font-bold text-ink">Codex Iuris Canonici (1917)</span>
        <span className="text-[13px] leading-snug text-soft">The Pio-Benedictine Code, in force until 1983 and behind the 1962 books’ discipline. The whole Latin text is on the shelf below; look up a canon to open it there.</span>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="canon17-n" className="text-[14px] text-ink">Can.</label>
          <input id="canon17-n" inputMode="numeric" value={n17} onChange={e => setN17(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1325" className="w-24 rounded-md border border-rule bg-paper px-2 py-1.5 text-[15px] text-ink" />
          {at17 != null && onOpen && <Btn onClick={() => onOpen("cic1917", at17, `Can. ${k17}.`)}>Open can. {k17}</Btn>}
          {n17 && c17 && at17 == null && <span className="text-[13px] text-warn">The Code has canons 1–2414.</span>}
        </div>
        <a className="self-start text-[13px] text-rubric underline underline-offset-2" href="https://www.canonlaw.info/masterpage1917.htm" target="_blank" rel="noopener noreferrer">Dr Edward Peters on the 1917 Code ↗</a>
      </div>
    </div>
  );
}

/* ---------- The Latin Library: every text in it (classical, Christian, medieval, Neo-Latin), by period and author ---------- */
function LatinLibraryShelf({ pos, onOpen }) {
  const [ll, setLl] = useState(null), [err, setErr] = useState("");
  const [per, setPer] = useState(pos._llp || "classical"), [q, setQ] = useState("");
  const [openA, setOpenA] = useState(null);
  useEffect(() => { libGet("ll-index").then(setLl).catch(() => setErr("The Latin Library shelf didn’t load. Check your connection.")); }, []);
  if (err) return <p className="text-[14px] text-warn">{err}</p>;
  if (!ll) return <p className="text-[14px] text-soft">Loading the Latin Library…</p>;
  const nq = normForm(q.trim());
  const ws = ll.works.filter(w => nq ? normForm(w.title + " " + w.author).includes(nq) : w.period === per);
  const byA = {};
  ws.forEach(w => { (byA[w.author] = byA[w.author] || []).push(w); });
  const authors = Object.keys(byA).sort((a, b) => a.replace(/^(St\.?|Saint|S\.)\s+/, "").localeCompare(b.replace(/^(St\.?|Saint|S\.)\s+/, "")));
  const k = n => n >= 1000 ? Math.round(n / 1000) + "k" : n;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Period">
        {ll.periods.map(([id, l]) => <button key={id} type="button" aria-pressed={!nq && per === id} onClick={() => { setPer(id); setQ(""); onOpen(null, { _llp: id }); }}
          className={`rounded-md border px-2.5 py-1 text-[13px] ${!nq && per === id ? "border-rubric bg-rubrictint font-semibold text-rubric" : "border-rule bg-paper text-ink"}`}>{l.split(" (")[0]} <span className="num text-soft">{ll.works.filter(w => w.period === id).length}</span></button>)}
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find an author or work (Cicero, Aeneis, Bernard, Erasmus…)" className="w-full rounded-md border border-rule bg-paper px-3 py-1.5 text-[15px] text-ink" />
      <p className="text-[12px] text-soft">{nq ? `${ws.length} works` : ll.periods.find(x => x[0] === per)[1]} · {authors.length} authors. Word help works here too (tap a word); some rarer forms fall back to the dictionaries.</p>
      <ul className="flex flex-col divide-y divide-[var(--rule)] rounded-lg border border-rule bg-leaf">
        {authors.map(a => {
          const list = byA[a], open = openA === a || !!nq || list.length === 1;
          return (
            <li key={a} className="px-3 py-1.5">
              {list.length > 1 && !nq ? <button type="button" onClick={() => setOpenA(openA === a ? null : a)} aria-expanded={open} className="flex w-full items-baseline justify-between gap-2 text-left">
                <span className="text-[15px] font-semibold text-ink">{a}</span><span className="num text-[12px] text-soft">{list.length} works {open ? "▴" : "▾"}</span></button> : null}
              {open && <div className={`flex flex-col ${list.length > 1 && !nq ? "mt-1 pl-3" : ""}`}>{list.map(w => (
                <button key={w.id} type="button" onClick={() => onOpen(w.id)} className="flex items-baseline justify-between gap-2 rounded px-1 py-0.5 text-left hover:bg-paper">
                  <span><span lang="la" className="latin text-[14px] text-ink">{w.title}</span>{(list.length === 1 || nq) && <span className="text-[13px] text-soft"> · {w.author}</span>}</span>
                  <span className="num flex-none text-[12px] text-soft">{w.chapters.length > 1 ? w.chapters.length + " parts · " : ""}{k(w.words)} words{pos[w.id] != null ? " · reading" : ""}</span>
                </button>))}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
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
  /* open a work at a chapter, scrolling to the first paragraph that holds `hl` (a canon number or a searched word) */
  const openAt = (id, ci, hl) => { setPos({ ...readLocal(LIB_KEY), _open: id, [id]: ci, _hl: hl || "" }); window.scrollTo({ top: 0 }); };
  const hlRef = useRef(null);
  useEffect(() => {
    if (!work || !pos._hl) return;
    const t = setTimeout(() => { if (hlRef.current) hlRef.current.scrollIntoView({ block: "center" }); }, 60);
    return () => clearTimeout(t);
  }, [work, pos._hl, pos[open]]);
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
          <p className="mt-1 text-[14px] leading-snug text-soft">Classics of the Church in Latin, for reading a little every day. Tap any word for its parsing, and it joins your vocabulary deck. Your place in each book is kept.</p>
          {!(OFFLINE && !APP) && <LibrarySearch idx={idx} onOpen={openAt} />}
        </section>
        {!(OFFLINE && !APP) && <button type="button" onClick={() => setPos({ ...pos, _open: "summa" })} className="rounded-lg border border-rubric bg-leaf px-4 py-3 text-left hover:bg-rubrictint">
          <span lang="la" className="latin block text-[1.08rem] font-bold text-ink">Summa Theologiae</span>
          <span className="block text-[13px] text-rubric">St Thomas Aquinas · complete</span>
          <span className="mt-1 block text-[13px] leading-snug text-soft">All four parts, every question and article, Latin beside the Dominican English. Tap any word for its parsing; add any article to your class quiz in one tap.</span>
        </button>}
        {(idx.groups || [["exam", ""]]).map(([g, gl]) => {
          const ws = idx.works.filter(w => (w.group || "exam") === g && (!OFFLINE || APP || w.offline));
          if (!ws.length) return null;
          const shelf = g === "opera"
            ? <div className="grid gap-1.5 sm:grid-cols-2">{ws.map(w => <button key={w.id} type="button" onClick={() => setPos({ ...pos, _open: w.id })} className="rounded-md border border-rule bg-leaf px-3 py-2 text-left hover:border-soft"><span lang="la" className="latin block text-[14px] font-semibold text-ink">{w.title}</span><span className="block text-[12px] text-soft">{w.author !== "St Thomas Aquinas" ? w.author + " · " : ""}{w.note}{pos[w.id] != null ? ` · reading part ${pos[w.id] + 1}` : ""}</span></button>)}</div>
            : g === "ot"
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
          if (g === "canon") return <section key={g} className="flex flex-col gap-2"><h3 className="smallcaps text-[15px] font-semibold text-rubric">{gl}</h3>{!(OFFLINE && !APP) && <CanonLookup onOpen={openAt} />}{shelf}</section>;
          return g === "ot" || g === "opera"
            ? <details key={g} className="rounded-lg border border-rule bg-paper px-4 py-3"><summary className="cursor-pointer smallcaps text-[15px] font-semibold text-rubric">{gl} <span className="font-normal normal-case text-soft">· {ws.length} {g === "ot" ? "books, with the Douay-Rheims" : "works, most with English"}</span></summary><div className="mt-3">{shelf}</div></details>
            : <section key={g} className="flex flex-col gap-2">{gl && <h3 className="smallcaps text-[15px] font-semibold text-rubric">{gl}</h3>}{shelf}</section>;
        })}
        {!(OFFLINE && !APP) && (
          <details className="rounded-lg border border-rule bg-paper px-4 py-3" open={!!pos._llOpen} onToggle={e => { if (!!e.currentTarget.open !== !!pos._llOpen) setPos({ ...pos, _llOpen: e.currentTarget.open }); }}>
            <summary className="cursor-pointer smallcaps text-[15px] font-semibold text-rubric">The Latin Library: all of it <span className="font-normal normal-case text-soft">· {idx.latinlibrary ? `${idx.latinlibrary.works} works, ${Math.round(idx.latinlibrary.words / 1e6)} million words` : "classical to Neo-Latin"}: Cicero, Caesar, Vergil, Livy… the Fathers, the Middle Ages, the Renaissance</span></summary>
            <div className="mt-3">{pos._llOpen && <LatinLibraryShelf pos={pos} onOpen={(id, extra) => setPos({ ...readLocal(LIB_KEY), ...(extra || {}), ...(id ? { _open: id } : {}) })} />}</div>
          </details>
        )}
        {OFFLINE && !APP && <p className="text-[13px] text-soft">This offline copy carries the first eight works; the whole Library and the complete Summa are in the phone app and the online page.</p>}
        <p className="text-[12px] text-soft">Texts: The Latin Library (thelatinlibrary.com), via the Classical Language Toolkit; the Catena Aurea from the Corpus Thomisticum (Latin) with the Oxford translation (English); St Thomas's other works and Cajetan from the Corpus Thomisticum (via github.com/antstratfordlol-bit/corpus-thomisticum); the Rituale Romanum (1952); the Roman Catechism and the 1917 Code from the Magisterium archive (github.com/realitix/magisterium); Zigliara and Mazzella from scans collected in James Penfold’s Lexicon Scholasticum; Boethius from the Loeb edition (1918, Project Gutenberg); the whole Latin Library shelf from thelatinlibrary.com (public domain). Word help covers the words these texts share with the parsed exam texts.</p>
      </div>
    );
  }
  if (!work) return <p className="text-[15px] text-soft">Loading…</p>;
  return <WorkReader work={work} meta={idx.works.find(w => w.id === work.id) || { group: /^ll-/.test(work.id) ? "ll" : "exam" }} pos={pos} setPos={setPos} help={help} topRef={topRef} hlRef={hlRef} onTable={onTable} />;
}
/* One book: chapters grouped by book in the chooser, verse kept in lines, Latin beside the English where there is one,
   text size, find-in-this-book, arrow keys for the next and previous chapter. */
const LIB_FS = [0.95, 1.08, 1.2, 1.35];
function WorkReader({ work, meta, pos, setPos, help, topRef, hlRef, onTable }) {
  const ci = Math.min(pos[work.id] || 0, work.chapters.length - 1);
  const ch = work.chapters[ci];
  const enOn = pos._en !== false;
  const fs = LIB_FS[pos._fs != null ? pos._fs : 1] || 1.08;
  const hlN = pos._hl ? normForm(pos._hl.replace(/\.$/, "")) : "";
  const hlAt = !hlN ? -1 : ch.paras.findIndex(p => /^can\. \d/.test(hlN) ? normForm(p).startsWith(hlN + ".") : normForm(p).split(/[^a-z]+/).some(w => w.startsWith(hlN)));
  const go = (i, hl) => { if (i < 0 || i >= work.chapters.length) return; setPos({ ...readLocal(LIB_KEY), [work.id]: i, _hl: hl || "" }); help.clear(); requestAnimationFrame(() => topRef.current && topRef.current.scrollIntoView({ block: "start" })); };
  useEffect(() => {
    const k = e => { if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if (e.key === "ArrowRight") go(ci + 1); if (e.key === "ArrowLeft") go(ci - 1); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [ci, work.id]);
  /* the chooser: "Liber I · Prosa III" is grouped under Liber I */
  const groups = useMemo(() => {
    const g = [];
    work.chapters.forEach((c, i) => { const [h, ...r] = c.title.split(" · "); const key = r.length ? h : ""; if (!g.length || g[g.length - 1].key !== key) g.push({ key, items: [] }); g[g.length - 1].items.push([i, r.length ? r.join(" · ") : c.title]); });
    return g.filter(x => x.key).length >= 2 && g.length < work.chapters.length ? g : null;
  }, [work.id]);
  const [find, setFind] = useState(""), [hits, setHits] = useState(null);
  function doFind() {
    const n = normForm(find.trim()); if (n.length < 2) { setHits(null); return; }
    const out = [];
    work.chapters.forEach((c, i) => c.paras.forEach(p => { if (out.length < 80 && normForm(p).split(/[^a-z]+/).some(w => w.startsWith(n))) {
      const at = normForm(p).indexOf(n); out.push({ i, t: c.title, snip: (at > 40 ? "…" : "") + p.slice(Math.max(0, at - 40), at + 80).replace(/\n/g, " ") + "…" }); } }));
    setHits(out);
  }
  const words = ch.paras.reduce((a, p) => a + p.split(/\s+/).length, 0);
  const verse = work.verse || ch.v;
  const g = meta.group || "exam";
  const kinds = ["thomas", "opera", "manuals"].includes(g) ? ["thomas"] : g === "ot" ? ["bible"] : g === "hymns" ? ["hymn", "church"] : ["rites", "fathers", "canon", "medieval"].includes(g) ? ["church"] : [];
  const side = !!(ch.en && enOn);
  return (
    <div className="flex flex-col gap-3">
      <div ref={topRef} className="scroll-mt-16 flex flex-wrap items-center gap-2">
        <button type="button" className="text-[14px] text-rubric underline underline-offset-2" onClick={() => setPos({ ...pos, _open: null })}>‹ Library</button>
        <span lang="la" className="latin text-[15px] font-bold text-ink">{work.title}</span>
        <span className="text-[13px] text-soft">{work.author}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={() => go(ci - 1)} disabled={ci === 0} aria-label="Previous chapter">‹</Btn>
        <label htmlFor="lib-ch" className="sr-only">Chapter</label>
        <select id="lib-ch" value={ci} onChange={e => go(+e.target.value)} className="min-w-0 flex-1 basis-48 rounded-md border border-rule bg-leaf px-2 py-1.5 text-[14px] text-ink">
          {groups ? groups.map((gr, k) => gr.key
            ? <optgroup key={k} label={gr.key}>{gr.items.map(([i, t]) => <option key={i} value={i}>{t.length > 70 ? t.slice(0, 68) + "…" : t}</option>)}</optgroup>
            : gr.items.map(([i, t]) => <option key={i} value={i}>{t.length > 70 ? t.slice(0, 68) + "…" : t}</option>))
            : work.chapters.map((c, i) => <option key={i} value={i}>{c.title.length > 70 ? c.title.slice(0, 68) + "…" : c.title}</option>)}
        </select>
        <Btn onClick={() => go(ci + 1)} disabled={ci === work.chapters.length - 1} aria-label="Next chapter">›</Btn>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-[var(--rule)]" aria-hidden="true"><div className="h-full rounded-full bg-[var(--rubric)]" style={{ width: `${((ci + 1) / work.chapters.length) * 100}%` }} /></div>
      <div className="flex flex-wrap items-center gap-2 text-[13px] text-soft">
        <span className="num">{ci + 1} of {work.chapters.length} · about {Math.max(1, Math.round(words / 90))} min</span>
        <span className="flex items-center gap-1" role="group" aria-label="Text size">
          <button type="button" className="rounded border border-rule bg-leaf px-2 py-0.5 text-ink disabled:opacity-40" disabled={(pos._fs ?? 1) <= 0} onClick={() => setPos({ ...pos, _fs: Math.max(0, (pos._fs ?? 1) - 1) })} aria-label="Smaller text">A−</button>
          <button type="button" className="rounded border border-rule bg-leaf px-2 py-0.5 text-ink disabled:opacity-40" disabled={(pos._fs ?? 1) >= LIB_FS.length - 1} onClick={() => setPos({ ...pos, _fs: Math.min(LIB_FS.length - 1, (pos._fs ?? 1) + 1) })} aria-label="Larger text">A+</button>
        </span>
        <form className="flex min-w-0 flex-1 basis-56 items-center gap-1" onSubmit={e => { e.preventDefault(); doFind(); }}>
          <input value={find} onChange={e => { setFind(e.target.value); if (!e.target.value) setHits(null); }} placeholder="Find in this book (e.g. beatitudo)" aria-label="Find in this book" className="min-w-0 flex-1 rounded-md border border-rule bg-paper px-2 py-1 text-[14px] text-ink" />
          <Btn type="submit">Find</Btn>
        </form>
      </div>
      {hits && (
        <section className="rounded-lg border border-rule bg-leaf px-4 py-3" aria-label="Found in this book">
          <div className="flex items-baseline justify-between"><span className="text-[13px] text-soft">{hits.length ? `${hits.length}${hits.length === 80 ? "+" : ""} places` : "Not found in this book."}</span><button type="button" className="text-[13px] text-soft underline" onClick={() => setHits(null)}>Close</button></div>
          <ul className="mt-1 max-h-64 overflow-y-auto text-[14px]">{hits.map((h, k) => <li key={k}><button type="button" className="w-full rounded px-1 py-0.5 text-left hover:bg-paper" onClick={() => { go(h.i, find.trim()); setHits(null); }}>
            <span className="text-[12px] text-rubric">{h.t}</span> <span lang="la" className="latin text-ink">{h.snip}</span></button></li>)}</ul>
        </section>
      )}
      {kinds.length ? <PhraseTips text={ch.paras.join(" ")} kinds={kinds} /> : null}
      <article className="rounded-lg border border-rule bg-leaf px-5 py-5 sm:px-8">
        <h2 lang="la" className="latin mb-3 text-[1.05rem] font-bold text-rubric">{ch.title}</h2>
        {meta.caveat && <p className="mb-3 text-[13px] text-soft">{meta.caveat}</p>}
        {(ch.en || ch.enb) && (
          <label className="mb-3 flex items-center gap-2 text-[14px] text-ink"><input type="checkbox" checked={enOn} onChange={e => setPos({ ...pos, _en: e.target.checked })} className="h-4 w-4 accent-[var(--rubric)]" />{meta.en || "English (Douay-Rheims)"}</label>
        )}
        <div className={`flex flex-col ${verse ? "gap-5" : "gap-3"}`}>
          {ch.paras.map((p, i) => {
            const en = side ? ch.en[i] : null;
            const rub = ch.r && ch.r.includes(i), head = ch.head && i === 0;
            return (
              <div key={i} ref={i === hlAt ? hlRef : null} className={`${en ? "grid gap-x-6 gap-y-1 sm:grid-cols-2" : ""}${i === hlAt ? " -mx-2 rounded-md bg-rubrictint px-2 py-1" : ""}${head ? " border-b border-rule pb-3" : ""}`}>
                {head && <span className="smallcaps mb-1 block text-[12px] font-semibold text-rubric">The Gospel</span>}
                <p lang="la" style={{ fontSize: rub ? fs * 0.9 + "rem" : fs + "rem" }} className={`lt latin leading-[1.8] ${rub ? "italic text-rubric" : head ? "font-semibold text-ink" : "text-ink"}${verse ? " whitespace-pre-line" : ""}`}>
                  <OfficeText line={p} latin onWord={help.pick} sel={help.word} />
                </p>
                {en && <p lang="en" className={`text-[15px] leading-snug text-soft${verse ? " whitespace-pre-line italic" : ""}`}>{en}</p>}
              </div>
            );
          })}
        </div>
        {ch.enb && enOn && ch.enb.length > 0 && (
          <div lang="en" className="mt-5 flex flex-col gap-2 border-t border-rule pt-4">
            <span className="smallcaps text-[13px] font-semibold text-rubric">{meta.en || "English"}</span>
            {ch.enb.map((t, i) => <p key={i} className={`text-[15px] leading-snug text-soft${verse ? " whitespace-pre-line" : ""}`}>{t}</p>)}
          </div>
        )}
      </article>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {ci > 0 ? <Btn onClick={() => go(ci - 1)}>← {work.chapters[ci - 1].title.split(" · ").slice(-1)[0].slice(0, 30)}</Btn> : <span />}
        {ci < work.chapters.length - 1 && <Btn variant="primary" onClick={() => go(ci + 1)}>{work.chapters[ci + 1].title.split(" · ").slice(-1)[0].slice(0, 30)} →</Btn>}
      </div>
      {help.panel(work.title, onTable)}
    </div>
  );
}

/* ---------- Search the Library and the Summa ----------
   data/search (tools/library/build_search.py): every word form -> the chapters and Summa articles that hold it.
   Each search word matches the forms that begin with it (caritat finds caritas, caritatis, caritatem…);
   several words find the places that have all of them. */
const searchCache = {};
const searchGet = name => (searchCache[name] = searchCache[name] || getJSON(`data/search/${name}.json`).catch(e => { delete searchCache[name]; throw e; }));
async function searchDocs(q) {
  const terms = [...new Set(normForm(q).split(/[^a-z]+/).filter(t => t.length >= 2))].slice(0, 5);
  if (!terms.length) return { terms, hits: [] };
  const meta = await searchGet("docs");
  let acc = null;
  for (const t of terms) {
    const where = meta.where[t.slice(0, 2)];
    const set = new Set();
    if (where != null) {
      const shard = await searchGet("s" + where);
      for (const [w, ds] of Object.entries(shard)) {
        if (!w.startsWith(t)) continue;
        let d = 0; for (const x of ds) { d += x; set.add(d); }
      }
    }
    acc = acc ? new Set([...acc].filter(d => set.has(d))) : set;
    if (!acc.size) break;
  }
  return { terms, hits: [...acc].sort((a, b) => a - b).map(d => meta.docs[d]) };
}
function snippetOf(paras, terms) {
  const hit = w => terms.some(t => normForm(w).startsWith(t));
  for (const p of paras) {
    const words = p.split(/([A-Za-zÀ-ÿæœÆŒ]+)/);
    const k = words.findIndex((w, i) => i % 2 === 1 && hit(w));
    if (k < 0) continue;
    const before = words.slice(0, k).join(""), after = words.slice(k + 1).join("");
    return { pre: (before.length > 90 ? "…" + before.slice(-90) : before), w: words[k], post: after.length > 140 ? after.slice(0, 140) + "…" : after };
  }
  return null;
}
function LibrarySearch({ idx, onOpen }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);   // { q, terms, hits }
  const [shown, setShown] = useState(10);
  const [snips, setSnips] = useState({});
  const [busy, setBusy] = useState(false);
  const [sidx, setSidx] = useState(null);
  async function run(e) {
    if (e) e.preventDefault();
    if (!q.trim()) return;
    setBusy(true); setSnips({}); setShown(10);
    try { const r = await searchDocs(q); setRes({ q, ...r }); if (!sidx) loadSummaIndex().then(setSidx).catch(() => {}); }
    catch (err) { setRes({ q, terms: [], hits: [], err: true }); }
    finally { setBusy(false); }
  }
  const keyOf = h => h.join(":");
  useEffect(() => {
    if (!res) return;
    let alive = true;
    res.hits.slice(0, shown).forEach(async h => {
      const k = keyOf(h);
      if (snips[k] !== undefined) return;
      try {
        const paras = h[0] === "L" ? (await libGet(h[1])).chapters[h[2]].paras : ((await loadSummaQ(h[1], h[2])) || { a: [] }).a[h[3] - 1] || [];
        if (alive) setSnips(s => ({ ...s, [k]: snippetOf(paras, res.terms) }));
      } catch (e) { if (alive) setSnips(s => ({ ...s, [k]: null })); }
    });
    return () => { alive = false; };
  }, [res, shown]);
  const title = h => {
    if (h[0] === "S") {
      const part = sidx && sidx.parts.find(x => x.id === h[1]), qr = part && part.qs.find(x => x[0] === h[2]);
      return { t: `Summa ${SM_PART[h[1]]}, q. ${h[2]}, a. ${h[3]}`, s: qr ? (qr[2][h[3] - 1] || qr[1]) : "" };
    }
    const w = idx.works.find(x => x.id === h[1]);
    return { t: w ? w.title : h[1], s: w ? w.chapters[h[2]] : "" };
  };
  function open(h) {
    if (h[0] === "S") {
      writeLocal(SUMMA_POS_KEY, { ...(readLocal(SUMMA_POS_KEY) || {}), p: h[1], q: h[2], a: h[3] });
      onOpen("summa");
    } else onOpen(h[1], h[2], res.terms[0]);
  }
  return (
    <div className="mt-3 flex flex-col gap-2">
      <form onSubmit={run} className="flex gap-2" role="search">
        <label htmlFor="lib-search" className="sr-only">Search the Library and the Summa</label>
        <input id="lib-search" lang="la" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search the Latin: e.g. caritas amicitia"
          className="min-w-0 flex-1 rounded-md border border-rule bg-paper px-3 py-2 text-[15px] text-ink" />
        <Btn variant="primary" type="submit" disabled={busy || !q.trim()}>{busy ? "…" : "Search"}</Btn>
      </form>
      {res && (
        <div className="flex flex-col gap-1.5" aria-live="polite">
          <p className="text-[13px] text-soft">{res.err ? "The search didn’t load. Check your connection and try again." : res.hits.length ? `${res.hits.length} place${res.hits.length === 1 ? "" : "s"} with ${res.terms.length > 1 ? "all of " : ""}“${res.terms.join(" ")}…” (words beginning so)` : `Nothing found for “${res.q}”. Try the beginning of the word (caritat for caritas, caritatis…).`}</p>
          <ul className="flex flex-col gap-1.5">
            {res.hits.slice(0, shown).map(h => {
              const t = title(h), sn = snips[keyOf(h)];
              return (
                <li key={keyOf(h)}>
                  <button type="button" onClick={() => open(h)} className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-left hover:border-soft">
                    <span className="block text-[14px] font-semibold text-ink">{t.t}<span className="font-normal text-soft">{t.s ? " · " + (t.s.length > 70 ? t.s.slice(0, 68) + "…" : t.s) : ""}</span></span>
                    {sn && <span lang="la" className="latin block text-[14px] leading-snug text-soft">{sn.pre}<mark className="rounded bg-rubrictint px-0.5 font-bold text-rubric">{sn.w}</mark>{sn.post}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          {res.hits.length > shown && <Btn onClick={() => setShown(n => n + 10)}>Show more ({res.hits.length - shown} left)</Btn>}
        </div>
      )}
    </div>
  );
}
