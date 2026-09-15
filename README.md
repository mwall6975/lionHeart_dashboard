# lionHeart_dashboard

Uses the F45 Lionheart monitor session data for a dashboard.

A single self-contained web app (`index.html`, no build step, no backend) that
turns your F45 Lionheart workout history into two views:

- **Trends** — heart rate, calories, class score, and HR zone-time breakdown
  over time
- **By Workout** — the same metrics compared across your distinct F45 workout
  types

Opens with example data pre-loaded. To see your own data, upload a
`lionheart-export.json` file exported by the included `export-lionheart.js`
script (instructions and the script itself are inside the app, under
"How do I get my export file?"). Everything runs client-side in your
browser — nothing is uploaded to a server.

## Running it

Just open `index.html` in any browser, or enable **GitHub Pages** for this
repo (Settings → Pages → Source: `main` branch, `/` root) to get a public URL.

## Getting your own data

F45's Lionheart API is undocumented, so exporting your own history requires
finding your personal `user_id` by intercepting your phone's network traffic
(e.g. with [mitmproxy](https://mitmproxy.org) or
[HTTP Toolkit](https://httptoolkit.com)) while opening a class result in the
F45 app. Full steps are in the app itself.
