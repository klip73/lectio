/* ---------- My calendar: local feasts, rank changes, transfers (1960 rubrics) ----------
   The built calendar is the universal 1960 one. Here a student adds what his own place keeps: the principal patron, the
   titular and dedication of his church, his diocese's and his order's feasts, any feast raised or lowered in class, moved,
   or kept only one year. Each local entry is set against the universal day by the 1960 table of precedence
   (Rubricae generales nn. 91–97, simplified): the higher day is celebrated, the other is commemorated if the rubrics allow it,
   and an impeded first-class feast is transferred to the next day free of first- and second-class days.
   The texts of a local feast are those of a feast in the calendar the student chooses (its proper, or one of the same
   Common); the built texts are never rewritten, so a raised class is noted, not regenerated. Every result can be overridden
   for any year. Applied to the 1960 calendar only. */
const LC_KEY = "lectio-vulgata-localcal";
const LC_CLASS = ["", "I. classis", "II. classis", "III. classis", "IV. classis"];
const LC_PRESETS = [
  ["patron-place", "Principal patron of the place (city, town)", 1],
  ["patron-diocese", "Principal patron of the diocese, province or nation", 1],
  ["titular-own", "Titular of your own church", 1],
  ["dedication-own", "Anniversary of the dedication of your own church", 1],
  ["dedication-cathedral", "Dedication of the cathedral (in the rest of the diocese)", 2],
  ["titular-cathedral", "Titular of the cathedral (in the rest of the diocese)", 2],
  ["order", "Titular, founder or principal patron of your order or institute", 1],
  ["order-feast", "Feast proper to your order or institute", 3],
  ["diocese-feast", "Feast proper to your diocese", 3],
  ["secondary-patron", "Secondary patron", 3],
  ["rank", "Raise or lower a feast already in the calendar", 0],
  ["custom", "Something else", 3]
];
const LC_KINDS = [["", "All"], ["lord", "Our Lord"], ["bvm", "Our Lady"], ["dedication", "Dedication"], ["apostle", "Apostles"], ["martyr-bishop", "Martyr bishops"], ["martyr", "Martyrs"],
  ["confessor-bishop", "Confessor bishops"], ["doctor", "Doctors"], ["confessor", "Confessors"], ["abbot", "Abbots"], ["virgin-martyr", "Virgin martyrs"], ["virgin", "Virgins"], ["holy-woman", "Holy women"], ["angels", "Angels"]];
const LC_DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LC_MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/* What a class brings with it in the Office and Mass (1960), shown when a feast's class is changed: the built texts keep the old class. */
const LC_CLASS_NOTE = {
  1: "First class: First and Second Vespers; Matins of three nocturns and nine lessons, festal psalms; at Lauds and the Little Hours the psalms of Sunday; Gloria and Creed at Mass; only privileged commemorations; transferred if impeded.",
  2: "Second class: Second Vespers only (First Vespers only for feasts of the Lord); Matins of three nocturns, nine lessons; Sunday psalms at Lauds and the Little Hours; Gloria at Mass, the Creed only if the feast has one; one commemoration allowed; not transferred if impeded but commemorated.",
  3: "Third class: Vespers of the feast only from the Chapter; Matins of one nocturn with three lessons (the third of the saint), psalms of the weekday at Matins and the Little Hours; Gloria, no Creed; commemorated when impeded.",
  4: "Fourth class (commemoration only): its prayer is added at Lauds and at Mass after the prayer of the day; nothing else of it is said."
};
function readLC() { const v = readLocal(LC_KEY); return v && Array.isArray(v.entries) ? v : { entries: [] }; }
let lcStamp = 0;
function writeLC(v) { writeLocal(LC_KEY, v); lcStamp++; lcCache = {}; try { window.dispatchEvent(new Event("lv-localcal")); } catch (e) {} }
function lcEaster(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, mo - 1, da));
}
const lcIso = d => d.toISOString().slice(0, 10);
const lcAdd = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return lcIso(d); };
/* The date of an entry in a year: fixed day, one year only, the nth (or last) weekday of a month, days from Easter,
   or the first given weekday on or after a fixed day (e.g. "the Sunday after 15 August"). */
