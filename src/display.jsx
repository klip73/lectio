/* ---------- Display settings and "what brings you here" ----------
   One Aa button in the header opens everything about how the app looks: the Latin font, text size, line spacing for
   Latin, page width, light or dark. Each is applied before the page draws (page.html reads the same key).
   The same panel holds the student's focus: why he uses the app. The focus orders Home, words the welcome, and sets
   sensible starting points (level for the word model, whether the commonest words are in the decks). It can be changed
   at any time and nothing is hidden by it. */
const DISPLAY_KEY = "lectio-vulgata-display";
const DISP_SIZES = [["0.9", "Small"], ["1", "Normal"], ["1.12", "Large"], ["1.25", "Larger"], ["1.4", "Largest"]];
function readDisplay() { const v = readLocal(DISPLAY_KEY); return v && typeof v === "object" ? v : {}; }
function applyDisplay(d) {
  const r = document.documentElement;
  const z = parseFloat(d.size) || 1;
  r.style.setProperty("--lv-zoom", String(z));
  if (d.lh === "roomy") r.setAttribute("data-lh", "roomy"); else r.removeAttribute("data-lh");
  if (d.wide) r.setAttribute("data-wide", "1"); else r.removeAttribute("data-wide");
}
const FOCI = [
  ["exam", "The FSSP Latin proficiency exam", "Exam preparation first: the five parts, mock sittings, your weak points."],
  ["class", "My Latin class’s weekly quizzes", "Class quiz first: this week’s words, the text they come from, write-it-out practice."],
  ["learn", "Learning Latin (beginner or rusty)", "Grammar, forms and the commonest words first; nothing assumed."],
  ["pray", "Praying the Office or following the Mass", "Today’s Office and Mass first, with word help and the hymns."],
  ["read", "Reading: Scripture, St Thomas, the Fathers", "The Library and Dictionary first, for someone who already reads Latin."]
];
const FOCUS_THETA = { learn: 1.8, pray: 2.6, class: 3.0, exam: 3.0, read: 3.6 };
function FocusPicker({ focus, onPick, compact }) {
  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label="What brings you here">
      {FOCI.map(([k, l, d]) => (
        <button key={k} type="button" aria-pressed={focus === k} onClick={() => onPick(k)}
          className={`flex flex-col rounded-md border px-3 py-2 text-left ${focus === k ? "border-rubric bg-rubrictint" : "border-rule bg-paper hover:border-soft"}`}>
          <span className={`text-[15px] ${focus === k ? "font-semibold text-rubric" : "text-ink"}`}>{l}</span>
          {!compact && <span className="text-[13px] leading-snug text-soft">{d}</span>}
        </button>
      ))}
    </div>
  );
}
function DisplayPanel({ focus, onFocus, onClose }) {
  const [d, setD0] = useState(readDisplay);
  const setD = patch => { const n = { ...d, ...patch }; setD0(n); writeLocal(DISPLAY_KEY, n); applyDisplay(n); };
  const [font, setFont] = useState(() => { const v = readLocal(FONT_KEY); return FONT_L[v] ? v : "merriweather"; });
  const [theme, setTheme] = useState(() => { const v = readLocal(THEME_KEY); return v === "dark" || v === "light" ? v : "auto"; });
  function pickFont(k) { setFont(k); writeLocal(FONT_KEY, k); try { window.LV_setFont && window.LV_setFont(k); } catch (e) {} }
  function pickTheme(n) { setTheme(n); writeLocal(THEME_KEY, n === "auto" ? null : n); if (n === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", n); }
  const seg = (items, cur, set, label) => (
    <div className="flex flex-wrap gap-1 rounded-lg border border-rule bg-paper p-0.5 text-[14px]" role="group" aria-label={label}>
      {items.map(([k, l]) => <button key={k} type="button" aria-pressed={cur === k} onClick={() => set(k)} className={`rounded px-2.5 py-1 ${cur === k ? "bg-ink text-paper" : "text-ink"}`}>{l}</button>)}
    </div>
  );
  const row = "flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3";
  const lab = "w-36 flex-none text-[14px] text-soft";
  return (
    <div className="flex flex-col gap-3">
      <div className={row}><span className={lab}>Text size</span>{seg(DISP_SIZES, String(d.size || "1"), v => setD({ size: v }), "Text size")}</div>
      <div className={row}><label htmlFor="disp-font" className={lab}>Latin font</label>
        <select id="disp-font" value={font} onChange={e => pickFont(e.target.value)} className="self-start rounded-md border border-rule bg-paper px-2 py-1.5 text-[14px] text-ink">
          {Object.entries(FONT_L).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <span lang="la" className="latin text-[15px] text-ink">Ave María, grátia plena</span>
      </div>
      <div className={row}><span className={lab}>Latin line spacing</span>{seg([["normal", "Normal"], ["roomy", "Roomy"]], d.lh || "normal", v => setD({ lh: v }), "Line spacing")}</div>
      <div className={row}><span className={lab}>Page width</span>{seg([["0", "Reading column"], ["1", "Wide"]], d.wide ? "1" : "0", v => setD({ wide: v === "1" }), "Page width")}</div>
      <div className={row}><span className={lab}>Light or dark</span>{seg([["auto", "As device"], ["light", "Light"], ["dark", "Dark"]], theme, pickTheme, "Theme")}</div>
      <div className="flex flex-col gap-1.5 border-t border-rule pt-3">
        <span className="text-[14px] text-soft">What brings you here? (Arranges Home and sets starting points; everything stays available.)</span>
        <FocusPicker focus={focus} onPick={onFocus} compact />
      </div>
      <div><button type="button" className="text-[13px] text-soft underline" onClick={() => { setD0({}); writeLocal(DISPLAY_KEY, {}); applyDisplay({}); pickFont("merriweather"); pickTheme("auto"); }}>Reset the display to normal</button></div>
    </div>
  );
}
