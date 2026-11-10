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
  if (/^\s*Ad \w+ sic proceditur/i.test(la)) return "obj";   // the article's opening: "Ad secundum sic proceditur. Videtur quod…"
  if (/^\s*Sed contra/i.test(la)) return "sc";
  if (/^\s*Respondeo/i.test(la)) return "resp";
  if (/^\s*Ad (primum|secundum|tertium|quartum|quintum|sextum|septimum|octavum|nonum|decimum|undecimum|duodecimum|\w+um) /i.test(la)) return "ad";
  if (/^\s*(Videtur|Praeterea|Ulterius)/i.test(la)) return "obj";
  return prev || "obj";
}
/* The whole Summa (data/summa/), for any part a class reads: index of parts and questions, and 20-question files. */
const SM_PART = { "1": "I", "1-2": "I-II", "2-2": "II-II", "3": "III" };
let summaIdx = null;
const loadSummaIndex = () => (summaIdx = summaIdx || getJSON("data/summa/index.json").catch(e => { summaIdx = null; throw e; }));
const summaChunks = {};
const loadSummaQ = (p, q) => { const k = `${p}-${Math.floor((q - 1) / 20)}`; summaChunks[k] = summaChunks[k] || getJSON(`data/summa/${k}.json`).catch(e => { delete summaChunks[k]; throw e; }); return summaChunks[k].then(c => c[String(q)]); };
function sectionLabel(s) {
  const parts = s.parts && s.parts.length < 4 ? " · " + s.parts.map(p => ST_PARTS.find(x => x[0] === p)[1]).join(", ") : "";
  if (s.t === "sm") return `Summa ${SM_PART[s.p]} q. ${s.q}, ${s.a ? "a. " + s.a : "all articles"}${parts}`;
  const bk = BOOK[s.b];
  if (!bk) return "?";
  if (s.t === "nt") return `${bk[1]} ${s.c1}${s.c2 && s.c2 !== s.c1 ? "–" + s.c2 : ""}`;
  const q = (bk[1].match(/\d+/) || [""])[0];
  const art = s.a ? `a. ${(bk[4] && bk[4][s.a - 1] || "Article " + s.a).replace(/\D+/g, "")}` : "all articles";
  return `Summa I q. ${q}, ${art}${parts}`;
}
/* The words of the chosen sections: [lemma, count, ref, example with [[word]], analysis id], most frequent first. */
async function classWords(sections, lex, basic) {
  const found = {}, order = [];
  let total = 0, unknown = 0;
  /* One paragraph (a verse, or a paragraph of an article): its text, each word's parsing entry, and where it is. */
  function take(text, ents, ref) {
    const words = text.match(WORD_RE) || [];
    words.forEach((w, k) => {
      total++;
      const rd = readings(ents && ents[k]);
      if (!(rd.kind === "context" || rd.kind === "lookup")) { unknown++; return; }
      const [li, pos] = lex.ana[rd.ids[0]];
      const [lemma, gloss] = lex.lemmas[li];
      if (!gloss || /^(Ne|F-)/.test(pos) || (!basic && BASIC.has(lemma.toLowerCase()))) return;
      const lk = n1(lemma);
      if (!found[lk]) {
        const a = Math.max(0, k - 7), z = Math.min(words.length, k + 8);
        /* Rebuild the snippet from the text so punctuation survives; mark the word itself. */
        let from = 0, to = text.length, at = 0, atEnd = 0;
        const re = new RegExp(WORD_RE.source, "g"); let m, i = 0;
        while ((m = re.exec(text))) { if (i === a) from = m.index; if (i === k) { at = m.index; atEnd = m.index + m[0].length; } if (i === z - 1) to = m.index + m[0].length; i++; }
        const ex = (a > 0 ? "… " : "") + text.slice(from, at) + "[[" + text.slice(at, atEnd) + "]]" + text.slice(atEnd, to) + (z < words.length ? " …" : "");
        found[lk] = [lemma, 0, ref, ex, rd.kind === "context" ? rd.ids[0] : -1];
        order.push(lk);
      }
      found[lk][1]++;
    });
  }
  for (const s of sections) {
    if (s.t === "sm") {
      const q = await loadSummaQ(s.p, s.q);
      if (!q) continue;
      (s.a ? [s.a] : q.a.map((_, i) => i + 1)).forEach(a => {
        let part = null;
        (q.a[a - 1] || []).forEach((par, j) => {
          part = stPart(par, part);
          if (s.parts && !s.parts.includes(part)) return;
          take(par, q.w[a - 1][j], `Summa ${SM_PART[s.p]} q. ${s.q} a. ${a}`);
        });
      });
      continue;
    }
    const book = await loadBook(s.b);
    const chs = s.t === "nt" ? Array.from({ length: (s.c2 || s.c1) - s.c1 + 1 }, (_, i) => s.c1 + i) : s.a ? [s.a] : book.ch.map((_, i) => i + 1);
    for (const c of chs) {
      let part = null;
      for (const v of book.ch[c - 1] || []) {
        if (s.t === "st") { part = stPart(v[1], part); if (s.parts && !s.parts.includes(part)) continue; }
        take(v[1], v[3], refText([s.b, c, v[0]]));
      }
    }
  }
  const words = order.map(l => found[l]).sort((x, y) => y[1] - x[1]);
  return { words, total, unknown };
}
/* Words a student types or pastes (e.g. a textbook chapter's vocabulary): one per line, the Latin entry, then optionally
   " - ", ":", "=" or a tab and the meaning to learn. Matched to the dictionary where possible; the student's meaning wins. */
