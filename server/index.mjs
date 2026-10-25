// Pakka server: mid-call functions for the Pakka Line agent, plus the owner-check loop.
// Run: npm start   (then expose it with a tunnel and put the https URL in .env as PUBLIC_URL)

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { handleApi, requestCallback } from './api.mjs';
import { handlePortal, PORTAL_PATHS } from './portal.mjs';
import { currentUser } from './auth.mjs';
import { appCheckOk, rateLimited } from './guard.mjs';
import { notifyVisitBooked, sendText, webhookSignatureOk } from './whatsapp.mjs';
import { db, save, logEvent, findListing, resetDb } from './store.mjs';
import { searchListings } from './listings.mjs';
import { requestOwnerCheck, tick } from './checks.mjs';
import { normalizePhone } from './util.mjs';

const PORT = Number(process.env.PORT) || 8787;
const TOKEN = process.env.PAKKA_TOOL_TOKEN;
const LOOP_MS = 4000;

// The web app (web/dist): public site at /, console at /console. Built with `npm run web:build`.
const DIST = new URL('../web/dist/', import.meta.url);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json', '.mp3': 'audio/mpeg',
};

async function serveWeb(req, res, pathname) {
  const file = new URL(`.${decodeURIComponent(pathname)}`, DIST);
  const isAsset = pathname !== '/' && extname(pathname) && file.href.startsWith(DIST.href) && (await stat(file).catch(() => null))?.isFile();
  const target = isAsset ? file : new URL('index.html', DIST);
  const body = await readFile(target).catch(() => null);
  if (!body) return false;
  const type = TYPES[extname(target.pathname)] ?? 'application/octet-stream';
  // Audio needs byte ranges, or browsers can't seek in the demo call recording.
  const range = isAsset && type.startsWith('audio/') && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, body.length - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
    if (start > end || start >= body.length) {
      res.writeHead(416, { 'Content-Range': `bytes */${body.length}` });
      res.end();
      return true;
    }
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, 'Cache-Control': 'no-store' });
    res.end(body.subarray(start, end + 1));
    return true;
  }
  res.writeHead(200, {
    'Content-Type': type,
    ...(type.startsWith('audio/') ? { 'Accept-Ranges': 'bytes' } : {}),
    'Cache-Control': isAsset && pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-store',
  });
  res.end(body);
  return true;
}

const tools = {
  search_listings: (p) => {
    const result = searchListings(p);
    logEvent('search', `Tenant search "${[p.bhk && `${p.bhk} BHK`, p.area, p.budget && `≤ ${p.budget}`].filter(Boolean).join(', ')}" → ${result.matches.length} match(es)`);
    return result;
  },

  request_owner_check: (p) => requestOwnerCheck(p),

  book_visit: ({ listing_id, slot, tenant_name, tenant_phone }) => {
    const listing = findListing(listing_id);
    if (!listing) return { status: 'error', message: 'Unknown listing id.' };
    const visit = {
      id: randomUUID().slice(0, 8),
      listingId: listing.id,
      slot,
      tenantName: tenant_name || '',
      tenantPhone: normalizePhone(tenant_phone),
      bookedAt: new Date().toISOString(),
    };
    db.visits.push(visit);
    logEvent('visit_booked', `Visit booked: ${visit.tenantName} → ${listing.id} (${listing.area}) on ${slot}`, { listingId: listing.id });
    notifyVisitBooked(listing, visit);
    return {
      status: 'booked',
      message: `Booked ${slot} at ${listing.ownerName}'s ${listing.bhk} BHK in ${listing.area}. Pakka will WhatsApp the exact address and let the owner know.`,
    };
  },
};

