/**
 * Cloudflare Worker: proxies F45's undocumented Lionheart API so the
 * Lionheart Dashboard web app can fetch a user's session history directly
 * from the browser. api.lionheart.f45.com sends no CORS headers, so a page
 * can't call it directly - this worker calls it server-side (no CORS issue
 * there) and re-serves the result with CORS headers of its own.
 *
 * Endpoint: GET /?user_id=<id>, header X-Access-Token: <your token>
 *
 * Note on auth: the Lionheart API itself accepts any user_id with no token,
 * so without ACCESS_TOKEN this proxy would be exactly as open as the API it
 * forwards to - anyone who knows or guesses a user_id could pull that
 * person's data through it. ACCESS_TOKEN closes that: set it with
 * `wrangler secret put ACCESS_TOKEN` (never in wrangler.toml, which is
 * committed to git) and every request must send it back in the
 * X-Access-Token header. Share your deployed URL + token only with people
 * you want fetching their own data through your worker - anyone you don't
 * trust with that should deploy their own copy instead.
 */

const MAX_PAGES = 50; // safety cap: 50 * 10/page = 500 sessions

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Access-Token',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed.' }, 405, corsHeaders);
    }

    if (!env.ACCESS_TOKEN) {
      return json({ error: 'Worker has no ACCESS_TOKEN configured. Run: wrangler secret put ACCESS_TOKEN' }, 500, corsHeaders);
    }
    if (request.headers.get('X-Access-Token') !== env.ACCESS_TOKEN) {
      return json({ error: 'Missing or invalid access token.' }, 401, corsHeaders);
    }

    const userId = new URL(request.url).searchParams.get('user_id');
    if (!userId || !/^\d+$/.test(userId)) {
      return json({ error: 'Missing or invalid user_id query parameter.' }, 400, corsHeaders);
    }

    try {
      const sessions = await fetchAllSessions(userId);
      return json(sessions, 200, corsHeaders);
    } catch (err) {
      return json({ error: err.message }, 502, corsHeaders);
    }
  },
};

async function fetchAllSessions(userId) {
  const all = [];
  let skip = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = `https://api.lionheart.f45.com/v3/profile/sessions?user_id=${encodeURIComponent(userId)}&skip=${skip}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`Lionheart API returned ${res.status}`);
    }
    const body = await res.json();
    const batch = body.data || [];
    if (batch.length === 0) break;
    all.push(...batch);
    skip += batch.length;
  }
  return all;
}

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}
