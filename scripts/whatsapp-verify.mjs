// One-time helper to register Pakka's US number (+1 662-483-7159) as its WhatsApp sender.
// Meta verifies a number by calling it and reading out a code. Pakka Line would talk over that, so for the
// few minutes of verification the number points at a silent listener agent, and we read the code from the call.
//
//   npm run wa:verify -- setup   create/update the listener and point the number at it
//   npm run wa:verify -- code    show the latest verification call: transcript, digits, recording link
//   npm run wa:verify -- done    point the number back at Pakka Line

import { readFile, writeFile } from 'node:fs/promises';
import { assertNotProtected, bolna } from '../lib/bolna.mjs';
import { agentConfig as lineConfig } from '../agents/pakka-line.mjs';

const NUMBER_ID = process.env.PAKKA_FROM_NUMBER_ID;
const LINE_ID = process.env.PAKKA_LINE_AGENT_ID;
const step = process.argv[2];
if (!NUMBER_ID || !LINE_ID) throw new Error('Set PAKKA_FROM_NUMBER_ID and PAKKA_LINE_AGENT_ID in .env');

const SILENT = 'You are on an automated verification call. Stay completely silent: never say anything, never ask anything, never end the call.';

function listenerConfig() {
  const cfg = structuredClone(lineConfig);
  cfg.agent_name = 'Pakka WhatsApp verify (temporary)';
  cfg.agent_welcome_message = 'Hello.';
  cfg.webhook_url = null;
  const task = cfg.tasks[0];
  task.tools_config.api_tools = null;
  delete task.tools_config.multilingual_config;
  Object.assign(task.task_config, {
    hangup_after_silence: 60,
    call_terminate: 180,
    hangup_after_LLMCall: false,
    check_if_user_online: false,
    use_fillers: false,
    call_cancellation_prompt: 'The call is never complete. Never end it.',
    call_hangup_message: '',
  });
  return cfg;
}

async function linkTo(agentId) {
  assertNotProtected(agentId);
  await bolna('POST', '/inbound/setup', { agent_id: agentId, phone_number_id: NUMBER_ID });
}

if (step === 'setup') {
  const body = { agent_config: listenerConfig(), agent_prompts: { task_1: { system_prompt: SILENT } } };
  let id = process.env.PAKKA_VERIFY_AGENT_ID;
  if (id) {
    assertNotProtected(id);
    await bolna('PUT', `/v2/agent/${id}`, body);
  } else {
    ({ agent_id: id } = await bolna('POST', '/v2/agent', body));
    assertNotProtected(id);
    await writeFile('.env', `${(await readFile('.env', 'utf8')).trimEnd()}\nPAKKA_VERIFY_AGENT_ID=${id}\n`);
  }
  await linkTo(id);
  console.log(`Listener ready (${id}). +1 662-483-7159 now goes to it. Request the code by voice call in Meta, then run: npm run wa:verify -- code`);
} else if (step === 'code') {
  const id = process.env.PAKKA_VERIFY_AGENT_ID;
  if (!id) throw new Error('Run setup first');
  const r = await bolna('GET', `/v2/agent/${id}/executions?page_size=1`);
  const e = (r.data ?? r)[0];
  if (!e) throw new Error('No call yet. Ask Meta to call the number, then try again.');
  const exec = await bolna('GET', `/executions/${e.id}`);
  const heard = (exec.transcript ?? '').split('\n').filter((l) => l.startsWith('user:')).map((l) => l.slice(5).trim()).join(' ');
  console.log(`Call at ${exec.created_at} · status ${exec.status}`);
  console.log(`Heard: ${heard || '(nothing transcribed)'}`);
  console.log(`Digits: ${(heard.match(/\d/g) ?? []).join('') || '(none; check the recording)'}`);
  console.log(`Recording: ${exec.telephony_data?.recording_url ?? '(not available yet)'}`);
} else if (step === 'done') {
  await linkTo(LINE_ID);
  console.log('+1 662-483-7159 goes to Pakka Line again.');
} else {
  console.log('Usage: npm run wa:verify -- setup | code | done');
}
