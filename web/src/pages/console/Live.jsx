import { PhoneCall, Radio, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import CallDrawer from '../../components/CallDrawer';
import MapView, { pinLabel } from '../../components/MapView';
import RequestTimeline from '../../components/RequestTimeline';
import { Badge, Card, Empty, LangBadge, PageHeader, Waveform } from '../../components/ui';
import { api } from '../../lib/api';
import { LANGUAGES, LISTING_STATUS, PIN_COLORS, ago, listingStatus, time } from '../../lib/format';

const LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export default function Live() {
  const { live, reloadLive } = useOutletContext();
  const [openCall, setOpenCall] = useState(null);
  const navigate = useNavigate();

  const sessions = live?.sessions ?? [];
  const listings = live?.listings ?? [];
  const byId = Object.fromEntries(listings.map((l) => [l.id, l]));

  const callingIds = useMemo(() => {
    const ids = new Set();
    for (const s of sessions) for (const c of s.checks) if (c.state === 'calling') ids.add(c.listingId);
    return ids;
  }, [sessions]);

  const activeCalls = [
    ...sessions.flatMap((s) => s.checks.filter((c) => c.state === 'calling').map((c) => ({ kind: 'owner', s, c, l: byId[c.listingId] }))),
    ...sessions.filter((s) => s.state === 'calling_back').map((s) => ({ kind: 'tenant', s })),
  ];
  const current = [...sessions].reverse().find((s) => s.kind !== 'recheck') ?? sessions.at(-1);

  const pins = listings.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, status: listingStatus(l, callingIds), label: pinLabel(l), tooltip: `${l.id} · ${l.area}` }));

  async function reset() {
    if (!confirm('Reset listings, requests, calls and visits to the demo starting point?')) return;
    await api('/admin/reset', { method: 'POST' });
    reloadLive();
  }

  return (
    <>
      <PageHeader
        title="Live"
        description="Calls happening right now, and every step of the latest tenant request."
        actions={LOCAL && <button onClick={reset} className="btn-secondary"><RotateCcw size={15} /> Reset demo data</button>}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activeCalls.length === 0 && (
          <div className="card flex items-center gap-4 px-5 py-4 md:col-span-2 xl:col-span-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-black/[.05] text-ink-400"><Radio size={18} /></span>
            <div>
              <p className="text-sm font-semibold text-ink-900">No calls in progress</p>
              <p className="text-sm text-ink-500">Owner checks and tenant callbacks show up here the moment they start ringing.</p>
            </div>
          </div>
        )}
        {activeCalls.map((a) => (
          <div key={a.kind + (a.c?.executionId ?? a.s.id)} className="bg-dark-card glow-cyan relative overflow-hidden rounded-[22px] px-5 py-4 text-white">
            <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-pakka-400" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-pakka-400 to-brand-600 text-black">
                  <span className="absolute inset-0 animate-ping rounded-full bg-pakka-400 opacity-30" />
                  <PhoneCall size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{a.kind === 'owner' ? `${a.l?.ownerName} · owner` : `${a.s.tenantName} · tenant callback`}</p>
                  <p className="text-xs text-ink-400">{a.kind === 'owner' ? `${a.l?.bhk} BHK in ${a.l?.area} · Pakka Check` : 'Sharing owner answers · Pakka Line'}</p>
                </div>
              </div>
              <Badge tone="blue" dot pulse>{(a.kind === 'owner' ? a.c.liveStatus : a.s.callbackLiveStatus) === 'in-progress' ? 'On call' : 'Ringing'}</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between">
              {a.kind === 'owner' ? <LangBadge code={a.l?.ownerLanguage} /> : <LangBadge code={a.s.tenantLanguage} />}
              <span className="flex items-center gap-2 text-xs text-pakka-400"><Waveform className="[&>i]:bg-pakka-400" /> {LANGUAGES[a.kind === 'owner' ? a.l?.ownerLanguage : a.s.tenantLanguage]?.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card
          title="Latest request"
          subtitle={current ? `Started ${time(current.createdAt)} · ${ago(current.createdAt)}` : 'Waiting for the first tenant call'}
          actions={current && <Badge tone={current.state === 'done' ? 'green' : 'blue'} dot pulse={current.state !== 'done'}>{current.state === 'done' ? 'Completed' : 'In progress'}</Badge>}
        >
          {current ? (
            <RequestTimeline session={current} listings={listings} visits={live?.visits ?? []} onOpenCall={setOpenCall} />
          ) : (
            <Empty icon={PhoneCall} title="No requests yet">When a tenant calls Pakka, every step shows up here: owner calls, answers, the callback and the visit.</Empty>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Whitefield" subtitle="Every verified flat, coloured by its last call" bodyClass="p-3">
            <MapView pins={pins} className="h-[300px]" onSelect={(id) => navigate(`/console/listings/${id}`)} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 pb-1 pt-3 text-xs text-ink-500">
              {Object.entries(LISTING_STATUS).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: PIN_COLORS[k] }} />{v.label}</span>
              ))}
            </div>
          </Card>

          <Card title="Activity" bodyClass="max-h-[340px] overflow-y-auto scroll-thin px-5 py-2">
            <ol>
              {[...(live?.events ?? [])].reverse().slice(0, 25).map((e, i) => (
                <li key={i} className="flex gap-3 border-b border-black/[.05] py-2.5 last:border-0">
                  <span className="tnum w-16 flex-none pt-0.5 text-xs text-ink-400">{time(e.at)}</span>
                  <span className="text-sm text-ink-700">{e.text}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <CallDrawer id={openCall} onClose={() => setOpenCall(null)} />
    </>
  );
}
