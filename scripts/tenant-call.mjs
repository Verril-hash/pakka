// Starts a Pakka Line intake call to a "tenant" (stand-in for an inbound call until Pakka has a number).
// The Pakka server must be running and reachable at PUBLIC_URL for the mid-call functions.
// Usage: npm run tenant:call -- +91XXXXXXXXXX [en|hi|kn|ta] [name]

import { startTenantCall } from '../server/checks.mjs';

const [phone, lang = 'en', name = 'there'] = process.argv.slice(2);
if (!phone?.startsWith('+')) throw new Error('Pass a phone number in +91 format');

const executionId = await startTenantCall({ mode: 'intake', phone, name, lang });
console.log(`Tenant intake call queued (${lang}): execution ${executionId}`);
