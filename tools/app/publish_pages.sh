#!/bin/sh
# Publish the phone app (docs/, built by `node tools/build_page.mjs --app`) to the gh-pages branch as ONE commit,
# replacing the branch each time, so the published data never piles up in the repository's history.
# GitHub Pages must be set to: Deploy from a branch → gh-pages → / (root).
# Usage: sh tools/app/publish_pages.sh [work dir]
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
WORK=${1:-${TMPDIR:-/tmp}/lectio-pages}
URL=$(git -C "$ROOT" remote get-url origin)
[ -f "$ROOT/docs/index.html" ] || { echo "build first: node tools/build_page.mjs --app"; exit 1; }
# never publish from a main that is behind the remote (two sessions publishing at once)
git -C "$ROOT" fetch -q --depth=50 origin main
git -C "$ROOT" merge-base --is-ancestor origin/main HEAD 2>/dev/null || { echo "STOP: origin/main has commits this checkout doesn't have. Rebase, rebuild, then publish."; exit 1; }
# a full publish drops anything not in docs/: the other calendars (data/office/v/, versions.json) must be copied in first
[ -f "$ROOT/docs/data/office/versions.json" ] || { echo "STOP: docs/data/office/versions.json is missing (the other calendars). Copy data/office/v/ and versions.json from the live gh-pages first, or use publish_code.sh for a code-only update."; exit 1; }
# GitHub Pages sites must stay under 1 GB
MB=$(du -sm "$ROOT/docs" | cut -f1)
[ "$MB" -lt 1000 ] || { echo "STOP: docs/ is $MB MB; GitHub Pages allows 1 GB."; exit 1; }
[ "$MB" -lt 900 ] || echo "warning: docs/ is $MB MB, close to GitHub Pages' 1 GB limit."
rm -rf "$WORK" && mkdir -p "$WORK"
cp -R "$ROOT/docs/." "$WORK/"
touch "$WORK/.nojekyll"          # serve files as they are (no Jekyll processing)
cd "$WORK"
git init -q -b gh-pages
git config user.email "$(git -C "$ROOT" config user.email || echo noreply@example.com)"
git config user.name "$(git -C "$ROOT" config user.name || echo lectio)"
git add -A
git commit -qm "Phone app, built from $(git -C "$ROOT" rev-parse --short HEAD) on $(date -u +%Y-%m-%d)"
git push -q -f "$URL" gh-pages 2>&1 | grep -v "acknowledgments\|push negotiation" || true
echo "published $(git rev-parse --short HEAD) to gh-pages ($(du -sh . | cut -f1))"
