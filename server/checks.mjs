// The callback loop: tenant asks → Pakka calls owners (Pakka Check) → results land on the
// listings → Pakka calls the tenant back (Pakka Line, callback mode).
//
// Owner-call results are read by polling Bolna's execution API, so only the tenant agent's
// mid-call functions need the public URL.

import { randomUUID } from 'node:crypto';
import { bolna, assertNotProtected } from '../lib/bolna.mjs';
import { greeting as ownerGreeting } from '../agents/owner-check.mjs';
import { greeting as tenantGreeting } from '../agents/pakka-line.mjs';
import { db, save, logEvent, findListing } from './store.mjs';
import { normalizePhone, parseAmount, rupees } from './util.mjs';
import { lastSearch } from './listings.mjs';

const CHECK_AGENT = process.env.PAKKA_CHECK_AGENT_ID;
const LINE_AGENT = process.env.PAKKA_LINE_AGENT_ID;
const LANGS = new Set(['en', 'hi', 'kn', 'ta']);

const FAILED = new Set(['no-answer', 'busy', 'failed', 'canceled', 'cancelled', 'error', 'stopped', 'balance-low']);
// Extractions land a little after the call completes; give up waiting after this long.
const EXTRACTION_WAIT_MS = 90_000;
const MAX_START_ATTEMPTS = 3;

// ── Starting a check (called from the request_owner_check tool) ───────────────

export function requestOwnerCheck({ listing_ids, question, requirement, tenant_name, tenant_phone, tenant_language }) {
  const listings = String(listing_ids ?? '')
    .split(/[,\s]+/)
    .map(findListing)
    .filter(Boolean)
    .slice(0, 2);
  if (!listings.length) return { status: 'error', message: 'No valid listing ids. Call search_listings first.' };

  const session = {
    id: randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
    state: 'checking',
    tenantName: tenant_name || 'there',
    tenantPhone: normalizePhone(tenant_phone),
    tenantLanguage: LANGS.has(tenant_language) ? tenant_language : 'en',
    requirement: requirement || describeSearch(lastSearch.get(normalizePhone(tenant_phone))),
    question: question?.trim() || '',
    checks: listings.map((l) => ({ listingId: l.id, state: 'queued' })),
  };
  db.sessions.push(session);
  logEvent('tenant_request', `${session.tenantName} wants: ${session.requirement}. Checking ${listings.map((l) => l.id).join(', ')}`, {
    sessionId: session.id,
  });
  tick();
  return {
    status: 'checking',
    message: `Owner calls started for ${listings.length} flat(s). Tell the tenant you're calling the owners now and will call back in about five minutes, then close the call.`,
  };
}

function describeSearch(p) {
  if (!p) return '';
  return [p.bhk && `${p.bhk} BHK`, p.area && `in ${p.area}`, p.budget && `budget ${p.budget}`, p.tenant_type, p.needs, p.move_in && `move in ${p.move_in}`]
    .filter(Boolean)
    .join(', ');
}

/** Console "Re-check now": call one owner to refresh a listing, with no tenant to call back. */
export function requestRecheck(listingId, requestedBy = 'Console') {
  const listing = findListing(listingId);
  if (!listing) return { status: 'error', message: 'Unknown listing' };
  if (db.sessions.some((s) => s.state !== 'done' && s.checks.some((c) => c.listingId === listing.id && ['queued', 'calling'].includes(c.state)))) {
    return { status: 'error', message: 'A call about this listing is already in progress' };
  }
  const session = {
    id: randomUUID().slice(0, 8),
    kind: 'recheck',
    createdAt: new Date().toISOString(),
    state: 'checking',
    tenantName: requestedBy,
    requirement: `Routine re-check of ${listing.id}`,
    question: '',
    checks: [{ listingId: listing.id, state: 'queued' }],
  };
  db.sessions.push(session);
  logEvent('recheck', `${requestedBy} asked to re-check ${listing.id} (${listing.area})`, { listingId: listing.id, sessionId: session.id });
  tick();
  return { status: 'checking', sessionId: session.id };
}

// ── The loop ──────────────────────────────────────────────────────────────────

let running = false;

export async function tick() {
  if (running) return;
  running = true;
  try {
    for (const session of db.sessions.filter((s) => s.state !== 'done')) {
      for (const check of session.checks) await advanceCheck(session, check);
      await advanceSession(session);
    }
  } catch (err) {
    console.error('[loop]', err.message);
  } finally {
    running = false;
    save();
  }
}

const ownerBusy = (phone) =>
  db.sessions.some((s) => s.checks.some((c) => c.state === 'calling' && findListing(c.listingId)?.ownerPhone === phone));

