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
