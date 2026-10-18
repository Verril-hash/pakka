import { Bot, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/api';
import { cents, dateTime, duration, maskPhone, OUTCOMES } from '../lib/format';
import { Badge, Drawer, Field, LangBadge, Skeleton, Transcript } from './ui';

const FIELD_LABELS = {
  call_outcome: 'Outcome', available: 'Still available', rent: 'Rent', deposit: 'Deposit', price_changed: 'Price changed',
  tenant_preference: 'Tenant preference', house_rules: 'House rules', tenant_question_answer: "Answer to tenant's question",
  visit_slot: 'Visit slot', is_broker: 'Owner or broker', available_from: 'Available from', other_notes: 'Other notes', language: 'Language',
};

export default function CallDrawer({ id, onClose }) {
  const { data: c, loading } = useApi(id ? `/api/calls/${id}` : null);
  const open = Boolean(id);
  const outcome = c && OUTCOMES[c.outcome];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={c ? `${c.agentName} · ${c.counterpart ?? maskPhone(c.to)}` : 'Call'}
      subtitle={c && (
        <span className="flex flex-wrap items-center gap-2">
          {outcome && <Badge tone={outcome.tone}>{outcome.label}</Badge>}
          {c.isBroker && <Badge tone="red">Broker</Badge>}
          <LangBadge code={c.language} />
          <span>{dateTime(c.createdAt)}</span>
        </span>
      )}
      width="max-w-2xl"
    >
      {loading || !c ? (
        <div className="space-y-3 p-6">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : (
        <div className="grid gap-0 md:grid-cols-[1fr_240px]">
          <div className="border-black/[.06] p-6 md:border-r">
            {c.hasRecording && (
              <div className="mb-5 rounded-lg border border-black/[.06] bg-black/[.03] p-3">
                <p className="mb-2 text-xs font-medium text-ink-500">Recording</p>
                <audio controls preload="none" className="h-9 w-full" src={`/api/calls/${c.id}/recording`} />
              </div>
            )}
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">Transcript</h3>
            <Transcript text={c.transcript} userLabel={c.agent === 'check' ? c.counterpart ?? 'Owner' : c.counterpart ?? 'Tenant'} />
          </div>
          <div className="p-6">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-500">Call</h3>
            <dl className="divide-y divide-black/[.06]">
              <Field label="Agent"><span className="inline-flex items-center gap-1.5"><Bot size={14} className="text-ink-400" />{c.agentName}</span></Field>
              <Field label="Number">{maskPhone(c.to)}</Field>
              <Field label="Duration"><span className="tnum">{duration(c.durationSec)}</span></Field>
              <Field label="Cost"><span className="tnum">{cents(c.costCents)}</span></Field>
              <Field label="Ended by">{c.hangup?.replace(/_/g, ' ') ?? '—'}</Field>
              {c.listingId && (
                <Field label="Listing">
                  <Link to={`/console/listings/${c.listingId}`} onClick={onClose} className="inline-flex items-center gap-1 text-brand-700 hover:underline"><Building2 size={13} />{c.listingId}</Link>
                </Field>
              )}
            </dl>
            {Object.keys(c.fields ?? {}).length > 0 && (
              <>
                <h3 className="mb-1 mt-6 text-xs font-semibold uppercase tracking-wider text-ink-500">Extracted by Bolna</h3>
                <dl className="divide-y divide-black/[.06]">
                  {Object.entries(c.fields).filter(([, f]) => f.value && f.value !== 'unknown').map(([k, f]) => (
                    <div key={k} className="py-2.5 text-sm">
                      <dt className="text-xs text-ink-500">{FIELD_LABELS[k] ?? k}</dt>
                      <dd className="mt-0.5 font-medium text-ink-900">{String(f.value)}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
