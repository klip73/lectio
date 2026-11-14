/* ---------- Bracketing: mark the verbs, bracket the subordinate clauses, see the sentence's structure ----------
   The method taught alongside scansion: underline every verb (a different line for each kind), then put brackets round
   each subordinate clause, nested inside one another; what is left outside every bracket is the main clause.
   Answer keys: for the New Testament, from the PROIEL treebank's hand-made dependency trees (data/brk/<book>.json,
   tools/bracket/build_brackets.py); for the other texts, guessed by rules from the parsed words (and labelled so).
   Train: one step at a time, with hints. Test: everything at once, then a score.
   Settings (settings.jsx, "Bracketing"): the line for each kind of verb, main verbs doubled, the bracket shapes,
   participle and infinitive phrases bracketed too, nested brackets in colours. */
const BRK_HIST = "lectio-vulgata-brk";
const BRK_KINDS = [["fin", "Finite verb", "Fin."], ["inf", "Infinitive", "Inf."], ["ptc", "Participle", "Ptc."], ["ger", "Gerund, gerundive, supine", "Ger."]];
const BRK_KIND_SET = { fin: "brkFin", inf: "brkInf", ptc: "brkPtc", ger: "brkGer" };
const BRK_STYLES = [["solid", "Single"], ["double", "Double"], ["dotted", "Dotted"], ["dashed", "Dashed"], ["wavy", "Wavy"]];
const BRK_SHAPES = [["[]", "[ ]"], ["()", "( )"], ["{}", "{ }"], ["⟨⟩", "⟨ ⟩"]];
const BRK_KCOL = { fin: "var(--rubric)", inf: "var(--g2)", ptc: "var(--g3)", ger: "var(--g4)" };
const BRK_CONJ = new Set(["et", "atque", "ac", "que", "sed", "autem", "enim", "vero", "uero", "aut", "vel", "uel", "nam", "igitur", "ergo", "itaque", "tamen", "etiam", "quoque"]);
const BRK_SUBW = new Set(["ut", "uti", "ne", "si", "nisi", "cum", "quia", "quoniam", "quod", "dum", "donec", "postquam", "antequam", "priusquam", "quamvis", "quamuis", "etsi", "tametsi", "quasi", "sicut", "ubi", "quando", "quatenus", "quin", "quominus", "ni", "sin", "simul", "licet"]);
const BRK_QW = new Set(["quis", "quid", "cur", "quomodo", "quare", "utrum", "num", "unde", "quo", "qualis", "quantus", "quot", "quemadmodum", "ecquis", "numquid"]);

function brkKindOf(a) {   // a = lex.ana entry [lemma, pos, morph]
  if (!a || a[1] !== "V-" || !a[2] || a[2].length < 4) return "";
  const md = a[2][3];
  return "ism".includes(md) ? "fin" : md === "n" ? "inf" : md === "p" ? "ptc" : "dgu".includes(md) ? "ger" : "";
}
/* The words of one sentence, with what each may be: ok = kinds a mark may have ("" = not a verb), exp = the likeliest. */
function brkTokens(lex, text, ids) {
  const parts = text.split(/([A-Za-z]+)/);
  const T = [];
  for (let j = 1; j < parts.length; j += 2) {
    const k = T.length, after = parts[j + 1] || "";
    const r = readings(ids ? ids[k] : null);
    const anas = lex ? r.ids.map(id => lex.ana[id]).filter(Boolean) : [];
    const kinds = anas.map(brkKindOf);
    const lemmas = anas.map(a => lex.lemmas[a[0]][0]);
    T.push({ w: parts[j], lw: parts[j].toLowerCase(), pos: anas.map(a => a[1]), anas, kinds, lemmas, sure: r.kind === "context" || anas.length === 1,
      stop: /[.;:?!]/.test(after), comma: /,/.test(after), exp: kinds[0] || "", ok: new Set(kinds.length ? kinds : [""]) });
  }
  /* compound tenses: a participle beside a form of sum is one finite verb with it (factum est, laudatus erit) */
  T.forEach((t, i) => {
    if (!t.kinds.includes("ptc")) return;
    const sum = [i - 2, i - 1, i + 1, i + 2].find(j => T[j] && T[j].lemmas.includes("sum") && T[j].kinds.includes("fin") && !T.slice(Math.min(i, j), Math.max(i, j)).some(x => x.stop || x.comma));
    if (sum !== undefined) { t.ok.add("fin"); t.ok.add("ptc"); t.cpd = true; if (t.exp === "ptc") t.exp = "fin"; }
  });
  return T;
}
const brkHas = (t, p) => t.pos.includes(p);
/* Does this word open a subordinate clause? (relative, subordinating conjunction, or a question word inside a sentence) */
function brkIntro(T, i) {
  const t = T[i];
  if (t.lw === "cum" && brkHas(t, "R-")) {   // the preposition, unless no ablative follows
    const n = T[i + 1];
    if (!brkHas(t, "G-") || (n && n.anas.some(a => a[2] && a[2][6] === "b" && a[1] !== "V-"))) return false;
    return true;
  }
  if (brkHas(t, "G-") || brkHas(t, "Pr") || brkHas(t, "Du")) return t.lw !== "quam" || brkHas(t, "Pr");
  if (!t.pos.length && BRK_SUBW.has(t.lw)) return true;
  if (i > 0 && (brkHas(t, "Pi") || brkHas(t, "Dq") || BRK_QW.has(t.lw)) && !T[i - 1].stop) return true;
  return false;
}
/* The rule-made key (texts with no treebank): open at each introducing word (taking a preposition before it in),
   close after its finite verb, or at the next punctuation when nothing finite comes before it. */
