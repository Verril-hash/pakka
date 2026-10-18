// Pakka server: mid-call functions for the Pakka Line agent, plus the owner-check loop.
// Run: npm start   (then expose it with a tunnel and put the https URL in .env as PUBLIC_URL)

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { handleApi } from './api.mjs';
import { handlePortal, PORTAL_PATHS } from './portal.mjs';
import { currentUser } from './auth.mjs';
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
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json',
};

async function serveWeb(res, pathname) {
  const file = new URL(`.${decodeURIComponent(pathname)}`, DIST);
  const isAsset = pathname !== '/' && extname(pathname) && file.href.startsWith(DIST.href) && (await stat(file).catch(() => null))?.isFile();
  const target = isAsset ? file : new URL('index.html', DIST);
  const body = await readFile(target).catch(() => null);
  if (!body) return false;
  res.writeHead(200, {
    'Content-Type': TYPES[extname(target.pathname)] ?? 'application/octet-stream',
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

  if (req.method === 'GET' && !url.pathname.startsWith('/tools/') && (await serveWeb(res, url.pathname))) return;
  send(res, 404, { error: 'not found' });
});

if (!TOKEN) throw new Error('Set PAKKA_TOOL_TOKEN in .env');
server.listen(PORT, () => console.log(`Pakka server on http://localhost:${PORT}`));
setInterval(tick, LOOP_MS);
