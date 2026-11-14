/* ---------- Learn: Latin from the beginning ----------
   Two ways in, which can be used together:
   · Reading (COURSE_N, course-natural.js): a story that teaches itself, natural-method style (cf. Ørberg's Lingua
     Latina): Latin notes and pictures in the margin, grammar drawn from the text, exercises A (forms), B (words),
     C (questions in Latin).
   · Grammar (COURSE_G, course-grammar.js): 34 lessons in the order of Wheelock / Scanlon & Scanlon / Collins, with
     tables, vocabulary, sentences both ways and a reading from the Vulgate or the liturgy in each.
   Progress lives in this browser (COURSE_KEY) and travels in the backup (co). Finished lessons' words become cards
   in Vocabulary → Course words (keys "co:<word>", scheduled like every other card). */
const COURSE_KEY = "lectio-vulgata-course";
function readCourse() { const v = readLocal(COURSE_KEY); return v && typeof v === "object" ? { done: {}, score: {}, cw: {}, ...v } : { done: {}, score: {}, cw: {} }; }
function writeCourse(v) { writeLocal(COURSE_KEY, v); }
const cNorm = s => normForm(String(s)).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
/* An answer is right if it matches any of the alternatives, ignoring long marks, case, punctuation and (for whole
   sentences) word order. */
