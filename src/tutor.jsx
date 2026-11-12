/* ---------- Tutor: Claude marks mistakes on screen ---------- */
const ISSUE_TYPES = {
  tense: "Tense", mood: "Mood", voice: "Voice", number: "Person / number", case: "Case & syntax",
  agreement: "Agreement", vocab: "Vocabulary", omission: "Left out", addition: "Added", sense: "Sense", idiom: "Idiom"
};
const FB_KEY = "lectio-vulgata-feedback";
const TUTOR_KEY = "lectio-vulgata-tutor";
/* Compare translations ignoring case, punctuation and spacing, so trivial edits never cost a new check. */
const normText = t => (t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
let samplePromise = null;
function getSample() {
  if (!samplePromise) {
    samplePromise = (window.claude && window.claude.use ? window.claude.use("sample") : Promise.resolve(null)).catch(() => null)
      .then(sm => sm || (hasAiKey() ? aiSample() : null));
  }
  return samplePromise;
}
const TUTOR_OFF = ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"];
function tutorErrorText(code, detail) {
  detail = typeof detail === "string" ? detail.replace(/\s+/g, " ").trim().slice(0, 220) : "";
  if (TUTOR_OFF.includes(code)) return "Mistake marking is turned off for this page, so only the key-word check is shown.";
  if (code === "rate_limited") return window.claude && window.claude.use ? "You’ve reached your Claude usage limit for now. Try again later." : "Today’s free AI allowance is used up. It resets overnight." + (hasGroqKey() ? "" : " A free Groq key as a backup adds about a thousand a day (Skill map & backup → AI marking).");
  if (code === "bad_key" && /free tier|billing|FREE_TIER/i.test(detail)) return "Google has switched off its free tier for this key’s project (“Free tier unavailable” in AI Studio). It’s an account flag on Google’s side, not the key. Fixes: verify your age in your Google Account, then make a key in a new project, or make one with a different Google account.";
  if (code === "bad_key") return "Google didn’t accept your Gemini key for marking." + (detail ? ` Google says: “${detail}”` : "") + " Check it in Skill map & backup → AI marking.";
  if (code === "failed" && detail) return `The check didn’t finish. Google says: “${detail}”`;
  if (code === "no_key") return "Add a free Gemini key to have this marked.";
  if (code === "busy") return "The AI is very busy right now (this happens at peak times and usually passes within minutes). Your key is fine: try again shortly." + (hasGroqKey() ? "" : " Adding a free Groq key as a backup avoids this (Skill map & backup → AI marking).");
  if (code === "offline") return "You’re offline. AI marking needs a connection.";
  if (code === "region") return "Google’s free AI isn’t offered in your region.";
  if (code === "session_expired") return "Sign in to Claude again, then try again.";
  if (code === "refused") return "Claude couldn’t check this translation. Try rewording it.";
  if (code === "prompt_too_large") return "This translation is too long to check in one go.";
  return "The check didn’t finish." + (detail ? ` (${detail})` : code ? ` (${code})` : "") + " Try again, or use Test AI in Skill map & backup → AI marking.";
}

/* Compact parsing notes: only words whose form matters (verbs, nouns, adjectives, pronouns). */
const AB = { p: "pres", i: "impf", r: "perf", l: "plpf", t: "futpf", f: "fut" };
const MB = { i: "ind", s: "subj", m: "imper", n: "inf", p: "ptcp", d: "gerund", g: "gerundive", u: "supine" };
const CB = { n: "nom", a: "acc", g: "gen", d: "dat", b: "abl", v: "voc", l: "loc", c: "gen/dat" };
function shortParse(pos, m, lemma) {
  if (!m || m === "??") return "";
  const [pe, nu, te, mo, vo, ge, ca] = m;
  const vc = vo === "p" ? (/or$/.test(lemma) ? "dep" : "pass") : "";
  const nom = [CB[ca], nu === "s" ? "sg" : nu === "p" ? "pl" : "", ge === "m" || ge === "f" || ge === "n" ? ge : ""].filter(Boolean).join(" ");
  if (pos === "V-") {
    if (mo === "p" || mo === "g" || mo === "d") return [AB[te], vc, MB[mo], nom].filter(Boolean).join(" ");
    if (mo === "n") return [AB[te], vc, "inf"].filter(Boolean).join(" ");
    return [AB[te], MB[mo], vc, pe && pe !== "-" ? pe + (nu === "p" ? "pl" : "sg") : ""].filter(Boolean).join(" ");
  }
  return nom;
}
function wordNotes(lex, verses) {
  if (!lex) return "";
  return verses.map(v => {
    const words = v[1].match(WORD_RE) || [];
    const notes = [];
    words.forEach((w, i) => {
      if (!v[3]) return;
      const r = readings(v[3][i]);
      if (r.kind !== "context" && r.kind !== "lookup") return;
      const [li, pos, m] = lex.ana[r.ids[0]];
      if (!/^(V-|Nb|A-|P)/.test(pos) || m === "??") return;
      const lemma = lex.lemmas[li][0];
      const sp = shortParse(pos, m, lemma);
      if (!sp) return;
      notes.push(`${w}=${n1(w) === n1(lemma) ? "" : lemma + " "}${sp}${r.kind === "lookup" && r.ids.length > 1 ? "?" : ""}`);
    });
    return `${promptTag(v)}: ${notes.join("; ")}`;
  }).join("\n");
}

function tutorPrompt(lex, verses, ref, user, part) {
  const notes = wordNotes(lex, verses);
  const info = PART_INFO[part] || PART_INFO.nt;
  return `Latin tutor. Check a student's English translation of ${info.src} for a Latin proficiency exam. The student has completed three years of seminary Latin: use standard grammatical terms and hold them to an examiner's standard.
${ref}
LATIN:
${verses.map(v => `${promptTag(v)} ${v[1]}`).join("\n")}
${notes ? "PARSING (automatic, may err):\n" + notes + "\n" : ""}REFERENCE (${info.ref}${part === "hy" ? "; free and rhymed, so judge only by the Latin" : ""}):
${verses.map(v => `${promptTag(v)} ${v[2]}`).join("\n")}
STUDENT:
${user.slice(0, 4000)}

List real mistakes only: wrong tense/mood/voice/person/number/case/agreement/meaning/sense, Latin left out, meaning added. Judge by the Latin; any accurate English is fine. Ignore spelling, punctuation, word order, thou/you, archaic or modern English (saith/says, hath/has, unto/to), and any accurate synonym or paraphrase: these are never mistakes.
Reply with only JSON, at most 5 issues, most important first, [] if accurate:
{"v":"got|partly|review","s":"summary, max 15 words","ok":"one thing done well, max 12 words, or empty","i":[{"sev":"error|minor","t":"${Object.keys(ISSUE_TYPES).join("|")}","la":"exact Latin word(s)","vs":"verse or section tag as shown","you":"exact words copied from student, or empty if left out","fix":"correct English for that part","why":"max 20 words, name the grammar","c":"${Object.keys(CONCEPTS).join("|")}|null"}]}
v: got = no errors (minor allowed), partly = sense right with errors, review = sense wrong or much missing. minor = acceptable but less precise.`;
}

function cleanFeedback(raw) {
  if (!raw || typeof raw !== "object") return null;
  const str = (x, n) => (typeof x === "string" ? x.trim().slice(0, n) : "");
  if (Array.isArray(raw)) raw = raw.length && raw[0] && (raw[0].i || raw[0].v) ? raw[0] : { i: raw };   // some models reply with the issue list alone
  const list = Array.isArray(raw.i) ? raw.i : Array.isArray(raw.issues) ? raw.issues : [];
  const issues = list.slice(0, 6).map(x => {
    const i = x || {};
    const sev = i.sev || i.severity, t = i.t || i.type, c = i.c || i.concept, vs = i.vs != null ? i.vs : i.verse;
    return {
      severity: sev === "minor" ? "minor" : "error",
      type: ISSUE_TYPES[t] ? t : "sense",
      latin: str(i.la || i.latin, 120),
      verse: vs != null && vs !== "" ? String(vs).slice(0, 20) : null,
      yours: str(i.you || i.yours, 200),
      fix: str(i.fix, 200),
      why: str(i.why, 400),
      concept: CONCEPTS[c] ? c : null
    };
  }).filter(i => i.latin || i.yours || i.why);
  const vv = raw.v || raw.verdict;
  const verdict = ["got", "partly", "review"].includes(vv) ? vv : (issues.some(i => i.severity === "error") ? "partly" : "got");
  return { verdict, summary: str(raw.s || raw.summary, 300), praise: str(raw.ok || raw.praise, 200), issues };
}

/* Which Latin words each issue points at: { key: {n, sev, first} } */
function latinMarks(verses, fb, prefixed, active) {
  const out = {};
  if (!fb || !fb.issues) return out;
  fb.issues.forEach((iss, n) => {
    const want = (iss.latin.match(WORD_RE) || []).map(n1);
    if (!want.length) return;
    const hit = v => iss.verse != null && (String(v[0]) === iss.verse || promptTag(v) === iss.verse || rowTag(v) === iss.verse);
    const order = verses.map((v, vi) => vi).sort((a, b) => (hit(verses[a]) ? -1 : 0) - (hit(verses[b]) ? -1 : 0));
    for (const vi of order) {
      const have = (verses[vi][1].match(WORD_RE) || []).map(n1);
      let hits = null;
      for (let s = 0; s <= have.length - want.length && !hits; s++) {
        if (want.every((w, j) => have[s + j] === w)) hits = want.map((_, j) => s + j);
      }
      if (!hits) {
        const loose = want.map(w => have.indexOf(w)).filter(k => k >= 0);
        if (loose.length) hits = loose;
      }
      if (hits) {
        hits.forEach((k, j) => {
          const key = (prefixed ? vi + ":" : "") + k;
          if (!out[key]) out[key] = { n: n + 1, sev: iss.severity, first: j === 0, on: active === n + 1 };
        });
        break;
      }
    }
  });
  return out;
}

/* The student's text with the wrong phrases marked. */
function MarkedText({ text, fb, active, setActive }) {
  if (!fb || !fb.issues || !fb.issues.length) return <>{text}</>;
  const low = text.toLowerCase();
  const ranges = [];
  fb.issues.forEach((iss, n) => {
    const y = iss.yours.toLowerCase();
    if (!y) return;
    let from = 0, at = -1;
    while ((at = low.indexOf(y, from)) >= 0) {
      if (!ranges.some(r => at < r.b && at + y.length > r.a)) break;
      from = at + 1;
    }
    if (at >= 0) ranges.push({ a: at, b: at + y.length, n: n + 1, sev: iss.severity });
  });
  ranges.sort((x, y) => x.a - y.a);
  const parts = []; let pos = 0;
  ranges.forEach(r => {
    if (r.a > pos) parts.push(text.slice(pos, r.a));
    parts.push(
      <mark key={r.a} role="button" tabIndex={0} onClick={() => setActive(active === r.n ? null : r.n)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(active === r.n ? null : r.n); } }}
        className={`mk mk-${r.sev}${active === r.n ? " mk-on" : ""}`}>
        {text.slice(r.a, r.b)}<sup className="mk-n">{r.n}</sup>
      </mark>
    );
    pos = r.b;
  });
  if (pos < text.length) parts.push(text.slice(pos));
  return <>{parts}</>;
}

