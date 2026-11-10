# Lectio Vulgata

Latin sight-translation practice for the FSSP Latin Proficiency Exam (New Testament, Summa Theologiae, Matins sermon, Office hymn, Psalm), for students who have finished Latin 1–3. One page, no server: everything runs in the browser.

It ships three ways, all built from the same source:

| Version | File | Where it lives | Notes |
|---|---|---|---|
| Online | `dist/lectio-vulgata.html` + `data/` | claude.ai artifact (owner's account) | Progress syncs to the Claude account; Claude marks translations |
| Offline copy | `dist/lectio-offline.html` | downloaded from the online page | One 6 MB file, all data packed inside; desktop browsers |
| Phone app | `docs/` | GitHub Pages: https://klip73.github.io/lectio/ (served from `docs/` on `main`) | Installable, works offline once opened; AI marking with a free Gemini key |

## Layout

    src/
      app.jsx        the app (React): modes, adaptive scheduling, grading, tutor, exam sittings
      ai.jsx         free AI marking with each person's own Gemini key (phone app, offline copy); speech-to-text input
      aids.jsx       reading aids (accents, structure colours, listening), examiner questions, Today card
      extras.jsx     recording, find-the-skeleton, blind reading, parse reports, offline download
      morph.js       Latin morphology: every form of a verb / noun / adjective / pronoun from its dictionary entry
      forms.jsx      Forms tab: tables and the conjugation and declension trainer
      guide-data.js  Guide content: grammar topics, the five texts, pronunciation, Summa vocabulary
      guide.jsx      Guide tab, and the progress file (save / load)
      placement.jsx  placement check: adaptive, objective questions that set the starting level in each part
      office.jsx     Liturgy: each day's Office (all eight hours) and Mass in Latin and English, with rubrics; calendar; prayers; the 1960 Code of Rubrics
      library.jsx    Library: classic Church texts in Latin, chapter by chapter, with word help and your place kept
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
      office/build_office.py   generates each day's eight hours and Mass with the Divinum Officium programs (1960 rubrics)
      office/pack_office.py    packs them into data/office/ (days per year, shared sections, per-month files for Matins / other hours / Mass, word index)
      rubrics/build_rubrics.py converts the 1960 Code of Rubrics (General, Breviary, Missal; tables; Rubricarum instructum) into data/rubrics.json
      office/build_prayers.py  the prayers before and after Mass and the Breviary's appendix (Litanies, Commendation of a soul…) into data/prayers.json
      library/build_library.py the Latin library (Imitation of Christ, Rule of St Benedict, Confessions, Leo, Ambrose, Anselm, Bonaventure, Creeds) into data/library/
      office/perllib/          a three-function stand-in for Perl's CGI module, so the Divinum Officium programs run from the command line
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

The Office and Mass (only when extending the years, or when Divinum Officium corrects its texts):

    git -C ../sources/do sparse-checkout add web/cgi-bin web/www     # the full Divinum Officium programs and texts
    python3 -I tools/office/build_office.py ../sources/do tools/office/perllib ../office-raw 2026-11-01 3713   # about 30 minutes
    python3 -I tools/office/pack_office.py ../office-raw data
    python3 -I tools/rubrics/build_rubrics.py ../sources/do data
    python3 -I tools/office/build_prayers.py ../sources/do tools/office/perllib data
    git -C ../sources/tll sparse-checkout disable     # the full Latin Library collection
    python3 -I tools/library/build_library.py ../sources/tll data

The current build covers 1 November 2026 to 31 December 2036. Before then, rebuild with a later end date: ten years take about half an hour.

Passage keys (`book.chapter.verse`) stay stable across rebuilds, so students' progress survives a data rebuild.

## Before publishing

1. `python3 -I tools/data/validate.py data`: 0 errors; `node tools/guide/check.mjs data`: 0 not found.
2. `cd tests && python3 mkpage.py && python3 run4.py && python3 run8.py && python3 run12.py`: each ends `ERRORS: []`.
3. Build all three versions.
4. Publish: the online page from `dist/lectio-vulgata.html`, with `data/*.json` and `dist/lectio-offline.html` (published as `lectio-offline.html`) as its files. Commit and push `docs/`: GitHub Pages updates the phone app within a minute or two.

## AI marking

On the claude.ai page, Claude marks translations (the `sample` capability). Everywhere else, each person can paste a free Google Gemini API key (Skill map & backup → AI marking; aistudio.google.com/apikey). The key stays in that browser (`lectio-vulgata-ai` in localStorage) and calls `generativelanguage.googleapis.com` directly; there is no server and no shared key. `ai.jsx` picks the newest Flash and Flash-Lite models the key can use, sends one request at a time, waits out a per-minute limit once, and switches to Flash-Lite for the rest of the day when Flash's daily free allowance runs out.

When marking is on: passages are marked as soon as you check them, exam sittings are marked when you finish, the placement check has you translate a sentence instead of choosing one, and the AI's verdict counts for three quarters of each grade that feeds exam readiness. The Speak button uses the browser's speech recognition to type what you say; nothing is recorded.

## Fixing a wrong parsing

Students tap "This parsing looks wrong". On the online page, the owner's reports go to the page's database (`reports` collection); other people copy theirs from Skill map & backup and send them on. Add each confirmed error to `tools/data/fixes.json` (book, chapter, verse, word, correct lemma and morphology code), run `apply_fixes.py`, then `validate.py`, then republish the data files.

Morphology codes are PROIEL's ten positions: person, number, tense, mood, voice, gender, case, degree, (unused), inflection. For example `-s---fn--i` is feminine nominative singular, and `3piia----i` is 3rd plural imperfect indicative active.

## Progress data

Each student's progress is one JSON object (`EMPTY` in `app.jsx` shows the shape; `normalizeProg` cleans anything loaded). It is saved in the browser, to the student's Claude account on the online page, and moves between devices with backup codes (`LV1:` + compressed JSON). Change its shape only in ways `normalizeProg` can read from older saves.
