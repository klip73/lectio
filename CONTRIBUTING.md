# Contributing to Lectio Vulgata

Thank you for helping. The app is free and open source (MIT for the code; the texts and data keep their own licences, see SOURCES.md). Anyone may fork it, change it and publish their own copy.

## The easy ways to help

- **A wrong parsing or meaning.** Tap the word, then "This parsing looks wrong" under it: the app drafts the report for you. Or open an issue on GitHub with the word, where it was (book, chapter, verse or article) and what it should be. Fixes go in `tools/data/fixes.json`.
- **A wrong grammar note.** Open an issue with the passage and the note. The rules are in `src/grammar.jsx` (`grammarNotes` for constructions, `PHRASES` for scholastic, biblical and Church phrases).
- **A mistake in a text.** Open an issue with the work, chapter and the correct reading, ideally with a printed edition to check against.
- **A text that should be in the Library.** Open an issue with the work and a public-domain or openly licensed digital source (GitHub, The Latin Library, Corpus Thomisticum…). Copyrighted books can't be added: the app is public.
- **Ideas and bugs.** Open an issue. Screenshots help.

## Working on the code

    src/           the app (React); app.jsx is the shell and pulls in the other files with /*@include name.jsx*/
    tools/         builders for the page and for every data file, from the original sources
    data/          the built data the page reads (don't edit by hand: change the builder and rebuild)
    tests/         headless-browser tests (Playwright)

1. Install Node (with esbuild and tailwindcss v4) and Python 3 with Playwright (see README.md).
2. Edit `src/`, never the built HTML in `dist/` or `docs/`.
3. Build: `node tools/build_page.mjs` (online page), `--offline` (single file), `--app` (phone app in `docs/`).
4. Test: `cd tests && python3 mkpage.py`, then run the tests that touch your change, e.g. `python3 run28.py`. Each prints `ERRORS: []` when all is well.
5. Open a pull request saying what changed and why, and which tests you ran.

## Style

- Plain language in the interface: say what a thing does, not how it is built.
- Every text and data source is credited in SOURCES.md with its version and licence.
- Keep the offline copy under 16 MiB (the build prints its size).
- Progress keys in localStorage must stay readable by older versions: add fields, don't rename them.

## Publishing your own copy

Fork the repository, run `node tools/build_page.mjs --app`, and publish with `sh tools/app/publish_pages.sh` (or any static host serving `docs/`). Change `APP_SITE` in `src/office.jsx` to your own address if you also host an online page that reads data from it.