async function advanceCheck(session, check) {
  const listing = findListing(check.listingId);

  if (check.state === 'queued') {
    if (!listing.ownerPhone || db.doNotCall.includes(listing.ownerPhone)) {
      check.state = 'skipped';
      return;
    }
    // One owner can hold several flats; never ring the same phone twice at once.
    if (ownerBusy(listing.ownerPhone)) return;
    // A call Bolna refuses (bad number, carrier down) is retried a few times, then given up, never every tick forever.
    try {
      check.executionId = await callOwner(listing, session.question);
    } catch (err) {
      check.attempts = (check.attempts ?? 0) + 1;
      check.lastError = err.message.slice(0, 300);
      if (check.attempts >= MAX_START_ATTEMPTS) {
        check.state = 'unreachable';
        logEvent('call_failed', `Couldn't start the call to ${listing.ownerName} about ${listing.id}: ${check.lastError}`, { listingId: listing.id });
      }
      return;
    }
    check.state = 'calling';
    logEvent('owner_call', `Calling ${listing.ownerName} (${listing.ownerLanguage}) about ${listing.id}`, {
      sessionId: session.id,
      listingId: listing.id,
    });
    return;
  }

  if (check.state !== 'calling') return;
  const exec = await bolna('GET', `/executions/${check.executionId}`);
  // Raw Bolna status ("ringing", "in-progress", …) so Mission Control can show the call live.
  check.liveStatus = exec.status;

  if (FAILED.has(exec.status)) {
    check.state = 'unreachable';
    logEvent('owner_unreachable', `${listing.ownerName} didn't pick up (${exec.status})`, { listingId: listing.id });
    return;
  }
  if (exec.status !== 'completed') return;

  const fields = exec.extracted_data?.['Listing Check'];
  check.completedAt ??= new Date().toISOString();
  if (!fields && Date.now() - new Date(check.completedAt).getTime() < EXTRACTION_WAIT_MS) return;

  check.result = applyResult(listing, fields ?? {}, exec.id, session.question);
  check.transcript = exec.transcript ?? '';
  check.durationSec = exec.telephony_data?.duration ?? exec.conversation_duration ?? null;
  check.state = 'done';
}

function value(field) {
  if (!field) return '';
  const v = field.objective ?? field.subjective ?? '';
  return v === 'No User Turn Detected' ? '' : String(v).trim().replace(/[.\s]+$/, '');
}

const PET_QUESTION = /\b(dog|puppy|cat|pets?)\b/i;
const PET_REFUSED = /\b(not (allowed|okay|ok|fine)|no pets?|no dogs?|nahi|beda|illa)\b/i;

/** Writes an owner call's extracted fields onto the listing and returns a one-line result for the tenant. */
function applyResult(listing, fields, executionId, question = '') {
  const outcome = value(fields.call_outcome) || 'no_conversation';
  const r = {
    outcome,
    available: value(fields.available),
    rent: parseAmount(value(fields.rent)),
    deposit: parseAmount(value(fields.deposit)),
    tenants: value(fields.tenant_preference),
    rules: value(fields.house_rules),
    answer: value(fields.tenant_question_answer),
    visitSlot: value(fields.visit_slot),
    broker: value(fields.is_broker),
    availableFrom: value(fields.available_from),
    notes: value(fields.other_notes),
  };

  listing.history.push({ at: new Date().toISOString(), executionId, ...r });

  if (outcome === 'do_not_call') {
    db.doNotCall.push(listing.ownerPhone);
    logEvent('do_not_call', `${listing.ownerName} asked not to be called again`, { listingId: listing.id });
  }
  if (outcome === 'rented' || r.available === 'no') {
    listing.status = 'rented';
    logEvent('listing_rented', `${listing.id} is already rented — hidden from search`, { listingId: listing.id });
    return `${listing.ownerName}'s ${listing.bhk} BHK in ${listing.area} (${listing.id}) has already been rented out.`;
  }
  if (r.broker === 'broker') {
    listing.isBroker = true;
    listing.status = 'broker_flagged';
    logEvent('broker_flagged', `${listing.id}: the person who answered is a broker — flagged`, { listingId: listing.id });
    return `The ${listing.bhk} BHK in ${listing.area} (${listing.id}) turned out to be handled by a broker, so Pakka is not recommending it.`;
  }
  if (outcome !== 'confirmed') {
    return `Couldn't confirm the ${listing.bhk} BHK in ${listing.area} (${listing.id}) — the owner ${
      outcome === 'call_later' ? 'was busy and asked to be called later' : "couldn't talk"
    }.`;
  }

  if (r.rent) listing.rent = r.rent;
  listing.ownerUpdatedAt = null; // a price the owner typed in is now confirmed on a call
  if (r.deposit) listing.deposit = r.deposit;
  if (['family', 'bachelors', 'anyone'].includes(r.tenants)) listing.tenantPreference = r.tenants === 'anyone' ? 'any' : r.tenants;
  if (r.rules) listing.houseRules = r.rules;
  if (r.availableFrom) listing.availableFrom = r.availableFrom;
  if (r.visitSlot) listing.visitSlots = [r.visitSlot];
  if (r.notes) listing.notes.push(r.notes);
  if (r.answer && PET_QUESTION.test(question)) listing.pets = PET_REFUSED.test(r.answer) ? 'no' : 'yes';
  listing.lastConfirmedAt = new Date().toISOString();
  listing.lastCallAt = listing.lastConfirmedAt;
  logEvent('listing_confirmed', `${listing.id} confirmed by call: rent ${rupees(listing.rent)}, visit ${r.visitSlot || 'not set'}`, {
    listingId: listing.id,
  });

  return [
    `${listing.ownerName}'s ${listing.bhk} BHK in ${listing.area} (${listing.id}): still available.`,
    `Rent ${rupees(listing.rent)}, deposit ${rupees(listing.deposit)}.`,
    r.answer && `Answer to the tenant's question: ${r.answer}.`,
    r.rules && `Rules: ${r.rules}.`,
    r.availableFrom && `Move-in from ${r.availableFrom}.`,
    r.visitSlot && `Owner can show it ${r.visitSlot}.`,
  ]
    .filter(Boolean)
    .join(' ');
}

