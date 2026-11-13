/* ---------- Export: word lists to Anki, Quizlet, a spreadsheet, or print / PDF; texts to EPUB or print ----------
   Kept to one small menu, so it's there for those who want it and out of the way for those who don't.
   Anki: a tab-separated text file with Anki's own header lines (File → Import picks the columns and the tags).
   Quizlet: the same rows copied to the clipboard ("Import" → paste; Tab between term and definition, new line between cards).
   Spreadsheet: CSV with a byte-order mark, so Excel, Numbers and Google Sheets read the accents correctly.
   Print / PDF: a plain printable page in a frame; the browser's print dialog can save it as PDF. */
function lvDownload(name, text, type) {
  try {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    return true;
  } catch (e) { return false; }
}
async function lvCopy(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    try { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); const ok = document.execCommand("copy"); t.remove(); return ok; } catch (e2) { return false; }
  }
}
const escHtml = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/* Print an HTML body (a printable page) through a hidden frame. */
function lvPrint(title, bodyHtml) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const font = getComputedStyle(document.documentElement).getPropertyValue("--font-latin") || "Georgia, serif";
  f.contentDocument.open();
  f.contentDocument.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title><style>
    body{font-family:${font};color:#111;margin:1.5cm;font-size:11pt;line-height:1.45} h1{font-size:15pt;margin:0 0 .3cm} h2{font-size:12pt;margin:.5cm 0 .2cm;color:#9a2b22}
    table{border-collapse:collapse;width:100%} td,th{border-bottom:1px solid #ccc;padding:3px 6px;text-align:left;vertical-align:top} th{font-family:sans-serif;font-size:9pt;color:#555}
    .la{font-weight:bold} .small{font-family:sans-serif;font-size:8.5pt;color:#555} p{margin:.2cm 0} .en{color:#444;font-family:sans-serif;font-size:10pt}
  </style></head><body>${bodyHtml}</body></html>`);
  f.contentDocument.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(() => f.remove(), 60000); }, 300);
}
const tsvCell = s => String(s == null ? "" : s).replace(/[\t\r\n]+/g, " ").trim();
const csvCell = s => { const v = String(s == null ? "" : s).replace(/\r?\n/g, " "); return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
/* rows: [{ la, en, entry?, pos?, ex?, ref?, group?, known? }]; name: file name stem; title: heading for print. */
function ExportMenu({ rows, name, title, tags }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [back, setBack] = useState("meaning");   // what goes on the back of a card: the meaning, or the full dictionary entry + meaning
  if (!rows || !rows.length) return null;
  const front = r => r.la;
  const backOf = r => back === "entry" && r.entry && r.entry !== r.la ? `${r.entry} — ${r.en}` : r.en;
  const file = (s, ext) => `${(name || "latin-words").replace(/[^A-Za-z0-9_-]+/g, "-")}.${ext}`;
  function anki() {
    const tg = (tags || "lectio").replace(/\s+/g, "_");
    const lines = ["#separator:tab", "#html:false", "#tags column:4", "#columns:Latin\tEnglish\tExample\tTags",
      ...rows.map(r => [front(r), backOf(r), r.ex ? `${r.ex.replace(/\[\[|\]\]/g, "")}${r.ref ? " (" + r.ref + ")" : ""}` : "", tg].map(tsvCell).join("\t"))];
    setMsg(lvDownload(file(name, "txt"), lines.join("\n")) ? "Saved for Anki: in Anki choose File → Import and pick this file (Basic note type; the example goes to a third field if your note type has one)." : "Your browser blocked the download here: open the app at klip73.github.io/lectio to save files.");
  }
  async function quizlet() {
    const text = rows.map(r => `${tsvCell(front(r))}\t${tsvCell(backOf(r))}`).join("\n");
    setMsg(await lvCopy(text) ? `Copied ${rows.length} cards. In Quizlet: Create → Import, paste, and leave “Tab” and “New line” chosen.` : "Couldn’t copy here: try the spreadsheet file instead.");
  }
  function csv() {
    const head = ["Latin", "Dictionary entry", "English", "Word type", "Times in the text", "Example", "Reference", "Known"];
    const lines = [head, ...rows.map(r => [r.la, r.entry || "", r.en, r.pos || "", r.n || "", (r.ex || "").replace(/\[\[|\]\]/g, ""), r.ref || "", r.known || ""])].map(x => x.map(csvCell).join(","));
    setMsg(lvDownload(file(name, "csv"), "﻿" + lines.join("\r\n"), "text/csv;charset=utf-8") ? "Saved a spreadsheet file (.csv): it opens in Excel, Numbers or Google Sheets." : "Your browser blocked the download here: open the app at klip73.github.io/lectio to save files.");
  }
  function print() {
    let html = `<h1>${escHtml(title || "Latin words")}</h1><p class="small">${rows.length} words · Lectio Vulgata</p>`;
    let grp = null;
    html += "<table>";
    rows.forEach(r => {
      if (r.group && r.group !== grp) { grp = r.group; html += `</table><h2>${escHtml(grp)}</h2><table>`; }
      html += `<tr><td class="la">${escHtml(r.entry || r.la)}</td><td>${escHtml(r.en)}</td></tr>`;
    });
    html += "</table>";
    lvPrint(title || "Latin words", html);
    setMsg("Opening the print dialog: choose “Save as PDF” there for a PDF.");
  }
  return (
    <div className="flex flex-col gap-2">
      <button type="button" aria-expanded={open} onClick={() => { setOpen(o => !o); setMsg(""); }} className="self-start text-[14px] text-rubric underline underline-offset-2">{open ? "Close export" : "Export…"}</button>
      {open && (
        <div className="flex flex-col gap-2 rounded-md border border-rule bg-paper px-3 py-3">
          <div className="flex flex-wrap gap-2">
            <Btn onClick={anki} title="A text file Anki imports">Anki</Btn>
            <Btn onClick={quizlet} title="Copy, then paste into Quizlet's Import box">Quizlet</Btn>
            <Btn onClick={csv} title="A .csv file for Excel, Numbers or Google Sheets">Spreadsheet</Btn>
            <Btn onClick={print} title="Print, or save as PDF from the print dialog">Print / PDF</Btn>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-soft">
            <input type="checkbox" checked={back === "entry"} onChange={e => setBack(e.target.checked ? "entry" : "meaning")} className="h-4 w-4 accent-[var(--rubric)]" />
            Put the whole dictionary entry (principal parts, genitive) on the back of each card
          </label>
          <p className="text-[12px] text-soft">{rows.length} words, in the order shown.</p>
          {msg && <p className="text-[13px] text-ok" aria-live="polite">{msg}</p>}
        </div>
      )}
    </div>
  );
}

/* ----- EPUB: a minimal, valid EPUB 3 (a stored ZIP: mimetype first, uncompressed) ----- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function zipStore(files) {   // files: [{ name, data: string }]
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  const u16 = n => [n & 255, (n >>> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === "string" ? enc.encode(f.data) : f.data, crc = crc32(data);
    const head = [0x50, 0x4b, 3, 4, ...u16(10), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
    parts.push(new Uint8Array(head), name, data);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(10), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
    off += head.length + name.length + data.length;
  }
  const csize = central.reduce((s, x) => s + x.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(files.length), ...u16(files.length), ...u32(csize), ...u32(off), 0, 0]);
  return new Blob([...parts, ...central, end], { type: "application/epub+zip" });
}
const xesc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/* chapters: [{ title, paras: [{ la, en? }] }] */
function makeEpub({ title, author, chapters, lang = "la" }) {
  const id = "urn:lectio:" + Date.now();
  const files = [{ name: "mimetype", data: "application/epub+zip" },
    { name: "META-INF/container.xml", data: `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>` },
    { name: "OEBPS/style.css", data: "body{font-family:serif;line-height:1.5} h1{font-size:1.3em} .en{color:#555;font-style:italic;margin-top:-.3em} p{margin:.5em 0}" }];
  const items = chapters.map((c, i) => {
    const body = c.paras.map(p => `<p xml:lang="${lang}">${xesc(p.la)}</p>${p.en ? `<p class="en" xml:lang="en">${xesc(p.en)}</p>` : ""}`).join("\n");
    files.push({ name: `OEBPS/c${i + 1}.xhtml`, data: `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}"><head><title>${xesc(c.title)}</title><link rel="stylesheet" href="style.css"/></head><body><h1>${xesc(c.title)}</h1>${body}</body></html>` });
    return i + 1;
  });
  files.push({ name: "OEBPS/nav.xhtml", data: `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>${xesc(title)}</title></head><body><nav epub:type="toc"><h1>${xesc(title)}</h1><ol>${chapters.map((c, i) => `<li><a href="c${i + 1}.xhtml">${xesc(c.title)}</a></li>`).join("")}</ol></nav></body></html>` });
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  files.push({ name: "OEBPS/content.opf", data: `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bid">${id}</dc:identifier><dc:title>${xesc(title)}</dc:title><dc:creator>${xesc(author || "")}</dc:creator><dc:language>${lang}</dc:language><meta property="dcterms:modified">${now}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="css" href="style.css" media-type="text/css"/>${items.map(i => `<item id="c${i}" href="c${i}.xhtml" media-type="application/xhtml+xml"/>`).join("")}</manifest><spine>${items.map(i => `<itemref idref="c${i}"/>`).join("")}</spine></package>` });
  return zipStore(files);
}
function saveEpub(opts, fileName) {
  try {
    const blob = makeEpub(opts);
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = fileName; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    return true;
  } catch (e) { return false; }
}
/* A work's export buttons (Library and Summa reader): EPUB of the whole work, or print what's on screen. */
function TextExport({ getBook, printTitle, printHtml }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <span className="flex flex-wrap items-center gap-2">
      {getBook && <Btn disabled={busy} onClick={async () => {
        setBusy(true); setMsg("");
        try { const b = await getBook(); setMsg(saveEpub(b, (b.file || b.title).replace(/[^A-Za-z0-9_-]+/g, "-").slice(0, 60) + ".epub") ? "Saved an EPUB: open it in Apple Books, Google Play Books, Kindle (Send to Kindle) or any e-reader." : "Your browser blocked the download here."); }
        catch (e) { setMsg("Couldn’t make the e-book: check your connection."); }
        setBusy(false);
      }}>{busy ? "Making the e-book…" : "E-book (EPUB)"}</Btn>}
      {printHtml && <Btn onClick={() => lvPrint(printTitle || "Lectio Vulgata", printHtml())}>Print / PDF</Btn>}
      {msg && <span className="text-[13px] text-ok" aria-live="polite">{msg}</span>}
    </span>
  );
}
