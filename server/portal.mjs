// Owner and tenant portals: each signed-in person only ever gets their own data.
// No agent names, models, costs, other people's numbers, or anything from the team console.

import { bolna } from '../lib/bolna.mjs';
import { listCalls, publicListings, requestCallback } from './api.mjs';
import { requestOwnerCheck } from './checks.mjs';
import { randomUUID } from 'node:crypto';
import { currentUser, endSession, findUser, profileComplete, saveProfile, sessionCookie, signInWithFirebase } from './auth.mjs';
import { db, findListing, logEvent, save } from './store.mjs';
import { isFresh, normalizePhone, rupees } from './util.mjs';

const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] || '';

function ownerListingStatus(l) {
  if (l.status === 'rented') return 'rented';
  if (l.status === 'broker_flagged' || l.isBroker) return 'hidden';
  return isFresh(l.lastConfirmedAt) ? 'live' : 'needs_check';
}

/** What the owner confirmed on one call, in their words-ish. */
function confirmedSummary(h) {
  if (!h) return null;
  if (h.outcome === 'rented' || h.available === 'no') return 'You told Pakka the flat is rented.';
  if (h.outcome === 'call_later') return 'You asked Pakka to call back later.';
  if (h.outcome === 'do_not_call') return 'You asked Pakka not to call again.';
  if (h.outcome !== 'confirmed') return null;
  return [
    'Still available',
    h.rent && `rent ${rupees(h.rent)}`,
    h.deposit && `deposit ${rupees(h.deposit)}`,
    h.answer,
    h.visitSlot && `visits ${h.visitSlot}`,
  ].filter(Boolean).join(' · ');
}

async function ownerOverview(phone) {
  const mine = db.listings.filter((l) => l.ownerPhone === phone);
  const ids = new Set(mine.map((l) => l.id));
  const history = new Map(mine.flatMap((l) => l.history.map((h) => [h.executionId, { ...h, listingId: l.id }])));

  const calls = (await listCalls())
    .filter((c) => c.agent === 'check' && normalizePhone(c.to) === phone)
    .map((c) => {
      const h = history.get(c.id);
      const l = findListing(c.listingId ?? h?.listingId);
      return {
        id: c.id,
        at: c.createdAt,
        durationSec: c.durationSec,
        language: c.language,
        answered: c.status === 'completed' && c.outcome !== 'no_conversation',
        flat: l ? `${l.bhk} BHK · ${l.area}` : null,
        summary: confirmedSummary(h) ?? (c.status === 'completed' ? null : 'Missed call'),
      };
    });

  return {
    name: mine[0]?.ownerName ?? '',
    language: mine[0]?.ownerLanguage ?? 'en',
    paused: db.doNotCall.includes(phone),
    flats: mine.map((l) => ({
      id: l.id, bhk: l.bhk, area: l.area, landmark: l.landmark, rent: l.rent, deposit: l.deposit,
      furnishing: l.furnishing, tenantPreference: l.tenantPreference, pets: l.pets, houseRules: l.houseRules,
      availableFrom: l.availableFrom, visitSlots: l.visitSlots, status: ownerListingStatus(l),
      verifiedAt: l.verifiedAt, lastCallAt: l.lastCallAt ?? l.history.at(-1)?.at ?? null, lat: l.lat, lng: l.lng,
    })),
    calls,
    visits: db.visits
      .filter((v) => ids.has(v.listingId))
      .map((v) => {
        const l = findListing(v.listingId);
        return { id: v.id, slot: v.slot, bookedAt: v.bookedAt, flat: `${l.bhk} BHK · ${l.area}`, tenant: firstName(v.tenantName) || 'A tenant' };
      })
      .reverse(),
  };
}

function checkView(c) {
  const l = findListing(c.listingId) ?? {};
  const r = c.result ?? '';
  const outcome =
    c.state === 'queued' || c.state === 'calling' ? 'checking'
      : c.state === 'unreachable' || c.state === 'skipped' ? 'unreachable'
        : /already been rented/.test(r) ? 'rented'
          : /broker/.test(r) ? 'unavailable'
            : /still available/.test(r) ? 'available' : 'unconfirmed';
  return {
    id: l.id, bhk: l.bhk, area: l.area, landmark: l.landmark, rent: l.rent, outcome,
    answer: outcome === 'available' ? l.history?.findLast?.((h) => h.executionId === c.executionId)?.answer ?? null : null,
    visitSlot: outcome === 'available' ? l.visitSlots?.[0] ?? null : null,
  };
}