const normLemmaCache = new WeakMap();
function lemmaIndex(lex) {
  if (normLemmaCache.has(lex)) return normLemmaCache.get(lex);
  const m = {};
  lex.lemmas.forEach(([l, g]) => { const k = n1(l).replace(/[^a-z]/g, ""); if (g && !(k in m)) m[k] = l; });
  normLemmaCache.set(lex, m);
  return m;
}
function parseOwn(text, lex) {
  const idx = lemmaIndex(lex);
  return text.split(/\n+/).map(line => line.trim()).filter(Boolean).map(line => {
    const m = line.match(/^(.*?)(?:\s+[-–—=]\s+|\s*[:=\t]\s*)(.+)$/);
    const head = (m ? m[1] : line).replace(/^\d+[.)]\s*/, "").trim();
    const gloss = m ? m[2].trim() : "";
    const first = (head.match(/[A-Za-zÀ-ÿ]+/) || [""])[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const lemma = idx[n1(first).replace(/[^a-z]/g, "")] || null;
    return head ? { head, gloss, lemma } : null;
  }).filter(Boolean);
}
const ownKey = o => o.lemma || "own:" + o.head.toLowerCase();
/* A word's display entry in My class list: the student's own meaning when given, else the dictionary's. */
function classInfo(l, lex, V, own) {
  const o = (own || []).find(x => ownKey(x) === l);
  const li = V.byLemma[o && o.lemma ? o.lemma : l];
  if (li === undefined) return o ? { lemma: l, head: o.head, gloss: o.gloss, full: o.gloss, pos: "" } : null;
  return { lemma: l, head: (o && !o.gloss && o.head) || lex.lemmas[li][2] || l, gloss: o && o.gloss ? o.gloss : shortGloss(lex.lemmas[li][1]), full: o && o.gloss ? o.gloss : lex.lemmas[li][1], pos: V.posOf[li] };
}
/* Recompute a class list's words from its sections and own words, and save it. Also used by the Summa reader's "Add to my class quiz". */
async function rebuildClass(next, lex) {
  const { words, total, unknown } = await classWords(next.sections, lex, next.basic);
  /* the student's own words come first (their teacher's list), then the sections' words */
  const ownW = (next.own || []).map(o => [ownKey(o), 1, "Your list", "", -1]);
  const same = (a, b) => a === b || n1(a) === n1(b);
  const merged = [...ownW, ...words.filter(w => !ownW.some(o => same(o[0], w[0])))];
  ownW.forEach(o => { const w = words.find(x => same(x[0], o[0])); if (w) { o[1] = w[1] + 1; o[2] = w[2]; o[3] = w[3]; o[4] = w[4]; } });
  const cls = { ...next, words: merged };
  writeClass(cls);
  return { cls, total, unknown };
}
const shortGloss = g => (g || "").split(/[;(]/)[0].replace(/\s+/g, " ").trim().slice(0, 60);

/* Quiz: multiple choice both ways; every answer also grades the word's flashcard. */
function makeClassQuiz(words, lex, V, n, seed, own) {
  const r = rng(seed);
  const pool = shuffle(words, r).slice(0, n);
  const info = l => classInfo(l, lex, V, own);
  const all = words.map(w => info(w[0])).filter(x => x && x.gloss);
  const extra = lex.freq.slice(100, 3000).map(([li]) => info(lex.lemmas[li][0])).filter(x => x && x.gloss);
  return pool.map((w, i) => {
    const me = info(w[0]);
    if (!me || !me.gloss) return null;
    const toEn = r() < 0.6;
    const same = x => x.lemma !== me.lemma && x.gloss !== me.gloss && (x.pos || "")[0] === (me.pos || "")[0];
    const cands = shuffle(all.filter(same), r).concat(shuffle(extra.filter(same), r), shuffle(all.filter(x => x.lemma !== me.lemma && x.gloss !== me.gloss), r));
    const opts = [me];
    for (const c of cands) { if (opts.length >= 4) break; if (!opts.some(o => (toEn ? o.gloss : o.lemma) === (toEn ? c.gloss : c.lemma) || o.gloss === c.gloss)) opts.push(c); }
    if (opts.length < 4) return null;
    const la = x => (x.lemma.startsWith("own:") ? x.head : x.lemma);
    return { lemma: me.lemma, toEn, prompt: toEn ? me.head : me.gloss, ans: toEn ? me.gloss : la(me), opts: shuffle(opts, r).map(o => (toEn ? o.gloss : la(o))), ex: w[3], ref: w[2], full: me.full, head: me.head, key: i };
  }).filter(Boolean);
}

function ClassQuiz({ words, lex, V, n, onGrade, onDone, own }) {
  const [qs] = useState(() => makeClassQuiz(words, lex, V, n, String(Date.now()), own));
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

function ClassVocab({ lex, V, prog, onGrade, onLearn, ai }) {
  const [cls, setCls0] = useState(readClass);
  const setCls = c => { setCls0(c); writeClass(c); };
  const [t, setT] = useState("nt");
  const ntBooks = partBooks("nt");
  const [b, setB] = useState(ntBooks[0][0]);
  const [c1, setC1] = useState(1), [c2, setC2] = useState(1);
  const [sidx, setSidx] = useState(null);
  const [sp, setSp] = useState("2-2");
  const [sq, setSq] = useState(1);
  const [art, setArt] = useState(0);
  useEffect(() => { if (t === "st" && !sidx) loadSummaIndex().then(setSidx).catch(() => {}); }, [t]);
  const spart = sidx && sidx.parts.find(x => x.id === sp);
  const sques = spart && spart.qs.find(x => x[0] === sq);
  const [parts, setParts] = useState(["sc", "resp"]);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [quiz, setQuiz] = useState(null);   // { n, only: [lemmas] | null }
  const [show, setShow] = useState(false);
  const nCh = BOOK[b] ? BOOK[b][2].length : 1;
  async function rebuild(next) {
    setBusy(true);
    try { const { cls: c, total, unknown } = await rebuildClass(next, lex); setCls0(c); setStats({ total, unknown }); }
    finally { setBusy(false); }
  }
  const [ownText, setOwnText] = useState("");
  function addOwn() {
    const list = parseOwn(ownText, lex);
    const prev = cls.own || [];
    const keys = new Set(prev.map(ownKey));
    rebuild({ ...cls, own: [...prev, ...list.filter(o => !keys.has(ownKey(o)))] });
    setOwnText("");
  }
  function add() {
    const s = t === "nt" ? { t, b, c1: Math.min(c1, c2), c2: Math.max(c1, c2) } : { t: "sm", p: sp, q: sq, a: art, parts: parts.length ? parts : ST_PARTS.map(p => p[0]) };
    rebuild({ ...cls, sections: [...cls.sections, s] });
  }
  const vc = prog.vcards || {};
  const words = cls.words || [];
  const knownN = words.filter(w => vc[w[0]] && vc[w[0]].box >= 2).length;
  const sel = "rounded-md border border-rule bg-paper px-2 py-1.5 text-[14px] text-ink";
  if (quiz) {
    const pool = quiz.only ? words.filter(w => quiz.only.includes(w[0])) : words;
    if (quiz.write) return <WriteQuiz key={quiz.k} own={cls.own} words={pool} lex={lex} V={V} n={Math.min(quiz.n, pool.length)} onGrade={onGrade} ai={ai}
      onDone={again => setQuiz(again && again.length ? { n: again.length, only: again, k: Date.now(), write: true } : null)} />;
    return <ClassQuiz key={quiz.k} own={cls.own} words={pool} lex={lex} V={V} n={Math.min(quiz.n, pool.length)} onGrade={onGrade}
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
            {[["nt", "New Testament"], ["st", "Summa"], ["own", "My own words"]].map(([k, l]) => <button key={k} type="button" aria-pressed={t === k} onClick={() => setT(k)} className={`rounded px-2.5 py-1 ${t === k ? "bg-ink text-paper" : "text-ink"}`}>{l}</button>)}
          </div>
          {t === "own" ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="cv-own" className="text-[14px] text-ink">Type or paste a word list, one word per line, with its meaning after a dash or colon if you want to learn your book’s wording:</label>
              <textarea id="cv-own" rows={6} value={ownText} onChange={e => setOwnText(e.target.value)} placeholder={"gratia, gratiae, f. – grace, favor\ncaritas, caritatis, f. – charity, love\nbenevolentia – goodwill"}
                className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-[15px] leading-relaxed text-ink" style={{ fontFamily: "var(--font-latin)" }} />
              <p className="text-[12px] text-soft">For your own textbook’s chapter vocabulary (Wheelock, Scanlon, Lingua Latina…). Words the app knows also get an example and their flashcard history; the meaning you give is the one you’re quizzed on.</p>
            </div>
          ) : t === "nt" ? (
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
              {!sidx ? <p className="text-[14px] text-soft">Loading the Summa…</p> : (
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="cv-p" className="sr-only">Part</label>
                  <select id="cv-p" value={sp} onChange={e => { setSp(e.target.value); setSq(1); setArt(0); }} className={sel}>
                    {sidx.parts.map(x => <option key={x.id} value={x.id}>{SM_PART[x.id]} · {x.name}</option>)}
                  </select>
                  <label htmlFor="cv-q" className="sr-only">Question</label>
                  <select id="cv-q" value={sq} onChange={e => { setSq(+e.target.value); setArt(0); }} className={`${sel} min-w-0 flex-1 basis-60`}>
                    {spart.qs.map(x => <option key={x[0]} value={x[0]}>q. {x[0]}: {x[1].length > 60 ? x[1].slice(0, 58) + "…" : x[1]}</option>)}
                  </select>
                  <label htmlFor="cv-a" className="sr-only">Article</label>
                  <select id="cv-a" value={art} onChange={e => setArt(+e.target.value)} className={`${sel} min-w-0 max-w-full basis-full`}>
                    <option value={0}>All articles</option>
                    {sques && sques[2].map((l, i) => <option key={i} value={i + 1}>a. {i + 1}{l ? ": " + (l.length > 70 ? l.slice(0, 68) + "…" : l) : ""}</option>)}
                  </select>
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1" role="group" aria-label="Parts of the article">
                {ST_PARTS.map(([k, l]) => (
                  <label key={k} className="flex items-center gap-1.5 text-[14px] text-ink">
                    <input type="checkbox" checked={parts.includes(k)} onChange={e => setParts(p => e.target.checked ? [...p, k] : p.filter(x => x !== k))} className="h-4 w-4 accent-[#9a2b22]" />{l}
                  </label>
                ))}
              </div>
              <p className="text-[12px] text-soft">The whole Summa, all four parts (Latin text of the Corpus Thomisticum). A few unusual word forms have no parsing and are left out.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {t === "own"
              ? <Btn variant="primary" onClick={addOwn} disabled={busy || !ownText.trim()}>{busy ? "Adding…" : "Add these words"}</Btn>
              : <Btn variant="primary" onClick={add} disabled={busy}>{busy ? "Reading the text…" : "Add this section"}</Btn>}
            {(cls.own || []).length > 0 && <Btn onClick={() => rebuild({ ...cls, own: [] })}>Clear my own words ({cls.own.length})</Btn>}
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
            <Btn onClick={onLearn}>Learn with flashcards</Btn>
            <Btn variant="primary" onClick={() => setQuiz({ n: 20, only: null, k: Date.now(), write: true })}>Write-it-out quiz (20)</Btn>
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
                    const inf = classInfo(w[0], lex, V, cls.own) || { head: w[0], gloss: "" }, gloss = inf.full, head = inf.head;
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

/* ---------- Write-it-out quiz, as in class: given the first form, write the rest of the dictionary entry and the meaning ----------
   Verbs: the other principal parts; nouns: genitive and gender; adjectives: the other endings; other words: the meaning only.
   Forms are checked part by part (accepting -are, -a -um, m./masc., gen.); the meaning loosely, with the student's own say. */
const wNorm = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/j/g, "i").replace(/v/g, "u");
function entryParts(head, pos) {
  const h = (head || "").replace(/\s+/g, " ").trim();
  if (!h || !h.includes(",")) return null;
  const gm = h.match(/\((m|f|n|c)\.?\)/), gender = gm ? gm[1] : null;
  const bits = h.replace(/\([^)]*\)/g, "").split(",").map(x => x.trim()).filter(Boolean);
  const first = bits[0], rest = bits.slice(1).map(x => x.replace(/^gen\.\s*/, ""));
  const kind = /^V/.test(pos) ? "verb" : gender ? "noun" : /^(A|P)/.test(pos) ? "adj" : null;
  if (!kind || !rest.length) return null;
  return { first, rest, gender, kind };
}
/* does one student piece match one expected part? "-are" ~ "amare", "-a" ~ "-a", "bona" ~ "-a" */
function partOk(got, want, first) {
  const g = wNorm(got).replace(/[^a-z\- ]/g, "").trim(), w = wNorm(want).replace(/[^a-z\- ]/g, "").trim();
  if (!g) return false;
  if (g === w) return true;
  const wfull = w.startsWith("-") ? w.slice(1) : w, gfull = g.startsWith("-") ? g.slice(1) : g;
  if (g.startsWith("-")) return wfull.endsWith(gfull) && gfull.length >= 1;
  if (w.startsWith("-")) return gfull.endsWith(wfull) && Math.abs(gfull.length - (wNorm(first).length + wfull.length - 2)) <= 3;
  return gfull === wfull || gfull.replace(/ sum$/, "") === wfull.replace(/ sum$/, "");
}
function checkEntry(ans, ep) {
  const raw = wNorm(ans).replace(/\bgen\.?\s*/g, "").replace(/[;/]/g, ",");
  const genderIn = (raw.match(/\b(masc|masculine|m|fem|feminine|f|neut|neuter|n|c|common)\b\.?/g) || []).map(x => x[0] === "c" ? "c" : x[0]);
  const pieces = raw.replace(/\b(masc|masculine|m|fem|feminine|f|neut|neuter|n|c|common)\b\.?/g, " ").split(/[,\s]+/).map(x => x.trim()).filter(x => x && x !== "sum");
  const want = ep.rest.map(x => x.replace(/ sum$/, ""));
  const res = want.map((w, i) => ({ want: ep.rest[i], ok: pieces.some(p => partOk(p, w, ep.first)) }));
  if (ep.kind === "noun") res.push({ want: ep.gender + ".", ok: genderIn.includes(ep.gender) || (ep.gender === "c" && genderIn.some(g => "mf".includes(g))) });
  return res;
}
const EN_STOP = new Set("the a an of to be in on at by for and or as is it his her their its one who which that with from into upon".split(" "));
function meaningOk(ans, gloss) {
  const g = wNorm(gloss), ws = wNorm(ans).split(/[^a-z]+/).filter(w => w.length >= 3 && !EN_STOP.has(w));
  return ws.length > 0 && ws.some(w => g.includes(w.slice(0, Math.min(Math.max(4, w.length - 3), 6))));
}
function WriteQuiz({ words, lex, V, own, n, onGrade, onDone, ai }) {
  const [items] = useState(() => {
    const r = rng(String(Date.now()));
    return shuffle(words, r).map(w => {
      const inf = classInfo(w[0], lex, V, own);
      if (!inf) return null;
      const ep = entryParts(inf.head, inf.pos || "");
      const syn = ai && ep && r() < 0.25 ? (r() < 0.5 ? "synonym" : "antonym") : null;
      return { key: w[0], inf, ep, prompt: ep ? ep.first : inf.head, syn };
    }).filter(Boolean).slice(0, n);
  });
  const [i, setI] = useState(0);
  const [form, setForm] = useState(""), [mean, setMean] = useState(""), [syn, setSyn] = useState("");
  const [res, setRes] = useState(null);   // { parts, meaningAuto, synRes }
  const [mOk, setMOk] = useState(null);
  const [score, setScore] = useState({ got: 0, partly: 0, review: 0, missed: [] });
  const formRef = useRef(null);
  if (!items.length) return <p className="text-[15px] text-soft">No words to quiz yet.</p>;
  if (i >= items.length) {
    const tot = items.length;
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-5" aria-label="Quiz result">
        <h3 className="latin text-[1.2rem] font-bold text-ink">{score.got} of {tot} fully right{score.partly ? `, ${score.partly} partly` : ""}</h3>
        {score.missed.length > 0 && (<>
          <p className="text-[14px] text-soft">To go over:</p>
          <ul className="flex flex-col gap-1 text-[15px]">{score.missed.map(it => <li key={it.key}><span lang="la" className="latin font-bold text-ink">{it.inf.head}</span> <span className="text-soft">· {shortGloss(it.inf.full)}</span></li>)}</ul>
        </>)}
        <div className="flex flex-wrap gap-2">
          {score.missed.length > 0 && <Btn variant="primary" onClick={() => onDone(score.missed.map(x => x.key))}>Write these out again</Btn>}
          <Btn onClick={() => onDone(null)}>Back to my list</Btn>
        </div>
      </section>
    );
  }
  const it = items[i];
  async function check() {
    const parts = it.ep ? checkEntry(form, it.ep) : [];
    const auto = meaningOk(mean, it.inf.full);
    setMOk(auto ? true : null);
    let synRes = null;
    if (it.syn && syn.trim()) {
      synRes = { status: "loading" };
      setRes({ parts, auto, synRes });
      try {
        const sm = await getSample();
        const raw = sm ? await sm.json(`Latin vocabulary quiz. Word: ${it.inf.head} ("${shortGloss(it.inf.full)}"). A seminary student was asked for a Latin ${it.syn} and wrote: "${syn.trim().slice(0, 60)}". Is it a fair ${it.syn} (classical or ecclesiastical Latin; close meaning is enough for a synonym)? Reply with only JSON: {"ok":true|false,"note":"max 15 words","ex":["two good ${it.syn}s"]}`, { modelTier: "quick" }) : null;
        synRes = raw ? { status: "done", ok: !!raw.ok, note: String(raw.note || "").slice(0, 120), ex: Array.isArray(raw.ex) ? raw.ex.slice(0, 2).map(String) : [] } : { status: "none" };
      } catch (e) { synRes = { status: "none" }; }
    }
    setRes({ parts, auto, synRes });
  }
  function next(meaningRight) {
    const formsOk = res.parts.every(p => p.ok);
    const m = meaningRight != null ? meaningRight : !!mOk;
    const g = formsOk && m ? "got" : formsOk || m ? "partly" : "review";
    onGrade(it.key, g);
    setScore(s => ({ ...s, [g]: s[g] + 1, missed: g === "got" ? s.missed : [...s.missed, it] }));
    setI(i + 1); setForm(""); setMean(""); setSyn(""); setRes(null); setMOk(null);
    requestAnimationFrame(() => formRef.current && formRef.current.focus());
  }
  const what = !it.ep ? "" : it.ep.kind === "verb" ? "the other principal parts" : it.ep.kind === "noun" ? "the genitive and gender" : "the other endings (or genitive)";
  const inp = "w-full rounded-md border border-rule bg-paper px-3 py-2 text-[16px] text-ink";
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-5 sm:px-7" aria-label="Write-it-out question">
      <div className="flex items-baseline justify-between text-[13px] text-soft">
        <span className="smallcaps font-semibold text-rubric">Write out the dictionary entry</span>
        <span className="num">{i + 1} of {items.length}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--rule)]" aria-hidden="true"><div className="h-full rounded-full bg-[var(--rubric)]" style={{ width: `${(i / items.length) * 100}%` }} /></div>
      <p lang="la" className="latin text-[1.8rem] font-bold leading-tight text-ink">{it.prompt}{it.ep ? "," : ""}</p>
      {it.ep && (
        <label className="flex flex-col gap-1 text-[14px] text-ink">{what[0].toUpperCase() + what.slice(1)}
          <input ref={formRef} lang="la" autoComplete="off" autoCapitalize="off" spellCheck={false} value={form} readOnly={!!res} onChange={e => setForm(e.target.value)}
            placeholder={it.ep.kind === "verb" ? "-are, -avi, -atum" : it.ep.kind === "noun" ? "-ae, f." : "-a, -um"} className={`${inp} latin`} />
        </label>
      )}
      <label className="flex flex-col gap-1 text-[14px] text-ink">Meaning
        <input autoComplete="off" value={mean} readOnly={!!res} onChange={e => setMean(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !res && !it.syn) check(); }} className={inp} />
      </label>
      {it.syn && (
        <label className="flex flex-col gap-1 text-[14px] text-ink">A Latin {it.syn} (optional, checked by the AI)
          <input lang="la" autoComplete="off" autoCapitalize="off" value={syn} readOnly={!!res} onChange={e => setSyn(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !res) check(); }} className={`${inp} latin`} />
        </label>
      )}
      {!res ? <div><Btn variant="primary" onClick={check} disabled={!mean.trim() && !form.trim()}>Check</Btn></div> : (
        <div className="reveal flex flex-col gap-2 border-l-2 border-rubric pl-3">
          <p lang="la" className="latin text-[1.15rem] font-bold text-ink">{it.inf.head}</p>
          {res.parts.length > 0 && (
            <p className="flex flex-wrap gap-1.5 text-[14px]">{res.parts.map((p, k) => <span key={k} className={`rounded px-1.5 py-0.5 ${p.ok ? "bg-oktint text-ok" : "bg-warntint text-warn"}`}>{p.ok ? "✓" : "✗"} {p.want}</span>)}</p>
          )}
          <p className="text-[15px] text-ink">{it.inf.full}</p>
          {res.synRes && (res.synRes.status === "loading" ? <p className="text-[14px] text-soft">Checking your {it.syn}…</p>
            : res.synRes.status === "done" ? <p className={`text-[14px] ${res.synRes.ok ? "text-ok" : "text-warn"}`}>{res.synRes.ok ? "✓" : "✗"} {it.syn}: {res.synRes.note}{res.synRes.ex.length ? ` (e.g. ${res.synRes.ex.join(", ")})` : ""}</p> : null)}
          {mOk ? (
            <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] text-ok">Your meaning matches.</span><Btn variant="primary" onClick={() => next(true)}>Next →</Btn><button type="button" className="text-[13px] text-soft underline" onClick={() => next(false)}>Actually, I had the meaning wrong</button></div>
          ) : (
            <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] text-soft">Was your meaning right?</span><Btn variant="ok" onClick={() => next(true)}>Yes</Btn><Btn variant="warn" onClick={() => next(false)}>No</Btn></div>
          )}
        </div>
      )}
      <button type="button" className="self-start text-[13px] text-soft underline" onClick={() => setI(items.length)}>End the quiz</button>
    </section>
  );
}
