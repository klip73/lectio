/* ---------- Free AI marking: each person's own Google Gemini key ----------
   On the claude.ai page, Claude marks translations. Everywhere else (phone app, offline copy), a person can paste a
   free Gemini API key: it stays in this browser and calls Google directly, so nobody pays and no server is needed.
   The better Flash model is tried first; when its small free daily allowance runs out, Flash-Lite takes over. */
const AI_KEY = "lectio-vulgata-ai";
const GEM_API = "https://generativelanguage.googleapis.com/v1beta";
const readAi = () => { const a = readLocal(AI_KEY); return a && typeof a === "object" ? a : {}; };
const writeAi = a => writeLocal(AI_KEY, a);
const hasGeminiKey = () => typeof readAi().key === "string" && readAi().key.length > 20;
function aiName() { return window.claude && window.claude.use ? "Claude" : "the AI"; }
function aiChanged() { samplePromise = null; try { window.dispatchEvent(new Event("lv-ai-changed")); } catch (e) {} }
function openAiSetup() { try { window.dispatchEvent(new Event("lv-ai-setup")); } catch (e) {} }

/* Pick the newest Flash and Flash-Lite text models this key can use. */
function pickModels(names) {
  const ok = n => /^gemini-/.test(n) && !/(image|tts|audio|live|embed|vision|thinking|exp|8b|robotics|computer|native)/.test(n);
  const ver = n => { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? +m[1] : 0; };
  const rank = (a, b) => ver(b) - ver(a) || (/preview/.test(a) ? 1 : 0) - (/preview/.test(b) ? 1 : 0) || a.length - b.length;
  const lite = names.filter(n => ok(n) && /flash-lite/.test(n)).sort(rank);
  const flash = names.filter(n => ok(n) && /flash/.test(n) && !/lite/.test(n)).sort(rank);
  return {
    best: names.includes("gemini-flash-latest") ? "gemini-flash-latest" : flash[0] || "gemini-flash-latest",
    lite: names.includes("gemini-flash-lite-latest") ? "gemini-flash-lite-latest" : lite[0] || "gemini-flash-lite-latest"
  };
}
async function geminiModels(key, force) {
  const a = readAi();
  if (!force && a.models && a.models.at > Date.now() - 7 * 864e5) return a.models;
  const r = await fetch(`${GEM_API}/models?pageSize=1000`, { headers: { "x-goog-api-key": key } });
  if (!r.ok) throw await geminiErr(r);
  const j = await r.json();
  const names = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent")).map(m => m.name.replace(/^models\//, ""));
  const models = { ...pickModels(names), at: Date.now() };
  writeAi({ ...readAi(), models });
  return models;
}
async function geminiErr(r) {
  let body = {};
  try { body = await r.json(); } catch (e) {}
  const msg = (body.error && body.error.message) || "";
  if (r.status === 429) {
    const det = JSON.stringify(body.error && body.error.details || []);
    const daily = /PerDay|per day|daily/i.test(det + msg);
    const m = det.match(/"retryDelay":"(\d+(?:\.\d+)?)s"/);
    return { code: "rate_limited", msg, daily, wait: m ? +m[1] : daily ? 0 : 15 };
  }
  if (r.status === 400 && /API key/i.test(msg) || r.status === 401 || r.status === 403) return { code: "bad_key", msg: msg + (/ACCESS_TOKEN_TYPE_UNSUPPORTED/.test(JSON.stringify(body)) ? " (token type unsupported)" : "") };
  if (r.status === 404) return { code: "no_model", msg };
  if (r.status === 400 && /location|region|country/i.test(msg)) return { code: "region", msg };
  return { code: "failed", msg };
}
function parseJsonText(t) {
  const s = (t || "").replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try { return JSON.parse(s); } catch (e) {}
  const a = s.search(/[\[{]/), z = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (a >= 0 && z > a) { try { return JSON.parse(s.slice(a, z + 1)); } catch (e) {} }
  throw { code: "invalid_json" };
}
/* Count today's markings (Pacific midnight is when Google resets the free allowance; a local day is close enough). */
function countUse(model) {
  const a = readAi(), d = new Date().toDateString();
  const use = a.use && a.use.d === d ? a.use : { d, n: 0, lite: 0 };
  writeAi({ ...a, use: { ...use, n: use.n + 1, lite: use.lite + (model === (a.models || {}).lite ? 1 : 0) } });
}
/* One request at a time: the free tier allows only a few a minute. */
let gemChain = Promise.resolve();
const sleep = (ms, signal) => new Promise((res, rej) => {
  const t = setTimeout(res, ms);
  if (signal) signal.addEventListener("abort", () => { clearTimeout(t); rej({ code: "cancelled" }); }, { once: true });
});
function geminiSample() {
  return {
    provider: "gemini",
    json(prompt, opts = {}) {
      const job = gemChain.then(() => { if (opts.signal && opts.signal.aborted) throw { code: "cancelled" }; return geminiCall(prompt, opts); });
      gemChain = job.catch(() => {});
      return job;
    }
  };
}
async function geminiCall(prompt, opts = {}) {
  const key = readAi().key;
  if (!key) throw { code: "no_key" };
  let models;
  try { models = await geminiModels(key); } catch (e) { if (e.code === "bad_key") throw e; models = { best: "gemini-flash-latest", lite: "gemini-flash-lite-latest" }; }
  const a = readAi();
  const today = new Date().toDateString();
  /* After Flash hits its limit, go straight to Flash-Lite for the rest of the day. */
  const order = a.full === today ? [models.lite] : [models.best, models.lite];
  let last = null;
  const tried = {};
  for (let oi = 0; oi < order.length; oi++) {
    const m = order[oi];
    let r;
    try {
      r = await fetch(`${GEM_API}/models/${m}:generateContent`, {
        method: "POST", signal: opts.signal,
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } })
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled" };
      throw { code: "offline" };
    }
    if (!r.ok) {
      last = await geminiErr(r);
      /* A per-minute limit: wait once (up to 40 s) and try the same model again. */
      if (last.code === "rate_limited" && !last.daily && last.wait <= 40 && !tried[m]) {
        tried[m] = true;
        await sleep((last.wait + 1) * 1000, opts.signal);
        order.splice(oi + 1, 0, m);
        continue;
      }
      if ((last.code === "rate_limited" || last.code === "no_model") && m !== models.lite) {
        if (last.code === "rate_limited" && last.daily) writeAi({ ...readAi(), full: today });
        continue;
      }
      throw last;
    }
    const j = await r.json();
    const c = (j.candidates || [])[0];
    const text = c && c.content && (c.content.parts || []).map(p => p.text || "").join("");
    if (!text) throw { code: "refused" };
    countUse(m);
    return parseJsonText(text);
  }
  throw last || { code: "failed" };
}

/* Setup: where to get a key, paste it, test it. */
function AiSetup({ onDone }) {
  const [a, setA] = useState(readAi);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState({ s: "idle", msg: "" });
  const onClaude = !!(window.claude && window.claude.use);
  async function save() {
    const key = draft.trim();
    if (!/^[\w.-]{30,}$/.test(key)) { setState({ s: "err", msg: "That doesn’t look like a Gemini key. Keys start with “AQ.” (or, older ones, “AIza”). Copy the whole key with no spaces." }); return; }
    setState({ s: "busy", msg: "" });
    try {
      const models = await geminiModels(key, true);
      writeAi({ ...readAi(), key, models, full: null });
      setA(readAi()); setDraft(""); aiChanged();
      setState({ s: "ok", msg: "Key saved. Your translations will now be marked." });
      if (onDone) onDone();
    } catch (e) {
      setState({ s: "err", msg: e.code === "bad_key" ? "Google says this key isn’t valid. Copy it again from AI Studio." : e.code === "region" ? "Google’s free AI isn’t offered in your region." : "Couldn’t reach Google. Check your connection and try again." });
    }
  }
  function remove() { const n = { ...readAi() }; delete n.key; delete n.models; writeAi(n); setA(n); aiChanged(); setState({ s: "idle", msg: "" }); }
  const use = a.use && a.use.d === new Date().toDateString() ? a.use : null;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] leading-snug text-ink">
        {onClaude
          ? "On this page Claude marks your translations. To get the same marking in the phone app, add a free Gemini key there."
          : "Have your translations marked by AI, mistake by mistake, for free. You need your own free key from Google (about a minute, no card)."}
      </p>
      {a.key ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[14px] text-ok">✓ Gemini key added (…{a.key.slice(-4)})</span>
          {use && <span className="num text-[13px] text-soft">{use.n} marking{use.n === 1 ? "" : "s"} today</span>}
          <button type="button" onClick={remove} className="text-[13px] text-soft underline">Remove key</button>
        </div>
      ) : (
        <>
          <ol className="ml-5 list-decimal text-[14px] leading-relaxed text-ink">
            <li>Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-rubric underline underline-offset-2">aistudio.google.com/apikey</a> and sign in with any Google account.</li>
            <li>Tap <b>Create API key</b> (accept the terms if asked), then copy the key.</li>
            <li>Paste it here and tap <b>Save key</b>.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="ai-key" className="sr-only">Gemini API key</label>
            <input id="ai-key" type="password" autoComplete="off" spellCheck={false} value={draft} onChange={e => setDraft(e.target.value)} placeholder="AQ.…"
              className="min-w-0 flex-1 basis-56 rounded-md border border-rule bg-paper px-3 py-1.5 text-[15px] text-ink" />
            <Btn variant="primary" onClick={save} disabled={!draft.trim() || state.s === "busy"}>{state.s === "busy" ? "Checking…" : "Save key"}</Btn>
          </div>
        </>
      )}
      {state.msg && <p className={`text-[14px] ${state.s === "err" ? "text-warn" : "text-ok"}`} aria-live="polite">{state.msg}</p>}
      <p className="text-[12px] leading-snug text-soft">
        Free: Google gives each key a daily allowance (a few dozen careful markings, then several hundred quicker ones; it resets overnight). Never add billing to the key and it can never cost anything.
        The key stays on this device only. Google may use what you send on the free tier (the Latin and your translation) to improve its products, so don’t type anything personal into a translation.
      </p>
    </div>
  );
}