async function readJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    return Object.fromEntries(new URLSearchParams(body));
  }
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });

  // Bolna posts here when a call changes status. We don't trust the body: it just wakes the loop,
  // which re-reads the call from Bolna's API. On Cloud Run this also wakes a sleeping instance.
  if (req.method === 'POST' && url.pathname === '/webhooks/bolna') {
    if (!TOKEN || url.searchParams.get('token') !== TOKEN) return send(res, 401, { error: 'unauthorized' });
    req.resume();
    tick();
    return send(res, 200, { ok: true });
  }
  // WhatsApp messages people send to Pakka (via Vobiz). Signed with our webhook secret; anything unsigned is dropped.
  // "CALL" gets a callback to the number that sent it, under the same limits as the website.
  if (req.method === 'POST' && url.pathname === '/webhooks/whatsapp') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    if (!webhookSignatureOk(raw, req.headers['x-webhook-signature'])) return send(res, 401, { error: 'bad signature' });
    send(res, 200, { ok: true });
    let evt;
    try { evt = JSON.parse(raw.toString('utf8')); } catch { return; }
    const d = evt.data ?? evt;
    if (!String(evt.event ?? evt.type ?? '').includes('inbound')) return;
    const from = normalizePhone(d.from ?? d.contact?.phone_number ?? d.contact?.phone ?? d.sender);
    const text = String(d.text?.body ?? d.content?.text?.body ?? d.content?.body ?? d.body ?? '').trim();
    logEvent('whatsapp_inbound', `WhatsApp from …${String(from).slice(-4)}: "${text.slice(0, 80)}"`);
    if (from && /\bcall\b/i.test(text)) {
      const profile = db.users.find((u) => u.phone === from)?.profiles?.tenant;
      const out = await requestCallback({ phone: from, name: profile?.fullName?.split(' ')[0], language: profile?.language });
      sendText(from, out.error ?? 'Calling you now 📞');
    }
    return;
  }

  // Browser API front door: per-IP rate limits, then App Check (only our real website gets in).
  if (url.pathname.startsWith('/api/')) {
    const wait = rateLimited(req, url.pathname);
    if (wait) {
      res.setHeader('Retry-After', String(wait));
      return send(res, 429, { error: 'Too many requests. Please wait a moment and try again.' });
    }
    if (!(await appCheckOk(req, url.pathname))) return send(res, 401, { error: 'Please use the Pakka website or app.' });
  }

  // Live snapshot for the console. Contains tenant phones: team only.
  if (req.method === 'GET' && url.pathname === '/state') {
    if (currentUser(req)?.role !== 'team') return send(res, 401, { error: 'Team sign-in required.' });
    const listings = db.listings.map(({ ownerPhone, ...l }) => l);
    return send(res, 200, { listings, sessions: db.sessions, visits: db.visits, events: db.events.slice(-100) });
  }

  // Reset to the seed listings before a demo run. Team only.
  if (req.method === 'POST' && url.pathname === '/admin/reset') {
    if (currentUser(req)?.role !== 'team') return send(res, 401, { error: 'Team sign-in required.' });
    resetDb();
    logEvent('reset', 'Demo data reset');
    return send(res, 200, { ok: true });
  }

  if (PORTAL_PATHS.test(url.pathname)) {
    try {
      return await handlePortal(req, res, url, { send, readJson });
    } catch (err) {
      console.error(`✗ ${url.pathname}`, err.message);
      return send(res, 502, { error: 'Something went wrong. Please try again.' });
    }
  }

  if (url.pathname.startsWith('/api/')) {
    try {
      return await handleApi(req, res, url, { send, readJson });
    } catch (err) {
      console.error(`✗ ${url.pathname}`, err.message);
      return send(res, 502, { error: err.message });
    }
  }

  const tool = url.pathname.startsWith('/tools/') && tools[url.pathname.slice(7)];
  if (req.method === 'POST' && tool) {
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { error: 'unauthorized' });
    const params = { ...Object.fromEntries(url.searchParams), ...(await readJson(req)) };
    console.log(`→ ${url.pathname}`, JSON.stringify(params));
    try {
      const result = await tool(params);
      save();
      return send(res, 200, result);
    } catch (err) {
      console.error(`✗ ${url.pathname}`, err);
      return send(res, 200, { status: 'error', message: 'Something went wrong on our side. Tell the tenant the team will WhatsApp them.' });
    }
  }

  if (req.method === 'GET' && !url.pathname.startsWith('/tools/') && (await serveWeb(req, res, url.pathname))) return;
  send(res, 404, { error: 'not found' });
});

if (!TOKEN) throw new Error('Set PAKKA_TOOL_TOKEN in .env');
server.listen(PORT, () => console.log(`Pakka server on http://localhost:${PORT}`));
setInterval(tick, LOOP_MS);
