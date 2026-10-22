// Places one Pakka Check call with a sample listing.
// Usage: npm run call:test -- +91XXXXXXXXXX [en|hi|kn|ta]

import { bolna, assertNotProtected } from '../lib/bolna.mjs';
import { greeting } from '../agents/owner-check.mjs';

const [phone, lang = 'en'] = process.argv.slice(2);
const agentId = process.env.PAKKA_CHECK_AGENT_ID;

if (!phone?.startsWith('+')) throw new Error('Pass a phone number in +91 format');
if (!agentId) throw new Error('Run npm run agent:sync first');
assertNotProtected(agentId);

const listing = {
  owner_name: 'Gowda',
  bhk: '2',
  area: 'Brookefield',
  rent: '23,000',
  deposit: '1 lakh',
  extra_question: 'Is a small dog okay?',
};

const res = await bolna('POST', '/call', {
  agent_id: agentId,
  recipient_phone_number: phone,
  ...(process.env.PAKKA_FROM_NUMBER ? { from_phone_number: process.env.PAKKA_FROM_NUMBER } : {}),
  agent_data: { language: lang },
  user_data: { ...listing, greeting: greeting(lang, listing) },
});

console.log(`Call queued (${lang}): execution ${res.execution_id} — ${res.status}`);
