// Console + public JSON API. Console routes expose owner phones, so they're local-only until
// the console gets real auth; /api/public/* is safe to serve through the tunnel.

import { randomUUID } from 'node:crypto';
import { bolna } from '../lib/bolna.mjs';
import { db, save, logEvent, findListing } from './store.mjs';
import { requestRecheck, startTenantCall } from './checks.mjs';
import { isFresh, normalizePhone } from './util.mjs';
import { currentUser, findUser } from './auth.mjs';

const AGENTS = {
  check: { id: process.env.PAKKA_CHECK_AGENT_ID, name: 'Pakka Check', role: 'Calls owners to confirm listings' },
  line: { id: process.env.PAKKA_LINE_AGENT_ID, name: 'Pakka Line', role: 'Talks to tenants, books visits' },
};
const DAY = 24 * 60 * 60 * 1000;

// ── Calls (from Bolna, cached briefly) ────────────────────────────────────────

let callCache = { at: 0, calls: [] };

async function fetchExecutions(agentId) {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const res = await bolna('GET', `/v2/agent/${agentId}/executions?page_number=${page}&page_size=50`);
    all.push(...(res.data ?? []));
    if (!res.has_more) break;
  }
  return all;
}

function executionLinks() {
  const byExec = new Map();
  for (const s of db.sessions) {
    for (const c of s.checks) if (c.executionId) byExec.set(c.executionId, { listingId: c.listingId, sessionId: s.id });
    if (s.callbackExecutionId) byExec.set(s.callbackExecutionId, { sessionId: s.id });
  }
  for (const l of db.listings) for (const h of l.history) if (h.executionId) byExec.set(h.executionId, { listingId: l.id, ...byExec.get(h.executionId) });
  return byExec;
}

function normalizeCall(exec, agentKey, links) {
  const fields = exec.extracted_data?.['Listing Check'] ?? {};
  const pick = (k) => fields[k]?.objective ?? fields[k]?.subjective ?? null;
  const ctx = exec.context_details?.recipient_data ?? {};
  const tel = exec.telephony_data ?? {};
  return {
    id: exec.id,
    agent: agentKey,
    agentName: AGENTS[agentKey].name,
    status: exec.status,
    createdAt: exec.created_at,
    durationSec: Math.round(exec.conversation_duration ?? tel.duration ?? 0),
    costCents: exec.cost_breakdown?.total_cost_to_deduct ?? exec.total_cost ?? 0,
    to: exec.user_number ?? ctx.recipient_phone_number ?? null,
    language: exec.agent_context_details?.language ?? pick('language') ?? null,
    mode: agentKey === 'line' ? ctx.mode ?? 'intake' : 'owner-check',
    outcome: agentKey === 'check' ? pick('call_outcome') : ctx.mode === 'callback' ? 'callback' : 'intake',
    isBroker: pick('is_broker') === 'broker',
    hangup: tel.hangup_reason ?? null,
    hasRecording: Boolean(tel.recording_url),
    counterpart: agentKey === 'check' ? ctx.owner_name ?? null : ctx.tenant_name ?? null,
    ...links.get(exec.id),
  };
}

