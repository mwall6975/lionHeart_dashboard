# Lionheart proxy (Cloudflare Worker)

F45's Lionheart API (`api.lionheart.f45.com`) sends no CORS headers, so the
dashboard's web page can't call it directly from the browser. This Worker
calls it server-side instead and re-serves the result with CORS headers, so
the "fetch directly from your F45 account" option in the dashboard has
something to talk to.

It takes your `user_id`, pages through `/v3/profile/sessions` the same way
`export-lionheart.js` does, and returns the combined session array as JSON.

**Auth note:** the Lionheart API accepts any `user_id` with no token, so this
proxy is exactly as open as the API it forwards to — anyone with your
worker's URL and *a* user_id (not necessarily yours) can pull that user's
session history through it. Setting `ALLOWED_ORIGIN` (below) stops other
websites from using your worker as a relay from a visitor's browser, but it
does not add authentication the upstream API doesn't have. Treat the deployed
URL as something you don't need to publicize, not as a secret that fully
protects the data behind it.

## Deploy it (a few minutes, free tier)

1. Install the [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) if you don't have it:
   ```bash
   npm install -g wrangler
   ```
2. Log in to your Cloudflare account (creates a free one if you don't have it):
   ```bash
   wrangler login
   ```
3. From this `cloudflare-worker/` folder, deploy:
   ```bash
   wrangler deploy
   ```
4. Wrangler prints your Worker's URL, e.g.
   `https://lionheart-proxy.YOUR-SUBDOMAIN.workers.dev`.
5. (Recommended) Edit `wrangler.toml` and set `ALLOWED_ORIGIN` to your
   dashboard's URL (e.g. `https://mwall6975.github.io`) instead of `"*"`,
   then run `wrangler deploy` again.
6. Paste the Worker URL and your `user_id` into the dashboard's "fetch
   directly from your F45 account" section.

## Test it directly

```bash
curl "https://lionheart-proxy.YOUR-SUBDOMAIN.workers.dev/?user_id=YOUR_USER_ID"
```

Should return a JSON array of your Lionheart sessions.
