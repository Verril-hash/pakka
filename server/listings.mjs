// Listing search for the search_listings tool.

import { db } from './store.mjs';
import { ageText, isFresh, normalizePhone, parseAmount, rupees } from './util.mjs';

// Everything Pakka covers today is one cluster; a tenant asking for "Whitefield" should see all of it.
const WHITEFIELD = ['whitefield', 'itpl', 'brookefield', 'hoodi', 'kundalahalli', 'marathahalli', 'mahadevapura', 'aecs layout'];

const PET_WORDS = /\b(dog|puppy|cat|pet|pets)\b/i;
// "no pets", "don't have a dog", "without pets" — a tenant saying they have no pet.
const NO_PET = /\b(no|not|don't|dont|without|nahi)\b[^,.;]{0,20}\b(dog|puppy|cat|pets?)\b/i;

/** Last search per tenant phone, so an owner check can describe what the tenant wanted. */
export const lastSearch = new Map();

function areaScore(listing, wanted) {
  if (!wanted) return 1;
  const w = wanted.toLowerCase();
  const here = `${listing.area} ${listing.landmark}`.toLowerCase();
  if (here.includes(w) || w.includes(listing.area.toLowerCase())) return 3;
  if (WHITEFIELD.some((a) => w.includes(a))) return 1;
  return 0;
}

export function searchListings(params) {
  if (params.tenant_phone) lastSearch.set(normalizePhone(params.tenant_phone), params);
  const exact = findMatches(params, 1.1);
  if (exact.length) return { matches: exact, guidance: GUIDANCE };

  // Nothing fits exactly: offer the closest flats up to 25% over budget, labelled as such.
  const close = findMatches(params, 1.25);
  if (close.length) {
    return {
      matches: close,
      guidance:
        'No exact match. These are close options, a bit over budget. Tell the tenant honestly, say by how much, and ask if they want you to check with the owner. ' +
        GUIDANCE,
    };
  }
  return { matches: [], guidance: 'No verified flat matches yet. Tell the tenant honestly; Pakka will WhatsApp them when one fits.' };
}

const GUIDANCE = 'A match with fresh=true and open_questions=none can be booked now. Anything else needs request_owner_check first.';

function findMatches({ area, bhk, budget, tenant_type, needs }, budgetSlack) {
  const wantBhk = parseInt(bhk, 10) || null;
  const maxRent = parseAmount(budget);
  const wantsPet = PET_WORDS.test(needs ?? '') && !NO_PET.test(needs ?? '');
  const type = (tenant_type ?? '').toLowerCase();

  const matches = db.listings
    .filter((l) => l.status === 'available' && !l.isBroker)
    .filter((l) => !wantBhk || l.bhk === wantBhk)
    .filter((l) => !maxRent || l.rent <= maxRent * budgetSlack)
    .filter((l) => !(type.startsWith('bachelor') && l.tenantPreference === 'family'))
    .filter((l) => !(type.startsWith('family') && l.tenantPreference === 'bachelors'))
    .filter((l) => !(wantsPet && l.pets === 'no'))
    .map((l) => ({ l, score: areaScore(l, area) + (isFresh(l.lastConfirmedAt) ? 1 : 0) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.l.rent - b.l.rent)
    .slice(0, 3)
    .map(({ l }) => {
      const open = [];
      if (wantsPet && l.pets === 'unknown') open.push('pets not confirmed with owner');
      if (!l.visitSlots.length) open.push('no visit slot on record');
      return {
        listing_id: l.id,
        summary: `${l.bhk} BHK in ${l.area} (${l.landmark}), ${l.furnishing}`,
        rent: rupees(l.rent),
        deposit: rupees(l.deposit),
        over_budget: maxRent && l.rent > maxRent ? `${rupees(l.rent - maxRent)} over budget` : undefined,
        tenants: l.tenantPreference,
        pets: l.pets,
        parking: l.parking,
        rules: l.houseRules || 'none',
        available_from: l.availableFrom,
        visit_slots: l.visitSlots.join(', ') || 'none',
        confirmed_with_owner: ageText(l.lastConfirmedAt),
        fresh: isFresh(l.lastConfirmedAt),
        open_questions: open.length ? open.join('; ') : 'none',
      };
    });

  return matches;
}
