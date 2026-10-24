/* ---------- Reading aids: stress accents, sentence structure, listening, text size ---------- */
const PREFS_KEY = "lectio-vulgata-prefs";
const AidsContext = React.createContext({ acc: null, structure: false, lex: null });
let accPromise = null;
function loadAccents() { if (!accPromise) accPromise = getJSON("data/accents.json").catch(e => { accPromise = null; throw e; }); return accPromise; }
const ACC_CH = { a: "á", e: "é", i: "í", o: "ó", u: "ú", y: "ý", A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú", Y: "Ý" };
function accentWord(w, acc) {
  const pos = acc && acc[n1(w)];
  if (!pos) return w;
  const s = w.split("");
  pos.forEach(i => { if (ACC_CH[s[i]]) s[i] = ACC_CH[s[i]]; });
  return s.join("");
}
/* Structure view: what kind of job a word does in its clause, from its parsing. */
const SUBORD = new Set(["ut", "uti", "cum", "quod", "quia", "quoniam", "si", "nisi", "ne", "dum", "donec", "postquam", "antequam", "priusquam",
  "quamvis", "quamquam", "licet", "ubi", "sicut", "quasi", "tamquam", "quando", "quatenus", "etsi", "etiamsi", "quomodo", "unde", "quare", "an", "num", "utrum"]);
function structClass(lex, entry) {
  if (!lex) return "";
  const r = readings(entry);
  if (r.kind === "none") return "";
  const classes = new Set((r.kind === "lookup" ? r.ids : r.ids.slice(0, 1)).map(id => {
    const [li, pos, m] = lex.ana[id];
    const lemma = lex.lemmas[li][0];
    if (pos === "Pr" || (SUBORD.has(lemma) && (pos === "G-" || pos === "Dq" || pos === "Du" || pos === "Df" || pos === "C-"))) return "st-sub";
    if (!m || m === "??") return "";
    if (pos === "V-") return "imsn".includes(m[3]) && m[3] !== "n" ? "st-v" : "st-nf";
    if (m[6] === "n" && /^(Nb|Ne|Pp|Pd|Px|A-)/.test(pos)) return "st-nom";
    return "";
  }));
  return classes.size === 1 ? [...classes][0] : "";
}
function StructureKey() {
  return (
    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-soft">
      <span><span className="st-v">verb</span> finite verbs</span>
      <span><span className="st-nf">verb</span> infinitives, participles</span>
      <span><span className="st-sub">qui</span> clause openers</span>
      <span><span className="st-nom">nomen</span> nominatives (likely subjects)</span>
      <span>Method: find each finite verb, then its subject, then attach the rest.</span>
    </p>
  );
}
/* Text-to-speech: an Italian voice is the nearest to ecclesiastical pronunciation. */
function useLatinVoice() {
  const [voice, setVoice] = useState(null);
  useEffect(() => {
    try {
      if (!("speechSynthesis" in window)) return;
      const pick = () => {
        const vs = window.speechSynthesis.getVoices() || [];
        setVoice(vs.find(v => /^la/i.test(v.lang)) || vs.find(v => /^it/i.test(v.lang)) || null);
      };
      pick();
      window.speechSynthesis.addEventListener("voiceschanged", pick);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", pick);
    } catch (e) { /* not available */ }
  }, []);
  return voice;
}
function ReadingAids({ prefs, setPrefs, text, allowStructure = true, voice }) {
  const [speaking, setSpeaking] = useState(false);
  function listen() {
    try {
      const ss = window.speechSynthesis;
      if (speaking) { ss.cancel(); setSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(text.replace(/ \/ /g, ", "));
      u.voice = voice; u.lang = voice.lang; u.rate = 0.85;
      u.onend = u.onerror = () => setSpeaking(false);
      ss.cancel(); ss.speak(u); setSpeaking(true);
    } catch (e) { setSpeaking(false); }
  }
  const chip = on => `rounded border px-2 py-0.5 text-[13px] ${on ? "border-rubric bg-rubrictint text-rubric" : "border-rule bg-paper text-ink hover:border-soft"}`;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Reading aids">
      <button type="button" className={chip(prefs.accents)} aria-pressed={!!prefs.accents} onClick={() => setPrefs(p => ({ ...p, accents: !p.accents }))}
        title="Show stress accents, as printed in the Breviary">Accents</button>
      {allowStructure && (
        <button type="button" className={chip(prefs.structure)} aria-pressed={!!prefs.structure} onClick={() => setPrefs(p => ({ ...p, structure: !p.structure }))}
          title="Mark verbs, clause openers and nominatives">Structure</button>
      )}
      {voice && <button type="button" className={chip(speaking)} aria-pressed={speaking} onClick={listen} title={`Read aloud (${voice.lang} voice)`}>{speaking ? "Stop" : "Listen"}</button>}
      <span className="ml-1 flex items-center gap-1" aria-label="Text size">
        <button type="button" className={chip(false)} onClick={() => setPrefs(p => ({ ...p, size: Math.max(0, (p.size || 1) - 1) }))} aria-label="Smaller text">A−</button>
        <button type="button" className={chip(false)} onClick={() => setPrefs(p => ({ ...p, size: Math.min(3, (p.size || 1) + 1) }))} aria-label="Larger text">A+</button>
      </span>
    </div>
  );
}

/* ---------- Examiner questions: what an oral examiner asks after the translation ---------- */
const CASES = ["nominative", "accusative", "genitive", "dative", "ablative"];
const TENSES = ["present", "imperfect", "future", "perfect", "pluperfect", "future perfect"];
const MOODS = ["indicative", "subjunctive", "imperative"];
/* Only forms that exist: six indicative tenses, four subjunctive, present and future imperative. */
const VALID_TM = [...TENSES.map(t => t + " indicative"), ...["present", "imperfect", "perfect", "pluperfect"].map(t => t + " subjunctive"), "present imperative", "future imperative"];
function rng(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
function shuffle(a, r) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function makeQuestions(lex, verses, seed, max = 3) {
  if (!lex) return [];
  const r = rng(seed);
  const cands = [];
  verses.forEach(v => {
    const words = v[1].match(WORD_RE) || [];
    words.forEach((w, k) => {
      const e = v[3] && v[3][k];
      const rd = readings(e);
      if (!(rd.kind === "context" || (rd.kind === "lookup" && rd.ids.length === 1))) return;
      const [li, pos, m] = lex.ana[rd.ids[0]];
      if (!m || m === "??" || pos === "Ne") return;
      const [lemma, gloss, pp] = lex.lemmas[li];
      if (w.length < 3) return;
      if (pos === "V-" && "ism".includes(m[3]) && T_L[m[2]]) cands.push({ w, kind: "verb", lemma, gloss, pp, pos, m, li, wt: 3 });
      else if (pos === "V-" && "pdg".includes(m[3])) cands.push({ w, kind: "nonfinite", lemma, gloss, pp, pos, m, li, wt: 2 });
      else if (/^(Nb|A-)/.test(pos) && C_L[m[6]] && CASES.includes(C_L[m[6]])) cands.push({ w, kind: "case", lemma, gloss, pp, pos, m, li, wt: 2 });
    });
  });
  // Skip forms of sum/possum when there is anything more interesting; never ask about one word or lemma twice.
  const EASY = new Set(["sum", "possum"]);
  const pool = cands.filter(c => !EASY.has(c.lemma)).length >= 2 ? cands.filter(c => !EASY.has(c.lemma)) : cands;
  const seen = new Set(), qs = [];
  shuffle(pool, r).sort((a, b) => b.wt - a.wt + (r() - 0.5) * 2).forEach(c => {
    if (qs.length >= max || seen.has(c.lemma)) return;
    seen.add(c.lemma);
    const full = parseLabel(c.pos, c.m, c.lemma);
    if (c.kind === "verb") {
      const t = T_L[c.m[2]], mo = M_L[c.m[3]], vo = c.m[4] === "p" ? (/or$/.test(c.lemma) ? " (deponent)" : " passive") : "";
      const ans = `${t} ${mo}${vo}`;
      const opts = new Set([ans]);
      shuffle(VALID_TM.map(x => x + vo), r).forEach(o => { if (opts.size < 4) opts.add(o); });
      const concept = c.m[3] === "s" ? "subj" : c.m[3] === "m" ? "imp" : c.m[4] === "p" ? (/or$/.test(c.lemma) ? "dep" : "pass") : c.m[2] === "f" ? "fut" : "rlt".includes(c.m[2]) ? "perf" : null;
      qs.push({ q: `What tense and mood is “${c.w}”?`, ans, opts: shuffle([...opts], r), why: full, c, concept });
    } else if (c.kind === "nonfinite") {
      const label = { p: { p: "present participle", r: "perfect participle", f: "future participle" }[c.m[2]] || "participle", d: "gerund", g: "gerundive" }[c.m[3]];
      const opts = shuffle(["present participle", "perfect participle", "future participle", "gerundive", "gerund"].filter(o => o !== label), r).slice(0, 3).concat(label);
      qs.push({ q: `What form is “${c.w}”?`, ans: label, opts: shuffle(opts, r), why: full, c, concept: "part" });
    } else {
      const ans = `${C_L[c.m[6]]} ${N_L[c.m[1]] || ""}`.trim();
      const opts = new Set([ans]);
      shuffle(CASES.flatMap(cs => ["singular", "plural"].map(nn => `${cs} ${nn}`)), r).forEach(o => { if (opts.size < 4) opts.add(o); });
      qs.push({ q: `What case and number is “${c.w}” here?`, ans, opts: shuffle([...opts], r), why: full, c, concept: { ablative: "abl", genitive: "gen", dative: "dat" }[C_L[c.m[6]]] || null });
    }
  });
  // one dictionary-form question for a verb, when there is one
  const v = pool.find(c => (c.kind === "verb" || c.kind === "nonfinite") && !EASY.has(c.lemma) && c.lemma.toLowerCase() !== c.w.toLowerCase());
  if (v && qs.length < max + 1) {
    const others = shuffle(lex.freq.map(f => lex.lemmas[f[0]][0]).filter(l => /(o|or)$/.test(l) && l !== v.lemma).slice(0, 300), r).slice(0, 3);
    qs.push({ q: `What is the dictionary form of “${v.w}”?`, ans: v.lemma, opts: shuffle([v.lemma, ...others], r), why: v.pp ? v.pp + (v.gloss ? ` (${v.gloss})` : "") : v.gloss, c: v, concept: null });
  }
  return qs;
}
function ExaminerQuiz({ lex, verses, seed, onAnswer, showKey = false }) {
  const qs = useMemo(() => makeQuestions(lex, verses, seed), [lex, verses, seed]);
  const [picked, setPicked] = useState({});
  useEffect(() => { setPicked({}); }, [seed]);
  if (!qs.length) return null;
  const done = Object.keys(picked).length;
  const right = qs.filter((q, i) => picked[i] === q.ans).length;
  return (
    <section className="reveal rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Examiner's questions">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="smallcaps text-[15px] font-semibold text-rubric">The examiner asks</h3>
        <span className="num text-[13px] text-soft">{done ? `${right} of ${done} right` : "Answer as you would aloud"}</span>
      </div>
      <ol className="flex flex-col gap-3">
        {qs.map((q, i) => {
          const p = picked[i];
          return (
            <li key={i}>
              <p className="text-[15px] text-ink">{i + 1}. {q.q}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {q.opts.map(o => {
                  const state = p == null ? (showKey && o === q.ans ? "key" : "") : o === q.ans ? "ok" : o === p ? "bad" : "";
                  const cls = state === "ok" || state === "key" ? "border-ok bg-oktint text-ok" : state === "bad" ? "border-warn bg-warntint text-warn" : "border-rule bg-paper text-ink hover:border-soft";
                  return (
                    <button key={o} type="button" disabled={p != null} onClick={() => { setPicked(s => ({ ...s, [i]: o })); onAnswer && onAnswer(q.concept, o === q.ans); }}
                      className={`rounded-md border px-2.5 py-1 text-[14px] ${cls}`}>{o}</button>
                  );
                })}
              </div>
              {(p != null || showKey) && <p className="mt-1 text-[13px] leading-snug text-soft"><span lang="la" className="latin font-bold text-ink">{q.c.w}</span>: {q.why}</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ---------- Today's plan ---------- */
const DAY_KEY = "lectio-vulgata-day";
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
function readDay() { const d = readLocal(DAY_KEY); return d && d.date === todayStr() ? d : { date: todayStr(), reviews: 0, vocab: 0, passages: 0, oral: 0, quiz: 0 }; }
function TodayCard({ day, dueCount, focusName, onStep, examLeft }) {
  const steps = [
    { id: "reviews", label: dueCount ? `Clear your reviews (${dueCount} due)` : "Reviews: nothing due", done: dueCount === 0, n: day.reviews },
    { id: "vocab", label: "Learn 10 words", done: day.vocab >= 10, n: `${Math.min(day.vocab, 10)}/10` },
    { id: "passage", label: `Translate 2 passages${focusName ? ` in ${focusName}` : ""}`, done: day.passages >= 2, n: `${Math.min(day.passages, 2)}/2` },
    { id: "oral", label: "One short oral mock exam", done: day.oral >= 1, n: day.oral ? "done" : "" }
  ];
  const next = steps.find(s => !s.done);
  return (
    <section className="rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Today's session">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="latin text-[1.1rem] font-bold text-ink">Today’s session</h2>
        <span className="text-[13px] text-soft">About 20 minutes{examLeft ? ` · ${examLeft}` : ""}</span>
      </div>
      <ol className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.id}>
            <button type="button" onClick={() => onStep(s.id)}
              className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-[14px] ${s.done ? "border-oktint bg-oktint text-ok" : "border-rule bg-paper text-ink hover:border-soft"}`}>
              <span className={`num inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[12px] font-bold ${s.done ? "bg-ok text-white" : "bg-rule text-ink"}`}>{s.done ? "✓" : i + 1}</span>
              <span className="min-w-0 flex-1">{s.label}</span>
              {s.n !== "" && !s.done && <span className="num text-[12px] text-soft">{s.n}</span>}
            </button>
          </li>
        ))}
      </ol>
      <div className="mt-3">
        {next ? <Btn variant="primary" onClick={() => onStep(next.id)}>{steps.some(s => s.done) ? "Continue" : "Start"}: {next.label.replace(/ \(.*\)$/, "").replace(/^Clear your reviews$/, "Clear your reviews")} →</Btn>
          : <p className="text-[14px] text-ok">Today’s session is done. Anything more is a bonus.</p>}
      </div>
    </section>
  );
}
function WelcomeCard({ onClose }) {
  return (
    <section className="reveal rounded-lg border border-rubric bg-rubrictint px-5 py-4" aria-label="Welcome">
      <h2 className="latin text-[1.1rem] font-bold text-ink">Welcome to Lectio Vulgata</h2>
      <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-[15px] leading-snug text-ink">
        <li>Each day, press <strong>Start today’s session</strong>. It mixes reviews, vocabulary, passages from your weakest exam part, and a short oral mock.</li>
        <li>Translate, then <strong>Check Translation</strong> and grade yourself honestly. The page adapts to those grades.</li>
        <li>Tap any Latin word for its parsing. Turn on <strong>Accents</strong> to read aloud with the Breviary’s stress marks, or <strong>Structure</strong> to see the verbs and clauses.</li>
        <li>Your progress is saved automatically. Use <strong>Skill map &amp; backup</strong> to move it to another device.</li>
      </ol>
      <div className="mt-3"><Btn variant="primary" onClick={onClose}>Got it</Btn></div>
    </section>
  );
}
