#!/bin/sh
# Code-only update of the live phone app: replace docs/index.html and docs/sw.js on gh-pages (plus any extra files
# named, paths relative to docs/), keeping every other file already published there, including data that is not on
# main (data/office/v/ and versions.json, the other calendars). The live Office version string is kept, so phones
# don't re-download the whole Office. gh-pages stays one commit with no parent, as publish_pages.sh makes it.
#
# Usage: node tools/build_page.mjs --app && sh tools/app/publish_code.sh [docs-relative extra files…]
#   e.g. sh tools/app/publish_code.sh data/library/index.json data/rel/a.json
# Refuses to run when origin/main has commits this checkout lacks (two sessions publishing at once).
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
URL=$(git -C "$ROOT" remote get-url origin)
[ -f "$ROOT/docs/index.html" ] && [ -f "$ROOT/docs/sw.js" ] || { echo "build first: node tools/build_page.mjs --app"; exit 1; }

# 1. never publish from a main that is behind the remote
git -C "$ROOT" fetch -q --depth=50 origin main
if ! git -C "$ROOT" merge-base --is-ancestor origin/main HEAD 2>/dev/null; then
  echo "STOP: origin/main has commits this checkout doesn't have. Rebase onto origin/main, rebuild, then publish."; exit 1
fi
[ -z "$(git -C "$ROOT" status --porcelain -- src tools data)" ] || echo "note: uncommitted changes in src/tools/data are being published"
for f in "$@"; do [ -f "$ROOT/docs/$f" ] || { echo "no such file: docs/$f"; exit 1; }; done

# 2. the live tree, without downloading its files
WORK=$(mktemp -d)
git clone -q --depth 1 --filter=blob:none --no-checkout -b gh-pages "$URL" "$WORK"
cd "$WORK"
git read-tree HEAD
LIVE_OFFICE=$(git show HEAD:sw.js | sed -n 's/^const OFFICE = "lectio-office-\(.*\)";$/\1/p')
NEW_OFFICE=$(sed -n 's/^const OFFICE = "lectio-office-\(.*\)";$/\1/p' "$ROOT/docs/sw.js")
[ -n "$LIVE_OFFICE" ] && [ -n "$NEW_OFFICE" ] || { echo "couldn't read the Office version strings"; exit 1; }
mkdir -p "$WORK/.stage"
sed "s/lectio-office-$NEW_OFFICE/lectio-office-$LIVE_OFFICE/" "$ROOT/docs/sw.js" > "$WORK/.stage/sw.js"
sed "s/OFFICE_VER=\"$NEW_OFFICE\"/OFFICE_VER=\"$LIVE_OFFICE\"/g" "$ROOT/docs/index.html" > "$WORK/.stage/index.html"
grep -q "OFFICE_VER=\"$LIVE_OFFICE\"" "$WORK/.stage/index.html" || { echo "OFFICE_VER not found in index.html"; exit 1; }

# 3. swap in the new files and commit the tree as a single parentless commit
add() { h=$(git hash-object -w "$1"); git update-index --add --cacheinfo 100644 "$h" "$2"; }
add "$WORK/.stage/index.html" index.html
add "$WORK/.stage/sw.js" sw.js
for f in "$@"; do add "$ROOT/docs/$f" "$f"; done
TREE=$(git write-tree --missing-ok)
git config user.email "$(git -C "$ROOT" config user.email || echo noreply@example.com)"
git config user.name "$(git -C "$ROOT" config user.name || echo lectio)"
C=$(echo "Phone app (code update), built from $(git -C "$ROOT" rev-parse --short HEAD) on $(date -u +%Y-%m-%d)" | git commit-tree "$TREE")
git push -q -f "$URL" "$C:refs/heads/gh-pages" 2>&1 | grep -v "acknowledgments\|push negotiation" || true
echo "published $C to gh-pages (index.html, sw.js$( [ $# -gt 0 ] && echo ", $*" )); Office version kept at $LIVE_OFFICE"
rm -rf "$WORK"
