import { CalendarClock, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../lib/api';
import { ago, rupees } from '../lib/format';
import { Badge, LangBadge } from './ui';

const STATUS = {
  pending: { label: 'New · call the owner', tone: 'amber' },
  visit_scheduled: { label: 'Visit scheduled', tone: 'blue' },
};

/** Owners' "List another flat" requests. The team visits, then creates the listing from the request. */
export default function OwnerRequests() {
  const { data, reload } = useApi('/api/listing-requests', { interval: 15000 });
  const [busy, setBusy] = useState(null);
  const open = (data?.requests ?? []).filter((r) => STATUS[r.status]);
  if (!open.length) return null;

  async function setStatus(id, status, reason) {
    setBusy(id);
    try { await api(`/api/listing-requests/${id}/status`, { method: 'POST', body: { status, reason } }); await reload(); } finally { setBusy(null); }
  }

  function decline(r) {
    if (r.kind !== 'first') return confirm('Decline this request?') && setStatus(r.id, 'declined');
    // A new owner sees this reason on their page.
    const reason = prompt('Why are we declining? The owner will see this.', 'We could not verify ownership of this flat.');
    if (reason !== null) setStatus(r.id, 'declined', reason);
  }

  return (
    <section className="card mb-5 p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-semibold text-ink-900">Flats owners asked us to list</h2>
        <Badge tone="amber">{open.length}</Badge>
      </div>
      <p className="mt-0.5 text-[13px] text-ink-500">Visit the flat first. Then create the listing from the request, and it goes live.</p>
      <ul className="mt-4 divide-y divide-black/[.05]">
        {open.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
            <div className="min-w-[220px] flex-1">
              {r.kind === 'first' && <p className="mb-1"><Badge tone="blue">New owner · check ID and ownership on the visit</Badge></p>}
              <p className="text-[14px] font-semibold text-ink-900">
                {r.bhk} BHK · {r.area} <span className="tnum font-normal text-ink-500">· {rupees(r.rent)}{r.deposit ? ` / ${rupees(r.deposit)}` : ''}</span>
              </p>
              <p className="mt-0.5 text-[12px] text-ink-500">
                {r.ownerName || 'Owner'} · {r.ownerPhone}{r.ownerEmail ? ` · ${r.ownerEmail}` : ''} <LangBadge code={r.ownerLanguage} /> · sent {ago(r.createdAt)}
                {r.visitTime ? ` · visit: ${r.visitTime}` : ''}{r.availableFrom ? ` · free from ${r.availableFrom}` : ''}
              </p>
              {r.notes && <p className="mt-1 text-[12px] italic text-ink-500">“{r.notes}”</p>}
            </div>
            <Badge tone={STATUS[r.status].tone} dot>{STATUS[r.status].label}</Badge>
            <div className="flex gap-1.5">
              {r.status === 'pending' && (
                <button onClick={() => setStatus(r.id, 'visit_scheduled')} disabled={busy === r.id} className="btn-secondary h-8 px-3 text-[13px]"><CalendarClock size={14} />Visit fixed</button>
              )}
              <Link to={`/console/listings/new?request=${r.id}`} className="btn-primary h-8 px-3 text-[13px]"><Plus size={14} />{r.kind === 'first' ? 'Approve & list' : 'Create listing'}</Link>
              <button onClick={() => decline(r)} disabled={busy === r.id} className="btn-ghost h-8 px-2" title="Decline" aria-label="Decline"><X size={15} /></button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