async function tenantOverview(user) {
  const { phone } = user;
  const profile = findUser(user.uid)?.profiles?.tenant ?? {};
  const requests = db.sessions.filter((s) => s.kind !== 'recheck' && s.tenantPhone === phone).reverse();
  const visits = db.visits.filter((v) => v.tenantPhone === phone).reverse();
  const calls = (await listCalls()).filter((c) => c.agent === 'line' && normalizePhone(c.to) === phone);
  return {
    name: firstName(profile.fullName ?? requests[0]?.tenantName ?? visits[0]?.tenantName ?? calls[0]?.counterpart ?? ''),
    // What they told us at sign-up, used to pick "Flats for you".
    search: { budget: profile.budget ?? null, moveIn: profile.moveIn || null, household: profile.household ?? null, language: profile.language ?? 'en' },
    requests: requests.map((s) => ({
      id: s.id, at: s.createdAt, lookingFor: s.requirement, question: s.question,
      status: s.state === 'done' ? 'done' : s.state === 'calling_back' ? 'calling_you' : 'checking',
      flats: s.checks.map(checkView),
    })),
    visits: visits.map((v) => {
      const l = findListing(v.listingId) ?? {};
      return { id: v.id, slot: v.slot, bookedAt: v.bookedAt, bhk: l.bhk, area: l.area, landmark: l.landmark, rent: l.rent, owner: l.ownerName ?? '', lat: l.lat, lng: l.lng };
    }),
    calls: calls.map((c) => ({ id: c.id, at: c.createdAt, durationSec: c.durationSec, language: c.language, kind: c.mode === 'callback' ? 'callback' : 'request' })),
  };
}

/** A call's details, only if it was a call with this person. */
async function callFor(user, id) {
  const exec = await bolna('GET', `/executions/${id}`);
  const to = normalizePhone(exec.user_number ?? exec.context_details?.recipient_data?.recipient_phone_number);
  const agentOk = user.role === 'owner' ? exec.agent_id === process.env.PAKKA_CHECK_AGENT_ID : exec.agent_id === process.env.PAKKA_LINE_AGENT_ID;
  if (to !== user.phone || !agentOk) return null;
  return {
    exec,
    view: {
      id: exec.id,
      at: exec.created_at,
      durationSec: Math.round(exec.conversation_duration ?? exec.telephony_data?.duration ?? 0),
      language: exec.agent_context_details?.language ?? null,
      transcript: exec.transcript ?? '',
      hasRecording: Boolean(exec.telephony_data?.recording_url),
    },
  };
}

