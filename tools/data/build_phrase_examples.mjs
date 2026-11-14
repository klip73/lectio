// Real examples for the Phrases trainer (src/phrases.jsx): for each turn of phrase in PHRASES (src/grammar.jsx),
// up to three short sentences that use it, from the Summa (thomas), the New Testament and Psalms (bible),
// and the Office (church, hymn). Output: data/phrase-ex.json  { title: [[latin, english|"", reference], …] }
// Usage: node tools/data/build_phrase_examples.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const src = readFileSync(path.join(root, "src/grammar.jsx"), "utf8");
const start = src.indexOf("const PHRASES = {");
const end = src.indexOf("\n};", start);
if (start < 0 || end < 0) throw new Error("PHRASES not found in src/grammar.jsx");
const PHRASES = new Function(src.slice(start, end + 3).replace("const PHRASES =", "return"))();

const SENT = /[^.;:?!]+[.;:?!]+["”’)]*/g;
const words = t => (t.match(/[A-Za-z]+/g) || []).length;
const sentences = t => (String(t).match(SENT) || [String(t)]).map(s => s.trim()).filter(s => words(s) >= 4 && words(s) <= 28);
const clean = t => String(t || "").replace(/\{[^}]*\}/g, "").replace(/\^[^^]*\^/g, "").replace(/[*✠+]/g, "").replace(/\s+/g, " ").trim();

/* sources by kind: [latin sentence, english or "", reference] */
const pools = { thomas: [], bible: [], church: [], hymn: [] };
// the Summa: the first part of each article's body and objections (paragraph English is too long to pair)
const SM = { "1": "I", "1-2": "I-II", "2-2": "II-II", "3": "III" };
for (const f of readdirSync(path.join(root, "data/summa")).filter(f => /^\d/.test(f)).sort()) {
  const part = f.replace(/(-\d+)?\.json$/, "").replace(/^(\d)-(\d)-\d+$/, "$1-$2");
  const pk = /^\d-\d$/.test(part) ? part : part.split("-")[0];
  const d = JSON.parse(readFileSync(path.join(root, "data/summa", f), "utf8"));
  for (const [q, Q] of Object.entries(d)) (Q.a || []).forEach((art, ai) => art.forEach(par => sentences(par).forEach(s => pools.thomas.push([s, "", `ST ${SM[pk] || pk} q. ${q} a. ${ai + 1}`]))));
}
// the exam texts (New Testament, Psalms, Matins sermons, hymns, Summa articles), row by row with their English
const KIND = { nt: "bible", ps: "bible", se: "church", hy: "hymn", st: "thomas" };
const lex = JSON.parse(readFileSync(path.join(root, "data/lexicon.json"), "utf8"));
for (const p of lex.parts) {
  for (const b of p.books) {
    const fp = path.join(root, "data", b[0] + ".json");
    if (!existsSync(fp) || !KIND[p.id]) continue;
    const book = JSON.parse(readFileSync(fp, "utf8"));
    book.ch.forEach((ch, ci) => ch.forEach(v => {
      const label = p.id === "nt" || p.id === "ps" ? `${book.name.replace(/^Psalms$/, "Ps")} ${ci + 1}:${v[0]}` : `${(b[3] && b[3][ci]) || book.name}`;
      if (words(v[1]) >= 4 && words(v[1]) <= 28) pools[KIND[p.id]].push([clean(v[1]), clean(v[2] || ""), label]);
      else sentences(clean(v[1])).forEach(s => pools[KIND[p.id]].push([s, "", label]));
    }));
  }
}
for (const k of Object.keys(pools)) console.log(k, pools[k].length, "sentences");

const out = {};
for (const [kind, list] of Object.entries(PHRASES)) {
  const pool = pools[kind] || [];
  for (const [re, title] of list) {
    if (title === "Word order in hymns") continue;
    const seen = new Set(), ex = [];
    // shortest first, then spread through the pool, so the examples are easy and varied
    const hits = [];
    for (let i = 0; i < pool.length && hits.length < 400; i++) if (re.test(pool[i][0])) hits.push(pool[i]);
    hits.sort((a, b) => words(a[0]) - words(b[0]));
    for (const h of hits) {
      const k = h[0].toLowerCase().replace(/[^a-z]/g, "");
      if (seen.has(k) || words(h[0]) < 5) continue;
      seen.add(k); ex.push(h);
      if (ex.length >= 3) break;
    }
    if (ex.length) out[title] = (out[title] || []).concat(ex).slice(0, 3);
  }
}
writeFileSync(path.join(root, "data/phrase-ex.json"), JSON.stringify(out));
console.log("phrases with examples:", Object.keys(out).length, "of", Object.values(PHRASES).flat().length);
