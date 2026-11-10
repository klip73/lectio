/* ---------- My class list: vocabulary from the exact sections a class is reading, to learn and be quizzed on ----------
   A student adds sections (New Testament chapters; Summa articles, choosing objections / sed contra / respondeo / replies).
   Every word in them is looked up through the parsings (lemma, meaning), with its first example from the section.
   The list is kept in this browser; words learnt here share their schedule with every other deck (keyed by lemma). */
const CLASS_KEY = "lectio-vulgata-class";
const ST_PARTS = [["obj", "Objections"], ["sc", "Sed contra"], ["resp", "Respondeo"], ["ad", "Replies"]];
function readClass() { const c = readLocal(CLASS_KEY); return c && typeof c === "object" && Array.isArray(c.sections) ? c : { sections: [], words: [], basic: false }; }
const writeClass = c => writeLocal(CLASS_KEY, c);
/* Which part of a Summa article a paragraph is. */
function stPart(la, prev) {
  if (/^\s*Sed contra/i.test(la)) return "sc";
  if (/^\s*Respondeo/i.test(la)) return "resp";
  if (/^\s*Ad (primum|secundum|tertium|quartum|quintum|sextum|septimum|octavum|nonum|decimum|undecimum|duodecimum|\w+um) /i.test(la)) return "ad";
  if (/^\s*(Videtur|Praeterea|Ulterius)/i.test(la)) return "obj";
  return prev || "obj";
}
function sectionLabel(s) {
  const bk = BOOK[s.b];
  if (!bk) return "?";
  if (s.t === "nt") return `${bk[1]} ${s.c1}${s.c2 && s.c2 !== s.c1 ? "–" + s.c2 : ""}`;
  const q = (bk[1].match(/\d+/) || [""])[0];
  const art = s.a ? `a. ${(bk[4] && bk[4][s.a - 1] || "Article " + s.a).replace(/\D+/g, "")}` : "all articles";
  const parts = s.parts && s.parts.length < 4 ? " · " + s.parts.map(p => ST_PARTS.find(x => x[0] === p)[1]).join(", ") : "";
  return `Summa I q. ${q}, ${art}${parts}`;
}
/* The words of the chosen sections: [lemma, count, ref, example with [[word]], analysis id], most frequent first. */
async function classWords(sections, lex, basic) {
  const found = {}, order = [];
  let total = 0, unknown = 0;
  for (const s of sections) {
    const book = await loadBook(s.b);
    const chs = s.t === "nt" ? Array.from({ length: (s.c2 || s.c1) - s.c1 + 1 }, (_, i) => s.c1 + i) : s.a ? [s.a] : book.ch.map((_, i) => i + 1);
    for (const c of chs) {
      let part = null;
      for (const v of book.ch[c - 1] || []) {
        if (s.t === "st") { part = stPart(v[1], part); if (s.parts && !s.parts.includes(part)) continue; }
        const words = v[1].match(WORD_RE) || [];
        words.forEach((w, k) => {
          total++;
          const rd = readings(v[3] && v[3][k]);
          if (!(rd.kind === "context" || rd.kind === "lookup")) { unknown++; return; }
          const [li, pos] = lex.ana[rd.ids[0]];
          const [lemma, gloss] = lex.lemmas[li];
          if (!gloss || /^(Ne|F-)/.test(pos) || (!basic && BASIC.has(lemma.toLowerCase()))) return;
          if (!found[lemma]) {
            const a = Math.max(0, k - 7), z = Math.min(words.length, k + 8);
            /* Rebuild the snippet from the verse text so punctuation survives; mark the word itself. */
            let from = 0, to = v[1].length, at = 0, atEnd = 0;
            const re = new RegExp(WORD_RE.source, "g"); let m, i = 0;
            while ((m = re.exec(v[1]))) { if (i === a) from = m.index; if (i === k) { at = m.index; atEnd = m.index + m[0].length; } if (i === z - 1) to = m.index + m[0].length; i++; }
            const ex = (a > 0 ? "… " : "") + v[1].slice(from, at) + "[[" + v[1].slice(at, atEnd) + "]]" + v[1].slice(atEnd, to) + (z < words.length ? " …" : "");
            found[lemma] = [lemma, 0, refText([s.b, c, v[0]]), ex, rd.kind === "context" ? rd.ids[0] : -1];
            order.push(lemma);
          }
          found[lemma][1]++;
        });
      }
    }
  }
  const words = order.map(l => found[l]).sort((x, y) => y[1] - x[1]);
  return { words, total, unknown };
}
const shortGloss = g => (g || "").split(/[;(]/)[0].replace(/\s+/g, " ").trim().slice(0, 60);

/* Quiz: multiple choice both ways; every answer also grades the word's flashcard. */
function makeClassQuiz(words, lex, V, n, seed) {
  const r = rng(seed);
  const pool = shuffle(words, r).slice(0, n);
  const info = l => { const li = V.byLemma[l]; return li === undefined ? null : { lemma: l, head: lex.lemmas[li][2] || l, gloss: shortGloss(lex.lemmas[li][1]), pos: V.posOf[li] }; };
  const all = words.map(w => info(w[0])).filter(x => x && x.gloss);
  const extra = lex.freq.slice(100, 3000).map(([li]) => info(lex.lemmas[li][0])).filter(x => x && x.gloss);
  return pool.map((w, i) => {
    const me = info(w[0]);
    if (!me || !me.gloss) return null;
    const toEn = r() < 0.6;
    const same = x => x.lemma !== me.lemma && x.gloss !== me.gloss && (x.pos || "")[0] === (me.pos || "")[0];
    const cands = shuffle(all.filter(same), r).concat(shuffle(extra.filter(same), r), shuffle(all.filter(x => x.lemma !== me.lemma && x.gloss !== me.gloss), r));
    const opts = [me];
    for (const c of cands) { if (opts.length >= 4) break; if (!opts.some(o => (toEn ? o.gloss : o.lemma) === (toEn ? c.gloss : c.lemma))) opts.push(c); }
    if (opts.length < 4) return null;
    return { lemma: me.lemma, toEn, prompt: toEn ? me.head : me.gloss, ans: toEn ? me.gloss : me.lemma, opts: shuffle(opts, r).map(o => (toEn ? o.gloss : o.lemma)), ex: w[3], ref: w[2], full: lex.lemmas[V.byLemma[me.lemma]][1], head: me.head, key: i };
  }).filter(Boolean);
}

function ClassQuiz({ words, lex, V, n, onGrade, onDone }) {
  const [qs] = useState(() => makeClassQuiz(words, lex, V, n, String(Date.now())));
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [wrong, setWrong] = useState([]);
  const [right, setRight] = useState(0);
  if (!qs.length) return <p className="text-[15px] text-soft">Not enough words with meanings to make a quiz.</p>;
  if (i >= qs.length) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-5" aria-label="Quiz result">
        <h3 className="latin text-[1.2rem] font-bold text-ink">{right} of {qs.length} right ({Math.round(right / qs.length * 100)}%)</h3>
        {wrong.length > 0 ? (
          <>
            <p className="text-[14px] text-soft">To go over:</p>
            <ul className="flex flex-col gap-1 text-[15px]">
              {wrong.map(q => <li key={q.lemma}><span lang="la" className="latin font-bold text-ink">{q.head}</span> <span className="text-soft">· {shortGloss(q.full)}</span></li>)}
            </ul>
          </>
        ) : <p className="text-[15px] text-ok">Perfect. Every word is marked as known for now; they’ll come back for review later.</p>}
        <div className="flex flex-wrap gap-2">
          {wrong.length > 0 && <Btn variant="primary" onClick={() => onDone(wrong.map(q => q.lemma))}>Quiz me on these again</Btn>}
          <Btn onClick={() => onDone(null)}>Back to my list</Btn>
        </div>
      </section>
    );
  }
  const q = qs[i];
  function choose(o) {
    if (pick != null) return;
    setPick(o);
    const ok = o === q.ans;
    if (ok) setRight(x => x + 1); else setWrong(w => [...w, q]);
    onGrade(q.lemma, ok ? "got" : "review");
  }
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-5 sm:px-7" aria-label="Quiz question">
      <div className="flex items-baseline justify-between text-[13px] text-soft">
        <span className="smallcaps font-semibold text-rubric">{q.toEn ? "What does it mean?" : "Which Latin word?"}</span>
        <span className="num">{i + 1} of {qs.length} · {right} right</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--rule)]" aria-hidden="true"><div className="h-full rounded-full bg-[var(--rubric)]" style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      <p lang={q.toEn ? "la" : "en"} className={q.toEn ? "latin text-[1.7rem] font-bold leading-tight text-ink" : "text-[1.3rem] font-semibold leading-snug text-ink"}>{q.prompt}</p>
      <div className="flex flex-col gap-1.5">
        {q.opts.map(o => {
          const cls = pick == null ? "border-rule bg-paper text-ink hover:border-soft" : o === q.ans ? "border-ok bg-oktint text-ok" : o === pick ? "border-warn bg-warntint text-warn" : "border-rule bg-paper text-soft";
          return <button key={o} type="button" disabled={pick != null} onClick={() => choose(o)} lang={q.toEn ? "en" : "la"} className={`rounded-md border px-3 py-2 text-left text-[15px] leading-snug ${q.toEn ? "" : "latin"} ${cls}`}>{o}</button>;
        })}
      </div>
      {pick != null && (
        <div className="reveal flex flex-col gap-2 border-l-2 border-rubric pl-3">
          <p className="text-[14px] text-ink"><span lang="la" className="latin font-bold">{q.head}</span>: {q.full}</p>
          {q.ex && <p lang="la" className="latin text-[15px] leading-relaxed text-ink"><Snippet text={q.ex} /> <span className="text-[12px] text-soft">({q.ref})</span></p>}
          <div><Btn variant="primary" onClick={() => { setI(i + 1); setPick(null); }}>{i + 1 >= qs.length ? "See my score →" : "Next →"}</Btn></div>
        </div>
      )}
      <button type="button" className="self-start text-[13px] text-soft underline" onClick={() => setI(qs.length)}>End the quiz</button>
    </section>
  );
}

