import { CalendarCheck, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Empty, ErrorNote, PageHeader, Skeleton } from '../../components/ui';
import { useApi } from '../../lib/api';
import { dateTime, maskPhone } from '../../lib/format';

export default function Visits() {
  const { data, error, loading } = useApi('/api/visits', { interval: 6000 });
  const byId = Object.fromEntries((data?.listings ?? []).map((l) => [l.id, l]));
  const visits = data?.visits ?? [];

  return (
    <>
      <PageHeader title="Visits" description="Flat visits booked by Pakka Line, with slots the owners gave on the phone." />
      <ErrorNote error={error} />
      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : visits.length === 0 ? (
        <div className="card"><Empty icon={CalendarCheck} title="No visits booked yet">When a tenant says yes to a slot on the phone, it lands here.</Empty></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visits.map((v) => {
            const l = byId[v.listingId] ?? {};
            return (
              <div key={v.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600"><CalendarCheck size={20} /></span>
                    <div>
                      <p className="font-semibold text-ink-900">{v.slot}</p>
                      <p className="text-xs text-ink-500">Booked {dateTime(v.bookedAt)}</p>
                    </div>
                  </div>
                  <Badge tone="violet">Scheduled</Badge>
                </div>
                <div className="mt-4 space-y-2 border-t border-black/[.06] pt-4 text-sm">
                  <p className="flex justify-between"><span className="text-ink-500">Tenant</span><span className="font-medium text-ink-900">{v.tenantName || '—'} · <span className="tnum font-normal text-ink-500">{maskPhone(v.tenantPhone)}</span></span></p>
                  <p className="flex justify-between"><span className="text-ink-500">Flat</span>
                    <Link to={`/console/listings/${v.listingId}`} className="font-medium text-brand-700 hover:underline">{l.bhk} BHK · {l.area}</Link>
                  </p>
                  <p className="flex justify-between"><span className="text-ink-500">Owner</span><span className="font-medium text-ink-900">{l.ownerName}</span></p>
                  {l.landmark && <p className="flex items-center gap-1.5 pt-1 text-xs text-ink-500"><MapPin size={13} />{l.landmark}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
