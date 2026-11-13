// Build the published page: precompile the app (JSX -> plain JS) and Tailwind CSS, then inline both.
// Usage: node tools/build_page.mjs [out.html]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const NM = "/opt/npm-tools/node_modules";
const require = createRequire(NM + "/");
const esbuild = require("esbuild");
const { compile } = require("tailwindcss");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const app = args.includes("--app");
const offline = app || args.includes("--offline");
const out = args.find(a => !a.startsWith("--")) || path.join(root, app ? "docs/index.html" : offline ? "dist/lectio-offline.html" : "dist/lectio-vulgata.html");
// app.jsx may pull in other source files with /*@include name.jsx*/
const src = readFileSync(path.join(root, "src/app.jsx"), "utf8").replace(/\/\*@include ([\w.-]+)\*\//g, (_, f) => readFileSync(path.join(root, "src", f), "utf8"));

// 0. The exam parts, books and chapter labels come from the data build.
const lexicon = JSON.parse(readFileSync(path.join(root, "data", "lexicon.json"), "utf8"));
const parts = lexicon.parts.map(p => ({ id: p.id, name: p.name, books: p.books }));
// The Office data's version: a hash of its files, so phones re-fetch after a rebuild.
const { createHash: _ch } = await import("node:crypto");
const { readdirSync: _rd } = await import("node:fs");
const officeDir = path.join(root, "data", "office");
const officeFiles = _rd(officeDir).filter(f => f.endsWith(".json")).sort();
const officeVer = officeFiles.reduce((h, f) => h.update(f).update(readFileSync(path.join(officeDir, f))), _ch("sha256")).digest("hex").slice(0, 10);
const srcWithData = src.replace("/*PARTS_JSON*/[]", () => JSON.stringify(parts)).replace('const OFFICE_VER = "dev"; /*OFFICE_VER*/', `const OFFICE_VER = "${officeVer}";`);
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
  const dataDir = path.join(root, "data");
  const pack = {};
  for (const f of readdirSync(dataDir).filter(f => f.endsWith(".json")).sort()) pack[f] = gzipSync(readFileSync(path.join(dataDir, f)), { level: 9 }).toString("base64");
  // The offline copy carries the whole Office too; the phone app fetches it day by day instead (and keeps what it has fetched).
  // The single offline file must stay under 16 MB, so it carries Matins and the Mass (not the other hours, "d-" files).
  if (!app) for (const f of officeFiles.filter(f => !/^d-/.test(f) && f !== "versions.json" && f !== "votive.json")) pack["office/" + f] = gzipSync(readFileSync(path.join(officeDir, f)), { level: 9 }).toString("base64");
  const libDir = path.join(root, "data", "library");
  if (!app) {
    // The offline copy is near its 16 MB limit: only the works marked offline, their index, and their smaller word index.
    const libIdx = JSON.parse(readFileSync(path.join(libDir, "index.json"), "utf8"));
    const keep = libIdx.works.filter(w => w.offline);
    const z = b => gzipSync(b, { level: 9 }).toString("base64");
    pack["library/index.json"] = z(Buffer.from(JSON.stringify({ ...libIdx, works: keep })));
    pack["library/forms.json"] = z(readFileSync(path.join(libDir, existsSync(path.join(libDir, "forms0.json")) ? "forms0.json" : "forms.json")));
    for (const w of keep) pack[`library/${w.id}.json`] = z(readFileSync(path.join(libDir, w.id + ".json")));
  }
  const built = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const reactTags = /<script src="https:\/\/cdnjs[^"]*react\.production\.min\.js"><\/script>\s*<script src="https:\/\/cdnjs[^"]*react-dom\.production\.min\.js"><\/script>/;
  if (!reactTags.test(page)) throw new Error("React script tags not found");
  page = page.replace(reactTags, () => `<script>${reactJs.replace(/<\/script/gi, "<\\/script")}</script>\n<script>window.__LV_BUILT=${JSON.stringify(built)};window.__LV_DATA=${JSON.stringify(pack)};</script>`);
  let head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`;
  if (app) {
    head += `<meta name="theme-color" content="#9a2b22"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Lectio"><meta name="apple-mobile-web-app-status-bar-style" content="default">`;
    page = page.replace("window.__LV_DATA=", "window.__LV_APP=true;window.__LV_DATA=");
    /* Register the service worker; look for a new version whenever the app comes back on screen (a home-screen app
       is often resumed, not reloaded), and offer a one-tap reload when a new version has taken over. */
    page += `<script>(function(){if(!("serviceWorker" in navigator))return;var had=!!navigator.serviceWorker.controller,shown=false;
function bar(){if(shown)return;shown=true;var d=document.createElement("div");d.setAttribute("role","status");
d.style.cssText="position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:10px;background:#2b2520;color:#fbf8f2;font:15px/1.3 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25)";
d.innerHTML='<span>A new version of Lectio Vulgata is ready.</span>';var b=document.createElement("button");b.textContent="Reload";
b.style.cssText="flex:none;padding:6px 14px;border-radius:7px;border:0;background:#9a2b22;color:#fff;font:600 15px system-ui,sans-serif";
b.onclick=function(){location.reload()};d.appendChild(b);document.body.appendChild(d);}
navigator.serviceWorker.addEventListener("controllerchange",function(){if(had)bar();had=true;});
addEventListener("load",function(){navigator.serviceWorker.register("sw.js").then(function(r){
function check(){try{r.update()}catch(e){}}document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")check()});setInterval(check,36e5);}).catch(function(){})});})();</script>`;
  }
  page = `<!doctype html><html lang="en"><head>${head}</head><body>\n${page}\n</body></html>`;
}
const { mkdirSync, copyFileSync } = await import("node:fs");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, page);
if (app) {
  // The rest of the app: manifest, icons, and a service worker that keeps everything for offline use.
  const { createHash } = await import("node:crypto");
  const dir = path.dirname(out);
  for (const f of ["icon-192.png", "icon-512.png", "apple-touch-icon.png"]) copyFileSync(path.join(root, "tools/app", f), path.join(dir, f));
  writeFileSync(path.join(dir, "manifest.webmanifest"), JSON.stringify({
    name: "Lectio Vulgata", short_name: "Lectio", description: "Latin exam practice for all five parts, adapting to what you know.",
    start_url: "./", scope: "./", display: "standalone", background_color: "#f8f6f0", theme_color: "#9a2b22",
    icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" }, { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }]
  }, null, 2));
  const version = createHash("sha256").update(page).digest("hex").slice(0, 12);
  writeFileSync(path.join(dir, "sw.js"), readFileSync(path.join(root, "tools/app/sw.js"), "utf8").replace("__VERSION__", version).replace("__OFFICE__", officeVer));
  const { rmSync, cpSync } = await import("node:fs");
  rmSync(path.join(dir, "data"), { recursive: true, force: true });
  cpSync(officeDir, path.join(dir, "data", "office"), { recursive: true });
  cpSync(path.join(root, "data", "library"), path.join(dir, "data", "library"), { recursive: true });
  cpSync(path.join(root, "data", "summa"), path.join(dir, "data", "summa"), { recursive: true });
  cpSync(path.join(root, "data", "search"), path.join(dir, "data", "search"), { recursive: true });
  if (existsSync(path.join(root, "data", "search-ll"))) cpSync(path.join(root, "data", "search-ll"), path.join(dir, "data", "search-ll"), { recursive: true });
  if (existsSync(path.join(root, "data", "search-va"))) cpSync(path.join(root, "data", "search-va"), path.join(dir, "data", "search-va"), { recursive: true });
  cpSync(path.join(root, "data", "ls"), path.join(dir, "data", "ls"), { recursive: true });
  cpSync(path.join(root, "data", "wkt"), path.join(dir, "data", "wkt"), { recursive: true });
  cpSync(path.join(root, "data", "dict"), path.join(dir, "data", "dict"), { recursive: true });
  if (existsSync(path.join(root, "data", "rel"))) cpSync(path.join(root, "data", "rel"), path.join(dir, "data", "rel"), { recursive: true });
  console.log(`app version ${version} in ${dir}`);
}
console.log(`built ${out}: ${(page.length / 1024).toFixed(0)} KB (js ${(js.length / 1024).toFixed(0)} KB, css ${(css.length / 1024).toFixed(0)} KB)`);
