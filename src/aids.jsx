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
/* The structure class of one parsing: "st-v", "st-nf", "st-sub", "st-nom", "" (none of these) or null (morphology unknown). */
function classOf(lex, id) {
  const [li, pos, m] = lex.ana[id];
  const lemma = lex.lemmas[li][0];
  if (pos === "Pr" || (SUBORD.has(lemma) && (pos === "G-" || pos === "Dq" || pos === "Du" || pos === "Df" || pos === "C-"))) return "st-sub";
  if (!m || m === "??") return null;
  if (pos === "V-") return "imsn".includes(m[3]) && m[3] !== "n" ? "st-v" : "st-nf";
  if (m[6] === "n" && /^(Nb|Ne|Pp|Pd|Px|A-)/.test(pos)) return "st-nom";
  return "";
}
function structClass(lex, entry) {
  if (!lex) return "";
  const r = readings(entry);
  if (r.kind === "none") return "";
  const classes = new Set((r.kind === "lookup" ? r.ids : r.ids.slice(0, 1)).map(id => classOf(lex, id) || ""));
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
/* Questions at the level of a student who has finished three years of Latin:
   full parsing with confusable choices, the harder forms first, oblique cases only, irregular principal parts. */
const PNL = { "1s": "1st person singular", "2s": "2nd person singular", "3s": "3rd person singular", "1p": "1st person plural", "2p": "2nd person plural", "3p": "3rd person plural" };
function verbLabel(te, mo, vo, pn, lemma) {
  const voice = vo === "p" ? (/or$/.test(lemma) ? "deponent" : "passive") : "active";
  return `${T_L[te]} ${M_L[mo]} ${voice}, ${PNL[pn] || ""}`.replace(/, $/, "");
}
const SUBJ_TENSES = "pirl";
function verbDistractors(c, r) {
  const [pe, nu, te, mo, vo] = c.m;
  const pn = pe + nu, out = new Set();
  const add = (t, m, p) => { if (T_L[t] && M_L[m] && PNL[p] && !(m === "s" && !SUBJ_TENSES.includes(t)) && !(m === "m")) out.add(verbLabel(t, m, vo, p, c.lemma)); };
  // Person and number are read straight off the ending, so they make no test: change tense, mood and voice instead.
  // a neighbouring tense, same person
  ({ p: ["f", "i"], i: ["l", "p"], f: ["p", "t"], r: ["l", "t"], l: ["r", "i"], t: ["r", "f"] }[te] || []).forEach(t => add(t, mo, pn));
  // indicative and subjunctive swapped; active and passive swapped (not for deponents)
  add(te, mo === "s" ? "i" : "s", pn);
  if (!/or$/.test(c.lemma)) { const vo2 = vo === "p" ? "a" : "p"; if (T_L[te] && M_L[mo]) out.add(verbLabel(te, mo, vo2, pn, c.lemma)); }
  ({ p: "r", i: "l", r: "p", l: "i", f: "t", t: "f" }[te] || "").split("").forEach(t => add(t, mo === "s" ? "i" : "s", pn));
  return shuffle([...out], r);
}
/* Traps an examiner would set: other forms of the same word spelled the same (venit: present or perfect? dominis: dative or
   ablative?), then forms a letter or two away (dicit / dicet / dicat). Returns [{key, label, same}] from the generated tables. */
function editDist(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const trapCache = new Map();
function formTraps(c, ansKey, labelOf) {
  if (typeof MORPH === "undefined") return [];
  const ck = c.lemma + "|" + c.w + "|" + ansKey;
  if (trapCache.has(ck)) return trapCache.get(ck);
  let t = null;
  try { t = MORPH.entryFor(c.lemma, c.pp, c.w); } catch (e) {}
  const W = MORPH.norm(c.w), out = [], seen = new Set();
  if (t) {
    const cells = MORPH.cells(t).map(([k, forms]) => {
      const fs = (forms || []).map(f => MORPH.norm(f).split(" ")[0]).filter(Boolean);
      return { k, d: fs.length ? Math.min(...fs.map(f => (f === W ? 0 : editDist(f, W)))) : 9 };
    }).filter(x => x.k !== ansKey && x.d <= 2).sort((a, b) => a.d - b.d);
    cells.forEach(x => {
      const label = labelOf(x.k);
      if (!label || seen.has(label)) return;
      seen.add(label); out.push({ key: x.k, label, same: x.d === 0 });
    });
  }
  trapCache.set(ck, out);
  return out;
}
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
      if (!m || m === "??" || pos === "Ne" || w.length < 3) return;
      const [lemma, gloss, pp] = lex.lemmas[li];
      if (pos === "V-" && "is".includes(m[3]) && T_L[m[2]] && PNL[m[0] + m[1]]) {
        const wt = m[3] === "s" ? 5 : m[4] === "p" ? 4 : "ltf".includes(m[2]) ? 4 : m[2] === "r" ? 2.5 : 1;
        cands.push({ w, kind: "verb", lemma, gloss, pp, pos, m, li, wt });
      } else if (pos === "V-" && "pdg".includes(m[3])) {
        const wt = m[3] === "g" ? 5 : m[2] === "f" ? 5 : m[3] === "d" ? 4 : m[2] === "r" ? 3 : 2.5;
        cands.push({ w, kind: "nonfinite", lemma, gloss, pp, pos, m, li, wt });
      } else if (/^(Nb|A-)/.test(pos) && "bgd".includes(m[6])) {
        cands.push({ w, kind: "case", lemma, gloss, pp, pos, m, li, wt: m[6] === "b" ? 2.5 : 2 });
      }
    });
  });
  const EASY = new Set(["sum", "possum"]);
  const V = vocabOf(lex);
  const rankOf = l => (V.freq[l] ? V.freq[l].rank : 9999);
  const vKey = m => m[2] + m[3] + m[4] + m[0] + m[1];
  const vLab = (lemma, vo0) => k => (/^[pifrlt][is][ap][123][sp]$/.test(k) && T_L[k[0]] && M_L[k[1]] && PNL[k.slice(3)] && k[2] === vo0 ? verbLabel(k[0], k[1], k[2], k.slice(3), lemma) : null);
  const cLab = k => (/^[ngdabv][sp]$/.test(k) ? `${C_L[k[0]]} ${N_L[k[1]]}` : /^[mfn][ngdabv][sp]$/.test(k) ? `${C_L[k[1]]} ${N_L[k[2]]}` : null);
  /* A word is worth asking about if it is not one of the commonest, or if its spelling is shared by another form (decide from context). */
  const pool = cands.filter(c => !EASY.has(c.lemma)).map(c => {
    const traps = c.kind === "verb" ? formTraps(c, vKey(c.m), vLab(c.lemma, c.m[4])) : c.kind === "case" ? formTraps(c, (c.pos === "A-" ? c.m[5] : "") + c.m[6] + c.m[1], cLab) : [];
    const same = traps.filter(x => x.same && x.label !== (c.kind === "case" ? `${C_L[c.m[6]]} ${N_L[c.m[1]]}` : null));
    const rk = rankOf(c.lemma);
    return { ...c, traps, same: same.length, wt: c.wt + (same.length ? 4 : 0) - (rk <= 150 ? 3 : rk <= 400 ? 1.5 : 0) };
  }).filter(c => c.same || rankOf(c.lemma) > 150 || c.kind === "nonfinite" ||
    /* a common verb is still worth a question in a harder form: subjunctive, passive, or a tense other than present / perfect */
    c.kind === "verb" && (c.m[3] === "s" || c.m[4] === "p" || "iflt".includes(c.m[2])));
  const seen = new Set(), kinds = {}, qs = [];
  const sig = c => c.kind === "verb" ? "v" + c.m[3] : c.kind;   // e.g. "vs" = a subjunctive
  shuffle(pool, r).sort((a, b) => b.wt - a.wt + (r() - 0.5) * 1.5).forEach(c => {
    if (qs.length >= max || seen.has(c.lemma) || (kinds[sig(c)] || 0) >= 1 && pool.some(o => !seen.has(o.lemma) && sig(o) !== sig(c) && !(kinds[sig(o)] >= 1))) return;
    seen.add(c.lemma); kinds[sig(c)] = (kinds[sig(c)] || 0) + 1;
    const full = (c.pp ? c.pp + ": " : "") + parseLabel(c.pos, c.m, c.lemma);
    if (c.kind === "verb") {
      const ans = verbLabel(c.m[2], c.m[3], c.m[4], c.m[0] + c.m[1], c.lemma);
      /* near forms that only change person or number are no trap; identical spellings always are */
      const pnOf = l => l.split(", ")[1];
      const traps = c.traps.filter(x => x.same || pnOf(x.label) === pnOf(ans)).map(x => x.label).filter(o => o !== ans);
      const opts = [...new Set([ans, ...traps, ...verbDistractors(c, r).filter(o => o !== ans)])].slice(0, 4);
      const concept = c.m[3] === "s" ? "subj" : c.m[4] === "p" ? (/or$/.test(c.lemma) ? "dep" : "pass") : c.m[2] === "f" ? "fut" : "rlt".includes(c.m[2]) ? "perf" : null;
      const twin = c.traps.filter(x => x.same).map(x => x.label);
      if (opts.length >= 3) qs.push({ q: twin.length ? `Parse “${c.w}” as it stands here (the same spelling is also another form).` : `Parse “${c.w}”.`, ans, opts: shuffle(opts, r),
        why: full + (twin.length ? `. The same spelling could also be: ${twin.join("; ")}. The sentence decides.` : ""), c, concept });
    } else if (c.kind === "nonfinite") {
      const g = { m: "masculine", f: "feminine", n: "neuter" }[c.m[5]] || "";
      const kind = { p: { p: "present participle", r: "perfect participle", f: "future participle" }[c.m[2]] || "participle", d: "gerund", g: "gerundive" }[c.m[3]];
      const ans = c.m[3] === "d" ? `${kind}, ${C_L[c.m[6]] || ""}`.replace(/, $/, "") : `${kind}, ${C_L[c.m[6]] || ""} ${N_L[c.m[1]] || ""} ${g}`.replace(/\s+/g, " ").trim();
      const kinds = ["present participle", "perfect participle", "future participle", "gerundive"].filter(k => k !== kind);
      const opts = new Set([ans]);
      shuffle(kinds, r).forEach(k => opts.size < 3 && opts.add(ans.replace(kind, k)));
      const otherCase = shuffle(["nominative", "accusative", "genitive", "dative", "ablative"].filter(x => x !== C_L[c.m[6]]), r)[0];
      if (C_L[c.m[6]]) opts.add(ans.replace(C_L[c.m[6]], otherCase));
      qs.push({ q: `Identify “${c.w}” exactly.`, ans, opts: shuffle([...opts].slice(0, 4), r), why: full, c, concept: "part" });
    } else {
      const ans = `${C_L[c.m[6]]} ${N_L[c.m[1]] || ""}`.trim();
      const opts = new Set([ans]);
      c.traps.forEach(x => { if (opts.size < 4) opts.add(x.label); });
      const other = { s: "plural", p: "singular" }[c.m[1]];
      if (other && opts.size < 4) opts.add(`${C_L[c.m[6]]} ${other}`);
      shuffle(["genitive", "dative", "ablative", "accusative"].filter(x => x !== C_L[c.m[6]]).flatMap(cs => ["singular", "plural"].map(nn => `${cs} ${nn}`)), r).forEach(o => { if (opts.size < 4) opts.add(o); });
      const twin = c.traps.filter(x => x.same && x.label !== ans).map(x => x.label);
      qs.push({ q: twin.length ? `Case and number of “${c.w}” here? (Its spelling fits more than one.)` : `Case and number of “${c.w}”?`, ans, opts: shuffle([...opts], r),
        why: full + (twin.length ? `. Out of context it could also be ${twin.join(" or ")}.` : ""), c, concept: { ablative: "abl", genitive: "gen", dative: "dat" }[C_L[c.m[6]]] || null });
    }
  });
  // An irregular perfect: what an examiner asks once the translation is done.
  // Only real verbs with an irregular perfect; spell the verb as its dictionary entry does (video, not uideo).
  const pv = pool.find(c => c.pos === "V-" && c.pp && /^\w+o, \w+(are|ere|ire), \w+i\b/.test(c.pp) && !/(avi|ivi|ii)$/.test(c.pp.split(", ")[2]) && !EASY.has(c.lemma) && rankOf(c.lemma) > 250);
  if (pv && qs.length <= max) {
    const parts = pv.pp.split(", "), perf = parts[2].replace(/ \(.*\)$/, ""), head = parts[0];
    const stem = parts[1].replace(/(are|ere|ire)$/, "");
    /* Decoys from the real patterns of the third conjugation: -si / -xi, reduplication, lengthened stem, -ui, -ivi. */
    const st = stem.replace(/i$/, "");
    const base = st.replace(/(c|g|qu|h)$/, "");
    const cands2 = [/[dtrmnpbl]$/.test(st) && st + "si", /(c|g|h|qu)$/.test(st) && base + "xi", /^[bcdfgmnpst][aeiou]/.test(st) && st.slice(0, 2) + st + "i",
      st + "ui", st + "ivi", st + "i", /(c|g|h|d|t)$/.test(st) && base + "si", st + "avi", st.replace(/([aeiou])([^aeiou]*)$/, (m0, v, cc) => ({ a: "e", e: "i", i: "e", o: "u", u: "o" }[v] + cc)) + "i"].filter(Boolean);
    const decoys = shuffle([...new Set(cands2)].filter(x => x !== perf && x.length > 3), r).sort((a, b) => editDist(a, perf) - editDist(b, perf)).slice(0, 3);
    qs.push({ q: `Give the perfect of “${head}”.`, ans: perf, opts: shuffle([perf, ...decoys], r), why: pv.pp + (pv.gloss ? ` (${pv.gloss})` : ""), c: { ...pv, w: head }, concept: "perf" });
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
function TodayCard({ day, dueCount, focusName, onStep, examLeft, placeFirst, office, officeRead, onOffice }) {
  const steps = [
    { id: "reviews", label: dueCount ? `Clear your reviews (${dueCount} due)` : "Reviews: nothing due", done: dueCount === 0, n: day.reviews },
    { id: "vocab", label: "Learn 10 words", done: day.vocab >= 10, n: `${Math.min(day.vocab, 10)}/10` },
    { id: "passage", label: placeFirst ? `Place yourself in ${focusName}, then translate` : `Translate 2 passages${focusName ? ` in ${focusName}` : ""}`, done: day.passages >= 2, n: `${Math.min(day.passages, 2)}/2` },
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
              <span className={`num inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[12px] font-bold ${s.done ? "bg-ok text-paper" : "bg-rule text-ink"}`}>{s.done ? "✓" : i + 1}</span>
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
      {office && (
        <button type="button" onClick={onOffice} className="mt-3 flex w-full flex-wrap items-baseline gap-x-2 border-t border-rule pt-3 text-left text-[14px]">
          <span className="smallcaps font-semibold text-rubric">Today’s Office</span>
          <span lang="la" className="latin min-w-0 flex-1 truncate text-ink">{office.t}</span>
          <span className={officeRead ? "text-ok" : "text-rubric underline underline-offset-2"}>{officeRead ? "✓ read" : "Read Matins →"}</span>
        </button>
      )}
    </section>
  );
}
function WelcomeCard({ onClose, onPlace, focus, onFocus }) {
  const other = focus && !["exam", "class"].includes(focus);
  return (
    <section className="reveal rounded-lg border border-rubric bg-rubrictint px-5 py-4" aria-label="Welcome">
      <h2 className="latin text-[1.1rem] font-bold text-ink">Welcome to Lectio Vulgata</h2>
      {onFocus && <div className="mt-2 flex flex-col gap-1.5">
        <p className="text-[14px] text-ink">What brings you here? <span className="text-soft">(You can change it any time under <b>Aa</b> at the top.)</span></p>
        <FocusPicker focus={focus} onPick={onFocus} />
      </div>}
      {other ? (
        <p className="mt-3 text-[15px] leading-snug text-ink">{focus === "learn" ? <>Start with the <strong>Guide</strong> (grammar in plain steps) and <strong>Forms</strong> (tables for any word), and learn the commonest words in <strong>Study → Vocabulary</strong>: the cards come back as Anki’s do, sooner when you miss them.</> : focus === "pray" ? <>Open <strong>Liturgy</strong> for today’s Office and Mass in Latin and English (any hour, the hymns, votive Masses, your own calendar). Tap any word for its meaning; the <strong>Meter</strong> tab in Study scans the hymns.</> : <>The <strong>Library</strong> has the whole Summa, the Fathers, the Catena Aurea and the Latin Library, with every word tappable; the <strong>Dictionary</strong> button (top) looks up any form in Lewis &amp; Short, Wiktionary and Du Cange.</>}</p>
      ) : <>
      <p className="mt-3 text-[14px] text-soft">For the FSSP Latin exam (after Latin 1–3), and for reading the Office for life. Four things to know:</p>
      <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-snug text-ink">
        <li><strong>Find my level</strong> first: a short check in each of the five exam parts, so everything starts at your level.</li>
        <li>Each day, <strong>Start today’s session</strong>: it mixes reviews, vocabulary, your weakest exam part and a short oral mock.</li>
        <li>For your weekly vocab quiz, <strong>Class quiz</strong>: add the chapters or Summa articles you’re reading (or paste your book’s list), then write out the dictionary entries.</li>
        <li>For marking of your translations, add a free AI key in <strong>the “AI” button at the top of the page</strong> (a minute; no card){!(window.claude && window.claude.use) && <>, or <a href={ARTIFACT_URL} target="_blank" rel="noopener noreferrer" className="text-rubric underline underline-offset-2">use the app inside Claude</a>, where Claude marks them</>}.</li>
      </ol>
      <details className="mt-2 text-[14px] text-ink">
        <summary className="cursor-pointer text-rubric">More: tapping words, Liturgy, Library, Guide, backups</summary>
        <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 leading-snug">
          <li>Tap any Latin word for its parsing. <strong>Accents</strong> shows the Breviary’s stress marks; <strong>Structure</strong> shows verbs and clauses; <strong>Find the skeleton</strong> before translating.</li>
          <li><strong>Liturgy</strong> has each day’s Office and Mass in Latin and English; <strong>Library</strong> the complete Summa and the classics of the Church, with word help.</li>
          <li><strong>Guide</strong> has the grammar examiners ask about and Church pronunciation; <strong>Forms</strong> has full tables for any word.</li>
          <li>Progress is saved on this device: save a progress file now and then (the app reminds you).</li>
        </ul>
      </details>
      </>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {onPlace && !other && <Btn variant="primary" onClick={onPlace}>Find my level</Btn>}
        <Btn variant={onPlace && !other ? "plain" : "primary"} onClick={onClose}>{onPlace && !other ? "Skip for now" : "Got it"}</Btn>
      </div>
    </section>
  );
}
