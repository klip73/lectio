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
const args = process.argv.slice(2);
const offline = args.includes("--offline");
const out = args.find(a => !a.startsWith("--")) || path.join(root, "..", offline ? "lectio-offline.html" : "lectio-vulgata.html");
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
if (offline) {
  // One self-contained file: React bundled in, every data file gzipped and base64-encoded.
  const { gzipSync } = await import("node:zlib");
  const { readdirSync } = await import("node:fs");
  const react = await esbuild.build({
    stdin: { contents: 'import * as R from "react"; import * as D from "react-dom/client"; window.React = R; window.ReactDOM = D;', resolveDir: NM, loader: "js" },
    bundle: true, minify: true, write: false, format: "iife", define: { "process.env.NODE_ENV": '"production"' }, legalComments: "none"
  });
  const reactJs = react.outputFiles[0].text;
  const dataDir = path.join(root, "..", "data");
  const pack = {};
  for (const f of readdirSync(dataDir).filter(f => f.endsWith(".json")).sort()) pack[f] = gzipSync(readFileSync(path.join(dataDir, f)), { level: 9 }).toString("base64");
  const built = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const reactTags = /<script src="https:\/\/cdnjs[^"]*react\.production\.min\.js"><\/script>\s*<script src="https:\/\/cdnjs[^"]*react-dom\.production\.min\.js"><\/script>/;
  if (!reactTags.test(page)) throw new Error("React script tags not found");
  page = page.replace(reactTags, () => `<script>${reactJs.replace(/<\/script/gi, "<\\/script")}</script>\n<script>window.__LV_BUILT=${JSON.stringify(built)};window.__LV_DATA=${JSON.stringify(pack)};</script>`);
  page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>\n${page}\n</body></html>`;
}
writeFileSync(out, page);
console.log(`built ${out}: ${(page.length / 1024).toFixed(0)} KB (js ${(js.length / 1024).toFixed(0)} KB, css ${(css.length / 1024).toFixed(0)} KB)`);
