/* ---------- Settings: one panel for everything a student can change (the gear button in the header) ----------
   Stored under one key (SET_KEY), read synchronously anywhere with getSet(name); setSet(patch) saves, applies what is
   drawn by CSS (sizes, fonts, drop capitals, rubrics, tap targets, spelling) and tells the app to redraw ("lv-settings").
   page.html applies the CSS part before the first paint, from the same key.
   The older keys stay where they were (display, font, theme, office calendar), so older versions still read them. */
var SET_KEY = "lectio-vulgata-settings";
var SET_DEFAULTS = {
  /* reading and display */
  laSize: "1", enSize: "1", uiFont: "default", dropcap: true, big: false,
  marks: "printed", uv: "printed", ij: "printed", lig: "printed",
  enShow: "beside", tap: "full", unknown: "off",
  /* AI */
  ai: true, aiStrict: "standard", aiHelp: "full", speech: true,
  /* flashcards and study */
  newPerDay: 20, revCap: 0, retention: 90, dir: "la", typed: false, capsMatch: false, uvMatch: false,
  pron: "church", goal: "standard", streaks: true, examClock: true,
  /* liturgy */
  lpart: "last", lhour: "last", commem: "show", rubrics: true,
  /* home and layout */
  start: "home", tiles: [], hideTiles: [], showContinue: true, hideDict: false,
  /* data */
  backupEvery: 14
};
var _SET = null;
function cleanSettings(v) {
  const o = { ...SET_DEFAULTS };
  if (v && typeof v === "object") for (const k of Object.keys(SET_DEFAULTS)) {
    const d = SET_DEFAULTS[k], x = v[k];
    if (Array.isArray(d) ? Array.isArray(x) : typeof x === typeof d) o[k] = Array.isArray(x) ? x.filter(s => typeof s === "string").slice(0, 20) : x;
  }
  return o;
}
function allSettings() { if (!_SET) _SET = cleanSettings(readLocal(SET_KEY)); return _SET; }
function getSet(k) { return allSettings()[k]; }
function setSet(patch) {
  _SET = cleanSettings({ ...allSettings(), ...patch });
  writeLocal(SET_KEY, _SET);
  applySettings(_SET);
  if ("ai" in patch) { try { aiChanged(); } catch (e) {} }
  try { window.dispatchEvent(new Event("lv-settings")); } catch (e) {}
}
/* Redraw a component when settings change. */
function useSettings() {
  const [, setT] = useState(0);
  useEffect(() => { const f = () => setT(t => t + 1); window.addEventListener("lv-settings", f); return () => window.removeEventListener("lv-settings", f); }, []);
  return allSettings();
}

/* ----- what is drawn by CSS ----- */
const UI_FONTS = { default: ["Source Sans 3", ""], atkinson: ["Atkinson Hyperlegible", "Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400"], lexend: ["Lexend", "Lexend:wght@400;500;600"] };
function applySettings(s) {
  const r = document.documentElement;
  r.style.setProperty("--lv-la", s.laSize || "1");
  r.style.setProperty("--lv-en", s.enSize || "1");
  const flag = (name, on) => { if (on) r.setAttribute(name, "1"); else r.removeAttribute(name); };
  flag("data-nodrop", !s.dropcap); flag("data-big", s.big); flag("data-norubrics", !s.rubrics);
  const f = UI_FONTS[s.uiFont] || UI_FONTS.default;
  if (f[1] && !document.getElementById("lvui-" + s.uiFont)) {
    const l = document.createElement("link"); l.id = "lvui-" + s.uiFont; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=" + f[1] + "&display=swap"; document.head.appendChild(l);
  }
  if (s.uiFont && s.uiFont !== "default") r.style.setProperty("--font-ui", `"${f[0]}", "Segoe UI", system-ui, sans-serif`); else r.style.removeProperty("--font-ui");
  laFilterRefresh();
}

/* ----- spelling and vowel marks of the Latin as shown -----
   Only what is drawn changes: tapping, searching and marking still use the text as printed. Text inside lang="la"
   is rewritten in place (a MutationObserver keeps up with React); lang="en", inputs and data-raw (the Meter) are left alone.
   u→v and i→j are guesses from the letters around them (vowel before and after, initial before a vowel, a few prefixes). */
