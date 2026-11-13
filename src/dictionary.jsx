/* ---------- Dictionary: look up any Latin word (any form), or find the Latin for an English word ----------
   From the header on every page. Latin: the word's possible parsings (the parsed texts, then Wiktionary's forms, then a guess
   from the ending), with Lewis & Short, Wiktionary and Du Cange, all forms, and add-to-deck; headwords are suggested while
   typing (Lewis & Short's headword list). English: the app's lexicon glosses, commonest words first. Recent lookups are kept. */
const DICT_KEY = "lectio-vulgata-dict";
function DictionaryTool({ onTap, onTable, onClose, start }) {
  const pref = readLocal(DICT_KEY) || {};
  const [dir, setDir] = useState(pref.dir === "en" ? "en" : "la");
  const [q, setQ] = useState(start || "");
  const [word, setWord] = useState(start || "");          // the word being shown
  const [lex, setLex] = useState(null);
  const [sugg, setSugg] = useState([]);
  const [recent, setRecent] = useState(Array.isArray(pref.recent) ? pref.recent.slice(0, 20) : []);
  const inRef = useRef(null);
  useEffect(() => { loadLex().then(setLex).catch(() => {}); requestAnimationFrame(() => inRef.current && inRef.current.focus()); }, []);
  useEffect(() => { if (start) { setQ(start); setWord(start); setDir("la"); } }, [start]);
  const save = p => writeLocal(DICT_KEY, { ...(readLocal(DICT_KEY) || {}), ...p });
  function look(w, d = dir) {
    const t = (w || "").trim(); if (!t) return;
    setQ(t); setWord(t); setSugg([]); setDir(d);
    const r = [t, ...recent.filter(x => x !== t)].slice(0, 20); setRecent(r); save({ recent: r, dir: d });
  }
  /* headword suggestions while typing (Latin): Lewis & Short's headwords and the lexicon's lemmas beginning so */
  useEffect(() => {
    if (dir !== "la") { setSugg([]); return; }
    const k = lsNorm(q);
    if (k.length < 2 || q.trim() === word) { setSugg([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      const out = new Set();
      if (lex) for (const l of lex.lemmas) { if (out.size >= 6) break; if (lsNorm(l[0]).startsWith(k) && l[1]) out.add(l[0]); }
      if (!(OFFLINE && !APP)) try {
        const where = await lsGet("where");
        const f = where[k.slice(0, 3).padEnd(3, "_")] ?? where[k.slice(0, 2).padEnd(2, "_")];
        if (f != null) { const shard = await lsGet(f); for (const h of Object.keys(shard).sort()) { if (out.size >= 12) break; if (h.startsWith(k)) out.add(h); } }
      } catch (e) {}
      if (alive) setSugg([...out]);
    }, 150);
    return () => { alive = false; clearTimeout(t); };
  }, [q, dir, lex]);
  const tab = on => `rounded-md px-2.5 py-1 text-[14px] ${on ? "bg-ink text-paper" : "text-ink"}`;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-rule bg-paper p-0.5" role="group" aria-label="Direction">
          <button type="button" className={tab(dir === "la")} aria-pressed={dir === "la"} onClick={() => { setDir("la"); save({ dir: "la" }); setWord(""); }}>Latin → English</button>
          <button type="button" className={tab(dir === "en")} aria-pressed={dir === "en"} onClick={() => { setDir("en"); save({ dir: "en" }); setWord(""); }}>English → Latin</button>
        </div>
        {onClose && <button type="button" className="text-[13px] text-soft underline" onClick={onClose}>Close</button>}
      </div>
      <form role="search" className="relative flex gap-2" onSubmit={e => { e.preventDefault(); look(q); }}>
        <label htmlFor="dict-q" className="sr-only">{dir === "la" ? "A Latin word, in any form" : "An English word"}</label>
        <input id="dict-q" ref={inRef} type="search" value={q} autoComplete="off" autoCapitalize="off" spellCheck={false} lang={dir === "la" ? "la" : "en"}
          onChange={e => setQ(e.target.value)} placeholder={dir === "la" ? "Any Latin word or form: fecit, gratiae, caritas…" : "An English word: grace, mercy, to rule…"}
          className={`min-w-0 flex-1 rounded-md border border-rule bg-paper px-3 py-2 text-[16px] text-ink ${dir === "la" ? "latin" : ""}`} />
        <Btn variant="primary" type="submit" disabled={!q.trim()}>Look up</Btn>
        {sugg.length > 0 && (
          <ul className="absolute left-0 right-24 top-full z-30 mt-1 max-h-64 overflow-auto rounded-md border border-rule bg-paper shadow-[0_4px_16px_rgba(0,0,0,0.12)]" role="listbox" aria-label="Headwords">
            {sugg.map(s => <li key={s}><button type="button" role="option" aria-selected="false" onClick={() => look(s)} className="w-full px-3 py-1.5 text-left text-[15px] hover:bg-leaf"><span lang="la" className="latin">{s}</span></button></li>)}
          </ul>
        )}
      </form>
      {!word && recent.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[13px]"><span className="text-soft">Recent:</span>
          {recent.slice(0, 12).map(r => <button key={r} type="button" onClick={() => look(r, /^[a-z\s-]+$/i.test(r) && dir === "en" ? "en" : dir)} className="rounded border border-rule bg-paper px-2 py-0.5 text-ink hover:border-soft"><span lang="la" className="latin">{r}</span></button>)}
          <button type="button" className="text-soft underline" onClick={() => { setRecent([]); save({ recent: [] }); }}>clear</button>
        </div>
      )}
      {word && (dir === "la"
        ? <LatinEntry key={word} word={word} lex={lex} onTap={onTap} onTable={onTable} onLook={w => look(w, "la")} />
        : <EnglishToLatin key={word} q={word} lex={lex} onLook={w => look(w, "la")} />)}
      {!word && <p className="text-[13px] text-soft">Type any form: the dictionary finds its dictionary word (fecerunt → facio) and shows Lewis &amp; Short, Wiktionary (with Church senses marked) and Du Cange for medieval and Church Latin. Tap a headword below the box while you type.</p>}
    </div>
  );
}
function LatinEntry({ word, lex, onTap, onTable, onLook }) {
  const [wk, setWk] = useState(null), [guess, setGuess] = useState(null);
  useEffect(() => {
    let alive = true;
    if (OFFLINE && !APP) { setWk([]); setGuess([]); return; }
    wktLookup(word).then(r => alive && setWk(r)).catch(() => alive && setWk([]));
    lsGuess(word).then(r => alive && setGuess(r)).catch(() => alive && setGuess([]));
    return () => { alive = false; };
  }, [word]);
  const k = lsNorm(word);
  /* the app's own lexicon: the word as a dictionary word, or as a form met in the parsed texts */
  const own = useMemo(() => {
    if (!lex) return [];
    const want = new Set([k, ...(wk || []).map(x => lsNorm(x[0])), ...(!(wk && wk.length) && guess ? guess.map(lsNorm) : [])]);
    const out = [];
    lex.lemmas.forEach((l, li) => { if (l[1] && want.has(lsNorm(l[0]))) out.push(li); });
    return out.slice(0, 4);
  }, [lex, k, wk, guess]);
  const rank = useMemo(() => { if (!lex) return {}; const r = {}; lex.freq.forEach((f, i) => { r[f[0]] = i + 1; }); return r; }, [lex]);
  const lemmas = [...new Set([...own.map(li => lex.lemmas[li][0]), ...(wk || []).map(x => x[0]), ...(guess || [])])].slice(0, 4);
  const loading = wk === null || guess === null;
  const lisOf = l => lex ? lex.lemmas.map((x, i) => [x, i]).filter(([x]) => lsNorm(x[0]) === lsNorm(l) && x[1]).map(([, i]) => i) : [];
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-4 py-3" aria-label="Entry" aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 lang="la" className="latin text-[1.3rem] font-bold text-ink">{word}</h3>
        <span className="flex flex-wrap gap-x-3 text-[13px]">
          <a className="text-rubric underline underline-offset-2" href={`https://logeion.uchicago.edu/${encodeURIComponent(lemmas[0] || word)}`} target="_blank" rel="noopener noreferrer">Logeion ↗</a>
      <a className="text-rubric underline underline-offset-2" title="Forcellini, Totius Latinitatis Lexicon: Latin explained in Latin" href={`https://www.lexica.linguax.com/forc.php?searchedLG=${encodeURIComponent(String(lemmas[0] || word).replace(/[^A-Za-zÀ-ÿ]/g, ""))}`} target="_blank" rel="noopener noreferrer">Forcellini (Latin–Latin) ↗</a>
          <a className="text-rubric underline underline-offset-2" href={`https://en.wiktionary.org/wiki/${encodeURIComponent(lemmas[0] || word)}#Latin`} target="_blank" rel="noopener noreferrer">Wiktionary ↗</a>
        </span>
      </div>
      {own.map(li => {
        const l = lex.lemmas[li];
        return (
          <div key={li} className="rounded-md border border-rule bg-paper px-3 py-2">
            <p><span lang="la" className="latin font-bold text-rubric">{l[2] || l[0]}</span> <span className="text-[15px] text-ink">{l[1]}</span></p>
            <p className="mt-0.5 text-[12px] text-soft">{rank[li] ? `No. ${rank[li]} among the words of the exam texts` : "In the app’s word list"}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {onTable && <Btn onClick={() => onTable(li, word)}>All forms →</Btn>}
              {onTap && <Btn onClick={() => onTap([l[0]])}>Add to my vocabulary deck</Btn>}
            </div>
          </div>
        );
      })}
      {wk && wk.length > 0 && (
        <div>
          <p className="smallcaps text-[13px] text-soft">{wk.length > 1 ? "This form can be" : "Parsing"} (Wiktionary)</p>
          <ul className="mt-1 flex flex-col gap-1">{wk.slice(0, 12).map((x, i) => (
            <li key={i} className="text-[15px] leading-snug">
              <button type="button" onClick={() => lsNorm(x[0]) !== k && onLook(x[0])} className="latin font-bold text-rubric underline-offset-2 hover:underline" lang="la">{x[0]}</button>{" "}
              <span className="text-[14px] text-soft">{x[1]}{x[2] ? ": " + x[2] : ""}</span>
              {onTable && lsNorm(x[0]) !== k && lisOf(x[0]).slice(0, 1).map(li => <button key={li} type="button" className="ml-2 text-[12px] text-rubric underline" onClick={() => onTable(li, word)}>all forms</button>)}
            </li>
          ))}</ul>
        </div>
      )}
      {!loading && !own.length && !(wk && wk.length) && guess && guess.length > 0 && (
        <p className="text-[14px] text-ink">Not in the parsed texts or Wiktionary’s forms: probably a form of {guess.map((g, i) => <span key={g}>{i ? ", " : ""}<button type="button" className="latin font-bold text-rubric underline" lang="la" onClick={() => onLook(g)}>{g}</button></span>)} (a guess from the ending).</p>
      )}
      {loading && <p className="text-[14px] text-soft">Looking it up…</p>}
      {!loading && !lemmas.length && <p className="text-[14px] text-soft">No dictionary word found for “{word}”. It may be a name, an abbreviation or a misprint; check the spelling (the dictionary ignores macrons, j/i and v/u).</p>}
      {lemmas.length > 0 && <LewisShort lemmas={lemmas} openFirst />}
      {OFFLINE && !APP && <p className="text-[13px] text-soft">The dictionaries are in the phone app and the online page; this offline copy has the app’s own word list only.</p>}
    </section>
  );
}
function EnglishToLatin({ q, lex, onLook }) {
  const hits = useMemo(() => {
    if (!lex) return null;
    const terms = q.toLowerCase().replace(/^to\s+/, "").split(/\s+/).filter(Boolean);
    const re = terms.map(t => new RegExp(`(^|[^a-z])${t.replace(/[^a-z'-]/g, "")}`, "i"));
    const rank = {}; lex.freq.forEach((f, i) => { rank[f[0]] = i + 1; });
    const out = [];
    lex.lemmas.forEach((l, li) => {
      if (!l[1] || !re.every(r => r.test(l[1]))) return;
      const first = l[1].split(/[;,(]/)[0].trim().toLowerCase();
      const exact = first === terms.join(" ") || first === "to " + terms.join(" ") ? 0 : 1;
      out.push({ li, l, score: exact * 100000 + (rank[li] || 50000) });
    });
    return out.sort((a, b) => a.score - b.score).slice(0, 40);
  }, [lex, q]);
  if (!hits) return <p className="text-[14px] text-soft">Loading the word list…</p>;
  return (
    <section className="flex flex-col gap-1 rounded-lg border border-rule bg-leaf px-4 py-3" aria-label="Latin words" aria-live="polite">
      <p className="text-[13px] text-soft">{hits.length ? `Latin for “${q}”: commonest in the exam texts first. Tap one for its entry.` : `No word in the app’s list has “${q}” in its meaning. Try a simpler word (grace, not graciousness), or Wiktionary.`}</p>
      <ul className="flex flex-col divide-y divide-[var(--rule)]">{hits.map(h => (
        <li key={h.li}><button type="button" onClick={() => onLook(h.l[0])} className="w-full py-1.5 text-left hover:bg-paper">
          <span lang="la" className="latin font-bold text-rubric">{h.l[2] || h.l[0]}</span> <span className="text-[14px] text-ink">{h.l[1]}</span></button></li>
      ))}</ul>
      <p className="text-[11px] text-soft">From the app’s word list (glosses from Whitaker’s Words): about 9,000 words, those of the exam texts and the Library.</p>
    </section>
  );
}
