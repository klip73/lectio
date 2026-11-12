/* ---------- Home: the start screen, arranged by what people open the app for ----------
   "Continue" (the last few things you were doing) on top, then one big button per purpose:
   the weekly class quiz, exam preparation, today's Office, reading and looking things up. */
const RECENT_KEY = "lectio-vulgata-recent";   // { area: last-used time }
function touchRecent(area) {
  if (!area) return;
  const r = readLocal(RECENT_KEY) || {};
  r[area] = Date.now();
  writeLocal(RECENT_KEY, r);
}
const areaOf = (mode, deck) => mode === "vocab" ? (deck === "class" ? "class" : "vocab") : ["read", "drill", "forms", "exam", "office", "library", "guide"].includes(mode) ? mode : null;

function continueItems(libIdx, posLabel) {
  const r = readLocal(RECENT_KEY) || {};
  const out = [];
  for (const [area, at] of Object.entries(r).sort((a, b) => b[1] - a[1])) {
    if (Date.now() - at > 21 * DAY) continue;
    let label = "", sub = "";
    if (area === "class") {
      const c = readClass();
      if (!c.sections.length && !(c.own || []).length) continue;
      label = "Class quiz"; sub = [c.sections.map(sectionLabel).join("; "), c.words.length ? `${c.words.length} words` : ""].filter(Boolean).join(" · ");
    } else if (area === "read") { label = "Passage"; sub = posLabel; }
    else if (area === "drill") label = "Verse drill";
    else if (area === "vocab") label = "Vocabulary";
    else if (area === "forms") label = "Forms";
    else if (area === "guide") label = "Guide";
    else if (area === "exam") { const x = readLocal(EXAM_KEY) || {}; label = x.run && !x.run.end ? "Finish your exam sitting" : "Exam sitting"; }
    else if (area === "office") {
      const o = readLocal(OFFICE_KEY) || {};
      const h = HOURS_L.find(x => x[0] === o.hour);
      label = o.part === "sunday" ? "Sunday preparation" : "Today’s " + (o.part === "mass" ? "Mass" : o.part === "calendar" ? "calendar" : h ? h[1] : "Office");
    } else if (area === "library") {
      const l = readLocal(LIB_KEY) || {};
      if (l._open === "summa") { const s = readLocal(SUMMA_POS_KEY) || {}; label = "Summa Theologiae"; sub = s.p ? `${SM_PART[s.p]} q. ${s.q || 1}, a. ${s.a || 1}` : ""; }
      else if (l._open) { const w = libIdx && libIdx.works.find(x => x.id === l._open); label = w ? w.title : "Library"; sub = l[l._open] != null ? `chapter ${l[l._open] + 1}` : ""; }
      else label = "Library";
    } else continue;
    out.push({ area, label, sub });
    if (out.length >= 3) break;
  }
  return out;
}

function HomeScreen({ go, office, officeRead, day, dueCount, cls, posLabel, examLeft }) {
  const [libIdx, setLibIdx] = useState(null);
  useEffect(() => { const l = readLocal(LIB_KEY) || {}; if (l._open && l._open !== "summa") libGet("index").then(setLibIdx).catch(() => {}); }, []);
  const items = continueItems(libIdx, posLabel);
  const doneToday = ["reviews", "vocab", "passage", "oral"].filter(k => k === "reviews" ? dueCount === 0 : k === "vocab" ? day.vocab >= 10 : k === "passage" ? day.passages >= 2 : day.oral >= 1).length;
  const tile = "flex w-full flex-col gap-1 rounded-lg border border-rule bg-leaf px-5 py-4 text-left hover:border-soft";
  const head = "latin text-[1.15rem] font-bold text-ink";
  const note = "text-[14px] leading-snug text-soft";
  const openHour = h => { writeLocal(OFFICE_KEY, { ...(readLocal(OFFICE_KEY) || {}), part: "office", hour: h }); go("office"); };
  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <section aria-label="Continue" className="flex flex-col gap-1.5">
          <span className="smallcaps text-[13px] font-semibold text-rubric">Continue</span>
          {items.map((it, i) => (
            <button key={it.area} type="button" onClick={() => go(it.area)}
              className={`flex w-full items-baseline gap-2 rounded-lg border px-4 py-3 text-left ${i === 0 ? "border-rubric bg-rubrictint" : "border-rule bg-leaf hover:border-soft"}`}>
              <span className="min-w-0 flex-1">
                <span lang={it.area === "library" ? "la" : undefined} className={`block text-[15px] font-semibold text-ink ${it.area === "library" ? "latin" : ""}`}>{it.label}</span>
                {it.sub && <span className="block truncate text-[13px] text-soft">{it.sub}</span>}
              </span>
              <span className="text-rubric" aria-hidden="true">→</span>
            </button>
          ))}
        </section>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className={tile} onClick={() => go("class")}>
          <span className={head}>Class quiz</span>
          <span className={note}>{cls.sections.length || (cls.own || []).length
            ? <>This week: {cls.sections.map(sectionLabel).join("; ") || "your own list"}{cls.words.length ? ` · ${cls.words.length} words` : ""}</>
            : "Add the chapters or Summa articles you’re reading, then write out the dictionary entries."}</span>
        </button>
        <button type="button" className={tile} onClick={() => go("study")}>
          <span className={head}>Exam preparation</span>
          <span className={note}>Today’s session: {doneToday === 4 ? "done ✓" : `${doneToday} of 4 steps`}{dueCount ? ` · ${dueCount} reviews due` : ""}{examLeft ? ` · ${examLeft}` : ""}</span>
        </button>
        <div className={`${tile} hover:border-rule`}>
          <button type="button" className="flex flex-col gap-1 text-left" onClick={() => go("office")}>
            <span className={head}>Today’s Office</span>
            <span lang="la" className={`${note} latin`}>{office ? office.t : "The Office and Mass of the day, Latin and English"}{officeRead ? <span className="text-ok"> · ✓ Matins read</span> : null}</span>
          </button>
          <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label="Open an Hour">
            {[["m", "Matins"], ["l", "Lauds"], ["v", "Vespers"], ["c", "Compline"]].map(([h, l]) => (
              <button key={h} type="button" onClick={() => openHour(h)} className="rounded-md border border-rule bg-paper px-2.5 py-1 text-[13px] text-ink hover:border-soft">{l}</button>
            ))}
            <button type="button" onClick={() => { writeLocal(OFFICE_KEY, { ...(readLocal(OFFICE_KEY) || {}), part: "mass" }); go("office"); }} className="rounded-md border border-rule bg-paper px-2.5 py-1 text-[13px] text-ink hover:border-soft">Mass</button>
            <button type="button" onClick={() => { writeLocal(OFFICE_KEY, { ...(readLocal(OFFICE_KEY) || {}), part: "sunday" }); go("office"); }} className="rounded-md border border-rule bg-paper px-2.5 py-1 text-[13px] text-ink hover:border-soft">Sunday prep</button>
          </div>
        </div>
        <button type="button" className={tile} onClick={() => go("library")}>
          <span className={head}>Read &amp; look up</span>
          <span className={note}>Search the whole Summa, the Catena Aurea, the Fathers, the Roman Catechism and Ritual, both Codes of canon law and the Vulgate, with every word tappable.</span>
        </button>
      </div>
      <button type="button" onClick={() => go("about")} className="self-start text-[14px] text-rubric underline underline-offset-2">How this app works: word help, AI marking, your data, sources, and the open-source code →</button>
    </div>
  );
}
