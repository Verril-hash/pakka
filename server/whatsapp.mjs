// WhatsApp messages from Pakka's number (+1 662-483-7159) through Vobiz's WhatsApp API.
// Best effort: a message that fails is logged and never breaks the call flow that triggered it.
// Off unless VOBIZ_AUTH_ID, VOBIZ_AUTH_TOKEN, VOBIZ_WA_CHANNEL_ID and VOBIZ_WA_WABA_ID are set.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { logEvent } from './store.mjs';

const BASE = 'https://api.vobiz.ai/api/v1/messaging';
const env = (k) => process.env[k]?.trim();
export const whatsappOn = () => Boolean(env('VOBIZ_AUTH_ID') && env('VOBIZ_AUTH_TOKEN') && env('VOBIZ_WA_CHANNEL_ID') && env('VOBIZ_WA_WABA_ID'));

export async function vobizWa(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'X-Auth-ID': env('VOBIZ_AUTH_ID'), 'X-Auth-Token': env('VOBIZ_AUTH_TOKEN'), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 300) }; }
  if (!res.ok) throw new Error(`Vobiz ${method} ${path} → HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

/** Send an approved template. `params` fill {{1}}, {{2}}, … in order. Returns true if Vobiz accepted it. */
export async function sendTemplate(to, name, params = []) {
  if (!whatsappOn() || !/^\+\d{10,15}$/.test(to ?? '')) return false;
  try {
    await vobizWa('POST', '/messages', {
      channel_id: env('VOBIZ_WA_CHANNEL_ID'),
      waba_id: env('VOBIZ_WA_WABA_ID'),
      to,
      type: 'template',
      template: {
        name,
        language: { code: 'en' },
        components: params.length ? [{ type: 'body', parameters: params.map((p) => ({ type: 'text', text: String(p ?? '').slice(0, 300) || '-' })) }] : [],
      },
    });
    logEvent('whatsapp_sent', `WhatsApp "${name}" to …${to.slice(-4)}`);
    return true;
  } catch (err) {
    logEvent('whatsapp_failed', `WhatsApp "${name}" to …${to.slice(-4)} failed: ${err.message.slice(0, 200)}`);
    return false;
  }
}

/** Free-form reply. Only allowed within 24 hours of the person messaging Pakka. */
export async function sendText(to, body) {
  if (!whatsappOn()) return false;
  try {
    await vobizWa('POST', '/messages', { channel_id: env('VOBIZ_WA_CHANNEL_ID'), waba_id: env('VOBIZ_WA_WABA_ID'), to, type: 'text', text: { body } });
    return true;
  } catch (err) {
    logEvent('whatsapp_failed', `WhatsApp reply to …${to.slice(-4)} failed: ${err.message.slice(0, 200)}`);
    return false;
  }
}

/** Vobiz signs each webhook: hex HMAC-SHA256 of the raw body with our subscription secret, in X-Webhook-Signature. */
export function webhookSignatureOk(rawBody, signature) {
  const secret = env('VOBIZ_WA_WEBHOOK_SECRET');
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature).trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Templates (Meta approves these once; then any number of messages) ──
// Utility category: transactional updates the person asked for. Body text can't start or end with a variable.
export const TEMPLATES = [
  {
    name: 'visit_booked_tenant',
    body: 'Your visit is booked ✅ {{1}} BHK in {{2}}, {{3}}. Landmark: {{4}}. Reply here to change the time.',
    example: ['2', 'Brookefield', 'Saturday 11 AM', 'near ITPL main road'],
  },
  {
    name: 'visit_booked_owner',
    body: 'A tenant is visiting your {{1}} BHK in {{2}} on {{3}}. {{4}} fits the rules you shared with Pakka. Reply here to change the time.',
    example: ['2', 'Brookefield', 'Saturday 11 AM', 'Verril'],
  },
  {
    name: 'missed_call',
    body: 'Hi {{1}}, Pakka called you about your flat search. Reply CALL and she will call you right back.',
    example: ['Verril'],
  },
  {
    name: 'flats_after_call',
    body: 'Hi {{1}}, here are the flats Pakka found for you: {{2}}. See them and book a visit at {{3}} anytime.',
    example: ['Verril', '2 BHK Brookefield ₹23,000, 2 BHK Hoodi ₹24,000', 'pakka-alpha.vercel.app/flats'],
  },
  {
    name: 'owner_flat_live',
    body: 'Good news, {{1}}! Your {{2}} BHK in {{3}} is now live on Pakka. Tenants who fit your rules can see it.',
    example: ['Asha', '2', 'Whitefield'],
  },
];

// ── Moments that send a WhatsApp ──

const first = (name) => String(name ?? '').trim().split(/\s+/)[0] || '';
const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

/** A visit was booked: the tenant gets the details, the owner gets a heads-up. */
export function notifyVisitBooked(listing, visit) {
  sendTemplate(visit.tenantPhone, 'visit_booked_tenant', [listing.bhk, listing.area, visit.slot, listing.landmark || listing.area]);
  sendTemplate(listing.ownerPhone, 'visit_booked_owner', [listing.bhk, listing.area, visit.slot, first(visit.tenantName) || 'A screened tenant']);
}

/** After Pakka's callback: the flats it talked about, so the tenant has them in writing. */
export function notifyFlatsAfterCall(session, listings) {
  const flats = listings.filter((l) => l?.status === 'available').map((l) => `${l.bhk} BHK ${l.area} ${rupees(l.rent)}`);
  if (!flats.length) return;
  const site = (process.env.PUBLIC_SITE_URL || 'https://pakka-alpha.vercel.app').replace(/^https?:\/\//, '');
  sendTemplate(session.tenantPhone, 'flats_after_call', [first(session.tenantName) || 'there', flats.join(', '), `${site}/flats`]);
}

/** The tenant didn't pick up Pakka's callback: one tap to get called again. */
export function notifyMissedCall(session) {
  sendTemplate(session.tenantPhone, 'missed_call', [first(session.tenantName) || 'there']);
}

/** A new owner's first flat was verified and listed. */
export function notifyOwnerLive(listing) {
  sendTemplate(listing.ownerPhone, 'owner_flat_live', [first(listing.ownerName) || 'there', listing.bhk, listing.area]);
}
