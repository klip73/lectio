# Tests

Headless-browser tests (Python Playwright, Chromium). From `tests/`:

    python3 mkpage.py      # builds t.html from ../dist/lectio-vulgata.html, bundles React, links ../data
    python3 run4.py        # main flows: welcome, Today, vocabulary, passages, aids, quiz, tutor, exam, focus, links
    python3 run6.py        # vocabulary cards (dictionary entries, Summa meanings, "I know this")
    python3 run8.py        # skeleton, recording, reports, blind mode, exam; the offline copy with no network
    python3 run12.py       # Forms: tables, search, word links, trainer (write, parse, agreement, pronouns)
    python3 run14.py       # answer checking for the trainer (alternative spellings, several right parsings)
    python3 run16.py       # Guide (topics, links to passages and drills, terms) and the progress file
    python3 run17.py       # placement check: estimator accuracy on simulated students, passage picking in every part, the screens
    python3 run18.py       # the Office: today's day, views, words, days read and streak, far dates; offline copy; the app offline
    python3 run19.py       # navigation groups, the liturgical calendar, prayers, the Library (place kept, word help)
    python3 run15.py       # skeleton answers for Apocalypse 9:18-19 (compound tenses, nominatives)

Each prints what it saw and ends with `ERRORS: []` when the page raised no errors.
Also run `node ../tools/forms/check.mjs ../data`: the form generator against every parsed word in the texts (about 99%).