const ROMAN_TOK = /^[IVXLCDM]+$/;
const LA_V = "aeiouyæœ";
function laConsonantal(word, letter) {
  /* indices (into the decomposed word) of u or i used as consonants */
  const ch = Array.from(word.normalize("NFD"));
  const base = [];   // [index in ch, lowercase letter]
  ch.forEach((c, i) => { if (!/[̀-ͯ]/.test(c)) base.push([i, c.toLowerCase()]); });
  const low = base.map(b => b[1]).join("");
  const isV = c => !!c && LA_V.includes(c);
  /* u after q (and after ng: lingua, sanguis) is not a vowel of its own */
  const vowelAt = k => k >= 0 && isV(base[k][1]) && !(base[k][1] === "u" && k > 0 && (base[k - 1][1] === "q" || (base[k - 1][1] === "g" && k > 1 && base[k - 2][1] === "n")));
  const hits = [];
  base.forEach(([i, c], k) => {
    if (c !== letter) return;
    const prev = k ? base[k - 1][1] : "", prev2 = k > 1 ? base[k - 2][1] : "", next = k + 1 < base.length ? base[k + 1][1] : "";
    if (letter === "u") {
      if (!isV(next)) return;
      if (prev === "q" || (prev === "g" && prev2 === "n")) return;
      const pre = low.slice(0, k);
      if (!prev) { hits.push(i); return; }                                   // uos, uita, uulnus
      if (vowelAt(k - 1) && !(prev === "u" && hits.includes(base[k - 1][0]))) { hits.push(i); return; }   // noua, auis, euangelium
      /* after r or l only before a, e, o (serua, saluo, solue) or "us/um" (seruus): before i it is often a perfect (aperui, uolui) */
      if ((prev === "r" || prev === "l") && isV(prev2) && ("aeo".includes(next) || next === "u" && k + 2 < base.length && /[sm]/.test(base[k + 2][1]))) { hits.push(i); return; }
      if (/^(con|in|ad|sub|ob|per|circum|trans|ab)$/.test(pre) && next !== "u") { hits.push(i); return; }   // conuenio, inuenio, aduentus
    } else {
      if (!isV(next) || next === "i") return;
      const pre = low.slice(0, k);
      if (!prev) { hits.push(i); return; }                                   // iam, Iesus, iustus
      if (vowelAt(k - 1)) { hits.push(i); return; }                          // eius, maior, cuius (not quia, quies)
      if (/^(ad|in|con|ob|sub|ab|circum|trans)$/.test(pre)) { hits.push(i); return; }   // adiuuo, iniuria, coniungo, obiectum
    }
  });
  if (!hits.length) return word;
  const up = letter === "u" ? ["v", "V"] : ["j", "J"];
  hits.forEach(i => { ch[i] = ch[i] === ch[i].toUpperCase() ? up[1] : up[0]; });
  return ch.join("").normalize("NFC");
}
function laSpell(text, s) {
  if (s.marks === "plain") text = text.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");
  if (s.lig === "split") text = text.replace(/æ/g, "ae").replace(/Æ/g, "Ae").replace(/œ/g, "oe").replace(/Œ/g, "Oe").replace(/ǽ/g, "áe").replace(/Ǽ/g, "Áe");
  if (s.uv === "printed" && s.ij === "printed") return text;
  return text.replace(/[\p{L}̀-ͯ]+/gu, w => {
    if (ROMAN_TOK.test(w) && w.length > 0 && w === w.toUpperCase()) return w;
    let x = w;
    if (s.uv === "u") x = x.replace(/v/g, "u").replace(/V/g, "U");
    else if (s.uv === "v") {
      /* decide consonant i first (adiuuo: the i is a consonant, so the u after it is a vowel), then put the i back if j isn't wanted */
      const orig = Array.from(x.normalize("NFC")), withJ = laConsonantal(x, "i");
      const y = Array.from(laConsonantal(withJ, "u"));
      x = s.ij === "j" ? y.join("") : y.map((c, k) => (/[jJ]/.test(c) && /[iI]/.test(orig[k] || "") ? orig[k] : c)).join("");
    }
    if (s.ij === "i") x = x.replace(/j/g, "i").replace(/J/g, "I");
    else if (s.ij === "j" && s.uv !== "v") x = laConsonantal(x, "i");
    return x;
  });
}
const LA_ORIG = new WeakMap();
var laObserver = null;
function laActive(s) { return s.marks === "plain" || s.lig === "split" || s.uv !== "printed" || s.ij !== "printed"; }
function laIsLatin(node) {
  const p = node.parentElement;
  if (!p) return false;
  const lang = p.closest("[lang]");
  if (!lang || lang.getAttribute("lang") !== "la") return false;
  return !p.closest("[data-raw], input, textarea, select, option, script, style");
}
function laFixNode(node, s) {
  const cur = node.nodeValue;
  if (!cur || !/\p{L}/u.test(cur)) return;
  const rec = LA_ORIG.get(node);
  const raw = rec && rec[1] === cur ? rec[0] : cur;
  const out = laActive(s) ? laSpell(raw, s) : raw;
  LA_ORIG.set(node, [raw, out]);
  if (out !== cur) node.nodeValue = out;
}
function laFixTree(root, s) {
  if (!root) return;
  if (root.nodeType === 3) { if (laIsLatin(root)) laFixNode(root, s); return; }
  if (root.nodeType !== 1) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) if (laIsLatin(n)) laFixNode(n, s);
}
function laFilterRefresh() {
  const s = allSettings();
  const on = laActive(s);
  if (!document.body) return;
  if (on && !laObserver && typeof MutationObserver !== "undefined") {
    laObserver = new MutationObserver(muts => {
      const st = allSettings();
      for (const m of muts) {
        if (m.type === "characterData") { if (laIsLatin(m.target)) laFixNode(m.target, st); }
        else m.addedNodes.forEach(x => laFixTree(x, st));
      }
    });
    laObserver.observe(document.body, { subtree: true, childList: true, characterData: true });
  }
  /* rewrite (or restore) what is on screen now; restoring needs the originals, so walk even when switching off */
  laFixTree(document.body, s);
  if (!on && laObserver) { laObserver.disconnect(); laObserver = null; }
}

