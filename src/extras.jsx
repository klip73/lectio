/* ---------- Offline copy: all data packed into the page ---------- */
const OFFLINE = typeof window !== "undefined" && !!window.__LV_DATA;
/* The installable phone app: the offline copy served from its own site, with a home-screen icon. */
const APP = typeof window !== "undefined" && !!window.__LV_APP;

/* ---------- Construe aloud: record yourself and play it back ---------- */
const RECORDINGS = new Map(); // id -> { url, secs }, kept until the page is closed
function keepRecording(id, v) {
  const old = RECORDINGS.get(id);
  if (old) { try { URL.revokeObjectURL(old.url); } catch (e) {} RECORDINGS.delete(id); }
  RECORDINGS.set(id, v);
  while (RECORDINGS.size > 20) {
    const [k, o] = RECORDINGS.entries().next().value;
    try { URL.revokeObjectURL(o.url); } catch (e) {}
    RECORDINGS.delete(k);
  }
}
function pickMime() {
  try {
    for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
  } catch (e) {}
  return "";
}
function RecordAloud({ id, hint }) {
  const [rec, setRec] = useState(() => RECORDINGS.get(id) || null);
  const [state, setState] = useState("idle"); // idle | asking | recording | blocked | none
  const [secs, setSecs] = useState(0);
  const mr = useRef(null), t0 = useRef(0), timer = useRef(null), idRef = useRef(id);
  idRef.current = id;
  function stop() { try { if (mr.current && mr.current.state !== "inactive") mr.current.stop(); } catch (e) {} }
  useEffect(() => { stop(); setRec(RECORDINGS.get(id) || null); setState(s => (s === "blocked" || s === "none" ? s : "idle")); }, [id]);
  useEffect(() => () => { stop(); clearInterval(timer.current); }, []);
  const supported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  async function start() {
    if (!supported) { setState("none"); return; }
    setState("asking");
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { setState("blocked"); return; }
    const mime = pickMime(), chunks = [], myId = id;
    let r;
    try { r = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); }
    catch (e) { stream.getTracks().forEach(t => t.stop()); setState("none"); return; }
    r.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    r.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      clearInterval(timer.current);
      if (!chunks.length) { setState("idle"); return; }
      const blob = new Blob(chunks, { type: r.mimeType || mime || "audio/webm" });
      const v = { url: URL.createObjectURL(blob), secs: Math.max(1, Math.round((Date.now() - t0.current) / 1000)) };
      keepRecording(myId, v);
      setRec(RECORDINGS.get(idRef.current) || null);
      setState("idle");
    };
    mr.current = r; t0.current = Date.now(); setSecs(0);
    clearInterval(timer.current);
    timer.current = setInterval(() => setSecs(Math.round((Date.now() - t0.current) / 1000)), 500);
    r.start();
    setState("recording");
  }
  const msg = state === "recording" ? "Recording. Read the Latin aloud, then construe it aloud."
    : state === "asking" ? "Allow the microphone when your browser asks."
    : state === "blocked" ? (OFFLINE ? "The microphone was blocked. Allow it in your browser’s settings for this file, then try again." : "This page isn’t allowed to use the microphone here. The offline copy can record (Skill map & backup).")
    : state === "none" ? "This browser can’t record audio."
    : rec ? `Your recording (${mmss(rec.secs)}). Play it back after you check: listen for hesitations and wrong constructions.`
    : (hint || "Read the Latin aloud, then construe it aloud, as in the oral exam. Play it back after you check.");
  return (
    <div className="flex flex-col gap-2 rounded-md border border-rule bg-paper px-3 py-2.5" aria-label="Record yourself">
      <div className="flex flex-wrap items-center gap-2">
        {state === "recording"
          ? <Btn variant="warn" onClick={stop}>■ Stop <span className="num">{mmss(secs)}</span></Btn>
          : <Btn onClick={start} disabled={state === "asking" || state === "none"}>{rec ? "● Record again" : "● Record yourself"}</Btn>}
        {rec && state !== "recording" && <audio controls preload="metadata" src={rec.url} className="h-9 min-w-0 max-w-full flex-1 basis-56" />}
      </div>
      <p className="text-[13px] leading-snug text-soft" aria-live="polite">{msg}</p>
    </div>
  );
}

