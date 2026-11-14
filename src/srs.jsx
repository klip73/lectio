/* ---------- Spaced repetition for words, Anki-style, and a model of how well a student knows each word ----------
   Four answers, as in Anki: Again · Hard · Good · Easy. Each word card keeps an interval (days) and an ease (how fast the
   interval grows, 1.3–3.0, starting at 2.5: the SM-2 scheme Anki uses). The buttons show where each answer would send the
   card next, so a student can slide a word as far as he really knows it.
   Cards made before this (box 0–5 only) carry on: their interval and ease are read from the box the first time.
   How well a word is known:
   - a word seen before: the chance of recalling it now, from the time since its last review and its interval
     (memory decays so that recall is about 90% when a card falls due);
   - a word never seen: a prediction from the student's level and the word's difficulty (an Elo-style estimate,
     updated by every first answer on a new word), so words he almost certainly knows can be cleared quickly. */
const SRS_EASE0 = 2.5, SRS_EMIN = 1.3, SRS_EMAX = 3.2;
const MIN = 6e4;
function srsBase(c) {
  if (!c) return { box: 0, n: 0, ema: null, ease: SRS_EASE0, ivl: 0, lapses: 0, last: 0, due: 0 };
  const ivl = c.ivl != null ? c.ivl : (c.n ? INTERVALS[Math.max(0, Math.min(5, c.box || 0))] / DAY : 0);
  return { ...c, ease: c.ease || SRS_EASE0, ivl, lapses: c.lapses || 0 };
}
const boxOf = ivl => ivl <= 0.01 ? 0 : ivl < 1 ? 1 : ivl < 3 ? 2 : ivl < 7 ? 3 : ivl < 16 ? 4 : 5;
/* The next state of a card after an answer: "again" | "hard" | "good" | "easy" (old names: review, partly, got). */
function srsNext(c0, ans, now = Date.now(), fuzz = true) {
  const a = { review: "again", partly: "hard", got: "good" }[ans] || ans;
  const c = srsBase(c0);
  const fresh = !c.n;
  let { ease, ivl, lapses } = c;
  // a card answered early (before it was due) only gets credit for the time that really passed
  const elapsed = c.last ? Math.max(0, (now - c.last) / DAY) : 0;
  const eff = !fresh && c.due > now && ivl > 0 ? Math.max(elapsed, ivl * 0.5) : ivl;
  let next;
  if (a === "again") { next = 0; ease = Math.max(SRS_EMIN, ease - 0.2); if (!fresh && ivl >= 1) lapses++; }
  else if (a === "hard") { next = fresh ? 0.5 : Math.max(1, eff * 1.2); ease = Math.max(SRS_EMIN, ease - 0.15); }
  else if (a === "good") { next = fresh ? 1 : ivl < 1 ? 1 : ivl < 2.5 ? 3 : Math.max(eff * ease, ivl + 1); }
  else { next = fresh ? 4 : Math.max(eff * ease * 1.3, ivl + 2); ease = Math.min(SRS_EMAX, ease + 0.15); }
  /* Settings → How well to remember: shorter intervals for 95%, longer for 85% (fresh cards' first steps stay as they are) */
  if (!fresh && next >= 1) next = Math.max(1, next * retentionFactor());
  if (fuzz && next >= 3) next = next * (0.95 + Math.random() * 0.1);
  next = Math.min(next, 365 * 2);
  const score = { again: 0, hard: 0.5, good: 1, easy: 1 }[a];
  return {
    box: boxOf(next), n: c.n + 1, last: now, due: now + (next > 0 ? next * DAY : 10 * MIN),
    ema: c.ema == null ? score : +(c.ema * 0.6 + score * 0.4).toFixed(3),
    ease: +ease.toFixed(2), ivl: +next.toFixed(2), lapses
  };
}
function fmtIvl(days) {
  if (days <= 0.01) return "10 min";
  if (days < 1) return Math.round(days * 24) + " h";
  if (days < 30) return Math.round(days) + " d";
  if (days < 365) return (Math.round(days / 3) / 10).toFixed(1).replace(/\.0$/, "") + " mo";
  return (days / 365).toFixed(1).replace(/\.0$/, "") + " yr";
}
const srsPreview = (c, ans) => fmtIvl(srsNext(c, ans, Date.now(), false).ivl);
/* Chance of recalling a reviewed card now (FSRS-style forgetting curve: 90% when due). */
function recallNow(c, now = Date.now()) {
  if (!c || !c.n) return null;
  const b = srsBase(c);
  if (b.ivl <= 0.01) return 0.35;
  const t = Math.max(0, (now - (b.last || now)) / DAY);
  const S = b.ivl / retentionFactor();   // days to 90% recall, whatever retention the intervals were set for
  return Math.pow(1 + (t / S) * (Math.pow(0.9, -2) - 1), -0.5);
}

/* ----- the student's level and each word's difficulty ----- */
/* Difficulty on a log-frequency scale (rank 10 ≈ 1, 100 ≈ 2, 1000 ≈ 3, 10 000 ≈ 4), easier when the word has
   an English look-alike, harder when long or (for verbs) with irregular principal parts. */
