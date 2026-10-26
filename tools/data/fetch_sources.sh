#!/bin/sh
# Download every raw source the data build uses, at the exact versions the current data was built from.
# Usage: sh tools/data/fetch_sources.sh <dir>     (about 220 MB)
set -e
D=${1:-sources}; mkdir -p "$D"; cd "$D"
get() { # dir repo commit
  [ -d "$1/.git" ] || git clone --quiet "https://github.com/$2" "$1"
  git -C "$1" fetch --quiet origin "$3" 2>/dev/null || true
  git -C "$1" checkout --quiet "$3"
}
get bd scrollmapper/bible_databases e1b254c
get do DivinumOfficium/divinum-officium daa8217
get pt proiel/proiel-treebank 8e38896
get tll cltk/lat_text_latin_library 76229ac
get ud-ITTB UniversalDependencies/UD_Latin-ITTB b19bcbd
get ud-LLCT UniversalDependencies/UD_Latin-LLCT 173cd11
get ud-PROIEL UniversalDependencies/UD_Latin-PROIEL ae7c7c5
get ud-Perseus UniversalDependencies/UD_Latin-Perseus ab43a14
get ud-UDante UniversalDependencies/UD_Latin-UDante e024204
get ww mk270/whitakers-words 1f2f0fb
# The English Summa (Dominican Fathers translation, First Part): Project Gutenberg ebook 17611.
[ -f pg17611.txt ] || echo "Download https://www.gutenberg.org/ebooks/17611 (Plain Text UTF-8) as $D/pg17611.txt"
