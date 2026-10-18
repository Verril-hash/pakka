// Phone + one-time-code sign-in for owners and tenants.
//
// Codes aren't delivered yet (no SMS/WhatsApp sender): they're printed in the server log, and
// returned in the response only for requests made on this machine. Swap `deliver()` for a real
// sender later; nothing else changes.

import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { db } from './store.mjs';
import { normalizePhone } from './util.mjs';

const CODE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TRIES = 5;
const COOKIE = 'pakka_session';

const pending = new Map(); // phone → { code, role, exp, tries }
const sessions = new Map(); // token → { role, phone, exp }

export const isOwner = (phone) => db.listings.some((l) => l.ownerPhone === phone);

/** Pakka team members (console access): comma-separated numbers in TEAM_PHONES. */
export const isTeam = (phone) => (process.env.TEAM_PHONES ?? '').split(',').map((p) => normalizePhone(p.trim())).includes(phone);

function deliver(phone, code) {
  console.log(`[auth] one-time code for ${phone}: ${code}`);
}

export function startSignIn({ phone, role }, { local }) {
  const p = normalizePhone(phone);
  if (!/^\+91[6-9]\d{9}$/.test(p ?? '')) return { error: 'Enter a 10-digit Indian mobile number.' };
  if (!['owner', 'tenant', 'team'].includes(role)) return { error: 'Choose tenant or owner.' };
  if (role === 'team' && !isTeam(p)) return { error: 'This number is not on the Pakka team.' };
  if (role === 'owner' && !isOwner(p)) return { error: "We don't have a flat registered to this number. Pakka adds flats after verifying them in person." };

  const prev = pending.get(p);
  if (prev && prev.exp - CODE_TTL_MS + 30_000 > Date.now()) return { error: 'A code was just sent. Wait 30 seconds before asking again.' };

  const code = String(randomInt(100000, 1000000));
  pending.set(p, { code, role, exp: Date.now() + CODE_TTL_MS, tries: 0 });
  deliver(p, code);
  return { ok: true, phone: p, ...(local ? { devCode: code } : {}) };
}

export function verifySignIn({ phone, code }) {
  const p = normalizePhone(phone);
  const entry = pending.get(p);
  if (!entry || entry.exp < Date.now()) return { error: 'That code has expired. Ask for a new one.' };
  entry.tries += 1;
  const a = Buffer.from(String(code ?? '').trim().padEnd(6, ' ').slice(0, 6));
  const b = Buffer.from(entry.code);
  if (!timingSafeEqual(a, b)) {
    if (entry.tries >= MAX_TRIES) pending.delete(p);
    return { error: entry.tries >= MAX_TRIES ? 'Too many tries. Ask for a new code.' : 'That code is not right.' };
  }
  pending.delete(p);
  const token = randomBytes(24).toString('base64url');
  sessions.set(token, { role: entry.role, phone: p, exp: Date.now() + SESSION_TTL_MS });
  return { ok: true, token, role: entry.role };
}

function readCookie(req) {
  const m = (req.headers.cookie ?? '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m?.[1];
}

export function currentUser(req) {
  const token = readCookie(req);
  const s = token && sessions.get(token);
  if (!s) return null;
  if (s.exp < Date.now()) { sessions.delete(token); return null; }
  return s;
}

export function endSession(req) {
  const token = readCookie(req);
  if (token) sessions.delete(token);
}

export function sessionCookie(req, token, maxAgeSec = SESSION_TTL_MS / 1000) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || req.headers['cf-visitor']?.includes('https');
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? '; Secure' : ''}`;
}