/* ----- answer checking (forms trainer, write-it-out quiz, typed flashcards) -----
   Accents and macrons are never required: the app's answer lists don't carry macrons. Two stricter checks can be chosen:
   capitals must match (proper names), and u/v, i/j must be written as the answer has them. */
const ansLetters = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/æ/gi, "ae").replace(/œ/gi, "oe");
function ansStrictOk(got, want) {
  const g = ansLetters(got).replace(/[^A-Za-z\-]/g, ""), w = ansLetters(want).replace(/[^A-Za-z\-]/g, "");
  if (!g || !w) return true;
  if (getSet("uvMatch")) {
    const gl = g.toLowerCase().replace(/^-/, ""), wl = w.toLowerCase().replace(/^-/, "");
    const n = Math.min(gl.length, wl.length);
    if (gl.slice(-n) !== wl.slice(-n) && gl !== wl) {
      const fold = x => x.replace(/v/g, "u").replace(/j/g, "i");
      if (fold(gl.slice(-n)) === fold(wl.slice(-n))) return false;   // same word, different u/v or i/j
    }
  }
  if (getSet("capsMatch") && /^[A-Za-z]/.test(g) && /^[A-Za-z]/.test(w) && !w.startsWith("-")) {
    if ((g[0] === g[0].toUpperCase()) !== (w[0] === w[0].toUpperCase())) return false;
  }
  return true;
}

/* ----- pronunciation for "Listen": Church (Italian voice, as printed) or a classical respelling for that voice ----- */
function latinForSpeech(text) {
  if (getSet("pron") !== "classical") return text;
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC").replace(/[\p{L}]+/gu, w => {
    let x = w.toLowerCase().replace(/æ/g, "ai").replace(/œ/g, "oi").replace(/ae/g, "ai").replace(/oe/g, "oi").replace(/j/g, "i");
    x = laConsonantal(x, "u").replace(/v/g, "u");          // consonant u said as English w (Italian "ue", "ua")
    x = x.replace(/ch/g, "k").replace(/ph/g, "p").replace(/th/g, "t").replace(/c(?=[eiy])/g, "k").replace(/g(?=[eiy])/g, "gh").replace(/sc(?=[eiy])/g, "sk").replace(/^h/, "");
    return w[0] === w[0].toUpperCase() ? x[0].toUpperCase() + x.slice(1) : x;
  });
}

/* ----- flashcards: how many new words and reviews today ----- */
const SRS_DAY_KEY = "lectio-vulgata-srsday";
function srsToday() { const v = readLocal(SRS_DAY_KEY); const d = new Date().toDateString(); return v && v.d === d ? v : { d, n: 0, r: 0 }; }
function srsCount(kind) { const v = srsToday(); v[kind] = (v[kind] || 0) + 1; writeLocal(SRS_DAY_KEY, v); }
/* Intervals for the chosen retention: SM-2 intervals are tuned for about 90% recall when a card falls due. */
function retentionFactor() { const r = (+getSet("retention") || 90) / 100; return Math.log(r) / Math.log(0.9); }

/* ----- daily goal ----- */
const GOALS = { light: { words: 5, passages: 1, mins: 10, label: "Light" }, standard: { words: 10, passages: 2, mins: 20, label: "Standard" }, intense: { words: 25, passages: 4, mins: 40, label: "Intense" } };
const dailyGoal = () => GOALS[getSet("goal")] || GOALS.standard;

/* ----- the Liturgy's opening tab and hour ----- */
function hourByTime(d = new Date()) {
  const h = d.getHours();
  return h < 5 ? "m" : h < 7 ? "l" : h < 8 ? "p" : h < 11 ? "t" : h < 14 ? "s" : h < 16 ? "n" : h < 19 ? "v" : "c";
}

/* ----- settings travel with the backup code and progress file ----- */
function exportSettings() {
  try {
    return { s: allSettings(), disp: readLocal(DISPLAY_KEY) || undefined, font: readLocal(FONT_KEY) || undefined, theme: readLocal(THEME_KEY) || undefined, ver: (readLocal(OFFICE_KEY) || {}).ver || undefined };
  } catch (e) { return undefined; }
}
function importSettings(x) {
  if (!x || typeof x !== "object") return;
  try {
    if (x.s) setSet(cleanSettings(x.s));
    if (x.disp && typeof x.disp === "object") { writeLocal(DISPLAY_KEY, x.disp); applyDisplay(x.disp); }
    if (typeof x.font === "string" && FONT_L[x.font]) { writeLocal(FONT_KEY, x.font); try { window.LV_setFont && window.LV_setFont(x.font); } catch (e) {} }
    if (typeof x.theme === "string" && THEMES.some(t => t[0] === x.theme)) { writeLocal(THEME_KEY, x.theme); document.documentElement.setAttribute("data-theme", x.theme); }
    if (typeof x.ver === "string" && /^[a-z0-9]*$/.test(x.ver)) { writeLocal(OFFICE_KEY, { ...(readLocal(OFFICE_KEY) || {}), ver: x.ver }); try { window.dispatchEvent(new CustomEvent("lv-office-ver", { detail: x.ver })); } catch (e) {} }
  } catch (e) {}
}
const THEMES = [["auto", "As device"], ["light", "Light"], ["sepia", "Sepia"], ["dark", "Dark"], ["contrast", "High contrast"]];
const HOME_TILES = [["class", "Class quiz"], ["study", "Exam preparation"], ["office", "Today’s Office"], ["library", "Read & look up"], ["learn", "Learn Latin from the beginning"]];
const FOCUS_ORDER = { exam: ["study", "class", "office", "library", "learn"], class: ["class", "study", "office", "library", "learn"], learn: ["learn", "office", "library", "class", "study"], pray: ["office", "library", "learn", "class", "study"], read: ["library", "office", "class", "study", "learn"] };
/* All five tiles in order, each with whether it shows: the student's own order first, then the focus's; a tile the focus
   leaves out shows once the student switches it on. */
