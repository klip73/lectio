// Check the form generator against every word the treebanks parsed in context.
// Usage: node tools/forms/check.mjs ../data
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";
const D = process.argv[2];
const ctx = {}; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../../src/morph.js", import.meta.url), "utf8") + "\nthis.MORPH = MORPH;", ctx);
const M = ctx.MORPH;
const lex = JSON.parse(readFileSync(`${D}/lexicon.json`, "utf8"));
const cache = new Map();
function tables(li) {
  if (cache.has(li)) return cache.get(li);
  const [lemma, , head] = lex.lemmas[li];
  let t = null;
  const v = M.verbInfo(lemma, head);
  if (v) { const c = M.conjugate(v); t = { kind: "verb", info: v, ...c }; }
  else { const n = M.nounInfo(lemma, head); if (n) t = { kind: "noun", info: n, F: M.decline(n) };
    else { const a = M.adjInfo(lemma, head); if (a) t = { kind: "adj", info: a, F: M.declineAdj(a) }; else if (M.PRONOUNS[lemma]) t = { kind: "pron", F: M.pronounForms(lemma) }; } }
  cache.set(li, t); return t;
}
const stats = {}, fails = {};
const G = { o: ["m", "n"], p: ["m", "f"], q: ["m", "f", "n"] };
const genders = g => G[g] || [g];
const bump = (cat, ok, ex) => { const s = stats[cat] || (stats[cat] = { ok: 0, n: 0 }); s.n++; if (ok) s.ok++; else { (fails[cat] || (fails[cat] = [])).push(ex); } };
const codes = lex.parts.flatMap(p => p.books.map(b => b[0]));
for (const code of codes) {
  const b = JSON.parse(readFileSync(`${D}/${code}.json`, "utf8"));
  b.ch.forEach((ch, ci) => ch.forEach(v => {
    const words = v[1].match(/[A-Za-z]+/g) || [];
    words.forEach((w, k) => {
      const e = v[3][k];
      if (typeof e !== "number" || e < 0) return;
      const [li, pos, m] = lex.ana[e];
      if (!m || m.includes("?") ) return;
      const t = tables(li);
      const W = M.norm(w);
      // Spelling differences between dictionary and Vulgate (paenitentia / poenitentia, eicio / ejicio) are not engine errors.
      const vr = x => x.replace(/^h/, "").replace(/(ae|oe)/g, "e").replace(/exs/g, "ex").replace(/ii/g, "i").replace(/adn/g, "ann").replace(/adp/g, "app").replace(/ll/g, "l").replace(/tt/g, "t").replace(/assimul/g, "assimil");
      const has = arr => !!arr && arr.some(f => { const F = M.norm(f), G = F.split(" ")[0]; return F === W || G === W || vr(F) === vr(W) || vr(G) === vr(W); });
      const ex = `${w} (${lex.lemmas[li][0]} | ${lex.lemmas[li][2] || ""} | ${m}) ${code} ${ci + 1}:${v[0]}`;
      if (pos === "V-") {
        if (!t || t.kind !== "verb") return bump("verb:no-entry", false, ex);
        const mood = m[3], tense = m[2], voice = m[4];
        if ("ims".includes(mood)) {
          const pn = m[0] + m[1];
          // a perfect passive is two words: the participle carries the person
          const keys = [tense + mood + voice + pn, tense + mood + (voice === "a" ? "p" : "a") + pn];
          const ok = keys.some(kk => has(t.finite[kk]));
          const cat = "verb:" + (t.info.irr ? "irr-" + t.info.irr : t.info.dep ? "dep" : "conj" + t.info.conj) ;
          bump(cat, ok, ex + " want " + keys[0] + " got " + JSON.stringify(t.finite[keys[0]] || t.finite[keys[1]]));
          bump("verb:all", ok, ex);
        } else if (mood === "n") {
          const kk = "inf-" + tense + voice, alt = "inf-" + tense + (voice === "a" ? "p" : "a");
          bump("verb:infinitive", has(t.nonfinite[kk]) || has(t.nonfinite[alt]), ex + " got " + JSON.stringify(t.nonfinite[kk]));
        } else if (mood === "p" || mood === "g") {
          const which = mood === "g" ? "gdv" : tense === "p" ? "ptc-pa" : tense === "r" ? "ptc-rp" : "ptc-fa";
          const T = M.participleTable(t.nonfinite, which);
          const ok = !!T && genders(m[5]).some(g => has(T[g + m[6] + m[1]]));
          bump("verb:participle", ok, ex + " " + which + " got " + JSON.stringify(T && T["m" + m[6] + m[1]]));
        } else if (mood === "d") bump("verb:gerund", has(t.nonfinite.gnd), ex);
      } else if (pos === "Nb") {
        if (!t || t.kind !== "noun") return bump("noun:no-entry", false, ex);
        const kk = m[6] + m[1];
        bump("noun:decl" + t.info.decl, has(t.F[kk]), ex + " want " + kk + " got " + JSON.stringify(t.F[kk]));
        bump("noun:all", has(t.F[kk]), ex);
      } else if (pos === "A-") {
        if (!t || t.kind !== "adj" || (m[7] && m[7] !== "p" && m[7] !== "-")) return;
        const ok = genders(m[5]).some(g => has(t.F[g + m[6] + m[1]]));
        bump("adj:" + t.info.type, ok, ex + " got " + JSON.stringify(t.F[genders(m[5])[0] + m[6] + m[1]]));
        bump("adj:all", ok, ex);
      } else if (/^P[dpr]$/.test(pos) && t && t.kind === "pron") {
        const pers = M.PRONOUNS[lex.lemmas[li][0]].personal;
        const ok = (pers ? [""] : genders(m[5])).some(g => has(t.F[g + m[6] + m[1]]));
        bump("pron", ok, ex + " got " + JSON.stringify(t.F[(pers ? "" : genders(m[5])[0]) + m[6] + m[1]]));
      }
    });
  }));
}
for (const [k, s] of Object.entries(stats).sort()) console.log(k.padEnd(18), `${s.ok}/${s.n}`, (s.ok / s.n * 100).toFixed(1) + "%");
const show = process.argv[3];
if (show) for (const f of (fails[show] || []).slice(0, +process.argv[4] || 40)) console.log("  ", f);