function brkGuess(T) {
  const spans = [], st = [];
  const fin = i => T[i].exp === "fin" && !(T[i].cpd && T[i - 1] && T[i - 1].exp === "fin") && !(T[i].lemmas.includes("sum") && [i - 1, i - 2].some(j => T[j] && T[j].cpd));
  for (let i = 0; i < T.length; i++) {
    if (brkIntro(T, i)) st.push({ s: i > 0 && brkHas(T[i - 1], "R-") && !T[i - 1].comma ? i - 1 : i });
    if (fin(i) && st.length) {
      const top = st.pop();
      let p = i; while (p < T.length - 1 && !T[p].stop && !T[p].comma) p++;
      let end = i;
      if (p > i && !T.slice(i + 1, p + 1).some((_, k) => fin(i + 1 + k) || brkIntro(T, i + 1 + k)) && st.length === 0) end = p;
      spans.push([top.s, end]);
      if (end > i) i = end;
    }
    if (T[i].stop) st.length = 0;
  }
  /* participle phrases we can find by rule: ablative absolutes */
  const ph = [];
  T.forEach((t, i) => {
    if (!t.anas.some(a => a[1] === "V-" && a[2] && a[2][3] === "p" && a[2][6] === "b") || t.cpd) return;
    const near = [i - 3, i - 2, i - 1, i + 1, i + 2].filter(j => T[j] && T[j].anas.some(a => a[1] !== "V-" && a[2] && a[2][6] === "b"));
    const prep = [i - 1, i - 2, i - 3].some(j => T[j] && brkHas(T[j], "R-"));
    if (near.length && !prep) ph.push([Math.min(i, ...near), Math.max(i, ...near), "abl"]);
  });
  const cross = (x, y) => (y[0] < x[0] && x[0] <= y[1] && y[1] < x[1]) || (x[0] < y[0] && y[0] <= x[1] && x[1] < y[1]);
  return { cl: spans.filter((x, k) => !spans.some((y, j) => j < k && cross(x, y))), ph: ph.filter(x => !spans.some(y => cross(x, y))), src: "rules" };
}
let brkCache = {};
function loadBrk(code) {
  if (!brkCache[code]) brkCache[code] = getJSON(`${REMOTE_V ? APP_SITE : ""}data/brk/${code}.json`).catch(() => null);
  return brkCache[code];
}
/* The key for a sentence: the treebank's, cut to this sentence (off = its first word's place in the verse), else the rules'. */
function brkKeyFor(T, tree, off) {
  if (tree) {
    const n = T.length, inS = x => x[0] >= off && x[1] < off + n;
    return { cl: tree[0].filter(inS).map(x => [x[0] - off, x[1] - off]), ph: tree[1].filter(inS).map(x => [x[0] - off, x[1] - off, x[2]]), src: "tree" };
  }
  return brkGuess(T);
}
function useBrkKey(lex, text, ids, at) {   // at = { b, c, v, off } or null
  const [tree, setTree] = useState(undefined);
  useEffect(() => {
    let alive = true; setTree(undefined);
    if (!at || !at.b || partOf(at.b) !== "nt") { setTree(null); return; }
    loadBrk(at.b).then(d => { if (alive) setTree(d && d.ch[at.c] && d.ch[at.c][at.v] ? d.ch[at.c][at.v] : null); });
    return () => { alive = false; };
  }, [at && at.b, at && at.c, at && at.v]);
  return useMemo(() => {
    if (tree === undefined || !lex) return null;
    const T = brkTokens(lex, text, ids);
    return { T, key: brkKeyFor(T, tree, (at && at.off) || 0) };
  }, [tree, lex, text]);
}

