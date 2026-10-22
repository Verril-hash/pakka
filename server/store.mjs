// The whole app state lives in one in-memory `db`; everything else talks to `db` and `save()`.
// Locally it is persisted to data/db.json. On Cloud Run (STORE=firestore) it is loaded from Firestore at startup
// and written back after changes. Cloud Run runs a single instance, so memory stays the source of truth.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { app } from './firebase.mjs';

const DB_PATH = new URL('../data/db.json', import.meta.url);
const SEED_PATH = new URL('../data/listings.seed.json', import.meta.url);
const DAY = 24 * 60 * 60 * 1000;
const FIRESTORE = process.env.STORE === 'firestore';
// Loaded only when used: the Firestore client is heavy and slows local startup.
const fsdb = FIRESTORE ? (await import('firebase-admin/firestore')).getFirestore(app) : null;
const firestore = () => fsdb;
const MAX_EVENTS = 1000;

function resolveEnv(value) {
  if (typeof value !== 'string' || !value.startsWith('env:')) return value;
  const resolved = process.env[value.slice(4)];
  if (!resolved) console.warn(`[store] ${value} is not set — that owner can't be called`);
  return resolved ?? null;
}

function seed() {
  const listings = JSON.parse(readFileSync(SEED_PATH, 'utf8')).map(({ lastConfirmedDaysAgo, ...l }) => ({
    ...l,
    ownerPhone: resolveEnv(l.ownerPhone),
    status: 'available',
    isBroker: false,
    verifiedBy: 'Pakka team',
    verifiedAt: new Date(Date.now() - lastConfirmedDaysAgo * DAY).toISOString(),
    lastConfirmedAt: new Date(Date.now() - lastConfirmedDaysAgo * DAY).toISOString(),
    lastCallAt: null,
    notes: [],
    history: [],
  }));
  return { listings, sessions: [], visits: [], doNotCall: [], events: [], users: [], authSessions: {}, listingRequests: [] };
}

// ── Firestore persistence: collection "state", one or more chunk docs per top-level key ──
// Values are stored as JSON text in chunks under Firestore's 1 MiB document limit.

const CHUNK = 800_000;
const written = new Map(); // key → { json, chunks } last persisted

async function loadRemote() {
  const snap = await firestore().collection('state').get();
  if (snap.empty) return null;
  const parts = {};
  for (const doc of snap.docs) {
    const { key, i, n, json } = doc.data();
    (parts[key] ??= { n, chunks: [] }).chunks[i] = json;
  }
  const out = {};
  for (const [key, { n, chunks }] of Object.entries(parts)) {
    const json = chunks.slice(0, n).join('');
    out[key] = JSON.parse(json);
    written.set(key, { json, chunks: n });
  }
  return out;
}

async function flushRemote() {
  const batch = firestore().batch();
  let changes = 0;
  for (const [key, value] of Object.entries(db)) {
    const json = JSON.stringify(value);
    const prev = written.get(key);
    if (prev?.json === json) continue;
    const n = Math.max(1, Math.ceil(json.length / CHUNK));
    for (let i = 0; i < n; i++) {
      batch.set(firestore().collection('state').doc(`${key}__${i}`), { key, i, n, json: json.slice(i * CHUNK, (i + 1) * CHUNK) });
    }
    for (let i = n; i < (prev?.chunks ?? 0); i++) batch.delete(firestore().collection('state').doc(`${key}__${i}`));
    written.set(key, { json, chunks: n });
    changes++;
  }
  if (changes) await batch.commit();
}

let timer = null;
let pending = Promise.resolve();
/** Write now (Firestore mode). Safe to call any time; writes are serialised. */
export function flush() {
  clearTimeout(timer);
  timer = null;
  pending = pending.then(flushRemote).catch((err) => console.error('[store] Firestore write failed:', err.message));
  return pending;
}

const fromFile = () => (existsSync(DB_PATH) ? JSON.parse(readFileSync(DB_PATH, 'utf8')) : null);
// One-time move to Firestore: run locally with STORE=firestore SEED_FROM_FILE=1 and an empty Firestore takes data/db.json.
const loaded = FIRESTORE ? (await loadRemote()) ?? (process.env.SEED_FROM_FILE ? fromFile() : null) : fromFile();
export const db = loaded ?? seed();
db.authSessions ??= {};
db.users ??= [];
db.listingRequests ??= [];
if (FIRESTORE) console.log(`[store] Firestore: ${loaded ? 'loaded' : 'seeded'} — ${db.listings.length} listings, ${db.users.length} accounts`);

/** Back to the seed listings, in place, so every module keeps the same `db` reference. */
export function resetDb() {
  const fresh = seed();
  const { users = [], authSessions = {} } = db; // accounts are real people: a demo reset never deletes them
  for (const key of Object.keys(db)) delete db[key];
  Object.assign(db, fresh, { users, authSessions });
  save();
}

export function save() {
  if (!FIRESTORE) return writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  timer ??= setTimeout(flush, 400);
}

/** Append to the activity feed that Mission Control will show. */
export function logEvent(type, text, extra = {}) {
  const event = { at: new Date().toISOString(), type, text, ...extra };
  db.events.push(event);
  if (db.events.length > MAX_EVENTS) db.events.splice(0, db.events.length - MAX_EVENTS);
  console.log(`[${type}] ${text}`);
  save();
  return event;
}

export const findListing = (id) => db.listings.find((l) => l.id === id?.trim());

// Cloud Run sends SIGTERM before stopping an instance: get the last changes out first.
if (FIRESTORE) process.once('SIGTERM', () => flush().finally(() => process.exit(0)));

save();
