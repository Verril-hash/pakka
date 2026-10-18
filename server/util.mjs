// Small helpers shared across the server.

const DAY = 24 * 60 * 60 * 1000;

/** "1 lakh" → 100000, "23,000" → 23000, "1.2L" → 120000, "25k" → 25000. Null if no number. */
export function parseAmount(text) {
  if (text == null || text === '') return null;
  if (typeof text === 'number') return text;
  const s = String(text).toLowerCase().replace(/,/g, '').replace(/₹|rs\.?|rupees/g, '').trim();
  const m = s.match(/(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|l\b|k\b|thousand)?/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2] ?? '';
  if (/^(lakh|lac|l)/.test(unit)) return Math.round(n * 100000);
  if (/^(k|thousand)/.test(unit)) return Math.round(n * 1000);
  return Math.round(n);
}

export function normalizePhone(phone) {
  const digits = String(phone ?? '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return digits || null;
}

export function ageText(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export const isFresh = (iso) => Date.now() - new Date(iso).getTime() < 2 * DAY;

export const rupees = (n) => (n == null ? 'unknown' : `₹${Number(n).toLocaleString('en-IN')}`);