/* ----- checking ----- */
function brkSpanOk(k, key) {
  const near = (a, b, edge) => a === b || (Math.abs(a - b) === 1 && BRK_CONJ.has(edge));
  return (u, T) => {
    if (!near(u[0], k[0], T[Math.min(u[0], k[0])].lw)) return false;
    if (near(u[1], k[1], T[Math.max(u[1], k[1])].lw)) return true;
    /* a clause ending where a clause nested inside it begins (siblings instead of nesting) is also right */
    return key.some(c => c !== k && c[0] > k[0] && c[1] === k[1] && (u[1] === c[0] - 1 || (u[1] === c[0] - 2 && BRK_CONJ.has(T[c[0] - 1].lw))));
  };
}
function brkMatch(user, key, T) {
  const used = new Set(), res = user.map(() => null);
  key.forEach((k, ki) => {
    const f = brkSpanOk(k, key);
    const ui = user.findIndex((u, i) => !used.has(i) && f(u, T));
    if (ui >= 0) { used.add(ui); res[ui] = ki; }
  });
  /* two coordinated clauses bracketed as one ([qui esuriunt et sitiunt]) */
  user.forEach((u, i) => {
    if (res[i] !== null) return;
    const a = key.findIndex(k => k[0] === u[0]), b = key.findIndex(k => k[1] === u[1]);
    if (a >= 0 && b > a && key.slice(a, b + 1).every((k, j, arr) => j === 0 || k[0] > arr[j - 1][1])) { res[i] = a; used.add(i); }
  });
  const hit = new Set(res.filter(x => x !== null));
  return { res, missed: key.map((_, i) => i).filter(i => !hit.has(i)) };
}
function brkCheckVerbs(T, marks) {
  let right = 0, wrong = [], missed = [];
  T.forEach((t, i) => {
    const m = marks[i] || "";
    if (t.ok.has(m)) { if (m) right++; else if (t.exp && !t.ok.has("")) missed.push(i); }
    else if (m) wrong.push(i); else missed.push(i);
  });
  const need = T.filter(t => t.exp && !t.ok.has("")).length;
  return { right, wrong, missed, need, score: right + wrong.length + missed.length ? right / (right + wrong.length + missed.length) : 1 };
}

