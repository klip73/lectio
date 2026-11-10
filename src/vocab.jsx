/* ---------- Vocabulary trainer ---------- */
function useLex(on) {
  const [st, setSt] = useState({ lex: null, err: null });
  useEffect(() => {
    if (!on || st.lex) return;
    let alive = true;
    loadLex().then(l => { if (alive) setSt({ lex: l, err: null }); })
      .catch(() => { if (alive) setSt({ lex: null, err: "The word list didn’t load. Check your connection, then reload the page." }); });
    return () => { alive = false; };
  }, [on, st.lex]);
  return st;
}
const vocabCache = new WeakMap();
function vocabOf(lex) {
  if (vocabCache.has(lex)) return vocabCache.get(lex);
  const byLemma = {};
  lex.lemmas.forEach(([l], i) => { if (!(l in byLemma)) byLemma[l] = i; });
  const posOf = {};
  lex.ana.forEach(([li, pos]) => { if (!(li in posOf)) posOf[li] = pos; });
  const freq = {};
  lex.freq.forEach(([li, n, ref, ex, aid], i) => { freq[lex.lemmas[li][0]] = { rank: i + 1, n, ref, ex, aid }; });
  const V = { byLemma, posOf, freq, order: lex.freq.map(f => lex.lemmas[f[0]][0]), tokens: lex.tokens };
  vocabCache.set(lex, V);
  return V;
}
let vocabPromise = null;
function loadVocab() { if (!vocabPromise) vocabPromise = getJSON("data/vocab.json").catch(e => { vocabPromise = null; throw e; }); return vocabPromise; }
const DECKS = [["class", "My class list"], ["all", "All five texts"], ["nt", "New Testament"], ["st", "Summa"], ["se", "Sermons"], ["hy", "Hymns"], ["ps", "Psalms"],
  ["pp", "Principal parts"], ["tap", "Words I looked up"], ["mk", "My mistakes"]];
/* Words any student sitting the exam already knows; they are left out of the decks. */
const BASIC = new Set(("sum possum et in non ad cum de ex e ab a abs per pro sine sub super inter post ante apud propter ego tu nos vos is hic ille ipse iste idem " +
  "qui quis sui se suus meus tuus noster vester autem sed enim ergo igitur nam ut si quod quia quoniam sicut neque nec aut vel atque ac etiam iam nunc tunc ibi ubi " +
  "omnis unus deus dominus homo dico facio video uideo venio uenio do habeo eo fero volo uolo audio magnus bonus malus multus ecce amen nihil nemo que ne iesus christus " +
  "dies terra caelum filius pater mater vir uir mulier rex verbum uerbum spiritus").split(" "));
