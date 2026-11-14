/* ---------- More practice (Study → More): exam plan, sentences to review, phrases, sacramental forms ----------
   Also the step-by-step reader for the Summa, the Library and the Office (StepThrough), and the bank of sentences
   the student needed help with (saved from any sentence-by-sentence reading). */

/* ===== The sentence bank: every sentence marked "I needed help" comes back for review ===== */
const SBANK_KEY = "lectio-vulgata-sbank";   // { items: [{ k, t, p, r: [label, latin, english, ids], a, due, ivl, n }] }
function sbankRead() { const b = readLocal(SBANK_KEY); return b && Array.isArray(b.items) ? b : { items: [] }; }
function sbankWrite(b) { writeLocal(SBANK_KEY, b); try { window.dispatchEvent(new CustomEvent("lv-sbank")); } catch (e) {} }
function sbankAdd(k, title, part, row) {
  if (!row || !row[1]) return;
  const b = sbankRead(), now = Date.now();
  const old = b.items.find(x => x.k === k || x.r[1] === row[1]);
  if (old) { old.ivl = 0; old.due = now + 20 * 36e5; }
  else b.items.push({ k, t: title || "", p: part || "nt", r: [row[0] || "", row[1], row[2] || "", row[3] || null], a: now, due: now + 20 * 36e5, ivl: 0, n: 0 });
  // keep the bank small: drop the longest-learned first, then the oldest
  while (b.items.length > 300) { b.items.sort((x, y) => (y.ivl - x.ivl) || (x.a - y.a)); b.items.shift(); }
  sbankWrite(b);
}
function sbankGrade(k, got) {
  const b = sbankRead(), x = b.items.find(y => y.k === k);
  if (!x) return;
  x.n = (x.n || 0) + 1;
  x.ivl = got ? (x.ivl ? Math.min(180, Math.round(x.ivl * 2.5)) : 3) : 1;
  x.due = Date.now() + x.ivl * DAY - 2 * 36e5;
  sbankWrite(b);
}
const sbankDue = () => sbankRead().items.filter(x => x.due <= Date.now()).length;
function useSbankDue() {
  const [n, setN] = useState(sbankDue);
  useEffect(() => { const h = () => setN(sbankDue()); window.addEventListener("lv-sbank", h); return () => window.removeEventListener("lv-sbank", h); }, []);
  return n;
}

/* ===== Step by step anywhere: the sentence reader over a Summa article, a Library chapter or an Office lesson ===== */
const stepClean = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC").replace(/æ/g, "ae").replace(/Æ/g, "Ae").replace(/œ/g, "oe").replace(/Œ/g, "Oe").replace(/\{[^}]*\}/g, " ").replace(/\((?:Must use the Latin)\)/g, "").replace(/[\^*✠+℣℟]/g, "").replace(/^\s*(?:[VR]\.|S\.|M\.)\s+/, "").replace(/\s+/g, " ").trim();
function StepThrough({ title, part, paras, ws, formsLoad, storeKey, onClose, onTable }) {
  const [lex, setLex] = useState(null), [forms, setForms] = useState(null), [err, setErr] = useState("");
  useEffect(() => {
    loadLex().then(setLex).catch(() => setErr("The word help didn’t load. Check your connection and try again."));
    if (!ws && formsLoad) formsLoad().then(setForms).catch(() => setForms({}));
  }, []);
  const rows = useMemo(() => {
    if (!lex || (!ws && !forms)) return null;
    return paras.map((p, j) => {
      const la = ws ? p.la : stepClean(p.la);
      const ids = ws ? ws[p.j != null ? p.j : j] || null : (la.match(WORD_RE) || []).map(w => formLookup(forms, w) || -1);
      return [p.label || "", la, ws ? p.en || "" : stepClean(p.en), ids];
    }).filter(r => /[A-Za-z]{2}/.test(r[1]));
  }, [lex, forms]);
  if (err || !rows) return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-auto bg-paper px-4 pt-10" role="dialog" aria-label="Sentence by sentence">
      <div className="flex flex-col items-center gap-3"><p className="text-[15px] text-soft">{err || "Getting the words ready…"}</p><Btn onClick={onClose}>Close</Btn></div>
    </div>
  );
  if (!rows.length) return null;
  return <SentenceReader lex={lex} verses={rows} part={part} prog={null} title={title} storeKey={storeKey} onTable={onTable} onClose={onClose} />;
}
function StepButton({ onClick, label = "Step through it", note }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Btn onClick={onClick}>{label}</Btn>
      {note && <span className="text-[13px] text-soft">{note}</span>}
    </span>
  );
}