/* ----- drawing ----- */
function brkSet() {
  const g = k => getSet(k);
  return { fin: g("brkFin"), inf: g("brkInf"), ptc: g("brkPtc"), ger: g("brkGer"), main: g("brkMain"), cl: g("brkCl") || "[]", ph: g("brkPh") || "()", phr: g("brkPhr"), col: g("brkCol") };
}
function brkLine(kind, S, isMain) {
  if (!kind) return undefined;
  const style = isMain && kind === "fin" && S.main ? "double" : S[kind] || "solid";
  return { textDecorationLine: "underline", textDecorationStyle: style, textDecorationColor: BRK_KCOL[kind], textDecorationThickness: style === "double" ? "3px" : "2px", textUnderlineOffset: "6px", textDecorationSkipInk: "none" };
}
const brkDepthCol = d => `var(--g${(d % 6) + 1})`;
/* Brackets around words: spans [[a, b, type]] type "c" clause or a phrase kind. Returns per word the glyphs before and after. */
function brkGlyphs(n, spans, S) {
  const pre = Array.from({ length: n }, () => []), post = Array.from({ length: n }, () => []);
  const depth = sp => spans.filter(o => o !== sp && o[0] <= sp[0] && o[1] >= sp[1] && (o[0] < sp[0] || o[1] > sp[1] || spans.indexOf(o) < spans.indexOf(sp))).length;
  [...spans].sort((x, y) => x[0] - y[0] || y[1] - x[1]).forEach(sp => {
    const sh = sp[2] === "c" || !sp[2] ? S.cl : S.ph, d = depth(sp);
    if (!pre[sp[0]] || !post[sp[1]]) return;
    pre[sp[0]].push({ g: sh[0], d, sp });
    post[sp[1]].unshift({ g: sh[1], d, sp });
  });
  return { pre, post };
}
function brkInside(i, spans) { return spans.some(s => (s[2] === "c" || !s[2]) && s[0] <= i && i <= s[1]); }
function BrkSentence({ text, T, marks, spans, S, onTap, state, pending, label }) {
  const parts = text.split(/([A-Za-z]+)/);
  const { pre, post } = brkGlyphs(T.length, spans, S);
  const glyph = (x, j) => <span key={j} aria-hidden="true" className="font-sans font-bold" style={{ color: S.col ? brkDepthCol(x.d) : "var(--ink)", fontSize: "1.15em", margin: "0 1px" }}>{x.g}</span>;
  let k = -1;
  return (
    <p lang="la" aria-label={label} className="latin text-[1.45rem] leading-[2.2] text-ink">
      {parts.map((p, j) => {
        if (j % 2 === 0) return <span key={j}>{p}</span>;
        k++; const i = k, m = marks[i] || "", st = state ? state[i] : null;
        return (
          <span key={j}>
            {pre[i].map(glyph)}
            <span role={onTap ? "button" : undefined} tabIndex={onTap ? 0 : undefined} data-w={i}
              aria-label={onTap ? `${p}${m ? ", " + BRK_KINDS.find(x => x[0] === m)[1].toLowerCase() : ""}` : undefined}
              onClick={onTap ? () => onTap(i) : undefined}
              onKeyDown={onTap ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTap(i); } } : undefined}
              className={`rounded px-0.5 ${onTap ? "cursor-pointer" : ""} ${pending === i ? "bg-rubrictint outline outline-1 outline-[var(--rubric)]" : ""} ${st === "ok" ? "bg-[var(--ok-tint,rgba(60,140,80,.15))]" : st === "bad" ? "bg-[rgba(200,60,40,.18)]" : st === "miss" ? "outline outline-2 outline-dashed outline-[var(--mid)]" : ""}`}
              style={brkLine(m, S, !brkInside(i, spans))}>{p}</span>
            {post[i].map(glyph)}
          </span>
        );
      })}
    </p>
  );
}
/* The structure: each clause on its own line, indented by how deep it sits. */
function BrkStructure({ T, spans, marks, S }) {
  const cl = spans.filter(s => s[2] === "c" || !s[2]);
  const lines = []; let cur = null, depth = 0;
  const open = d => { cur = { d, w: [] }; lines.push(cur); };
  open(0);
  const { pre, post } = brkGlyphs(T.length, cl, S);
  T.forEach((t, i) => {
    cl.filter(s => s[0] === i).sort((a, b) => b[1] - a[1]).forEach(() => { depth++; open(depth); });
    cur.w.push(i);
    cl.filter(s => s[1] === i).forEach(() => { depth--; open(depth); });
  });
  return (
    <div className="flex flex-col gap-0.5" aria-label="Structure">
      {lines.filter(l => l.w.length).map((l, n) => (
        <p key={n} lang="la" className={`latin text-[1.1rem] leading-snug ${l.d === 0 ? "font-semibold text-ink" : "text-ink"}`} style={{ paddingLeft: `${l.d * 1.4}rem`, borderLeft: l.d ? `3px solid ${S.col ? brkDepthCol(l.d - 1) : "var(--rule)"}` : undefined, marginLeft: l.d ? `${(l.d - 1) * 0.2}rem` : 0 }}>
          {l.w.map(i => <span key={i}>{pre[i].map((x, j) => <span key={j} className="font-sans font-bold" style={{ color: S.col ? brkDepthCol(x.d) : undefined }}>{x.g}</span>)}<span style={brkLine(marks[i] || T[i].exp, S, l.d === 0)}>{T[i].w}</span>{post[i].map((x, j) => <span key={j} className="font-sans font-bold" style={{ color: S.col ? brkDepthCol(x.d) : undefined }}>{x.g}</span>)} </span>)}
          {l.d === 0 && <span className="ml-2 font-sans text-[12px] font-normal text-soft">main clause</span>}
        </p>
      ))}
    </div>
  );
}
function BrkLegend({ S }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-soft">
      {BRK_KINDS.map(([k, l]) => <span key={k}><span lang="la" style={brkLine(k, S, false)} className="latin text-ink">verbum</span> {l.split(",")[0].toLowerCase()}</span>)}
      {S.main && <span><span lang="la" style={brkLine("fin", S, true)} className="latin text-ink">verbum</span> main verb</span>}
      <span><b className="font-sans" style={{ color: S.col ? brkDepthCol(0) : undefined }}>{S.cl[0]} {S.cl[1]}</b> clause</span>
      {S.phr && <span><b className="font-sans" style={{ color: S.col ? brkDepthCol(0) : undefined }}>{S.ph[0]} {S.ph[1]}</b> participle / infinitive phrase</span>}
    </div>
  );
}

