import 'server-only';
import { createSign } from 'node:crypto';

// Google Sheets in sola lettura con account di servizio. Niente librerie: JWT RS256 firmato con node:crypto.
// Il foglio NON viene mai pubblicato sul web: si condivide con l'email dell'account di servizio come Visualizzatore.

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
let token = null; // { value, exp }

export const sheetsConfigured = () =>
  Boolean(process.env.GOOGLE_SHEETS_FINANCE_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

const b64url = (b) => Buffer.from(b).toString('base64url');

// La chiave privata contiene a-capo: nei pannelli diventano spesso "\n" letterali → li ripristiniamo.
const privateKey = () => process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n');

async function accessToken() {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const now = Math.floor(Date.now() / 1000);
  const claim = { iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claim))}`;
  let jwt;
  try {
    jwt = `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(privateKey()).toString('base64url')}`;
  } catch {
    throw new Error('chiave dell\'account di servizio non valida (controlla gli a-capo)');
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15000),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!res.ok) throw new Error(`autenticazione Google fallita (${res.status})`);
  const d = await res.json();
  token = { value: d.access_token, exp: Date.now() + d.expires_in * 1000 };
  return token.value;
}

async function gget(path) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEETS_FINANCE_ID}${path}`, {
    cache: 'no-store', signal: AbortSignal.timeout(20000),
    headers: { authorization: `Bearer ${await accessToken()}` },
  });
  if (res.status === 403 || res.status === 404) throw new Error('foglio non accessibile: condividilo in sola lettura con l\'account di servizio');
  if (!res.ok) throw new Error(`Google Sheets ${res.status}`);
  return res.json();
}

// → [{ name, rows: string[][] }]
export async function readSheets() {
  const meta = await gget('?fields=sheets.properties.title');
  const titles = meta.sheets.map((s) => s.properties.title);
  const qs = titles.map((t) => `ranges=${encodeURIComponent(t)}`).join('&');
  const data = await gget(`/values:batchGet?${qs}&valueRenderOption=FORMATTED_VALUE`);
  return data.valueRanges.map((v, i) => ({ name: titles[i], rows: v.values || [] }));
}
