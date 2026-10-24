# Lectio Vulgata

Latin exam practice (FSSP proficiency exam: NT, Summa, Matins sermon, Office hymn, Psalm).

- `src/app.jsx` — the app (React, JSX). Edit this, not the published HTML.
- `src/page.html` — page template (title, fonts, design tokens).
- `src/tw.css` — Tailwind setup and palette.
- `tools/build_page.mjs` — builds `../lectio-vulgata.html` (precompiled JS + CSS, inlined).
- `tools/data/corpora.py` — extracts Summa, Matins lessons and hymns (Latin + English).
- `tools/data/build.py` — builds `../data/` (texts, word parsings, passage index, accents, vocabulary).
- `tools/data/validate.py` — text checks; run before every publish.

Build: `node tools/build_page.mjs && python3 tools/data/validate.py ../data`