/* ===== Exam plan: weeks to the exam, what each week should hold ===== */
const PLAN_MOCK_WEEKS = 8;     // the last eight weeks: a full mock every week
function weekStart(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); }
function planWeek(prog, now = Date.now()) {
  if (!prog.exam) return null;
  const exam = new Date(prog.exam + "T12:00:00").getTime();
  const days = Math.ceil((exam - now) / DAY);
  if (days <= 0) return { over: true };
  const weeks = Math.max(1, Math.ceil(days / 7));
  const G = dailyGoal();
  const perWeek = G.passages * 6;
  const parts = PARTS.map(p => {
    const a = (prog.ability || {})[p.id];
    const known = a && a.n >= 3;
    const r = known ? readiness(a) : null;
    return { id: p.id, r, n: a ? a.n : 0, need: known ? Math.max(0.15, (85 - r) / 85) : 1 };
  });
  const sum = parts.reduce((s, p) => s + p.need, 0);
  const ws = weekStart(now);
  const doneBy = {};
  Object.entries(prog.pcards || {}).forEach(([k, c]) => { if (c && c.last >= ws) { const pid = partOf(k.split(".")[0]); doneBy[pid] = (doneBy[pid] || 0) + 1; } });
  const mocksDone = (prog.sittings || []).filter(s => s.at >= ws && (s.parts || []).length >= 5).length;
  (prog.sittings || []).filter(s => s.at >= ws).forEach(s => (s.parts || []).forEach(q => { if (q.g && q.part) doneBy[q.part] = (doneBy[q.part] || 0) + 1; }));
  const phase = weeks <= 1 ? "final" : weeks <= PLAN_MOCK_WEEKS ? "mock" : "build";
  const share = phase === "final" ? 0.4 : phase === "mock" ? 0.7 : 1;
  const targets = parts.map(p => ({ ...p, target: Math.max(1, Math.round(perWeek * share * p.need / sum)), done: doneBy[p.id] || 0 }));
  const mocks = phase === "build" ? 0 : phase === "final" ? 1 : weeks <= 3 ? 2 : 1;
  const unplaced = parts.filter(p => p.r == null).map(p => p.id);
  return { days, weeks, phase, targets, mocks, mocksDone, unplaced, perWeek };
}
const PHASE_L = {
  build: ["Building", "Passages in every part, most where you are weakest. Grade each one honestly: the plan follows your grades."],
  mock: ["Mock exams", "A full five-part oral sitting every week (two in the last three weeks), with passages in between where you are weakest."],
  final: ["The last week", "One calm oral mock, light review of your words and the sentences you needed help with, and rest before the exam."]
};
function ExamPlan({ prog, onPart, onMock, onPlace, onSetDate }) {
  const [date, setDate] = useState(prog.exam || "");
  const P = planWeek(prog);
  if (!prog.exam) return (
    <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-4">
      <h2 className="latin text-[1.1rem] font-bold text-ink">Your plan to the exam</h2>
      <p className="text-[15px] text-ink">Enter the date of your exam, and the app lays out each week until then: how many passages in each part (more where you are weakest), and when to start full mock sittings.</p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="plan-date" className="text-[14px] text-ink">Exam date</label>
        <input id="plan-date" type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-md border border-rule bg-paper px-2 py-1 text-[14px] text-ink" />
        <Btn variant="primary" disabled={!date} onClick={() => onSetDate(date)}>Make my plan</Btn>
      </div>
    </section>
  );
  if (P.over) return <p className="text-[15px] text-soft">Your exam date ({prog.exam}) has passed. Set a new one under Exam preparation if you have another sitting.</p>;
  const [pl, pnote] = PHASE_L[P.phase];
  const examDay = new Date(prog.exam + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const mockFrom = new Date(new Date(prog.exam + "T12:00:00").getTime() - PLAN_MOCK_WEEKS * 7 * DAY).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 rounded-lg border border-rule bg-leaf px-5 py-4">
        <span className="smallcaps text-[13px] font-semibold text-rubric">This week · {pl}</span>
        <h2 className="latin text-[1.15rem] font-bold text-ink">{P.days} days to the exam ({examDay})</h2>
        <p className="text-[14px] leading-snug text-soft">{pnote}{P.phase === "build" ? ` Mock sittings start the week of ${mockFrom}.` : ""}</p>
      </div>
      {P.unplaced.length > 0 && (
        <p className="rounded-md border border-dashed border-rule px-4 py-2 text-[14px] text-ink">
          The plan guesses for {P.unplaced.map(id => PART_INFO[id].short).join(", ")} until you have graded three passages there.{" "}
          <button type="button" className="font-medium text-rubric underline underline-offset-2" onClick={() => onPlace(P.unplaced)}>Take the placement check for {P.unplaced.length === 1 ? "it" : "them"}</button>
        </p>
      )}
      <div className="flex flex-col gap-1.5 rounded-lg border border-rule bg-leaf px-5 py-4" role="list" aria-label="Passages this week">
        <span className="mb-1 text-[14px] text-soft">Passages this week, graded in Passages or an exam sitting (tap a part to practise it)</span>
        {P.targets.map((t, i) => {
          const pct = Math.min(100, Math.round(100 * t.done / t.target));
          return (
            <button key={t.id} role="listitem" type="button" onClick={() => onPart(t.id)} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded py-0.5 text-left hover:text-rubric">
              <span className="truncate text-[14px] text-ink">{i + 1}. {PART_INFO[t.id].short}</span>
              <span className="h-2 overflow-hidden rounded-full bg-[var(--rule)]" aria-hidden="true"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? "var(--ok)" : "var(--rubric)" }} /></span>
              <span className="num w-[7.5rem] text-right text-[13px] text-soft">{t.done} of {t.target}{t.r != null ? ` · ${t.r}%` : ""}{t.done >= t.target ? " ✓" : ""}</span>
            </button>
          );
        })}
      </div>
      {P.mocks > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rule bg-leaf px-5 py-3">
          <span className="text-[15px] text-ink">Full oral mock sittings: <strong className="num">{P.mocksDone} of {P.mocks}</strong> this week{P.mocksDone >= P.mocks ? " ✓" : ""}</span>
          <Btn variant="primary" onClick={onMock}>Start a mock sitting</Btn>
        </div>
      )}
      <p className="text-[13px] text-soft">The weekly number follows your daily goal (Settings → Flashcards &amp; study): {P.perWeek} passages a week. Weaker parts get more; a part above about 85% still gets one, to keep it.</p>
    </section>
  );
}

