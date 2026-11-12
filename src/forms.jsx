/* ---------- Forms: full tables for any word, and a conjugation and declension trainer ---------- */
const FORMS_CFG = "lectio-vulgata-forms";
const FORMS_MISS = "lectio-vulgata-forms-missed";
const PERSONS = ["1s", "2s", "3s", "1p", "2p", "3p"];
const PN_SHORT = { "1s": "1 sg", "2s": "2 sg", "3s": "3 sg", "1p": "1 pl", "2p": "2 pl", "3p": "3 pl" };
const TENSE_ORDER = ["p", "i", "f", "r", "l", "t"];
const CASE_ORDER = ["n", "g", "d", "a", "b", "v"];
const IRREGULARS = ["sum", "possum", "eo", "fero", "volo", "nolo", "malo", "fio", "exeo", "transeo", "redeo", "affero", "aufero", "refero", "offero", "absum", "adsum", "prosum", "odi", "memini", "coepi"];
const fnorm = MORPH.norm;
const fvar = s => fnorm(s).replace(/ii/g, "i");

/* Every word the page can generate forms for, most frequent first. */
const formsIndexCache = new Map();
function formsIndex(lex) {
  if (formsIndexCache.has(lex)) return formsIndexCache.get(lex);
  const V = vocabOf(lex), seen = new Set(), out = [];
  // Verbs whose passive actually occurs in the texts (intransitives like ascendo have none worth drilling).
  const passive = new Set();
  lex.ana.forEach(([li, pos, m]) => { if (pos === "V-" && m && m[4] === "p") passive.add(lex.lemmas[li][0]); });
  const add = li => {
    const [lemma, gloss, head] = lex.lemmas[li];
    if (!head || seen.has(lemma)) return;
    const v = MORPH.verbInfo(lemma, head), n = !v && MORPH.nounInfo(lemma, head), a = !v && !n && MORPH.adjInfo(lemma, head);
    const kind = v ? "verb" : n ? "noun" : a ? "adj" : null;
    if (!kind) return;
    seen.add(lemma);
    out.push({ li, lemma, head: (v || n || a).head, gloss: gloss || "", kind, rank: V.freq[lemma] ? V.freq[lemma].rank : 1e6, dep: !!(v && v.dep), irr: !!(v && v.irr), passive: passive.has(lemma) });
  };
  lex.freq.forEach(([li]) => add(li));
  lex.lemmas.forEach((_, li) => add(li));
  Object.entries(MORPH.PRONOUNS).forEach(([p, P]) => out.push({ li: -1, lemma: p, head: p, gloss: P.gloss, kind: "pron", rank: (V.freq[p] || {}).rank || 50 }));
  out.sort((a, b) => a.rank - b.rank);
  const byLemma = Object.fromEntries(out.map(e => [e.lemma, e]));
  const res = { list: out, byLemma };
  formsIndexCache.set(lex, res);
  return res;
}
function entryOf(it, form) { return it.kind === "pron" ? MORPH.build(it.lemma, it.lemma) : MORPH.entryFor(it.lemma, it.head, form); }
const KIND_L = { verb: "verb", noun: "noun", adj: "adjective", pron: "pronoun" };

