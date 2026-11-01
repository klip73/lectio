/* ---------- Placement check: a few objective questions per exam part, chosen adaptively ----------
   Each passage gives two answers: comprehension (pick the translation, or a word's meaning in context) and an examiner's
   parsing question. A Bayesian estimate over the same difficulty scale the passages use (0 = easiest, 1 = hardest)
   picks the next passage near the current estimate, so a few minutes place a student fairly well. */
const PL_GRID = Array.from({ length: 33 }, (_, i) => -0.3 + i * 0.05);
const PL_PASSAGES = { one: 5, all: 3 };
function plPrior() { const p = PL_GRID.map(t => Math.exp(-((t - 0.55) ** 2) / (2 * 0.35 ** 2))); const s = p.reduce((a, b) => a + b, 0); return p.map(x => x / s); }
function plUpdate(post, d, ok, guess) {
  const p = post.map((w, i) => { const pc = guess + (1 - guess) * pSuccess(PL_GRID[i], d); return w * (ok ? pc : 1 - pc); });
  const s = p.reduce((a, b) => a + b, 0) || 1;
  return p.map(x => x / s);
}
const plMean = post => post.reduce((a, w, i) => a + w * PL_GRID[i], 0);
const plSD = post => { const m = plMean(post); return Math.sqrt(post.reduce((a, w, i) => a + w * (PL_GRID[i] - m) ** 2, 0)); };
const PL_SENT = /[^.?!]+[.?!]+["”’)]*/g;
const firstSent = (s, max = 60) => { const m = (s || "").match(PL_SENT); let out = m ? m[0] : s || ""; if (WC(out) < 6 && m && m[1]) out += m[1]; return out.trim(); };

/* A word to ask about: a content word, not among the commonest, with a meaning in the dictionary. */
function plVocab(lex, la, ids, seed) {
  const V = vocabOf(lex), r = rng(seed);
  const words = la.match(WORD_RE) || [];
  const cands = [];
  words.forEach((w, k) => {
    const rd = readings(ids[k]);
    if (!(rd.kind === "context" || (rd.kind === "lookup" && rd.ids.length === 1))) return;
    const [li, pos] = lex.ana[rd.ids[0]];
    const [lemma, gloss] = lex.lemmas[li];
    const f = V.freq[lemma];
    if (!gloss || !/^(Nb|A-|V-)$/.test(pos) || (f && f.rank <= 250) || BASIC.has(lemma)) return;
    cands.push({ w, lemma, pos, gloss: gloss.split(/[;(]/)[0].trim().slice(0, 48) });
  });
  if (!cands.length) return null;
  const c = cands[Math.floor(r() * cands.length)];
  const pool = lex.freq.slice(150, 2500).map(([li]) => li).filter(li => { const [l, g] = lex.lemmas[li]; return l !== c.lemma && g && V.posOf[li] === c.pos; });
  const opts = new Set([c.gloss]);
  for (let i = 0; i < 40 && opts.size < 4; i++) {
    const g = lex.lemmas[pool[Math.floor(r() * pool.length)]][1].split(/[;(]/)[0].trim().slice(0, 48);
    if (g && !opts.has(g) && g.split(/[ ,]/)[0] !== c.gloss.split(/[ ,]/)[0]) opts.add(g);
  }
  if (opts.size < 4) return null;
  return { kind: "vocab", q: `In this passage, what does “${c.w}” mean?`, ans: c.gloss, opts: shuffle([...opts], r), why: `${c.lemma}: ${c.gloss}` };
}
async function plItem(part, target, used, lex) {
  const { idx } = await loadPassages();
  const rows = (idx[part] || []).filter(r => !used.has(`${r[0]}.${r[1]}.${r[2]}`))
    .sort((a, b) => Math.abs(a[3] / 100 - target) - Math.abs(b[3] / 100 - target)).slice(0, 30);
  const r0 = rng(String(Date.now()) + part);
  const order = shuffle(rows, r0).sort((a, b) => Math.abs(a[3] / 100 - target) - Math.abs(b[3] / 100 - target) + (r0() - 0.5) * 0.15);
  for (const r of order.slice(0, 14)) {
    const key = `${r[0]}.${r[1]}.${r[2]}`;
    used.add(key);
    const book = await loadBook(r[0]);
    const ch = book.ch[r[1] - 1];
    const vi = ch.findIndex(x => x[0] === r[2]);
    const v = ch[vi];
    if (!v) continue;
    const verseLevel = part === "nt" || part === "ps" || part === "hy";
    const la = verseLevel ? v[1] : firstSent(v[1]);
    const wc = WC(la);
    if (wc < 5 || wc > (part === "hy" ? 60 : 42)) continue;
    const ids = (v[3] || []).slice(0, wc);
    let q1 = null;
    if (part !== "hy") {
      const en = verseLevel ? v[2] : firstSent(v[2]);
      const near = (rows => rows.map((x, j) => ({ x, j })).filter(o => o.j !== vi && o.x[2] && o.x[2].trim()).sort((a, b) => Math.abs(a.j - vi) - Math.abs(b.j - vi)).map(o => (verseLevel ? o.x[2] : firstSent(o.x[2]))))(ch);
      const others = verseLevel || near.length >= 3 ? near : [...near, ...book.ch.filter((c, j) => j !== r[1] - 1).map(c => firstSent(c[0][2]))];
      const ok = others.filter(t => t && t !== en && WC(t) >= WC(en) * 0.4 && WC(t) <= WC(en) * 2.5).slice(0, 3);
      if (ok.length === 3 && en) q1 = { kind: "meaning", q: "Which translation fits?", ans: en, opts: shuffle([en, ...ok], r0), why: "" };
    }
    if (!q1) q1 = plVocab(lex, la, ids, key);
    if (!q1) continue;
    const q2 = makeQuestions(lex, [[v[0], la, v[2], ids]], key, 1)[0] || plVocab(lex, la, ids, key + "b");
    return { part, key, d: r[3] / 100, la, at: [r[0], r[1], r[2]], qs: [q1, q2].filter(Boolean) };
  }
  return null;
}

function PlacementCheck({ parts, prog, onFinish, onAnswer, onCancel }) {
  const perPart = parts.length > 1 ? PL_PASSAGES.all : PL_PASSAGES.one;
  const total = perPart * parts.length;
  const [stage, setStage] = useState("intro"); // intro | run | done
  const [lex, setLex] = useState(null);
  const [item, setItem] = useState(null);
  const [n, setN] = useState(0);
  const [picked, setPicked] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const st = useRef(null);
  if (!st.current) st.current = { post: Object.fromEntries(parts.map(p => [p, plPrior()])), used: new Set(), right: Object.fromEntries(parts.map(p => [p, [0, 0]])) };
  useEffect(() => { loadLex().then(setLex).catch(() => setErr("The dictionary didn’t load. Check your connection and try again.")); }, []);
  const partOf_n = i => parts[Math.floor(i / perPart)];
  async function load(i) {
    setBusy(true); setPicked({});
    try {
      const part = partOf_n(i);
      const target = Math.max(0.05, Math.min(0.95, plMean(st.current.post[part])));
      const it = await plItem(part, target, st.current.used, lex);
      if (!it) throw new Error("no item");
      setItem(it);
    } catch (e) { setErr("A passage didn’t load. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  function start() { setStage("run"); setN(0); load(0); }
  function answer(qi, opt) {
    if (picked[qi] != null || !item) return;
    const q = item.qs[qi], ok = opt === q.ans;
    setPicked(p => ({ ...p, [qi]: opt }));
    const s = st.current;
    s.post[item.part] = plUpdate(s.post[item.part], item.d, ok, 1 / q.opts.length);
    s.right[item.part][0] += ok ? 1 : 0; s.right[item.part][1] += 1;
    if (onAnswer && q.concept !== undefined) onAnswer(q.concept, ok);
  }
  function next() {
    if (n + 1 >= total) {
      const res = Object.fromEntries(parts.map(p => [p, { t: +plMean(st.current.post[p]).toFixed(3), sd: plSD(st.current.post[p]), right: st.current.right[p] }]));
      setStage("done"); onFinish(res, false); return;
    }
    setN(n + 1); load(n + 1);
  }
  const names = parts.map(p => PART_INFO[p].short);
  if (stage === "intro") {
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-5 sm:px-7" aria-label="Placement check">
        <h2 className="latin text-[1.15rem] font-bold text-ink">Placement check{parts.length === 1 ? `: ${names[0]}` : ""}</h2>
        <p className="text-[15px] leading-snug text-ink">
          {total} short passages{parts.length > 1 ? `, ${perPart} from each of the five exam parts` : ""}, about {Math.max(3, Math.round(total * 0.7))} minutes.
          For each, read the Latin and answer two questions: what it means, and an examiner’s question on its grammar. The passages get harder or easier as you go, to find your level.
        </p>
        <p className="text-[14px] text-soft">No dictionary: answer as you would in the exam. You’ll see the right answer after each one. Afterwards, passages{parts.length > 1 ? " in every part" : ""} start at your level instead of a guess.</p>
        {err && <p className="text-[14px] text-warn">{err}</p>}
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" onClick={start} disabled={!lex}>{lex ? "Start" : "Loading…"}</Btn>
          <Btn onClick={onCancel}>Not now</Btn>
        </div>
      </section>
    );
  }
  if (stage === "done") {
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-5 sm:px-7" aria-label="Placement result">
        <h2 className="latin text-[1.15rem] font-bold text-ink">Your starting level</h2>
        <ul className="flex flex-col gap-1.5 text-[15px] text-ink">
          {parts.map(p => {
            const t = plMean(st.current.post[p]), [r, of] = st.current.right[p];
            return (
              <li key={p} className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-rule pt-1.5">
                <span><strong>{PART_INFO[p].short}</strong> <span className="text-soft">· {r} of {of} right</span></span>
                <span>passages start at <strong>{diffWord(Math.round(Math.max(0, Math.min(1, t)) * 100)).toLowerCase()}</strong> · readiness about {readiness({ t })}%</span>
              </li>
            );
          })}
        </ul>
        <p className="text-[14px] text-soft">This is a first estimate. Every passage you grade from now on refines it, and you can retake the check whenever you like (Exam readiness, above).</p>
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" onClick={() => onFinish(null, true)}>Start practising{parts.length === 1 ? ` ${names[0]}` : ""} →</Btn>
        </div>
      </section>
    );
  }
  const part = partOf_n(n);
  const doneAll = item && item.qs.every((q, i) => picked[i] != null);
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-rule bg-leaf px-5 py-5 sm:px-7" aria-label="Placement question">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px] text-soft">
        <span className="smallcaps font-semibold text-rubric">Placement · {PART_INFO[part].short}</span>
        <span className="num">{n + 1} of {total}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--rule)]" aria-hidden="true"><div className="h-full rounded-full bg-[var(--rubric)]" style={{ width: `${(n / total) * 100}%` }} /></div>
      {busy || !item ? <p className="text-[15px] text-soft">{err || "Choosing a passage…"}</p> : (
        <>
          <p lang="la" className={`lt latin text-[1.2rem] leading-[1.8] text-ink${item.part === "hy" ? " whitespace-pre-line" : ""}`}><AccentText text={item.part === "hy" ? item.la.replace(/ \/ /g, "\n") : item.la} /></p>
          {item.qs.map((q, qi) => {
            const p = picked[qi];
            if (qi > 0 && picked[qi - 1] == null) return null;
            return (
              <div key={qi} className="flex flex-col gap-1.5">
                <p className="text-[15px] font-medium text-ink">{q.q}</p>
                <div className={q.kind === "meaning" ? "flex flex-col gap-1.5" : "flex flex-wrap gap-1.5"}>
                  {q.opts.map(o => {
                    const cls = p == null ? "border-rule bg-paper text-ink hover:border-soft" : o === q.ans ? "border-ok bg-oktint text-ok" : o === p ? "border-warn bg-warntint text-warn" : "border-rule bg-paper text-soft";
                    return <button key={o} type="button" disabled={p != null} onClick={() => answer(qi, o)} className={`rounded-md border px-3 py-1.5 text-left text-[14px] leading-snug ${cls}`}>{o}</button>;
                  })}
                </div>
                {p != null && q.why && <p className="text-[13px] text-soft">{q.why}</p>}
              </div>
            );
          })}
          {doneAll && (
            <div className="flex flex-wrap items-center gap-3">
              <Btn variant="primary" onClick={next}>{n + 1 >= total ? "See my level →" : "Next passage →"}</Btn>
              <span className="text-[12px] text-soft">{refText(item.at)}</span>
            </div>
          )}
        </>
      )}
      <button type="button" className="self-start text-[13px] text-soft underline" onClick={onCancel}>Stop the check</button>
    </section>
  );
}