/* ----- the trainer and the test: one sentence ----- */
function BracketView({ lex, text, ids, at, mode = "train", onDone, onNext, compact }) {
  useSettings();
  const S = brkSet();
  const data = useBrkKey(lex, text, ids, at);
  const [marks, setMarks] = useState({});
  const [spans, setSpans] = useState([]);
  const [tool, setTool] = useState("fin");
  const [pending, setPending] = useState(null);
  const [step, setStep] = useState(1);            // train: 1 verbs, 2 brackets, 3 done; test: 1 working, 3 checked
  const [vRes, setVRes] = useState(null);
  const [bRes, setBRes] = useState(null);
  const [hint, setHint] = useState({});
  const [msg, setMsg] = useState("");
  const [reveal, setReveal] = useState(false);
  useEffect(() => { setMarks({}); setSpans([]); setTool("fin"); setPending(null); setStep(1); setVRes(null); setBRes(null); setHint({}); setMsg(""); setReveal(false); }, [text]);
  if (!data) return <p className="text-[14px] text-soft">Loading the sentence…</p>;
  const { T, key } = data;
  const keyAll = [...key.cl.map(x => [x[0], x[1], "c"]), ...(S.phr ? key.ph : [])];
  const test = mode === "test";
  const verbTools = BRK_KINDS.map(k => k[0]);
  const tapVerb = i => { setMarks(m => { const o = { ...m }; if (tool === "none" || o[i] === tool) delete o[i]; else o[i] = tool; return o; }); setVRes(null); };
  const tapBracket = i => {
    if (tool === "erase") {
      const inner = spans.filter(s => s[0] <= i && i <= s[1]).sort((a, b) => (a[1] - a[0]) - (b[1] - b[0]))[0];
      if (inner) setSpans(spans.filter(s => s !== inner));
      setBRes(null); return;
    }
    if (pending === null) { setPending(i); setMsg("Now tap the last word of the " + (tool === "c" ? "clause." : "phrase.")); return; }
    const sp = [Math.min(pending, i), Math.max(pending, i), tool];
    setPending(null); setMsg("");
    if (spans.some(s => s[0] === sp[0] && s[1] === sp[1] && s[2] === sp[2])) return;
    if (spans.some(s => (s[0] < sp[0] && sp[0] <= s[1] && s[1] < sp[1]) || (sp[0] < s[0] && s[0] <= sp[1] && sp[1] < s[1]))) { setMsg("Brackets can’t cross: one has to sit wholly inside the other."); return; }
    setSpans([...spans, sp]); setBRes(null);
  };
  const onTap = step === 3 ? null : i => (verbTools.includes(tool) || tool === "none" ? tapVerb(i) : tapBracket(i));
  function checkVerbs() { const r = brkCheckVerbs(T, marks); setVRes(r); return r; }
  function checkBrackets() {
    const mine = spans.filter(s => s[2] === "c"), myPh = spans.filter(s => s[2] !== "c");
    const c = brkMatch(mine, key.cl, T);
    const p = S.phr ? brkMatch(myPh, key.ph, T) : { res: [], missed: [] };
    const right = c.res.filter(x => x !== null).length + p.res.filter(x => x !== null).length;
    const wrong = c.res.filter(x => x === null).length + (key.src === "tree" ? p.res.filter(x => x === null).length : 0);
    const missed = c.missed.length + (key.src === "tree" ? p.missed.length : 0);
    const r = { c, p, right, wrong, missed, mine, myPh, score: right + wrong + missed ? right / (right + wrong + missed) : 1 };
    setBRes(r); return r;
  }
  function record(v, b) {
    try {
      const h = readLocal(BRK_HIST) || { hist: [] };
      h.hist = [...(h.hist || []), { at: Date.now(), p: at && at.b ? partOf(at.b) : "", m: mode, v: Math.round(v * 100), b: Math.round(b * 100), src: key.src }].slice(-60);
      writeLocal(BRK_HIST, h);
    } catch (e) {}
    onDone && onDone(v, b);
  }
  const vState = vRes ? Object.fromEntries([...T.map((t, i) => [i, marks[i] ? "ok" : null]), ...vRes.wrong.map(i => [i, "bad"]), ...vRes.missed.map(i => [i, "miss"])]) : null;
  const toolBtn = (k, label, style) => (
    <button key={k} type="button" aria-pressed={tool === k} onClick={() => { setTool(k); setPending(null); setMsg(""); }}
      className={`rounded-full border px-3 py-1.5 text-[14px] ${tool === k ? "border-2 border-ink bg-leaf font-semibold text-ink" : "border-rule bg-paper text-ink"}`}>
      {style ? <span lang="la" style={style} className="latin">{label}</span> : label}
    </button>
  );
  const verbBar = <div className="flex flex-wrap gap-1.5" role="group" aria-label="Verb marks">{BRK_KINDS.map(([k, l, s]) => toolBtn(k, compact ? s : l.split(",")[0], brkLine(k, S, false)))}{toolBtn("none", "Erase")}</div>;
  const brkBar = <div className="flex flex-wrap gap-1.5" role="group" aria-label="Brackets">{toolBtn("c", `${S.cl[0]} Clause ${S.cl[1]}`)}{S.phr && toolBtn("ph", `${S.ph[0]} Phrase ${S.ph[1]}`)}{toolBtn("erase", "Remove a bracket")}</div>;
  const keyMarks = Object.fromEntries(T.map((t, i) => [i, t.exp]).filter(x => x[1]));
  const keySpans = keyAll.map(x => [x[0], x[1], x[2] === "c" ? "c" : x[2]]);
  const introAt = new Set(key.cl.map(x => { let s = x[0]; while (s < x[1] && (BRK_CONJ.has(T[s].lw) || brkHas(T[s], "R-"))) s++; return s; }));
  const guessed = key.src === "rules";
  const pct = x => `${Math.round(x * 100)}%`;
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-4 py-4" aria-label={test ? "Bracketing test" : "Bracketing"}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-ink">{test ? "Test: mark the verbs and bracket the clauses" : step === 1 ? "Step 1 · Underline every verb" : step === 2 ? "Step 2 · Bracket the subordinate clauses" : "The structure"}</h3>
        <span className="text-[12px] text-soft">{guessed ? "Answer key made by rules: it can be wrong" : "Answer key from the PROIEL treebank"}</span>
      </div>
      {!test && step === 1 && <p className="text-[14px] text-soft">Choose a kind, then tap each verb of that kind. A participle with a form of <i lang="la">sum</i> (<i lang="la">factum est</i>) counts as one finite verb.</p>}
      {!test && step === 2 && <p className="text-[14px] text-soft">Tap the first word of a subordinate clause (its relative, its conjunction, or a preposition before them), then its last word. Brackets can sit inside each other. Whatever stays outside every bracket is the main clause.</p>}
      {step !== 3 && (test ? <>{verbBar}{brkBar}</> : step === 1 ? verbBar : brkBar)}
      <BrkSentence text={text} T={T} marks={reveal ? keyMarks : marks} spans={reveal ? keySpans : spans} S={S} onTap={reveal ? null : onTap} pending={pending} state={step === 1 || test ? (reveal ? null : vState) : null} label="Sentence to bracket" />
      {hint.intro && step === 2 && <p className="text-[14px] text-soft">Clauses open at: <span lang="la" className="latin text-ink">{[...introAt].map(i => T[i].w).join(", ") || "none: this sentence has no subordinate clause"}</span></p>}
      {hint.count && step === 1 && <p className="text-[14px] text-soft">This sentence has {T.filter(t => t.exp && !t.cpd).length} verb{T.filter(t => t.exp && !t.cpd).length === 1 ? "" : "s"}{T.some(t => t.cpd) ? " (a compound tense counts once)" : ""}.</p>}
      {msg && <p className="text-[14px] text-rubric" role="status">{msg}</p>}
      {/* step 1 feedback */}
      {!test && step === 1 && vRes && (
        <p className="text-[14px] text-ink" role="status">{vRes.wrong.length + vRes.missed.length === 0 ? "All the verbs are right." : `${vRes.right} right${vRes.wrong.length ? `, ${vRes.wrong.length} wrong (red)` : ""}${vRes.missed.length ? `, ${vRes.missed.length} missed (dashed)` : ""}.`}
          {vRes.wrong.length > 0 && <span className="text-soft"> {vRes.wrong.map(i => `${T[i].w}: ${T[i].exp ? BRK_KINDS.find(k => k[0] === T[i].exp)[1].toLowerCase() : "not a verb"}`).join("; ")}.</span>}</p>
      )}
      {!test && step === 2 && bRes && (
        <p className="text-[14px] text-ink" role="status">{bRes.wrong + bRes.missed === 0 ? (key.cl.length ? "Every bracket is right." : "Right: this sentence has no subordinate clause, so it is all main clause.") : `${bRes.right} bracket${bRes.right === 1 ? "" : "s"} right${bRes.wrong ? `, ${bRes.wrong} not in the key` : ""}${bRes.missed ? `, ${bRes.missed} missing` : ""}.`}{guessed && bRes.wrong + bRes.missed > 0 ? " (The key was made by rules: if yours is the better reading, trust it.)" : ""}</p>
      )}
      {/* buttons */}
      {!test && step === 1 && (
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" onClick={() => { const r = checkVerbs(); if (!r.wrong.length && !r.missed.length) { setStep(2); setTool("c"); } }}>Check the verbs</Btn>
          {vRes && (vRes.wrong.length || vRes.missed.length) ? <Btn onClick={() => { setMarks(keyMarks); setVRes(null); setStep(2); setTool("c"); }}>Show them and go on</Btn> : null}
          {!hint.count && <Btn onClick={() => setHint({ ...hint, count: true })}>How many verbs?</Btn>}
        </div>
      )}
      {!test && step === 2 && (
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" onClick={() => { const r = checkBrackets(); if (!r.wrong && !r.missed) { setStep(3); record(vRes ? vRes.score : 1, 1); } }}>Check the brackets</Btn>
          {bRes && (bRes.wrong || bRes.missed) ? <Btn onClick={() => { setReveal(true); setStep(3); record(vRes ? vRes.score : 1, bRes.score); }}>Show the answer</Btn> : null}
          {!hint.intro && <Btn onClick={() => setHint({ ...hint, intro: true })}>Where do clauses open?</Btn>}
        </div>
      )}
      {test && step === 1 && (
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" onClick={() => { const v = checkVerbs(), b = checkBrackets(); setStep(3); record(v.score, b.score); }}>Check</Btn>
        </div>
      )}
      {test && step === 3 && vRes && bRes && (
        <div className="flex flex-col gap-2">
          <p className="text-[15px] text-ink" role="status">Verbs <strong className="num">{pct(vRes.score)}</strong> · brackets <strong className="num">{pct(bRes.score)}</strong>
            <span className="text-soft"> ({vRes.wrong.length} wrong, {vRes.missed.length} missed verb{vRes.missed.length === 1 ? "" : "s"}; {bRes.wrong} extra, {bRes.missed} missing bracket{bRes.missed === 1 ? "" : "s"})</span></p>
          <div className="flex flex-wrap gap-2"><Btn onClick={() => setReveal(!reveal)}>{reveal ? "Show mine" : "Show the answer"}</Btn></div>
        </div>
      )}
      {step === 3 && (
        <div className="flex flex-col gap-2 border-t border-rule pt-3">
          <span className="smallcaps text-[13px] font-semibold text-soft">{key.cl.length ? "Each clause on its own line" : "One clause: no brackets needed"}</span>
          <BrkStructure T={T} spans={keySpans} marks={keyMarks} S={S} />
          {onNext && <div><Btn variant="primary" onClick={onNext}>Next sentence →</Btn></div>}
        </div>
      )}
      <BrkLegend S={S} />
    </section>
  );
}