/* Build a deck as an ordered list of cards. Word cards share their schedule across decks (keyed by lemma). */
function buildDeck(deck, lex, V, vocab, prog, includeCommon) {
  const word = (lemma, ex) => {
    const li = V.byLemma[lemma];
    if (li === undefined || !lex.lemmas[li][1]) return null;
    const [, gloss, head] = lex.lemmas[li];
    const f = ex || V.freq[lemma];
    return { key: lemma, front: head || lemma, sub: POS_L[V.posOf[li]] || "", ex: f && f.ex, ref: f && f.ref, aid: f ? f.aid : -1, back: gloss };
  };
  // Third-year students know the commonest words: leave out the top 400 unless the student asks for them.
  const notBasic = l => !BASIC.has(l.toLowerCase()) && (includeCommon || !(V.freq[l] && V.freq[l].rank <= 400));
  if (deck === "all") return V.order.filter(notBasic).map(l => word(l)).filter(Boolean);
  // Part decks also skip the 150 commonest words overall (they are in "All five texts"), so each opens with that text's own vocabulary.
  if (PART_IDS.includes(deck)) return vocab ? vocab[deck].filter(([li]) => notBasic(lex.lemmas[li][0]) && !(V.freq[lex.lemmas[li][0]] && V.freq[lex.lemmas[li][0]].rank <= 150)).map(([li, n, ref, ex, aid]) => word(lex.lemmas[li][0], { ref, ex, aid })).filter(Boolean) : null;
  if (deck === "tap") return (prog.vtap || []).map(l => word(l)).filter(Boolean);
  if (deck === "class") {
    const cl = readClass();
    return (cl.words || []).map(([l, n, ref, ex, aid]) => {
      const inf = classInfo(l, lex, V, cl.own);
      if (!inf) return null;
      const base = V.byLemma[l] !== undefined ? word(l, { ref, ex, aid }) : null;
      return base ? { ...base, back: inf.full || base.back } : { key: l, front: inf.head, sub: "Your list", back: inf.full, aid: -1 };
    }).filter(Boolean);
  }
  if (deck === "pp") return V.order.filter(notBasic).map(l => { const li = V.byLemma[l]; const [, gloss, pp] = lex.lemmas[li]; return pp && /^V/.test(V.posOf[li]) && pp.includes(",") ? { key: "pp:" + l, front: l, sub: "Give all the principal parts", back: pp, extra: gloss, pp: true } : null; }).filter(Boolean);
  if (deck === "mk") return (prog.mistakes || []).slice().reverse().filter(m => m.latin && m.fix)
    .map(m => ({ key: "mk:" + m.ref + ":" + m.latin, front: m.latin, sub: `${ISSUE_TYPES[m.type] || "Mistake"} · ${m.ref}`, back: m.fix, extra: m.concept ? CONCEPTS[m.concept] : "", mk: true }));
  return [];
}
function pickCard(prog, cards, cur) {
  const now = Date.now(), vc = prog.vcards || {};
  const keys = new Set(cards.map(c => c.key));
  const byKey = Object.fromEntries(cards.map(c => [c.key, c]));
  const due = Object.entries(vc).filter(([k, c]) => keys.has(k) && k !== cur && c.due <= now).sort((a, b) => (a[1].box - b[1].box) || (a[1].due - b[1].due));
  if (due.length) return { card: byKey[due[0][0]], why: due[0][1].box === 0 ? "Back again: you didn’t know it last time." : "Due for review." };
  const i = cards.findIndex(c => !vc[c.key] && c.key !== cur);
  if (i >= 0) return { card: cards[i], why: cards[i].mk ? "A mistake from one of your checked translations." : cards[i].pp ? "New verb for principal parts." : `New card: number ${i + 1} in this deck, by frequency.` };
  const weak = Object.entries(vc).filter(([k]) => keys.has(k) && k !== cur).sort((a, b) => a[1].ema - b[1].ema)[0];
  return weak ? { card: byKey[weak[0]], why: "Nothing is due. Extra practice on a weaker card." } : null;
}
function Snippet({ text }) {
  return text.split(/\[\[|\]\]/).map((part, i) => i % 2 ? <mark key={i} className="rounded bg-rubrictint px-0.5 font-bold text-rubric">{part}</mark> : part);
}