function tileList(focus) {
  const base = FOCUS_ORDER[focus] || ["learn", "class", "study", "office", "library"];
  const all = HOME_TILES.map(t => t[0]);
  const own = (getSet("tiles") || []).filter(k => all.includes(k));
  const order = [...own, ...base.filter(k => !own.includes(k)), ...all.filter(k => !own.includes(k) && !base.includes(k))];
  const hide = new Set(getSet("hideTiles") || []);
  return order.map(k => ({ k, on: !hide.has(k) && (base.includes(k) || own.includes(k)) }));
}
function homeTiles(focus) { return tileList(focus).filter(t => t.on).map(t => t.k); }

/* ----- the panel ----- */
function SetSeg({ items, value, onPick, label }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-rule bg-paper p-0.5 text-[14px]" role="group" aria-label={label}>
      {items.map(([k, l]) => <button key={String(k)} type="button" aria-pressed={value === k} onClick={() => onPick(k)} className={`rounded px-2.5 py-1 ${value === k ? "bg-ink text-paper" : "text-ink"}`}>{l}</button>)}
    </div>
  );
}
function SetRow({ label, hint, children, id }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      {id ? <label htmlFor={id} className="w-44 flex-none pt-1 text-[14px] text-soft">{label}</label> : <span className="w-44 flex-none pt-1 text-[14px] text-soft">{label}</span>}
      <div className="flex min-w-0 flex-col gap-1">{children}{hint && <span className="text-[12px] leading-snug text-soft">{hint}</span>}</div>
    </div>
  );
}
function SetCheck({ id, checked, onChange, children }) {
  return <label htmlFor={id} className="flex items-start gap-2 text-[14px] text-ink"><input id={id} type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-[var(--rubric)]" /><span>{children}</span></label>;
}
const SET_SECTIONS = [["display", "Display"], ["latin", "Latin text"], ["study", "Sentence study & hints"], ["ai", "AI"], ["cards", "Flashcards & study"], ["liturgy", "Liturgy"], ["layout", "Home & layout"], ["focus", "Your focus"], ["data", "Backup & data"]];
const SET_UI_KEY = "lectio-vulgata-settings-ui";
function SettingsPanel({ focus, onFocus, prefs, setPrefs, exam, onExam, onReset }) {
  const s = useSettings();
  const [st, setSt] = useStudyPrefs();
  const [open, setOpen0] = useState(() => { const v = readLocal(SET_UI_KEY); return Array.isArray(v) ? v : ["display"]; });
  const setOpen = k => { const n = open.includes(k) ? open.filter(x => x !== k) : [...open, k]; setOpen0(n); writeLocal(SET_UI_KEY, n); };
  /* display (the older keys, kept for older versions) */
  const [d, setD0] = useState(readDisplay);
  const setD = patch => { const n = { ...d, ...patch }; setD0(n); writeLocal(DISPLAY_KEY, n); applyDisplay(n); };
  const [font, setFont] = useState(() => { const v = readLocal(FONT_KEY); return FONT_L[v] ? v : "merriweather"; });
  const [theme, setTheme] = useState(() => { const v = readLocal(THEME_KEY); return THEMES.some(t => t[0] === v) ? v : "auto"; });
  function pickFont(k) { setFont(k); writeLocal(FONT_KEY, k); try { window.LV_setFont && window.LV_setFont(k); } catch (e) {} }
  function pickTheme(n) { setTheme(n); writeLocal(THEME_KEY, n === "auto" ? null : n); if (n === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", n); }
  /* the calendars (from the phone app's site) */
  const [vers, setVers] = useState(null);
  const [ver, setVer] = useState(() => (readLocal(OFFICE_KEY) || {}).ver || "");
  useEffect(() => { if (open.includes("liturgy") && !vers) loadVersions().then(setVers).catch(() => setVers([])); }, [open]);
  function pickVer(v) { setVer(v); writeLocal(OFFICE_KEY, { ...(readLocal(OFFICE_KEY) || {}), ver: v }); try { window.dispatchEvent(new CustomEvent("lv-office-ver", { detail: v })); } catch (e) {} }
  const [msg, setMsg] = useState("");
  const [armed, setArmed] = useState("");
  const marksVal = prefs && prefs.accents ? "accents" : s.marks;
  function pickMarks(v) {
    if (setPrefs) setPrefs(p => ({ ...p, accents: v === "accents" }));
    setSet({ marks: v === "plain" ? "plain" : "printed" });
  }
  function pickEn(v) {
    setSet({ enShow: v });
    /* the readers remember the English switch: set them all to match */
    const show = v !== "hidden";
    writeLocal(OFFICE_KEY, { ...(readLocal(OFFICE_KEY) || {}), en: show });
    writeLocal(LIB_KEY, { ...(readLocal(LIB_KEY) || {}), _en: show });
    try { writeLocal(SUMMA_POS_KEY, { ...(readLocal(SUMMA_POS_KEY) || {}), en: show }); } catch (e) {}
  }
  const tl = tileList(focus), tiles = tl.map(t => t.k);
  /* moving a tile fixes the whole order (only the shown ones and the moved one, so a hidden extra stays hidden) */
  function moveTile(k, dir) { const t = tiles.slice(), i = t.indexOf(k), j = i + dir; if (j < 0 || j >= t.length) return; [t[i], t[j]] = [t[j], t[i]]; setSet({ tiles: t.filter(x => x === k || x === t[i] || tl.find(y => y.k === x).on) }); }
  function toggleTile(k, show) {
    const h = new Set(s.hideTiles || []);
    if (show) { h.delete(k); const own = s.tiles || []; setSet({ hideTiles: [...h], tiles: own.includes(k) || (FOCUS_ORDER[focus] || FOCUS_ORDER.class).includes(k) ? own : [...tiles.filter(x => x === k || tl.find(y => y.k === x).on)] }); }
    else { h.add(k); setSet({ hideTiles: [...h] }); }
  }
  const sect = (k, l, body) => (
    <div key={k} className="border-t border-rule first:border-t-0">
      <button type="button" onClick={() => setOpen(k)} aria-expanded={open.includes(k)} className="flex w-full items-baseline justify-between gap-2 py-2.5 text-left">
        <span className="text-[15px] font-semibold text-ink">{l}</span><span className="text-rubric" aria-hidden="true">{open.includes(k) ? "▴" : "▾"}</span>
      </button>
      {open.includes(k) && <div className="flex flex-col gap-3.5 pb-4" role="group" aria-label={l}>{body}</div>}
    </div>
  );
  const onClaude = !!(window.claude && window.claude.use);
  return (
    <div className="flex flex-col">
      {sect("display", "Display", <>
        <SetRow label="Text size"><SetSeg label="Text size" items={DISP_SIZES} value={String(d.size || "1")} onPick={v => setD({ size: v })} /></SetRow>
        <SetRow label="Latin text size" hint="On top of the text size: makes the Latin of every reader larger than the rest."><SetSeg label="Latin text size" items={[["1", "Same"], ["1.1", "Larger"], ["1.22", "Largest"]]} value={s.laSize} onPick={v => setSet({ laSize: v })} /></SetRow>
        <SetRow label="English text size" hint="The translations beside or under the Latin."><SetSeg label="English text size" items={[["0.88", "Smaller"], ["1", "Same"], ["1.12", "Larger"]]} value={s.enSize} onPick={v => setSet({ enSize: v })} /></SetRow>
        <SetRow label="Latin font" id="disp-font">
          <select id="disp-font" value={font} onChange={e => pickFont(e.target.value)} className="self-start rounded-md border border-rule bg-paper px-2 py-1.5 text-[14px] text-ink">
            {Object.entries(FONT_L).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <span lang="la" className="latin text-[15px] text-ink">Ave María, grátia plena</span>
        </SetRow>
        <SetRow label="Font for everything else" hint="Atkinson Hyperlegible and Lexend are designed to be easy to read, including with dyslexia."><SetSeg label="Interface font" items={[["default", "Standard"], ["atkinson", "Atkinson Hyperlegible"], ["lexend", "Lexend"]]} value={s.uiFont} onPick={v => setSet({ uiFont: v })} /></SetRow>
        <SetRow label="Latin line spacing"><SetSeg label="Line spacing" items={[["normal", "Normal"], ["roomy", "Roomy"]]} value={d.lh || "normal"} onPick={v => setD({ lh: v })} /></SetRow>
        <SetRow label="Page width"><SetSeg label="Page width" items={[["0", "Reading column"], ["1", "Wide"]]} value={d.wide ? "1" : "0"} onPick={v => setD({ wide: v === "1" })} /></SetRow>
        <SetRow label="Colours"><SetSeg label="Theme" items={THEMES} value={theme} onPick={pickTheme} /></SetRow>
        <SetCheck id="set-drop" checked={s.dropcap} onChange={v => setSet({ dropcap: v })}>Large red first letters (drop capitals)</SetCheck>
        <SetCheck id="set-big" checked={s.big} onChange={v => setSet({ big: v })}>Larger buttons and more space between tappable words</SetCheck>
      </>)}
      {sect("latin", "Latin text", <>
        <SetRow label="Vowel marks" hint={marksVal === "plain" ? "Accents, macrons and diaereses are hidden everywhere, as on the exam." : marksVal === "accents" ? "Stress accents are added to the exam texts, as printed in the Breviary." : "As each text is printed (the Office and Missal carry stress accents; most other texts none)."}>
          <SetSeg label="Vowel marks" items={[["printed", "As printed"], ["accents", "Add stress accents"], ["plain", "Plain letters"]]} value={marksVal} onPick={pickMarks} />
        </SetRow>
        <SetRow label="u and v" hint={s.uv === "v" ? "Consonant u is shown as v (uos → vos, nouus → novus). A guess from the letters around it: occasionally wrong." : null}>
          <SetSeg label="u and v" items={[["printed", "As printed"], ["v", "u and v"], ["u", "u only"]]} value={s.uv} onPick={v => setSet({ uv: v })} />
        </SetRow>
        <SetRow label="i and j" hint={s.ij === "j" ? "Consonant i is shown as j (Iesus → Jesus, eius → ejus), as in many Church books. A guess: occasionally wrong." : null}>
          <SetSeg label="i and j" items={[["printed", "As printed"], ["j", "i and j"], ["i", "i only"]]} value={s.ij} onPick={v => setSet({ ij: v })} />
        </SetRow>
        <SetRow label="æ and œ"><SetSeg label="Ligatures" items={[["printed", "As printed"], ["split", "Write ae and oe"]]} value={s.lig} onPick={v => setSet({ lig: v })} /></SetRow>
        <p className="-mt-1 text-[13px] leading-snug text-ink"><span className="text-soft">Example:</span> <span lang="la" className="latin" key={[s.marks, s.uv, s.ij, s.lig].join()}>{laSpell("Iesus autem dixit eis: Uos estis lux mundi. Cæli enarrant glóriam Dei.", s)}</span></p>
        <SetRow label="English translations" hint="For the Office, the Mass, the Library and the Summa. Each reader still has its own switch.">
          <SetSeg label="English translations" items={[["hidden", "Hidden until I turn them on"], ["beside", "Beside the Latin"], ["under", "Under each line"]]} value={s.enShow} onPick={pickEn} />
        </SetRow>
        <SetRow label="Tapping a word" hint="The short view has a “More” button for the dictionaries and all parsings.">
          <SetSeg label="Tapping a word" items={[["gloss", "Short: meaning and parsing"], ["full", "Full word panel"]]} value={s.tap} onPick={v => setSet({ tap: v })} />
        </SetRow>
        <SetRow label="Underline words to learn" hint="Dotted underline under words not yet in your flashcards, or under the ones you probably don’t know (from your reviews and level). In Study passages, the Office, Mass and Library.">
          <SetSeg label="Underline words to learn" items={[["off", "Off"], ["new", "Not in my cards"], ["likely", "Probably unknown"]]} value={s.unknown} onPick={v => setSet({ unknown: v })} />
        </SetRow>
      </>)}
      {sect("study", "Sentence study & hints", <StudyOptions st={st} setSt={setSt} />)}
      {sect("ai", "AI", <>
        <SetCheck id="set-ai" checked={s.ai} onChange={v => setSet({ ai: v })}><b>Use AI</b> to mark translations and quizzes. Off: nothing is sent to {onClaude ? "Claude" : "Gemini or Groq"}, the AI button and every AI check are hidden, and marking uses the app’s own key-word check (for an exam-like practice, or when a teacher asks).</SetCheck>
        {s.ai && <>
          <SetRow label="How strict the marking is" hint={{ lenient: "Accepts free and idiomatic English; flags only clear mistakes.", standard: "Any accurate English is fine; real mistakes of grammar or sense are flagged.", strict: "Expects a close rendering that keeps the Latin’s constructions; loose paraphrase is noted as a small point." }[s.aiStrict]}>
            <SetSeg label="How strict" items={[["lenient", "Lenient"], ["standard", "Standard"], ["strict", "Close to the Latin"]]} value={s.aiStrict} onPick={v => setSet({ aiStrict: v })} />
          </SetRow>
          <SetRow label="How much help" hint={s.aiHelp === "hint" ? "Each mistake shows where it is and what kind it is; tap it for the correction and the reason." : null}>
            <SetSeg label="How much help" items={[["hint", "A hint first"], ["full", "The correction straight away"]]} value={s.aiHelp} onPick={v => setSet({ aiHelp: v })} />
          </SetRow>
          {!onClaude && <Btn className="self-start" onClick={openAiSetup}>Gemini and Groq keys…</Btn>}
        </>}
        <SetCheck id="set-speech" checked={s.speech} onChange={v => setSet({ speech: v })}>“Speak” buttons (speech to text). Your browser sends the sound of your voice to its own speech service (Google in Chrome, Apple in Safari) to turn it into text; nothing goes to the AI, and recordings made with “Record yourself” never leave this device.</SetCheck>
      </>)}
      {sect("cards", "Flashcards & study", <>
        <SetRow label="New words a day" id="set-new"><select id="set-new" value={s.newPerDay} onChange={e => setSet({ newPerDay: +e.target.value })} className="self-start rounded-md border border-rule bg-paper px-2 py-1.5 text-[14px] text-ink">{[5, 10, 15, 20, 30, 50, 100, 0].map(n => <option key={n} value={n}>{n ? n : "No limit"}</option>)}</select></SetRow>
        <SetRow label="Reviews a day" id="set-rev" hint="Beyond the limit, due cards wait for tomorrow."><select id="set-rev" value={s.revCap} onChange={e => setSet({ revCap: +e.target.value })} className="self-start rounded-md border border-rule bg-paper px-2 py-1.5 text-[14px] text-ink">{[0, 50, 100, 200, 400].map(n => <option key={n} value={n}>{n ? n : "No limit"}</option>)}</select></SetRow>
        <SetRow label="How well to remember" hint={`Cards come back when you’d remember them about ${s.retention}% of the time. ${s.retention > 90 ? "More reviews, better memory." : s.retention < 90 ? "Fewer reviews, more forgetting." : "The usual balance."}`}>
          <SetSeg label="Retention" items={[[85, "85%"], [90, "90%"], [95, "95%"]]} value={s.retention} onPick={v => setSet({ retention: v })} />
        </SetRow>
        <SetRow label="Card direction"><SetSeg label="Card direction" items={[["la", "Latin → English"], ["en", "English → Latin"], ["both", "Both, mixed"]]} value={s.dir} onPick={v => setSet({ dir: v })} /></SetRow>
        <SetRow label="Answering"><SetSeg label="Answering" items={[[false, "Flip the card"], [true, "Type the answer"]]} value={s.typed} onPick={v => setSet({ typed: v })} /></SetRow>
        <SetRow label="Checking typed Latin" hint="Accents and macrons are never required: the app’s answers are written without macrons.">
          <SetCheck id="set-caps" checked={s.capsMatch} onChange={v => setSet({ capsMatch: v })}>Capitals must match (proper names)</SetCheck>
          <SetCheck id="set-uvm" checked={s.uvMatch} onChange={v => setSet({ uvMatch: v })}>u/v and i/j must be written as in the answer</SetCheck>
        </SetRow>
        <SetRow label="Pronunciation for Listen" hint={s.pron === "classical" ? "A classical respelling read by your device’s Italian or Latin voice (c and g always hard, v as w, ae as ai): an approximation." : "Church (Italian) pronunciation, read by your device’s Latin or Italian voice."}>
          <SetSeg label="Pronunciation" items={[["church", "Church"], ["classical", "Classical"]]} value={s.pron} onPick={v => setSet({ pron: v })} />
        </SetRow>
        <SetRow label="Exam date" id="set-exam" hint="Counts down on Home and in Today’s session.">
          <input id="set-exam" type="date" value={exam || ""} onChange={e => onExam && onExam(e.target.value)} className="self-start rounded-md border border-rule bg-paper px-2 py-1 text-[14px] text-ink" />
          {exam && (() => { const days = Math.ceil((new Date(exam + "T12:00:00") - Date.now()) / DAY); return days > 0 ? <span className="text-[13px] text-ink">{days} days to go: at the {dailyGoal().label.toLowerCase()} goal that’s about {days * dailyGoal().words} new words and {days * dailyGoal().passages} passages before the exam.</span> : null; })()}
        </SetRow>
        <SetRow label="Daily goal" hint={`Today’s session: ${dailyGoal().words} new words, ${dailyGoal().passages} passage${dailyGoal().passages === 1 ? "" : "s"}, your reviews and an oral mock (about ${dailyGoal().mins} minutes).`}>
          <SetSeg label="Daily goal" items={Object.entries(GOALS).map(([k, g]) => [k, g.label])} value={s.goal} onPick={v => setSet({ goal: v })} />
        </SetRow>
        <SetCheck id="set-streak" checked={s.streaks} onChange={v => setSet({ streaks: v })}>Show streaks (days in a row)</SetCheck>
        <SetCheck id="set-clock" checked={s.examClock} onChange={v => setSet({ examClock: v })}>Show the clock during mock exams (the time limit still applies; set it when you start a sitting)</SetCheck>
      </>)}
      {sect("liturgy", "Liturgy", <>
        <SetRow label="Calendar" id="set-ver">
          <select id="set-ver" value={ver} onChange={e => pickVer(e.target.value)} className="min-w-0 max-w-full self-start rounded-md border border-rule bg-paper px-2 py-1.5 text-[14px] text-ink">
            <option value="">Rubrics 1960 (1962 books, FSSP)</option>
            {(vers || []).length > 0 && OFFICE_GROUPS.map(([g, gl]) => { const vs = vers.filter(x => x.group === g); return vs.length ? <optgroup key={g} label={gl}>{vs.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}</optgroup> : null; })}
          </select>
          {vers && !vers.length && <span className="text-[12px] text-soft">The other calendars are in the phone app and the online page.</span>}
        </SetRow>
        <SetRow label="Liturgy opens on"><SetSeg label="Liturgy opens on" items={[["last", "Where I left off"], ["office", "The Office"], ["mass", "The Mass"]]} value={s.lpart} onPick={v => setSet({ lpart: v })} /></SetRow>
        <SetRow label="Hour" hint={s.lhour === "time" ? `Now that would be ${(HOURS_L.find(h => h[0] === hourByTime()) || [])[1]}.` : null}><SetSeg label="Hour" items={[["last", "The last one I read"], ["m", "Matins"], ["time", "By the time of day"]]} value={s.lhour} onPick={v => setSet({ lhour: v })} /></SetRow>
        <SetRow label="Commemorations" hint="In the prayers of the Office and the Mass. Folded ones open with a tap.">
          <SetSeg label="Commemorations" items={[["show", "Show"], ["fold", "Fold away"]]} value={s.commem} onPick={v => setSet({ commem: v })} />
        </SetRow>
        <SetCheck id="set-rub" checked={s.rubrics} onChange={v => setSet({ rubrics: v })}>Show rubric notes (the red and grey instructions inside the texts)</SetCheck>
      </>)}
      {sect("layout", "Home & layout", <>
        <SetRow label="The app opens on"><SetSeg label="The app opens on" items={[["home", "Home"], ["course", "Learn"], ["study", "Study"], ["liturgy", "Liturgy"], ["library", "Library"], ["last", "Where I left off"]]} value={s.start} onPick={v => setSet({ start: v })} /></SetRow>
        <SetRow label="Home’s buttons" hint="Their order follows your focus until you move one.">
          <ul className="flex flex-col gap-1" aria-label="Home buttons">
            {tiles.map((k, i) => {
              const on = tl[i].on;
              return (
                <li key={k} className="flex items-center gap-2 rounded-md border border-rule bg-paper px-2 py-1">
                  <input id={"tile-" + k} type="checkbox" checked={on} onChange={e => toggleTile(k, e.target.checked)} className="h-4 w-4 accent-[var(--rubric)]" />
                  <label htmlFor={"tile-" + k} className={`min-w-0 flex-1 text-[14px] ${on ? "text-ink" : "text-soft line-through"}`}>{(HOME_TILES.find(t => t[0] === k) || [k, k])[1]}</label>
                  <button type="button" className="rounded px-2 text-[14px] text-ink disabled:opacity-30" disabled={i === 0} onClick={() => moveTile(k, -1)} aria-label={"Move up: " + k}>↑</button>
                  <button type="button" className="rounded px-2 text-[14px] text-ink disabled:opacity-30" disabled={i === tiles.length - 1} onClick={() => moveTile(k, 1)} aria-label={"Move down: " + k}>↓</button>
                </li>
              );
            })}
          </ul>
          {(s.tiles || []).length > 0 && <button type="button" className="self-start text-[13px] text-soft underline" onClick={() => setSet({ tiles: [] })}>Order by my focus again</button>}
        </SetRow>
        <SetCheck id="set-cont" checked={s.showContinue} onChange={v => setSet({ showContinue: v })}>“Continue” on Home (the last things you were doing)</SetCheck>
        <SetCheck id="set-dict" checked={!s.hideDict} onChange={v => setSet({ hideDict: !v })}>Dictionary button at the top (tapped words still open it from their panel)</SetCheck>
        <SetCheck id="set-aichip" checked={s.ai} onChange={v => setSet({ ai: v })}>AI button at the top (shown while AI is on)</SetCheck>
      </>)}
      {sect("focus", "Your focus", <>
        <span className="text-[14px] text-soft">What brings you here? (Arranges Home and sets starting points; everything stays available.)</span>
        <FocusPicker focus={focus} onPick={onFocus} compact />
      </>)}
      {sect("data", "Backup & data", <>
        <SetRow label="Remind me to back up"><SetSeg label="Backup reminder" items={[[7, "Weekly"], [14, "Every 2 weeks"], [30, "Monthly"], [0, "Never"]]} value={s.backupEvery} onPick={v => setSet({ backupEvery: v })} /></SetRow>
        <p className="text-[13px] leading-snug text-soft">Your settings travel with the backup code and the progress file (Study → Progress → Skill map &amp; backup), so a new phone looks the same.</p>
        <div className="flex flex-wrap items-center gap-3 text-[14px]">
          {armed === "set" ? <span className="flex flex-wrap items-center gap-2">Put every setting back to normal?
            <button type="button" className="font-semibold text-rubric underline" onClick={() => {
              setSet({ ...SET_DEFAULTS }); setD0({}); writeLocal(DISPLAY_KEY, {}); applyDisplay({}); pickFont("merriweather"); pickTheme("auto");
              if (setPrefs) setPrefs(p => ({ ...p, accents: false })); setArmed(""); setMsg("Settings reset.");
            }}>Yes, reset</button><button type="button" className="underline" onClick={() => setArmed("")}>Cancel</button></span>
            : <button type="button" className="text-ink underline" onClick={() => setArmed("set")}>Reset all settings</button>}
          {onReset && (armed === "prog" ? <span className="flex flex-wrap items-center gap-2">Clear all your progress and drafts? This can’t be undone.
            <button type="button" className="font-semibold text-rubric underline" onClick={() => { onReset(); setArmed(""); setMsg("Progress cleared."); }}>Yes, clear</button><button type="button" className="underline" onClick={() => setArmed("")}>Cancel</button></span>
            : <button type="button" className="text-rubric underline" onClick={() => setArmed("prog")}>Reset progress…</button>)}
        </div>
        {msg && <p className="text-[13px] text-ok" aria-live="polite">{msg}</p>}
      </>)}
    </div>
  );
}
