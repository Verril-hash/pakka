import { Inbox } from 'lucide-react';
import { useState } from 'react';
import CallDrawer from '../../components/CallDrawer';
import RequestTimeline from '../../components/RequestTimeline';
import { Badge, Drawer, Empty, ErrorNote, LangBadge, PageHeader, Skeleton, Tabs } from '../../components/ui';
import { useApi } from '../../lib/api';
import { ago, dateTime, maskPhone } from '../../lib/format';

const STATE = {
  checking: { label: 'Calling owners', tone: 'blue', pulse: true },
  calling_back: { label: 'Calling tenant back', tone: 'blue', pulse: true },
  done: { label: 'Completed', tone: 'green' },
};

export default function Requests() {
  const { data, error, loading } = useApi('/api/requests', { interval: 4000 });
  const [tab, setTab] = useState('tenant');
  const [openId, setOpenId] = useState(null);
  const [openCall, setOpenCall] = useState(null);

  const all = data?.requests ?? [];
  const rows = all.filter((r) => (tab === 'tenant' ? r.kind !== 'recheck' : r.kind === 'recheck'));
  const open = all.find((r) => r.id === openId);
  const visitFor = (r) => data?.visits?.find((v) => v.tenantPhone && v.tenantPhone === r.tenantPhone && v.bookedAt >= r.createdAt);

  return (
    <>
      <PageHeader title="Tenant requests" description="Every time a tenant asks Pakka for a flat: who Pakka called, what owners said, and whether a visit got booked." />
      <ErrorNote error={error} />
      <div className="card">
        <div className="px-4 pt-3">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'tenant', label: 'Tenant requests', count: all.filter((r) => r.kind !== 'recheck').length },
            { value: 'recheck', label: 'Routine re-checks', count: all.filter((r) => r.kind === 'recheck').length },
          ]} />
        </div>
        {loading && !data ? (
          <div className="space-y-2 p-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <Empty icon={Inbox} title="Nothing here yet">Requests appear as soon as a tenant talks to Pakka Line.</Empty>
        ) : (
          <>
          {/* Phone: cards */}
          <ul className="divide-y divide-black/[.05] md:hidden">
            {rows.map((r) => {
              const s = STATE[r.state] ?? STATE.done;
              const visit = visitFor(r);
              return (
                <li key={r.id} className="tr-link px-4 py-4" onClick={() => setOpenId(r.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold text-ink-900">{r.tenantName}</p>
                    <span className="flex-none text-[12px] text-ink-400">{ago(r.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-500">{r.requirement || 'Looking for a flat'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone={s.tone} dot pulse={s.pulse}>{s.label}</Badge>
                    {visit && <Badge tone="violet">{visit.slot}</Badge>}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">{tab === 'tenant' ? 'Tenant' : 'Requested by'}</th>
                  <th className="th">Looking for</th>
                  <th className="th">Owners called</th>
                  <th className="th">Status</th>
                  <th className="th">Visit</th>
                  <th className="th">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = STATE[r.state] ?? STATE.done;
                  const visit = visitFor(r);
                  return (
                    <tr key={r.id} className="tr-link" onClick={() => setOpenId(r.id)}>
                      <td className="td">
                        <p className="font-medium text-ink-900">{r.tenantName}</p>
                        {r.tenantPhone && <p className="tnum text-xs text-ink-500">{maskPhone(r.tenantPhone)}</p>}
                      </td>
                      <td className="td max-w-[320px] truncate">{r.requirement || '—'}</td>
                      <td className="td">
                        <div className="flex gap-1.5">
                          {r.checks.map((c) => {
                            const l = data.listings.find((x) => x.id === c.listingId);
                            return <span key={c.listingId} className="rounded-md bg-black/[.05] px-2 py-0.5 text-xs text-ink-500">{l?.ownerName ?? c.listingId}</span>;
                          })}
                        </div>
                      </td>
                      <td className="td"><Badge tone={s.tone} dot pulse={s.pulse}>{s.label}</Badge></td>
                      <td className="td">{visit ? <Badge tone="violet">{visit.slot}</Badge> : <span className="text-ink-400">—</span>}</td>
                      <td className="td">{ago(r.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      <Drawer
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        title={open ? (open.kind === 'recheck' ? 'Routine re-check' : `${open.tenantName}'s request`) : ''}
        subtitle={open && <span className="flex items-center gap-2">{dateTime(open.createdAt)}{open.tenantLanguage && <LangBadge code={open.tenantLanguage} />}</span>}
      >
        {open && <div className="p-6"><RequestTimeline session={open} listings={data.listings} visits={data.visits} onOpenCall={setOpenCall} /></div>}
      </Drawer>
      <CallDrawer id={openCall} onClose={() => setOpenCall(null)} />
    </>
  );
}