/* Speak instead of type: the browser turns speech into text. Nothing is recorded or kept as audio. */
const SpeechRec = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
function Dictate({ value, onChange, lang = "en-US", label = "Speak" }) {
  const [on, setOn] = useState(false);
  const [interim, setInterim] = useState("");
  const [err, setErr] = useState("");
  const recRef = useRef(null);
  const baseRef = useRef("");
  useEffect(() => () => { try { recRef.current && recRef.current.abort(); } catch (e) {} }, []);
  if (!SpeechRec) return null;
  function start() {
    setErr("");
    const r = new SpeechRec();
    r.lang = lang; r.continuous = true; r.interimResults = true;
    baseRef.current = value ? value.replace(/\s*$/, " ") : "";
    let finals = "";
    r.onresult = e => {
      let tmp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finals += t.trim() + " "; else tmp += t;
      }
      setInterim(tmp);
      onChange((baseRef.current + finals).replace(/\s+$/, " "));
    };
    r.onerror = e => { setErr(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Microphone not allowed. Allow it in your browser settings, or use your keyboard’s microphone key." : e.error === "no-speech" ? "" : "Speech input stopped."); };
    r.onend = () => { setOn(false); setInterim(""); };
    try { r.start(); recRef.current = r; setOn(true); } catch (e) { setErr("Speech input isn’t available here. Use your keyboard’s microphone key instead."); }
  }
  function stop() { try { recRef.current && recRef.current.stop(); } catch (e) {} }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Btn variant={on ? "warn" : undefined} onClick={on ? stop : start} aria-pressed={on}>{on ? "■ Stop" : `🎙 ${label}`}</Btn>
      {on && <span className="text-[13px] text-soft" aria-live="polite">Listening… {interim && <i>{interim}</i>}</span>}
      {err && <span className="text-[13px] text-warn">{err}</span>}
    </div>
  );
}
