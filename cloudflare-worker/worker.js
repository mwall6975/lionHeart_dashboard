/**
 * Cloudflare Worker: proxies F45's undocumented Lionheart API so the
 * Lionheart Dashboard web app can fetch a user's session history directly
 * from the browser. api.lionheart.f45.com sends no CORS headers, so a page
 * can't call it directly - this worker calls it server-side (no CORS issue
 * there) and re-serves the result with CORS headers of its own.
 *
 * Endpoint: GET /?user_id=<id>
 *
 * Note on auth: the Lionheart API itself accepts any user_id with no token,
 * so this proxy is exactly as open as the API it forwards to. Set
 * ALLOWED_ORIGIN (in wrangler.toml or a Worker environment variable) to your
 * dashboard's origin to stop unrelated sites from using your deployed worker
 * as a relay; it does not add authentication that the upstream API lacks.
 */

const MAX_PAGES = 50; // safety cap: 50 * 10/page = 500 sessions

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed.' }, 405, corsHeaders);
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