function cMatch(given, alts, anyOrder) {
  const g = cNorm(given);
  if (!g) return false;
  const sorted = s => s.split(" ").sort().join(" ");
  return String(alts).split("|").some(a => { const n = cNorm(a); return n === g || (anyOrder && sorted(n) === sorted(g)); });
}
const courseKeyOf = head => "co:" + cNorm(String(head).split(/[,·(]/)[0]).split(" ").slice(0, 2).join(" ").slice(0, 30);
/* Every course word, by card key: the first lesson that teaches it wins. */
let courseWordsCache = null;
function courseWords() {
  if (courseWordsCache) return courseWordsCache;
  const m = {};
  for (const c of [...COURSE_N, ...COURSE_G]) for (const [head, gloss] of c.words) {
    const k = courseKeyOf(head);
    if (k.length > 3 && !m[k]) m[k] = { key: k, front: head, back: gloss, sub: c.num ? `Reading course, chapter ${c.num}` : `Grammar course, lesson ${c.n}`, aid: -1, lesson: c.id };
  }
  return (courseWordsCache = m);
}
/* the cards of the lessons whose words were added, in course order */
function courseDeck() {
  const cw = readCourse().cw || {}, all = courseWords();
  return Object.values(all).filter(w => cw[w.lesson]);
}
const courseUnit = id => COURSE_N.find(c => c.id === id) || COURSE_G.find(c => c.id === id);
const unitLabel = u => u.num ? `Chapter ${u.num}: ${u.title}` : `Lesson ${u.n}: ${u.title}`;

/* _Latin_ and **bold** inside explanations */
function CText({ text }) {
  return String(text).split(/(_[^_]+_|\*\*[^*]+\*\*)/).map((p, i) => p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong>
    : p.length > 1 && p[0] === "_" && p.endsWith("_") ? <i key={i} lang="la" className="latin">{p.slice(1, -1)}</i> : p);
}
/* Latin with every word tappable; words with a margin note are underlined with dots */
function TapLatin({ text, onWord, sel, noted }) {
  return String(text).split(/(\p{L}+)/u).map((w, j) => (j % 2 === 0 ? w : (
    <span key={j} role="button" tabIndex={0} className={`lw${sel === w ? " sel" : ""}${noted && noted(w) ? " cn" : ""}`} onClick={() => onWord(w)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onWord(w); } }}>{w}</span>
  )));
}
function Listen({ voice, text }) {
  const [on, setOn] = useState(false);
  if (!voice) return null;
  return <button type="button" className="text-[13px] text-rubric underline underline-offset-2" onClick={() => { setOn(true); speakLatin(voice, text, () => setOn(false)); }}>{on ? "Speaking…" : "▶ Listen"}</button>;
}
function CTable({ t }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[16rem] border-collapse text-[14px]">
        <caption className="mb-1 text-left text-[13px] font-semibold text-soft">{t.cap}</caption>
        <thead><tr>{t.head.map((h, i) => <th key={i} className="border-b border-rule px-2 py-1 text-left text-[12px] font-normal text-soft">{h}</th>)}</tr></thead>
        <tbody>{t.rows.map((r, i) => <tr key={i} className="border-b border-rule last:border-0">{r.map((c, j) => <td key={j} lang={j ? "la" : undefined} className={`px-2 py-1 align-top ${j ? "latin text-ink" : "text-soft"}`}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
const H3 = ({ children }) => <h3 className="smallcaps mt-1 text-[14px] font-semibold text-rubric">{children}</h3>;
const box = "flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-4 py-4 sm:px-6";

/* ---------- exercises ---------- */
/* A sentence with one blank: the student types the missing ending or word. */
function BlankItem({ q, a, i, st, set, checked }) {
  const [pre, post] = q.split("_");
  const v = st[i] || "";
  const ok = checked ? cMatch(v, a, false) : null;
  const ending = pre && /\p{L}$/u.test(pre);   // a missing ending, joined to its stem
  return (
    <li className="leading-relaxed">
      <span lang="la" className="latin text-[1.02rem] text-ink">{pre}</span>
      <input value={v} onChange={e => set({ ...st, [i]: e.target.value })} aria-label={`Blank ${i + 1}`} autoCapitalize="off" autoCorrect="off" spellCheck={false}
        className={`latin mx-0.5 rounded border bg-paper px-1.5 py-0.5 text-[1rem] text-ink ${ending ? "w-16" : "w-32"} ${ok === true ? "border-ok" : ok === false ? "border-rubric" : "border-rule"}`} />
      <span lang="la" className="latin text-[1.02rem] text-ink">{post}</span>
      {ok === true && <span className="ml-1 text-ok">✓</span>}
      {ok === false && <span className="ml-1 text-[14px] text-rubric">→ <span lang="la" className="latin">{a.split("|")[0]}</span></span>}
    </li>
  );
}
function BlankSet({ title, how, items, onScore }) {
  const [st, setSt] = useState({});
  const [checked, setChecked] = useState(false);
  const right = items.filter(([, a], i) => cMatch(st[i] || "", a, false)).length;
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <H3>{title}</H3>
      <p className="text-[14px] text-soft">{how}</p>
      <ol className="flex list-decimal flex-col gap-1.5 pl-6">{items.map(([q, a], i) => <BlankItem key={i} q={q} a={a} i={i} st={st} set={s => { setSt(s); setChecked(false); }} checked={checked} />)}</ol>
      <div className="flex flex-wrap items-center gap-3">
        <Btn onClick={() => { setChecked(true); onScore && onScore(right, items.length); }}>Check</Btn>
        {checked && <span className="text-[14px] text-ink">{right} of {items.length} right{right === items.length ? " · Optimē!" : ""}</span>}
        {checked && right < items.length && <button type="button" className="text-[13px] text-soft underline" onClick={() => { setSt({}); setChecked(false); }}>Try again</button>}
      </div>
    </section>
  );
}
/* Write a translation or an answer; then compare with the model. Automatic marking when the answer is short Latin. */
function WriteItem({ prompt, model, latinPrompt, auto, n }) {
  const [v, setV] = useState("");
  const [shown, setShown] = useState(false);
  const [self, setSelf] = useState(null);
  const ok = shown && auto ? cMatch(v, model, true) : null;
  return (
    <li className="flex flex-col gap-1">
      <span lang={latinPrompt ? "la" : undefined} className={latinPrompt ? "latin text-[1.02rem] text-ink" : "text-[15px] text-ink"}>{prompt}</span>
      <textarea value={v} onChange={e => { setV(e.target.value); setShown(false); }} rows={1} aria-label={`Answer ${n}`} autoCapitalize="off" spellCheck={!auto}
        lang={auto ? "la" : undefined} className={`w-full rounded border bg-paper px-2 py-1 text-[15px] text-ink ${auto ? "latin" : ""} ${ok === true ? "border-ok" : ok === false ? "border-rubric" : "border-rule"}`} />
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[14px]">
        {!shown ? <button type="button" className="text-rubric underline underline-offset-2" onClick={() => setShown(true)}>{auto ? "Check" : "Show the answer"}</button>
          : <>
            {ok === true && <span className="text-ok">✓ Right</span>}
            <span className="text-soft">{ok === true ? "Model:" : "Answer:"} <span lang={auto ? "la" : undefined} className={auto ? "latin text-ink" : "text-ink"}>{String(model).split("|")[0]}</span>{auto && String(model).includes("|") ? <span className="text-soft"> (or: {String(model).split("|").slice(1).join("; ")})</span> : null}</span>
            {!auto && (self == null ? <span className="flex gap-2"><button type="button" className="text-ok underline" onClick={() => setSelf(true)}>I had it</button><button type="button" className="text-rubric underline" onClick={() => setSelf(false)}>Not yet</button></span>
              : <span className={self ? "text-ok" : "text-rubric"}>{self ? "✓" : "↻ try it again tomorrow"}</span>)}
          </>}
      </div>
    </li>
  );
}

/* ---------- a reading from the Vulgate (loaded from the app's own text) or a prayer ---------- */
function CourseReading({ read, help, voice }) {
  const [verses, setVerses] = useState(null);
  const [en, setEn] = useState(false);
  useEffect(() => {
    if (!read.at) return;
    let alive = true;
    Promise.all([...new Set(read.at.map(a => a[0]))].map(b => loadBook(b).then(bk => [b, bk])))
      .then(bs => { if (!alive) return; const m = Object.fromEntries(bs); setVerses(read.at.map(([b, c, v]) => { const r = (m[b].ch[c - 1] || []).find(x => x[0] === v); return r ? { ref: `${BOOK_NAME[b] || b} ${c}:${v}`, la: r[1], en: r[2] } : null; }).filter(Boolean)); })
      .catch(() => alive && setVerses([]));
    return () => { alive = false; };
  }, [read]);
  const blocks = [...(verses || []), ...(read.la ? [{ ref: "", la: read.la, en: read.en }] : [])];
  return (
    <section className={box} aria-label="Reading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <H3>Lectiō: {read.title}</H3>
        <label className="flex items-center gap-1.5 text-[14px] text-soft"><input type="checkbox" checked={en} onChange={e => setEn(e.target.checked)} className="h-4 w-4 accent-[var(--rubric)]" /> English</label>
      </div>
      {read.at && !verses && <p className="text-[14px] text-soft">Loading the text…</p>}
      {blocks.map((b, i) => (
        <div key={i} className="flex flex-col gap-1">
          {String(b.la).split("\n").map((l, j) => <p key={j} lang="la" className="latin text-[1.08rem] leading-relaxed text-ink"><TapLatin text={l} onWord={help.pick} sel={help.word} /></p>)}
          <div className="flex flex-wrap gap-3">{b.ref && <span className="text-[13px] text-soft">{b.ref} (Vulgate)</span>}<Listen voice={voice} text={b.la} /></div>
          {en && <p className="text-[14px] italic leading-snug text-soft">{b.en}{b.ref ? " (Douay-Rheims)" : ""}</p>}
        </div>
      ))}
      {read.gloss && read.gloss.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t border-rule pt-2 text-[14px]">
          {read.gloss.map(([w, m]) => <React.Fragment key={w}><dt lang="la" className="latin font-semibold text-ink">{w}</dt><dd className="text-soft">{m}</dd></React.Fragment>)}
        </dl>
      )}
      {read.note && <p className="text-[14px] text-soft">{read.note}</p>}
      <p className="text-[13px] text-soft">Tap any word for its parsing and dictionary entry.</p>
    </section>
  );
}

/* ---------- reading course: one chapter ---------- */
function NaturalChapter({ c, help, voice, onDone, done, onLemma }) {
  const notes = useMemo(() => { const m = {}; for (const [k, v] of Object.entries(c.notes)) for (const f of k.split("|")) m[normForm(f)] = v; return m; }, [c]);
  const noteOf = w => { const n = normForm(w); return notes[n] || (/que$/.test(n) && notes[n.slice(0, -3)]) || (/ne$/.test(n) && notes[n.slice(0, -2)] && n.length > 4 ? notes[n.slice(0, -2)] : null) || null; };
  const [tap, setTap] = useState(null);   // { p, w }
  const [margin, setMargin] = useState(() => readCourse().margin !== false);
  const [showEn, setShowEn] = useState(false);
  const [showGram, setShowGram] = useState(false);
  function pick(p, w) {
    help.clear();
    if (noteOf(w)) setTap(t => (t && t.p === p && t.w === w ? null : { p, w }));
    else { setTap(null); help.pick(w); }
  }
  /* as in the margin of a natural-method reader, each note stands beside the paragraph where its word first appears */
  const firstAt = useMemo(() => { const m = new Map(); c.text.forEach((p, i) => { for (const w of p.match(/\p{L}+/gu) || []) { const n = noteOf(w); if (n && !m.has(n)) m.set(n, i); } }); return m; }, [c]);
  const paraNotes = i => { const seen = new Set(), out = []; for (const w of c.text[i].match(/\p{L}+/gu) || []) { const n = noteOf(w); if (n && firstAt.get(n) === i && !seen.has(n)) { seen.add(n); out.push([w, n]); } } return out; };
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <span className="smallcaps text-[13px] font-semibold text-rubric">Capitulum {c.num}</span>
        <h2 lang="la" className="latin text-[1.5rem] font-bold text-ink">{c.title}</h2>
        <p className="text-[14px] text-soft">{c.en} · <span className="italic">New in this chapter:</span> {c.gram}</p>
      </header>
      <section className={box} aria-label="The text">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-soft">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={margin} onChange={e => { setMargin(e.target.checked); writeCourse({ ...readCourse(), margin: e.target.checked }); }} className="h-4 w-4 accent-[var(--rubric)]" /> Notes in the margin</label>
          <span>Read it aloud; work out each word from the Latin around it. Dotted words are new: their notes are in the margin. Tap any word for its note or the dictionary.</span>
        </div>
        {c.text.map((p, i) => (
          <div key={i} className={margin ? "grid gap-x-5 gap-y-1 sm:grid-cols-[minmax(0,1fr)_13rem]" : ""}>
            <div>
              <p lang="la" className="latin text-[1.12rem] leading-[1.8] text-ink"><TapLatin text={p} onWord={w => pick(i, w)} sel={tap && tap.p === i ? tap.w : help.word} noted={w => { const n = noteOf(w); return n && firstAt.get(n) === i; }} /></p>
              {tap && tap.p === i && (
                <div className="reveal mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-rule bg-paper px-3 py-2">
                  <span lang="la" className="latin font-semibold text-ink">{tap.w}</span>
                  <span lang="la" className="latin text-[15px] text-ink">{noteOf(tap.w)}</span>
                  <button type="button" className="text-[13px] text-rubric underline underline-offset-2" onClick={() => { const w = tap.w; setTap(null); help.pick(w); }}>English &amp; forms</button>
                </div>
              )}
              <Listen voice={voice} text={p} />
            </div>
            {margin && (
              <aside className="flex flex-col gap-0.5 border-l-2 border-rule pl-3 text-[13px] leading-snug text-soft" aria-label="Margin notes">
                {paraNotes(i).map(([w, n]) => <span key={w} lang="la" className="latin"><b className="text-ink">{w}</b>: {n}</span>)}
              </aside>
            )}
          </div>
        ))}
      </section>

      <section className={box} aria-label="Grammatica">
        <div className="flex items-baseline justify-between gap-2"><H3>Grammatica</H3>
          <button type="button" className="text-[13px] text-rubric underline" onClick={() => setShowGram(s => !s)}>{showGram ? "Hide" : "Show"}</button></div>
        {!showGram ? <p className="text-[14px] text-soft">Before you open this, look back at the text: can you see the pattern yourself? That is the method.</p> : (
          <ul className="flex flex-col gap-2">{c.grammar.map(([la, en], i) => (
            <li key={i} className="border-l-2 border-rule pl-3"><p lang="la" className="latin text-[1.02rem] text-ink">{la}</p><p className="text-[14px] leading-snug text-soft">{en}</p></li>
          ))}</ul>
        )}
      </section>

      <section className={box} aria-label="New words">
        <div className="flex items-baseline justify-between gap-2"><H3>Vocābula nova</H3>
          <label className="flex items-center gap-1.5 text-[14px] text-soft"><input type="checkbox" checked={showEn} onChange={e => setShowEn(e.target.checked)} className="h-4 w-4 accent-[var(--rubric)]" /> English</label></div>
        <ul className="grid gap-x-6 gap-y-0.5 text-[14px] sm:grid-cols-2">{c.words.map(([h, g]) => <li key={h}><span lang="la" className="latin text-ink">{h}</span>{showEn && <span className="text-soft">: {g}</span>}</li>)}</ul>
        {!showEn && <p className="text-[13px] text-soft">The English is hidden on purpose: try to give the meaning from the story first.</p>}
      </section>

      <section className={box} aria-label="Pensa">
        <h3 lang="la" className="latin text-[1.1rem] font-bold text-ink">Pēnsa</h3>
        <BlankSet title="Pēnsum A: endings" how="Write the missing ending." items={c.A} />
        <BlankSet title="Pēnsum B: words" how="Write the missing word." items={c.B} />
        <section className="flex flex-col gap-2" aria-label="Pensum C">
          <H3>Pēnsum C: answer in Latin</H3>
          <p className="text-[14px] text-soft">Answer in a whole Latin sentence, then compare.</p>
          <ol className="flex list-decimal flex-col gap-3 pl-6">{c.C.map(([q, m], i) => <WriteItem key={i} n={i + 1} prompt={q} model={m} latinPrompt />)}</ol>
        </section>
      </section>
      {c.pair && c.pair.length > 0 && <p className="text-[14px] text-soft">Goes with the grammar course: {c.pair.map(id => { const g = courseUnit(id); return g ? `lesson ${g.n} (${g.title})` : id; }).join("; ")}.</p>}
      <div className="flex flex-wrap gap-2">
        <Btn variant="primary" onClick={onDone}>{done ? "Done ✓ · next chapter →" : "I’ve read this chapter: add its words to my cards →"}</Btn>
      </div>
    </div>
  );
}

/* ---------- grammar course: one lesson ---------- */
function GrammarLesson({ g, help, voice, onDone, done, onLemma }) {
  const [showEn, setShowEn] = useState(true);
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <span className="smallcaps text-[13px] font-semibold text-rubric">Lesson {g.n}</span>
        <h2 className="text-[1.4rem] font-bold leading-tight text-ink">{g.title}</h2>
        <p className="text-[14px] text-soft">{g.sub}</p>
      </header>
      <section className={box} aria-label="Explanation">
        {g.pts.map((p, i) => <p key={i} className="text-[15px] leading-relaxed text-ink"><CText text={p} /></p>)}
      </section>
      {g.tables.length > 0 && (
        <section className={box} aria-label="Tables">
          {g.tables.map((t, i) => <CTable key={i} t={t} />)}
          {g.forms && g.forms.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-[13px]"><span className="text-soft">Every form, in Forms:</span>
              {g.forms.map(l => <button key={l} type="button" onClick={() => onLemma(l)} className="rounded border border-rule bg-paper px-2 py-0.5 text-ink hover:border-soft"><span lang="la" className="latin">{l}</span> →</button>)}</div>
          )}
        </section>
      )}
      <section className={box} aria-label="Vocabulary">
        <div className="flex items-baseline justify-between gap-2"><H3>Vocabulary</H3>
          <label className="flex items-center gap-1.5 text-[14px] text-soft"><input type="checkbox" checked={showEn} onChange={e => setShowEn(e.target.checked)} className="h-4 w-4 accent-[var(--rubric)]" /> English</label></div>
        <ul className="flex flex-col gap-0.5 text-[14px]">{g.words.map(([h, m]) => <li key={h}><span lang="la" className="latin font-semibold text-ink">{h}</span>{showEn && <span className="text-soft"> · {m}</span>}</li>)}</ul>
        <p className="text-[13px] text-soft">Learn the whole entry: the genitive and gender of nouns, the principal parts of verbs.</p>
      </section>
      <section className={box} aria-label="Exercises">
        <H3>Translate into English</H3>
        <ol className="flex list-decimal flex-col gap-3 pl-6">{g.la.map(([la, en], i) => <WriteItem key={i} n={i + 1} prompt={la} model={en} latinPrompt />)}</ol>
        <H3>Translate into Latin</H3>
        <p className="text-[14px] text-soft">Long marks and word order don’t matter for the check.</p>
        <ol className="flex list-decimal flex-col gap-3 pl-6">{g.en.map(([en, la], i) => <WriteItem key={i} n={i + 1} prompt={en} model={la} auto />)}</ol>
      </section>
      {g.read && <CourseReading read={g.read} help={help} voice={voice} />}
      <div className="flex flex-wrap gap-2">
        <Btn variant="primary" onClick={onDone}>{done ? "Done ✓ · next lesson →" : "Lesson learnt: add its words to my cards →"}</Btn>
      </div>
    </div>
  );
}

