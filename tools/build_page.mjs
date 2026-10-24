// Build the published page: precompile the app (JSX -> plain JS) and Tailwind CSS, then inline both.
// Usage: node tools/build_page.mjs [out.html]
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const NM = "/opt/npm-tools/node_modules";
const require = createRequire(NM + "/");
const esbuild = require("esbuild");
const { compile } = require("tailwindcss");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = process.argv[2] || path.join(root, "..", "lectio-vulgata.html");
// app.jsx may pull in other source files with /*@include name.jsx*/
const src = readFileSync(path.join(root, "src/app.jsx"), "utf8").replace(/\/\*@include ([\w.-]+)\*\//g, (_, f) => readFileSync(path.join(root, "src", f), "utf8"));

// 0. The exam parts, books and chapter labels come from the data build.
const lexicon = JSON.parse(readFileSync(path.join(root, "..", "data", "lexicon.json"), "utf8"));
const parts = lexicon.parts.map(p => ({ id: p.id, name: p.name, books: p.books }));
const srcWithData = src.replace("/*PARTS_JSON*/[]", () => JSON.stringify(parts));
if (srcWithData === src) throw new Error("PARTS_JSON marker missing");

// 1. JavaScript
const js = esbuild.transformSync(srcWithData, { loader: "jsx", jsx: "transform", minify: true, target: "es2019", legalComments: "none" }).code;

// 2. Tailwind: collect class candidates from the source, compile only what is used
const twDir = path.join(NM, "tailwindcss");
const compiler = await compile(readFileSync(path.join(root, "src/tw.css"), "utf8"), {
  base: root,
  loadStylesheet: async (id, base) => {
    const file = id.startsWith("tailwindcss/") ? path.join(twDir, id.slice("tailwindcss/".length)) : path.resolve(base, id);
    return { path: file, base: path.dirname(file), content: readFileSync(file, "utf8") };
  }
});
const candidates = new Set(src.match(/[A-Za-z0-9_\-:.\/\[\]#%(),&>~!*=+']+/g) || []);
const tw = compiler.build([...candidates]);
const css = esbuild.transformSync(tw, { loader: "css", minify: true }).code;

// 3. Inline into the template
let page = readFileSync(path.join(root, "src/page.html"), "utf8");
if (!page.includes("/*APP_JS*/") || !page.includes("/*TAILWIND_CSS*/")) throw new Error("template markers missing");
page = page.replace("/*TAILWIND_CSS*/", () => css).replace("/*APP_JS*/", () => js.replace(/<\/script/gi, "<\\/script"));
writeFileSync(out, page);
console.log(`built ${out}: ${(page.length / 1024).toFixed(0)} KB (js ${(js.length / 1024).toFixed(0)} KB, css ${(css.length / 1024).toFixed(0)} KB)`);
