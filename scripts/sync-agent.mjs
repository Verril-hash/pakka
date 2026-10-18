// Creates a Pakka agent on Bolna, or updates it if its id is already in .env.
// Usage: npm run agent:sync -- [check|line]   (default: check)

import { readFile, writeFile } from 'node:fs/promises';
import { bolna, assertNotProtected } from '../lib/bolna.mjs';

const AGENTS = {
  check: { module: '../agents/owner-check.mjs', env: 'PAKKA_CHECK_AGENT_ID' },
  line: { module: '../agents/pakka-line.mjs', env: 'PAKKA_LINE_AGENT_ID' },
};

const which = process.argv[2] ?? 'check';
const spec = AGENTS[which];
if (!spec) throw new Error(`Unknown agent "${which}". Use: ${Object.keys(AGENTS).join(', ')}`);

const { agentConfig, agentPrompts, agentName, assertReady } = await import(spec.module);
assertReady?.();

const existing = process.env[spec.env];
const body = { agent_config: agentConfig, agent_prompts: agentPrompts };

if (existing) {
  assertNotProtected(existing);
  await bolna('PUT', `/v2/agent/${existing}`, body);
  console.log(`Updated ${agentName}: ${existing}`);
} else {
  const { agent_id } = await bolna('POST', '/v2/agent', body);
  assertNotProtected(agent_id);
  const env = await readFile('.env', 'utf8');
  await writeFile('.env', `${env.trimEnd()}\n${spec.env}=${agent_id}\n`);
  console.log(`Created ${agentName}: ${agent_id} (saved to .env)`);
}