/* ---------- where to start: ten quick questions ---------- */
const COURSE_CHECK = [
  ["laudāmus", ["we praise", "they praise", "you praise", "we praised"], 0, "g1"],
  ["fīlia Marīae", ["Mary’s daughter", "the daughter to Mary", "Mary, daughter!", "the daughters of Mary"], 0, "g2"],
  ["Dominum vident.", ["They see the Lord.", "The Lord sees them.", "The Lord sees.", "They are seen by the Lord."], 0, "g3"],
  ["regnum magnum", ["a great kingdom", "great kings", "of a great kingdom", "the kingdom of the great"], 0, "g4"],
  ["In principiō erat Verbum.", ["In the beginning was the Word.", "In the beginning is the Word.", "The Word will be in the beginning.", "He was the Word of the beginning."], 0, "g6"],
  ["lūcem vēritātis", ["the light of truth", "the truth of light", "light and truth", "by the light of truth"], 0, "g7"],
  ["Mundus eum nōn cognōvit.", ["The world did not know him.", "The world does not know him.", "He did not know the world.", "The world will not know him."], 0, "g12"],
  ["Fīlius Deī vocābitur.", ["He will be called the Son of God.", "He will call the Son of God.", "The Son of God was called.", "The Son of God calls."], 0, "g18"],
  ["Ascendente eō in nāviculam…", ["When he went up into the boat…", "He went up into the boat…", "Going up, he was in the boat…", "The boat having gone up…"], 0, "g23"],
  ["Venit ut nōs salvet.", ["He comes to save us.", "He comes because he saves us.", "He came and saved us.", "If he comes, he will save us."], 0, "g26"]
];
function CourseCheck({ onResult }) {
  const [i, setI] = useState(0);
  const [miss, setMiss] = useState(null);
  const order = useMemo(() => COURSE_CHECK.map(q => shuffle(q[1].map((t, k) => [t, k]), rng(q[0]))), []);
  if (miss !== null || i >= COURSE_CHECK.length) {
    const start = miss === null ? "g34" : COURSE_CHECK[miss][3];
    const u = courseUnit(start);
    return (
      <div className="flex flex-col gap-2 text-[15px] text-ink">
        {miss === 0 ? <p>Start at the very beginning: the first chapter of the story and the first grammar lesson.</p>
          : miss === null ? <p>You know all of this already: start with the last lesson, on reading Church Latin, then go to the Library and the Gospels.</p>
          : <p>You know the earlier lessons. Start with <b>{unitLabel(u)}</b>, and skim the lessons before it.</p>}
        <div className="flex flex-wrap gap-2"><Btn variant="primary" onClick={() => onResult(miss === 0 ? "n1" : start)}>{miss === 0 ? "Start chapter I" : `Open lesson ${u.n}`} →</Btn><Btn onClick={() => { setI(0); setMiss(null); }}>Again</Btn></div>
      </div>
    );
  }
  const q = COURSE_CHECK[i];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-soft">Question {i + 1} of {COURSE_CHECK.length}. If you don’t know, choose “I don’t know”: that is the useful answer.</p>
      <p lang="la" className="latin text-[1.1rem] text-ink">{q[0]}</p>
      <div className="flex flex-col gap-1.5">
        {order[i].map(([t, k]) => <button key={k} type="button" onClick={() => (k === q[2] ? setI(i + 1) : setMiss(i))} className="rounded-md border border-rule bg-paper px-3 py-2 text-left text-[15px] text-ink hover:border-soft">{t}</button>)}
        <button type="button" onClick={() => setMiss(i)} className="self-start text-[14px] text-soft underline">I don’t know</button>
      </div>
    </div>
  );
}

