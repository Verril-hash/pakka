// Minimal Bolna API client with a hard guard: Pakka scripts must never modify Avaran's agent.

const API = 'https://api.bolna.ai';
const KEY = process.env.BOLNA_API_KEY;
const PROTECTED = new Set([process.env.AVARAN_AGENT_ID_DO_NOT_TOUCH].filter(Boolean));

if (!KEY) throw new Error('BOLNA_API_KEY missing from .env');

export function assertNotProtected(agentId) {
  if (PROTECTED.has(agentId)) {
    throw new Error(`Refusing to touch protected agent ${agentId} (Avaran)`);
  }
}

export async function bolna(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data;
}