function wordDiff(lemma, V, rel) {
  const f = V && V.freq[lemma];
  let b = Math.log10((f ? f.rank : 15000) + 10);
  const r = rel && rel[lemma];
  if (r && ((r.c && r.c.en) || r.d)) b -= 0.45;
  else if (r && r.c && Object.keys(r.c).length >= 2) b -= 0.25;
  if (lemma.length > 9) b += 0.15;
  return +b.toFixed(2);
}
const THETA0 = 3.0;   // after Latin 1–3: knows most of the commonest thousand words
const pKnow = (theta, b) => 1 / (1 + Math.exp(-2.2 * ((theta == null ? THETA0 : theta) - b)));
/* Update the level from a first answer on a word never seen before. */
function updateTheta(theta, b, ok) {
  const t = theta == null ? THETA0 : theta, p = pKnow(t, b);
  return +(t + 0.25 * ((ok ? 1 : 0) - p)).toFixed(3);
}
/* How well a word is known, 0–1, and whether that is measured (from reviews) or estimated. */
function knowWord(prog, lemma, V, rel) {
  const c = (prog.vcards || {})[lemma];
  const r = recallNow(c);
  if (r != null) return { p: r, measured: true, card: c };
  return { p: pKnow(prog.vtheta, wordDiff(lemma, V, rel)), measured: false };
}
/* "Hardness" for ordering a list, 0 (easy for this student) – 1 (hard): what he's likely to forget soonest, then
   lapses, then the word's own difficulty. */
function hardness(prog, lemma, V, rel) {
  const k = knowWord(prog, lemma, V, rel);
  const c = k.card ? srsBase(k.card) : null;
  const lap = c ? Math.min(1, c.lapses / 4) : 0;
  const ease = c ? (SRS_EASE0 - c.ease) / 1.2 : 0;
  return Math.max(0, Math.min(1, (1 - k.p) * 0.7 + lap * 0.15 + ease * 0.1 + (wordDiff(lemma, V, rel) - 1) / 4 * 0.15));
}
/* A rough vocabulary size: the commonest words of the exam texts he is likely to know (sum of probabilities). */
function vocabEstimate(prog, V, rel) {
  if (!V) return 0;
  let s = 0;
  V.order.slice(0, 6000).forEach(l => { s += knowWord(prog, l, V, rel).p; });
  return Math.round(s / 50) * 50;
}

/* ----- related words (synonyms, antonyms, words from the same root in other languages): data/rel/<letter>.json ----- */
const relShards = {};
const relKey = l => n1(String(l || "")).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "").slice(0, 1) || "_";
function relGet(lemma) {
  const k = relKey(lemma);
  relShards[k] = relShards[k] || getJSON((REMOTE_V ? APP_SITE : "") + "data/rel/" + k + ".json").catch(e => { delete relShards[k]; return {}; });
  return relShards[k].then(d => d[lemma] || null);
}
/* Several lemmas at once (for a word list): { lemma: rec } */
async function relMany(lemmas) {
  const out = {};
  await Promise.all([...new Set(lemmas.map(relKey))].map(k => {
    relShards[k] = relShards[k] || getJSON((REMOTE_V ? APP_SITE : "") + "data/rel/" + k + ".json").catch(e => { delete relShards[k]; return {}; });
    return relShards[k];
  }));
  for (const l of lemmas) { const d = await relShards[relKey(l)]; if (d && d[l]) out[l] = d[l]; }
  return out;
}
function useRel(lemmas) {
  const [rel, setRel] = useState({});
  const key = (lemmas || []).join("|");
  useEffect(() => { let on = true; if (lemmas && lemmas.length) relMany(lemmas).then(r => on && setRel(r)).catch(() => {}); return () => { on = false; }; }, [key]);
  return rel;
}
const REL_LANG = { en: "English", it: "Italian", es: "Spanish", fr: "French", pt: "Portuguese", ro: "Romanian" };
/* The related-words box, under a word's meaning. */
function RelatedWords({ lemma, onWord, compact }) {
  const [r, setR] = useState(undefined);
  useEffect(() => { let on = true; setR(undefined); relGet(lemma).then(x => on && setR(x)).catch(() => on && setR(null)); return () => { on = false; }; }, [lemma]);
  if (r === undefined) return null;
  if (!r) return compact ? null : <p className="text-[13px] text-soft">No related words found for this one.</p>;
  const la = (ws, label) => ws && ws.length ? (
    <p className="text-[14px] leading-snug text-ink"><span className="text-soft">{label}: </span>
      {ws.map((w, i) => <React.Fragment key={w}>{i ? ", " : ""}{onWord ? <button type="button" lang="la" className="latin text-rubric underline decoration-rubrictint underline-offset-2 hover:decoration-rubric" onClick={() => onWord(w)}>{w}</button> : <span lang="la" className="latin">{w}</span>}</React.Fragment>)}
    </p>) : null;
  const langs = Object.entries(r.c || {});
  return (
    <div className="flex flex-col gap-1">
      {la(r.s, "Similar meaning")}
      {la(r.a, "Opposite")}
      {(langs.length > 0 || r.d) && (
        <p className="text-[14px] leading-snug text-ink"><span className="text-soft">From the same root: </span>
          {langs.map(([k, ws], i) => <span key={k}>{i ? " · " : ""}<span className="text-soft">{REL_LANG[k]}</span> <span lang={k}>{ws.join(", ")}</span></span>)}
          {r.d && <span>{langs.length ? " · " : ""}<span className="text-soft">English, related</span> <span lang="en">{r.d.join(", ")}</span></span>}
        </p>
      )}
      {r.g && <p className="text-[14px] text-ink"><span className="text-soft">Cognate (Lewis &amp; Short): </span><span lang="grc">{r.g.replace(/^Greek /, "Greek ")}</span></p>}
      {!compact && <p className="text-[11px] leading-snug text-soft">Matched through the words’ English meanings (Open Multilingual Wordnet, Open English WordNet): a guide, not a dictionary. Words of “similar meaning” share a sense, not every sense.</p>}
    </div>
  );
}
