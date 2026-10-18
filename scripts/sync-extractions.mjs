// Recreates the "Listing Check" extraction category on the Pakka Check agent,
// then tests it against a past call's transcript if an execution id is given.
// Usage: npm run extractions:sync [-- <execution_id>]

import { bolna, assertNotProtected } from '../lib/bolna.mjs';
import { category, dispositions } from '../agents/owner-check-extractions.mjs';

const agentId = process.env.PAKKA_CHECK_AGENT_ID;
if (!agentId) throw new Error('Run npm run agent:sync first');
assertNotProtected(agentId);

const existing = await bolna('GET', `/agent/${agentId}/extraction-categories`);
const list = Array.isArray(existing) ? existing : existing.data ?? existing.categories ?? [];
for (const c of list.filter((c) => c.name === category.name)) {
  if (c.agent_id && c.agent_id !== agentId) continue;
  await bolna('DELETE', `/extraction-categories/${c.id}`);
  console.log(`Removed old category ${c.id}`);
}

const created = await bolna('POST', `/agent/${agentId}/extraction-categories`, category);
const categoryId = created.id ?? created.category_id ?? created.data?.id;
await bolna('POST', '/dispositions/bulk', {
  agent_id: agentId,
  dispositions: dispositions.map((d) => ({ ...d, category_id: categoryId, model: category.model })),
});
console.log(`Created "${category.name}" (${categoryId}) with ${dispositions.length} extractions`);

const executionId = process.argv[2];
if (executionId) {
  const { transcript } = await bolna('GET', `/executions/${executionId}`);
  const result = await bolna('POST', `/v2/agent/${agentId}/dispositions/test`, { transcript });
  const fields = (result.extracted_data ?? result)[category.name] ?? {};
  for (const [key, v] of Object.entries(fields)) {
    console.log(`${key.padEnd(24)} ${v.objective ?? v.subjective ?? ''}  (${v.confidence_label})`);
  }
}