function WordSearch({ index, onPick, placeholder = "Look up a word: dico, gratia, omnis, qui…", id = "forms-search" }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const hits = useMemo(() => {
    const n = fvar(q);
    if (!n) return [];
    const starts = [], inside = [];
    for (const it of index.list) {
      const l = fvar(it.lemma), h = fvar(it.head);
      if (l.startsWith(n) || h.startsWith(n)) starts.push(it); else if (n.length > 2 && fvar(it.gloss).includes(n)) inside.push(it);
      if (starts.length >= 8) break;
    }
    return [...starts, ...inside].slice(0, 8);
  }, [q, index]);
  function pick(it) { onPick(it); setQ(""); setOpen(false); }
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">Look up a word</label>
      <input id={id} value={q} autoComplete="off" spellCheck={false} placeholder={placeholder}
        onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => { if (e.key === "Enter" && hits[0]) { e.preventDefault(); pick(hits[0]); } }}
        className="w-full rounded-md border border-rule bg-leaf px-3 py-2 text-[15px] text-ink" />
      {open && hits.length > 0 && (
        <ul className="absolute left-0 right-0 z-10 mt-1 max-h-72 overflow-auto rounded-md border border-rule bg-leaf shadow-sm" role="listbox">
          {hits.map(it => (
            <li key={it.kind + it.lemma}>
              <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => pick(it)} className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-[14px] hover:bg-rubrictint">
                <span lang="la" className="latin font-bold text-ink">{it.head}</span>
                <span className="min-w-0 truncate text-soft">{KIND_L[it.kind]}{it.gloss ? ` · ${it.gloss}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----- tables ----- */
function Cell({ forms, mark, note }) {
  if (!forms || !forms.length) return <span className="text-soft">–</span>;
  const on = mark && forms.some(f => fnorm(f) === mark || fnorm(f).split(" ")[0] === mark);
  const alts = forms.slice(1).filter(f => !/ (sum|es|est|sumus|estis|sunt|eram|eras|erat|eramus|eratis|erant|ero|eris|erit|erimus|eritis|erunt|sim|sis|sit|simus|sitis|sint|essem|esses|esset|essemus|essetis|essent|esse)$/.test(f) || !/ /.test(forms[0]));
  return (
    <span className={on ? "rounded bg-rubrictint px-1 font-bold text-rubric" : ""}>
      <span lang="la" className="latin">{forms[0]}</span>
      {alts.length > 0 && <span className="text-[12px] text-soft"> ({alts.slice(0, 2).join(", ")})</span>}
      {note}
    </span>
  );
}
function TenseCard({ title, keys, F, mark, foot }) {
  if (!keys.some(k => F[k])) return null;
  return (
    <div className="rounded-md border border-rule bg-paper px-3 py-2">
      <h4 className="smallcaps mb-1 text-[13px] font-semibold text-rubric">{title}</h4>
      <table className="w-full text-[14px]"><tbody>
        {keys.map(k => F[k] ? <tr key={k}><td className="num w-10 pr-2 align-top text-[12px] text-soft">{PN_SHORT[k.slice(-2)]}</td><td className="py-0.5 text-ink"><Cell forms={F[k]} mark={mark} /></td></tr> : null)}
      </tbody></table>
      {foot && <p className="mt-1 text-[11px] leading-snug text-soft">{foot}</p>}
    </div>
  );
}
function VerbTable({ t, mark, rarePassive }) {
  const dep = t.info.dep, semi = t.info.semi;
  const hasPass = !dep && Object.keys(t.finite).some(k => k[2] === "p");
  const [voice, setVoice] = useState("a");
  useEffect(() => { if (mark) { const ks = MORPH.findForm(t, mark).filter(k => /^[a-z]{3}\d/.test(k)); if (ks.length && !dep) setVoice(ks[0][2]); } }, [t, mark]);
  const v = dep ? "p" : voice;
  const vOf = tense => (semi && "rlt".includes(tense) ? "a" : v);
  const F = t.finite, nf = t.nonfinite;
  const ppp = t.info.ppp;
  const agree = ppp ? `The participle agrees with the subject: ${ppp}, -a, -um.` : "";
  const grid = "grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-3";
  const card = (m, tense) => {
    const keys = PERSONS.map(p => tense + m + vOf(tense) + p);
    return <TenseCard key={m + tense} title={MORPH.TL[tense]} keys={keys} F={F} mark={mark} foot={"rlt".includes(tense) && (v === "p" || semi) && F[keys[0]] && / /.test(F[keys[0]][0]) ? agree : ""} />;
  };
  const impKeys = v === "a" ? ["pma2s", "pma2p", "fma2s", "fma3s", "fma2p", "fma3p"] : ["pmp2s", "pmp2p"];
  const NF = [["inf-pa", "inf-pp", "inf-ra", "inf-rp", "inf-fa", "inf-fp"], ["ptc-pa", "ptc-rp", "ptc-fa", "gdv", "gnd", "sup"]];
  const ptcShow = k => {
    const f = nf[k]; if (!f) return null;
    if (k === "ptc-pa") return [`${f[0]}, ${nf["ptc-pa-st"] ? nf["ptc-pa-st"] + "is" : ""}`];
    if (k === "ptc-rp" || k === "ptc-fa" || k === "gdv") return [`${f[0]}, -a, -um`];
    if (k === "gnd") return [f.join(", ")];
    if (k === "sup") return [f.join(", ")];
    return [f[0]];
  };
  return (
    <div className="flex flex-col gap-4">
      {dep ? <p className="text-[14px] text-soft">Deponent: passive forms, active meaning.</p>
        : semi ? <p className="text-[14px] text-soft">Semi-deponent: active in the present system, passive forms (active meaning) in the perfect.</p>
        : hasPass && (
          <div className="flex gap-1 self-start rounded-lg border border-rule bg-paper p-1" role="group" aria-label="Voice">
            {["a", "p"].map(x => <button key={x} type="button" aria-pressed={voice === x} onClick={() => setVoice(x)}
              className={`rounded-md px-3 py-1 text-[14px] font-medium ${voice === x ? "bg-ink text-paper" : "text-ink hover:bg-leaf"}`}>{x === "a" ? "Active" : "Passive"}</button>)}
          </div>
        )}
      {v === "p" && rarePassive && <p className="text-[13px] text-soft">The passive of this verb doesn’t occur in the exam texts; the forms are shown for reference.</p>}
      <section><h3 className="smallcaps mb-1.5 text-[14px] font-semibold text-ink">Indicative</h3><div className={grid}>{TENSE_ORDER.map(te => card("i", te))}</div></section>
      <section><h3 className="smallcaps mb-1.5 text-[14px] font-semibold text-ink">Subjunctive</h3><div className={grid}>{["p", "i", "r", "l"].map(te => card("s", te))}</div></section>
      {impKeys.some(k => F[k]) && (
        <section><h3 className="smallcaps mb-1.5 text-[14px] font-semibold text-ink">Imperative</h3>
          <div className="rounded-md border border-rule bg-paper px-3 py-2 text-[14px]">
            {impKeys.map(k => F[k] ? <span key={k} className="mr-4 inline-block"><span className="text-[12px] text-soft">{k[0] === "p" ? "pres." : "fut."} {PN_SHORT[k.slice(-2)]}</span> <Cell forms={F[k]} mark={mark} /></span> : null)}
          </div>
        </section>
      )}
      <section><h3 className="smallcaps mb-1.5 text-[14px] font-semibold text-ink">Infinitives, participles, gerund</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {NF.map((col, i) => (
            <div key={i} className="rounded-md border border-rule bg-paper px-3 py-2">
              <table className="w-full text-[14px]"><tbody>
                {col.map(k => nf[k] ? (
                  <tr key={k}><td className="w-1/2 pr-2 align-top text-[12px] leading-snug text-soft">{MORPH.NFL[k].replace(/ \(.*\)$/, "")}</td>
                    <td className="py-0.5 text-ink"><Cell forms={k.startsWith("inf") ? nf[k] : ptcShow(k)} mark={mark && (nf[k].some(f => fnorm(f) === mark) ? fnorm(ptcShow(k)[0]) : (MORPH.findForm(t, mark).some(x => x.startsWith(k + ":")) ? fnorm(ptcShow(k)[0]) : null))} /></td></tr>
                ) : null)}
              </tbody></table>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
function CaseTable({ cols, F, keyOf, mark }) {
  return (
    <div className="overflow-x-auto rounded-md border border-rule bg-paper px-3 py-2">
      <table className="w-full min-w-[16rem] text-[14px]">
        <thead><tr className="text-[12px] text-soft"><th className="w-14 text-left font-normal"></th>{cols.map(c => <th key={c[0]} className="text-left font-normal">{c[1]}</th>)}</tr></thead>
        <tbody>
          {CASE_ORDER.map(c => cols.some(col => F[keyOf(c, col[0])]) ? (
            <tr key={c}><td className="pr-2 text-[12px] text-soft">{MORPH.CL[c].slice(0, 3)}.</td>{cols.map(col => <td key={col[0]} className="py-0.5 pr-2 text-ink"><Cell forms={F[keyOf(c, col[0])]} mark={mark} /></td>)}</tr>
          ) : null)}
        </tbody>
      </table>
    </div>
  );
}
function DeclTable({ t, mark }) {
  const [showCmp, setShowCmp] = useState(false);
  if (t.kind === "noun") return <CaseTable cols={[["s", "singular"], ["p", "plural"]]} F={t.F} keyOf={(c, n) => c + n} mark={mark} />;
  const personal = t.kind === "pron" && t.info.personal;
  if (personal) return <CaseTable cols={[["s", "singular"], ["p", "plural"]]} F={t.F} keyOf={(c, n) => c + n} mark={mark} />;
  const G = [["m", "masc."], ["f", "fem."], ["n", "neut."]];
  return (
    <div className="flex flex-col gap-3">
      <div><h3 className="smallcaps mb-1.5 text-[14px] font-semibold text-ink">Singular</h3><CaseTable cols={G} F={t.F} keyOf={(c, g) => g + c + "s"} mark={mark} /></div>
      <div><h3 className="smallcaps mb-1.5 text-[14px] font-semibold text-ink">Plural</h3><CaseTable cols={G} F={t.F} keyOf={(c, g) => g + c + "p"} mark={mark} /></div>
      {t.cmp && (
        <div className="rounded-md border border-rule bg-paper px-3 py-2 text-[14px] text-ink">
          <span className="text-soft">Comparative</span> <span lang="la" className="latin">{t.cmp.cmp}{/ /.test(t.cmp.cmp) ? "" : `, ${t.cmp.cmp.replace(/ior$/, "ius")}`}</span>
          <span className="ml-3 text-soft">Superlative</span> <span lang="la" className="latin">{t.cmp.sup}{/ /.test(t.cmp.sup) ? "" : ", -a, -um"}</span>
          {t.C && <button type="button" className="ml-3 text-[13px] text-rubric underline" onClick={() => setShowCmp(s => !s)}>{showCmp ? "Hide" : "Decline the comparative"}</button>}
          {showCmp && t.C && <div className="mt-2"><CaseTable cols={G} F={t.C} keyOf={(c, g) => g + c + "s"} /><div className="mt-2"><CaseTable cols={G} F={t.C} keyOf={(c, g) => g + c + "p"} /></div></div>}
        </div>
      )}
    </div>
  );
}
function EntryView({ it, form, onDrill }) {
  const t = useMemo(() => entryOf(it, form), [it, form]);
  const mark = form ? fnorm(form) : null;
  if (!t) return <p className="text-[14px] text-soft">No table for this word.</p>;
  const found = mark ? MORPH.findForm(t, mark) : [];
  const desc = t.kind === "verb"
    ? (t.info.irr ? "irregular verb" : t.info.dep ? `deponent, ${({ "1": "1st", "2": "2nd", "3": "3rd", "3io": "3rd (-io)", "4": "4th" })[t.info.conj]} conjugation` : `${({ "1": "1st", "2": "2nd", "3": "3rd", "3io": "3rd (-io)", "4": "4th" })[t.info.conj] || ""} conjugation`)
    : t.kind === "noun" ? `${["", "1st", "2nd", "3rd", "4th", "5th"][t.info.decl]} declension, ${MORPH.GL[t.info.gender]}${t.info.decl === 3 && t.info.istem ? ", i-stem" : ""}`
    : t.kind === "adj" ? (t.info.type === "12" ? "adjective, 1st/2nd declension" : "adjective, 3rd declension") : "pronoun";
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-4 py-4 sm:px-6" aria-label={`Forms of ${it.lemma}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 lang="la" className="latin text-[1.15rem] font-bold text-ink">{t.head}</h2>
          <p className="text-[14px] text-soft">{desc}{it.gloss ? ` · ${it.gloss}` : ""}</p>
        </div>
        {onDrill && <Btn onClick={() => onDrill(it)}>Drill this word</Btn>}
      </div>
      {mark && <p className="text-[14px] text-ink"><span lang="la" className="latin font-bold text-rubric">{form}</span>{found.length ? `: ${found.slice(0, 4).map(k => keyLabel(t, k)).join("; or ")}` : ": not in this table (perhaps another spelling or another word)."}</p>}
      {t.kind === "verb" ? <VerbTable t={t} mark={mark} rarePassive={!it.passive} /> : <DeclTable t={t} mark={mark} />}
      <p className="text-[12px] text-soft">Generated from the dictionary entry and checked against the parsed exam texts, where it matches 99% of forms. The Vulgate often spells j for i and oe for ae.</p>
    </section>
  );
}
function keyLabel(t, k) {
  if (t.kind === "verb") {
    if (/^[a-z]{3}\d[sp]$/.test(k)) return MORPH.verbKeyLabel(k, t.info);
    const [w, gcn] = k.split(":");
    if (gcn) return `${MORPH.NFL[w]}, ${MORPH.GL[gcn[0]]} ${MORPH.CL[gcn[1]]} ${gcn[2] === "s" ? "singular" : "plural"}`;
    return MORPH.NFL[k] || k;
  }
  if (t.kind === "noun" || (t.kind === "pron" && t.info.personal)) return `${MORPH.CL[k[0]]} ${k[1] === "s" ? "singular" : "plural"}`;
  return `${MORPH.GL[k[0]]} ${MORPH.CL[k[1]]} ${k[2] === "s" ? "singular" : "plural"}`;
}

/* ----- trainer ----- */
const DEFAULT_CFG = { what: "verb", set: "top", picked: [], tenses: { p: 1, i: 1, f: 1, r: 1, l: 1, t: 1 }, moods: { i: 1, s: 1, m: 0 }, voices: { a: 1, p: 1 }, nonfin: 0, persons: { "1s": 1, "2s": 1, "3s": 1, "1p": 1, "2p": 1, "3p": 1 }, dir: "write", n: 10 };
function readCfg() { const c = readLocal(FORMS_CFG); return c && typeof c === "object" ? { ...DEFAULT_CFG, ...c } : DEFAULT_CFG; }
function conceptOf(t, k) {
  if (t.kind === "verb") {
    if (/^ptc|^gdv|^gnd/.test(k)) return "part";
    if (k[1] === "s") return "subj";
    if (t.info.dep) return "dep";
    if (k[1] === "m") return "imp";
    if (k[2] === "p") return "pass";
    if ("ft".includes(k[0])) return "fut";
    if ("rl".includes(k[0])) return "perf";
    return null;
  }
  const c = t.kind === "noun" ? k[0] : k.length === 2 ? k[0] : k[1];
  return { b: "abl", g: "gen", d: "dat" }[c] || null;
}
function poolFor(cfg, index, prog) {
  const L = index.list;
  const what = cfg.what === "agree" ? "noun" : cfg.what;
  const of = k => L.filter(e => e.kind === k);
  if (cfg.set === "pick") return cfg.picked.map(l => index.byLemma[l]).filter(e => e && (cfg.what === "agree" ? e.kind === "noun" : e.kind === what));
  if (cfg.set === "missed") { const ms = readLocal(FORMS_MISS) || []; return [...new Set(ms.filter(m => m.what === cfg.what).map(m => m.lemma))].map(l => index.byLemma[l]).filter(Boolean); }
  if (cfg.set === "mine") { const mine = new Set([...Object.keys(prog.vcards || {}), ...(prog.vtap || [])]); return of(what).filter(e => mine.has(e.lemma)); }
  if (what === "pron") return of("pron");
  if (what === "verb" && cfg.set === "irr") return IRREGULARS.map(l => index.byLemma[l]).filter(Boolean);
  if (what === "verb" && cfg.set === "dep") return of("verb").filter(e => e.dep).slice(0, 40);
  return of(what).slice(0, what === "verb" ? 60 : 50);
}
function slotsFor(t, cfg, it) {
  if (t.kind === "verb") {
    const out = Object.keys(t.finite).filter(k => {
      const [te, mo, vo] = k, pn = k.slice(3);
      if (!cfg.tenses[te] || !cfg.moods[mo] || !cfg.persons[pn]) return false;
      if (t.info.dep || (t.info.semi && "rlt".includes(te))) return cfg.voices.a || cfg.voices.p;
      if (vo === "p" && it && !it.passive) return false;
      return !!cfg.voices[vo];
    });
    if (cfg.nonfin) Object.keys(t.nonfinite).filter(k => /^(inf-|ptc-pa$|ptc-rp$|ptc-fa$|gdv$)/.test(k)).forEach(k => out.push(k));
    return out;
  }
  return Object.keys(t.F).filter(k => !/v[sp]$/.test(k));
}
function makeQuiz(cfg, index, prog, n) {
  const pool = poolFor(cfg, index, prog);
  if (!pool.length) return [];
  const adjs = cfg.what === "agree" ? index.list.filter(e => e.kind === "adj").slice(0, 30) : null;
  const qs = [], tries = n * 20;
  for (let i = 0; i < tries && qs.length < n; i++) {
    const it = pool[Math.floor(Math.random() * pool.length)];
    const t = entryOf(it);
    if (!t) continue;
    if (cfg.what === "agree") {
      const a = adjs[Math.floor(Math.random() * adjs.length)], at = entryOf(a);
      if (!at || !at.F) continue;
      const g = t.info.gender, slot = ["n", "g", "d", "a", "b"][Math.floor(Math.random() * 5)] + (Math.random() < 0.5 ? "s" : "p");
      const nf = t.F[slot], af = at.F[g + slot];
      if (!nf || !af) continue;
      qs.push({ it, t, a, at, key: slot, agree: true, prompt: `${MORPH.CL[slot[0]]} ${slot[1] === "s" ? "singular" : "plural"}`, answers: af.flatMap(x => nf.flatMap(y => [`${x} ${y}`, `${y} ${x}`])), show: `${af[0]} ${nf[0]}`, dir: "write" });
      continue;
    }
    const slots = slotsFor(t, cfg, it);
    if (!slots.length) continue;
    const key = slots[Math.floor(Math.random() * slots.length)];
    const forms = t.kind === "verb" && !/^[a-z]{3}\d/.test(key) ? t.nonfinite[key] : (t.finite ? t.finite[key] : t.F[key]);
    if (!forms) continue;
    const dir = cfg.dir === "mix" ? (Math.random() < 0.5 ? "write" : "parse") : cfg.dir;
    const parseable = t.kind !== "verb" || /^[a-z]{3}\d/.test(key) || /^inf-/.test(key);
    const d = dir === "parse" && parseable ? "parse" : "write";
    if (qs.some(q => q.it.lemma === it.lemma && q.key === key)) continue;
    qs.push({ it, t, key, forms, prompt: keyLabel(t, key), show: forms[0], dir: d });
  }
  return qs;
}
function checkWrite(q, input) {
  const a = fvar(input);
  if (!a) return false;
  const pool = q.agree ? q.answers : q.forms;
  return pool.some(f => fvar(f) === a);
}
/* Parse answers: a form can have several right parsings (amaris, regeris, dominis). */
function parseKeyFrom(q, sel) {
  const t = q.t;
  if (t.kind === "verb") {
    const voice = t.info.dep ? "p" : (t.info.semi && "rlt".includes(sel.tense) ? "a" : sel.voice);
    if (sel.mood === "n") return `inf-${sel.tense}${t.info.dep && sel.tense === "r" ? "a" : voice}`;
    return `${sel.tense}${sel.mood}${voice}${sel.mood === "m" ? sel.pn || "2s" : sel.pn}`;
  }
  if (t.kind === "noun" || (t.kind === "pron" && t.info.personal)) return `${sel.case}${sel.num}`;
  return `${sel.gender}${sel.case}${sel.num}`;
}
function checkParse(q, sel) {
  const valid = MORPH.findForm(q.t, q.show);
  return valid.includes(parseKeyFrom(q, sel));
}
function ParseInputs({ q, sel, setSel, disabled }) {
  const S = (id, label, opts) => (
    <label htmlFor={id} className="flex flex-col gap-0.5 text-[12px] text-soft">{label}
      <select id={id} value={sel[id.split("-")[1]] || ""} disabled={disabled} onChange={e => setSel(s => ({ ...s, [id.split("-")[1]]: e.target.value }))}
        className="rounded-md border border-rule bg-leaf px-2 py-1.5 text-[15px] text-ink">
        <option value="">–</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
  const t = q.t;
  if (t.kind === "verb") {
    const inf = sel.mood === "n";
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {S("p-pn", "Person", PERSONS.map(p => [p, MORPH.PNL[p]]).concat(inf ? [] : []))}
        {S("p-tense", "Tense", TENSE_ORDER.map(x => [x, MORPH.TL[x]]))}
        {S("p-mood", "Mood", [["i", "indicative"], ["s", "subjunctive"], ["m", "imperative"], ["n", "infinitive"]])}
        {t.info.dep ? <p className="self-end pb-2 text-[13px] text-soft">Deponent</p> : S("p-voice", "Voice", [["a", "active"], ["p", "passive"]])}
      </div>
    );
  }
  const personal = t.kind === "pron" && t.info.personal;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {t.kind !== "noun" && !personal && S("p-gender", "Gender", [["m", "masculine"], ["f", "feminine"], ["n", "neuter"]])}
      {S("p-case", "Case", CASE_ORDER.filter(c => c !== "v").map(c => [c, MORPH.CL[c]]))}
      {S("p-num", "Number", [["s", "singular"], ["p", "plural"]])}
    </div>
  );
}
function parseComplete(q, sel) {
  if (q.t.kind === "verb") return sel.tense && sel.mood && (sel.mood === "n" || sel.pn || sel.mood === "m") && (q.t.info.dep || sel.voice);
  const personal = q.t.kind === "pron" && q.t.info.personal;
  return sel.case && sel.num && (q.t.kind === "noun" || personal || sel.gender);
}
function Trainer({ index, prog, onAnswer, openTable, preset }) {
  const [cfg, setCfg0] = useState(readCfg);
  const setCfg = f => setCfg0(c => { const n = typeof f === "function" ? f(c) : f; writeLocal(FORMS_CFG, n); return n; });
  const [run, setRun] = useState(null); // { qs, i, results: [] }
  const [input, setInput] = useState("");
  const [sel, setSel] = useState({});
  const [shown, setShown] = useState(null); // result of the current question
  const inRef = useRef(null), nextRef = useRef(null);
  useEffect(() => { if (preset) { setCfg(c => ({ ...c, what: preset.kind === "adj" ? "adj" : preset.kind, set: "pick", picked: [preset.lemma] })); setRun(null); } }, [preset]);
  useEffect(() => { if (run && !shown) { if (inRef.current) inRef.current.focus(); } else if (shown && nextRef.current) nextRef.current.focus(); }, [run && run.i, shown]);
  const pool = useMemo(() => poolFor(cfg, index, prog), [cfg, index, prog]);
  function start(qs) {
    const list = qs || makeQuiz(cfg, index, prog, cfg.n);
    if (!list.length) return;
    setRun({ qs: list, i: 0, results: [] }); setInput(""); setSel({}); setShown(null);
  }
  const q = run && run.qs[run.i];
  function submit() {
    if (!q || shown) return;
    const ok = q.dir === "parse" ? checkParse(q, sel) : checkWrite(q, input);
    const given = q.dir === "parse" ? (q.t.kind === "verb" ? keyLabel(q.t, parseKeyFrom(q, sel)) : keyLabel(q.t, parseKeyFrom(q, sel))) : input.trim();
    setShown({ ok, given });
    setRun(r => ({ ...r, results: [...r.results, { q, ok, given }] }));
    onAnswer && onAnswer(q.agree ? conceptOf(q.t, q.key) : conceptOf(q.t, q.key), ok);
    const ms = readLocal(FORMS_MISS) || [];
    const rec = { what: cfg.what, lemma: q.it.lemma, key: q.key };
    const rest = ms.filter(m => !(m.lemma === rec.lemma && m.key === rec.key));
    writeLocal(FORMS_MISS, ok ? rest : [...rest, rec].slice(-120));
  }
  function next() { setShown(null); setInput(""); setSel({}); setRun(r => ({ ...r, i: r.i + 1 })); }
  const chip = (on, onClick, label, key) => (
    <button key={key || label} type="button" aria-pressed={!!on} onClick={onClick}
      className={`rounded border px-2 py-0.5 text-[13px] ${on ? "border-rubric bg-rubrictint text-rubric" : "border-rule bg-paper text-ink hover:border-soft"}`}>{label}</button>
  );
  const toggle = (group, k) => setCfg(c => ({ ...c, [group]: { ...c[group], [k]: c[group][k] ? 0 : 1 } }));
  const missedN = (readLocal(FORMS_MISS) || []).filter(m => m.what === cfg.what).length;

  if (run && run.i >= run.qs.length) {
    const right = run.results.filter(r => r.ok).length, wrong = run.results.filter(r => !r.ok);
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-4 py-4 sm:px-6" aria-label="Results">
        <h3 className="latin text-[1.1rem] font-bold text-ink"><span className={right === run.results.length ? "text-ok" : "text-ink"}>{right} of {run.results.length}</span> right</h3>
        {wrong.length > 0 && (
          <ul className="flex flex-col gap-1.5 text-[14px]">
            {wrong.map((r, i) => (
              <li key={i} className="leading-snug">
                <span lang="la" className="latin font-bold text-ink">{r.q.agree ? `${r.q.a.lemma} + ${r.q.it.lemma}` : r.q.dir === "parse" ? r.q.show : r.q.it.lemma}</span>
                <span className="text-soft"> {r.q.dir === "parse" ? "is" : `· ${r.q.prompt}:`} </span>
                <span className="text-ok">{r.q.dir === "parse" ? MORPH.findForm(r.q.t, r.q.show).map(k => keyLabel(r.q.t, k)).slice(0, 3).join("; or ") : r.q.show}</span>
                {r.given && <span className="text-warn"> (you: {r.given})</span>}
                {!r.q.agree && <button type="button" className="ml-2 text-[13px] text-rubric underline" onClick={() => openTable(r.q.it, r.q.show)}>table</button>}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          {wrong.length > 0 && <Btn variant="primary" onClick={() => start(wrong.map(r => ({ ...r.q })).sort(() => Math.random() - 0.5))}>Practise the {wrong.length} missed again</Btn>}
          <Btn variant={wrong.length ? "plain" : "primary"} onClick={() => start()}>New set</Btn>
          <Btn onClick={() => setRun(null)}>Change settings</Btn>
        </div>
      </section>
    );
  }
  if (run && q) {
    const ready = q.dir === "parse" ? parseComplete(q, sel) : input.trim();
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-4 py-4 sm:px-6" aria-label="Form trainer">
        <div className="flex items-baseline justify-between gap-2 text-[13px] text-soft">
          <span className="num">{run.i + 1} of {run.qs.length}</span>
          <span className="num">{run.results.filter(r => r.ok).length} right</span>
        </div>
        {q.dir === "parse" ? (
          <>
            <p className="text-[14px] text-soft">Parse:</p>
            <p lang="la" className="latin text-[1.6rem] font-bold text-ink">{q.show}</p>
            <p className="text-[13px] text-soft">from <span lang="la" className="latin">{q.t.head}</span>{q.it.gloss ? ` · ${q.it.gloss}` : ""}</p>
            <ParseInputs q={q} sel={sel} setSel={setSel} disabled={!!shown} />
          </>
        ) : (
          <>
            <p lang="la" className="latin text-[1.25rem] font-bold text-ink">{q.agree ? `${q.at.head} + ${q.t.head}` : q.t.head}</p>
            <p className="text-[13px] text-soft">{q.agree ? `${MORPH.GL[q.t.info.gender]} noun with its adjective` : q.it.gloss}</p>
            <p className="text-[16px] text-ink">Give the <strong>{q.prompt}</strong>{q.agree ? " of both together" : ""}.</p>
            <label htmlFor="forms-answer" className="sr-only">Your answer</label>
            <input id="forms-answer" ref={inRef} value={input} disabled={!!shown} autoComplete="off" autoCapitalize="off" spellCheck={false}
              onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (input.trim()) submit(); } }}
              className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-[18px] text-ink" style={{ fontFamily: "var(--font-latin)" }} placeholder="Type the form (no macrons needed)" />
          </>
        )}
        {!shown ? (
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="primary" onClick={submit} disabled={!ready}>Check</Btn>
            <button type="button" className="text-[13px] text-soft underline" onClick={() => { setShown({ ok: false, given: "" }); setRun(r => ({ ...r, results: [...r.results, { q, ok: false, given: "" }] })); onAnswer && onAnswer(conceptOf(q.t, q.key), false); }}>Show me</button>
          </div>
        ) : (
          <div className="flex flex-col gap-2" aria-live="polite">
            <p className={`text-[15px] ${shown.ok ? "text-ok" : "text-warn"}`}>
              <strong>{shown.ok ? "Right." : "Not quite."}</strong>{" "}
              {q.dir === "parse"
                ? <>“<span lang="la" className="latin">{q.show}</span>” is {MORPH.findForm(q.t, q.show).map(k => keyLabel(q.t, k)).slice(0, 3).join("; or ")}.</>
                : <>{q.prompt}: <span lang="la" className="latin font-bold">{q.show}</span>{!q.agree && q.forms.length > 1 && !/ /.test(q.forms[0]) ? <span className="text-soft"> (also {q.forms.slice(1, 3).join(", ")})</span> : null}.</>}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button ref={nextRef} type="button" onClick={next} className="inline-flex items-center rounded-md border border-ink bg-ink px-3.5 py-2 text-[15px] font-medium text-paper">{run.i + 1 < run.qs.length ? "Next →" : "See results"}</button>
              {!q.agree && <button type="button" className="text-[13px] text-rubric underline" onClick={() => openTable(q.it, q.show)}>See the full table</button>}
            </div>
          </div>
        )}
      </section>
    );
  }
  // settings
  const W = [["verb", "Verbs"], ["noun", "Nouns"], ["adj", "Adjectives"], ["agree", "Noun + adjective"], ["pron", "Pronouns"]];
  const sets = cfg.what === "verb" ? [["top", "60 commonest in the exam texts"], ["irr", "Irregular verbs"], ["dep", "Deponents"], ["mine", "My vocabulary words"], ["pick", "Words I choose"], ["missed", `My past mistakes (${missedN})`]]
    : cfg.what === "pron" ? [["top", "is, hic, ille, iste, ipse, idem, qui, quis, ego, tu, sui"], ["missed", `My past mistakes (${missedN})`]]
    : [["top", "Commonest in the exam texts"], ["mine", "My vocabulary words"], ["pick", "Words I choose"], ["missed", `My past mistakes (${missedN})`]];
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-rule bg-leaf px-4 py-4 sm:px-6" aria-label="Trainer settings">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="What to practise">{W.map(([k, l]) => chip(cfg.what === k, () => setCfg(c => ({ ...c, what: k, set: k === "pron" ? "top" : (c.set === "irr" || c.set === "dep") && k !== "verb" ? "top" : c.set })), l, k))}</div>
      <label htmlFor="forms-set" className="flex flex-col gap-1 text-[14px] text-ink">Words
        <select id="forms-set" value={sets.some(s => s[0] === cfg.set) ? cfg.set : "top"} onChange={e => setCfg(c => ({ ...c, set: e.target.value }))} className="rounded-md border border-rule bg-paper px-2 py-1.5 text-[15px]">
          {sets.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      {cfg.set === "pick" && (
        <div className="flex flex-col gap-2">
          <WordSearch index={{ ...index, list: index.list.filter(e => e.kind === (cfg.what === "agree" ? "noun" : cfg.what)) }} id="forms-pick" placeholder="Add a word…" onPick={it => setCfg(c => ({ ...c, picked: [...new Set([...c.picked, it.lemma])] }))} />
          <div className="flex flex-wrap gap-1.5">{cfg.picked.map(l => <button key={l} type="button" onClick={() => setCfg(c => ({ ...c, picked: c.picked.filter(x => x !== l) }))} className="rounded border border-rule bg-paper px-2 py-0.5 text-[13px] text-ink" title="Remove"><span lang="la" className="latin">{l}</span> ×</button>)}</div>
        </div>
      )}
      {cfg.what === "verb" && (
        <div className="flex flex-col gap-2 text-[13px] text-soft">
          <div className="flex flex-wrap items-center gap-1.5"><span className="w-14">Tenses</span>{TENSE_ORDER.map(k => chip(cfg.tenses[k], () => toggle("tenses", k), MORPH.TL[k], "t" + k))}</div>
          <div className="flex flex-wrap items-center gap-1.5"><span className="w-14">Moods</span>{[["i", "indicative"], ["s", "subjunctive"], ["m", "imperative"]].map(([k, l]) => chip(cfg.moods[k], () => toggle("moods", k), l, "m" + k))}</div>
          <div className="flex flex-wrap items-center gap-1.5"><span className="w-14">Voice</span>{[["a", "active"], ["p", "passive"]].map(([k, l]) => chip(cfg.voices[k], () => toggle("voices", k), l, "v" + k))}{chip(cfg.nonfin, () => setCfg(c => ({ ...c, nonfin: c.nonfin ? 0 : 1 })), "infinitives & participles", "nf")}</div>
          <div className="flex flex-wrap items-center gap-1.5"><span className="w-14">Persons</span>{PERSONS.map(k => chip(cfg.persons[k], () => toggle("persons", k), PN_SHORT[k], "p" + k))}</div>
        </div>
      )}
      {cfg.what !== "agree" && (
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-soft"><span className="w-14">Task</span>
          {[["write", "Write the form"], ["parse", "Parse the form"], ["mix", "Both"]].map(([k, l]) => chip(cfg.dir === k, () => setCfg(c => ({ ...c, dir: k })), l, "d" + k))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="forms-n" className="flex items-center gap-2 text-[14px] text-ink">Questions
          <select id="forms-n" value={cfg.n} onChange={e => setCfg(c => ({ ...c, n: +e.target.value }))} className="rounded-md border border-rule bg-paper px-2 py-1 text-[14px]">
            {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <Btn variant="primary" onClick={() => start()} disabled={!pool.length}>Start</Btn>
        <span className="text-[13px] text-soft">{pool.length ? `${pool.length} word${pool.length === 1 ? "" : "s"} in this set` : cfg.set === "pick" ? "Add some words first." : cfg.set === "missed" ? "No mistakes saved yet." : "No words in this set yet."}</span>
      </div>
      <p className="text-[12px] text-soft">Type forms without macrons; v/u and j/i are both fine. A perfect passive is right in any gender (dictus, dicta, dictum est).</p>
    </section>
  );
}

function FormsMode({ prog, onAnswer, focus }) {
  const [lex, setLex] = useState(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState(focus && focus.trainer ? "drill" : "tables");
  const [cur, setCur] = useState(null); // { it, form }
  const [preset, setPreset] = useState(null);
  useEffect(() => { loadLex().then(setLex).catch(() => setErr("The dictionary didn’t load. Check your connection and try again.")); }, []);
  const index = useMemo(() => (lex ? formsIndex(lex) : null), [lex]);
  useEffect(() => {
    if (!index || !focus) return;
    const lemma = focus.li >= 0 && lex ? lex.lemmas[focus.li][0] : focus.lemma;
    const it = index.byLemma[lemma];
    if (it) { setCur({ it, form: focus.form || null }); setTab("tables"); }
  }, [index, focus]);
  useEffect(() => { if (index && !cur && (!focus || focus.trainer)) setCur({ it: index.byLemma.dico || index.list[0], form: null }); }, [index]);
  if (!index) return <p className="text-[15px] text-soft">{err || "Loading the dictionary…"}</p>;
  const tabCls = on => `rounded-md px-3.5 py-1.5 text-[15px] font-medium ${on ? "bg-ink text-paper" : "text-ink hover:bg-leaf"}`;
  function openTable(it, form) { setCur({ it, form }); setTab("tables"); }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-rule bg-paper p-1" role="group" aria-label="Forms view">
          <button type="button" className={tabCls(tab === "tables")} aria-pressed={tab === "tables"} onClick={() => setTab("tables")}>Tables</button>
          <button type="button" className={tabCls(tab === "drill")} aria-pressed={tab === "drill"} onClick={() => setTab("drill")}>Trainer</button>
        </div>
        <span className="text-[13px] text-soft">{index.list.length.toLocaleString()} words</span>
      </div>
      {tab === "tables" ? (
        <>
          <WordSearch index={index} onPick={it => setCur({ it, form: null })} />
          <div className="flex flex-wrap gap-1.5 text-[13px]">
            {["sum", "possum", "eo", "fero", "volo", "fio", "loquor", "capio", "audio", "hic", "qui", "is", "res", "manus", "corpus", "omnis"].map(l => index.byLemma[l] &&
              <button key={l} type="button" onClick={() => setCur({ it: index.byLemma[l], form: null })} className="rounded border border-rule bg-paper px-2 py-0.5 text-ink hover:border-soft"><span lang="la" className="latin">{l}</span></button>)}
          </div>
          {cur && <EntryView key={cur.it.lemma + (cur.form || "")} it={cur.it} form={cur.form} onDrill={it => { setPreset({ ...it, at: Date.now() }); setTab("drill"); }} />}
        </>
      ) : (
        <Trainer index={index} prog={prog} onAnswer={onAnswer} openTable={openTable} preset={preset} />
      )}
    </div>
  );
}
