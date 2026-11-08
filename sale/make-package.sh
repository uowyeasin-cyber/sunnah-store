#!/usr/bin/env bash
# Builds a clean, resellable copy of this store as a zip.
# Usage: bash sale/make-package.sh [output-dir]   (default: ./dist-sale)
# Takes only committed files (git archive), so .env files, node_modules and git history never go in.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-dist-sale}"
VERSION="$(node -p "require('./sale/package/version.json').version")"
NAME="storefront-pro-v${VERSION}"
WORK="$(mktemp -d)"
DEST="$WORK/$NAME"
mkdir -p "$DEST" "$OUT"

git archive HEAD | tar -x -C "$DEST"

# 1. Drop files that belong to this repo only.
rm -rf "$DEST/sale" "$DEST/AGENTS.md" "$DEST/README.md"

# 2. Remove the original owner's brand and address from code defaults.
SITE_FALLBACK="(process.env.VERCEL_PROJECT_PRODUCTION_URL ? \`https://\${process.env.VERCEL_PROJECT_PRODUCTION_URL}\` : 'http://localhost:3000')"
grep -rl "'https://sunnahstore.vercel.app'" "$DEST/src" | while read -r f; do
  SITE_FALLBACK="$SITE_FALLBACK" perl -0pi -e "s/'https:\/\/sunnahstore\.vercel\.app'/\$ENV{SITE_FALLBACK}/g" "$f"
done
grep -rl "sunnahstore.vercel.app" "$DEST/src" | xargs -r perl -pi -e 's/sunnahstore\.vercel\.app/yourshop.com/g'
perl -pi -e "s/'X-Title': 'Sunnah Store'/'X-Title': 'Online Store'/" "$DEST/src/lib/ai.ts"
perl -pi -e "s/name: 'Pen Miswak', mono: 'PM'/name: 'My Store', mono: 'MS'/" "$DEST/src/lib/settings.ts"
perl -pi -e "s/^\/\/ Pen Miswak store\./\/\/ Online store./" "$DEST/prisma/schema.prisma"

# 3. Demo reviews are sample text, not real buyers: don't ship them as "verified".
perl -0pi -e 's/\n  if \(!\(await db\.review\.count\(\)\)\) \{.*?\n  \}\n/\n/s' "$DEST/prisma/seed.ts"

# 4. Add the buyer docs (README, INSTALL, .env.example, LICENSE, CHANGELOG).
cp -r sale/package/. "$DEST/"
rm -f "$DEST/version.json"

# 5. Safety check: nothing personal or secret left behind.
if grep -rniE "sunnahstore|yeasin|johirul|uowyeasin|yeasinarafat|uowyeasin@|sk_live_[a-z0-9]|sk-ant-[a-z0-9]|AIza[0-9A-Za-z_-]{20}|whsec_[a-z0-9]" "$DEST" \
   --exclude-dir=node_modules -l; then
  echo "STOP: personal data or a key is still in the files above." >&2; exit 1
fi

( cd "$WORK" && zip -qr "$NAME.zip" "$NAME" )
mv "$WORK/$NAME.zip" "$OUT/"
rm -rf "$WORK"
echo "Made $OUT/$NAME.zip"