async function advanceSession(session) {
  const pending = session.checks.some((c) => c.state === 'queued' || c.state === 'calling');

  if (session.state === 'checking' && !pending && session.kind === 'recheck') {
    session.state = 'done';
    return;
  }

  if (session.state === 'checking' && !pending) {
    try {
      session.callbackExecutionId = await callTenantBack(session);
    } catch (err) {
      session.callbackAttempts = (session.callbackAttempts ?? 0) + 1;
      session.lastError = err.message.slice(0, 300);
      if (session.callbackAttempts >= MAX_START_ATTEMPTS) {
        session.state = 'done';
        logEvent('call_failed', `Couldn't start the callback to ${session.tenantName}: ${session.lastError}`, { sessionId: session.id });
      }
      return;
    }
    session.state = 'calling_back';
    logEvent('tenant_callback', `Calling ${session.tenantName} back with the owners' answers`, { sessionId: session.id });
    return;
  }

  if (session.state === 'calling_back') {
    const exec = await bolna('GET', `/executions/${session.callbackExecutionId}`);
    session.callbackLiveStatus = exec.status;
    if (exec.status === 'completed' || FAILED.has(exec.status)) {
      session.state = 'done';
      if (FAILED.has(exec.status)) logEvent('tenant_missed', `${session.tenantName} didn't pick up the callback`, { sessionId: session.id });
    }
  }
}

// ── Placing calls ─────────────────────────────────────────────────────────────

async function callOwner(listing, question) {
  assertNotProtected(CHECK_AGENT);
  const lang = LANGS.has(listing.ownerLanguage) ? listing.ownerLanguage : 'en';
  const vars = {
    owner_name: listing.ownerName,
    bhk: String(listing.bhk),
    area: listing.area,
    rent: listing.rent.toLocaleString('en-IN'),
    deposit: listing.deposit.toLocaleString('en-IN'),
    extra_question: question || 'none',
  };
  const res = await bolna('POST', '/call', {
    agent_id: CHECK_AGENT,
    recipient_phone_number: listing.ownerPhone,
    ...(process.env.PAKKA_FROM_NUMBER ? { from_phone_number: process.env.PAKKA_FROM_NUMBER } : {}),
    agent_data: { language: lang },
    user_data: { ...vars, greeting: ownerGreeting(lang, vars) },
  });
  return res.execution_id;
}

async function callTenantBack(session) {
  const results = session.checks
    .map((c) => c.result ?? `Couldn't reach the owner of ${c.listingId} yet.`)
    .join('\n');
  return startTenantCall({
    mode: 'callback',
    phone: session.tenantPhone,
    name: session.tenantName,
    lang: session.tenantLanguage,
    requirement: session.requirement,
    checkResults: results,
  });
}

/** Also used by scripts/tenant-call.mjs to start an intake call while Pakka has no inbound number. */
export async function startTenantCall({ mode, phone, name, lang, requirement = '', checkResults = '' }) {
  assertNotProtected(LINE_AGENT);
  const res = await bolna('POST', '/call', {
    agent_id: LINE_AGENT,
    recipient_phone_number: normalizePhone(phone),
    ...(process.env.PAKKA_FROM_NUMBER ? { from_phone_number: process.env.PAKKA_FROM_NUMBER } : {}),
    agent_data: { language: lang },
    user_data: {
      mode,
      greeting: tenantGreeting(mode, lang, { tenant_name: name }),
      tenant_name: name,
      tenant_phone: normalizePhone(phone),
      requirement,
      check_results: checkResults || 'none',
    },
  });
  return res.execution_id;
}