/* ----- Study → Bracket: pick sentences from the five exam texts ----- */
const BRK_PARTS = [["nt", "New Testament"], ["st", "Summa"], ["se", "Matins"], ["hy", "Hymns"], ["ps", "Psalms"]];
const BRK_LEN = [["short", "Shorter"], ["any", "Any"], ["long", "Longer"]];
function brkHistSummary() {
  const h = (readLocal(BRK_HIST) || {}).hist || [];
  const last = h.slice(-10);
  if (!last.length) return null;
  const avg = k => Math.round(last.reduce((s, x) => s + x[k], 0) / last.length);
  return { n: h.length, v: avg("v"), b: avg("b") };
}
function BracketMode() {
  useSettings();
  const cfg0 = readLocal(BRK_HIST) || {};
  const [part, setPart] = useState(cfg0.part || "nt");
  const [mode, setMode] = useState(cfg0.mode || "train");
  const [len, setLen] = useState(cfg0.len || "any");
  const [pick, setPick] = useState(null);           // { b, c, v, off, text, ids, label }
  const [err, setErr] = useState("");
  const [lex, setLex] = useState(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { const h = readLocal(BRK_HIST) || {}; writeLocal(BRK_HIST, { ...h, part, mode, len }); }, [part, mode, len]);
  useEffect(() => { loadLex().then(setLex).catch(() => setErr("The words didn’t load. Check your connection, then reload the page.")); }, []);
  async function next() {
    setErr("");
    try {
      const [{ idx }, lx] = await Promise.all([loadPassages(), loadLex()]);
      const rows = idx[part] || [];
      const want = n => len === "short" ? n >= 6 && n <= 16 : len === "long" ? n >= 22 && n <= 70 : n >= 6 && n <= 45;
      for (let tries = 0; tries < 25; tries++) {
        const r = rows[Math.floor(Math.random() * rows.length)];
        const book = await loadBook(r[0]);
        const chap = book.ch[r[1] - 1]; if (!chap) continue;
        const block = blocksFor(chap).find(bl => bl[0][0] === r[2]) || chap.filter(v => v[0] >= r[2]).slice(0, 3);
        const sents = sentencesOf(block).filter(s => want((s.v[1].match(WORD_RE) || []).length));
        if (!sents.length) continue;
        /* prefer sentences with a subordinate clause in them (three tries in four) */
        const withSub = sents.filter(s => { const T = brkTokens(lx, s.v[1], s.v[3]); return T.some((_, i) => brkIntro(T, i)); });
        const pool = withSub.length && Math.random() < 0.75 ? withSub : sents;
        const s = pool[Math.floor(Math.random() * pool.length)];
        setPick({ b: r[0], c: r[1], v: s.v[0], off: s.off || 0, text: s.v[1], ids: s.v[3], label: passageLabel(r[0], r[1], [s.v], book) + (s.of ? ` · sentence ${s.sub} of ${s.of}` : "") });
        setTick(t => t + 1);
        return;
      }
      setErr("No sentence of that length turned up: try another length.");
    } catch (e) { setErr("The texts didn’t load. Check your connection, then reload the page."); }
  }
  useEffect(() => { next(); }, [part, len]);
  const sum = brkHistSummary();
  return (
    <div className="flex flex-col gap-4" aria-label="Bracketing practice">
      <div className="flex flex-col gap-1">
        <h2 className="latin text-[1.35rem] font-bold text-ink">Bracketing</h2>
        <p className="text-[15px] text-soft">Underline the verbs, bracket each subordinate clause, and the main clause stands out: the way to take apart a long sentence before translating it. Change the lines and brackets in Settings → Bracketing.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SetSeg label="Text" items={BRK_PARTS} value={part} onPick={setPart} />
        <SetSeg label="Length" items={BRK_LEN} value={len} onPick={setLen} />
        <SetSeg label="Mode" items={[["train", "Train"], ["test", "Test"]]} value={mode} onPick={setMode} />
      </div>
      {sum && <p className="text-[13px] text-soft">Your last {Math.min(10, sum.n)}: verbs {sum.v}%, brackets {sum.b}% · {sum.n} sentence{sum.n === 1 ? "" : "s"} in all</p>}
      {err && <p className="text-[14px] text-rubric">{err}</p>}
      {pick && lex && (
        <>
          <p className="smallcaps text-[13px] text-soft">{pick.label}</p>
          <BracketView key={tick + mode} lex={lex} text={pick.text} ids={pick.ids} at={pick} mode={mode} onNext={next} />
          {mode === "test" && <div><Btn onClick={next}>Next sentence →</Btn></div>}
        </>
      )}
    </div>
  );
}

