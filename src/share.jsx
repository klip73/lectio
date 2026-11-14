/* ---------- Sharing a class list, sending feedback, and what's new ----------
   A class list travels as a short code (or a link to the phone app ending #class=<code>): one person adds the week's
   sections, everyone else loads the same list. Feedback goes to the project's GitHub issues, or is copied to send on
   by hand: there is no server and no email address. "What's new" is a dated list shown once after an update. */
const SHARE_PREFIX = "LV1.";
function encodeClass(c) {
  const o = { s: c.sections || [] };
  if ((c.own || []).length) o.o = c.own.map(x => [x.head, x.gloss || "", x.lemma || ""]);
  if (c.basic) o.b = 1;
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  return SHARE_PREFIX + b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
/* Accepts the code itself, or any text containing it (a pasted link or message). Returns a class list or null. */
function decodeClass(text) {
  const m = String(text || "").match(/LV1\.([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    let b = m[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b.length % 4) b += "=";
    const o = JSON.parse(decodeURIComponent(escape(atob(b))));
    if (!o || !Array.isArray(o.s)) return null;
    const ok = s => s && typeof s === "object" && ((s.t === "nt" && BOOK[s.b] && s.c1 >= 1 && s.c2 >= s.c1) ||
      (s.t === "sm" && typeof s.p === "string" && s.q >= 1 && (typeof s.a === "number" || (Array.isArray(s.a) && s.a.every(x => typeof x === "number")))));
    const sections = o.s.filter(ok).slice(0, 40).map(s => s.t === "nt" ? { t: "nt", b: s.b, c1: +s.c1, c2: +s.c2 }
      : { t: "sm", p: s.p, q: +s.q, a: s.a, parts: Array.isArray(s.parts) ? s.parts.filter(x => typeof x === "string").slice(0, 8) : ["sc", "resp"] });
    const own = (Array.isArray(o.o) ? o.o : []).filter(x => Array.isArray(x) && typeof x[0] === "string" && x[0].trim()).slice(0, 500)
      .map(([head, gloss, lemma]) => ({ head: head.slice(0, 80), ...(gloss ? { gloss: String(gloss).slice(0, 120) } : {}), ...(lemma ? { lemma: String(lemma).slice(0, 40) } : {}) }));
    if (!sections.length && !own.length) return null;
    return { sections, own, basic: !!o.b };
  } catch (e) { return null; }
}
const shareLink = code => PHONE_APP_URL + "#class=" + code;
const PHONE_APP_URL = "https://klip73.github.io/lectio/";
function copyText(text, ok, fallback) {
  try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
}

/* In My class list: share this week's list, or load one a classmate shared. */
function ClassShare({ cls, onLoad, incoming, onIncomingDone }) {
  const [open, setOpen] = useState(incoming ? "in" : "");
  const [msg, setMsg] = useState("");
  const [paste, setPaste] = useState(incoming || "");
  const outRef = useRef(null);
  const has = cls.sections.length || (cls.own || []).length;
  const code = has ? encodeClass(cls) : "";
  const text = has ? `Lectio class list: ${[cls.sections.map(sectionLabel).join("; "), (cls.own || []).length ? `${cls.own.length} words of our own` : ""].filter(Boolean).join(" + ")}\nOpen: ${shareLink(code)}\nIn the Claude version, paste this code under Class quiz → Load a shared list: ${code}` : "";
  const found = decodeClass(paste);
  function copy() {
    copyText(text, () => setMsg("Copied. Paste it into your class chat."), () => { if (outRef.current) { outRef.current.focus(); outRef.current.select(); } setMsg("Copy the selected text with Ctrl/⌘ + C."); });
  }
  function load() {
    if (!found) return;
    onLoad(found); setOpen(""); setPaste(""); setMsg("Loaded. Last week’s words are kept under Past weeks.");
    if (onIncomingDone) onIncomingDone();
  }
  const link = "text-[14px] text-rubric underline underline-offset-2";
  return (
    <div className="flex flex-col gap-2 border-t border-rule pt-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {has ? <button type="button" className={link} aria-expanded={open === "out"} onClick={() => { setOpen(open === "out" ? "" : "out"); setMsg(""); }}>Share this list with classmates</button> : null}
        <button type="button" className={link} aria-expanded={open === "in"} onClick={() => { setOpen(open === "in" ? "" : "in"); setMsg(""); }}>Load a shared list</button>
      </div>
      {open === "out" && (
        <div className="flex flex-col gap-2">
          <p className="text-[14px] leading-snug text-soft">One person adds the week’s sections; everyone else opens the link (or pastes the code) and gets the same list and quiz. Each person’s progress stays their own.</p>
          <textarea ref={outRef} readOnly rows={4} value={text} aria-label="Class list to share" className="w-full rounded-md border border-rule bg-paper px-2 py-1.5 font-mono text-[12px] text-soft" />
          <div className="flex flex-wrap items-center gap-2"><Btn onClick={copy}>Copy</Btn>{msg && <span className="text-[13px] text-ink" aria-live="polite">{msg}</span>}</div>
        </div>
      )}
      {open === "in" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="cls-paste" className="text-[14px] text-ink">{incoming ? "A classmate shared this class list:" : "Paste the link or code a classmate sent:"}</label>
          {!incoming && <textarea id="cls-paste" rows={2} value={paste} onChange={e => setPaste(e.target.value)} placeholder="https://klip73.github.io/lectio/#class=LV1.… or LV1.…" className="w-full rounded-md border border-rule bg-paper px-2 py-1.5 font-mono text-[12px] text-ink" />}
          {found ? (
            <p className="text-[14px] text-ink">{[found.sections.map(sectionLabel).join("; "), found.own.length ? `${found.own.length} words of their own` : ""].filter(Boolean).join(" + ")}.{has ? " It replaces your current list; your words so far move to Past weeks." : ""}</p>
          ) : paste.trim() ? <p className="text-[13px] text-warn">That isn’t a class list code. It starts LV1.</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="primary" onClick={load} disabled={!found}>Load this list</Btn>
            <button type="button" className="text-[13px] text-soft underline" onClick={() => { setOpen(""); setPaste(""); if (onIncomingDone) onIncomingDone(); }}>{incoming ? "Not now" : "Cancel"}</button>
          </div>
        </div>
      )}
      {!open && msg && <p className="text-[13px] text-ok" aria-live="polite">{msg}</p>}
    </div>
  );
}

/* ---------- Feedback: no email. A prefilled GitHub issue, or copy it and send it on. ---------- */
const ISSUES_URL = "https://github.com/klip73/lectio/issues/new";
function appVersionLine() {
  return [APP ? "phone app" : OFFLINE ? "offline copy" : "Claude version", window.__LV_BUILT ? "built " + window.__LV_BUILT : "", (navigator.userAgent.match(/(iPhone|iPad|Android|Macintosh|Windows|Linux)/) || [""])[0]].filter(Boolean).join(" · ");
}
function FeedbackPanel({ where, onClose }) {
  const [kind, setKind] = useState("idea");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const outRef = useRef(null);
  const KINDS = [["idea", "An idea"], ["problem", "Something’s wrong"], ["latin", "Wrong Latin help"]];
  const label = KINDS.find(k => k[0] === kind)[1];
  const body = `${text.trim()}\n\n---\n${label}${where ? " · in " + where : ""}\n${appVersionLine()}`;
  const title = (kind === "idea" ? "Idea: " : kind === "latin" ? "Latin help: " : "Problem: ") + (text.trim().split(/\n/)[0].slice(0, 70) || "…");
  const url = `${ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  const ready = text.trim().length >= 3;
  function copy() {
    copyText(body, () => setMsg("Copied. Send it to whoever shared the app with you."), () => { if (outRef.current) { outRef.current.focus(); outRef.current.select(); } setMsg("Copy the selected text with Ctrl/⌘ + C."); });
  }
  return (
    <section aria-label="Send feedback" className="flex flex-col gap-2.5 rounded-lg border border-rubric bg-leaf px-5 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="latin text-[1.1rem] font-bold text-ink">Suggest an improvement or report a problem</h2>
        {onClose && <button type="button" onClick={onClose} aria-label="Close" className="text-soft hover:text-ink">✕</button>}
      </div>
      <div className="flex flex-wrap gap-1 self-start rounded-lg border border-rule bg-paper p-0.5 text-[14px]" role="group" aria-label="Kind">
        {KINDS.map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={`rounded px-2.5 py-1 ${kind === k ? "bg-ink text-paper" : "text-ink"}`}>{l}</button>)}
      </div>
      <label htmlFor="fb-text" className="sr-only">Your feedback</label>
      <textarea id="fb-text" ref={outRef} rows={4} value={text} onChange={e => setText(e.target.value)} maxLength={3000}
        placeholder={kind === "idea" ? "What would make the app more useful for you?" : kind === "latin" ? "Which word or passage, what it showed, and what it should be" : "What happened, and where?"}
        className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-[15px] leading-relaxed text-ink" />
      <p className="text-[12px] text-soft">Adds: {[label, where ? "in " + where : "", appVersionLine()].filter(Boolean).join(" · ")}. Nothing else about you is sent.</p>
      <div className="flex flex-wrap items-center gap-2">
        <a href={ready ? url : undefined} aria-disabled={!ready} target="_blank" rel="noopener noreferrer"
          className={`inline-block rounded-md bg-[var(--rubric)] px-3.5 py-2 text-[15px] font-medium text-paper ${ready ? "" : "pointer-events-none opacity-50"}`}>Post it on GitHub ↗</a>
        <Btn onClick={copy} disabled={!ready}>Copy instead</Btn>
        {msg && <span className="text-[13px] text-ink" aria-live="polite">{msg}</span>}
      </div>
      <p className="text-[12px] leading-snug text-soft">GitHub opens with it filled in: press <strong>Submit</strong> (a free GitHub account is needed). Without one, copy it and pass it on in person or in your class chat.</p>
    </section>
  );
}

/* ---------- What's new: shown once on Home after an update ---------- */
const SEEN_KEY = "lectio-vulgata-seen";
const WHATS_NEW = [
  { d: "2026-11-14", items: [
    "Study → More: your exam plan. Enter the exam date and each week shows how many passages to do in each part (more where you are weakest), then full oral mock sittings in the last eight weeks.",
    "Sentences to review: every sentence you mark “I needed help” is kept and comes back the next day, then after 3 days, a week and so on (Study → More).",
    "Phrases: the set turns of phrase of St Thomas (videtur quod, respondeo dicendum, secundum quid…), the Bible, Church Latin and the hymns, with a quiz and real examples from the exam texts.",
    "Sacramental forms: Baptism, Confirmation in danger of death, the Consecration, Absolution, Extreme Unction, Viaticum, the Apostolic Blessing and Matrimony, from the Rituale Romanum and the 1962 Missal. Read, hear, record yourself, then write them from memory word for word.",
    "Sentence by sentence now also in the Summa reader, every Library work, and the Office’s lessons, hymns, chapters and prayers.",
  ] },
  { d: "2026-11-13", items: [
    "Dictionary: the button at the top of every page. Type any Latin form (fecerunt, gratiae) for its dictionary word, parsing, Lewis & Short, Wiktionary and Du Cange, all its forms and add-to-deck; headwords are suggested as you type; English → Latin finds the Latin for an English word.",
    "Library search can now include the whole Latin Library (tick “Also search the whole Latin Library”).",
    "Liturgy → My calendar: add your own feasts (patron, titular, dedication, diocese, order) or raise, lower or move any feast. The 1960 table of precedence decides what is kept, commemorated or transferred, every year; you can override any year, and share the calendar by code.",
    "Library: the whole Latin Library (765 works, about 11 million words: Cicero to Erasmus), the Pontificale Romanum (1895), and Boethius complete from the Loeb edition with the English beside the Latin, book by book, poem and prose.",
    "The reader: chapters grouped by book, verse kept in lines, text size, find in this book, ← → keys.",
    "Liturgy → Rubrics: the Tridentine general rubrics, Divino afflatu (1911) with its tables, Cum nostra (1955), the 1960 Variationes and the monastic rubrics (1963).",
    "AI keys (Gemini, Groq) now open from the AI button at the top of every page.",
    "Class quiz: no derivative question when the meaning is itself one (specialis: special); Roman numerals (art. ix) are no longer quizzed as words.",
  ] },
  { d: "2026-11-12", items: [
    "Sentence by sentence now goes one sentence at a time, even in a long Matins lesson. Each grammar box has its own colour, and its words in the sentence are underlined in that colour (tap the box to fill them in).",
    "Class quiz: share your class list. One person adds the week’s sections and sends the link; everyone loads the same list (Class quiz → Share this list).",
    "Suggest an improvement or report a problem from Home or How this app works.",
  ] },
  { d: "2026-11-10", items: [
    "Class quiz: tick individual articles of a Summa question.",
    "Grammar notes under each passage, with Allen & Greenough references; tap one to light up its words.",
    "Read a passage sentence by sentence, and choose your Latin font (Alegreya and others) from the header.",
    "Lewis & Short, Wiktionary and Du Cange under every word.",
  ] },
];
const fmtDay = d => new Date(d + "T12:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" });
function WhatsNewCard({ fresh }) {
  const [seen, setSeen] = useState(() => readLocal(SEEN_KEY));
  useEffect(() => { if (fresh && !seen) { writeLocal(SEEN_KEY, WHATS_NEW[0].d); setSeen(WHATS_NEW[0].d); } }, [fresh]);
  if (fresh) return null;
  const news = seen ? WHATS_NEW.filter(w => w.d > seen) : WHATS_NEW.slice(0, 1);
  if (!news.length) return null;
  const close = () => { writeLocal(SEEN_KEY, WHATS_NEW[0].d); setSeen(WHATS_NEW[0].d); };
  return (
    <section aria-label="What’s new" className="flex flex-col gap-1.5 rounded-lg border border-rule bg-leaf px-5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="smallcaps text-[13px] font-semibold text-rubric">What’s new</span>
        <button type="button" onClick={close} className="text-[13px] text-soft underline">Got it</button>
      </div>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-[14px] leading-snug text-ink">
        {news.slice(0, 2).flatMap(w => w.items).slice(0, 6).map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </section>
  );
}
function WhatsNewList() {
  return (
    <div className="flex flex-col gap-2">
      {WHATS_NEW.map(w => (
        <div key={w.d}>
          <p className="text-[14px] font-semibold text-ink">{fmtDay(w.d)}</p>
          <ul className="list-disc pl-5 text-[14px] leading-snug text-ink">{w.items.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}