function lcRuleDate(r, y) {
  if (!r) return null;
  if (r.type === "once") return r.iso && +r.iso.slice(0, 4) === y ? r.iso : null;
  if (r.type === "fixed") return /^\d\d-\d\d$/.test(r.md || "") ? `${y}-${r.md}` : null;
  if (r.type === "easter") return lcAdd(lcIso(lcEaster(y)), +r.offset || 0);
  if (r.type === "nth") {
    const m = +r.month, wd = +r.weekday, n = +r.n;
    if (n === -1) { const last = new Date(Date.UTC(y, m, 0)); const back = (last.getUTCDay() - wd + 7) % 7; last.setUTCDate(last.getUTCDate() - back); return lcIso(last); }
    const first = new Date(Date.UTC(y, m - 1, 1)); const fwd = (wd - first.getUTCDay() + 7) % 7; first.setUTCDate(1 + fwd + 7 * (n - 1));
    return first.getUTCMonth() === m - 1 ? lcIso(first) : null;
  }
  if (r.type === "after") {
    if (!/^\d\d-\d\d$/.test(r.md || "")) return null;
    const d = new Date(`${y}-${r.md}T00:00:00Z`); const wd = +r.weekday; let fwd = (wd - d.getUTCDay() + 7) % 7; if (r.strict && !fwd) fwd = 7;
    return lcAdd(lcIso(d), fwd);
  }
  return null;
}
function lcRuleText(r) {
  if (!r) return "";
  const md = s => s ? `${+s.slice(3)} ${LC_MON[+s.slice(0, 2) - 1]}` : "";
  if (r.type === "fixed") return md(r.md);
  if (r.type === "once") return `${md(r.iso && r.iso.slice(5))} ${r.iso ? r.iso.slice(0, 4) : ""} only`;
  if (r.type === "easter") { const o = +r.offset || 0; return o === 0 ? "Easter Sunday" : `${Math.abs(o)} day${Math.abs(o) === 1 ? "" : "s"} ${o > 0 ? "after" : "before"} Easter`; }
  if (r.type === "nth") return `${+r.n === -1 ? "last" : ["", "first", "second", "third", "fourth", "fifth"][+r.n]} ${LC_DOW[+r.weekday]} of ${LC_MON[+r.month - 1]}`;
  if (r.type === "after") return `the ${LC_DOW[+r.weekday]} ${r.strict ? "after" : "on or after"} ${md(r.md)}`;
  return "";
}
const lcCls = k => { const m = (k || "").match(/\b(I|II|III|IV)\. classis/); return m ? { I: 1, II: 2, III: 3, IV: 4 }[m[1]] : 4; };
const lcNorm = t => (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/j/g, "i").replace(/[^a-z]/g, "");
const LC_LORD = /Domini|D\. ?N\. ?J|Jesu|Iesu|Christi|Cordis Jesu|Trinitat|Transfigur|Crucis|Salvatoris|Nominis Jesu|Familiæ|Circumcisio|Epiphan|Ascensio|Corporis|Regis$/;
/* Precedence of the universal day (lower wins), after the 1960 table. */
function lcUPrec(d, iso) {
  const t = d.t || "", c = lcCls(d.k), sun = /^Dominica/.test(t) || (new Date(iso + "T12:00:00Z").getUTCDay() === 0 && /Dominica/.test(t));
  const feria = /^(Feria|Sabbato|Die |Diei |Dies )/.test(t), vigil = /Vigilia/.test(t), lord = !sun && !feria && LC_LORD.test(t) && !/^S{1,2}s?\.\s/.test(t);
  if (c === 1) {
    if (/Paschæ|Resurrectionis|Pentecostes/.test(t) && (sun || /^Dominica|Resurrectionis/.test(t))) return 1;
    if (/Nativitate Domini/.test(t)) return 2;
    if (/Cena Domini|Parasceve|Sabbato Sancto/.test(t)) return 3;
    if (lord) return 4;
    if (sun) return 5;
    if (/Cinerum|Hebdomadæ Sanctæ/.test(t)) return 6;
    if (/infra octavam (Paschæ|Pentecostes)|Octavæ Paschæ/i.test(t)) return 7;
    if (vigil) return 8;
    if (/Defunctorum/.test(t)) return 10;
    return 9;
  }
  if (c === 2) {
    if (lord) return 13;
    if (sun) return 14;
    if (/infra Octavam Nativitatis|Octavæ Nativitatis/i.test(t) && feria) return 16;
    if (feria) return 17;      // Advent 17–23 December, Ember days
    if (vigil) return 19;
    return 15;
  }
  if (c === 3) {
    if (feria && /Quadragesim|Passionis/.test(t + (d.o || ""))) return 20;
    if (vigil) return 23;
    if (feria) return 24;      // Advent ferias before 17 December
    return 21;
  }
  return feria ? 32 : 30;
}
const lcLPrec = e => e.k === 1 ? 11 : e.k === 2 ? (e.lord ? 13.5 : 18) : e.k === 3 ? 22 : 31;
/* May the loser be commemorated on the winner's day? (1960: on first-class days only privileged commemorations; otherwise one.) */
function lcPrivileged(d) { const t = (d.t || ""); return /^Dominica/.test(t) || (/^(Feria|Sabbato)/.test(t) && (/Adventus|Quadragesim|Passionis|Quattuor Temporum/.test(t + (d.o || "")) || lcCls(d.k) <= 2)); }
function lcCanCommemUniversal(winPrec, d, iso) {
  const up = lcUPrec(d, iso);
  if (up >= 32) return false;                 // a plain weekday is not commemorated
  if (winPrec <= 12) return lcPrivileged(d);
  return true;
}
let lcCache = {};
/* The local calendar for one year: { "MM-DD": { e, rerank, com: [titles], notes: [..], lost: [entries commemorated or omitted] } } */
async function lcYear(yr) {
  const key = lcStamp + ":" + yr;
  if (lcCache[key]) return lcCache[key];
  const lc = readLC();
  const out = {};
  if (!lc.entries.length) return (lcCache[key] = out);
  let days = {};
  try { days = await officeGet("days-" + yr); } catch (e) { return (lcCache[key] = out); }
  const slot = md => (out[md] = out[md] || { e: null, com: [], notes: [], lost: [] });
  const occ = lc.entries.map(e => {
    const ex = (e.ex || {})[yr];
    if (ex === "skip") return null;
    const iso = typeof ex === "string" && /^\d{4}-\d\d-\d\d$/.test(ex) ? ex : lcRuleDate(e.rule, yr);
    return iso && +iso.slice(0, 4) === yr ? { e, iso, force: ex === "force" || (typeof ex === "string" && ex.length === 10) } : null;
  }).filter(Boolean).sort((a, b) => lcLPrec(a.e) - lcLPrec(b.e) || a.iso.localeCompare(b.iso));
  const taken = {};
  for (const o of occ) {
    const { e } = o;
    let iso = o.iso, md = iso.slice(5), u = days[md], lp = lcLPrec(e);
    /* a raised or lowered feast on a day the calendar already keeps it: the day is simply re-ranked */
    if (e.replaces && u && lcNorm(u.t) === lcNorm(e.replaces) && !taken[md]) {
      const s = slot(md); s.e = e; s.rerank = true; taken[md] = e;
      if (lcCls(u.k) !== e.k) s.notes.push(`Kept here as ${LC_CLASS[e.k].replace(". classis", "")} class (the calendar has it as ${u.k}).`);
      continue;
    }
    const up = u ? lcUPrec(u, iso) : 99;
    if (o.force || (!taken[md] && lp < up)) {
      const s = slot(md); s.e = e; taken[md] = e;
      if (o.force) s.notes.push("Kept on this day by your choice for " + yr + ".");
      if (u) { if (lcCanCommemUniversal(lp, u, iso)) s.com.push(u.t); else if (lcUPrec(u, iso) < 32) s.notes.push(`${u.t} is not commemorated (only privileged commemorations on a first-class day).`); }
      continue;
    }
    /* impeded */
    const by = taken[md] ? taken[md].title : u ? u.t : "another day";
    if (e.k === 1) {
      let j = 1, dest = null;
      for (; j < 60; j++) {
        const iso2 = lcAdd(iso, j); if (+iso2.slice(0, 4) !== yr) break;
        const u2 = days[iso2.slice(5)];
        if (!taken[iso2.slice(5)] && (!u2 || lcUPrec(u2, iso2) >= 20)) { dest = iso2; break; }
      }
      if (dest) {
        const s = slot(dest.slice(5)), u2 = days[dest.slice(5)]; s.e = e; taken[dest.slice(5)] = e;
        s.notes.push(`Transferred from ${+md.slice(3)} ${LC_MON[+md.slice(0, 2) - 1]} (impeded by ${by}).`);
        if (u2 && lcCanCommemUniversal(lp, u2, dest)) s.com.push(u2.t);
        slot(md).lost.push({ e, how: `transferred to ${+dest.slice(8)} ${LC_MON[+dest.slice(5, 7) - 1]}` });
      } else slot(md).lost.push({ e, how: "impeded, and no free day found to transfer it to this year: choose a day for it under My calendar" });
      continue;
    }
    const winPrec = taken[md] ? lcLPrec(taken[md]) : up;
    if (winPrec > 12 && e.k <= 3) slot(md).lost.push({ e, how: "commemorated (impeded by " + by + ")", com: true });
    else slot(md).lost.push({ e, how: "omitted this year (impeded by " + by + ")" });
  }
  return (lcCache[key] = out);
}
/* The day as the student keeps it: the universal record, with a local feast (its texts from the chosen feast) when it wins. */
async function lcApply(iso, hour, base) {
  if (OFFICE_V || !readLC().entries.length) return base;
  const yr = +iso.slice(0, 4), r = (await lcYear(yr))[iso.slice(5)];
  if (!r) return base;
  const comLocal = r.lost.filter(x => x.com).map(x => x.e.title);
  const lostNotes = r.lost.map(x => `${x.e.title}: ${x.how}.`);
  if (!r.e) return comLocal.length || lostNotes.length ? { ...base, o: [base.o, ...comLocal.map(t => "Commemoratio: " + t)].filter(Boolean).join("; "), local: { notes: lostNotes, com: comLocal } } : base;
  const e = r.e, k = LC_CLASS[e.k];
  const com = [...r.com, ...comLocal];
  const local = { e, notes: [...r.notes, ...lostNotes], com, rerank: !!r.rerank };
  if (r.rerank) return { ...base, k, local };
  const o = com.map(t => "Commemoratio: " + t).join("; ");
  if (!e.src) return { ...base, t: e.title, k, o, ht: null, local: { ...local, noTexts: true } };
  try {
    const src = hour ? await officeDayBase(e.src, hour) : null;
    return { ...base, ...(src && !src.missing ? { sections: src.sections, hour } : {}), t: e.title, k, o, ht: null, local: { ...local, srcTitle: e.srcTitle } };
  } catch (err) { return { ...base, t: e.title, k, o, ht: null, local: { ...local, noTexts: true } }; }
}

