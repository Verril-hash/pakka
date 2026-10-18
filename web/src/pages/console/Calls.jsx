import { Download, PhoneCall, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import CallDrawer from '../../components/CallDrawer';
import { Badge, Empty, ErrorNote, LangBadge, PageHeader, Skeleton, Tabs } from '../../components/ui';
import { useApi } from '../../lib/api';
import { cents, dateTime, duration, maskPhone, OUTCOMES } from '../../lib/format';

const STATUS_TONE = { completed: 'green', 'in-progress': 'blue', ringing: 'blue', queued: 'gray', 'no-answer': 'amber', busy: 'amber', failed: 'red', error: 'red' };

export default function Calls() {
  const { data, error, loading, reload } = useApi('/api/calls', { interval: 15000 });
  const [tab, setTab] = useState('all');
  const [openCall, setOpenCall] = useState(null);

  const calls = data?.calls ?? [];
  const rows = calls.filter((c) => tab === 'all' || c.agent === tab);
  const totalSec = rows.reduce((n, c) => n + c.durationSec, 0);
  const totalCost = rows.reduce((n, c) => n + (c.costCents || 0), 0);

  function exportCsv() {
    const cols = ['id', 'agentName', 'createdAt', 'status', 'outcome', 'language', 'durationSec', 'costCents', 'listingId'];
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'pakka-calls.csv' }).click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Calls"
        description="Every voice call made by Pakka's agents on Bolna, with transcripts, recordings and what was extracted."
        actions={<><button onClick={reload} className="btn-secondary"><RefreshCw size={15} /> Refresh</button><button onClick={exportCsv} className="btn-secondary"><Download size={15} /> Export</button></>}
      />
      <ErrorNote error={error} />

      <div className="mb-4 grid grid-cols-3 gap-2 md:gap-4">
        <div className="card px-4 py-3"><p className="text-xs text-ink-500">Calls</p><p className="tnum text-xl font-semibold">{rows.length}</p></div>
        <div className="card px-4 py-3"><p className="text-xs text-ink-500">Talk time</p><p className="tnum text-xl font-semibold">{duration(totalSec)}</p></div>
        <div className="card px-4 py-3"><p className="text-xs text-ink-500">Cost</p><p className="tnum text-xl font-semibold">{cents(totalCost)}</p></div>
      </div>

      <div className="card">
        <div className="px-4 pt-3">
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'all', label: 'All calls', count: calls.length },
            { value: 'check', label: 'Pakka Check · owners', count: calls.filter((c) => c.agent === 'check').length },
            { value: 'line', label: 'Pakka Line · tenants', count: calls.filter((c) => c.agent === 'line').length },
          ]} />
        </div>
        {loading && !data ? (
          <div className="space-y-2 p-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
        ) : rows.length === 0 ? (
          <Empty icon={PhoneCall} title="No calls yet" />
        ) : (
          <>
          {/* Phone: cards */}
          <ul className="divide-y divide-black/[.05] md:hidden">
            {rows.map((c) => {
              const o = OUTCOMES[c.outcome];
              return (
                <li key={c.id} className="tr-link px-4 py-3.5" onClick={() => setOpenCall(c.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-ink-900">{c.counterpart ?? maskPhone(c.to)}</p>
                      <p className="text-[12px] text-ink-400">{c.agentName} · {dateTime(c.createdAt)}</p>
                    </div>
                    <div className="flex-none text-right">
                      <p className="tnum text-[14px] font-medium text-ink-900">{duration(c.durationSec)}</p>
                      <p className="tnum text-[12px] text-ink-400">{cents(c.costCents)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {o && <Badge tone={o.tone}>{o.label}</Badge>}
                    {c.isBroker && <Badge tone="red">Broker</Badge>}
                    <LangBadge code={c.language} native={false} />
                    {c.status !== 'completed' && <Badge tone={STATUS_TONE[c.status] ?? 'gray'} dot>{c.status}</Badge>}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Call</th>
                  <th className="th">With</th>
                  <th className="th">Language</th>
                  <th className="th">Outcome</th>
                  <th className="th">Duration</th>
                  <th className="th">Cost</th>
                  <th className="th">Status</th>
                  <th className="th">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const o = OUTCOMES[c.outcome];
                  return (
                    <tr key={c.id} className="tr-link" onClick={() => setOpenCall(c.id)}>
                      <td className="td">
                        <p className="font-medium text-ink-900">{c.agentName}</p>
                        <p className="font-mono text-[11px] text-ink-400">{c.id.slice(0, 8)}</p>
                      </td>
                      <td className="td">
                        <p className="text-ink-900">{c.counterpart ?? '—'}</p>
                        <p className="tnum text-xs text-ink-500">{maskPhone(c.to)}</p>
                      </td>
                      <td className="td"><LangBadge code={c.language} native={false} /></td>
                      <td className="td">
                        <div className="flex gap-1.5">
                          {o ? <Badge tone={o.tone}>{o.label}</Badge> : <span className="text-ink-400">—</span>}
                          {c.isBroker && <Badge tone="red">Broker</Badge>}
                        </div>
                      </td>
                      <td className="td tnum">{duration(c.durationSec)}</td>
                      <td className="td tnum">{cents(c.costCents)}</td>
                      <td className="td"><Badge tone={STATUS_TONE[c.status] ?? 'gray'} dot>{c.status}</Badge></td>
                      <td className="td">{dateTime(c.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
      <CallDrawer id={openCall} onClose={() => setOpenCall(null)} />
    </>
  );
}
