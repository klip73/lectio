// Check the Learn course data: structure, blanks, and that every Vulgate reading points at a real verse.
// Usage: node tools/course/check.mjs
import { readFileSync } from "node:fs";
import vm from "node:vm";
const root = new URL("../../", import.meta.url);
const ctx = {}; vm.createContext(ctx);
for (const f of ["src/course-natural.js", "src/course-grammar.js"]) vm.runInContext(readFileSync(new URL(f, root), "utf8").replace(/^const (COURSE_\w+)/m, "this.$1"), ctx);
const N = ctx.COURSE_N, G = ctx.COURSE_G;
let bad = 0; const err = (...a) => { bad++; console.log(...a); };
const ids = new Set();
for (const c of [...N, ...G]) { if (ids.has(c.id)) err("dup id", c.id); ids.add(c.id); if (!c.words || !c.words.length) err("no words", c.id); }
for (const c of N) {
  for (const k of ["A", "B"]) for (const [q, a] of c[k]) if ((q.match(/_/g) || []).length !== 1 || !a) err("blank", c.id, k, q);
  for (const p of c.pair || []) if (!G.some(g => g.id === p)) err("pair", c.id, p);
  if (!c.text.length || !c.grammar.length || !c.C.length) err("parts", c.id);
}
const cache = {};
for (const g of G) {
  for (const [e, l] of g.en) if (!e || !l) err("en", g.id, e);
  for (const t of g.tables) for (const r of t.rows) if (r.length !== t.head.length) err("table cols", g.id, t.cap, r.join("/"));
  for (const [b, c, v] of (g.read && g.read.at) || []) {
    const B = cache[b] || (cache[b] = JSON.parse(readFileSync(new URL(`data/${b}.json`, root), "utf8")));
    if (!(B.ch[c - 1] || []).some(r => r[0] === v)) err("verse", g.id, b, c, v);
  }
}
console.log(`${N.length} chapters, ${G.length} lessons, ${bad} problems`);
process.exit(bad ? 1 : 0);
