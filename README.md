# lionHeart_dashboard

Uses the F45 Lionheart monitor session data for a dashboard.

A single self-contained web app (`index.html`, no build step, no backend) that
turns your F45 Lionheart workout history into two views:

- **Trends** — heart rate, calories, class score, and HR zone-time breakdown
  over time
- **By Workout** — the same metrics compared across your distinct F45 workout
  types

Opens with synthetic example data pre-loaded (not any real person's workout
history) so you can see how it works right away. Everything runs client-side
in your browser — nothing is uploaded to a server.

## Files

- `index.html` — the app itself. Open it directly, or serve it via GitHub
  Pages (see below).
- `sample-lionheart-data.json` — dummy session data you can upload into the
  app to test the upload flow without needing your own F45 account.
- `export-lionheart.js` — a standalone Node script that exports your own
  Lionheart session history to a JSON file you can upload instead. Requires
  Node 18+, no dependencies. Usage:
  ```
  node export-lionheart.js YOUR_USER_ID
  ```
- `cloudflare-worker/` — an optional Cloudflare Worker that proxies the
  Lionheart API so the dashboard can fetch your session history directly in
  the browser, no download/upload step needed. See its
  [README](cloudflare-worker/README.md) to deploy one (free tier, a few
  minutes) — it's a one-time setup per person who wants this shortcut.

## Running it

Just open `index.html` in any browser, or enable **GitHub Pages** for this
repo (Settings → Pages → Source: `main` branch, `/` root) to get a public URL.

## Getting your own data

F45's Lionheart API is undocumented, so exporting your own history requires
finding your personal `user_id` by intercepting your phone's network traffic
(e.g. with [mitmproxy](https://mitmproxy.org) or
[HTTP Toolkit](https://httptoolkit.com)) while opening a class result in the
F45 app. Full steps are in the app itself, under "How do I get my export
file?".