function ClassVocab({ lex, V, prog, onGrade, onLearn }) {
  const [cls, setCls0] = useState(readClass);
  const setCls = c => { setCls0(c); writeClass(c); };
  const [t, setT] = useState("nt");
  const ntBooks = partBooks("nt"), stBooks = partBooks("st");
  const [b, setB] = useState(ntBooks[0][0]);
  const [c1, setC1] = useState(1), [c2, setC2] = useState(1);
  const [qb, setQb] = useState(stBooks[0][0]);
  const [art, setArt] = useState(0);
  const [parts, setParts] = useState(["sc", "resp"]);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [quiz, setQuiz] = useState(null);   // { n, only: [lemmas] | null }
  const [show, setShow] = useState(false);
  const nCh = BOOK[b] ? BOOK[b][2].length : 1;
  async function rebuild(next) {
    setBusy(true);
    try {
      const { words, total, unknown } = await classWords(next.sections, lex, next.basic);
      setCls({ ...next, words }); setStats({ total, unknown });
    } finally { setBusy(false); }
  }
  function add() {
    const s = t === "nt" ? { t, b, c1: Math.min(c1, c2), c2: Math.max(c1, c2) } : { t, b: qb, a: art, parts: parts.length ? parts : ST_PARTS.map(p => p[0]) };
    rebuild({ ...cls, sections: [...cls.sections, s] });
  }
  const vc = prog.vcards || {};
  const words = cls.words || [];
  const knownN = words.filter(w => vc[w[0]] && vc[w[0]].box >= 2).length;
  const sel = "rounded-md border border-rule bg-paper px-2 py-1.5 text-[14px] text-ink";
  if (quiz) {
    const pool = quiz.only ? words.filter(w => quiz.only.includes(w[0])) : words;
    return <ClassQuiz key={quiz.k} words={pool} lex={lex} V={V} n={Math.min(quiz.n, pool.length)} onGrade={onGrade}
      onDone={again => setQuiz(again && again.length ? { n: again.length, only: again, k: Date.now() } : null)} />;
  }
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="My class sections">
        <h3 className="latin text-[1.1rem] font-bold text-ink">My class list</h3>
        <p className="text-[14px] leading-snug text-soft">Add the sections your class is reading this week. Every word in them is listed with its meaning and an example from your section, to learn and be quizzed on.</p>
        {cls.sections.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {cls.sections.map((s, i) => (
              <li key={i} className="flex items-center gap-1.5 rounded-md border border-rule bg-paper px-2 py-1 text-[13px] text-ink">
                {sectionLabel(s)}
                <button type="button" aria-label={`Remove ${sectionLabel(s)}`} className="text-soft hover:text-warn" onClick={() => rebuild({ ...cls, sections: cls.sections.filter((_, j) => j !== i) })}>✕</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2 border-t border-rule pt-3">
          <div className="flex gap-1 self-start rounded-lg border border-rule bg-paper p-0.5 text-[14px]" role="group" aria-label="Text">
            {[["nt", "New Testament"], ["st", "Summa"]].map(([k, l]) => <button key={k} type="button" aria-pressed={t === k} onClick={() => setT(k)} className={`rounded px-2.5 py-1 ${t === k ? "bg-ink text-paper" : "text-ink"}`}>{l}</button>)}
          </div>
          {t === "nt" ? (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="cv-book" className="sr-only">Book</label>
              <select id="cv-book" value={b} onChange={e => { setB(e.target.value); setC1(1); setC2(1); }} className={sel}>{ntBooks.map(x => <option key={x[0]} value={x[0]}>{x[1]}</option>)}</select>
              <label htmlFor="cv-c1" className="text-[14px] text-soft">chapter</label>
              <select id="cv-c1" value={c1} onChange={e => { setC1(+e.target.value); if (+e.target.value > c2) setC2(+e.target.value); }} className={sel}>{Array.from({ length: nCh }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
              <label htmlFor="cv-c2" className="text-[14px] text-soft">to</label>
              <select id="cv-c2" value={c2} onChange={e => setC2(+e.target.value)} className={sel}>{Array.from({ length: nCh }, (_, i) => <option key={i} value={i + 1} disabled={i + 1 < c1}>{i + 1}</option>)}</select>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="cv-q" className="sr-only">Question</label>
                <select id="cv-q" value={qb} onChange={e => { setQb(e.target.value); setArt(0); }} className={`${sel} min-w-0 flex-1 basis-60`}>{stBooks.map(x => <option key={x[0]} value={x[0]}>{x[1].length > 70 ? x[1].slice(0, 68) + "…" : x[1]}</option>)}</select>
                <label htmlFor="cv-a" className="sr-only">Article</label>
                <select id="cv-a" value={art} onChange={e => setArt(+e.target.value)} className={sel}>
                  <option value={0}>All articles</option>
                  {(BOOK[qb][4] || BOOK[qb][2].map((_, i) => "Article " + (i + 1))).map((l, i) => <option key={i} value={i + 1}>{l}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1" role="group" aria-label="Parts of the article">
                {ST_PARTS.map(([k, l]) => (
                  <label key={k} className="flex items-center gap-1.5 text-[14px] text-ink">
                    <input type="checkbox" checked={parts.includes(k)} onChange={e => setParts(p => e.target.checked ? [...p, k] : p.filter(x => x !== k))} className="h-4 w-4 accent-[#9a2b22]" />{l}
                  </label>
                ))}
              </div>
              <p className="text-[12px] text-soft">The Summa here covers questions 1–87 of the First Part (those in the exam texts). If your class reads one that isn’t listed, tell whoever maintains the app.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="primary" onClick={add} disabled={busy}>{busy ? "Reading the text…" : "Add this section"}</Btn>
            {cls.sections.length > 0 && <Btn onClick={() => rebuild({ ...cls, sections: [] })}>Clear for a new week</Btn>}
          </div>
          <label className="flex items-center gap-2 text-[13px] text-soft">
            <input type="checkbox" checked={!!cls.basic} onChange={e => rebuild({ ...cls, basic: e.target.checked })} className="h-4 w-4 accent-[#9a2b22]" />
            Include the very common words too (sum, et, qui, dico, deus…)
          </label>
        </div>
      </section>

      {words.length > 0 && (
        <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Words in these sections">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[15px] text-ink"><strong className="num">{words.length}</strong> words · <strong className="num text-ok">{knownN}</strong> known</span>
            {stats && stats.unknown > 0 && <span className="text-[12px] text-soft">{stats.unknown} of {stats.total} word forms had no parsing and are left out</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="primary" onClick={onLearn}>Learn with flashcards</Btn>
            <Btn onClick={() => setQuiz({ n: 20, only: null, k: Date.now() })}>Quiz me (20)</Btn>
            {words.length > 20 && <Btn onClick={() => setQuiz({ n: words.length, only: null, k: Date.now() })}>Quiz me on all {words.length}</Btn>}
            {words.length - knownN > 0 && knownN > 0 && <Btn onClick={() => { const left = words.filter(w => !(vc[w[0]] && vc[w[0]].box >= 2)).map(w => w[0]); setQuiz({ n: left.length, only: left, k: Date.now() }); }}>Quiz the {words.length - knownN} not yet known</Btn>}
          </div>
          <button type="button" className="self-start text-[14px] font-medium text-rubric underline underline-offset-2" aria-expanded={show} onClick={() => setShow(s => !s)}>{show ? "Hide the word list" : "Show the word list"}</button>
          {show && (
            <div className="class-list">
              <div className="mb-2 flex justify-end print:hidden"><Btn onClick={() => window.print()}>Print</Btn></div>
              <table className="w-full text-left text-[14px]">
                <thead className="text-soft"><tr className="border-b border-rule"><th className="py-1 pr-2 font-medium">Word</th><th className="py-1 pr-2 font-medium">Meaning</th><th className="num py-1 font-medium">×</th></tr></thead>
                <tbody>
                  {words.map(w => {
                    const li = V.byLemma[w[0]], [, gloss, head] = li !== undefined ? lex.lemmas[li] : [w[0], "", ""];
                    const k = vc[w[0]];
                    return (
                      <tr key={w[0]} className="border-b border-rule align-top">
                        <td lang="la" className="latin py-1 pr-2 font-bold text-ink">{head || w[0]}{k && k.box >= 2 && <span className="ml-1 font-sans text-[12px] font-normal text-ok">✓</span>}</td>
                        <td className="py-1 pr-2 text-ink">{shortGloss(gloss)}</td>
                        <td className="num py-1 text-soft">{w[1]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
