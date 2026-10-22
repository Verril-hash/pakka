import { Building2, Download, Map as MapIcon, Plus, Rows3, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import ListingStatusBadge from '../../components/ListingStatusBadge';
import OwnerRequests from '../../components/OwnerRequests';
import MapView, { pinLabel } from '../../components/MapView';
import { Badge, Empty, ErrorNote, LangBadge, PageHeader, Skeleton, Tabs } from '../../components/ui';
import { useApi } from '../../lib/api';
import { ago, lastCall, listingStatus, rupees } from '../../lib/format';

function toCsv(rows) {
  const cols = ['id', 'bhk', 'area', 'rent', 'deposit', 'ownerName', 'ownerLanguage', 'status', 'lastConfirmedAt', 'verifiedBy'];
  return [cols.join(','), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
}

export default function Listings() {
  const { data, error, loading } = useApi('/api/listings', { interval: 5000 });
  const { live } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('all');
  const [view, setView] = useState('table');
  const [bhk, setBhk] = useState('');
  const q = params.get('q') ?? '';
  const navigate = useNavigate();

  const callingIds = useMemo(() => {
    const ids = new Set();
    for (const s of live?.sessions ?? []) for (const c of s.checks) if (c.state === 'calling') ids.add(c.listingId);
    return ids;
  }, [live]);

  const rows = (data?.listings ?? []).map((l) => ({ ...l, view: listingStatus(l, callingIds) }));
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.view]: (acc[r.view] ?? 0) + 1 }), {});
  const filtered = rows
    .filter((r) => tab === 'all' || r.view === tab || (tab === 'confirmed' && r.view === 'calling'))
    .filter((r) => !bhk || String(r.bhk) === bhk)
    .filter((r) => !q || `${r.id} ${r.area} ${r.landmark} ${r.ownerName}`.toLowerCase().includes(q.toLowerCase()));

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([toCsv(filtered)], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: 'pakka-listings.csv' }).click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title="Listings"
        description="Every flat here was verified in person once. Pakka Check keeps it current by calling the owner."
        actions={
          <>
            <button onClick={exportCsv} className="btn-secondary"><Download size={15} /> Export</button>
            <Link to="/console/listings/new" className="btn-primary"><Plus size={16} /> Add verified listing</Link>
          </>
        }
      />
      <ErrorNote error={error} />
      <OwnerRequests />

      <div className="card">
        <div className="px-4 pt-3">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'all', label: 'All', count: rows.length },
              { value: 'confirmed', label: 'Current', count: (counts.confirmed ?? 0) + (counts.calling ?? 0) },
              { value: 'stale', label: 'Needs re-check', count: counts.stale ?? 0 },
              { value: 'rented', label: 'Rented', count: counts.rented ?? 0 },
              { value: 'removed', label: 'Removed', count: counts.removed ?? 0 },
              { value: 'broker', label: 'Broker', count: counts.broker ?? 0 },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-black/[.06] px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input className="input pl-9" placeholder="Search by area, owner or ID" value={q} onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {})} />
          </div>
          <select className="input w-auto" value={bhk} onChange={(e) => setBhk(e.target.value)}>
            <option value="">Any BHK</option>
            {[1, 2, 3].map((n) => <option key={n} value={n}>{n} BHK</option>)}
          </select>
          <div className="ml-auto flex rounded-lg border border-black/[.06] p-0.5">
            <button onClick={() => setView('table')} className={`btn h-7 px-2.5 text-xs ${view === 'table' ? 'bg-black/[.05] text-ink-900' : 'text-ink-500'}`}><Rows3 size={14} /> Table</button>
            <button onClick={() => setView('map')} className={`btn h-7 px-2.5 text-xs ${view === 'map' ? 'bg-black/[.05] text-ink-900' : 'text-ink-500'}`}><MapIcon size={14} /> Map</button>
          </div>
        </div>

        {view === 'map' ? (
          <div className="p-3">
            <MapView className="h-[520px]" onSelect={(id) => navigate(`/console/listings/${id}`)}
              pins={filtered.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, status: l.view, label: pinLabel(l), tooltip: `${l.id} · ${l.area}` }))} />
          </div>
        ) : loading && !data ? (
          <div className="space-y-2 p-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <Empty icon={Building2} title="No listings match" action={<Link to="/console/listings/new" className="btn-primary"><Plus size={16} />Add verified listing</Link>}>
            Try another filter, or add a flat you've verified in person.
          </Empty>
        ) : (
          <>
          {/* Phone: cards */}
          <ul className="divide-y divide-black/[.05] md:hidden">
            {filtered.map((l) => (
              <li key={l.id} className="tr-link flex items-start gap-3 px-4 py-4" onClick={() => navigate(`/console/listings/${l.id}`)}>
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-brand-600/10 text-[12px] font-semibold text-brand-700">{l.bhk}BHK</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-ink-900">{l.area}</p>
                      <p className="truncate text-[12px] text-ink-400">{l.id} · {l.landmark}</p>
                    </div>
                    <p className="tnum flex-none text-[15px] font-semibold text-ink-900">{rupees(l.rent)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <ListingStatusBadge status={l.view} />
                    <LangBadge code={l.ownerLanguage} />
                    {l.pets === 'yes' && <Badge tone="violet">Pets ok</Badge>}
                  </div>
                  <p className="mt-2 text-[12px] text-ink-400">{l.ownerName} · confirmed {ago(lastCall(l) ?? l.lastConfirmedAt)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Listing</th>
                  <th className="th">Rent</th>
                  <th className="th">Owner</th>
                  <th className="th">Status</th>
                  <th className="th">Last confirmed</th>
                  <th className="th">Tenants</th>
                  <th className="th">Verified by</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="tr-link" onClick={() => navigate(`/console/listings/${l.id}`)}>
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-700">{l.bhk}BHK</span>
                        <div>
                          <p className="font-medium text-ink-900">{l.area}</p>
                          <p className="text-xs text-ink-500">{l.id} · {l.landmark}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <p className="tnum font-medium text-ink-900">{rupees(l.rent)}</p>
                      <p className="tnum text-xs text-ink-500">Deposit {rupees(l.deposit)}</p>
                    </td>
                    <td className="td">
                      <p className="font-medium text-ink-900">{l.ownerName}</p>
                      <div className="mt-0.5"><LangBadge code={l.ownerLanguage} /></div>
                    </td>
                    <td className="td"><ListingStatusBadge status={l.view} /></td>
                    <td className="td">
                      <p className="text-ink-900">{ago(lastCall(l) ?? l.lastConfirmedAt)}</p>
                      <p className="text-xs text-ink-500">{l.history?.length ? `By call · ${l.history.length} call${l.history.length > 1 ? 's' : ''}` : 'At verification'}</p>
                    </td>
                    <td className="td capitalize">{l.tenantPreference === 'any' ? 'Anyone' : l.tenantPreference}{l.pets === 'yes' && <Badge tone="violet" className="ml-2">Pets ok</Badge>}</td>
                    <td className="td"><Badge tone="green">✓ {l.verifiedBy}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
        <div className="flex items-center justify-between px-4 py-3 text-xs text-ink-500">
          <span>Showing {filtered.length} of {rows.length} listings</span>
          <span>Auto-refreshing</span>
        </div>
      </div>
    </>
  );
}
