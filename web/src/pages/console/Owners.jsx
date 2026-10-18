import { PhoneOff, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Empty, ErrorNote, LangBadge, PageHeader, Skeleton } from '../../components/ui';
import { useApi } from '../../lib/api';
import { ago, maskPhone } from '../../lib/format';

export default function Owners() {
  const { data, error, loading } = useApi('/api/owners', { interval: 8000 });
  const owners = data?.owners ?? [];

  return (
    <>
      <PageHeader title="Owners" description="People Pakka calls. Each one agreed to check-in calls when their flat was verified." />
      <ErrorNote error={error} />
      <div className="card overflow-hidden">
        {loading && !data ? (
          <div className="space-y-2 p-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : owners.length === 0 ? (
          <Empty icon={Users} title="No owners yet" />
        ) : (
          <>
          {/* Phone: cards */}
          <ul className="divide-y divide-black/[.05] md:hidden">
            {owners.map((o) => (
              <li key={`m-${o.phone}-${o.name}`} className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-black/[.05] text-sm font-semibold text-ink-500">{o.name?.[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink-900">{o.name}</p>
                    <p className="tnum text-[12px] text-ink-400">{maskPhone(o.phone)}</p>
                  </div>
                  {o.isBroker ? <Badge tone="red">Broker</Badge> : o.doNotCall ? <Badge tone="gray">Do not call</Badge> : <Badge tone="green" dot>Active</Badge>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <LangBadge code={o.language} />
                  {o.listings.map((l) => (
                    <Link key={l.id} to={`/console/listings/${l.id}`} className={`rounded-full px-2.5 py-[3px] text-[12px] ${l.status === 'available' ? 'bg-brand-600/10 text-brand-700' : 'bg-black/[.04] text-ink-400 line-through'}`}>
                      {l.bhk} BHK · {l.area}
                    </Link>
                  ))}
                </div>
                <p className="mt-2 text-[12px] text-ink-400">{o.calls ? `${o.answered}/${o.calls} calls answered · last ${ago(o.lastCallAt)}` : 'No calls yet'}</p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Owner</th>
                <th className="th">Language</th>
                <th className="th">Flats</th>
                <th className="th">Calls answered</th>
                <th className="th">Last call</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((o) => (
                <tr key={`${o.phone}-${o.name}`}>
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-black/[.05] text-sm font-semibold text-ink-500">{o.name?.[0]}</span>
                      <div>
                        <p className="font-medium text-ink-900">{o.name}</p>
                        <p className="tnum text-xs text-ink-500">{maskPhone(o.phone)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td"><LangBadge code={o.language} /></td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1.5">
                      {o.listings.map((l) => (
                        <Link key={l.id} to={`/console/listings/${l.id}`} className={`rounded-md px-2 py-0.5 text-xs ring-1 ring-inset ${l.status === 'available' ? 'bg-white text-ink-700 ring-black/[.06] hover:ring-brand-300' : 'bg-black/[.03] text-ink-400 ring-black/[.06] line-through'}`}>
                          {l.bhk} BHK · {l.area}
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td className="td tnum">{o.calls ? `${o.answered} / ${o.calls}` : '—'}</td>
                  <td className="td">{ago(o.lastCallAt)}</td>
                  <td className="td">
                    {o.isBroker ? <Badge tone="red">Broker</Badge> : o.doNotCall ? <Badge tone="gray"><PhoneOff size={12} />Do not call</Badge> : <Badge tone="green" dot>Active</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          </>
        )}
      </div>
    </>
  );
}
