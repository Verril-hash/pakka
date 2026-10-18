// Tiny JSON-file store. Firestore replaces this later; everything else talks to `db` and `save()`.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const DB_PATH = new URL('../data/db.json', import.meta.url);
const SEED_PATH = new URL('../data/listings.seed.json', import.meta.url);
const DAY = 24 * 60 * 60 * 1000;

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
    verifiedBy: 'Verril',
    verifiedAt: new Date(Date.now() - lastConfirmedDaysAgo * DAY).toISOString(),
    lastConfirmedAt: new Date(Date.now() - lastConfirmedDaysAgo * DAY).toISOString(),
    lastCallAt: null,
    notes: [],
    history: [],
  }));
  return { listings, sessions: [], visits: [], doNotCall: [], events: [] };
}

export const db = existsSync(DB_PATH) ? JSON.parse(readFileSync(DB_PATH, 'utf8')) : seed();

/** Back to the seed listings, in place, so every module keeps the same `db` reference. */
export function resetDb() {
  const fresh = seed();
  for (const key of Object.keys(db)) delete db[key];
  Object.assign(db, fresh);
  save();
}

export function save() {
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/** Append to the activity feed that Mission Control will show. */
export function logEvent(type, text, extra = {}) {
  const event = { at: new Date().toISOString(), type, text, ...extra };
  db.events.push(event);
  console.log(`[${type}] ${text}`);
  save();
  return event;
}

export const findListing = (id) => db.listings.find((l) => l.id === id?.trim());

save();
