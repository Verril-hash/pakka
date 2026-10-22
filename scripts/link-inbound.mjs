// Routes incoming calls on Pakka's number (PAKKA_FROM_NUMBER_ID) to the Pakka Line agent.
// Usage: npm run inbound:link

import { assertNotProtected, bolna } from '../lib/bolna.mjs';

const agentId = process.env.PAKKA_LINE_AGENT_ID;
const numberId = process.env.PAKKA_FROM_NUMBER_ID;
if (!agentId || !numberId) throw new Error('Set PAKKA_LINE_AGENT_ID and PAKKA_FROM_NUMBER_ID in .env');
assertNotProtected(agentId);

await bolna('POST', '/inbound/setup', { agent_id: agentId, phone_number_id: numberId });
const numbers = await bolna('GET', '/phone-numbers/all');
const n = (Array.isArray(numbers) ? numbers : numbers.data ?? []).find((x) => x.id === numberId);
console.log(`${n?.phone_number} → agent ${n?.agent_id === agentId ? 'Pakka Line ✓' : n?.agent_id ?? 'none'}`);
