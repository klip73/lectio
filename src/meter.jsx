/* ---------- Meter: scanning Latin verse (the Breviary hymns, or any lines pasted in) ----------
   1. Each word is split into syllables (Allen & Greenough §§ 603–604: one vowel or diphthong per syllable; one consonant
      between vowels goes with the next; of two or more, the last goes with the next, except a mute + liquid, which may
      stay together; x and z count as two; h doesn't count; qu, gu after n, ch, ph, th are one sound).
   2. Each syllable is marked long or short where the rules settle it (A&G §§ 602–606): a diphthong is long; a vowel
      before two consonants (or x, z, consonantal i between vowels) makes a long syllable "by position"; a vowel before
      another vowel is short; a mute + liquid leaves a short vowel common. Long vowels "by nature" come from the
      dictionary (Wiktionary's marked headwords, matched to the form), from the Breviary's accents (in a word of three or
      more syllables the accent falls on the penult only if it is long, A&G § 12), and from the rules for final syllables
      (A&G §§ 604–605: final -ā of the ablative, -ō, -ī, -ū, -ās, -ēs, -ōs are long; final -a of the nominative, -e, -is,
      -us usually short).
   3. A final vowel or vowel + m before a word starting with a vowel or h is elided (A&G § 612e).
   4. The marks are fitted to the meter: each pattern (iambic dimeter, Sapphic, Asclepiad, trochaic, hexameter…) is
      tried, and the one that disagrees least with what's known wins. A syllable the rules couldn't settle takes the
      meter's value (shown faint); one the meter contradicts is flagged, since the guess about it may be wrong.
   Many later hymns (St Thomas's Pange lingua, the sequences) are not quantitative but rhythmic: syllables counted,
   word accents falling in a pattern, and rhyme. For those, Accentual marks the stressed syllables instead. */
