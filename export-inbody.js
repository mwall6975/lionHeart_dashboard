#!/usr/bin/env node
/**
 * Exports your InBody scan history to a JSON file.
 * Requires Node 18+ (uses built-in fetch). No dependencies.
 *
 * Usage:
 *   node export-inbody.js [output_file]
 *
 * Example:
 *   node export-inbody.js my-inbody-data.json
 *
 * Credentials:
 *   You'll be prompted for your InBody login ID (the phone number used at
 *   registration, digits only - not your email) and password, the same ones
 *   you use in the InBody mobile app. The password prompt is hidden (not
 *   echoed to the terminal). Nothing is sent anywhere except InBody's own
 *   servers - this script talks directly to them from your machine.
 *
 *   For non-interactive use, set INBODY_LOGIN_ID, INBODY_LOGIN_PW, and
 *   optionally INBODY_COUNTRY_CODE (ISO country code, default "US") as
 *   environment variables instead and the prompts are skipped.
 *
 * How this works:
 *   InBody has no public API. This uses the same JSON REST endpoints the
 *   InBody Android app uses, reverse-engineered by the open-source
 *   inbody-api-mcp project: https://github.com/rwestergren/inbody-api-mcp
 *   (1) GetCountryInfoV2 resolves your regional API host, (2) login
 *   exchanges your ID/password for a short-lived token, (3) GetInBodyData
 *   (paginated) returns your scan history.
 */

const COMMON_URL = 'https://appapicommon.lookinbody.com';
const FULL_SYNC_DATETIME = '1990-01-01 11:11:11';
const APP_ENVELOPE = {
  Language: 'en',
  LogCode: '',
  AppType: 'Android',
  OSVersion: '14',
  PhoneModel: 'Google Pixel 6 Pro',
  RegAppType: 'InBody',
  AppVersion: '2.8.31_914',
};
const COMMON_HEADERS = {
  'User-Agent': 'okhttp/4.12.0',
  'Content-Type': 'application/json; charset=utf-8',
};
const PAGE_SIZE = 50;

function envelope(countryCode, extra) {
  return { ...APP_ENVELOPE, CountryCode: countryCode, ...extra };
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 14; Pixel 6 Pro Build/AP2A.240905.003.F1)',
    'Content-Type': 'application/json; charset=UTF-8',
    Accept: 'application/json',
  };
}

async function resolveApiBase(countryISO) {
  const payload = envelope('', { SyncDatetime: FULL_SYNC_DATETIME });
  const res = await fetch(`${COMMON_URL}/CommonAPI/GetCountryInfoV2`, {
    method: 'POST',
    headers: COMMON_HEADERS,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.IsSuccess) {
    throw new Error(`GetCountryInfoV2 failed: ${data.ErrorMsg || res.status}`);
  }
  const rows = data.Data || [];
  const row = rows.find(
    (r) => r.Type === 'API' && String(r.Code2).toUpperCase() === countryISO.toUpperCase()
  );
  if (!row) {
    throw new Error(`No API host found for country "${countryISO}". Use an ISO country code like "US".`);
  }
  return { apiBase: String(row.Domain).replace(/\/$/, ''), countryCode: String(row.Number) };
}

async function login(apiBase, countryCode, loginId, password) {
  const payload = envelope(countryCode, {
    AuthProvider: '',
    AuthProviderID: '',
    AuthToken: '',
    CustomKey: '',
    DeviceType: 'Pixel 6 Pro 14',
    LoginID: loginId,
    LoginPW: password,
    Type: 'Login',
    SyncDatetime: FULL_SYNC_DATETIME,
    SyncDatetimeBasalMedical: FULL_SYNC_DATETIME,
    SyncDatetimeCardiac: FULL_SYNC_DATETIME,
    SyncDatetimeExercise: FULL_SYNC_DATETIME,
    SyncDatetimeInBody: FULL_SYNC_DATETIME,
    SyncDatetimeNutrition: FULL_SYNC_DATETIME,
    SyncDatetimeSleep: FULL_SYNC_DATETIME,
    SyncType: 'Main;InBody;Exercise;Nutrition;Sleep;EasyTrainning;BasalMedical;',
  });
  const res = await fetch(`${apiBase}/V2/Main/GetLoginWithSyncDataPartV2`, {
    method: 'POST',
    headers: COMMON_HEADERS,
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.IsSuccess || !data.Token) {
    throw new Error(`Login failed: ${data.ErrorMsg || 'check your phone number and password'}`);
  }
  const uid = (data.Data || {}).UID;
  if (!uid) throw new Error('Login succeeded but no account UID was returned.');
  return { token: data.Token, uid };
}

async function fetchScanPage(apiBase, countryCode, token, uid, index) {
  const payload = envelope(countryCode, {
    uid,
    syncDatetime: FULL_SYNC_DATETIME,
    NumberPerData: String(PAGE_SIZE),
    CurrentIndex: String(index),
    Language: 'en-US',
    UseInBodyHomeDevice: 'false',
  });
  const res = await fetch(`${apiBase}/V2/InBody/GetInBodyData`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (data && data.IsSuccess === false) {
    throw new Error(`GetInBodyData failed: ${data.ErrorMsg}`);
  }
  return data.Data || [];
}

function promptVisible(question, defaultValue) {
  return new Promise((resolve) => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

function promptHidden(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('No interactive terminal available. Set INBODY_LOGIN_PW instead.'));
      return;
    }
    const stdin = process.stdin;
    process.stdout.write(question);
    let input = '';
    const onData = (chunk) => {
      const char = chunk.toString('utf8');
      if (char === '\n' || char === '\r') {
        cleanup();
        process.stdout.write('\n');
        resolve(input);
      } else if (char === '\u0003') {
        cleanup();
        process.stdout.write('\n');
        process.exit(1);
      } else if (char === '\u007f' || char === '\b') {
        input = input.slice(0, -1);
      } else {
        input += char;
      }
    };
    function cleanup() {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
    }
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
  });
}

async function getCredentials() {
  let loginId = process.env.INBODY_LOGIN_ID;
  let password = process.env.INBODY_LOGIN_PW;
  let country = process.env.INBODY_COUNTRY_CODE;

  if (!loginId) {
    loginId = await promptVisible('InBody phone number (registration ID, digits only): ');
  }
  if (!country) {
    country = await promptVisible('Country code (ISO, default US): ', 'US');
  }
  if (!password) {
    password = await promptHidden('InBody password: ');
  }

  if (!loginId || !password) {
    throw new Error('Both a phone number and password are required.');
  }
  return { loginId, password, country: country || 'US' };
}

async function main() {
  const outFile = process.argv[2] || 'inbody-export.json';

  const { loginId, password, country } = await getCredentials();

  console.log(`Resolving API host for ${country}...`);
  const { apiBase, countryCode } = await resolveApiBase(country);

  console.log('Logging in...');
  const { token, uid } = await login(apiBase, countryCode, loginId, password);

  console.log('Fetching your InBody scan history...');
  const all = [];
  let index = 0;
  while (true) {
    const page = await fetchScanPage(apiBase, countryCode, token, uid, index);
    if (page.length === 0) break;
    all.push(...page);
    console.log(`  fetched ${all.length} scans so far...`);
    index += page.length;
    await new Promise((r) => setTimeout(r, 250)); // be polite
  }

  const fs = await import('fs');
  fs.writeFileSync(outFile, JSON.stringify(all, null, 2));
  console.log(`\nDone. ${all.length} scans saved to ${outFile}`);
  console.log('Upload this file into the Lionheart Dashboard\'s Body Composition tab.');
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