function VocabMode({ prog, onGrade, deck, setDeck, includeCommon, setIncludeCommon, aiOn }) {
  const { lex, err } = useLex(true);
  const V = lex ? vocabOf(lex) : null;
  const [vocab, setVocab] = useState(null);
  const [verr, setVerr] = useState("");
  const [pick, setPick] = useState(null);
  const [shown, setShown] = useState(false);
  const [learn, setLearn] = useState(0);   // My class list: 0 = the list and quizzes, otherwise flashcards (the number rebuilds the deck)
  const keyRef = useRef(null);
  useEffect(() => {
    if (!PART_IDS.includes(deck) || vocab) return;
    let alive = true;
    loadVocab().then(v => { if (alive) setVocab(v); }).catch(() => { if (alive) setVerr("This deck didn’t load. Check your connection, then try again."); });
    return () => { alive = false; };
  }, [deck, vocab]);
  const cards = useMemo(() => (V ? buildDeck(deck, lex, V, vocab, prog, includeCommon) : null), [deck, V, vocab, includeCommon, deck === "tap" ? prog.vtap : null, deck === "mk" ? prog.mistakes : null, learn]);
  useEffect(() => { setPick(cards ? pickCard(prog, cards, null) : null); setShown(false); }, [cards]);

  function grade(k) {
    const next = onGrade(pick.card.key, k);
    setShown(false);
    setPick(pickCard(next, cards, pick.card.key));
  }
  keyRef.current = { shown, grade, reveal: () => setShown(true), has: !!(pick && pick.card) };
  useEffect(() => {
    const h = e => {
      const t = e.target && e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || t === "BUTTON") return;
      const r = keyRef.current;
      if (!r.has) return;
      if (!r.shown && (e.key === " " || e.key === "Enter")) { e.preventDefault(); r.reveal(); }
      else if (r.shown && ["1", "2", "3"].includes(e.key)) { e.preventDefault(); r.grade(["review", "partly", "got"][+e.key - 1]); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const deckPicker = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Deck">
        {DECKS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setDeck(k); setLearn(0); }} aria-pressed={deck === k}
            className={`rounded-md border px-2.5 py-1 text-[13px] ${deck === k ? "border-rubric bg-rubrictint font-semibold text-rubric" : "border-rule bg-leaf text-ink hover:border-soft"}`}>{l}</button>
        ))}
      </div>
      {deck !== "class" && <label htmlFor="vocab-common" className="flex items-center gap-2 text-[13px] text-soft">
        <input id="vocab-common" type="checkbox" checked={!!includeCommon} onChange={e => setIncludeCommon(e.target.checked)} className="h-4 w-4 accent-[var(--rubric)]" />
        Include the 400 commonest words (left out by default, since Latin 1–3 covered them)
      </label>}
      {deck === "class" && learn > 0 && <button type="button" className="self-start text-[14px] text-rubric underline underline-offset-2" onClick={() => setLearn(0)}>‹ My class list (quizzes, word list)</button>}
    </div>
  );
  if (deck === "class" && !learn) return <>{deckPicker}{lex ? <ClassVocab lex={lex} V={V} prog={prog} onGrade={onGrade} ai={aiOn} onLearn={() => setLearn(Date.now())} /> : <article className="rounded-lg border border-rule bg-leaf px-5 py-6 text-[15px] text-soft">{err || "Loading the word list…"}</article>}</>;
  if (!lex || !cards) return <>{deckPicker}<article className="rounded-lg border border-rule bg-leaf px-5 py-6 text-[15px] text-soft">{err || verr || "Loading the word list…"}</article></>;

  const vc = prog.vcards || {};
  const known = Object.entries(vc).filter(([k, c]) => c.box >= 2 && !k.includes(":"));
  const covered = known.reduce((s, [l]) => s + (V.freq[l] ? V.freq[l].n : 0), 0);
  const pct = V.tokens ? Math.round(covered / V.tokens * 100) : 0;
  const keys = new Set(cards.map(c => c.key));
  const due = Object.entries(vc).filter(([k, c]) => keys.has(k) && c.due <= Date.now()).length;
  const inDeck = cards.filter(c => vc[c.key] && vc[c.key].box >= 2).length;
  const empty = { class: "Add your class’s sections first (‹ My class list).", tap: "Words you tap in passages and drills will collect here.", mk: "Mistakes Claude marks in your checked translations will collect here, so you can re-test them." }[deck];

  if (!pick || !pick.card) return <>{deckPicker}<article className="rounded-lg border border-rule bg-leaf px-5 py-6 text-[15px] text-soft">{cards.length ? "You’ve been through this whole deck." : empty || "This deck is empty."}</article></>;
  const c = pick.card;
  const card = vc[c.key];
  return (
    <>
      {deckPicker}
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[14px] text-soft">
        <span><strong className="num font-semibold text-ink">{known.length}</strong> words known, covering <strong className="num font-semibold text-ink">{pct}%</strong> of the exam texts</span>
        <span>this deck: <strong className="num font-semibold text-ink">{inDeck}</strong> of {cards.length} known · <strong className="num font-semibold text-ink">{due}</strong> due</span>
      </div>

      <article className="rounded-lg border border-rule bg-leaf px-5 py-7 sm:px-8">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="smallcaps text-[14px] text-soft">{c.sub}</span>
          {card && <span className={`text-[13px] ${card.box >= 2 ? "text-ok" : card.box === 0 ? "text-warn" : "text-mid"}`}>{card.box >= 2 ? "Known" : card.box === 0 ? "Needs review" : "Learning"}</span>}
        </div>
        <p className="mb-3 text-[13px] italic text-soft">{pick.why}</p>
        <p lang="la" className="latin text-[2rem] font-bold leading-tight text-ink">{c.front}</p>
        {c.ex && (
          <p lang="la" className="latin mt-4 text-[1.05rem] leading-relaxed text-ink">
            <Snippet text={c.ex} /> <span className="whitespace-nowrap text-[13px] not-italic text-soft">({c.ref})</span>
          </p>
        )}
        {shown ? (
          <div className="reveal mt-5 border-l-2 border-rubric pl-3">
            <p className="text-[1.1rem] leading-snug text-ink">{c.pp ? <span lang="la" className="latin">{c.back}</span> : c.back}</p>
            {c.extra && <p className="mt-1 text-[14px] text-soft">{c.extra}</p>}
            {c.ex && c.aid != null && c.aid >= 0 && (() => {
              const d = describe(lex, c.aid);
              const form = (c.ex.match(/\[\[(.+?)\]\]/) || [])[1];
              return d.parse && form ? <p className="mt-1 text-[14px] text-soft">In the example, <span lang="la" className="latin font-bold text-ink">{form}</span> here: {d.parse.replace(" · ", ", ")}.</p> : null;
            })()}
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Btn variant="primary" onClick={() => setShown(true)}>{c.pp ? "Show principal parts" : c.mk ? "Show the correction" : "Show meaning"}</Btn>
            {!c.mk && <Btn onClick={() => grade("know")} title="Mark as known and skip it for five weeks">I know this already</Btn>}
            <span className="ml-1 hidden text-[13px] text-soft sm:inline">Space shows the answer</span>
          </div>
        )}
      </article>

      {shown && (
        <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-4">
          <span className="mr-1 text-[15px] text-soft">Did you know it?</span>
          <Btn variant="warn" onClick={() => grade("review")}>↻ Didn’t know</Btn>
          <Btn variant="mid" onClick={() => grade("partly")}>~ Roughly</Btn>
          <Btn variant="ok" onClick={() => grade("got")}>✓ Knew it</Btn>
          <span className="ml-auto hidden text-[13px] text-soft sm:inline">Keys 1 · 2 · 3</span>
        </div>
      )}
      <p className="text-[13px] text-soft">Each deck is ordered by how often its words appear in that text, so the first few hundred cover most of what you’ll meet. A word you know in one deck counts as known in all of them.</p>
    </>
  );
}