export async function listCalls({ fresh = false } = {}) {
  if (!fresh && Date.now() - callCache.at < 15_000) return callCache.calls;
  const links = executionLinks();
  const sets = await Promise.all(
    Object.entries(AGENTS).map(async ([key, a]) => (a.id ? (await fetchExecutions(a.id)).map((e) => normalizeCall(e, key, links)) : [])),
  );
  callCache = { at: Date.now(), calls: sets.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
  return callCache.calls;
}

async function getCall(id) {
  const exec = await bolna('GET', `/executions/${id}`);
  const agentKey = exec.agent_id === AGENTS.line.id ? 'line' : 'check';
  const fields = Object.fromEntries(
    Object.entries(exec.extracted_data?.['Listing Check'] ?? {}).map(([k, v]) => [k, { value: v.objective ?? v.subjective, confidence: v.confidence_label }]),
  );
  return { ...normalizeCall(exec, agentKey, executionLinks()), transcript: exec.transcript ?? '', fields, context: exec.context_details?.recipient_data ?? {} };
}

async function streamRecording(id, res) {
  const exec = await bolna('GET', `/executions/${id}`);
  const url = exec.telephony_data?.recording_url;
  if (!url) return false;
  const audio = await fetch(url, { headers: { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` } });
  if (!audio.ok) return false;
  res.writeHead(200, { 'Content-Type': audio.headers.get('content-type') ?? 'audio/mpeg', 'Cache-Control': 'private, max-age=3600' });
  res.end(Buffer.from(await audio.arrayBuffer()));
  return true;
}

// ── Overview ──────────────────────────────────────────────────────────────────

async function overview() {
  const calls = await listCalls();
  const ownerCalls = calls.filter((c) => c.agent === 'check');
  const L = db.listings;
  const since = (ms) => (c) => Date.now() - new Date(c.createdAt).getTime() < ms;

  const days = [...Array(14)].map((_, i) => {
    const d = new Date(Date.now() - (13 - i) * DAY);
    return d.toISOString().slice(0, 10);
  });
  const callsByDay = days.map((date) => {
    const today = calls.filter((c) => c.createdAt.startsWith(date));
    return {
      date,
      owner: today.filter((c) => c.agent === 'check').length,
      tenant: today.filter((c) => c.agent === 'line').length,
    };
  });

  const outcomes = {};
  for (const c of ownerCalls) outcomes[c.outcome ?? 'pending'] = (outcomes[c.outcome ?? 'pending'] ?? 0) + 1;

  const languages = {};
  for (const c of calls) if (c.language) languages[c.language] = (languages[c.language] ?? 0) + 1;

  const totalCost = calls.reduce((n, c) => n + (c.costCents || 0), 0);
  const totalSec = calls.reduce((n, c) => n + c.durationSec, 0);
  const completedOwner = ownerCalls.filter((c) => c.status === 'completed');

  return {
    kpis: {
      listings: L.length,
      live: L.filter((l) => l.status === 'available').length,
      fresh: L.filter((l) => l.status === 'available' && l.lastCallAt && isFresh(l.lastCallAt)).length,
      deadCaught: L.filter((l) => l.status === 'rented').length,
      brokers: L.filter((l) => l.status === 'broker_flagged').length,
      visits: db.visits.length,
      requests: db.sessions.filter((s) => s.kind !== 'recheck').length,
      calls: calls.length,
      calls7d: calls.filter(since(7 * DAY)).length,
      ownerCalls: ownerCalls.length,
      avgOwnerCallSec: completedOwner.length ? Math.round(completedOwner.reduce((n, c) => n + c.durationSec, 0) / completedOwner.length) : 0,
      totalCostCents: Math.round(totalCost * 100) / 100,
      costPerMinuteCents: totalSec ? Math.round((totalCost / (totalSec / 60)) * 100) / 100 : 0,
      pickupRate: ownerCalls.length ? Math.round((completedOwner.length / ownerCalls.length) * 100) : 0,
    },
    callsByDay,
    outcomes: Object.entries(outcomes).map(([outcome, count]) => ({ outcome, count })),
    languages: Object.entries(languages).map(([language, count]) => ({ language, count })),
    freshness: [
      { bucket: 'Today', count: L.filter((l) => l.status === 'available' && Date.now() - new Date(l.lastConfirmedAt) < DAY).length },
      { bucket: '1–2 days', count: L.filter((l) => l.status === 'available' && Date.now() - new Date(l.lastConfirmedAt) >= DAY && isFresh(l.lastConfirmedAt)).length },
      { bucket: '3–7 days', count: L.filter((l) => l.status === 'available' && !isFresh(l.lastConfirmedAt) && Date.now() - new Date(l.lastConfirmedAt) < 7 * DAY).length },
      { bucket: '7+ days', count: L.filter((l) => l.status === 'available' && Date.now() - new Date(l.lastConfirmedAt) >= 7 * DAY).length },
    ],
    events: db.events.slice(-12).reverse(),
  };
}

// ── Owners ────────────────────────────────────────────────────────────────────

function owners() {
  const byPhone = new Map();
  for (const l of db.listings) {
    const key = l.ownerPhone ?? `none-${l.ownerName}`;
    const o = byPhone.get(key) ?? { phone: l.ownerPhone, name: l.ownerName, language: l.ownerLanguage, listings: [], calls: 0, answered: 0, lastCallAt: null };
    o.listings.push({ id: l.id, area: l.area, bhk: l.bhk, status: l.status });
    for (const h of l.history) {
      o.calls++;
      if (h.outcome && h.outcome !== 'no_conversation') o.answered++;
      if (!o.lastCallAt || h.at > o.lastCallAt) o.lastCallAt = h.at;
    }
    byPhone.set(key, o);
  }
  return [...byPhone.values()].map((o) => ({ ...o, doNotCall: db.doNotCall.includes(o.phone), isBroker: db.listings.some((l) => l.ownerPhone === o.phone && l.isBroker) }));
}

// ── Listings ──────────────────────────────────────────────────────────────────

const LISTING_FIELDS = ['ownerName', 'ownerPhone', 'ownerLanguage', 'bhk', 'area', 'landmark', 'rent', 'deposit', 'furnishing', 'tenantPreference', 'houseRules', 'pets', 'parking', 'availableFrom', 'lat', 'lng'];

function addListing(body) {
  const missing = ['ownerName', 'ownerPhone', 'bhk', 'area', 'rent'].filter((k) => !body[k]);
  if (missing.length) return { error: `Missing: ${missing.join(', ')}` };
  const next = Math.max(100, ...db.listings.map((l) => parseInt(l.id.split('-')[1], 10))) + 1;
  const listing = {
    id: `PK-${next}`,
    ...Object.fromEntries(LISTING_FIELDS.map((k) => [k, body[k] ?? null])),
    ownerPhone: normalizePhone(body.ownerPhone),
    ownerLanguage: body.ownerLanguage || 'kn',
    bhk: Number(body.bhk),
    rent: Number(body.rent),
    deposit: Number(body.deposit) || null,
    lat: body.lat ? Number(body.lat) : null,
    lng: body.lng ? Number(body.lng) : null,
    landmark: body.landmark ?? '',
    houseRules: body.houseRules ?? '',
    pets: body.pets || 'unknown',
    visitSlots: body.visitSlot ? [body.visitSlot] : [],
    status: 'available',
    isBroker: false,
    verifiedBy: 'Pakka team',
    verifiedAt: new Date().toISOString(),
    lastConfirmedAt: new Date().toISOString(),
    lastCallAt: null,
    notes: body.notes ? [body.notes] : [],
    history: [],
  };
  db.listings.push(listing);
  // Created from an owner's "List another flat" request: close the request and point it at the listing.
  const request = body.requestId && db.listingRequests.find((r) => r.id === body.requestId);
  if (request) {
    Object.assign(request, { status: 'listed', listingId: listing.id, closedAt: new Date().toISOString() });
    // A new owner's first flat: listing it is the team's verification of the owner too.
    const owner = request.kind === 'first' && findUser(request.uid);
    if (owner) Object.assign(owner, { ownerStatus: 'approved', ownerDeclineReason: null });
  }
  logEvent('listing_added', `${listing.verifiedBy} verified ${listing.id}: ${listing.bhk} BHK in ${listing.area}`, { listingId: listing.id });
  return { listing };
}

function listingDetail(id) {
  const l = findListing(id);
  if (!l) return null;
  const requests = db.sessions.filter((s) => s.checks.some((c) => c.listingId === l.id)).map((s) => ({ id: s.id, kind: s.kind ?? 'tenant', tenantName: s.tenantName, createdAt: s.createdAt, state: s.state }));
  return { ...l, requests, visits: db.visits.filter((v) => v.listingId === l.id), doNotCall: db.doNotCall.includes(l.ownerPhone) };
}

// ── "Call me" for signed-in tenants: only ever calls the account's verified phone ─
// The public site plays a recorded call instead, so nobody can point Pakka at someone else's number.

const recentCallbacks = new Map(); // phone → timestamps today
const callbackLog = []; // timestamps, for the global hourly cap
const PER_PHONE_MS = 10 * 60 * 1000;
const PER_PHONE_PER_DAY = 3;
const MAX_PER_HOUR = 12;

/** `phone` must come from the signed-in session, never from the request body. */
export async function requestCallback({ name, phone, language }) {
  const to = normalizePhone(phone);
  if (!/^\+91[6-9]\d{9}$/.test(to ?? '')) return { error: 'Pakka can call Indian mobile numbers only.' };
  const now = Date.now();
  const mine = (recentCallbacks.get(to) ?? []).filter((t) => now - t < 24 * 60 * 60 * 1000);
  if (mine.length && now - mine.at(-1) < PER_PHONE_MS) return { error: 'Pakka just called you. Please wait a few minutes.' };
  if (mine.length >= PER_PHONE_PER_DAY) return { error: "That's today's calls. Pakka is still working on your search, and you can call again tomorrow." };
  while (callbackLog.length && now - callbackLog[0] > 60 * 60 * 1000) callbackLog.shift();
  if (callbackLog.length >= MAX_PER_HOUR) return { error: 'Pakka is busy right now. Please try again in a little while.' };

  recentCallbacks.set(to, [...mine, now]);
  callbackLog.push(now);
  const lang = ['en', 'hi', 'kn', 'ta'].includes(language) ? language : 'en';
  const tenantName = String(name ?? '').trim().slice(0, 40) || 'there';
  await startTenantCall({ mode: 'intake', phone: to, name: tenantName, lang });
  logEvent('web_callback', `${tenantName} asked for a call from the website`);
  return { status: 'calling', message: 'Pakka is calling you now.' };
}

// ── Public flats (signed out): enough to browse, not enough to bypass Pakka ──

// Round to ~1 km and nudge deterministically, so the circle shows the neighbourhood, never the building.
function approx(v, id, k) {
  const h = [...`${id}${k}`].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 1000, 7) / 1000;
  return Math.round(v * 100) / 100 + (h - 0.5) * 0.004;
}

// Until owners' own photos are added, each flat shows a sample interior (labelled "Sample photo" on the card).
const SAMPLE_PHOTOS = 6;
const samplePhoto = (id) => `/images/flats/flat-${(Number(String(id).replace(/\D/g, '')) || 0) % SAMPLE_PHOTOS}.jpg`;

export function publicListings() {
  return db.listings
    .filter((l) => l.status === 'available' && !l.isBroker)
    .map((l) => ({
      id: l.id, bhk: l.bhk, area: l.area, rent: l.rent, deposit: l.deposit, furnishing: l.furnishing,
      tenantPreference: l.tenantPreference, pets: l.pets, parking: l.parking, houseRules: l.houseRules,
      availableFrom: l.availableFrom, verifiedAt: l.verifiedAt,
      photo: l.photo ?? samplePhoto(l.id), samplePhoto: !l.photo, ownerUpdatedAt: l.ownerUpdatedAt ?? null,
      lastCallAt: l.lastCallAt ?? l.history?.at(-1)?.at ?? null,
      lat: l.lat == null ? null : approx(l.lat, l.id, 'lat'),
      lng: l.lng == null ? null : approx(l.lng, l.id, 'lng'),
      approximate: true,
    }));
}

// ── Router ────────────────────────────────────────────────────────────────────

export async function handleApi(req, res, url, { send, readJson }) {
  const path = url.pathname;

  if (path === '/api/public/listings' && req.method === 'GET') {
    return send(res, 200, { listings: publicListings() });
  }

  // Everything below is the team console: team session required, from anywhere.
  if (currentUser(req)?.role !== 'team') return send(res, 401, { error: 'Team sign-in required.' });

  const m = (re) => path.match(re);
  let p;

  if (req.method === 'GET' && path === '/api/overview') return send(res, 200, await overview());
  if (req.method === 'GET' && path === '/api/listings') return send(res, 200, { listings: db.listings });
  if (req.method === 'POST' && path === '/api/listings') {
    const out = addListing(await readJson(req));
    save();
    return send(res, out.error ? 400 : 201, out);
  }
  if (req.method === 'GET' && (p = m(/^\/api\/listings\/([\w-]+)$/))) {
    const l = listingDetail(p[1]);
    return l ? send(res, 200, l) : send(res, 404, { error: 'not found' });
  }
  if (req.method === 'POST' && (p = m(/^\/api\/listings\/([\w-]+)\/recheck$/))) {
    const out = requestRecheck(p[1]);
    return send(res, out.status === 'error' ? 409 : 202, out);
  }
  if (req.method === 'GET' && path === '/api/requests') return send(res, 200, { requests: [...db.sessions].reverse(), listings: db.listings.map(({ id, area, bhk, ownerName, ownerLanguage }) => ({ id, area, bhk, ownerName, ownerLanguage })), visits: db.visits });
  if (req.method === 'GET' && path === '/api/owners') return send(res, 200, { owners: owners() });

  // Owners' "List another flat" requests, newest first.
  if (req.method === 'GET' && path === '/api/listing-requests') return send(res, 200, { requests: [...db.listingRequests].reverse() });
  if (req.method === 'POST' && (p = m(/^\/api\/listing-requests\/([\w-]+)\/status$/))) {
    const r = db.listingRequests.find((x) => x.id === p[1]);
    if (!r) return send(res, 404, { error: 'not found' });
    const { status, reason } = await readJson(req);
    if (!['pending', 'visit_scheduled', 'declined'].includes(status)) return send(res, 400, { error: 'bad status' });
    r.status = status;
    // Declining a new owner's application: they see the reason and can send a new one.
    const owner = r.kind === 'first' && status === 'declined' && findUser(r.uid);
    if (owner && owner.ownerStatus !== 'approved') {
      owner.ownerStatus = 'declined';
      owner.ownerDeclineReason = String(reason ?? '').trim().slice(0, 200) || null;
    }
    logEvent('listing_request_status', `Listing request ${r.id} (${r.bhk} BHK, ${r.area}) → ${status.replace('_', ' ')}`, {});
    save();
    return send(res, 200, { ok: true });
  }
  if (req.method === 'GET' && path === '/api/visits') return send(res, 200, { visits: [...db.visits].reverse(), listings: db.listings.map(({ id, area, bhk, ownerName, landmark }) => ({ id, area, bhk, ownerName, landmark })) });
  if (req.method === 'GET' && path === '/api/events') return send(res, 200, { events: db.events.slice(-200).reverse() });
  if (req.method === 'GET' && path === '/api/calls') return send(res, 200, { calls: await listCalls({ fresh: url.searchParams.has('fresh') }) });
  if (req.method === 'GET' && (p = m(/^\/api\/calls\/([\w-]+)\/recording$/))) {
    if (await streamRecording(p[1], res)) return;
    return send(res, 404, { error: 'no recording' });
  }
  if (req.method === 'GET' && (p = m(/^\/api\/calls\/([\w-]+)$/))) return send(res, 200, await getCall(p[1]));
  if (req.method === 'GET' && path === '/api/agents') return send(res, 200, { agents: await agents() });

  return send(res, 404, { error: 'not found' });
}

async function agents() {
  const calls = await listCalls();
  return Promise.all(
    Object.entries(AGENTS).map(async ([key, a]) => {
      const d = await bolna('GET', `/v2/agent/${a.id}`);
      const t = d.tasks?.[0] ?? {};
      const tc = t.tools_config ?? {};
      const langs = tc.multilingual_config?.languages ?? {};
      const mine = calls.filter((c) => c.agent === key);
      return {
        key,
        id: a.id,
        name: d.agent_name,
        role: a.role,
        // Bolna timestamps are UTC without a zone suffix.
        updatedAt: d.updated_at && !/[zZ+]/.test(d.updated_at.slice(19)) ? `${d.updated_at}Z` : d.updated_at,
        model: tc.llm_agent?.llm_config?.model,
        transcriber: `${tc.transcriber?.provider} ${tc.transcriber?.model}`,
        languages: Object.entries(langs).map(([code, v]) => ({ code, voice: v.synthesizer?.provider_config?.voice, tts: v.synthesizer?.provider_config?.model })),
        tools: (tc.api_tools?.tools ?? []).map((x) => x.name),
        extractions: key === 'check' ? 13 : 0,
        maxCallSec: t.task_config?.call_terminate,
        calls: mine.length,
        avgSec: mine.length ? Math.round(mine.reduce((n, c) => n + c.durationSec, 0) / mine.length) : 0,
        costCents: Math.round(mine.reduce((n, c) => n + (c.costCents || 0), 0) * 100) / 100,
      };
    }),
  );
}
