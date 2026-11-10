// Every form the app's morphology generator (src/morph.js) makes for every dictionary word, as form -> analysis id of that
// word's lemma. build_summa.py uses it for Summa word forms the parsed corpora never met (benevolentiam, distensionem…):
// enough to know the dictionary word, though not the exact parsing.
// Usage: node tools/summa/generated_forms.mjs data out.json
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";
const [D, OUT] = process.argv.slice(2);
const ctx = {}; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../../src/morph.js", import.meta.url), "utf8") + "\nthis.MORPH = MORPH;", ctx);
const M = ctx.MORPH;
const lex = JSON.parse(readFileSync(`${D}/lexicon.json`, "utf8"));
const rank = new Map(lex.freq.map(([li], i) => [li, i]));
const anaOf = new Map();
lex.ana.forEach(([li], i) => { if (!anaOf.has(li)) anaOf.set(li, i); });
function tables(li) {
  const [lemma, , head] = lex.lemmas[li];
  const v = M.verbInfo(lemma, head);
  if (v) return M.conjugate(v);
  const n = M.nounInfo(lemma, head); if (n) return M.decline(n);
  const a = M.adjInfo(lemma, head); if (a) return M.declineAdj(a);
  return null;
}
const strings = (x, out) => { if (typeof x === "string") out.push(x); else if (x && typeof x === "object") for (const k in x) strings(x[k], out); return out; };
const best = new Map();
lex.lemmas.forEach(([lemma, gloss], li) => {
  if (!gloss || !anaOf.has(li)) return;
  let t = null;
  try { t = tables(li); } catch (e) { return; }
  if (!t) return;
  const r = rank.has(li) ? rank.get(li) : 1e6;
  for (const f of strings(t, [])) {
    if (/\s/.test(f.trim())) continue;
    const k = M.norm(f).replace(/j/g, "i").replace(/v/g, "u");
    if (!k || k.length < 2) continue;
    const cur = best.get(k);
    if (!cur || r < cur[1]) best.set(k, [anaOf.get(li), r]);
  }
});
writeFileSync(OUT, JSON.stringify(Object.fromEntries([...best].map(([k, [a]]) => [k, a]))));
console.log(best.size, "forms");