/* ---------- Find the skeleton: verbs, clause openers, nominatives, checked against the parsing ---------- */
const SK_STEPS = [
  { cls: "st-v", name: "Finite verbs", ask: "Tap every finite verb (indicative, subjunctive, imperative). Each one is the core of a clause. For a compound tense, tap both words (occisa est).", concept: "order" },
  { cls: "st-sub", name: "Clause openers", ask: "Now tap every word that opens a subordinate clause: subordinating conjunctions, and relative or interrogative words. Et, nam, enim and the like join main clauses and aren’t counted.", concept: "rel" },
  { cls: "st-nom", name: "Nominatives", ask: "Last, tap the nominatives: the subjects and everything agreeing with them, participles and numerals included.", concept: "order" }
];
/* Does one parsing fit the step? true / false / null (morphology unknown). */
function skFits(lex, id, step) {
  const [, pos, m] = lex.ana[id];
  if (step === 1) return classOf(lex, id) === "st-sub";
  if (!m || m === "??") return null;
  if (step === 0) return pos === "V-" && "ims".includes(m[3]);
  return m[6] === "n";
}
const SK_JOINERS = new Set(["et", "atque", "ac", "que", "sed", "autem", "enim", "nam", "namque", "ergo", "igitur", "itaque", "tamen", "vero", "uero", "aut", "vel", "uel", "nec", "neque", "etiam", "quoque", "at", "ideo", "propterea", "unde"]);
/* 1: certainly this kind of word, 0: certainly not, null: ambiguous or unknown (not counted). */
function wordTruth(lex, entry, step) {
  const r = readings(entry);
  if (r.kind === "none" || !r.ids.length) return null;
  const fs = (r.kind === "context" ? r.ids.slice(0, 1) : r.ids).map(id => skFits(lex, id, step));
  let t;
  if (r.kind === "compound") t = fs.includes(true) ? 1 : fs.includes(null) ? null : 0;
  else t = fs.every(f => f === true) ? 1 : fs.some(f => f !== false) ? null : 0;
  if (t === 0 && step === 1 && r.ids.some(id => SK_JOINERS.has(lex.lemmas[lex.ana[id][0]][0]) || lex.ana[id][1] === "C-")) return null;
  return t;
}
/* Compound tenses: a perfect or future participle or gerundive next to a form of sum is part of the verb. */
function periphrastic(lex, words) {
  const one = e => { const r = readings(e); return r.kind === "context" || (r.kind === "lookup" && r.ids.length === 1) ? lex.ana[r.ids[0]] : null; };
  const isSum = a => a && lex.lemmas[a[0]][0] === "sum" && a[2] && "ims".includes(a[2][3]);
  const isPtc = a => a && a[1] === "V-" && a[2] && ((a[2][3] === "p" && "rf".includes(a[2][2])) || a[2][3] === "g");
  const out = new Set();
  words.forEach((w, i) => {
    if (!isPtc(one(w.e))) return;
    for (const j of [i - 2, i - 1, i + 1, i + 2]) if (words[j] && words[j].v === w.v && isSum(one(words[j].e))) { out.add(w.key); break; }
  });
  return out;
}
function SkeletonCheck({ lex, verses, seed, hymn, onAnswer }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [taps, setTaps] = useState({});
  const [checked, setChecked] = useState(false);
  const [scores, setScores] = useState([]);
  function reset(o) { setOpen(o); setStep(0); setTaps({}); setChecked(false); setScores([]); }
  useEffect(() => { reset(false); }, [seed]);
  const truth = useMemo(() => {
    if (!lex || !verses) return null;
    const words = [];
    verses.forEach((v, vi) => (v[1].match(WORD_RE) || []).forEach((w, k) => words.push({ key: vi + ":" + k, v: vi, e: v[3] && v[3][k] })));
    const peri = periphrastic(lex, words);
    return SK_STEPS.map((S, step) => {
      const t = {};
      words.forEach(w => { t[w.key] = wordTruth(lex, w.e, step); });
      peri.forEach(k => { t[k] = step === 0 ? 1 : step === 2 ? null : t[k]; });
      return t;
    });
  }, [lex, verses]);
  if (!truth) return null;
  const count = i => Object.values(truth[i]).filter(x => x === 1).length;
  const firstFrom = i => { while (i < SK_STEPS.length && count(i) === 0) i++; return i; };
  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Btn onClick={() => { reset(true); setStep(firstFrom(0)); }}>Find the skeleton first</Btn>
        <span className="text-[13px] text-soft">Mark the verbs, clause openers and nominatives, and have them checked, before you translate.</span>
      </div>
    );
  }
  const done = step >= SK_STEPS.length;
  const S = SK_STEPS[step];
  const T = done ? null : truth[step];
  function tap(key) {
    if (checked || done) return;
    setTaps(t => { const n = { ...t }; if (n[key]) delete n[key]; else n[key] = true; return n; });
  }
  function check() {
    const keys = Object.keys(T);
    const hit = keys.filter(k => T[k] === 1 && taps[k]).length;
    const wrong = keys.filter(k => T[k] === 0 && taps[k]).length;
    const total = count(step);
    setScores(s => { const n = s.slice(); n[step] = { hit, wrong, total }; return n; });
    setChecked(true);
    onAnswer && onAnswer(S.concept, hit === total && wrong === 0);
  }
  function next() { setStep(firstFrom(step + 1)); setTaps({}); setChecked(false); }
  // Words found in earlier steps keep their structure colour, so the skeleton builds up.
  const earlier = key => { for (let i = Math.min(step, SK_STEPS.length) - 1; i >= 0; i--) if (truth[i][key] === 1 && scores[i]) return SK_STEPS[i].cls; return ""; };
  function word(w, key) {
    let cls = "sk";
    if (!done) {
      const t = T[key], on = !!taps[key];
      if (!checked) { if (on) cls += " sk-on"; }
      else if (t === 1) cls += on ? " sk-ok" : " sk-miss";
      else if (t === 0 && on) cls += " sk-bad";
    }
    const e = earlier(key);
    if (e) cls += " " + e;
    if (done) return <span key={key} className={e}>{w}</span>;
    return (
      <span key={key} role="button" tabIndex={0} aria-pressed={!!taps[key]} className={cls} onClick={() => tap(key)}
        onKeyDown={ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); tap(key); } }}>{w}</span>
    );
  }
  const sc = !done && checked ? scores[step] : null;
  return (
    <section className="reveal rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Find the skeleton">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="smallcaps text-[15px] font-semibold text-rubric">Find the skeleton{done ? "" : ` · ${step + 1} of 3: ${S.name}`}</h3>
        <button type="button" className="text-[13px] text-soft underline" onClick={() => reset(false)}>Close</button>
      </div>
      {!done && <p className="mb-2 text-[14px] text-ink">{S.ask}</p>}
      <p lang="la" className={`lt latin text-[1.15rem] leading-[1.95] text-ink${hymn ? " whitespace-pre-line" : ""}`}>
        {verses.map((v, vi) => {
          let k = -1;
          const text = hymn ? v[1].replace(/ \/ /g, "\n") : v[1];
          return (
            <span key={vi}>
              {text.split(/([A-Za-z]+)/).map((p, i) => (i % 2 === 0 ? p : word(p, vi + ":" + (++k))))}
              {hymn ? "\n\n" : " "}
            </span>
          );
        })}
      </p>
      {!done && !checked && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Btn variant="primary" onClick={check}>Check</Btn>
          <span className="text-[13px] text-soft">{Object.keys(taps).length} tapped</span>
        </div>
      )}
      {sc && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[14px] text-ink">
            <strong className={sc.hit === sc.total && !sc.wrong ? "text-ok" : "text-warn"}>{sc.hit} of {sc.total} found</strong>
            {sc.wrong ? `, ${sc.wrong} tapped that ${sc.wrong === 1 ? "isn’t" : "aren’t"} one` : ""}.
            {" "}<span className="sk-ok">green</span> found · <span className="sk-miss">outlined</span> missed · <span className="sk-bad">struck</span> wrong.
          </p>
          <div><Btn variant="primary" onClick={next}>{firstFrom(step + 1) < SK_STEPS.length ? "Next step →" : "See the skeleton →"}</Btn></div>
        </div>
      )}
      {done && (
        <div className="mt-3 flex flex-col gap-2 text-[14px] text-ink">
          <p>
            {SK_STEPS.map((s, i) => scores[i] ? `${s.name}: ${scores[i].hit}/${scores[i].total}${scores[i].wrong ? ` (${scores[i].wrong} wrong)` : ""}` : null).filter(Boolean).join(" · ") || "Nothing to mark here."}
          </p>
          <p className="text-[13px] text-soft">Now translate clause by clause: each verb with its subject, then attach the rest. Forms whose parsing is ambiguous aren’t counted either way.</p>
          <div><Btn onClick={() => { reset(true); setStep(firstFrom(0)); }}>Try again</Btn></div>
        </div>
      )}
    </section>
  );
}

