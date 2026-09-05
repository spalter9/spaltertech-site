// Shared helpers for the Spalter Rights Portal Pages Functions.
// No external deps — everything here runs on the Workers runtime's built-in crypto.subtle.

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}

export function uid() {
  return crypto.randomUUID();
}

function b64url(bytes) {
  let bin = '';
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

// ---- Password hashing (PBKDF2-SHA256, 100k iterations) ----

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `${b64url(salt.buffer)}.${b64url(bits)}`;
}

export async function verifyPassword(password, stored) {
  const [saltB64, hashB64] = String(stored || '').split('.');
  if (!saltB64 || !hashB64) return false;
  const salt = new Uint8Array(unb64url(saltB64));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return b64url(bits) === hashB64;
}

export function randomTempPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return b64url(bytes.buffer).replace(/[-_]/g, 'x');
}

// ---- Signed session cookie (HMAC-SHA256), stateless ----

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(env, payload) {
  const key = await hmacKey(env.PORTAL_SESSION_SECRET);
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return `${body}.${sig}`;
}

export async function verifySession(env, token) {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const key = await hmacKey(env.PORTAL_SESSION_SECRET);
  const ok = await crypto.subtle.verify('HMAC', key, new Uint8Array(unb64url(sig)), new TextEncoder().encode(body));
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(unb64url(body)));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  const maxAge = 60 * 60 * 24 * 30;
  return `sp_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return 'sp_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

// ---- Auth guards ----

export async function requireWriter(request, env) {
  const token = readCookie(request, 'sp_session');
  const payload = await verifySession(env, token);
  if (!payload) return null;
  const row = await env.DB.prepare('SELECT * FROM writers WHERE id = ?').bind(payload.uid).first();
  return row || null;
}

export async function requireStaff(request, env) {
  const row = await requireWriter(request, env);
  if (!row || row.role !== 'staff') return null;
  return row;
}
