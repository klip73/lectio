// Check that every Latin example in the Guide is quoted exactly from the text it points to.
// Usage: node tools/guide/check.mjs ../data
import { readFileSync } from "node:fs";
import vm from "node:vm";
const D = process.argv[2];
const ctx = {}; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../../src/guide-data.js", import.meta.url), "utf8") + "\nthis.GUIDE = GUIDE;", ctx);
const G = ctx.GUIDE;
const norm = s => s.toLowerCase().replace(/j/g, "i").replace(/v/g, "u").replace(/[^a-z]/g, "");
const exs = [...G.grammar.flatMap(g => g.items.flatMap(i => i.ex)), ...G.parts.flatMap(p => p.ex || [])];
let bad = 0;
for (const e of exs) {
  const [b, c, v] = e.at;
  const book = JSON.parse(readFileSync(`${D}/${b}.json`, "utf8"));
  const row = (book.ch[c - 1] || []).find(r => r[0] === v);
  const ok = row && norm(row[1]).includes(norm(e.la));
  if (!ok) { bad++; console.log("NOT FOUND", e.at.join(" "), "|", e.la, "||", row ? row[1].slice(0, 160) : "no such verse"); }
}
console.log(`${exs.length} examples, ${bad} not found`);
process.exit(bad ? 1 : 0);
