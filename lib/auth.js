// Cancello a password singola. Solo Web Crypto: gira nel proxy e nelle route handler.
export const COOKIE = 'pos_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 giorni

const enc = new TextEncoder();

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Confronto a tempo costante (a parità di lunghezza). Non esce prima al primo carattere diverso.
export function safeEqual(a, b) {
  const x = enc.encode(String(a ?? ''));
  const y = enc.encode(String(b ?? ''));
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export function authConfigured() {
  return Boolean(process.env.DASHBOARD_PASSWORD && process.env.AUTH_SECRET);
}

export async function makeSessionValue() {
  const exp = Date.now() + MAX_AGE * 1000;
  return `${exp}.${await hmac(process.env.AUTH_SECRET, String(exp))}`;
}

export async function verifySessionValue(value) {
  if (!value || !process.env.AUTH_SECRET) return false;
  const [exp, sig] = value.split('.');
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(process.env.AUTH_SECRET, exp));
}

export const cookieOptions = {
  httpOnly: true,
  // `secure` solo in produzione: su http://localhost alcuni browser scartano i cookie secure.
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: MAX_AGE,
};

export function hasApiSecret(request) {
  const secret = process.env.API_SECRET;
  const given = request.headers.get('x-api-secret');
  return Boolean(secret && given && safeEqual(given, secret));
}