/* ---------- Blind reading: hide references in the texts students already know in English ---------- */
const FAMILIAR_BOOKS = new Set(["mt", "mk", "lk", "jn"]);
const FAMILIAR_PS = new Set([1, 2, 8, 18, 22, 23, 24, 26, 41, 42, 45, 46, 50, 62, 66, 83, 84, 90, 94, 99, 102, 109, 110, 111, 112, 113, 115, 116, 117, 121, 122, 126, 127, 129, 130, 133, 138, 147, 148, 149, 150]);
function familiar(code, c) { return FAMILIAR_BOOKS.has(code) || (code === "ps" && FAMILIAR_PS.has(+c)); }
const BLIND_PARTS = new Set(["nt", "ps"]);

/* ---------- Parse reports: flag a wrong parsing so the data can be fixed ---------- */
const REPORT_KEY = "lectio-vulgata-reports";
function ReportParse({ word, where, items }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setOpen(false); setNote(""); setDone(""); }, [word, where]);
  async function send() {
    setBusy(true);
    const r = {
      word: String(word).slice(0, 40), where: String(where || "").slice(0, 80), at: Date.now(),
      shown: items.map(d => `${d.lemma}: ${[d.posL, d.parse].filter(Boolean).join(", ")}`).join(" | ").slice(0, 300) || "no parsing",
      note: note.trim().slice(0, 300)
    };
    let sent = false;
    try {
      const db = !OFFLINE && window.claude && window.claude.use ? await window.claude.use("db") : null;
      if (db) { await db.collection("reports").add(r); sent = true; }
    } catch (e) { /* outside viewers can't write shared data: keep it on this device */ }
    if (!sent) writeLocal(REPORT_KEY, [...(readLocal(REPORT_KEY) || []), r].slice(-200));
    setBusy(false); setOpen(false);
    setDone(sent ? "Thanks: reported." : "Saved on this device. Send your reports on from Skill map & backup.");
  }
  if (done) return <p className="mt-2 text-[13px] text-ok" aria-live="polite">{done}</p>;
  if (!open) return <button type="button" className="mt-2 text-[13px] text-soft underline decoration-rule underline-offset-2 hover:text-rubric" onClick={() => setOpen(true)}>This parsing looks wrong</button>;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label htmlFor="report-note" className="sr-only">What should it be?</label>
      <input id="report-note" value={note} onChange={e => setNote(e.target.value)} maxLength={300} placeholder="What should it be? (optional)"
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
        className="min-w-0 flex-1 basis-48 rounded-md border border-rule bg-leaf px-2 py-1 text-[14px] text-ink" />
      <Btn onClick={send} disabled={busy}>{busy ? "Sending…" : "Report"}</Btn>
      <button type="button" className="text-[13px] text-soft underline" onClick={() => setOpen(false)}>Cancel</button>
    </div>
  );
}
function ReportsPanel() {
  const [list, setList] = useState(() => readLocal(REPORT_KEY) || []);
  const [msg, setMsg] = useState("");
  const outRef = useRef(null);
  if (!list.length) return null;
  const text = "Lectio Vulgata parse reports\n" + list.map(r => `${r.where} · ${r.word} · shown: ${r.shown}${r.note ? ` · should be: ${r.note}` : ""}`).join("\n");
  function copy() {
    const ok = () => setMsg("Copied. Email or message it to whoever shared this page with you.");
    const fallback = () => { if (outRef.current) { outRef.current.focus(); outRef.current.select(); } setMsg("Copy the selected text with Ctrl/⌘ + C."); };
    try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] text-soft">{list.length} parse report{list.length === 1 ? "" : "s"} saved on this device. Copy them and send them to whoever shared this page, so the parsing can be fixed for everyone.</p>
      <textarea ref={outRef} readOnly rows={3} value={text} aria-label="Your parse reports" className="w-full rounded-md border border-rule bg-paper px-2 py-1.5 font-mono text-[12px] text-soft" />
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={copy}>Copy reports</Btn>
        <button type="button" className="text-[13px] text-soft underline" onClick={() => { writeLocal(REPORT_KEY, []); setList([]); }}>Clear (once sent)</button>
        {msg && <span className="text-[13px] text-ink" aria-live="polite">{msg}</span>}
      </div>
    </div>
  );
}

