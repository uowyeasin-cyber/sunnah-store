<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Resale package (Storefront Pro) must keep every feature
This store is also sold as a zip (`sale/`). After any feature is merged to main:
1. If it adds an env var, add it to `sale/package/env.example`; if it adds a customer-visible or admin feature, add one line to `sale/package/README.md` and `CHANGELOG.md` (bump `version.json`).
2. If it names the original brand, URL or a personal email, make `sale/make-package.sh` swap or strip it (the script stops if any are left).
3. Rebuild: `bash sale/make-package.sh dist-sale --public` (also refreshes `public/download/storefront-pro.zip` for /get-app) and copy the zip to the project files `sale/` folder.
Seller-only parts (license server, App licenses admin, /get-app) are stripped by the script.