/* ===== Sentences to review ===== */
function SentenceReview({ onTable }) {
  const [b, setB] = useState(sbankRead);
  const [run, setRun] = useState(null);   // { items, lex }
  const [all, setAll] = useState(false);
  useEffect(() => { const h = () => setB(sbankRead()); window.addEventListener("lv-sbank", h); return () => window.removeEventListener("lv-sbank", h); }, []);
  const now = Date.now();
  const due = b.items.filter(x => x.due <= now).sort((x, y) => x.due - y.due);
  const learned = b.items.filter(x => x.ivl >= 30).length;
  function start(items) {
    loadLex().then(lex => setRun({ items: items.slice(0, 20), lex })).catch(() => {});
  }
  function remove(k) { const nb = { items: b.items.filter(x => x.k !== k) }; sbankWrite(nb); setB(nb); }
  if (run) return (
    <SentenceReader lex={run.lex} verses={run.items.map(x => x.r)} parts={run.items.map(x => x.p)} part={run.items[0].p} prog={null} bank={false}
      title="Sentences to review" storeKey={"sbank:" + todayStr() + ":" + run.items.map(x => x.k).join("|").length} onTable={onTable}
      onMark={(src, r) => { const x = run.items[src]; if (x) sbankGrade(x.k, r === "got"); }}
      onClose={() => { setRun(null); setB(sbankRead()); }} />
  );
  const fmtDue = t => { const d = Math.ceil((t - now) / DAY); return d <= 0 ? "due" : d === 1 ? "tomorrow" : `in ${d} days`; };
  const list = all ? b.items.slice().sort((x, y) => x.due - y.due) : due;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-5 py-4">
        <h2 className="latin text-[1.1rem] font-bold text-ink">Sentences to review</h2>
        <p className="text-[14px] leading-snug text-soft">Every sentence you mark “I needed help” when reading sentence by sentence (passages, the Summa, the Library, the Office) is kept here and comes back: the next day, then after 3 days, a week, and so on while you get it; back to the next day when you need help again.</p>
        {b.items.length === 0 ? <p className="text-[15px] text-ink">Nothing saved yet. Read a passage sentence by sentence and mark the hard ones “I needed help”.</p> : (
          <div className="flex flex-wrap items-center gap-3">
            <Btn variant="primary" disabled={!due.length} onClick={() => start(due)}>{due.length ? `Review ${Math.min(20, due.length)} due now` : "Nothing due today"}</Btn>
            {!due.length && <Btn onClick={() => start(b.items.slice().sort((x, y) => x.due - y.due))}>Review some anyway</Btn>}
            <span className="num text-[14px] text-soft">{b.items.length} saved · {due.length} due · {learned} well learned</span>
          </div>
        )}
      </div>
      {b.items.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between"><span className="text-[14px] text-soft">{all ? "All saved sentences" : "Due now"}</span>
            <button type="button" className="text-[13px] text-rubric underline underline-offset-2" onClick={() => setAll(!all)}>{all ? "Show only the due ones" : "Show all"}</button></div>
          <ul className="flex flex-col gap-1.5">
            {list.slice(0, 60).map(x => (
              <li key={x.k} className="flex items-start gap-3 rounded-md border border-rule bg-leaf px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span lang="la" className="latin block text-[15px] leading-snug text-ink">{x.r[1]}</span>
                  <span className="block text-[12px] text-soft">{x.t}{x.r[0] ? ` · ${x.r[0]}` : ""} · {fmtDue(x.due)}</span>
                </span>
                <button type="button" className="text-[12px] text-soft underline" aria-label="Remove this sentence" onClick={() => remove(x.k)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ===== Phrases: the stock turns of phrase of St Thomas, the Bible, Church Latin and the hymns ===== */
const PHRASE_KINDS = [["thomas", "St Thomas"], ["bible", "Bible"], ["church", "Church Latin"], ["hymn", "Hymns"]];
const PHRASE_STATS_KEY = "lectio-vulgata-phrases";
let phraseExPromise = null;
const loadPhraseEx = () => (phraseExPromise = phraseExPromise || getJSON("data/phrase-ex.json").catch(() => getJSON(APP_SITE + "data/phrase-ex.json")).catch(e => { phraseExPromise = null; return {}; }));
const glossOf = note => { const m = String(note).match(/“([^”]+)”/); return m ? m[1].replace(/[,.:;]$/, "") : ""; };
/* quiz items: [latin, meaning, title, kind]; the authorities (Philosophus = Aristotle…) count one each */
function phraseItems(kind) {
  const out = [];
  (PHRASES[kind] || []).forEach(([re, title, note]) => {
    if (title === "The authorities") { (note.match(/[A-Z][a-z]+ = [^;.]+/g) || []).forEach(s => { const [a, b] = s.split(" = "); out.push([a, b.trim(), title, kind, re]); }); return; }
    const g = glossOf(note);
    if (g && title !== "Word order in hymns") out.push([title.replace(/ …$/, ""), g, title, kind, re]);
  });
  return out;
}
function markPhrase(text, re) {
  const m = re && String(text).match(new RegExp(re.source, re.flags.replace("g", "")));
  if (!m || m[0].length < 2 || re.source === ".") return text;
  return <>{text.slice(0, m.index)}<mark className="rounded bg-rubrictint px-0.5 text-rubric">{m[0]}</mark>{text.slice(m.index + m[0].length)}</>;
}
function PhraseTrainer() {
  const [kind, setKind] = useState("thomas");
  const [view, setView] = useState("quiz");
  const [ex, setEx] = useState(null);
  const [stats, setStats] = useState(() => readLocal(PHRASE_STATS_KEY) || {});
  const [q, setQ] = useState(null);   // { list, i, pick, right }
  const [showEn, setShowEn] = useState({});
  useEffect(() => { loadPhraseEx().then(setEx); }, []);
  const items = useMemo(() => phraseItems(kind), [kind]);
  function newQuiz() {
    const r = rng(kind + Date.now());
    // the ones missed or never seen first
    const score = it => { const s = stats[it[2] + "|" + it[0]]; return s ? s.ok / (s.n + 1) : -1; };
    const order = shuffle(items, r).sort((a, b) => score(a) - score(b)).slice(0, 10);
    const list = order.map(it => {
      const others = shuffle(items.filter(o => o[1] !== it[1]), r).slice(0, 3).map(o => o[1]);
      return { it, opts: shuffle([it[1], ...others], r) };
    });
    setQ({ list, i: 0, pick: null, right: 0 });
  }
  useEffect(() => { setQ(null); }, [kind]);
  function answer(o) {
    if (q.pick) return;
    const cur = q.list[q.i], ok = o === cur.it[1];
    const k = cur.it[2] + "|" + cur.it[0];
    const s = { ...stats, [k]: { n: ((stats[k] || {}).n || 0) + 1, ok: ((stats[k] || {}).ok || 0) + (ok ? 1 : 0) } };
    setStats(s); writeLocal(PHRASE_STATS_KEY, s);
    setQ({ ...q, pick: o, right: q.right + (ok ? 1 : 0) });
  }
  const tabBtn = (id, l, cur, set) => <button key={id} type="button" aria-pressed={cur === id} onClick={() => set(id)}
    className={`rounded-md px-3 py-1 text-[14px] ${cur === id ? "bg-ink text-paper" : "border border-rule bg-leaf text-ink"}`}>{l}</button>;
  const cur = q && q.list[q.i];
  const example = it => { const e = ex && ex[it[2]]; return e && e.length ? e[0] : null; };
  return (
    <section className="flex flex-col gap-3">
      <p className="text-[14px] leading-snug text-soft">The set turns of phrase that recur in every text of the exam: learn them once and whole sentences open up. Each comes with real examples from the texts.</p>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Kind of Latin">{PHRASE_KINDS.map(([id, l]) => tabBtn(id, l, kind, setKind))}</div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="View">{[["quiz", "Quiz"], ["list", "All the phrases"]].map(([id, l]) => tabBtn(id, l, view, setView))}</div>
      {view === "list" ? (
        <ul className="flex flex-col gap-2">
          {(PHRASES[kind] || []).filter(p => p[1] !== "Word order in hymns").map(([re, title, note]) => (
            <li key={title} className="rounded-lg border border-rule bg-leaf px-4 py-3">
              <span lang="la" className="latin block text-[1.05rem] font-bold text-ink">{title}</span>
              <span className="block text-[14px] leading-snug text-ink">{note}</span>
              {ex && (ex[title] || []).map((e, n) => (
                <span key={n} className="mt-1.5 block border-l-2 border-rule pl-3">
                  <span lang="la" className="latin block text-[15px] leading-snug text-ink">{markPhrase(e[0], re)}</span>
                  {e[1] && (showEn[title + n] ? <span lang="en" className="block text-[13px] text-soft">{e[1]}</span>
                    : <button type="button" className="text-[12px] text-rubric underline" onClick={() => setShowEn(s => ({ ...s, [title + n]: true }))}>English</button>)}
                  <span className="block text-[12px] text-soft">{e[2]}</span>
                </span>
              ))}
            </li>
          ))}
        </ul>
      ) : !q ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-rule bg-leaf px-5 py-4">
          <span className="text-[15px] text-ink">{Math.min(10, items.length)} questions: what does the phrase mean? The ones you miss come back first next time.</span>
          <Btn variant="primary" onClick={newQuiz}>Start</Btn>
        </div>
      ) : q.i >= q.list.length ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-rule bg-leaf px-5 py-4">
          <span className="text-[16px] text-ink"><strong className="num">{q.right} of {q.list.length}</strong> right.</span>
          <div className="flex gap-2"><Btn variant="primary" onClick={newQuiz}>Another ten</Btn><Btn onClick={() => setView("list")}>See all the phrases</Btn></div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-4">
          <span className="num text-[13px] text-soft">Question {q.i + 1} of {q.list.length}</span>
          <span lang="la" className="latin text-[1.2rem] font-bold text-ink">{cur.it[0]}</span>
          {(() => { const e = example(cur.it); return e ? <span lang="la" className="latin border-l-2 border-rule pl-3 text-[15px] leading-snug text-ink">{markPhrase(e[0], cur.it[4])} <span className="block text-[12px] not-italic text-soft">{e[2]}</span></span> : null; })()}
          <span className="text-[14px] text-soft">What does it mean here?</span>
          <div className="flex flex-col gap-1.5">
            {cur.opts.map(o => {
              const right = q.pick && o === cur.it[1], wrong = q.pick === o && o !== cur.it[1];
              return <button key={o} type="button" disabled={!!q.pick} onClick={() => answer(o)}
                className={`rounded-md border px-3 py-2 text-left text-[15px] ${right ? "border-ok bg-oktint text-ok" : wrong ? "border-warn bg-warntint text-warn" : "border-rule bg-paper text-ink hover:border-soft"}`}>{o}</button>;
            })}
          </div>
          {q.pick && (
            <div className="flex flex-col gap-2">
              <p className="text-[14px] leading-snug text-ink">{(PHRASES[cur.it[3]].find(p => p[1] === cur.it[2]) || [])[2]}</p>
              <Btn variant="primary" className="self-start" onClick={() => setQ({ ...q, i: q.i + 1, pick: null })}>Next</Btn>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ===== The sacramental forms, word for word =====
   Latin as printed in the Rituale Romanum (1952), the Missale Romanum (1962) and the Rituale's rite of Confirmation
   by a priest; stress accents as printed; the English is this app's. lib: [work, chapter] to read the rite in context. */
const FORMULAS = [
  { id: "bapt", name: "Baptism", la: "N., Ego te baptízo in nómine Patris, et Fílii, et Spíritus Sancti.", en: "N., I baptize thee in the name of the Father, and of the Son, and of the Holy Ghost.", src: "Rituale Romanum, Tit. II, cap. 2, n. 19", lib: ["rituale", 1], form: true, note: "Water is poured three times, at each Name (Patris, Fílii, Spíritus Sancti)." },
  { id: "baptc", name: "Baptism, conditionally", la: "N., Si non es baptizátus, ego te baptízo in nómine Patris, et Fílii, et Spíritus Sancti.", en: "N., if thou art not baptized, I baptize thee in the name of the Father, and of the Son, and of the Holy Ghost.", src: "Rituale Romanum, Tit. II, cap. 2, n. 22", lib: ["rituale", 1], form: true, note: "For a girl: baptizáta." },
  { id: "conf", name: "Confirmation (by a priest, in danger of death)", la: "N., Signo te signo Crucis, et confírmo te Chrísmate salútis. In nómine Patris, et Fílii, et Spíritus Sancti. Amen.", en: "N., I sign thee with the sign of the Cross, and I confirm thee with the chrism of salvation. In the name of the Father, and of the Son, and of the Holy Ghost. Amen.", src: "Rituale Romanum, Ritus Confirmationis ægrotantium in periculo mortis", lib: ["rituale", 248], form: true },
  { id: "corp", name: "Consecration of the Host", la: "Hoc est enim Corpus meum.", en: "For this is My Body.", src: "Missale Romanum (1962), Canon; De defectibus, V", form: true },
  { id: "calix", name: "Consecration of the Chalice", la: "Hic est enim Calix Sánguinis mei, novi et ætérni testaménti: mystérium fídei: qui pro vobis et pro multis effundétur in remissiónem peccatórum.", en: "For this is the Chalice of My Blood, of the new and eternal testament: the mystery of faith: which shall be shed for you and for many unto the remission of sins.", src: "Missale Romanum (1962), Canon; De defectibus, V", form: true },
  { id: "misereatur", name: "Misereatur (before absolution)", la: "Misereátur tui omnípotens Deus, et dimíssis peccátis tuis, perdúcat te ad vitam ætérnam. Amen.", en: "May almighty God have mercy on thee, and, thy sins forgiven, bring thee to life everlasting. Amen.", src: "Rituale Romanum, Tit. III, cap. 2, n. 1", lib: ["rituale", 199] },
  { id: "indulg", name: "Indulgentiam", la: "Indulgéntiam, absolutiónem, et remissiónem peccatórum tuórum tríbuat tibi omnípotens, et miséricors Dóminus. Amen.", en: "May the almighty and merciful Lord grant thee pardon, absolution, and remission of thy sins. Amen.", src: "Rituale Romanum, Tit. III, cap. 2, n. 2", lib: ["rituale", 199] },
  { id: "absol", name: "Absolution", la: "Dóminus noster Jesus Christus te absólvat: et ego auctoritáte ipsíus te absólvo ab omni vínculo excommunicatiónis, suspensiónis, et interdícti, in quantum possum, et tu índiges. Deínde ego te absólvo a peccátis tuis, in nómine Patris, et Fílii, et Spíritus Sancti. Amen.", en: "May our Lord Jesus Christ absolve thee; and I, by His authority, absolve thee from every bond of excommunication, suspension and interdict, so far as I can and thou needest. Then I absolve thee from thy sins, in the name of the Father, and of the Son, and of the Holy Ghost. Amen.", src: "Rituale Romanum, Tit. III, cap. 2, n. 2", lib: ["rituale", 199], form: true, note: "For a lay penitent “suspensiónis” is left out. The form strictly so called: ego te absólvo a peccátis tuis." },
  { id: "passio", name: "Passio Domini nostri (after absolution)", la: "Pássio Dómini nostri Jesu Christi, mérita beátæ Maríæ Vírginis, et ómnium Sanctórum, quidquid boni féceris, et mali sustinúeris, sint tibi in remissiónem peccatórum, augméntum grátiæ, et prǽmium vitæ ætérnæ. Amen.", en: "May the Passion of our Lord Jesus Christ, the merits of the Blessed Virgin Mary and of all the Saints, whatever good thou hast done and evil thou hast borne, be to thee for the remission of sins, the increase of grace, and the reward of life everlasting. Amen.", src: "Rituale Romanum, Tit. III, cap. 2, n. 3", lib: ["rituale", 199] },
  { id: "absolm", name: "Absolution in danger of death (short form)", la: "Ego te absólvo ab ómnibus censúris, et peccátis, in nómine Patris, et Fílii, et Spíritus Sancti. Amen.", en: "I absolve thee from all censures and sins, in the name of the Father, and of the Son, and of the Holy Ghost. Amen.", src: "Rituale Romanum, Tit. III, cap. 2, n. 5", lib: ["rituale", 199], form: true },
  { id: "commun", name: "Giving Holy Communion", la: "Corpus Dómini nostri Jesu Christi custódiat ánimam tuam in vitam ætérnam. Amen.", en: "May the Body of our Lord Jesus Christ keep thy soul unto life everlasting. Amen.", src: "Rituale Romanum, Tit. IV, cap. 2", lib: ["rituale", 204] },
  { id: "viat", name: "Viaticum", la: "Accipe, frater (soror), Viáticum Córporis Dómini nostri Jesu Christi, qui te custódiat ab hoste malígno, et perdúcat in vitam ætérnam. Amen.", en: "Receive, brother (sister), the Viaticum of the Body of our Lord Jesus Christ, who will guard thee from the wicked enemy and bring thee to life everlasting. Amen.", src: "Rituale Romanum, Tit. IV, cap. 4", lib: ["rituale", 206] },
  { id: "unct", name: "Extreme Unction (the eyes; the other senses follow the same form)", la: "Per istam sanctam Unctiónem, et suam piíssimam misericórdiam, indúlgeat tibi Dóminus quidquid per visum deliquísti. Amen.", en: "Through this holy anointing, and of His most tender mercy, may the Lord pardon thee whatever sins thou hast committed by sight. Amen.", src: "Rituale Romanum, Tit. V, cap. 2", lib: ["rituale", 208], form: true, note: "The other senses: per audítum, per odorátum, per gustum et locutiónem, per tactum, per gressum." },
  { id: "unctb", name: "Extreme Unction in urgent necessity (one anointing)", la: "Per istam sanctam Unctiónem indúlgeat tibi Dóminus quidquid deliquísti. Amen.", en: "Through this holy anointing may the Lord pardon thee whatever sins thou hast committed. Amen.", src: "Rituale Romanum, Tit. V, cap. 1, n. 21", lib: ["rituale", 207], form: true },
  { id: "apost", name: "Apostolic Blessing at the hour of death", la: "Dóminus noster Jesus Christus, Fílius Dei vivi, qui beáto Petro Apóstolo suo dedit potestátem ligándi atque solvéndi, per suam piíssimam misericórdiam recípiat confessiónem tuam, et restítuat tibi stolam primam, quam in baptísmate recepísti. Et ego, facultáte mihi ab Apostólica Sede tribúta, indulgéntiam plenáriam et remissiónem ómnium peccatórum tibi concédo. In nómine Patris, et Fílii, et Spíritus Sancti. Amen.", en: "May our Lord Jesus Christ, the Son of the living God, who gave to blessed Peter His Apostle the power of binding and loosing, of His most tender mercy receive thy confession and restore to thee the first robe which thou didst receive in baptism. And I, by the faculty given me by the Apostolic See, grant thee a plenary indulgence and the remission of all thy sins. In the name of the Father, and of the Son, and of the Holy Ghost. Amen.", src: "Rituale Romanum, Tit. V, cap. 6", lib: ["rituale", 211] },
  { id: "matr", name: "Matrimony (the priest's words)", la: "Ego conjúngo vos in matrimónium. In nómine Patris, et Fílii, et Spíritus Sancti. Amen.", en: "I join you together in marriage. In the name of the Father, and of the Son, and of the Holy Ghost. Amen.", src: "Rituale Romanum, Tit. VII, cap. 2", lib: ["rituale", 5], note: "The spouses themselves are the ministers; these words witness and bless their consent." }
];
const FORM_KEY = "lectio-vulgata-formulas";   // { id: { best: percent, at: time } }
const formNorm = w => w.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/j/g, "i").replace(/[^a-z]/g, "");
const formWords = t => t.replace(/\([^)]*\)/g, " ").split(/\s+/).map(w => ({ w, n: formNorm(w) })).filter(x => x.n);
/* word-by-word comparison (longest common subsequence): which of the form's words were written, which missing, which extra */
function formDiff(target, typed) {
  const a = formWords(target), b = formWords(typed);
  const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i].n === b[j].n ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i].n === b[j].n) { out.push({ w: a[i].w, s: "ok" }); i++; j++; }
    else if (j < b.length && (i >= a.length || L[i][j + 1] >= L[i + 1][j])) { out.push({ w: b[j].w, s: "extra" }); j++; }
    else { out.push({ w: a[i].w, s: "miss" }); i++; }
  }
  return { out, pct: a.length ? Math.round(100 * L[0][0] / a.length) : 0, exact: L[0][0] === a.length && b.length === a.length };
}
/* hide words for practice: level 1 every third, 2 every other, 3 all (first letters kept) */
function formCloze(text, level) {
  let k = 0;
  return text.split(/(\s+)/).map((t, i) => {
    if (!/[A-Za-zÀ-ÿæœ]/.test(t)) return t;
    k++;
    const hide = level >= 3 || (level === 2 && k % 2 === 0) || (level === 1 && k % 3 === 0);
    if (!hide) return t;
    const m = t.match(/^([^A-Za-zÀ-ÿæœ]*)([A-Za-zÀ-ÿæœ])([A-Za-zÀ-ÿæœ]*)(.*)$/);
    return m ? m[1] + m[2] + m[3].replace(/./g, "_") + m[4] : t;
  }).join("");
}
function FormulaDrill({ voice, onOpenLib }) {
  const [id, setId] = useState(FORMULAS[0].id);
  const [level, setLevel] = useState(0);
  const [typed, setTyped] = useState("");
  const [res, setRes] = useState(null);
  const [showEn, setShowEn] = useState(true);
  const [stats, setStats] = useState(() => readLocal(FORM_KEY) || {});
  const f = FORMULAS.find(x => x.id === id) || FORMULAS[0];
  useEffect(() => { setLevel(0); setTyped(""); setRes(null); }, [id]);
  function check() {
    const r = formDiff(f.la, typed);
    setRes(r);
    const s = { ...stats, [f.id]: { best: Math.max((stats[f.id] || {}).best || 0, r.pct), at: Date.now(), last: r.pct } };
    setStats(s); writeLocal(FORM_KEY, s);
  }
  const learned = FORMULAS.filter(x => (stats[x.id] || {}).best === 100).length;
  return (
    <section className="flex flex-col gap-3">
      <p className="text-[14px] leading-snug text-soft">The forms of the sacraments and the priest’s words around them, as printed in the Rituale Romanum (1952) and the Missale Romanum (1962). Read them, hear them, then write them from memory until every word is right. <span className="num">{learned} of {FORMULAS.length}</span> word-perfect so far.</p>
      <label htmlFor="form-pick" className="sr-only">Form</label>
      <select id="form-pick" value={id} onChange={e => setId(e.target.value)} className="rounded-md border border-rule bg-leaf px-3 py-2 text-[15px] text-ink">
        {FORMULAS.map(x => <option key={x.id} value={x.id}>{(stats[x.id] || {}).best === 100 ? "✓ " : (stats[x.id] || {}).best ? "· " : ""}{x.name}</option>)}
      </select>
      <article className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="latin text-[1.1rem] font-bold text-ink">{f.name}</h2>
          {f.form && <span className="rounded bg-rubrictint px-2 py-0.5 text-[12px] font-semibold text-rubric">Essential form: always said in Latin</span>}
        </div>
        <p lang="la" className="lt latin whitespace-pre-wrap text-[1.15rem] leading-[1.7] text-ink">{level ? formCloze(f.la, level) : f.la}</p>
        {showEn && <p lang="en" className="text-[15px] leading-snug text-soft">{f.en}</p>}
        {f.note && <p className="text-[13px] leading-snug text-soft">{f.note}</p>}
        <p className="text-[12px] text-soft">{f.src}{f.lib && onOpenLib ? <> · <button type="button" className="text-rubric underline underline-offset-2" onClick={() => onOpenLib(f.lib[0], f.lib[1], f.la.split(" ").slice(1, 3).join(" "))}>Read the whole rite</button></> : null}</p>
        <div className="flex flex-wrap items-center gap-2">
          {voice && <Btn onClick={() => speakLatin(voice, f.la)}>Hear it ▸</Btn>}
          <label className="flex items-center gap-1.5 text-[14px] text-ink"><input type="checkbox" checked={showEn} onChange={e => setShowEn(e.target.checked)} className="h-4 w-4 accent-[var(--rubric)]" />English</label>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Hide words">
          <span className="text-[13px] text-soft">Hide words:</span>
          {[[0, "None"], [1, "Some"], [2, "Half"], [3, "All"]].map(([n, l]) => <button key={n} type="button" aria-pressed={level === n} onClick={() => setLevel(n)}
            className={`rounded-md px-2.5 py-0.5 text-[13px] ${level === n ? "bg-ink text-paper" : "border border-rule bg-paper text-ink"}`}>{l}</button>)}
        </div>
        <RecordAloud id={"form:" + f.id} hint="Say it aloud, then listen back." />
      </article>
      <div className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-5 py-4">
        <label htmlFor="form-typed" className="text-[15px] font-medium text-ink">Write it from memory</label>
        <p className="text-[13px] text-soft">Accents, capitals and j/i don’t count; every word and its order do. Leave out stage directions and the (soror) alternatives.</p>
        <textarea id="form-typed" lang="la" rows={3} value={typed} onChange={e => { setTyped(e.target.value); setRes(null); }} className="rounded-md border border-rule bg-paper px-3 py-2 text-[16px] text-ink" autoCapitalize="off" spellCheck={false} />
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="primary" disabled={!typed.trim()} onClick={check}>Check</Btn>
          {(stats[f.id] || {}).best != null && <span className="num text-[13px] text-soft">Best so far: {stats[f.id].best}%</span>}
        </div>
        {res && (
          <div className="flex flex-col gap-1" aria-live="polite">
            <p className={`text-[15px] font-semibold ${res.exact ? "text-ok" : "text-warn"}`}>{res.exact ? "Word-perfect ✓" : `${res.pct}% of the words in place`}</p>
            {!res.exact && <p lang="la" className="latin text-[15px] leading-relaxed">{res.out.map((x, k) => <span key={k} className={x.s === "ok" ? "text-ink" : x.s === "miss" ? "rounded bg-warntint px-0.5 text-warn" : "text-soft line-through"}>{x.w} </span>)}</p>}
            {!res.exact && <p className="text-[12px] text-soft">Red: missing or wrong; struck through: not in the form.</p>}
          </div>
        )}
      </div>
    </section>
  );
}

/* ===== the Study tab ===== */
const PRACTICE_KEY = "lectio-vulgata-more";
function PracticeMode({ prog, voice, onTable, onPart, onMock, onPlace, onSetDate, onOpenLib }) {
  const [tab, setTab0] = useState(() => (readLocal(PRACTICE_KEY) || {}).tab || "plan");
  const setTab = t => { setTab0(t); writeLocal(PRACTICE_KEY, { tab: t }); };
  const due = useSbankDue();
  const tabs = [["plan", "Exam plan"], ["sentences", `Sentences to review${due ? ` · ${due}` : ""}`], ["phrases", "Phrases"], ["forms", "Sacramental forms"]];
  return (
    <div className="flex flex-col gap-3">
      <nav className="flex flex-wrap gap-1" aria-label="More practice">
        {tabs.map(([id, l]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}
          className={`rounded-md px-3 py-1.5 text-[14px] font-medium ${tab === id ? "bg-ink text-paper" : "text-ink hover:bg-leaf"}`}>{l}</button>)}
      </nav>
      {tab === "plan" && <ExamPlan prog={prog} onPart={onPart} onMock={onMock} onPlace={onPlace} onSetDate={onSetDate} />}
      {tab === "sentences" && <SentenceReview onTable={onTable} />}
      {tab === "phrases" && <PhraseTrainer />}
      {tab === "forms" && <FormulaDrill voice={voice} onOpenLib={onOpenLib} />}
    </div>
  );
}