/* ---------- the Learn screen ---------- */
function CourseMode({ onTap, onTable, onLemma, onDeck, onGuide, onOpenLib, onPassage, voice }) {
  const [co, setCo0] = useState(readCourse);
  const setCo = v => { setCo0(v); writeCourse(v); };
  const [open, setOpen] = useState(() => (courseUnit(co.at) ? co.at : null));
  const [check, setCheck] = useState(false);
  const help = useWordHelp(() => libGet("forms"), onTap);
  const topRef = useRef(null);
  function go(id) { help.clear(); setOpen(id); setCo({ ...readCourse(), at: id }); try { window.scrollTo({ top: 0 }); } catch (e) {} }
  function finish(u) {
    const list = u.num ? COURSE_N : COURSE_G;
    const cur = readCourse();
    setCo({ ...cur, done: { ...cur.done, [u.id]: cur.done[u.id] || Date.now() }, cw: { ...cur.cw, [u.id]: 1 } });
    const next = list[list.indexOf(u) + 1];
    if (next) go(next.id); else { setOpen(null); setCo({ ...readCourse(), at: null }); }
  }
  const nDone = COURSE_N.filter(c => co.done[c.id]).length, gDone = COURSE_G.filter(g => co.done[g.id]).length;
  const nextN = COURSE_N.find(c => !co.done[c.id]) || COURSE_N[0], nextG = COURSE_G.find(g => !co.done[g.id]) || COURSE_G[0];
  const nCards = courseDeck().length;
  const u = open && courseUnit(open);
  if (u) {
    const list = u.num ? COURSE_N : COURSE_G, i = list.indexOf(u);
    const nav = (
      <div className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
        <button type="button" className="text-rubric underline underline-offset-2" onClick={() => { help.clear(); setOpen(null); setCo({ ...readCourse(), at: null }); }}>‹ All of Learn</button>
        <span className="flex gap-3">
          {i > 0 && <button type="button" className="text-rubric underline underline-offset-2" onClick={() => go(list[i - 1].id)}>‹ {u.num ? "Chapter " + list[i - 1].num : "Lesson " + list[i - 1].n}</button>}
          {i < list.length - 1 && <button type="button" className="text-rubric underline underline-offset-2" onClick={() => go(list[i + 1].id)}>{u.num ? "Chapter " + list[i + 1].num : "Lesson " + list[i + 1].n} ›</button>}
        </span>
      </div>
    );
    return (
      <div ref={topRef} className="flex flex-col gap-4">
        {nav}
        {u.num ? <NaturalChapter key={u.id} c={u} help={help} voice={voice} onLemma={onLemma} done={!!co.done[u.id]} onDone={() => finish(u)} />
          : <GrammarLesson key={u.id} g={u} help={help} voice={voice} onLemma={onLemma} done={!!co.done[u.id]} onDone={() => finish(u)} />}
        {nav}
        {help.panel(unitLabel(u), onTable)}
      </div>
    );
  }
  const tick = id => (co.done[id] ? <span className="text-ok" aria-label="done">✓</span> : <span className="text-soft" aria-hidden="true">·</span>);
  const bar = (n, of) => <span className="block h-1.5 w-full overflow-hidden rounded bg-paper"><span className="block h-full bg-rubric" style={{ width: `${Math.round(100 * n / of)}%` }} /></span>;
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2" aria-label="Learn Latin">
        <h2 className="latin text-[1.4rem] font-bold text-ink">Learn Latin from the beginning</h2>
        <p className="text-[15px] leading-relaxed text-ink">No Latin needed. Two ways in, which work best together: <b>read</b> a story that teaches you its own Latin, and <b>study</b> the grammar lesson by lesson. Both lead to the Church’s Latin: the Gospels, the Psalms, the Mass and the Office.</p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-lg border border-rubric bg-rubrictint px-5 py-4" aria-label="Reading course">
          <span className="smallcaps text-[13px] font-semibold text-rubric">Recommended start · by reading</span>
          <h3 lang="la" className="latin text-[1.2rem] font-bold text-ink">Familia Nursīna</h3>
          <p className="text-[14px] leading-snug text-ink">Twelve chapters of a story about a family in St Benedict’s town of Nursia: Mass, school, the monastery, a pilgrimage to Rome. Taught the natural way, as in Lingua Latina: Latin only, explained by the story itself, by pictures and Latin notes in the margin; the grammar comes after you have met it.</p>
          {bar(nDone, COURSE_N.length)}
          <span className="text-[13px] text-soft">{nDone} of {COURSE_N.length} chapters read</span>
          <Btn variant="primary" onClick={() => go(nextN.id)}>{nDone ? "Continue" : "Start"}: chapter {nextN.num}, <span lang="la" className="latin">{nextN.title}</span> →</Btn>
        </section>
        <section className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Grammar course">
          <span className="smallcaps text-[13px] font-semibold text-rubric">By grammar</span>
          <h3 className="text-[1.2rem] font-bold text-ink">Grammar course: 34 lessons</h3>
          <p className="text-[14px] leading-snug text-ink">The whole grammar in the order of Wheelock and of Scanlon’s <i>Latin Grammar</i> for Church Latin: clear explanations in English, tables, vocabulary, sentences both ways with answers, and a real Gospel verse or prayer in every lesson.</p>
          {bar(gDone, COURSE_G.length)}
          <span className="text-[13px] text-soft">{gDone} of {COURSE_G.length} lessons done</span>
          <Btn onClick={() => go(nextG.id)}>{gDone ? "Continue" : "Start"}: lesson {nextG.n}, {nextG.title} →</Btn>
        </section>
      </div>
      <section className={box} aria-label="How to use it">
        <H3>How to use it</H3>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px] leading-snug text-ink">
          <li>Read a chapter of the story aloud, twice. Then do its exercises (pēnsa). Each chapter names the grammar lessons that go with it: do those next.</li>
          <li>When you finish a chapter or lesson, its words join your flashcards (Vocabulary → <b>Course words</b>), reviewed on the Anki-style schedule. A few minutes a day beats an hour a week.</li>
          <li>Tap any Latin word anywhere in the app for its parsing and dictionary entry; Forms shows every form of a word.</li>
          <li>Pronunciation: the Church’s (Italian) pronunciation is used. <button type="button" className="text-rubric underline underline-offset-2" onClick={onGuide}>The pronunciation table is in the Guide →</button></li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={onDeck}>Course words{nCards ? ` · ${nCards}` : ""} →</Btn>
          <Btn onClick={() => setCheck(c => !c)} pressed={check}>Know some Latin already? Find where to start</Btn>
        </div>
        {check && <div className="rounded-md border border-rule bg-paper px-4 py-3"><CourseCheck onResult={go} /></div>}
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <section className={box} aria-label="Chapters">
          <H3>The story: chapters</H3>
          <ol className="flex flex-col gap-1">{COURSE_N.map(c => (
            <li key={c.id}><button type="button" onClick={() => go(c.id)} className="flex w-full items-baseline gap-2 text-left text-[15px] text-ink hover:text-rubric">
              {tick(c.id)}<span className="w-8 flex-none text-soft">{c.num}</span><span lang="la" className="latin">{c.title}</span><span className="truncate text-[13px] text-soft">· {c.en}</span></button></li>
          ))}</ol>
        </section>
        <section className={box} aria-label="Lessons">
          <H3>The grammar: lessons</H3>
          <ol className="flex flex-col gap-1">{COURSE_G.map(g => (
            <li key={g.id}><button type="button" onClick={() => go(g.id)} className="flex w-full items-baseline gap-2 text-left text-[15px] text-ink hover:text-rubric">
              {tick(g.id)}<span className="w-6 flex-none text-right text-soft">{g.n}</span><span>{g.title}</span></button></li>
          ))}</ol>
        </section>
      </div>
      <section className={box} aria-label="After the course">
        <H3>After the course</H3>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px] leading-snug text-ink">
          <li><button type="button" className="text-rubric underline underline-offset-2" onClick={() => onOpenLib("rd-lhomond-hist")}>Lhomond, <i lang="la">Epitome historiae sacrae</i></button>: Bible history in easy Latin, written for beginners. Then Eutropius and Phaedrus (Library → First readers).</li>
          <li><button type="button" className="text-rubric underline underline-offset-2" onClick={onPassage}>The Gospel of St John</button> with word help and translation practice (Study → Passages).</li>
          <li>Today’s Office and Mass in Latin and English (Liturgy), and the grammar of the five exam texts (Guide).</li>
        </ul>
        <p className="text-[13px] text-soft">The story, notes, lessons and exercises were written for this app; they follow the methods of Ørberg’s <i>Lingua Latina per se illustrata</i> and of Wheelock’s and Scanlon’s grammars, but copy nothing from them. Readings from the Vulgate and the Douay-Rheims come from the app’s own texts. Please report any mistake in the Latin (Home → Suggest an improvement).</p>
      </section>
    </div>
  );
}
