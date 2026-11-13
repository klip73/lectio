/* ---------- Guide: grammar for the exam, the five texts, pronunciation, Summa vocabulary ---------- */
const GUIDE_KEY = "lectio-vulgata-guide";
function refText(at) {
  const [b, c, v] = at, bk = BOOK[b];
  if (!bk) return "";
  const part = bk[3], labels = bk[4];
  if (part === "nt" || part === "ps") return `${bk[1]} ${c}:${v}`;
  if (part === "hy") return `${labels ? labels[c - 1] : "Hymn " + c}, stanza ${v}`;
  if (part === "st") return `Summa I, q. ${bk[1].match(/\d+/) ? bk[1].match(/\d+/)[0] : ""}, a. ${c}`;
  return labels ? labels[c - 1] : bk[1];
}
function speakLatin(voice, text, done) {
  try {
    const ss = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text.replace(/ \/ /g, ", "));
    u.voice = voice; u.lang = voice.lang; u.rate = 0.8;
    u.onend = u.onerror = () => done && done();
    ss.cancel(); ss.speak(u);
  } catch (e) { done && done(); }
}
function GuideExample({ e, onOpen }) {
  return (
    <li className="border-l-2 border-rule pl-3">
      <p lang="la" className="latin text-[1.02rem] leading-snug text-ink"><AccentText text={e.la} /></p>
      <p className="text-[14px] italic leading-snug text-soft">{e.en}</p>
      <button type="button" className="mt-0.5 text-[12px] text-rubric underline underline-offset-2" onClick={() => onOpen(e.at)}>{refText(e.at)}: read it in context →</button>
    </li>
  );
}
function GuideMode({ onOpen, onDrill, onPart, onLemma, voice }) {
  const [tab, setTab0] = useState(() => (readLocal(GUIDE_KEY) || {}).tab || "grammar");
  const setTab = t => { setTab0(t); writeLocal(GUIDE_KEY, { tab: t }); };
  const [q, setQ] = useState("");
  const [saying, setSaying] = useState(null);
  const chip = (id, label) => (
    <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}
      className={`rounded-md px-3 py-1.5 text-[14px] font-medium ${tab === id ? "bg-ink text-paper" : "text-ink hover:bg-leaf"}`}>{label}</button>
  );
  const H = ({ children }) => <h3 className="smallcaps mb-0.5 mt-2 text-[13px] font-semibold text-rubric">{children}</h3>;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 self-start rounded-lg border border-rule bg-paper p-1" role="group" aria-label="Guide section">
        {chip("grammar", "Grammar")}{chip("parts", "The five texts")}{chip("pron", "Pronunciation")}{chip("terms", "Summa vocabulary")}{chip("memory", "Memory aids")}
      </div>

      {tab === "grammar" && GUIDE.grammar.map(g => (
        <section key={g.group} aria-label={g.group}>
          <h2 className="latin mb-2 text-[1.05rem] font-bold text-ink">{g.group}</h2>
          <div className="flex flex-col gap-2">
            {g.items.map(it => (
              <details key={it.id} className="rounded-lg border border-rule bg-leaf px-4 py-2.5">
                <summary className="cursor-pointer text-[15px] font-semibold text-ink">{it.title}</summary>
                <div className="mt-2 flex flex-col gap-1 text-[15px] leading-snug text-ink">
                  <p>{it.rule}</p>
                  <H>Translating it</H><p>{it.how}</p>
                  <H>The examiner asks</H><p>{it.ask}</p>
                  <H>In the texts</H>
                  <ul className="mt-1 flex flex-col gap-2">{it.ex.map((e, i) => <GuideExample key={i} e={e} onOpen={onOpen} />)}</ul>
                  {it.concept && CONCEPTS[it.concept] && (
                    <div className="mt-2"><Btn onClick={() => onDrill(it.concept)}>Drill verses with {CONCEPTS[it.concept].toLowerCase()} →</Btn></div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      {tab === "parts" && GUIDE.parts.map(p => (
        <section key={p.id} className="rounded-lg border border-rule bg-leaf px-4 py-4 sm:px-6" aria-label={p.title}>
          <h2 className="latin text-[1.1rem] font-bold text-ink">{p.title}</h2>
          <p className="mt-1 text-[15px] leading-snug text-ink">{p.lead}</p>
          {p.frame && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[20rem] text-[14px]">
                <thead><tr className="text-left text-[12px] text-soft"><th className="pb-1 pr-3 font-normal">Latin</th><th className="pb-1 pr-3 font-normal">Translate</th><th className="pb-1 font-normal">What it is</th></tr></thead>
                <tbody>{p.frame.map(([la, en, what]) => <tr key={la} className="border-t border-rule align-top"><td lang="la" className="latin py-1 pr-3 text-ink">{la}</td><td className="py-1 pr-3 text-ink">{en}</td><td className="py-1 text-soft">{what}</td></tr>)}</tbody>
              </table>
            </div>
          )}
          <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-[15px] leading-snug text-ink">{p.points.map((x, i) => <li key={i}>{x}</li>)}</ul>
          <ul className="mt-3 flex flex-col gap-2">{(p.ex || []).map((e, i) => <GuideExample key={i} e={e} onOpen={onOpen} />)}</ul>
          <div className="mt-3"><Btn onClick={() => onPart(p.id)}>Practise {p.title.replace(/^\d\. /, "")} →</Btn></div>
        </section>
      ))}

      {tab === "pron" && (
        <section className="flex flex-col gap-4 rounded-lg border border-rule bg-leaf px-4 py-4 sm:px-6" aria-label="Pronunciation">
          <p className="text-[15px] leading-snug text-ink">{GUIDE.pron.lead}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[22rem] text-[14px]">
              <thead><tr className="text-left text-[12px] text-soft"><th className="pb-1 pr-3 font-normal">Letters</th><th className="pb-1 pr-3 font-normal">Say</th><th className="pb-1 font-normal">Example</th></tr></thead>
              <tbody>{GUIDE.pron.rules.map(([l, say, ex, sounds]) => (
                <tr key={l} className="border-t border-rule align-top">
                  <td className="py-1 pr-3 font-semibold text-ink">{l}</td><td className="py-1 pr-3 text-ink">{say}</td>
                  <td className="py-1 text-ink"><span lang="la" className="latin">{ex}</span>{sounds && <span className="block text-[12px] text-soft">{sounds}</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div><H>Stress</H><ul className="flex list-disc flex-col gap-1 pl-5 text-[15px] leading-snug text-ink">{GUIDE.pron.stress.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div>
            <H>Listen</H>
            {voice ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {GUIDE.pron.listen.map(t => (
                  <button key={t} type="button" onClick={() => { setSaying(t); speakLatin(voice, t, () => setSaying(null)); }}
                    className={`rounded border px-2 py-1 text-[14px] ${saying === t ? "border-rubric bg-rubrictint text-rubric" : "border-rule bg-paper text-ink hover:border-soft"}`}>
                    <span lang="la" className="latin">{t}</span> {saying === t ? "♪" : "▸"}
                  </button>
                ))}
              </div>
            ) : <p className="text-[14px] text-soft">This browser has no Italian or Latin voice, so listening isn’t available here.</p>}
            {voice && <p className="mt-1 text-[12px] text-soft">An Italian voice ({voice.lang}) is the nearest the browser has to Church pronunciation. Trust the rules above where it differs.</p>}
          </div>
        </section>
      )}

      {tab === "memory" && <MemoryAids />}
      {tab === "terms" && (
        <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-4 py-4 sm:px-6" aria-label="Summa vocabulary">
          <p className="text-[15px] leading-snug text-ink">The technical words St Thomas uses with fixed meanings. Translate them consistently; a classical dictionary will often mislead.</p>
          <label htmlFor="terms-filter" className="sr-only">Filter</label>
          <input id="terms-filter" value={q} onChange={e => setQ(e.target.value)} placeholder="Filter: actus, cause, insofar…" className="rounded-md border border-rule bg-paper px-3 py-1.5 text-[15px] text-ink" />
          <dl className="flex flex-col gap-2">
            {GUIDE.terms.filter(([la, en]) => !q.trim() || (la + " " + en).toLowerCase().includes(q.trim().toLowerCase())).map(([la, en]) => (
              <div key={la} className="border-t border-rule pt-2">
                <dt lang="la" className="latin font-bold text-ink">{!/[ ,\/]/.test(la) ? <button type="button" className="underline decoration-rule underline-offset-2 hover:text-rubric" title="All forms" onClick={() => onLemma(la)}>{la}</button> : la}</dt>
                <dd className="text-[14px] leading-snug text-ink">{en}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

/* ---------- Progress file: a backup that lasts longer than browser storage ---------- */
async function saveTextFile(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  try {
    const dl = !OFFLINE && window.claude && window.claude.use ? await window.claude.use("downloads") : null;
    if (dl) { await dl.save({ filename, data: blob }); return "saved"; }
  } catch (e) { if (e && e.code === "declined") return "declined"; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return "saved";
}
/* When progress was last saved off this device (progress file, copied code); the reminder uses it. */
const BACKUP_KEY = "lectio-vulgata-backup";
function markBackedUp() { writeLocal(BACKUP_KEY, { ...(readLocal(BACKUP_KEY) || {}), at: Date.now() }); }
async function saveProgressFile(prog) {
  const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const r = await saveTextFile(`lectio-progress-${stamp}.json`, JSON.stringify({ app: "lectio-vulgata", saved: d.toISOString(), code: encodeBackup(prog) }, null, 1));
  if (r !== "declined") markBackedUp();
  return r;
}
/* Progress lives in this browser: clearing it, or a new phone, loses everything not saved. Remind every two weeks once there is something to lose. */
function BackupReminder({ prog, cloud }) {
  const [st, setSt] = useState(() => readLocal(BACKUP_KEY) || {});
  const [msg, setMsg] = useState("");
  const amount = Object.keys(prog.cards || {}).length + Object.keys(prog.pcards || {}).length + Object.keys(prog.vcards || {}).length + (prog.sittings || []).length;
  const now = Date.now();
  if (cloud || amount < 15 || (st.at && now - st.at < 14 * DAY) || (st.snooze && st.snooze > now)) return msg ? <p className="text-[13px] text-ok" aria-live="polite">{msg}</p> : null;
  async function save() { const r = await saveProgressFile(prog); if (r !== "declined") { setSt(readLocal(BACKUP_KEY) || {}); setMsg("Saved. Keep the file somewhere safe (Files, Drive, email to yourself)."); } }
  async function share() {
    const code = encodeBackup(prog);
    try {
      if (navigator.share) { await navigator.share({ title: "Lectio Vulgata backup", text: code }); }
      else { await navigator.clipboard.writeText(code); }
      markBackedUp(); setSt(readLocal(BACKUP_KEY) || {}); setMsg(navigator.share ? "Shared. Keep it somewhere safe." : "Backup code copied: paste it into a note or email to yourself.");
    } catch (e) {}
  }
  function later() { const n = { ...st, snooze: now + 7 * DAY }; writeLocal(BACKUP_KEY, n); setSt(n); }
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-mid bg-midtint px-4 py-3" aria-label="Back up your progress">
      <p className="text-[14px] leading-snug text-ink"><strong>Back up your progress.</strong> It’s kept only in this browser{st.at ? `; your last backup was ${Math.round((now - st.at) / DAY)} days ago` : ", and you haven’t saved a copy yet"}. A new phone or clearing the browser would lose it.</p>
      <div className="flex flex-wrap gap-2">
        <Btn variant="primary" onClick={save}>Save progress file</Btn>
        <Btn onClick={share}>{navigator.share ? "Share backup code" : "Copy backup code"}</Btn>
        <button type="button" className="text-[13px] text-soft underline" onClick={later}>Remind me next week</button>
      </div>
    </section>
  );
}
function ProgressFile({ prog, onRestore }) {
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);
  async function save() {
    const r = await saveProgressFile(prog);
    setMsg(r === "declined" ? "Download cancelled." : "Saved. Keep the file with your other papers; load it on any device or browser.");
  }
  function load(file) {
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const o = JSON.parse(fr.result);
        const data = o && o.app === "lectio-vulgata" && typeof o.code === "string" ? decodeBackup(o.code) : null;
        if (!data) { setMsg("That isn’t a Lectio Vulgata progress file."); return; }
        onRestore(data);
        setMsg(`Progress loaded from ${o.saved ? new Date(o.saved).toLocaleDateString() : "the file"}.`);
      } catch (e) { setMsg("That file couldn’t be read."); }
    };
    fr.readAsText(file);
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] text-soft">A progress file is the safest long-term backup: save one now and then, and load it on a new device or after clearing your browser.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Btn onClick={save}>Save progress file</Btn>
        <Btn onClick={() => fileRef.current && fileRef.current.click()}>Load progress file</Btn>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" aria-label="Choose a progress file" onChange={e => { load(e.target.files && e.target.files[0]); e.target.value = ""; }} />
        {msg && <span className="text-[13px] text-ink" aria-live="polite">{msg}</span>}
      </div>
    </div>
  );
}