export async function handlePortal(req, res, url, { send, readJson }) {
  const path = url.pathname;
  // ── Sign in (Firebase ID token → our session cookie) ──
  if (path === '/api/auth/firebase' && req.method === 'POST') {
    const out = await signInWithFirebase(await readJson(req));
    if (out.error) return send(res, 400, out);
    if (out.needsPhone) return send(res, 200, { needsPhone: true });
    res.setHeader('Set-Cookie', sessionCookie(req, out.token));
    return send(res, 200, { ok: true, role: out.role, needsProfile: out.needsProfile });
  }
  if (path === '/api/auth/logout' && req.method === 'POST') {
    endSession(req);
    res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
    return send(res, 200, { ok: true });
  }

  const user = currentUser(req);
  if (path === '/api/me' && req.method === 'GET') {
    if (!user) return send(res, 200, { role: null });
    const account = findUser(user.uid);
    const profile = account?.profiles?.[user.role] ?? null;
    return send(res, 200, {
      role: user.role,
      phone: user.phone,
      needsProfile: !profileComplete(account, user.role),
      name: profile?.fullName ?? account?.googleName ?? null,
      email: profile?.email ?? account?.email ?? null,
      profile,
    });
  }
  if (!user) return send(res, 401, { error: 'Please sign in.' });

  if (path === '/api/profile' && req.method === 'POST') {
    const out = saveProfile(user, await readJson(req));
    return send(res, out.error ? 400 : 200, out);
  }

  // Everything below needs a finished profile (name, email, consent), enforced here as well as in the UI.
  if (!profileComplete(findUser(user.uid), user.role)) return send(res, 403, { error: 'Please finish your profile first.', needsProfile: true });

  // ── Calls (shared, ownership-checked) ──
  let m = path.match(/^\/api\/portal\/calls\/([\w-]+)(\/recording)?$/);
  if (m && req.method === 'GET') {
    const found = await callFor(user, m[1]);
    if (!found) return send(res, 404, { error: 'Not found' });
    if (!m[2]) return send(res, 200, found.view);
    const rec = found.exec.telephony_data?.recording_url;
    const audio = rec && (await fetch(rec, { headers: { Authorization: `Bearer ${process.env.BOLNA_API_KEY}` } }));
    if (!audio?.ok) return send(res, 404, { error: 'No recording' });
    res.writeHead(200, { 'Content-Type': audio.headers.get('content-type') ?? 'audio/mpeg', 'Cache-Control': 'private, max-age=3600' });
    return res.end(Buffer.from(await audio.arrayBuffer()));
  }

  // ── Owner ──
  if (user.role === 'owner') {
    if (path === '/api/owner/overview' && req.method === 'GET') return send(res, 200, await ownerOverview(user.phone));

    m = path.match(/^\/api\/owner\/flats\/([\w-]+)\/(rented|available)$/);
    if (m && req.method === 'POST') {
      const l = findListing(m[1]);
      if (!l || l.ownerPhone !== user.phone) return send(res, 404, { error: 'Not found' });
      if (m[2] === 'rented') {
        l.status = 'rented';
        logEvent('listing_rented', `${l.ownerName} marked ${l.id} as rented — hidden from search`, { listingId: l.id });
      } else if (l.status === 'rented') {
        l.status = 'available';
        logEvent('listing_reopened', `${l.ownerName} marked ${l.id} as available again`, { listingId: l.id });
      }
      save();
      return send(res, 200, { ok: true });
    }

    if (path === '/api/owner/calls-paused' && req.method === 'POST') {
      const { paused } = await readJson(req);
      db.doNotCall = db.doNotCall.filter((p) => p !== user.phone);
      if (paused) db.doNotCall.push(user.phone);
      logEvent(paused ? 'do_not_call' : 'calls_resumed', `${paused ? 'Owner paused' : 'Owner resumed'} check-in calls`, {});
      save();
      return send(res, 200, { ok: true, paused: Boolean(paused) });
    }
  }

  // ── Tenant ──
  if (user.role === 'tenant' && path === '/api/tenant/overview' && req.method === 'GET') {
    return send(res, 200, await tenantOverview(user));
  }

  // "Call me": always the verified phone on this account; the body only picks the language.
  if (user.role === 'tenant' && path === '/api/tenant/call-me' && req.method === 'POST') {
    const body = await readJson(req);
    const profile = findUser(user.uid)?.profiles?.tenant;
    const out = await requestCallback({ phone: user.phone, name: profile?.fullName?.split(' ')[0], language: body.language ?? profile?.language });
    return send(res, out.error ? 429 : 202, out);
  }

  // Signed-in tenants get the exact location and visit times.
  if (user.role === 'tenant' && path === '/api/tenant/listings' && req.method === 'GET') {
    const full = new Map(db.listings.map((l) => [l.id, l]));
    const listings = publicListings().map((p) => {
      const l = full.get(p.id);
      const fresh = isFresh(l.lastConfirmedAt);
      return { ...p, approximate: false, lat: l.lat, lng: l.lng, landmark: l.landmark, visitSlots: l.visitSlots, bookable: fresh && l.visitSlots.length > 0 };
    });
    const busy = db.sessions.some((s) => s.tenantPhone === user.phone && s.state !== 'done');
    return send(res, 200, { listings, checking: busy });
  }

  m = path.match(/^\/api\/tenant\/flats\/([\w-]+)\/(visit|ask)$/);
  if (user.role === 'tenant' && m && req.method === 'POST') {
    const l = findListing(m[1]);
    if (!l || l.status !== 'available' || l.isBroker) return send(res, 404, { error: 'This flat is no longer available.' });
    const body = await readJson(req);
    const name = firstName(findUser(user.uid)?.profiles?.tenant?.fullName) || 'there';

    if (m[2] === 'visit') {
      if (!isFresh(l.lastConfirmedAt) || !l.visitSlots.includes(body.slot)) return send(res, 409, { error: 'Pakka needs to re-confirm this flat first. Use "Ask Pakka" instead.' });
      if (db.visits.some((v) => v.tenantPhone === user.phone && v.listingId === l.id)) return send(res, 409, { error: 'You already have a visit booked for this flat.' });
      const visit = { id: randomUUID().slice(0, 8), listingId: l.id, slot: body.slot, tenantName: name, tenantPhone: user.phone, bookedAt: new Date().toISOString(), source: 'web' };
      db.visits.push(visit);
      logEvent('visit_booked', `Visit booked on the website: ${name} → ${l.id} (${l.area}) on ${body.slot}`, { listingId: l.id });
      save();
      return send(res, 200, { ok: true, visit: { slot: visit.slot } });
    }

    // ask: Pakka calls the owner, then calls the tenant back.
    if (db.sessions.some((s) => s.tenantPhone === user.phone && s.state !== 'done')) return send(res, 409, { error: 'Pakka is already checking something for you. You will get a call shortly.' });
    const question = String(body.question ?? '').trim().slice(0, 160);
    const out = requestOwnerCheck({
      listing_ids: l.id,
      question: question || 'Is it still available, and when can I visit?',
      requirement: `Interested in the ${l.bhk} BHK in ${l.area} (asked on the website)`,
      tenant_name: name,
      tenant_phone: user.phone,
      tenant_language: ['en', 'hi', 'kn', 'ta'].includes(body.language) ? body.language : 'en',
    });
    return send(res, out.status === 'error' ? 400 : 200, { ok: out.status !== 'error', message: out.status === 'error' ? out.message : 'Pakka is calling the owner now and will call you back in a few minutes.' });
  }

  return send(res, 404, { error: 'Not found' });
}

export const PORTAL_PATHS = /^\/api\/(auth|me$|profile$|portal|owner|tenant)/;
