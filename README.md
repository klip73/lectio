# Lectio Vulgata

Latin sight-translation practice for the FSSP Latin Proficiency Exam (New Testament, Summa Theologiae, Matins sermon, Office hymn, Psalm), for students who have finished Latin 1–3. One page, no server: everything runs in the browser.

It ships three ways, all built from the same source:

| Version | File | Where it lives | Notes |
|---|---|---|---|
| Online | `dist/lectio-vulgata.html` + `data/` | claude.ai artifact (owner's account) | Progress syncs to the Claude account; Claude's mistake marking |
| Offline copy | `dist/lectio-offline.html` | downloaded from the online page | One 6 MB file, all data packed inside; desktop browsers |
| Phone app | `docs/` | GitHub Pages: https://klip73.github.io/lectio/ (served from `docs/` on `main`) | Installable, works offline once opened, can record audio |

## Layout

    src/
      app.jsx        the app (React): modes, adaptive scheduling, grading, tutor, exam sittings
      aids.jsx       reading aids (accents, structure colours, listening), examiner questions, Today card
      extras.jsx     recording, find-the-skeleton, blind reading, parse reports, offline download
      morph.js       Latin morphology: every form of a verb / noun / adjective / pronoun from its dictionary entry
      forms.jsx      Forms tab: tables and the conjugation and declension trainer
      guide-data.js  Guide content: grammar topics, the five texts, pronunciation, Summa vocabulary
      guide.jsx      Guide tab, and the progress file (save / load)
      page.html      page template: fonts, colour tokens, small CSS
      tw.css         Tailwind setup
    tools/
      build_page.mjs           builds the page (esbuild + Tailwind); --offline and --app variants
      app/                     phone-app icons and service worker
      data/fetch_sources.sh    downloads every raw source at the pinned version (see SOURCES.md)
      data/corpora.py          extracts the Summa, Matins lessons and hymns, Latin and English
      data/build.py            builds data/: texts, word parsings, dictionary, passage index, accents, vocabulary
      data/fixes.json          hand corrections to parsings (reported errors go here)
      data/apply_fixes.py      applies fixes.json to the built data
      data/validate.py         text checks; must report 0 errors before publishing
      data/cache/corpora.json  output of corpora.py, so a rebuild doesn't need the Gutenberg file
      forms/check.mjs          checks morph.js against every parsed word in the texts
      guide/check.mjs          checks every Guide example is quoted exactly from its text
    tests/                     headless-browser tests (see tests/README.md)

`app.jsx` pulls in the other source files with `/*@include name*/`. Edit the source, never the built HTML.

## Building

Needs Node with `esbuild` and `tailwindcss` (v4) installed (the build looks in `/opt/npm-tools/node_modules`; change `NM` in `tools/build_page.mjs` if yours are elsewhere), and Python 3.

Page only (the usual case):

    node tools/build_page.mjs              # dist/lectio-vulgata.html
    node tools/build_page.mjs --offline    # dist/lectio-offline.html
    node tools/build_page.mjs --app        # docs/ (index.html, sw.js, manifest, icons)

Data (only when the texts, parsings or dictionary change):

    sh tools/data/fetch_sources.sh ../sources            # ~220 MB, pinned versions
    python3 -I tools/data/corpora.py ../sources ../sources/pg17611.txt tools/data/cache/corpora.json   # optional: cache is included
    python3 -I tools/data/build.py ../sources data tools/data/cache/corpora.json
    python3 -I tools/data/apply_fixes.py data tools/data/fixes.json
    python3 -I tools/data/validate.py data            # must say 0 errors
    node tools/forms/check.mjs data                   # forms agreement, about 99%

Passage keys (`book.chapter.verse`) stay stable across rebuilds, so students' progress survives a data rebuild.

## Before publishing

1. `python3 -I tools/data/validate.py data`: 0 errors; `node tools/guide/check.mjs data`: 0 not found.
2. `cd tests && python3 mkpage.py && python3 run4.py && python3 run8.py && python3 run12.py`: each ends `ERRORS: []`.
3. Build all three versions.
4. Publish: the online page from `dist/lectio-vulgata.html`, with `data/*.json` and `dist/lectio-offline.html` (published as `lectio-offline.html`) as its files. Commit and push `docs/`: GitHub Pages updates the phone app within a minute or two.

## Fixing a wrong parsing

Students tap "This parsing looks wrong". On the online page, the owner's reports go to the page's database (`reports` collection); other people copy theirs from Skill map & backup and send them on. Add each confirmed error to `tools/data/fixes.json` (book, chapter, verse, word, correct lemma and morphology code), run `apply_fixes.py`, then `validate.py`, then republish the data files.

Morphology codes are PROIEL's ten positions: person, number, tense, mood, voice, gender, case, degree, (unused), inflection. For example `-s---fn--i` is feminine nominative singular, and `3piia----i` is 3rd plural imperfect indicative active.

## Progress data

Each student's progress is one JSON object (`EMPTY` in `app.jsx` shows the shape; `normalizeProg` cleans anything loaded). It is saved in the browser, to the student's Claude account on the online page, and moves between devices with backup codes (`LV1:` + compressed JSON). Change its shape only in ways `normalizeProg` can read from older saves.
