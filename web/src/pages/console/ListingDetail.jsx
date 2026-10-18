import { ArrowLeft, BadgeCheck, CalendarCheck, PhoneCall, PhoneOff, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import CallDrawer from '../../components/CallDrawer';
import ListingStatusBadge from '../../components/ListingStatusBadge';
import MapView, { pinLabel } from '../../components/MapView';
import { Badge, Card, Empty, ErrorNote, Field, LangBadge, Skeleton } from '../../components/ui';
import { api, useApi } from '../../lib/api';
import { ago, dateTime, lastCall, listingStatus, maskPhone, OUTCOMES, rupees } from '../../lib/format';

export default function ListingDetail() {
  const { id } = useParams();
  const { data: l, error, reload } = useApi(`/api/listings/${id}`, { interval: 4000 });
  const { live } = useOutletContext();
  const [openCall, setOpenCall] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const callingIds = new Set();
  for (const s of live?.sessions ?? []) for (const c of s.checks) if (c.state === 'calling') callingIds.add(c.listingId);

  async function recheck() {
    setBusy(true);
    setNotice(null);
    try {
      await api(`/api/listings/${id}/recheck`, { method: 'POST' });
      setNotice({ tone: 'blue', text: `Calling ${l.ownerName} now. This page updates as soon as the call ends.` });
      reload();
    } catch (e) {
      setNotice({ tone: 'red', text: e.message });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorNote error={error} />;
  if (!l) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-64" /></div>;

  const status = listingStatus(l, callingIds);
  const history = [...(l.history ?? [])].reverse();

  return (
    <>
      <Link to="/console/listings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={15} /> Listings</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">{l.bhk} BHK in {l.area}</h1>
            <ListingStatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-ink-500">{l.id} · {l.landmark} · {l.furnishing}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={recheck} disabled={busy || status === 'calling' || l.doNotCall} className="btn-primary">
            <PhoneCall size={15} /> {status === 'calling' ? 'Calling owner…' : 'Re-check now'}
          </button>
        </div>
      </div>
      {notice && <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${notice.tone === 'red' ? 'border-red-200 bg-red-50 text-red-700' : 'border-sky-200 bg-sky-50 text-sky-800'}`}>{notice.text}</div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card p-4"><p className="text-xs text-ink-500">Rent</p><p className="tnum mt-1 text-xl font-semibold">{rupees(l.rent)}<span className="text-sm font-normal text-ink-400"> /mo</span></p></div>
            <div className="card p-4"><p className="text-xs text-ink-500">Deposit</p><p className="tnum mt-1 text-xl font-semibold">{rupees(l.deposit)}</p></div>
            <div className="card p-4"><p className="text-xs text-ink-500">{lastCall(l) ? 'Last confirmed on a call' : 'Verified in person'}</p><p className="mt-1 text-xl font-semibold">{ago(lastCall(l) ?? l.verifiedAt ?? l.lastConfirmedAt)}</p></div>
          </div>

          <Card title="Trust" subtitle="Two layers: a person verified it once, voice keeps it true">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                <ShieldCheck className="flex-none text-emerald-600" size={20} />
                <div>
                  <p className="text-sm font-semibold text-ink-900">Verified in person by {l.verifiedBy}</p>
                  <p className="mt-0.5 text-xs text-ink-500">Owner identity, flat and photos checked by the Pakka team{l.verifiedAt ? ` on ${dateTime(l.verifiedAt)}` : ''}.</p>
                </div>
              </div>
              <div className={`flex gap-3 rounded-lg border p-4 ${lastCall(l) ? 'border-brand-200 bg-brand-50/50' : 'border-dashed border-slate-300 bg-black/[.03]'}`}>
                <BadgeCheck className={`flex-none ${lastCall(l) ? 'text-brand-600' : 'text-ink-400'}`} size={20} />
                <div>
                  <p className="text-sm font-semibold text-ink-900">{lastCall(l) ? `Re-confirmed by call ${ago(lastCall(l))}` : 'Not re-checked by call yet'}</p>
                  <p className="mt-0.5 text-xs text-ink-500">Pakka Check calls the owner in {l.ownerLanguage === 'kn' ? 'Kannada' : l.ownerLanguage === 'hi' ? 'Hindi' : l.ownerLanguage === 'ta' ? 'Tamil' : 'English'} to confirm availability, rent and rules.</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Call history" subtitle="Every conversation Pakka has had with this owner" bodyClass="p-0">
            {history.length === 0 ? (
              <Empty icon={PhoneCall} title="No calls yet" action={<button onClick={recheck} className="btn-secondary"><PhoneCall size={15} />Re-check now</button>}>
                This listing hasn't been re-checked by voice since it was verified.
              </Empty>
            ) : (
              <ul className="divide-y divide-black/[.06]">
                {history.map((h, i) => {
                  const o = OUTCOMES[h.outcome] ?? { label: h.outcome, tone: 'gray' };
                  return (
                    <li key={i} className="tr-link flex items-start gap-4 px-5 py-4" onClick={() => h.executionId && setOpenCall(h.executionId)}>
                      <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-black/[.05] text-ink-500"><PhoneCall size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={o.tone}>{o.label}</Badge>
                          {h.broker === 'broker' && <Badge tone="red">Broker</Badge>}
                          <span className="text-xs text-ink-400">{dateTime(h.at)}</span>
                        </div>
                        <p className="mt-1.5 text-sm text-ink-700">
                          {[h.rent && `Rent ${rupees(h.rent)}`, h.deposit && `deposit ${rupees(h.deposit)}`, h.answer, h.visitSlot && `visit ${h.visitSlot}`].filter(Boolean).join(' · ') || 'No details captured'}
                        </p>
                        {h.notes && <p className="mt-1 text-xs text-ink-500">Note: {h.notes}</p>}
                      </div>
                      <span className="text-xs font-medium text-brand-700">View →</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Tenant requests" subtitle="Requests that involved this flat" bodyClass="p-0">
            {l.requests?.length ? (
              <ul className="divide-y divide-black/[.06]">
                {[...l.requests].reverse().map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="text-ink-900">{r.kind === 'recheck' ? 'Routine re-check' : `${r.tenantName}'s request`}</span>
                    <span className="text-xs text-ink-500">{dateTime(r.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 py-6 text-sm text-ink-500">No tenant requests yet.</p>}
          </Card>
        </div>

        <div className="space-y-6">
          <Card bodyClass="p-3">
            <MapView className="h-[200px]" pins={[{ id: l.id, lat: l.lat, lng: l.lng, status, label: pinLabel(l) }]} />
          </Card>
          <Card title="Owner">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-black/[.05] font-semibold text-ink-500">{l.ownerName?.[0]}</span>
              <div>
                <p className="font-semibold text-ink-900">{l.ownerName}</p>
                <p className="tnum text-sm text-ink-500">{maskPhone(l.ownerPhone)}</p>
              </div>
            </div>
            <dl className="divide-y divide-black/[.06]">
              <Field label="Language"><LangBadge code={l.ownerLanguage} /></Field>
              <Field label="Calls">{l.history?.length ?? 0}</Field>
              <Field label="Do not call">{l.doNotCall ? <span className="inline-flex items-center gap-1 text-red-600"><PhoneOff size={13} />Yes</span> : 'No'}</Field>
            </dl>
          </Card>
          <Card title="Details">
            <dl className="divide-y divide-black/[.06]">
              <Field label="Tenants">{l.tenantPreference === 'any' ? 'Anyone' : l.tenantPreference}</Field>
              <Field label="Pets">{l.pets === 'yes' ? 'Allowed' : l.pets === 'no' ? 'Not allowed' : 'Not confirmed'}</Field>
              <Field label="Parking">{l.parking}</Field>
              <Field label="Available from">{l.availableFrom}</Field>
              <Field label="Visit slots">{l.visitSlots?.join(', ') || '—'}</Field>
              <Field label="Rules">{l.houseRules || 'None'}</Field>
            </dl>
          </Card>
          {l.visits?.length > 0 && (
            <Card title="Visits">
              {l.visits.map((v) => (
                <p key={v.id} className="flex items-center gap-2 py-1 text-sm text-ink-700"><CalendarCheck size={14} className="text-violet-500" />{v.tenantName} · {v.slot}</p>
              ))}
            </Card>
          )}
        </div>
      </div>
      <CallDrawer id={openCall} onClose={() => setOpenCall(null)} />
    </>
  );
}
