// Front-door checks for the browser API: App Check (is this our real website?) and per-IP rate limits.
// Bolna's /tools and /webhooks have their own secret token and are not covered here.

import { getAppCheck } from 'firebase-admin/app-check';
import { app } from './firebase.mjs';

// off | monitor (log what would be blocked) | enforce
const MODE = process.env.APPCHECK ?? 'monitor';

/** Public listings and "who am I" stay open so the public site works without Firebase. */
export const needsAppCheck = (path) => path.startsWith('/api/') && !path.startsWith('/api/public/') && path !== '/api/me';

/** True if the request may continue. In monitor mode failures are only logged. */
export async function appCheckOk(req, path) {
  if (MODE === 'off' || !needsAppCheck(path)) return true;
  const token = req.headers['x-firebase-appcheck'];
  let reason = null;
  if (!token) reason = 'missing token';
  else {
    try {
      await getAppCheck(app).verifyToken(String(token));
    } catch (err) {
      reason = `invalid token (${err.code ?? err.message})`;
    }
  }
  if (!reason) return true;
  console.warn(`[appcheck] ${MODE === 'enforce' ? 'blocked' : 'would block'} ${req.method} ${path} from ${clientIp(req)}: ${reason}`);
  return MODE !== 'enforce';
}

// ── Rate limits ──
// Google's front end appends the connecting address to X-Forwarded-For, so the last entry is the real one;
// anything earlier can be written by the client. (Through the Vercel proxy, that is Vercel's address.)
export function clientIp(req) {
  const hops = String(req.headers['x-forwarded-for'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return hops.at(-1) || req.socket.remoteAddress || 'unknown';
}

const RULES = [
  { name: 'auth', test: (p) => p.startsWith('/api/auth/'), limit: 20, windowMs: 60_000 },
  { name: 'public', test: (p) => p.startsWith('/api/public/'), limit: 90, windowMs: 60_000 },
  { name: 'api', test: (p) => p.startsWith('/api/'), limit: 240, windowMs: 60_000 },
];
const hits = new Map(); // `${rule}:${ip}` → { count, resetAt }

/** Seconds to wait if this request is over the limit, else 0. */
export function rateLimited(req, path) {
  const rule = RULES.find((r) => r.test(path));
  if (!rule) return 0;
  const key = `${rule.name}:${clientIp(req)}`;
  const now = Date.now();
  let h = hits.get(key);
  if (!h || now >= h.resetAt) hits.set(key, (h = { count: 0, resetAt: now + rule.windowMs }));
  h.count++;
  if (h.count === rule.limit + 1) console.warn(`[ratelimit] ${key} over ${rule.limit}/min`);
  return h.count > rule.limit ? Math.ceil((h.resetAt - now) / 1000) : 0;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, h] of hits) if (now >= h.resetAt) hits.delete(k);
}, 5 * 60_000).unref();