function TutorPanel({ state, avail, stale, onRun, onStop, active, setActive }) {
  if (avail === false) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Btn onClick={openAiSetup}>Turn on AI marking</Btn>
        <span className="text-[13px] text-soft">Free with your own Gemini key, about a minute to set up. Until then only the key-word check is shown.</span>
      </div>
    );
  }
  if (!state || state.status === "idle" || stale) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Btn variant="primary" onClick={onRun} disabled={avail !== true}>{stale ? "Check again" : "Mark my mistakes"}</Btn>
        <span className="text-[13px] text-soft">{stale ? "You’ve changed your translation since the last check." : `${aiName() === "Claude" ? "Claude" : "The AI"} marks each mistake against the Latin. Each check uses a little of your ${aiName() === "Claude" ? "Claude usage" : "free daily allowance"}, so check once you’re happy with your draft.`}</span>
      </div>
    );
  }
  if (state.status === "loading") {
    return (
      <div className="flex flex-wrap items-center gap-3" aria-live="polite">
        <span className="tutor-dot" aria-hidden="true" />
        <span className="text-[14px] text-ink">{aiName() === "Claude" ? "Claude is" : "The AI is"} reading your translation against the Latin…</span>
        <button type="button" onClick={onStop} className="text-[13px] text-soft underline">Stop</button>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex flex-wrap items-center gap-3" aria-live="polite">
        <span className="text-[14px] text-warn">{state.msg}</span>
        {!TUTOR_OFF.includes(state.code) && <Btn onClick={onRun}>Try again</Btn>}
      </div>
    );
  }
  const fb = state.result;
  const errs = fb.issues.filter(i => i.severity === "error").length;
  const minors = fb.issues.length - errs;
  const vColor = { got: "text-ok", partly: "text-mid", review: "text-warn" }[fb.verdict];
  const vText = { got: "Accurate", partly: "Mostly right", review: "Needs work" }[fb.verdict];
  return (
    <div className="reveal flex flex-col gap-3" aria-live="polite">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`smallcaps text-[15px] font-semibold ${vColor}`}>{vText}</span>
        <span className="num text-[13px] text-soft">
          {errs ? `${errs} mistake${errs === 1 ? "" : "s"}` : "No mistakes"}{minors ? ` · ${minors} small point${minors === 1 ? "" : "s"}` : ""}
        </span>
      </div>
      {fb.summary && <p className="text-[15px] leading-snug text-ink">{fb.summary}</p>}
      {fb.issues.length > 0 && (
        <ol className="flex flex-col gap-2">
          {fb.issues.map((iss, i) => (
            <li key={i}>
              <button type="button" onClick={() => setActive(active === i + 1 ? null : i + 1)} aria-pressed={active === i + 1}
                className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${active === i + 1 ? "border-rubric bg-rubrictint" : "border-rule bg-leaf hover:border-soft"}`}>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className={`num inline-flex h-5 w-5 items-center justify-center rounded-full text-[12px] font-bold text-paper ${iss.severity === "error" ? "bg-rubric" : "bg-mid"}`}>{i + 1}</span>
                  <span className="smallcaps text-[13px] text-soft">{ISSUE_TYPES[iss.type]}{iss.severity === "minor" ? " · small point" : ""}</span>
                  {iss.latin && <span lang="la" className="latin text-[15px] font-bold text-ink">{iss.latin}</span>}
                </div>
                <p className="mt-1 text-[15px] leading-snug text-ink">
                  {iss.yours ? <>You wrote <span className="line-through decoration-[var(--rubric)]">“{iss.yours}”</span></> : "Left out"}
                  {iss.fix && <> → <strong className="font-semibold text-ok">“{iss.fix}”</strong></>}
                </p>
                {iss.why && <p className="mt-1 text-[14px] leading-snug text-soft">{iss.why}</p>}
                {iss.concept && <span className="mt-1.5 inline-block rounded bg-paper px-2 py-0.5 text-[12px] text-soft">{CONCEPTS[iss.concept]}</span>}
              </button>
            </li>
          ))}
        </ol>
      )}
      {fb.praise && <p className="text-[14px] leading-snug text-ok">✓ {fb.praise}</p>}
      <p className="text-[12px] text-soft">Marked by {aiName() === "Claude" ? "Claude" : readAi().lastBy || "the AI"}. Tap a mistake to see it highlighted in the Latin and in your English. If a correction looks wrong, trust the grammar you know.</p>
    </div>
  );
}

/* Per-concept scores from feedback: errors pull a concept down, minor points less so. */
function feedbackScores(fb) {
  const over = {};
  if (!fb) return over;
  fb.issues.forEach(i => {
    if (!i.concept) return;
    const s = i.severity === "error" ? 0 : 0.5;
    over[i.concept] = over[i.concept] == null ? s : Math.min(over[i.concept], s);
  });
  return over;
}

/* Recurring mistakes, from the log kept in progress. */
function MistakeSummary({ log, onRemove }) {
  if (!log || !log.length) return null;
  const counts = {};
  log.forEach(m => { const k = m.concept ? "c:" + m.concept : "t:" + m.type; counts[k] = (counts[k] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const recent = log.slice(-5).reverse();
  return (
    <div>
      <p className="mb-2 text-[14px] text-soft">Your most frequent mistakes, from the AI’s marking. These lower the matching skills above, so the drill brings you more of them.</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {top.map(([k, n]) => (
          <span key={k} className="num rounded bg-rubrictint px-2 py-0.5 text-[13px] text-ink">
            {k.startsWith("c:") ? CONCEPTS[k.slice(2)] : ISSUE_TYPES[k.slice(2)]} · {n}
          </span>
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {recent.map((m, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-[14px] leading-snug">
            <span className="text-soft">{m.ref}:</span> <span lang="la" className="latin font-bold text-ink">{m.latin}</span>
            {m.fix && <span className="text-ink"> → “{m.fix}”</span>}
            {onRemove && <button type="button" className="text-[12px] text-soft underline" onClick={() => onRemove(m)} title="The AI was wrong: remove this from your mistakes">✕ not a mistake</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Mistake drills: what the AI keeps marking, and a way to work on each ----------
   Kinds marked twice or more (by grammar concept, or by type) each get: verses that need that concept, the forms
   trainer set up for it, and a re-test of the very phrases you got wrong. */
const TYPE_FORMS = { tense: { what: "verb" }, mood: { what: "verb", moods: { i: 1, s: 1, m: 1 } }, voice: { what: "verb", voices: { a: 1, p: 1 } }, number: { what: "verb" }, case: { what: "noun" }, agreement: { what: "agree" } };
const CONCEPT_FORMS = { fut: { what: "verb", tenses: { p: 0, i: 0, f: 1, r: 0, l: 0, t: 1 } }, perf: { what: "verb", tenses: { p: 0, i: 0, f: 0, r: 1, l: 1, t: 1 } }, pass: { what: "verb", voices: { a: 0, p: 1 } }, dep: { what: "verb", set: "dep" }, imp: { what: "verb", moods: { i: 0, s: 0, m: 1 } }, subj: { what: "verb", moods: { i: 0, s: 1, m: 0 } }, abl: { what: "noun" }, gen: { what: "noun" }, dat: { what: "noun" }, comp: { what: "adj" } };
function mistakeGroups(log) {
  const g = {};
  (log || []).forEach(m => { const k = m.concept ? "c:" + m.concept : "t:" + m.type; (g[k] = g[k] || []).push(m); });
  return Object.entries(g).filter(([, ms]) => ms.length >= 2).sort((a, b) => b[1].length - a[1].length);
}
function MistakeDrills({ log, onDrill, onForms, onRetest }) {
  const groups = mistakeGroups(log).slice(0, 4);
  if (!groups.length) return null;
  return (
    <section className="rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Mistake drills">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="latin text-[1.1rem] font-bold text-ink">Your repeated mistakes</h2>
        <span className="text-[13px] text-soft">from the AI’s marking of your translations</span>
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {groups.map(([k, ms]) => {
          const c = k.startsWith("c:") ? k.slice(2) : null, t = c ? null : k.slice(2);
          const forms = c ? CONCEPT_FORMS[c] : TYPE_FORMS[t];
          const ex = ms[ms.length - 1];
          return (
            <li key={k} className="flex flex-col gap-1.5 rounded-md border border-rule bg-paper px-3 py-2">
              <span className="text-[14px] text-ink"><strong>{c ? CONCEPTS[c] : ISSUE_TYPES[t] || "Other"}</strong> <span className="num text-soft">· {ms.length} times</span>
                {ex && ex.latin && <span className="text-soft"> · e.g. <span lang="la" className="latin font-semibold text-ink">{ex.latin}</span>{ex.fix ? ` → “${ex.fix}”` : ""}</span>}</span>
              <div className="flex flex-wrap gap-1.5">
                {ms.some(m => m.latin && m.fix) && <Btn className="px-2.5 py-1 text-[13px]" onClick={() => onRetest(k)}>Re-test these {ms.filter(m => m.latin && m.fix).length}</Btn>}
                {c && <Btn className="px-2.5 py-1 text-[13px]" onClick={() => onDrill(c)}>Drill verses with it</Btn>}
                {forms && <Btn className="px-2.5 py-1 text-[13px]" onClick={() => onForms(forms)}>Forms trainer</Btn>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
