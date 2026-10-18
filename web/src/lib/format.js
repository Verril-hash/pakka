const DAY = 24 * 60 * 60 * 1000;

export const LANGUAGES = {
  kn: { label: 'Kannada', native: 'ಕನ್ನಡ' },
  hi: { label: 'Hindi', native: 'हिंदी' },
  ta: { label: 'Tamil', native: 'தமிழ்' },
  en: { label: 'English', native: 'English' },
};

export const rupees = (n) => (n == null || n === '' ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);

export function compactRupees(n) {
  if (n == null) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L`;
  if (n >= 1000) return `₹${Math.round(n / 1000)}k`;
  return `₹${n}`;
}

export const cents = (c) => `$${((c || 0) / 100).toFixed(2)}`;

export function duration(sec) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

export function ago(iso) {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export const time = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

export const dateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
    : '—';

export const isFresh = (iso) => iso && Date.now() - new Date(iso).getTime() < 2 * DAY;

export function maskPhone(p) {
  if (!p) return '—';
  const d = p.replace(/\D/g, '').slice(-10);
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

/** One status for a listing, used everywhere a listing is shown. */
export function listingStatus(l, callingIds = new Set()) {
  if (callingIds.has(l.id)) return 'calling';
  if (l.status === 'rented') return 'rented';
  if (l.status === 'broker_flagged' || l.isBroker) return 'broker';
  return isFresh(l.lastConfirmedAt) ? 'confirmed' : 'stale';
}

export const LISTING_STATUS = {
  confirmed: { label: 'Current', tone: 'green' },
  stale: { label: 'Needs re-check', tone: 'amber' },
  calling: { label: 'On a call', tone: 'blue' },
  rented: { label: 'Rented', tone: 'gray' },
  broker: { label: 'Broker', tone: 'red' },
};

export const OUTCOMES = {
  confirmed: { label: 'Confirmed', tone: 'green' },
  rented: { label: 'Rented', tone: 'gray' },
  call_later: { label: 'Call later', tone: 'amber' },
  do_not_call: { label: 'Do not call', tone: 'red' },
  wrong_number: { label: 'Wrong number', tone: 'red' },
  no_conversation: { label: 'No conversation', tone: 'gray' },
  intake: { label: 'Tenant intake', tone: 'violet' },
  callback: { label: 'Callback', tone: 'blue' },
  pending: { label: 'No data', tone: 'gray' },
};

/** When a listing was last confirmed on a real call (null if it never has been). */
export const lastCall = (l) => l.lastCallAt ?? l.history?.at(-1)?.at ?? null;

export const PIN_COLORS = { confirmed: '#00b8d9', stale: '#f79009', calling: '#004aad', rented: '#98a2b3', broker: '#f04438' };
