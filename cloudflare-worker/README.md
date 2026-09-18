# Lionheart proxy (Cloudflare Worker)

F45's Lionheart API (`api.lionheart.f45.com`) sends no CORS headers, so the
dashboard's web page can't call it directly from the browser. This Worker
calls it server-side instead and re-serves the result with CORS headers, so
the "fetch directly from your F45 account" option in the dashboard has
something to talk to.

It takes your `user_id`, pages through `/v3/profile/sessions` the same way
`export-lionheart.js` does, and returns the combined session array as JSON.

**Auth note:** the Lionheart API itself accepts any `user_id` with no token —
without a token check of its own, this worker would be exactly as open,
letting anyone who knows or guesses a `user_id` (not necessarily theirs) pull
that person's data through it. That's why every request also needs an
`ACCESS_TOKEN` you set yourself (below); the worker rejects anything without
it. If you share your deployed URL, share the token only with people you
want fetching their own data through your worker — everyone else should
deploy their own copy instead (that's the point of this being a repo folder
rather than one shared instance).

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
5. Set your access token — pick any random string (e.g.
   `openssl rand -hex 16`), then:
   ```bash
   wrangler secret put ACCESS_TOKEN
   ```
   and paste it in when prompted. This is stored on Cloudflare, not in any
   file, so it's safe from ending up in git.
6. (Recommended) Edit `wrangler.toml` and set `ALLOWED_ORIGIN` to your
   dashboard's URL (e.g. `https://mwall6975.github.io`) instead of `"*"`,
   then run `wrangler deploy` again.
7. In the dashboard's "fetch directly from your F45 account" section, enter
   your Worker URL, the same access token from step 5, and your `user_id`.

## Test it directly

```bash
curl -H "X-Access-Token: YOUR_TOKEN" \
  "https://lionheart-proxy.YOUR-SUBDOMAIN.workers.dev/?user_id=YOUR_USER_ID"
```

Should return a JSON array of your Lionheart sessions. Omitting or getting
the header wrong returns a 401.

## Rotating or revoking the token

Run `wrangler secret put ACCESS_TOKEN` again with a new value — the old one
stops working immediately. Do this if you ever think the token leaked.
