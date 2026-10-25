// Sets up Pakka's WhatsApp on Vobiz. Needs VOBIZ_AUTH_ID and VOBIZ_AUTH_TOKEN in .env.
//   npm run wa:setup -- channel            find the Pakka channel; saves VOBIZ_WA_CHANNEL_ID / VOBIZ_WA_WABA_ID to .env
//   npm run wa:setup -- templates          submit the templates to Meta (once), then show their status
//   npm run wa:setup -- status             show template approval status
//   npm run wa:setup -- webhook            subscribe PUBLIC_URL/webhooks/whatsapp; saves VOBIZ_WA_WEBHOOK_SECRET
//   npm run wa:setup -- test +91XXXXXXXXXX send the missed_call template as a test

import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { sendTemplate, TEMPLATES, vobizWa } from '../server/whatsapp.mjs';

const [step, arg] = process.argv.slice(2);
const list = (d) => (Array.isArray(d) ? d : d?.data ?? d?.items ?? d?.channels ?? d?.templates ?? []);

async function setEnv(key, value) {
  const env = await readFile('.env', 'utf8');
  const line = `${key}=${value}`;
  await writeFile('.env', env.match(new RegExp(`^${key}=.*$`, 'm')) ? env.replace(new RegExp(`^${key}=.*$`, 'm'), line) : `${env.trimEnd()}\n${line}\n`);
  process.env[key] = value;
}

async function showTemplates() {
  const rows = list(await vobizWa('GET', `/channels/${process.env.VOBIZ_WA_CHANNEL_ID}/templates`));
  for (const t of rows) console.log(`${(t.name ?? '').padEnd(22)} ${t.status ?? t.approval_status ?? '?'}${t.rejected_reason ? ` (${t.rejected_reason})` : ''}`);
  if (!rows.length) console.log('(no templates yet)');
}

if (step === 'channel') {
  const rows = list(await vobizWa('GET', '/channels'));
  const ch = rows.find((c) => String(c.phone_number ?? '').replace(/\D/g, '').endsWith('6624837159')) ?? rows[0];
  if (!ch) throw new Error('No WhatsApp channel found on this Vobiz account.');
  console.log(`Channel: ${ch.display_name ?? ch.name} · ${ch.phone_number} · ${ch.status} · id ${ch.id} · waba ${ch.waba_id}`);
  await setEnv('VOBIZ_WA_CHANNEL_ID', ch.id);
  await setEnv('VOBIZ_WA_WABA_ID', ch.waba_id);
  console.log('Saved VOBIZ_WA_CHANNEL_ID and VOBIZ_WA_WABA_ID to .env');
} else if (step === 'templates') {
  for (const t of TEMPLATES) {
    try {
      await vobizWa('POST', `/channels/${process.env.VOBIZ_WA_CHANNEL_ID}/templates`, {
        name: t.name,
        category: 'UTILITY',
        language: 'en',
        components: [{ type: 'BODY', text: t.body, example: { body_text: [t.example] } }],
      });
      console.log(`submitted ${t.name}`);
    } catch (err) {
      console.log(`${t.name}: ${err.message.slice(0, 220)}`);
    }
  }
  await showTemplates();
} else if (step === 'status') {
  await showTemplates();
} else if (step === 'webhook') {
  if (!process.env.PUBLIC_URL) throw new Error('Set PUBLIC_URL in .env');
  const secret = randomBytes(24).toString('hex');
  const out = await vobizWa('POST', '/webhooks', { url: `${process.env.PUBLIC_URL}/webhooks/whatsapp`, secret, events: ['message.inbound', 'message.status'] });
  await setEnv('VOBIZ_WA_WEBHOOK_SECRET', secret);
  console.log(`Webhook ${out.id ?? ''} → ${process.env.PUBLIC_URL}/webhooks/whatsapp (secret saved to .env)`);
} else if (step === 'test') {
  if (!arg?.startsWith('+')) throw new Error('Give a number like +91XXXXXXXXXX');
  console.log((await sendTemplate(arg, 'missed_call', ['there'])) ? 'Sent. Check WhatsApp.' : 'Not sent (see the error above, or templates not approved yet).');
} else {
  console.log('Usage: npm run wa:setup -- channel | templates | status | webhook | test +91XXXXXXXXXX');
}