/* ----- Settings → Bracketing ----- */
function BracketOptions() {
  const s = useSettings();
  const S = brkSet();
  return (
    <div className="flex flex-col gap-3">
      {BRK_KINDS.map(([k, l]) => (
        <SetRow key={k} label={l}>
          <SetSeg label={l} items={BRK_STYLES.map(([v, n]) => [v, <span key={v} style={brkLine(k, { ...S, [k]: v }, false)}>{n}</span>])} value={s[BRK_KIND_SET[k]]} onPick={v => setSet({ [BRK_KIND_SET[k]]: v })} />
        </SetRow>
      ))}
      <SetRow label="Main verbs"><SetCheck id="brk-main" checked={s.brkMain} onChange={v => setSet({ brkMain: v })}>Double line under the finite verbs outside every bracket</SetCheck></SetRow>
      <SetRow label="Clause brackets"><SetSeg label="Clause brackets" items={BRK_SHAPES} value={s.brkCl} onPick={v => setSet({ brkCl: v, ...(v === s.brkPh ? { brkPh: s.brkCl } : {}) })} /></SetRow>
      <SetRow label="Phrases" hint="Ablative absolutes, accusative + infinitive, longer participle phrases. Checked on the New Testament; elsewhere only ablative absolutes are found by rule.">
        <SetCheck id="brk-phr" checked={s.brkPhr} onChange={v => setSet({ brkPhr: v })}>Bracket participle and infinitive phrases too</SetCheck>
        {s.brkPhr && <SetSeg label="Phrase brackets" items={BRK_SHAPES.filter(x => x[0] !== s.brkCl)} value={s.brkPh} onPick={v => setSet({ brkPh: v })} />}
      </SetRow>
      <SetRow label="Colours"><SetCheck id="brk-col" checked={s.brkCol} onChange={v => setSet({ brkCol: v })}>A colour for each depth of brackets</SetCheck></SetRow>
      <BrkLegend S={S} />
    </div>
  );
}