/* ----- the editor ----- */
let lcFeastsPromise = null;
function loadFeasts() { if (!lcFeastsPromise) lcFeastsPromise = officeGet("feasts").catch(e => { lcFeastsPromise = null; throw e; }); return lcFeastsPromise; }
function FeastPicker({ value, onPick, kind0 }) {
  const [list, setList] = useState(null);
  const [q, setQ] = useState(""), [kind, setKind] = useState(kind0 || "");
  useEffect(() => { loadFeasts().then(setList).catch(() => setList([])); }, []);
  if (!list) return <p className="text-[14px] text-soft">Loading the calendar’s feasts…</p>;
  const nq = lcNorm(q);
  const hits = list.filter(f => f[3] && (!kind || f[4] === kind) && (!nq || lcNorm(f[0]).includes(nq))).slice(0, 60);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">{LC_KINDS.map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
        className={`rounded-md border px-2 py-0.5 text-[13px] ${kind === k ? "border-rubric bg-rubrictint text-rubric" : "border-rule bg-paper text-ink"}`}>{l}</button>)}</div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search feasts (e.g. Joseph, Martyris, Dedicatione)" className="w-full rounded-md border border-rule bg-paper px-3 py-1.5 text-[15px] text-ink" />
      <ul className="max-h-60 overflow-y-auto rounded-md border border-rule bg-paper text-[14px]">
        {hits.map(f => <li key={f[0]}><button type="button" onClick={() => onPick(f)} className={`flex w-full justify-between gap-2 px-3 py-1 text-left hover:bg-leaf ${value === f[3] ? "bg-rubrictint" : ""}`}>
          <span lang="la" className="latin min-w-0 truncate">{f[0]}</span><span className="num flex-none text-[12px] text-soft">{+f[1].slice(3)}/{+f[1].slice(0, 2)} · {["", "I", "II", "III", "IV"][f[2]]}</span></button></li>)}
        {!hits.length && <li className="px-3 py-2 text-soft">No feast found.</li>}
      </ul>
      <p className="text-[12px] text-soft">The local feast is read with this feast’s texts. For a saint not in the calendar choose one of the same Common (a confessor bishop, a virgin…); for a dedication, the Dedication of the Lateran (9 November).</p>
    </div>
  );
}
function RuleEditor({ rule, onChange }) {
  const r = rule || { type: "fixed", md: "01-01" };
  const set = p => onChange({ ...r, ...p });
  const sel = "rounded-md border border-rule bg-paper px-2 py-1 text-[14px] text-ink";
  const mdIn = (v, f) => <input type="date" value={`2028-${v || "01-01"}`} onChange={e => e.target.value && f(e.target.value.slice(5))} className={sel} aria-label="Day" />;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[14px] text-ink">
      <select value={r.type} onChange={e => onChange({ type: e.target.value, md: r.md || "01-01", weekday: 0, n: 1, month: 1, offset: 0, iso: isoOf(new Date()) })} className={sel} aria-label="Kind of date">
        <option value="fixed">Every year on</option><option value="after">A weekday on or after a date</option><option value="nth">The nth weekday of a month</option>
        <option value="easter">Counted from Easter</option><option value="once">One year only</option>
      </select>
      {r.type === "fixed" && mdIn(r.md, md => set({ md }))}
      {r.type === "once" && <input type="date" value={r.iso || ""} onChange={e => e.target.value && set({ iso: e.target.value })} className={sel} aria-label="Date" />}
      {r.type === "easter" && <><input type="number" value={r.offset || 0} onChange={e => set({ offset: +e.target.value })} className={`${sel} w-20`} aria-label="Days from Easter" /><span className="text-soft">days (− before, + after; Pentecost +49, Corpus Christi +60)</span></>}
      {r.type === "nth" && <>
        <select value={r.n} onChange={e => set({ n: +e.target.value })} className={sel}>{[[1, "first"], [2, "second"], [3, "third"], [4, "fourth"], [5, "fifth"], [-1, "last"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select value={r.weekday} onChange={e => set({ weekday: +e.target.value })} className={sel}>{LC_DOW.map((d, i) => <option key={i} value={i}>{d}</option>)}</select>
        <span>of</span><select value={r.month} onChange={e => set({ month: +e.target.value })} className={sel}>{LC_MON.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}</select>
      </>}
      {r.type === "after" && <>
        <select value={r.weekday} onChange={e => set({ weekday: +e.target.value })} className={sel}>{LC_DOW.map((d, i) => <option key={i} value={i}>{d}</option>)}</select>
        <select value={r.strict ? "1" : "0"} onChange={e => set({ strict: e.target.value === "1" })} className={sel}><option value="0">on or after</option><option value="1">after</option></select>
        {mdIn(r.md, md => set({ md }))}
      </>}
    </div>
  );
}
function LocalEditor({ entry, isNew, onSave, onCancel, onDelete }) {
  const [e, setE] = useState(() => entry || { id: "lc" + Date.now().toString(36), preset: "patron-place", title: "", k: 1, rule: { type: "fixed", md: "01-01" }, src: "", srcTitle: "", lord: false, replaces: "", oratio: "", ex: {} });
  const set = p => setE(x => ({ ...x, ...p }));
  const [exY, setExY] = useState(String(new Date().getFullYear())), [exV, setExV] = useState("force"), [exD, setExD] = useState("");
  const inp = "w-full rounded-md border border-rule bg-paper px-3 py-1.5 text-[15px] text-ink";
  const isRank = e.preset === "rank";
  function pickFeast(f) {
    if (isRank) set({ src: f[3], srcTitle: f[0], replaces: f[0], title: f[0], rule: { type: "fixed", md: f[1] }, lord: f[4] === "lord" });
    else set({ src: f[3], srcTitle: f[0], title: e.title || "", lord: e.lord || f[4] === "lord" || f[4] === "dedication" });
  }
  const ok = e.title.trim() && e.k >= 1 && e.k <= 4 && e.rule;
  return (
    <section className="reveal flex flex-col gap-3 rounded-lg border border-rubric bg-leaf px-5 py-4" aria-label="Local feast">
      <label className="flex flex-col gap-1 text-[14px] text-ink">What is it?
        <select value={e.preset} onChange={ev => { const p = LC_PRESETS.find(x => x[0] === ev.target.value); set({ preset: p[0], ...(p[2] ? { k: p[2] } : {}) }); }} className={inp}>
          {LC_PRESETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      {isRank ? (
        <div className="flex flex-col gap-1 text-[14px] text-ink"><span>The feast {e.replaces ? <b lang="la" className="latin">{e.replaces}</b> : "(choose it below)"}</span>
          <FeastPicker value={e.src} onPick={pickFeast} /></div>
      ) : (
        <label className="flex flex-col gap-1 text-[14px] text-ink">Title (Latin, as in your Ordo)
          <input lang="la" value={e.title} onChange={ev => set({ title: ev.target.value })} placeholder="e.g. In Festo B. Mariæ Virginis de Guadalupe" className={`${inp} latin`} /></label>
      )}
      <div className="flex flex-wrap items-center gap-2 text-[14px] text-ink"><span>Class</span>
        {[1, 2, 3, 4].map(c => <button key={c} type="button" aria-pressed={e.k === c} onClick={() => set({ k: c })}
          className={`rounded-md border px-2.5 py-1 ${e.k === c ? "border-rubric bg-rubrictint font-semibold text-rubric" : "border-rule bg-paper"}`}>{["", "I", "II", "III", "IV (commemoration)"][c]}</button>)}
        <label className="ml-2 flex items-center gap-1.5"><input type="checkbox" checked={!!e.lord} onChange={ev => set({ lord: ev.target.checked })} /> a feast of Our Lord (or a dedication)</label>
      </div>
      <p className="text-[12px] text-soft">{LC_CLASS_NOTE[e.k]}</p>
      <div className="flex flex-col gap-1 text-[14px] text-ink"><span>When</span><RuleEditor rule={e.rule} onChange={rule => set({ rule })} /></div>
      {!isRank && <div className="flex flex-col gap-1 text-[14px] text-ink"><span>Texts: read it with the texts of {e.srcTitle ? <b lang="la" className="latin">{e.srcTitle}</b> : "…"}{e.src && <button type="button" className="ml-2 text-[13px] text-soft underline" onClick={() => set({ src: "", srcTitle: "" })}>none</button>}</span>
        <FeastPicker value={e.src} onPick={pickFeast} /></div>}
      <label className="flex flex-col gap-1 text-[14px] text-ink">Proper collect (optional: shown above the texts)
        <textarea lang="la" rows={3} value={e.oratio || ""} onChange={ev => set({ oratio: ev.target.value })} className={`${inp} latin`} /></label>
      <div className="flex flex-col gap-1 text-[14px] text-ink"><span>Exceptions for a single year</span>
        <div className="flex flex-wrap items-center gap-2">
          <input type="number" value={exY} onChange={ev => setExY(ev.target.value)} className="w-24 rounded-md border border-rule bg-paper px-2 py-1" aria-label="Year" />
          <select value={exV} onChange={ev => setExV(ev.target.value)} className="rounded-md border border-rule bg-paper px-2 py-1"><option value="force">keep it on its day whatever occurs</option><option value="skip">leave it out</option><option value="move">put it on…</option></select>
          {exV === "move" && <input type="date" value={exD} onChange={ev => setExD(ev.target.value)} className="rounded-md border border-rule bg-paper px-2 py-1" />}
          <Btn onClick={() => { if (!/^\d{4}$/.test(exY)) return; const v = exV === "move" ? exD : exV; if (!v) return; set({ ex: { ...(e.ex || {}), [exY]: v } }); }}>Add</Btn>
        </div>
        {Object.keys(e.ex || {}).length > 0 && <ul className="text-[13px] text-soft">{Object.entries(e.ex).map(([y, v]) => <li key={y}>{y}: {v === "force" ? "kept on its day" : v === "skip" ? "left out" : "on " + v} <button type="button" className="underline" onClick={() => { const x = { ...e.ex }; delete x[y]; set({ ex: x }); }}>remove</button></li>)}</ul>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn variant="primary" disabled={!ok} onClick={() => onSave({ ...e, title: e.title.trim() })}>Save</Btn>
        <Btn onClick={onCancel}>Cancel</Btn>
        {!isNew && <Btn variant="warn" onClick={onDelete}>Delete</Btn>}
      </div>
    </section>
  );
}
function LocalCalendarView({ seed, onSeedDone, onPick }) {
  const [lc, setLc] = useState(readLC);
  const [edit, setEdit] = useState(null);
  const [code, setCode] = useState(""), [msg, setMsg] = useState("");
  const [preview, setPreview] = useState(null);
  const yr = new Date().getFullYear();
  useEffect(() => { if (seed) { setEdit(seed); onSeedDone && onSeedDone(); } }, [seed]);
  useEffect(() => {
    let alive = true;
    Promise.all([lcYear(yr), lcYear(yr + 1)]).then(([a, b]) => {
      if (!alive) return;
      const rows = [];
      [[yr, a], [yr + 1, b]].forEach(([y, m]) => Object.entries(m).forEach(([md, r]) => {
        if (r.e) rows.push({ iso: `${y}-${md}`, t: r.e.title, k: r.e.k, how: r.notes.join(" ") || (r.com.length ? "commemoration of " + r.com.join(", ") : "") });
        r.lost.forEach(x => rows.push({ iso: `${y}-${md}`, t: x.e.title, k: x.e.k, how: x.how, lost: true }));
      }));
      setPreview(rows.sort((p, q) => p.iso.localeCompare(q.iso)).filter(x => x.iso >= isoOf(new Date())).slice(0, 40));
    });
    return () => { alive = false; };
  }, [lc]);
  function save(e) { const entries = lc.entries.some(x => x.id === e.id) ? lc.entries.map(x => x.id === e.id ? e : x) : [...lc.entries, e]; const v = { ...lc, entries }; writeLC(v); setLc(v); setEdit(null); }
  function del(id) { const v = { ...lc, entries: lc.entries.filter(x => x.id !== id) }; writeLC(v); setLc(v); setEdit(null); }
  function exportCode() { setCode("LC1:" + btoa(unescape(encodeURIComponent(JSON.stringify(lc.entries))))); setMsg("Copy this code and send it to anyone who keeps the same calendar."); }
  function importCode() {
    const m = code.trim().match(/^LC1:([A-Za-z0-9+/=]+)$/);
    try {
      const arr = m && JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      if (!Array.isArray(arr)) throw 0;
      const clean = arr.filter(x => x && typeof x.title === "string" && x.k >= 1 && x.k <= 4 && x.rule).slice(0, 200).map(x => ({ ...x, title: x.title.slice(0, 160), oratio: String(x.oratio || "").slice(0, 2000) }));
      const ids = new Set(lc.entries.map(x => x.id));
      const v = { ...lc, entries: [...lc.entries, ...clean.filter(x => !ids.has(x.id))] }; writeLC(v); setLc(v); setMsg(`Added ${clean.filter(x => !ids.has(x.id)).length} feast(s).`); setCode("");
    } catch (e) { setMsg("That isn’t a calendar code (it starts LC1:)."); }
  }
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-rule bg-leaf px-5 py-4">
        <h2 className="text-[1.05rem] font-semibold text-ink">My calendar</h2>
        <p className="mt-1 text-[14px] text-soft">The feasts your own church, diocese and order keep, and any feast you raise, lower or move. Each is set against the universal 1960 calendar by the table of precedence: the higher day is kept, the other commemorated or (for a first-class feast) transferred. Check the result against your Ordo; you can override any year. Applies to the 1960 calendar.</p>
        <div className="mt-3 flex flex-wrap gap-2"><Btn variant="primary" onClick={() => setEdit("new")}>Add a feast</Btn><Btn onClick={() => setEdit({ id: "lc" + Date.now().toString(36), preset: "rank", title: "", k: 1, rule: { type: "fixed", md: "01-01" }, src: "", srcTitle: "", replaces: "", ex: {} })}>Raise or lower a feast</Btn></div>
      </section>
      {edit && <LocalEditor key={edit === "new" ? "new" : edit.id} entry={edit === "new" ? null : edit} isNew={edit === "new" || !lc.entries.some(x => x.id === edit.id)} onSave={save} onCancel={() => setEdit(null)} onDelete={() => del(edit.id)} />}
      {lc.entries.length > 0 && (
        <ul className="flex flex-col divide-y divide-[var(--rule)] rounded-lg border border-rule bg-leaf" aria-label="Your feasts">
          {lc.entries.map(e => <li key={e.id}><button type="button" onClick={() => setEdit(e)} className="grid w-full grid-cols-[1fr_auto] gap-2 px-4 py-2 text-left hover:bg-paper">
            <span><span lang="la" className="latin font-semibold text-ink">{e.title}</span><span className="block text-[13px] text-soft">{lcRuleText(e.rule)}{e.srcTitle && !e.replaces ? ` · texts of ${e.srcTitle}` : ""}{e.replaces ? " · re-ranked" : ""}</span></span>
            <span className="num text-[13px] text-rubric">{["", "I", "II", "III", "IV"][e.k]}</span></button></li>)}
        </ul>
      )}
      {preview && preview.length > 0 && (
        <section className="rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Coming up">
          <span className="smallcaps text-[14px] font-semibold text-rubric">Coming up in your calendar</span>
          <ul className="mt-2 flex flex-col gap-1 text-[14px]">{preview.map((p, i) => <li key={i}><button type="button" className="text-left hover:underline" onClick={() => onPick && onPick(p.iso)}>
            <span className="num text-soft">{p.iso}</span> <span lang="la" className={`latin ${p.lost ? "text-soft line-through decoration-1" : "text-ink"}`}>{p.t}</span> <span className="text-soft">{p.how}</span></button></li>)}</ul>
        </section>
      )}
      <section className="rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Share">
        <span className="smallcaps text-[14px] font-semibold text-rubric">Share this calendar</span>
        <p className="mt-1 text-[13px] text-soft">One person sets up the house’s calendar; everyone else pastes the code. It also travels in your backup code.</p>
        <div className="mt-2 flex flex-wrap gap-2"><Btn onClick={exportCode} disabled={!lc.entries.length}>Make a code</Btn><Btn onClick={importCode} disabled={!code.trim()}>Add from code</Btn>{code && <Btn onClick={() => { try { navigator.clipboard.writeText(code); setMsg("Copied."); } catch (e) {} }}>Copy</Btn>}</div>
        <textarea rows={2} value={code} onChange={e => setCode(e.target.value)} placeholder="LC1:…" className="mt-2 w-full rounded-md border border-rule bg-paper px-3 py-1.5 font-mono text-[12px] text-ink" />
        {msg && <p className="text-[13px] text-ink">{msg}</p>}
      </section>
    </div>
  );
}
/* Under the day's title: what the local calendar did today, and a way to change it. */
function LocalDayNote({ day, onEdit }) {
  const l = day && day.local;
  return (
    <div className="mt-2 flex flex-col gap-1">
      {l && (l.e || (l.notes && l.notes.length)) && (
        <div className="rounded-md border border-rubric bg-rubrictint px-3 py-2 text-[13px] text-ink">
          {l.e && <p><b>My calendar:</b> {l.rerank ? "re-ranked here" : <>local feast{l.srcTitle ? <>, with the texts of <span lang="la" className="latin">{l.srcTitle}</span></> : ""}</>}.</p>}
          {l.noTexts && <p>No texts chosen for it: the day’s own texts are shown below. Choose a feast for its texts under My calendar.</p>}
          {(l.notes || []).map((n, i) => <p key={i}>{n}</p>)}
          {l.e && (l.rerank || l.e.k <= 2) && <p className="text-soft">{LC_CLASS_NOTE[l.e.k]} The texts below are as built; adapt them as your Ordo directs.</p>}
          {l.e && l.e.oratio && <p lang="la" className="latin mt-1"><b>Oratio propria.</b> {l.e.oratio}</p>}
        </div>
      )}
      {!OFFICE_V && <button type="button" onClick={onEdit} className="self-start text-[13px] text-soft underline">Different here? Add a local feast or change this day’s rank</button>}
    </div>
  );
}