const MT_VOW = "aeiouy";
const MT_DIPH = new Set(["ae", "oe", "au"]);
const MT_EU = new Set(["heu", "eheu", "seu", "neu", "ceu", "cui", "huic"]);
const MT_MUTE = new Set(["b", "c", "d", "g", "p", "t", "ch", "ph", "th", "f"]);
const mtPlain = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/æ/g, "ae").replace(/Æ/g, "Ae").replace(/œ/g, "oe").replace(/Œ/g, "Oe");
/* Units of a word: { k: "V"|"C"|"H", s: letters, n: consonant weight (x = 2), a: index of first letter in the word, diph } */
function mtUnits(word) {
  const w = mtPlain(word), lw = w.toLowerCase(), out = [];
  const isV = i => MT_VOW.includes(lw[i] || "") && lw[i] !== "v" ;
  let i = 0;
  const whole = lw.replace(/[^a-z]/g, "");
  while (i < lw.length) {
    const c = lw[i], nx = lw[i + 1] || "";
    if (!/[a-z]/.test(c)) { i++; continue; }
    if (c === "q" && nx === "u") { out.push({ k: "C", s: w.slice(i, i + 2), n: 1, a: i }); i += 2; continue; }
    if (c === "g" && nx === "u" && lw[i - 1] === "n" && isV(i + 2)) { out.push({ k: "C", s: w.slice(i, i + 2), n: 1, a: i }); i += 2; continue; }
    if ("cpt".includes(c) && nx === "h") { out.push({ k: "C", s: w.slice(i, i + 2), n: 1, a: i, m: c + "h" }); i += 2; continue; }
    if (c === "h") { out.push({ k: "H", s: w[i], n: 0, a: i }); i++; continue; }
    if (c === "x" || c === "z") { out.push({ k: "C", s: w[i], n: 2, a: i }); i++; continue; }
    if (c === "j" || c === "v") { out.push({ k: "C", s: w[i], n: 1, a: i }); i++; continue; }
    if (c === "i" && i === 0 && isV(1) && !/^(io|ii)/.test(lw)) { out.push({ k: "C", s: w[i], n: 1, a: i }); i++; continue; }
    if (c === "i" && i > 0 && MT_VOW.includes(lw[i - 1]) && isV(i + 1) && out.length && out[out.length - 1].k === "V") { out.push({ k: "C", s: w[i], n: 2, a: i, ci: true }); i++; continue; }
    if (c === "u" && i > 0 && lw[i - 1] === "s" && /^(sua[dsv]|suet|suesc)/.test(lw.slice(i - 1))) { out.push({ k: "C", s: w[i], n: 1, a: i }); i++; continue; }
    if (MT_VOW.includes(c)) {
      const two = c + nx;
      if ((MT_DIPH.has(two) || ((two === "eu" || two === "ui") && MT_EU.has(whole))) && !/[̈]/.test((word.normalize("NFD")[i + 1] || ""))) { out.push({ k: "V", s: w.slice(i, i + 2), a: i, diph: true }); i += 2; continue; }
      out.push({ k: "V", s: w[i], a: i }); i++; continue;
    }
    out.push({ k: "C", s: w[i], n: 1, a: i, m: c }); i++;
  }
  return out;
}
/* Syllables of a word: [{ t: original letters, v: the vowel unit, pre: consonants before, post: consonants after (in word) }] */
function mtSyllables(word) {
  const u = mtUnits(word), vi = u.map((x, i) => x.k === "V" ? i : -1).filter(i => i >= 0);
  if (!vi.length) return [];
  const syl = vi.map(i => ({ v: u[i], vi: i }));
  // split the consonants between vowels
  let start = 0;
  syl.forEach((s, k) => {
    const next = k + 1 < syl.length ? syl[k + 1].vi : u.length;
    const cons = u.slice(s.vi + 1, next).filter(x => x.k === "C");
    s.after = cons;           // consonants after the vowel, up to the next vowel (or end of word)
    s.from = k === 0 ? 0 : start;
    if (k + 1 < syl.length) {
      let goNext;
      if (cons.length <= 1) goNext = cons.length;
      else {
        const a = cons[cons.length - 2], b = cons[cons.length - 1];
        const ml = MT_MUTE.has((a.m || a.s).toLowerCase()) && /^[lr]$/i.test(b.s);
        goNext = ml ? 2 : 1;
        s.ml = ml && cons.length === 2;
      }
      const firstNext = cons.length - goNext;
      const cut = firstNext < cons.length ? u.indexOf(cons[firstNext]) : next;
      s.to = cut; start = cut;
    } else s.to = u.length;
  });
  const w = mtPlain(word);
  return syl.map((s, k) => {
    const a = u[s.from] ? u[s.from].a : 0, z = s.to < u.length ? u[s.to].a : word.length;
    return { t: word.slice(a, z), v: s.v, after: s.after, ml: !!s.ml, k, n: syl.length, va: s.v.a };
  });
}
/* Long vowels from the dictionary: align the form with Wiktionary's macron-marked headword. */
function mtNature(word, wk) {
  const out = {};
  if (!wk || !wk.length) return out;
  const plain = mtPlain(word).toLowerCase().replace(/j/g, "i").replace(/v/g, "u");
  const votes = {};
  wk.filter(e => e && e[0] && e[1] !== "name").slice(0, 4).forEach(([lem]) => {
    const L = lem.normalize("NFC").toLowerCase();
    const lp = mtPlain(L).replace(/j/g, "i").replace(/v/g, "u");
    let k = 0; while (k < lp.length && k < plain.length && lp[k] === plain[k]) k++;
    // trust the shared stem, but not the lemma's last vowel unless the form is the lemma itself
    let limit = k;
    if (lp !== plain) { const lastV = Math.max(...[...lp].map((c, i) => MT_VOW.includes(c) ? i : -1)); limit = Math.min(k, lastV); }
    const chars = [...L];
    for (let i = 0; i < limit; i++) {
      const ch = chars[i] || "";
      if (!MT_VOW.includes(lp[i])) continue;
      const long = /[āēīōūȳ]/.test(ch) || /̄/.test(ch.normalize("NFD"));
      (votes[i] = votes[i] || []).push(long);
    }
  });
  Object.entries(votes).forEach(([i, v]) => { out[i] = v.every(x => x) ? "L" : v.every(x => !x) ? "S" : null; });
  return out;
}
/* Rules for final syllables, from the parsing tags (Wiktionary forms): A&G §§ 604–605. */
function mtFinal(word, wk) {
  const w = mtPlain(word).toLowerCase(), tags = (wk || []).map(e => (e[2] || "") + " " + (e[1] || "")).join(" | ");
  const lemmas = (wk || []).map(e => mtPlain(e[0] || "").toLowerCase());
  const lemL = (wk || []).map(e => e[0] || "");
  if (/^(mihi|tibi|sibi|ubi|ibi|nisi|quasi)$/.test(w)) return [null, "final i is common in this word"];
  if (/^(ego|modo|cito|duo|quomodo|immo|homo)$/.test(w)) return [null, "final o is often short in this word"];
  if (/[iu]$/.test(w)) return ["L", "final -ī and -ū are long"];
  if (/o$/.test(w)) return ["L", "final -ō is long"];
  if (/(as|os)$/.test(w)) return ["L", "final -ās and -ōs are long"];
  if (/es$/.test(w)) return w === "es" ? ["S", "es (you are) is short"] : /nom\. sg|nom\. voc\. sg/.test(tags) && !/pl/.test(tags) && !/ies$/.test(w) ? [null, "-es of a nominative singular may be short (miles)"] : ["L", "final -ēs is long"];
  if (/a$/.test(w)) {
    if (/abl\. sg/.test(tags) && !/nom|voc|acc\. pl|n\. pl/.test(tags)) return ["L", "-ā of the ablative singular is long"];
    if (/impv/.test(tags)) return ["L", "-ā of a 1st-conjugation imperative is long"];
    if (tags && !/abl\. sg/.test(tags)) return ["S", "final -a (nominative, or neuter plural) is short"];
    return [null, "final -a: long in the ablative, short in the nominative"];
  }
  if (/e$/.test(w)) {
    if (/adv/.test(tags) && lemL.some(l => /ē$/.test(l))) return ["L", "adverbs in -ē are long"];
    if (/abl\. sg/.test(tags) && lemL.some(l => /ēs$/.test(l))) return ["L", "-ē of the 5th declension is long"];
    if (/impv/.test(tags) && lemL.some(l => /eō$/.test(l))) return ["L", "-ē of a 2nd-conjugation imperative is long"];
    return ["S", "final -e is usually short"];
  }
  if (/is$/.test(w)) return /dat\. abl\. pl|abl\. pl|dat\. pl/.test(tags) ? ["L", "-īs of the dative and ablative plural is long"] : /2nd sg/.test(tags) && lemmas.some(l => /io$/.test(l)) ? [null, "-is of a verb: long in the 4th conjugation"] : ["S", "final -is is usually short"];
  if (/us$/.test(w)) return ["S", "final -us is usually short (but -ūs in the 4th declension’s genitive and plural)"];
  if (/(um|am|em|im|at|it|ut|et|ur|or|er)$/.test(w)) return ["S", "a vowel before final -m, -t, -r is short"];
  return [null, ""];
}
/* One line: words → syllables with what is known about each. */
function mtLine(text, info) {
  const words = (text.match(/[A-Za-zÀ-ÿĀ-žæœÆŒ̀-ͯ]+/g) || []);
  const out = [];
  words.forEach((wd, wi) => {
    const syl = mtSyllables(wd);
    const key = n1(mtPlain(wd).toLowerCase());
    const wk = info.wk[key];
    const nat = mtNature(wd, wk);
    const acc = info.acc && info.acc[key];
    const fin = mtFinal(wd, wk);
    syl.forEach((s, k) => {
      const last = k === syl.length - 1;
      let q = null, why = "";
      const cw = s.after.reduce((t, c) => t + (c.n || 1), 0);
      const nextWord = words[wi + 1] ? mtUnits(words[wi + 1]) : [];
      const nextCons = (() => { let n = 0; for (const u of nextWord) { if (u.k === "V") break; if (u.k === "C") n += u.n || 1; } return n; })();
      const pos = mtPlain(wd).toLowerCase();
      if (s.v.diph) { q = "L"; why = `the diphthong ${s.v.s.toLowerCase()} is long`; }
      else if (!last && cw >= 2 && !s.ml) { q = "L"; why = `long by position: the vowel is followed by ${s.after.map(c => c.s).join(" + ")}`; }
      else if (s.after.some(c => c.ci)) { q = "L"; why = "long by position: consonantal i between vowels counts double"; }
      else if (last && cw >= 2) { q = "L"; why = `long by position: ${s.after.map(c => c.s).join(" + ")}`; }
      else if (last && cw === 1 && nextCons >= 1) { q = "L"; why = `long by position: final ${s.after.map(c => c.s).join("")} + the next word's consonant`; }
      else if (!last && !s.after.length && MT_VOW.includes(pos[s.va + s.v.s.length] || "h") && !s.v.diph) { q = "S"; why = "a vowel before another vowel is short"; }
      else if (!last && s.after.length === 0 && pos[s.va + 1] === "h") { q = "S"; why = "a vowel before another vowel (h doesn't count) is short"; }
      if (!q && nat[s.va] != null) { q = nat[s.va]; why = q === "L" ? "long by nature (marked in the dictionary)" : "short by nature (unmarked in the dictionary)"; }
      if (!q && acc && syl.length >= 3 && k === syl.length - 2) {
        const at = acc[0];
        const accSyl = syl.findIndex(x => at >= x.va && at < x.va + x.v.s.length);
        if (accSyl === syl.length - 2) { q = "L"; why = "the accent falls on this syllable (the penult), so it is long"; }
        else if (accSyl === syl.length - 3) { q = "S"; why = "the accent goes back to the antepenult, so this penult is short"; }
      }
      if (!q && last && fin[0]) { q = fin[0]; why = fin[1]; }
      if (!q && s.ml) why = "a mute + liquid after a short vowel: common (either)";
      if (!q && !why && last && fin[1]) why = fin[1];
      out.push({ t: s.t, w: wi, k, last, q, why, word: wd, ml: s.ml && !q });
    });
  });
  // elision: final vowel or vowel + m before a vowel or h
  for (let i = 0; i < out.length - 1; i++) {
    const s = out[i], nx = out[i + 1];
    if (!s.last || nx.w === s.w) continue;
    const endV = /[aeiouy]m?$/i.test(mtPlain(s.word)) && !/^(o|heu|eheu|a|ah|o)$/i.test(mtPlain(s.word));
    const startV = /^h?[aeiouy]/i.test(mtPlain(nx.word)) && !mtUnits(nx.word).slice(0, 1).some(u => u.k === "C" && u.s.toLowerCase() !== "h");
    if (endV && startV) {
      if (/^(est|es)$/i.test(nx.word)) { nx.prodel = true; nx.el = true; nx.why = "prodelision: est loses its e after a vowel or -m"; }
      else { s.el = true; s.why = "elided before the vowel of the next word"; }
    }
  }
  return out;
}
/* Meters: patterns over "-" long, "u" short, "x" either; the last syllable of a line is always free. */
const MT_FEET = { D: ["-uu", "--"] };
function mtExpand(pat) {
  let outs = [""];
  for (const ch of pat) {
    if (MT_FEET[ch]) outs = outs.flatMap(o => MT_FEET[ch].map(f => o + f));
    else outs = outs.map(o => o + ch);
  }
  return outs;
}
const METERS = [
  { id: "iamb2", name: "Iambic dimeter (Ambrosian)", lines: ["x-u-x-ux"], feet: [2, 4, 6], note: "Four lines of four iambs (˘ ¯), the meter of St Ambrose’s hymns and most Breviary hymns: Aeterne rerum Conditor. The 1st and 3rd feet may be spondees." },
  { id: "sapph", name: "Sapphic stanza", lines: ["-u-x-uu-u-x", "-u-x-uu-u-x", "-u-x-uu-u-x", "-uu-x"], feet: [2, 4, 7, 9], lfeet: { 3: [3] }, note: "Three lines of eleven syllables and an Adonic (¯ ˘ ˘ ¯ ¯): Iste Confessor, Ut queant laxis." },
  { id: "ascl", name: "Asclepiad and Glyconic", lines: ["---uu--uu-ux", "---uu--uu-ux", "---uu--uu-ux", "---uu-ux"], feet: [2, 6], note: "Three lesser Asclepiads (¯ ¯ ¯ ˘ ˘ ¯ | ¯ ˘ ˘ ¯ ˘ ¯) and a Glyconic: Sanctorum meritis, Regali solio." },
  { id: "ascl2", name: "Asclepiad and Pherecratean + Glyconic", lines: ["---uu--uu-ux", "---uu--uu-ux", "---uu-x", "---uu-ux"], feet: [2, 6], note: "Two Asclepiads, a Pherecratean and a Glyconic: Sacris solemniis (rhythmic), Christe sanctorum decus." },
  { id: "troch", name: "Trochaic tetrameter catalectic", lines: ["-u-x-u-x-u-x-ux"], feet: [4, 8, 12], note: "Fifteen syllables, trochees (¯ ˘) with a break after the eighth: Pange lingua gloriosi proelium certaminis (Fortunatus)." },
  { id: "iamb3", name: "Iambic trimeter", lines: ["x-u-x-u-x-ux"], feet: [2, 4, 6, 8, 10], note: "Six iambs: Decora lux aeternitatis auream (Ss. Peter and Paul)." },
  { id: "hex", name: "Dactylic hexameter", lines: ["DDDD-uux"], dact: true, note: "Six feet, dactyls (¯ ˘ ˘) or spondees (¯ ¯), the fifth almost always a dactyl: the meter of Virgil." },
  { id: "eleg", name: "Elegiac couplet", lines: ["DDDD-uux", "DD-DDx"], dact: true, note: "A hexameter and a pentameter: Gloria, laus et honor (Palm Sunday)." }
];
METERS.forEach(m => { m.pats = m.lines.map(l => mtExpand(l.replace(/D(?=D*-?uux$)/g, "D"))); });
/* Fit one line (its non-elided syllables) to a pattern list; returns the best { pat, cost }. */
function mtFit(syl, pats) {
  const live = syl.filter(s => !s.el);
  let best = null;
  for (const p of pats) {
    if (p.length !== live.length) continue;
    let cost = 0;
    live.forEach((s, i) => {
      const want = i === p.length - 1 ? "x" : p[i];
      if (want === "x" || !s.q) return;
      if (want === "-" && s.q === "S") cost += s.why.startsWith("a vowel before") ? 2 : 1.5;
      if (want === "u" && s.q === "L") cost += s.why.startsWith("long by position") || s.why.startsWith("the diphthong") ? 3 : 2;
    });
    if (!best || cost < best.cost) best = { pat: p, cost };
  }
  return best;
}
function mtScanStanza(lines, info, meterId) {
  const syls = lines.map(l => mtLine(l, info));
  const tryM = m => {
    let total = 0, fits = [];
    syls.forEach((s, i) => {
      const pats = m.pats[Math.min(i, m.pats.length - 1)] && m.lines.length > 1 ? m.pats[i % m.pats.length] : m.pats[0];
      const f = mtFit(s, pats);
      fits.push(f);
      total += f ? f.cost : 12 + Math.abs((pats[0] || "").length - s.filter(x => !x.el).length) * 3;
    });
    return { m, total, fits };
  };
  const tried = (meterId && meterId !== "auto" ? METERS.filter(m => m.id === meterId) : METERS).map(tryM).sort((a, b) => a.total - b.total);
  const best = tried[0];
  return { syls, best, ranked: tried };
}
/* syllable count with elision, for the accentual view */
const mtCount = syl => syl.filter(s => !s.el).length;