/* ---------- Offline copy download ---------- */
function OfflinePanel() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);
  if (APP) {
    return (
      <p className="text-[14px] text-soft">
        This is the app version{window.__LV_BUILT ? `, made ${window.__LV_BUILT}` : ""}. Once it has opened, it works with no signal. Progress is kept on this device, separate from the online page: use a backup code to move it either way. New versions arrive by themselves the next time you open it online. AI marking works here with a free Gemini key (AI marking, above).
      </p>
    );
  }
  if (OFFLINE) {
    return (
      <p className="text-[14px] text-soft">
        This is the offline copy{window.__LV_BUILT ? `, made ${window.__LV_BUILT}` : ""}. It needs no internet. Progress is kept in this browser, separate from the online page: use a backup code to move it either way. For updates, download a fresh copy from the online page. AI marking works here online, with a free Gemini key (AI marking, above).
      </p>
    );
  }
  async function get() {
    setBusy(true); setMsg("Preparing the file…");
    try {
      const res = await fetch("lectio-offline.html");
      if (!res.ok) throw { code: "fetch" };
      const blob = await res.blob();
      const dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null;
      if (!dl) { setFallback(true); setMsg(""); return; }
      await dl.save({ filename: "lectio-vulgata-offline.html", data: blob });
      setMsg("Saved. Open the file in your browser; it works with no internet.");
    } catch (e) {
      const code = e && e.code;
      if (code === "declined") setMsg("Download cancelled.");
      else if (code === "rate_limited") setMsg("A download prompt is already open.");
      else if (code === "fetch") setMsg("The offline file didn’t load. Check your connection and try again.");
      else { setFallback(true); setMsg(""); }
    } finally { setBusy(false); }
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] text-soft">
        Download an offline copy: the whole page and all five texts in one file (about 6 MB). Open it in Chrome, Edge, Firefox or Safari on a laptop or desktop; it needs no internet, and it can record you reading aloud.
        For a phone, use the app instead: open <a href="https://klip73.github.io/lectio/" target="_blank" rel="noopener" className="text-rubric underline">klip73.github.io/lectio</a> and choose Add to Home Screen; it works offline too. Progress in the copy is separate: copy a backup code above and restore it there.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={get} disabled={busy}>{busy ? "Preparing…" : "Download offline copy"}</Btn>
        {fallback && <a href="lectio-offline.html" download="lectio-vulgata-offline.html" target="_blank" rel="noopener" className="text-[14px] text-rubric underline">Open the offline file, then save it with Ctrl/⌘ + S</a>}
        {msg && <span className="text-[13px] text-ink" aria-live="polite">{msg}</span>}
      </div>
    </div>
  );
}
