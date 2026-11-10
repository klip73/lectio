/* ---------- Free AI marking: each person's own free keys (Google Gemini, Groq as backup) ----------
   On the claude.ai page, Claude marks translations. Everywhere else (phone app, offline copy), a person can paste a
   free Gemini API key and/or a free Groq key: they stay in this browser and call the services directly, so nobody pays
   and no server is needed. Gemini's Flash model is tried first, then Flash-Lite; if Google is busy, out of allowance or
   refuses, Groq (gpt-oss-120b, then Llama 3.3 70B) marks instead. */
const AI_KEY = "lectio-vulgata-ai";
const GEM_API = "https://generativelanguage.googleapis.com/v1beta";
const readAi = () => { const a = readLocal(AI_KEY); return a && typeof a === "object" ? a : {}; };
const writeAi = a => writeLocal(AI_KEY, a);
const hasGeminiKey = () => typeof readAi().key === "string" && readAi().key.length > 20;
const hasGroqKey = () => typeof readAi().groq === "string" && readAi().groq.length > 20;
const hasAiKey = () => hasGeminiKey() || hasGroqKey();
const GROQ_API = "https://api.groq.com/openai/v1";
const GROQ_PREF = ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
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
  const r = await fetch(`${GEM_API}/models?pageSize=1000`, { headers: { "x-goog-api-key": key } });   // listing works with the header for both key types
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
  const reason = (JSON.stringify(body).match(/"reason":"([A-Z_]+)"/) || [])[1];
  if (r.status === 400 && /API key/i.test(msg) || r.status === 401 || r.status === 403) return { code: "bad_key", msg: `${msg}${reason ? ` (${reason}, ${r.status})` : ` (${r.status})`}` };
  if (r.status === 404) return { code: "no_model", msg: `${msg} (404)` };
  if (r.status >= 500 || /high demand|overloaded|unavailable/i.test(msg)) return { code: "busy", msg: `${msg || "Google is busy"} (${r.status})` };
  if (r.status === 400 && /location|region|country/i.test(msg)) return { code: "region", msg };
  return { code: "failed", msg: `${msg || r.statusText || "no message"} (${r.status})` };
}
function parseJsonText(t) {
  const s = (t || "").replace(/^\s*```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try { return JSON.parse(s); } catch (e) {}
  const a = s.search(/[\[{]/), z = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (a >= 0 && z > a) { try { return JSON.parse(s.slice(a, z + 1)); } catch (e) {} }
  throw { code: "invalid_json", msg: "Unreadable reply: " + s.slice(0, 120) };
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
function geminiSample() { return aiSample(); }
function aiSample() {
  return {
    provider: "free",
    json(prompt, opts = {}) {
      const job = gemChain.then(() => { if (opts.signal && opts.signal.aborted) throw { code: "cancelled" }; return aiCall(prompt, opts); });
      gemChain = job.catch(() => {});
      return job;
    }
  };
}
/* Gemini first (if there's a key), then Groq if Gemini can't answer right now. */
async function aiCall(prompt, opts = {}) {
  const g = hasGeminiKey(), q = hasGroqKey();
  if (!g && !q) throw { code: "no_key" };
  let first = null;
  if (g) {
    try { const r = await geminiCall(prompt, { ...opts, backup: q }); writeAi({ ...readAi(), lastBy: "Gemini" }); return r; }
    catch (e) { if (!q || (e && e.code === "cancelled")) throw e; first = e; }
  }
  try { const r = await groqCall(prompt, opts); writeAi({ ...readAi(), lastBy: "Groq" }); return r; }
  catch (e) {
    if (e && e.code === "cancelled") throw e;
    if (first) throw { ...e, msg: `Gemini: ${first.msg || first.code}. Groq: ${e.msg || e.code}` };
    throw e;
  }
}
async function groqErr(r) {
  let body = {};
  try { body = await r.json(); } catch (e) {}
  const msg = (body.error && body.error.message) || r.statusText || "";
  if (r.status === 401 || r.status === 403) return { code: "bad_key", msg: `Groq: ${msg} (${r.status})` };
  if (r.status === 429) return { code: "rate_limited", msg: `Groq: ${msg}`, wait: +(r.headers.get("retry-after") || 0) };
  if (r.status === 404) return { code: "no_model", msg: `Groq: ${msg}` };
  if (r.status >= 500) return { code: "busy", msg: `Groq: ${msg} (${r.status})` };
  return { code: "failed", msg: `Groq: ${msg} (${r.status})`, json: /json/i.test(msg) };
}
async function groqModels(key, force) {
  const a = readAi();
  if (!force && a.groqModels && a.groqModels.at > Date.now() - 7 * 864e5) return a.groqModels.list;
  const r = await fetch(`${GROQ_API}/models`, { headers: { authorization: `Bearer ${key}` } });
  if (!r.ok) throw await groqErr(r);
  const ids = ((await r.json()).data || []).map(m => m.id);
  const list = GROQ_PREF.filter(m => ids.includes(m));
  if (!list.length) list.push(...ids.filter(m => /70b|120b|qwen|gpt-oss/.test(m)).slice(0, 2));
  writeAi({ ...readAi(), groqModels: { list, at: Date.now() } });
  return list;
}
async function groqCall(prompt, opts = {}) {
  const key = readAi().groq;
  let list;
  try { list = await groqModels(key); } catch (e) { if (e.code === "bad_key") throw e; list = GROQ_PREF.slice(0, 2); }
  let last = null;
  for (const m of list.slice(0, 3)) {
    for (const jsonMode of [true, false]) {
      let r;
      try {
        r = await fetch(`${GROQ_API}/chat/completions`, {
          method: "POST", signal: opts.signal,
          headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: m, temperature: 0.2, messages: [{ role: "user", content: prompt }],
            ...(jsonMode ? { response_format: { type: "json_object" } } : {}), ...(/gpt-oss/.test(m) ? { reasoning_effort: "low" } : {}) })
        });
      } catch (e) {
        if (e && e.name === "AbortError") throw { code: "cancelled" };
        throw { code: "offline" };
      }
      if (!r.ok) {
        last = await groqErr(r);
        if (last.code === "bad_key") throw last;
        if (last.code === "failed" && jsonMode && last.json) continue;   // JSON mode failed: ask again without it
        break;   // next model
      }
      let j = {};
      try { j = await r.json(); } catch (e) {}
      const text = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!text) { last = { code: "refused", msg: `Groq ${m}: empty reply` }; break; }
      writeAi({ ...readAi(), lastModel: m });
      return parseJsonText(text);
    }
  }
  throw last || { code: "failed" };
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
      /* Two ways to send the key: the header (usual), or ?key= (some newer AQ. keys are accepted only one way). */
      const viaQuery = readAi().auth === "query";
      r = await fetch(`${GEM_API}/models/${m}:generateContent${viaQuery ? `?key=${encodeURIComponent(key)}` : ""}`, {
        method: "POST", signal: opts.signal,
        headers: viaQuery ? { "content-type": "application/json" } : { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } })
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled" };
      throw { code: "offline" };
    }
    if (!r.ok) {
      last = await geminiErr(r);
      /* A per-minute limit: wait once (up to 40 s) and try the same model again. */
      if (last.code === "rate_limited" && !last.daily && last.wait <= 40 && !tried[m] && !opts.backup) {
        tried[m] = true;
        await sleep((last.wait + 1) * 1000, opts.signal);
        order.splice(oi + 1, 0, m);
        continue;
      }
      /* Google busy (high demand): wait a few seconds and try the same model once more, then the other model. */
      if (last.code === "busy") {
        if (opts.backup) { if (m !== models.lite) continue; throw last; }   // a backup is set up: don't wait, hand over
        if (!tried["busy:" + m]) {
          tried["busy:" + m] = true;
          await sleep(4000, opts.signal);
          order.splice(oi + 1, 0, m);
          continue;
        }
        if (m !== models.lite) continue;
        if (!tried["busyAgain"]) { tried["busyAgain"] = true; await sleep(8000, opts.signal); order.splice(oi + 1, 0, models.best); continue; }
        throw last;
      }
      /* Refused: try sending the key the other way once, then the other model. */
      if (last.code === "bad_key" && !tried["auth"]) {
        tried["auth"] = true;
        writeAi({ ...readAi(), auth: readAi().auth === "query" ? "header" : "query" });
        order.splice(oi + 1, 0, m);
        continue;
      }
      if (last.code === "bad_key" && m !== models.lite && !tried["badmodel"]) {
        tried["badmodel"] = true;
        writeAi({ ...readAi(), auth: readAi().auth === "query" ? "header" : "query" });   // back to the first way
        tried["auth"] = false;
        continue;
      }
      if ((last.code === "rate_limited" || last.code === "no_model" || last.code === "failed") && m !== models.lite) {
        if (last.code === "rate_limited" && last.daily) writeAi({ ...readAi(), full: today });
        continue;
      }
      throw last;
    }
    let j = {};
    try { j = await r.json(); } catch (e) {}
    const c = (j.candidates || [])[0];
    const text = c && c.content && (c.content.parts || []).filter(p => !p.thought).map(p => p.text || "").join("");
    if (!text) {
      last = { code: "refused", msg: `No answer from ${m}: ${(j.promptFeedback && j.promptFeedback.blockReason) || (c && c.finishReason) || "empty reply"}` };
      if (m !== models.lite && !tried["empty"]) { tried["empty"] = true; continue; }
      throw last;
    }
    countUse(m);
    writeAi({ ...readAi(), lastModel: m });
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
  /* One box takes either key: Groq keys start "gsk_", Gemini keys "AQ." or "AIza". */
  async function save() {
    const key = draft.trim();
    if (!/^[\w.-]{30,}$/.test(key)) { setState({ s: "err", msg: "That doesn’t look like a key. Gemini keys start with “AQ.” (or “AIza”), Groq keys with “gsk_”. Copy the whole key with no spaces." }); return; }
    const groq = /^gsk_/.test(key);
    setState({ s: "busy", msg: "" });
    try {
      if (groq) {
        const list = await groqModels(key, true);
        writeAi({ ...readAi(), groq: key, groqModels: { list, at: Date.now() } });
      } else {
        const models = await geminiModels(key, true);
        writeAi({ ...readAi(), key, models, full: null });
      }
      setA(readAi()); setDraft(""); aiChanged();
      setState({ s: "ok", msg: `${groq ? "Groq" : "Gemini"} key saved. ${hasGeminiKey() && hasGroqKey() ? "Gemini marks first; Groq takes over whenever Google is busy." : "Your translations will now be marked."}` });
      if (onDone) onDone();
    } catch (e) {
      const who = groq ? "Groq" : "Google";
      setState({ s: "err", msg: e.code === "bad_key" ? `${who} says this key isn’t valid. Copy it again.` : e.code === "region" ? "Google’s free AI isn’t offered in your region." : `Couldn’t reach ${who}. Check your connection and try again.` });
    }
  }
  async function test() {
    setState({ s: "busy", msg: "" });
    try {
      const r = await aiSample().json('Reply with only this JSON, filling in the parsing: {"word":"amavit","parse":"..."}');
      setState({ s: "ok", msg: `Working: ${readAi().lastBy || ""} ${readAi().lastModel || ""} answered “${String((r && r.parse) || JSON.stringify(r)).slice(0, 80)}”.` });
    } catch (e) {
      setState({ s: "err", msg: `Not working: ${tutorErrorText(e && e.code, e && e.msg)}${e && e.code ? ` [${e.code}]` : ""}` });
    }
    setA(readAi());
  }
  function remove(which) { const n = { ...readAi() }; if (which === "groq") { delete n.groq; delete n.groqModels; } else { delete n.key; delete n.models; } writeAi(n); setA(n); aiChanged(); setState({ s: "idle", msg: "" }); }
  const use = a.use && a.use.d === new Date().toDateString() ? a.use : null;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] leading-snug text-ink">
        {onClaude
          ? "On this page Claude marks your translations. To get the same marking in the phone app, add a free Gemini key there."
          : "Have your translations marked by AI, mistake by mistake, for free. You need your own free key from Google (about a minute, no card)."}
      </p>
      {(a.key || a.groq) && (
        <div className="flex flex-col gap-1.5">
          {a.key && <span className="flex flex-wrap items-center gap-3 text-[14px] text-ok">✓ Gemini key (…{a.key.slice(-4)}){a.groq ? " · marks first" : ""} <button type="button" onClick={() => remove("gemini")} className="text-[13px] text-soft underline">Remove</button></span>}
          {a.groq && <span className="flex flex-wrap items-center gap-3 text-[14px] text-ok">✓ Groq key (…{a.groq.slice(-4)}){a.key ? " · backup" : ""} <button type="button" onClick={() => remove("groq")} className="text-[13px] text-soft underline">Remove</button></span>}
          <div className="flex flex-wrap items-center gap-3">
            <Btn onClick={test} disabled={state.s === "busy"}>{state.s === "busy" ? "Testing…" : "Test AI"}</Btn>
            {use && <span className="num text-[13px] text-soft">{use.n} Gemini marking{use.n === 1 ? "" : "s"} today</span>}
          </div>
        </div>
      )}
      {!(a.key && a.groq) && (
        <>
          <ol className="ml-5 list-decimal text-[14px] leading-relaxed text-ink">
            {!a.key && <li><b>Gemini (Google):</b> open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-rubric underline underline-offset-2">aistudio.google.com/apikey</a>, sign in with a Google account, tap <b>Create API key</b>, copy it. The key must show “Free tier” there.</li>}
            {!a.groq && <li><b>{a.key ? "Backup, recommended: " : "Or "}Groq:</b> open <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-rubric underline underline-offset-2">console.groq.com/keys</a>, sign in (Google, GitHub or email), tap <b>Create API Key</b>, copy it. Free, no card; Groq takes over whenever Google is busy.</li>}
            <li>Paste the key here and tap <b>Save key</b>. {!a.key && !a.groq ? "Adding both is best." : ""}</li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="ai-key" className="sr-only">API key (Gemini or Groq)</label>
            <input id="ai-key" type="password" autoComplete="off" spellCheck={false} value={draft} onChange={e => setDraft(e.target.value)} placeholder={a.key ? "gsk_…" : a.groq ? "AQ.…" : "AQ.… or gsk_…"}
              className="min-w-0 flex-1 basis-56 rounded-md border border-rule bg-paper px-3 py-1.5 text-[15px] text-ink" />
            <Btn variant="primary" onClick={save} disabled={!draft.trim() || state.s === "busy"}>{state.s === "busy" ? "Checking…" : "Save key"}</Btn>
          </div>
        </>
      )}
      {state.msg && <p className={`text-[14px] ${state.s === "err" ? "text-warn" : "text-ok"}`} aria-live="polite">{state.msg}</p>}
      <p className="text-[12px] leading-snug text-soft">
        If AI Studio shows <b>“Free tier unavailable”</b> next to your key, Google has flagged that project: verify your age at myaccount.google.com (Personal info → Birthday), then in AI Studio make a key in a <i>new</i> project; if it still says unavailable, use a different Google account. Don’t add billing.{" "}
        Free: Google gives each key a daily allowance (a few dozen careful markings, then several hundred quicker ones; it resets overnight). Never add billing to the key and it can never cost anything.
        Groq’s free plan allows about a thousand requests a day, with no card. Keys stay on this device only. Google may use what you send on its free tier (the Latin and your translation) to improve its products, so don’t type anything personal into a translation.
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
