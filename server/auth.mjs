// Sign-in for tenants, owners and the team.
//
// The browser signs in with Firebase (Google or phone + SMS code) and sends us the Firebase ID token.
// We verify it with Firebase Admin, require a verified phone number (Pakka works by calling people,
// and owners are matched to their flats by number), then issue our own httpOnly session cookie.

import { createHash, randomBytes } from 'node:crypto';
import { verifyIdToken } from './firebase.mjs';
import { db, save, logEvent } from './store.mjs';
import { normalizePhone } from './util.mjs';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE = 'pakka_session';
const ROLES = ['tenant', 'owner', 'team'];

// Sessions are kept in the store (so they survive Cloud Run restarts), keyed by a hash of the token:
// the database never holds a usable cookie value.
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const sessions = {
  get: (token) => db.authSessions[hashToken(token)],
  set(token, session) {
    const now = Date.now();
    for (const [k, s] of Object.entries(db.authSessions)) if (s.exp < now) delete db.authSessions[k];
    db.authSessions[hashToken(token)] = session;
    save();
  },
  delete(token) {
    delete db.authSessions[hashToken(token)];
    save();
  },
};

export const isOwner = (phone) => db.listings.some((l) => l.ownerPhone === phone);

/** Pakka team members (console access): comma-separated numbers in TEAM_PHONES. */
export const isTeam = (phone) => (process.env.TEAM_PHONES ?? '').split(',').map((p) => normalizePhone(p.trim())).includes(phone);

db.users ??= [];
export const findUser = (uid) => db.users.find((u) => u.uid === uid);

/** True when the person has filled in the profile this role needs. */
export function profileComplete(user, role) {
  if (role === 'team') return true;
  const p = user?.profiles?.[role];
  return Boolean(p?.fullName && p?.email && p?.consentCalls && (role !== 'owner' || p.consentTerms));
}

/**
 * Verify a Firebase ID token and start a session for `role`.
 * Returns { needsPhone } when the account has no verified phone yet (e.g. a fresh Google sign-in).
 */
export async function signInWithFirebase({ idToken, role }) {
  if (!ROLES.includes(role)) return { error: 'Choose tenant or owner.' };

  let claims;
  try {
    claims = await verifyIdToken(idToken);
  } catch {
    return { error: 'Your sign-in could not be verified. Please try again.' };
  }

  const phone = normalizePhone(claims.phone_number);
  if (!phone) return { needsPhone: true };
  if (!/^\+91[6-9]\d{9}$/.test(phone)) return { error: 'Pakka currently supports Indian mobile numbers only.' };
  if (role === 'owner' && !isOwner(phone)) return { error: "We don't have a flat registered to this number yet. The Pakka team adds flats after meeting the owner." };
  if (role === 'team' && !isTeam(phone)) return { error: 'This account is not on the Pakka team.' };

  // Upsert the account: one per Firebase uid, keyed to the verified phone.
  let user = findUser(claims.uid);
  if (!user) {
    user = { uid: claims.uid, phone, email: claims.email ?? null, googleName: claims.name ?? null, createdAt: new Date().toISOString(), profiles: {} };
    db.users.push(user);
    logEvent('account_created', `New ${role} account (${claims.firebase?.sign_in_provider ?? 'unknown'} sign-in)`);
  }
  user.phone = phone;
  if (claims.email) user.email = claims.email;
  user.lastSignInAt = new Date().toISOString();
  save();

  const token = randomBytes(24).toString('base64url');
  sessions.set(token, { uid: user.uid, role, phone, exp: Date.now() + SESSION_TTL_MS });
  return { ok: true, token, role, needsProfile: !profileComplete(user, role) };
}

const LANGS = ['en', 'hi', 'kn', 'ta'];
const clean = (v, max = 80) => String(v ?? '').trim().slice(0, max);

/** Save the role's profile for the signed-in user. Validates every field. */
export function saveProfile(session, body) {
  const user = findUser(session.uid);
  if (!user) return { error: 'Please sign in again.' };
  const fullName = clean(body.fullName, 60);
  const email = clean(body.email, 120).toLowerCase();
  if (fullName.length < 2) return { error: 'Please enter your full name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: 'Please enter a valid email.' };
  if (!body.consentCalls) return { error: 'Please agree to receive calls from Pakka.' };

  const profile = {
    fullName,
    email,
    language: LANGS.includes(body.language) ? body.language : 'en',
    consentCalls: true,
    updatedAt: new Date().toISOString(),
  };
  if (session.role === 'tenant') {
    profile.moveIn = clean(body.moveIn, 30);
    profile.budget = Number.isFinite(Number(body.budget)) && Number(body.budget) > 0 ? Math.round(Number(body.budget)) : null;
    profile.household = ['family', 'bachelors', 'couple', 'single'].includes(body.household) ? body.household : null;
  }
  if (session.role === 'owner') {
    if (!body.consentTerms) return { error: 'Please agree to the owner terms.' };
    profile.consentTerms = true;
  }
  user.profiles = { ...user.profiles, [session.role]: profile };
  save();
  return { ok: true };
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
