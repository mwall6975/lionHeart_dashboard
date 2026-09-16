#!/usr/bin/env node
/**
 * Exports your full F45 Lionheart session history to a JSON file.
 * Requires Node 18+ (uses built-in fetch). No dependencies.
 *
 * Usage:
 *   node export-lionheart.js <user_id> [output_file]
 *
 * Example:
 *   node export-lionheart.js 12429103 my-lionheart-data.json
 *
 * Finding your user_id:
 *   There is no public way to look this up, but it shows up in your phone's
 *   own logs when you open the F45 app.
 *     Android: connect via USB with adb installed, run
 *       `adb logcat | grep externalId`, then open the F45 app - look for a
 *       line like `login(externalId: 12429103, jwtBearerToken: null)`.
 *       That number is your user_id.
 *     iPhone: same idea via Xcode's Window > Devices and Simulators, viewing
 *       your device's console log while opening the app and searching for
 *       `externalId`.
 *   Alternatively, intercept your phone's network traffic (e.g. with
 *   mitmproxy or HTTP Toolkit) while opening a class result in the F45 app,
 *   and read `user_id` out of the request URL to api.lionheart.f45.com. See:
 *   https://jamesiv.es/blog/f45-broke-my-beloved-strava-integration/
 */

const userId = process.argv[2];
const outFile = process.argv[3] || 'lionheart-export.json';

if (!userId) {
  console.error('Usage: node export-lionheart.js <user_id> [output_file]');
  process.exit(1);
}

async function fetchPage(skip) {
  const url = `https://api.lionheart.f45.com/v3/profile/sessions?user_id=${userId}&skip=${skip}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Lionheart API returned ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.data || [];
}

async function main() {
  console.log(`Fetching Lionheart history for user_id=${userId}...`);
  const all = [];
  let skip = 0;
  while (true) {
    const page = await fetchPage(skip);
    if (page.length === 0) break;
    all.push(...page);
    console.log(`  fetched ${all.length} sessions so far...`);
    skip += page.length;
    await new Promise(r => setTimeout(r, 250)); // be polite
  }

  const fs = await import('fs');
  fs.writeFileSync(outFile, JSON.stringify(all, null, 2));
  console.log(`\nDone. ${all.length} sessions saved to ${outFile}`);
  console.log('Upload this file into the F45 Lionheart Dashboard web app.');
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
