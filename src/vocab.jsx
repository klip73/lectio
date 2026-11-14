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
const DECKS = [["due", "Due now"], ["course", "Course words"], ["class", "My class list"], ["past", "Past class words"], ["all", "All five texts"], ["nt", "New Testament"], ["st", "Summa"], ["se", "Sermons"], ["hy", "Hymns"], ["ps", "Psalms"],
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
  if (deck === "course") return courseDeck();
  if (deck === "tap") return (prog.vtap || []).map(l => word(l)).filter(Boolean);
  /* every card that is due, from any deck (words and principal parts) */
  if (deck === "due") {
    const now = Date.now();
    return Object.entries(prog.vcards || {}).filter(([k, c]) => c.due <= now).sort((a, b) => a[1].due - b[1].due).map(([k]) => {
      if (k.startsWith("pp:")) { const l = k.slice(3), li = V.byLemma[l]; if (li === undefined) return null; const [, gloss, pp] = lex.lemmas[li]; return pp ? { key: k, front: l, sub: "Give all the principal parts", back: pp, extra: gloss, pp: true } : null; }
      if (k.startsWith("co:")) return courseWords()[k] || null;
      if (k.includes(":")) return null;
      const w = word(k);
      if (w) return w;
      const cl = readClass(), inf = classInfo(k, lex, V, cl.own);
      return inf ? { key: k, front: inf.head, sub: "Your list", back: inf.full, aid: -1 } : null;
    }).filter(Boolean);
  }
  if (deck === "class") {
    const cl = readClass();
    return (cl.words || []).map(([l, n, ref, ex, aid]) => {
      const inf = classInfo(l, lex, V, cl.own);
      if (!inf) return null;
      const base = V.byLemma[l] !== undefined ? word(l, { ref, ex, aid }) : null;
      return base ? { ...base, back: inf.full || base.back } : { key: l, front: inf.head, sub: "Your list", back: inf.full, aid: -1 };
    }).filter(Boolean);
  }
  if (deck === "past") {
    const cl = readClass();
    return Object.keys(cl.past || {}).map(l => {
      const inf = classInfo(l, lex, V, cl.own);
      if (!inf) return null;
      const base = V.byLemma[l] !== undefined ? word(l) : null;
      return base ? { ...base, back: inf.full || base.back, sub: "Past class words" } : { key: l, front: inf.head, sub: "Past class words", back: inf.full, aid: -1 };
    }).filter(Boolean);
  }
  if (deck === "pp") return V.order.filter(notBasic).map(l => { const li = V.byLemma[l]; const [, gloss, pp] = lex.lemmas[li]; return pp && /^V/.test(V.posOf[li]) && pp.includes(",") ? { key: "pp:" + l, front: l, sub: "Give all the principal parts", back: pp, extra: gloss, pp: true } : null; }).filter(Boolean);
  if (deck === "mk" || deck.startsWith("mk:")) return (prog.mistakes || []).slice().reverse().filter(m => m.latin && m.fix)
    .filter(m => deck === "mk" || deck === "mk:" + (m.concept ? "c:" + m.concept : "t:" + m.type))
    .map(m => ({ key: "mk:" + m.ref + ":" + m.latin, front: m.latin, sub: `${ISSUE_TYPES[m.type] || "Mistake"} · ${m.ref}`, back: m.fix, extra: m.concept ? CONCEPTS[m.concept] : "", mk: true }));
  return [];
}
function pickCard(prog, cards, cur) {
  const now = Date.now(), vc = prog.vcards || {};
  const keys = new Set(cards.map(c => c.key));
  const byKey = Object.fromEntries(cards.map(c => [c.key, c]));
  /* Settings → Flashcards: new words and reviews a day (0: no limit). A card failed today ("Again") always comes back. */
  const today = srsToday(), newCap = getSet("newPerDay"), revCap = getSet("revCap");
  const revOk = !revCap || today.r < revCap, newOk = !newCap || today.n < newCap;
  const due = Object.entries(vc).filter(([k, c]) => keys.has(k) && k !== cur && c.due <= now && (revOk || c.ivl === 0)).sort((a, b) => (a[1].box - b[1].box) || (a[1].due - b[1].due));
  if (due.length) return { card: byKey[due[0][0]], why: due[0][1].box === 0 ? "Back again: you didn’t know it last time." : "Due for review." };
  const i = newOk ? cards.findIndex(c => !vc[c.key] && c.key !== cur) : -1;
  if (!newOk && cards.some(c => !vc[c.key])) return { card: null, limit: "new", n: newCap };
  if (!revOk && Object.entries(vc).some(([k, c]) => keys.has(k) && c.due <= now)) return { card: null, limit: "rev", n: revCap };
  if (i >= 0) return { card: cards[i], why: cards[i].mk ? "A mistake from one of your checked translations." : cards[i].pp ? "New verb for principal parts." : cards[i].key.startsWith("co:") ? `New word from your course (${i + 1} of ${cards.length}).` : `New card: number ${i + 1} in this deck, by frequency.` };
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
  const [typed, setTyped] = useState("");   // Settings → Answering: type the answer
  const [tres, setTres] = useState(null);   // { ok, want }
  const S = useSettings();
  const keyRef = useRef(null);
  useEffect(() => {
    if (!PART_IDS.includes(deck) || vocab) return;
    let alive = true;
    loadVocab().then(v => { if (alive) setVocab(v); }).catch(() => { if (alive) setVerr("This deck didn’t load. Check your connection, then try again."); });
    return () => { alive = false; };
  }, [deck, vocab]);
  const cards = useMemo(() => (V ? buildDeck(deck, lex, V, vocab, prog, includeCommon) : null), [deck, V, vocab, includeCommon, deck === "tap" ? prog.vtap : null, deck === "mk" ? prog.mistakes : null, learn]);
  useEffect(() => { setPick(cards ? pickCard(prog, cards, null) : null); setShown(false); setTyped(""); setTres(null); }, [cards, S.newPerDay, S.revCap]);

  const progRef0 = useRef(prog); progRef0.current = prog;
  const curRel = useRel(pick && pick.card && !pick.card.key.includes(":") ? [pick.card.key] : []);
  function grade(k) {
    const key = pick.card.key, was = (progRef0.current.vcards || {})[key];
    if (k !== "know") { if (!was) srsCount("n"); else if (was.due <= Date.now()) srsCount("r"); }
    const next = onGrade(key, k, key.includes(":") ? undefined : wordDiff(key, V, curRel));
    setShown(false); setTyped(""); setTres(null);
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
      else if (r.shown && ["1", "2", "3", "4"].includes(e.key)) { e.preventDefault(); r.grade(["review", "partly", "got", "easy"][+e.key - 1]); }
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
  if (deck === "class" && !learn) return <>{deckPicker}{lex ? <ClassVocab lex={lex} V={V} prog={prog} onGrade={onGrade} ai={aiOn} onLearn={() => setLearn(Date.now())} onPast={() => setDeck("past")} /> : <article className="rounded-lg border border-rule bg-leaf px-5 py-6 text-[15px] text-soft">{err || "Loading the word list…"}</article>}</>;
  if (!lex || !cards) return <>{deckPicker}<article className="rounded-lg border border-rule bg-leaf px-5 py-6 text-[15px] text-soft">{err || verr || "Loading the word list…"}</article></>;

  const vc = prog.vcards || {};
  const known = Object.entries(vc).filter(([k, c]) => c.box >= 2 && !k.includes(":"));
  const covered = known.reduce((s, [l]) => s + (V.freq[l] ? V.freq[l].n : 0), 0);
  const pct = V.tokens ? Math.round(covered / V.tokens * 100) : 0;
  const level = prog.vtheta != null ? vocabEstimate(prog, V, null) : 0;
  const keys = new Set(cards.map(c => c.key));
  const due = Object.entries(vc).filter(([k, c]) => keys.has(k) && c.due <= Date.now()).length;
  const inDeck = cards.filter(c => vc[c.key] && vc[c.key].box >= 2).length;
  const empty = { due: "Nothing is due right now. Pick a deck to learn new words.", class: "Add your class’s sections first (‹ My class list).", past: "When you clear a week’s sections, their words move here for review.", tap: "Words you tap in passages and drills will collect here.", mk: "Mistakes Claude marks in your checked translations will collect here, so you can re-test them." }[deck];

  if (pick && pick.limit) return <>{deckPicker}<article className="flex flex-col gap-2 rounded-lg border border-rule bg-leaf px-5 py-6 text-[15px] text-ink">
    <p>{pick.limit === "new" ? `That’s today’s ${pick.n} new words${due ? `, and no reviews are due in this deck` : ""}. More tomorrow.` : `That’s today’s ${pick.n} reviews. The rest wait for tomorrow.`}</p>
    <p className="text-[13px] text-soft">The daily limits are in Settings (the ⚙ button at the top) → Flashcards &amp; study.</p></article></>;
  if (!pick || !pick.card) return <>{deckPicker}<article className="rounded-lg border border-rule bg-leaf px-5 py-6 text-[15px] text-soft">{cards.length ? "You’ve been through this whole deck." : empty || "This deck is empty."}</article></>;
  const c = pick.card;
  const card = vc[c.key];
  /* Settings → Card direction: English → Latin for plain word cards (both: alternating, by the card's reviews) */
  const plainWord = !c.pp && !c.mk;
  const rev = plainWord && (S.dir === "en" || (S.dir === "both" && ((card ? card.n : 0) + c.key.length) % 2 === 1));
  /* Settings → Answering: type the answer; checked loosely, and you still choose how well you knew it */
  function checkTyped() {
    const a = typed.trim();
    if (!a) return;
    let ok;
    if (rev) {
      const want = (c.front.split(/[,(]/)[0] || "").trim(), g = a.split(/[,\s]+/)[0];
      ok = (MORPH.norm(g) === MORPH.norm(want) || MORPH.norm(g) === MORPH.norm(c.key)) && ansStrictOk(g, want);
    } else if (c.pp) {
      const want = c.back.split(",").map(x => x.trim()).filter(Boolean).slice(1), got = a.split(/[,\s]+/).map(x => x.trim()).filter(Boolean);
      ok = want.length > 0 && want.every(w => got.some(g => MORPH.norm(g) === MORPH.norm(w.replace(/ sum$/, "")) && ansStrictOk(g, w)));
    } else ok = meaningOk(a, c.back + " " + (c.extra || ""));
    setTres({ ok }); setShown(true);
  }
  const kw = c.key.includes(":") ? null : knowWord(prog, c.key, V, curRel);
  return (
    <>
      {deckPicker}
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-[14px] text-soft">
        <span><strong className="num font-semibold text-ink">{known.length}</strong> words known, covering <strong className="num font-semibold text-ink">{pct}%</strong> of the exam texts</span>
        {prog.vtheta != null && <span title="Estimated from your first answers on new words and your reviews">your level: about <strong className="num font-semibold text-ink">{level}</strong> of the commonest words</span>}
        <span>this deck: <strong className="num font-semibold text-ink">{inDeck}</strong> of {cards.length} known · <strong className="num font-semibold text-ink">{due}</strong> due</span>
      </div>

      <article className="rounded-lg border border-rule bg-leaf px-5 py-7 sm:px-8">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="smallcaps text-[14px] text-soft">{c.sub}</span>
          {card ? <span className={`text-[13px] ${card.box >= 2 ? "text-ok" : card.box === 0 ? "text-warn" : "text-mid"}`}>{card.box >= 2 ? "Known" : card.box === 0 ? "Needs review" : "Learning"}{kw ? ` · ${Math.round(kw.p * 100)}% recall now` : ""}{card.ivl != null ? ` · every ${fmtIvl(card.ivl)}` : ""}</span>
            : kw ? <span className="text-[13px] text-soft" title="Estimated from your level and how common the word is">New · {kw.p > 0.85 ? "you probably know it" : kw.p > 0.5 ? "you may know it" : "probably new to you"}</span> : null}
        </div>
        <p className="mb-3 text-[13px] italic text-soft">{pick.why}</p>
        {rev ? <p className="text-[1.5rem] font-semibold leading-snug text-ink">{shortGloss(c.back) || c.back}<span className="mt-1 block text-[13px] font-normal text-soft">Give the Latin{S.typed ? "" : ", then show it"}</span></p>
          : <p lang="la" className="latin text-[2rem] font-bold leading-tight text-ink">{c.front}</p>}
        {c.ex && (!rev || shown) && (
          <p lang="la" className="latin mt-4 text-[1.05rem] leading-relaxed text-ink">
            <Snippet text={c.ex} /> <span className="whitespace-nowrap text-[13px] not-italic text-soft">({c.ref})</span>
          </p>
        )}
        {shown ? (
          <div className="reveal mt-5 border-l-2 border-rubric pl-3">
            {tres && <p className={`mb-1 text-[14px] font-semibold ${tres.ok ? "text-ok" : "text-warn"}`}>{tres.ok ? "✓ That matches." : "✗ Not quite: compare with the answer."} <span className="font-normal text-soft">You wrote “{typed.trim()}”.</span></p>}
            {rev ? <p lang="la" className="latin text-[1.5rem] font-bold leading-tight text-ink">{c.front}</p>
              : <p className="text-[1.1rem] leading-snug text-ink">{c.pp ? <span lang="la" className="latin">{c.back}</span> : c.back}</p>}
            {rev && <p className="mt-1 text-[15px] leading-snug text-ink">{c.back}</p>}
            {c.extra && <p className="mt-1 text-[14px] text-soft">{c.extra}</p>}
            {!c.key.includes(":") && <div className="mt-2"><RelatedWords lemma={c.key} compact /></div>}
            {c.ex && c.aid != null && c.aid >= 0 && (() => {
              const d = describe(lex, c.aid);
              const form = (c.ex.match(/\[\[(.+?)\]\]/) || [])[1];
              return d.parse && form ? <p className="mt-1 text-[14px] text-soft">In the example, <span lang="la" className="latin font-bold text-ink">{form}</span> here: {d.parse.replace(" · ", ", ")}.</p> : null;
            })()}
          </div>
        ) : S.typed ? (
          <div className="mt-5 flex flex-col gap-2">
            <label htmlFor="vc-typed" className="text-[14px] text-soft">{rev ? "The Latin word" : c.pp ? "The other principal parts" : c.mk ? "The right English" : "The meaning"}</label>
            <div className="flex flex-wrap items-center gap-2">
              <input id="vc-typed" lang={rev || c.pp ? "la" : "en"} value={typed} onChange={e => setTyped(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); checkTyped(); } }}
                autoComplete="off" autoCapitalize="off" spellCheck={false} className="min-w-0 flex-1 basis-48 rounded-md border border-rule bg-paper px-3 py-2 text-[16px] text-ink" />
              <Btn variant="primary" onClick={checkTyped} disabled={!typed.trim()}>Check</Btn>
              <Btn onClick={() => setShown(true)}>Show</Btn>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Btn variant="primary" onClick={() => setShown(true)}>{c.pp ? "Show principal parts" : c.mk ? "Show the correction" : rev ? "Show the Latin" : "Show meaning"}</Btn>
            {!c.mk && <Btn onClick={() => grade("know")} title="Mark as known and skip it for five weeks">I know this already</Btn>}
            <span className="ml-1 hidden text-[13px] text-soft sm:inline">Space shows the answer</span>
          </div>
        )}
      </article>

      {shown && (
        <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-4">
          <span className="mr-1 text-[15px] text-soft">How well?</span>
          {[["review", "Again", "warn"], ["partly", "Hard", "mid"], ["got", "Good", "ok"], ["easy", "Easy", "ok"]].map(([k, l, v]) => (
            <Btn key={k} variant={v} onClick={() => grade(k)} title={`Next review in ${srsPreview(card, k)}`}>
              <span className="flex flex-col items-center leading-tight"><span>{l}</span><span className="text-[11px] font-normal opacity-80">{srsPreview(card, k)}</span></span>
            </Btn>
          ))}
          <span className="ml-auto hidden text-[13px] text-soft sm:inline">Keys 1 · 2 · 3 · 4</span>
        </div>
      )}
      <QuickSort cards={cards} prog={prog} V={V} onGrade={onGrade} />
      <ExportMenu rows={cards.filter(c => !c.mk).map(c => ({ la: c.front, entry: c.pp ? c.back : (V.byLemma[c.key] !== undefined && lex.lemmas[V.byLemma[c.key]][2]) || c.front, en: c.pp ? (c.extra || "") : c.back, pos: c.sub, ex: c.ex, ref: c.ref, known: vc[c.key] ? (vc[c.key].box >= 2 ? "known" : "learning") : "" }))}
        name={"lectio-" + deck} title={"Lectio Vulgata: " + ((DECKS.find(d => d[0] === deck) || [0, deck])[1])} tags={deck} />
      <p className="text-[13px] text-soft">Each deck is ordered by how often its words appear in that text, so the first few hundred cover most of what you’ll meet. A word you know in one deck counts as known in all of them. The four answers work as in Anki: under each is when the word comes back; a word you find easy comes back later and later, one you miss comes back in ten minutes.</p>
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

/* Quick sort: the next new words of a deck that the student very probably knows, on one screen. He taps the ones he
   doesn't know; the rest are marked known (back in five weeks), the tapped ones go first in the deck. */
function QuickSort({ cards, prog, V, onGrade }) {
  const [open, setOpen] = useState(false);
  const [miss, setMiss] = useState({});
  const [done, setDone] = useState("");
  const vc = prog.vcards || {};
  const fresh = (cards || []).filter(c => !c.key.includes(":") && !vc[c.key]).slice(0, 200);
  const rel = useRel(open ? fresh.map(c => c.key) : []);
  const likely = fresh.map(c => ({ c, p: knowWord(prog, c.key, V, rel).p })).filter(x => x.p >= 0.6).slice(0, 24);
  if (!fresh.length) return null;
  if (!open) return (
    <div className="flex flex-wrap items-center gap-2 text-[14px] text-soft">
      {done && <span className="text-ok">{done}</span>}
      <button type="button" className="text-rubric underline underline-offset-2" onClick={() => { setOpen(true); setMiss({}); setDone(""); }}>Quick sort: clear the new words you already know</button>
    </div>
  );
  function finish() {
    let n = 0;
    likely.forEach(({ c }) => { if (miss[c.key]) onGrade(c.key, "review", wordDiff(c.key, V, rel)); else { onGrade(c.key, "know", wordDiff(c.key, V, rel)); n++; } });
    setOpen(false); setDone(`${n} marked known; ${Object.keys(miss).length} kept for learning.`);
  }
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Quick sort">
      <p className="text-[14px] leading-snug text-ink">These are the next new words in this deck that you very probably know. <b>Tap the ones you don’t know</b> (or aren’t sure of); the rest will be marked known and come back in five weeks for a check.</p>
      {likely.length === 0 ? <p className="text-[14px] text-soft">No likely-known words left here: learn the next ones with the cards.</p> : (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {likely.map(({ c }) => (
            <li key={c.key}><button type="button" aria-pressed={!!miss[c.key]} onClick={() => setMiss(m => { const x = { ...m }; if (x[c.key]) delete x[c.key]; else x[c.key] = 1; return x; })}
              className={`flex w-full items-baseline gap-2 rounded-md border px-3 py-1.5 text-left ${miss[c.key] ? "border-warn bg-warntint" : "border-rule bg-paper"}`}>
              <span lang="la" className="latin font-bold text-ink">{c.front}</span><span className="truncate text-[13px] text-soft">{shortGloss(c.back)}</span>
              {miss[c.key] && <span className="ml-auto text-[12px] text-warn">learn</span>}
            </button></li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {likely.length > 0 && <Btn variant="primary" onClick={finish}>Done: mark {likely.length - Object.keys(miss).length} known</Btn>}
        <Btn onClick={() => setOpen(false)}>Cancel</Btn>
      </div>
    </section>
  );
}