/* Adaptive passage choice within one exam part: due reviews first, then an unseen passage
   whose difficulty gives about a 65% chance of success, favouring your weakest grammar. */
function pickPassage(prog, part, idx, curKey, blind) {
  const now = Date.now();
  const codes = new Set(partBooks(part).map(b => b[0]));
  const due = Object.entries(prog.pcards || {}).filter(([k, c]) => c.due <= now && k !== curKey && codes.has(k.split(".")[0]))
    .sort((a, b) => (a[1].box - b[1].box) || (a[1].due - b[1].due));
  if (due.length) return { key: due[0][0], why: due[0][1].box === 0 ? "Back for another try: you marked it Needs Review." : "Due for review, to keep it fresh." };
  const a = (prog.ability || {})[part] || ABIL0;
  let best = null, bs = -1e9;
  (idx[part] || []).forEach(r => {
    const key = `${r[0]}.${r[1]}.${r[2]}`;
    if ((prog.pcards || {})[key] || key === curKey) return;
    const d = r[3] / 100, p = pSuccess(a.t, d);
    const tags = r[4] ? r[4].split(",") : [];
    const weak = tags.length ? tags.reduce((s, t) => s + (1 - (prog.skill[t] ? prog.skill[t].s : 0.5)), 0) / tags.length : 0.5;
    const sc = -Math.abs(p - 0.65) * 4 + weak * 0.8 + Math.random() * 0.5 - (blind && familiar(r[0], r[1]) ? 1.5 : 0);
    if (sc > bs) { bs = sc; best = { key, d: r[3], p, tags }; }
  });
  if (!best) return null;
  const w = best.tags.length ? weakestTag(prog, best.tags) : null;
  return { key: best.key, why: `${diffWord(best.d)} passage, matched to your level${a.n >= 3 ? ` (about ${Math.round(best.p * 100)}% expected success)` : ""}${w ? `; practises ${CONCEPTS[w].toLowerCase()}` : ""}.` };
}