/* ---------- the screen ---------- */
const METER_KEY = "lectio-vulgata-meter";
function MeterMode() {
  const st0 = readLocal(METER_KEY) || {};
  const [hy, setHy] = useState(null);
  const [h, setH0] = useState(st0.h || 0);
  const [own, setOwn] = useState(st0.own || "");
  const [src, setSrc0] = useState(st0.src === "own" ? "own" : "hymn");
  const [meter, setMeter0] = useState(st0.meter || "auto");
  const [view, setView] = useState("scan");   // scan | practice | accent
  const [info, setInfo] = useState(null);
  const [pick, setPick] = useState(null);
  const [marks, setMarks] = useState({});
  const [checked, setChecked] = useState(false);
  const save = p => writeLocal(METER_KEY, { h, own, src, meter, ...p });
  const setH = v => { setH0(v); save({ h: v }); setMarks({}); setChecked(false); setPick(null); };
  const setSrc = v => { setSrc0(v); save({ src: v }); setMarks({}); setChecked(false); };
  const setMeter = v => { setMeter0(v); save({ meter: v }); };
  useEffect(() => { loadBook("hy").then(setHy).catch(() => {}); }, []);
  const stanzas = useMemo(() => {
    if (src === "own") return own.split(/\n\s*\n/).map(b => b.split(/\n|\s\/\s/).map(x => x.trim()).filter(Boolean)).filter(x => x.length);
    if (!hy || !hy.ch[h]) return [];
    return hy.ch[h].map(st => st[1].split(" / ").map(x => x.trim()));
  }, [hy, h, own, src]);
  // look up every word once: Wiktionary forms (macrons) and the Breviary accents
  useEffect(() => {
    let on = true;
    const words = [...new Set(stanzas.flat().join(" ").match(/[A-Za-zÀ-ÿæœÆŒ]+/g) || [])].map(w => n1(mtPlain(w).toLowerCase()));
    setInfo(null);
    (async () => {
      const acc = await loadAccents().catch(() => null);
      const wk = {};
      await Promise.all(words.map(async w => { try { wk[w] = await wktLookup(w); } catch (e) { wk[w] = []; } }));
      if (on) setInfo({ acc, wk });
    })();
    return () => { on = false; };
  }, [stanzas]);
  const scans = useMemo(() => info ? stanzas.map(st => mtScanStanza(st, info, meter)) : null, [info, stanzas, meter]);
  const sel = "rounded-md border border-rule bg-paper px-2 py-1.5 text-[14px] text-ink";
  const meta = hy && hy.meta ? hy.meta : [];
  const mainMeter = scans && scans.length ? (() => { const c = {}; scans.forEach(s => { c[s.best.m.id] = (c[s.best.m.id] || 0) + 1; }); return METERS.find(m => m.id === Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]); })() : null;
  const avgCost = scans && scans.length ? scans.reduce((t, s) => t + s.best.total, 0) / scans.reduce((t, s) => t + s.syls.length, 0) : 0;
  const rhythmic = scans && avgCost > 3.5;
  function lineView(syl, fit, si, li) {
    const m = fit && fit.best ? fit.best.m : null;
    const f = fit && fit.best ? fit.best.fits[li] : null;
    const pat = f ? f.pat : null;
    let j = -1;
    let prevW = -1;
    return syl.map((s, i) => {
      const live = !s.el;
      if (live) j++;
      const want = live && pat ? (j === pat.length - 1 ? "x" : pat[j]) : null;
      const final = want === "x" ? (s.q || (pat && pat[j] !== "x" ? (pat[j] === "-" ? "L" : "S") : "L")) : want === "-" ? "L" : want === "u" ? "S" : s.q;
      const clash = want && s.q && ((want === "-" && s.q === "S") || (want === "u" && s.q === "L"));
      const guessed = !s.q && live && !!want;
      const id = `${si}.${li}.${i}`;
      const mine = marks[id];
      const showMark = view === "scan" || (view === "practice" && checked);
      const mark = !live ? "" : view === "practice" && !checked ? (mine === "L" ? "¯" : mine === "S" ? "˘" : "·") : final === "L" ? "¯" : final === "S" ? "˘" : "×";
      const right = view === "practice" && checked && live && mine ? (mine === final) : null;
      const sep = s.w !== prevW && i > 0 ? " " : "";
      prevW = s.w;
      const feet = m && m.lfeet && m.lfeet[li % m.lines.length] ? m.lfeet[li % m.lines.length] : m && m.feet;
      const footBreak = view !== "accent" && feet && live && feet.includes(j) && !(m.dact) ? <span className="mx-0.5 text-rubric" aria-hidden="true">|</span> : null;
      return (
        <React.Fragment key={i}>
          {sep}{footBreak}
          <button type="button" onClick={() => { if (view === "practice" && !checked && live) setMarks(x => ({ ...x, [id]: x[id] === "L" ? "S" : x[id] === "S" ? undefined : "L" })); else setPick({ s, final, want, clash, guessed }); }}
            className={`inline-flex flex-col items-center rounded px-[1px] align-bottom leading-none ${pick && pick.s === s ? "bg-rubrictint" : ""} ${!live ? "opacity-40 line-through" : ""}`}>
            <span className={`h-3 text-[13px] font-bold ${right === false ? "text-warn" : right === true ? "text-ok" : clash && showMark ? "text-warn" : guessed && showMark ? "text-soft opacity-60" : "text-rubric"}`} aria-hidden="true">{view === "accent" ? (s.acc ? "´" : "") : mark}</span>
            <span lang="la" className="latin text-[1.05rem] text-ink">{s.t}</span>
          </button>
        </React.Fragment>
      );
    });
  }
  // accent marks for the accentual view: the syllable holding the Breviary accent (or the penult/antepenult rule)
  if (scans && view === "accent") scans.forEach(sc => sc.syls.forEach(line => {
    const byW = {};
    line.forEach(s => { (byW[s.w] = byW[s.w] || []).push(s); });
    Object.values(byW).forEach(ws => {
      ws.forEach(x => { x.acc = false; });
      const key = n1(mtPlain(ws[0].word).toLowerCase());
      const a = info.acc && info.acc[key];
      if (ws.length === 1) { if (!/^(et|in|ad|de|ex|e|a|ab|cum|per|sub|non|nec|ut|sed|qui|quae|quod|est|te|me|se|tu|nos|vos|o)$/i.test(ws[0].word)) ws[0].acc = true; return; }
      if (a) { let off = 0; ws.forEach(x => { const len = x.t.length; if (a[0] >= off && a[0] < off + len) x.acc = true; off += len; }); }
      else if (ws.length === 2) ws[0].acc = true;
      else { const pen = ws[ws.length - 2]; (pen.q === "L" ? pen : ws[ws.length - 3]).acc = true; }
    });
  }));
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-lg border border-rule bg-leaf px-5 py-4" aria-label="Choose verse">
        <h3 className="latin text-[1.1rem] font-bold text-ink">Meter: scanning the hymns</h3>
        <p className="text-[14px] leading-snug text-soft">The app splits each line into syllables, marks what the rules settle, and fits the rest to the meter. Tap a syllable to see why it is long or short. Practise by marking a stanza yourself, then check.</p>
        <div className="flex gap-1 self-start rounded-lg border border-rule bg-paper p-0.5 text-[14px]" role="group" aria-label="Text">
          {[["hymn", "Breviary hymns"], ["own", "Paste your own"]].map(([k, l]) => <button key={k} type="button" aria-pressed={src === k} onClick={() => setSrc(k)} className={`rounded px-2.5 py-1 ${src === k ? "bg-ink text-paper" : "text-ink"}`}>{l}</button>)}
        </div>
        {src === "hymn" ? (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="mt-h" className="sr-only">Hymn</label>
            <select id="mt-h" value={h} onChange={e => setH(+e.target.value)} className={`${sel} min-w-0 flex-1 basis-60`}>
              {meta.map((x, i) => <option key={i} value={i}>{x.label}{x.title ? ` · ${x.title.slice(0, 40)}` : ""}</option>)}
            </select>
            <Btn onClick={() => setH((h + 1) % Math.max(1, meta.length))}>Next hymn ›</Btn>
          </div>
        ) : (
          <textarea rows={5} value={own} onChange={e => { setOwn(e.target.value); save({ own: e.target.value }); }} placeholder={"One line per line; a blank line between stanzas.\nAeterne rerum Conditor,\nNoctem diemque qui regis…"}
            className="w-full rounded-md border border-rule bg-paper px-3 py-2 text-[15px] leading-relaxed text-ink" style={{ fontFamily: "var(--font-latin)" }} aria-label="Your verse" />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="mt-m" className="text-[14px] text-soft">Meter</label>
          <select id="mt-m" value={meter} onChange={e => setMeter(e.target.value)} className={sel}>
            <option value="auto">Find it for me</option>
            {METERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="flex gap-1 rounded-lg border border-rule bg-paper p-0.5 text-[14px]" role="group" aria-label="View">
            {[["scan", "Scansion"], ["practice", "Practise"], ["accent", "Accentual"]].map(([k, l]) => <button key={k} type="button" aria-pressed={view === k} onClick={() => { setView(k); setChecked(false); }} className={`rounded px-2.5 py-1 ${view === k ? "bg-ink text-paper" : "text-ink"}`}>{l}</button>)}
          </div>
        </div>
      </section>
      {!scans ? <p className="text-[15px] text-soft">{stanzas.length ? "Looking up the words…" : "Choose a hymn or paste some verse."}</p> : (
        <>
          {mainMeter && view !== "accent" && (
            <div className="rounded-lg border border-rule bg-paper px-4 py-3 text-[14px] leading-snug text-ink">
              <b>{meter === "auto" ? "Best fit: " : ""}{mainMeter.name}.</b> {mainMeter.note}
              {rhythmic && <span className="mt-1 block text-warn">Many syllables disagree with every quantitative meter: this hymn is probably rhythmic (counted syllables and word accents, often rhymed). Try the Accentual view.</span>}
            </div>
          )}
          {view === "accent" && <p className="rounded-lg border border-rule bg-paper px-4 py-3 text-[14px] leading-snug text-ink">Accentual: the stressed syllable of each word (from the Breviary’s accents, else the penult rule), and each line’s syllable count. Rhythmic hymns keep the count and put the stresses in a regular pattern: <span lang="la" className="latin">Pánge língua gloriósi / córporis mystérium</span> is 8 + 7, stressed like trochees.</p>}
          <article className="flex flex-col gap-5 rounded-lg border border-rule bg-leaf px-5 py-5 sm:px-7">
            {scans.map((sc, si) => (
              <div key={si} className="flex flex-col gap-2">
                {sc.syls.map((syl, li) => (
                  <div key={li} className="flex flex-wrap items-end gap-y-1">
                    <span className="mr-2 w-5 flex-none text-right text-[11px] text-soft">{view === "accent" ? mtCount(syl) : ""}</span>
                    <span className="min-w-0 flex-1">{lineView(syl, sc, si, li)}</span>
                  </div>
                ))}
              </div>
            ))}
          </article>
          {view === "practice" && (
            <div className="flex flex-wrap items-center gap-2">
              {!checked ? <>
                <span className="text-[14px] text-soft">Tap each syllable: once for long (¯), twice for short (˘). Elided syllables are greyed out.</span>
                <Btn variant="primary" onClick={() => setChecked(true)}>Check my marks</Btn>
              </> : (() => {
                let n = 0, ok = 0;
                scans.forEach((sc, si) => sc.syls.forEach((syl, li) => {
                  const f = sc.best.fits[li]; let j = -1;
                  syl.forEach((s, i) => { if (s.el) return; j++; const pat = f && f.pat; if (!pat) return; const w = j === pat.length - 1 ? (s.q || "x") : pat[j]; const fin = w === "-" ? "L" : w === "u" ? "S" : w; const m = marks[`${si}.${li}.${i}`]; if (fin === "L" || fin === "S") { n++; if (m === fin) ok++; } });
                }));
                return <><span className="text-[15px] text-ink"><b>{ok}</b> of {n} syllables right ({n ? Math.round(ok / n * 100) : 0}%). Green: right, amber: check again.</span><Btn onClick={() => { setChecked(false); setMarks({}); }}>Try again</Btn></>;
              })()}
            </div>
          )}
          {pick && (
            <div className="rounded-lg border border-rubric bg-paper px-4 py-3 text-[14px] leading-snug text-ink" aria-live="polite">
              <p><span lang="la" className="latin font-bold">{pick.s.t}</span> <span className="text-soft">in</span> <span lang="la" className="latin">{pick.s.word}</span>: {pick.s.el ? "elided (not pronounced in the meter)." : pick.final === "L" ? "long." : pick.final === "S" ? "short." : "either."}</p>
              {pick.s.why && <p className="text-soft">{pick.s.why[0].toUpperCase() + pick.s.why.slice(1)}.</p>}
              {pick.guessed && <p className="text-soft">The rules didn’t settle it, so it takes the meter’s value.</p>}
              {pick.clash && <p className="text-warn">The meter wants it {pick.want === "-" ? "long" : "short"}: either the guess above is wrong (check the dictionary’s quantity), or the poet takes a licence here.</p>}
              <button type="button" className="mt-1 text-[13px] text-soft underline" onClick={() => setPick(null)}>Close</button>
            </div>
          )}
          <details className="rounded-lg border border-rule bg-leaf px-5 py-3 text-[14px] leading-snug text-ink">
            <summary className="cursor-pointer font-semibold text-rubric">The rules, in brief</summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
              <li><b>Syllables.</b> One vowel or diphthong (ae, oe, au) each. A single consonant between vowels starts the next syllable; of two, one goes each way; a mute (p, b, t, d, c, g) + l or r may both go forward. (Allen &amp; Greenough §§ 603–604.)</li>
              <li><b>Long by nature:</b> a long vowel (marked ā in dictionaries) or a diphthong. <b>Long by position:</b> a vowel followed by two consonants, or x or z, even across words. (§ 603.)</li>
              <li><b>Short:</b> a vowel before another vowel (dĕus, vĭa) or before nt, nd; a short vowel before a mute + liquid is <i>common</i>, long or short as the verse needs (pătris or pātris). (§§ 602, 603f.)</li>
              <li><b>Finals:</b> -ā of the ablative, -ō, -ī, -ū, -ās, -ēs, -ōs long; -a of the nominative and neuter plural, -e, -is, -us usually short. (§§ 604–605.)</li>
              <li><b>Elision:</b> a final vowel, or vowel + m, is slurred into a following vowel or h: <span lang="la" className="latin">multum ille et</span> → <span lang="la" className="latin">mult’ ill’ et</span>. (§ 612.)</li>
              <li><b>The accent</b> (word stress) falls on the penult if it is long, otherwise on the antepenult (§ 12): so the Breviary’s accent marks (Dómine, grátia) also tell you the penult’s quantity.</li>
              <li><b>Breviary meters:</b> most hymns are iambic dimeter (St Ambrose); others Sapphic, Asclepiad, trochaic; many medieval ones (St Thomas, the sequences) are rhythmic, counting syllables and stresses instead.</li>
            </ul>
          </details>
          <p className="text-[12px] text-soft">An aid, not an oracle: quantities come from Wiktionary’s marked headwords, the Breviary’s accents and the rules above, and a few will be wrong (especially in Greek and Hebrew names). Hymn texts: the 1960 Breviary, via Divinum Officium.</p>
        </>
      )}
    </div>
  );
}
