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

If you fetch your data directly from Lionheart, an **Export data** button
appears on the Trends tab, next to "Show data table", letting you download
that session history as CSV, TSV, Excel (.xlsx), or JSON.

## Files

- `index.html` — the app itself. Open it directly, or serve it via GitHub
  Pages (see below).
- `manual-export.html` — step-by-step instructions (and the copyable
  script) for the manual export-and-upload path, linked from `index.html`'s
  "How do I get my userid?" section.
- `sample-lionheart-data.json` — dummy session data you can upload into the
  app to test the upload flow without needing your own F45 account.
- `export-lionheart.js` — a standalone Node script that exports your own
  Lionheart session history to a JSON file you can upload instead. Requires
  Node 18+, no dependencies. Usage:
  ```
  node export-lionheart.js YOUR_USER_ID
  ```
- `cloudflare-worker/` — the Cloudflare Worker that `index.html` talks to for
  the "Fetch your session data directly from Lionheart" option (it proxies
  the Lionheart API so the browser can call it, and gates access with an
  access token). See its [README](cloudflare-worker/README.md) if you want
  to run your own instead of the one baked into `index.html`.

## Running it

Just open `index.html` in any browser, or enable **GitHub Pages** for this
repo (Settings → Pages → Source: `main` branch, `/` root) to get a public URL.

## Getting your own data

F45's Lionheart API is undocumented, so either option below starts the same
way: finding your personal `user_id`. There's no public way to look it up,
but it shows up in your phone's own logs when you open the F45 app:

- **Android** — connect via USB with [adb](https://developer.android.com/tools/adb)
  installed, run `adb logcat | grep externalId`, then open the F45 app and
  look for a line like `login(externalId: 12345678, jwtBearerToken: null)`.
  That number is your `user_id`.
- **iPhone** — same idea via Xcode's Window → Devices and Simulators, viewing
  your device's console log while opening the app and searching for
  `externalId`.
- **Alternatively**, intercept your phone's network traffic (e.g. with
  [mitmproxy](https://mitmproxy.org) or [HTTP Toolkit](https://httptoolkit.com))
  while opening a class result, and read `user_id` out of the request URL to
  `api.lionheart.f45.com`.

From there, pick one:

- **Fetch directly** — use the "Fetch your session data directly from
  Lionheart" section in the app: enter the access token you were given, plus
  your `user_id`, and it loads your history straight in, no download/upload
  step. (If you don't have a token, ask whoever shared this dashboard with
  you, or deploy your own Worker — see
  [cloudflare-worker/README.md](cloudflare-worker/README.md) — and update the
  `WORKER_URL` constant near the top of `index.html`'s script to point at
  it.)
- **Export and upload** — see [manual-export.html](manual-export.html) (also
  linked from the app's "How do I get my userid?" section) for the
  step-by-step script instructions, then upload the resulting file into the
  app. No setup beyond Node.js.
