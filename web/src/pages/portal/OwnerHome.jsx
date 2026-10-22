import { CalendarCheck, ChevronRight, Clock3, PhoneCall, PhoneMissed, Plus, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Badge, LangBadge } from '../../components/ui';
import { api, useApi } from '../../lib/api';
import { ago, dateTime, duration, rupees } from '../../lib/format';
import PortalCallDrawer from './PortalCallDrawer';

const STATUS = {
  live: { label: 'Live · tenants can see it', tone: 'green' },
  needs_check: { label: 'Live · due for a check-in call', tone: 'amber' },
  rented: { label: 'Rented · hidden from tenants', tone: 'gray' },
  hidden: { label: 'Hidden · our team will call you', tone: 'gray' },
  removed: { label: 'Removed · not on Pakka', tone: 'gray' },
};

const REQUEST_STATUS = {
  pending: 'Pakka will call you to fix a visit',
  visit_scheduled: 'Visit scheduled with the Pakka team',
};

const REMOVE_REASONS = ['Rented it myself', 'Living there myself', 'Selling the flat', 'Not renting for now'];

const HELLO = { kn: 'Namaskara', hi: 'Namaste', ta: 'Vanakkam', en: 'Hello' };

function Section({ title, subtitle, action, children }) {
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[22px] font-semibold tracking-display text-ink-900">{title}</h2>
        {action}
      </div>
      {subtitle && <p className="mt-1 text-[14px] text-ink-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Owner updates rent/deposit. Shown as "updated by you" until Pakka's next check-in call confirms it. */
function PriceForm({ flat, onSave, onCancel }) {
  const [f, setF] = useState({ rent: String(flat.rent ?? ''), deposit: String(flat.deposit ?? '') });
  const [error, setError] = useState(null);
  const digits = (k) => (e) => setF({ ...f, [k]: e.target.value.replace(/\D/g, '') });
  return (
    <form onSubmit={async (e) => { e.preventDefault(); setError(null); try { await onSave(f); } catch (err) { setError(err.message); } }} className="mt-5 space-y-3 rounded-2xl bg-canvas p-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Rent / month</label><input inputMode="numeric" className="input tnum h-11" value={f.rent} onChange={digits('rent')} required /></div>
        <div><label className="label">Deposit</label><input inputMode="numeric" className="input tnum h-11" value={f.deposit} onChange={digits('deposit')} /></div>
      </div>
      {error && <p className="text-[13px] text-[#d70015]">{error}</p>}
      <div className="flex gap-2"><button className="btn-primary">Save</button><button type="button" onClick={onCancel} className="btn-secondary">Cancel</button></div>
    </form>
  );
}

/** Take a flat off Pakka, with an optional reason. It's kept on record and can be brought back. */
function RemoveForm({ onRemove, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <div className="mt-5 space-y-3 rounded-2xl bg-canvas p-4">
      <p className="text-[14px] font-medium text-ink-900">Remove this flat from Pakka?</p>
      <p className="text-[13px] text-ink-500">Tenants stop seeing it and Pakka stops calling about it. You can put it back any time.</p>
      <div className="flex flex-wrap gap-2">
        {REMOVE_REASONS.map((r) => (
          <button key={r} type="button" onClick={() => setReason(reason === r ? '' : r)}
            className={`rounded-full px-3 py-1.5 text-[13px] transition-all ${reason === r ? 'bg-ink-900 text-white' : 'bg-white text-ink-700 ring-1 ring-black/10'}`}>{r}</button>
        ))}
      </div>
      <div className="flex gap-2"><button onClick={() => onRemove(reason)} className="btn-dark">Remove from Pakka</button><button onClick={onCancel} className="btn-secondary">Keep it</button></div>
    </div>
  );
}

/** "List another flat": a request for the Pakka team's visit. Nothing goes live until the team has seen it. */
function NewFlatForm({ onDone, onCancel }) {
  const [f, setF] = useState({ area: '', bhk: '2', rent: '', deposit: '', furnishing: 'semi-furnished', availableFrom: '', visitTime: '', notes: '' });
  const [state, setState] = useState({ status: 'idle' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const digits = (k) => (e) => setF({ ...f, [k]: e.target.value.replace(/\D/g, '') });
  async function submit(e) {
    e.preventDefault();
    setState({ status: 'sending' });
    try { await api('/api/owner/listing-requests', { method: 'POST', body: f }); onDone(); } catch (err) { setState({ status: 'error', message: err.message }); }
  }
  return (
    <form onSubmit={submit} className="mb-4 space-y-4 rounded-[24px] bg-white p-6 shadow-card">
      <div>
        <p className="text-[19px] font-semibold tracking-display text-ink-900">List another flat</p>
        <p className="mt-1 text-[14px] text-ink-500">The Pakka team visits every flat before tenants see it. Tell us the basics and we'll call you to fix a time.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Area</label><input className="input h-11" placeholder="e.g. Brookefield" value={f.area} onChange={set('area')} required /></div>
        <div><label className="label">Size</label>
          <select className="input h-11" value={f.bhk} onChange={set('bhk')}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} BHK</option>)}</select>
        </div>
        <div><label className="label">Expected rent / month</label><input inputMode="numeric" className="input tnum h-11" placeholder="25000" value={f.rent} onChange={digits('rent')} required /></div>
        <div><label className="label">Deposit</label><input inputMode="numeric" className="input tnum h-11" placeholder="100000" value={f.deposit} onChange={digits('deposit')} /></div>
        <div><label className="label">Furnishing</label>
          <select className="input h-11" value={f.furnishing} onChange={set('furnishing')}>
            <option value="unfurnished">Unfurnished</option><option value="semi-furnished">Semi-furnished</option><option value="fully furnished">Fully furnished</option>
          </select>
        </div>
        <div><label className="label">Free from</label><input className="input h-11" placeholder="e.g. 1 December" value={f.availableFrom} onChange={set('availableFrom')} /></div>
      </div>
      <div><label className="label">Good time for our visit</label><input className="input h-11" placeholder="e.g. Weekday evenings, or Saturday morning" value={f.visitTime} onChange={set('visitTime')} /></div>
      <div><label className="label">Anything else (optional)</label><input className="input h-11" placeholder="Parking, pets, who you'd like as tenants…" value={f.notes} onChange={set('notes')} /></div>
      {state.status === 'error' && <p className="text-[14px] text-[#d70015]">{state.message}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={state.status === 'sending'}>{state.status === 'sending' ? 'Sending…' : 'Send to Pakka'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default function OwnerHome() {
  const { data, reload } = useApi('/api/owner/overview', { interval: 15000 });
  const [openCall, setOpenCall] = useState(null);
  const [busy, setBusy] = useState(null);
  const [editing, setEditing] = useState(null); // { id, kind: 'price' | 'remove' }
  const [adding, setAdding] = useState(false);

  async function act(path, body) {
    setBusy(path);
    try { await api(path, { method: 'POST', body }); setEditing(null); await reload(); } finally { setBusy(null); }
  }

  if (!data) return <div className="h-64 animate-pulse rounded-[28px] bg-white" />;
  const answered = data.calls.filter((c) => c.answered).length;

  return (
    <>
      <h1 className="text-[34px] font-bold leading-tight tracking-display md:text-[44px]">{HELLO[data.language] ?? 'Hello'}, {data.name}.</h1>
      <p className="mt-2 text-[17px] text-ink-500">
        {data.calls.length
          ? `Pakka has called you ${data.calls.length} time${data.calls.length > 1 ? 's' : ''} to keep your listing${data.flats.length > 1 ? 's' : ''} accurate.`
          : 'Pakka will call you every few days to keep your listing accurate.'}
      </p>

      {data.paused && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[#ff9f0a]/10 px-5 py-4">
          <p className="text-[15px] text-[#8a4b00]">Check-in calls are paused. Your listing won't be refreshed, so tenants may see older details.</p>
          <button onClick={() => act('/api/owner/calls-paused', { paused: false })} disabled={busy} className="btn-dark h-9">Resume calls</button>
        </div>
      )}

      {/* ── Flats ───────────────────────── */}
      <Section
        title={data.flats.length > 1 ? 'Your flats' : 'Your flat'}
        action={!adding && <button onClick={() => setAdding(true)} className="btn-secondary h-9"><Plus size={15} />List another flat</button>}
      >
        {adding && <NewFlatForm onDone={() => { setAdding(false); reload(); }} onCancel={() => setAdding(false)} />}
        <div className="grid gap-4 md:grid-cols-2">
          {data.requests.map((r) => (
            <article key={r.id} className="rounded-[24px] border-2 border-dashed border-black/10 bg-white/60 p-6">
              <p className="text-[20px] font-semibold tracking-display text-ink-900">{r.bhk} BHK · {r.area}</p>
              <p className="tnum text-[13px] text-ink-500">{rupees(r.rent)}/month{r.deposit ? ` · deposit ${rupees(r.deposit)}` : ''}{r.availableFrom ? ` · free from ${r.availableFrom}` : ''}</p>
              <div className="mt-3"><Badge tone={r.status === 'visit_scheduled' ? 'blue' : 'amber'} dot>{REQUEST_STATUS[r.status]}</Badge></div>
              <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-500"><Clock3 size={14} />Sent {ago(r.createdAt)}{r.visitTime ? ` · visit: ${r.visitTime}` : ''}</p>
              <button onClick={() => confirm('Cancel this request?') && act(`/api/owner/listing-requests/${r.id}/cancel`)} disabled={busy} className="mt-4 text-[13px] font-medium text-ink-500 hover:text-ink-900">Cancel request</button>
            </article>
          ))}
          {data.flats.map((f) => {
            const st = STATUS[f.status];
            return (
              <article key={f.id} className="rounded-[24px] bg-white p-6 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[20px] font-semibold tracking-display text-ink-900">{f.bhk} BHK · {f.area}</p>
                    <p className="text-[13px] text-ink-400">{f.landmark}</p>
                  </div>
                  <span className="font-mono text-[11px] text-ink-300">{f.id}</span>
                </div>
                <div className="mt-3"><Badge tone={st.tone} dot>{st.label}</Badge></div>

                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-[14px]">
                  <div><dt className="text-[12px] text-ink-400">Rent</dt><dd className="tnum font-semibold text-ink-900">{rupees(f.rent)}</dd></div>
                  <div><dt className="text-[12px] text-ink-400">Deposit</dt><dd className="tnum font-semibold text-ink-900">{rupees(f.deposit)}</dd></div>
                  <div><dt className="text-[12px] text-ink-400">Tenants</dt><dd className="font-medium capitalize text-ink-900">{f.tenantPreference === 'any' ? 'Anyone' : f.tenantPreference}</dd></div>
                  <div><dt className="text-[12px] text-ink-400">Visits</dt><dd className="font-medium text-ink-900">{f.visitSlots?.[0] ?? 'Not set'}</dd></div>
                </dl>

                <div className="mt-5 space-y-1.5 border-t border-black/[.06] pt-4 text-[13px] text-ink-500">
                  <p className="flex items-center gap-2"><ShieldCheck size={15} className="text-pakka-600" />Verified in person by Pakka{f.verifiedAt ? ` · ${dateTime(f.verifiedAt)}` : ''}</p>
                  <p className="flex items-center gap-2"><PhoneCall size={14} className="text-brand-600" />{f.lastCallAt ? `You last confirmed it on a call ${ago(f.lastCallAt)}` : 'No check-in call yet'}</p>
                </div>

                {f.ownerUpdatedAt && f.status !== 'removed' && (
                  <p className="mt-3 rounded-xl bg-[#ff9f0a]/10 px-3 py-2 text-[12px] text-[#8a4b00]">Rent updated by you {ago(f.ownerUpdatedAt)}. Pakka confirms it with you on the next check-in call.</p>
                )}

                {editing?.id === f.id && editing.kind === 'price' && (
                  <PriceForm flat={f} onSave={(body) => act(`/api/owner/flats/${f.id}/price`, body)} onCancel={() => setEditing(null)} />
                )}
                {editing?.id === f.id && editing.kind === 'remove' && (
                  <RemoveForm onRemove={(reason) => act(`/api/owner/flats/${f.id}/remove`, { reason })} onCancel={() => setEditing(null)} />
                )}

                {editing?.id !== f.id && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {f.status === 'removed' ? (
                      <button onClick={() => act(`/api/owner/flats/${f.id}/available`)} disabled={busy} className="btn-primary">Put it back on Pakka</button>
                    ) : f.status === 'rented' ? (
                      <button onClick={() => act(`/api/owner/flats/${f.id}/available`)} disabled={busy} className="btn-secondary">It's available again</button>
                    ) : (
                      <>
                        <button onClick={() => setEditing({ id: f.id, kind: 'price' })} disabled={busy} className="btn-secondary">Update rent</button>
                        <button onClick={() => confirm('Mark this flat as rented? Tenants will stop seeing it.') && act(`/api/owner/flats/${f.id}/rented`)} disabled={busy} className="btn-secondary">Mark as rented</button>
                      </>
                    )}
                    {f.status !== 'removed' && (
                      <button onClick={() => setEditing({ id: f.id, kind: 'remove' })} disabled={busy} className="btn-ghost">Remove from Pakka</button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </Section>

      {/* ── Calls ───────────────────────── */}
      <Section title="Calls from Pakka" subtitle={data.calls.length ? `${answered} answered · tap any call to hear it or read it` : 'Every check-in call will show up here.'}>
        {data.calls.length > 0 && (
          <ul className="overflow-hidden rounded-[24px] bg-white shadow-card">
            {data.calls.map((c, i) => (
              <li key={c.id}>
                <button onClick={() => setOpenCall(c.id)} className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-black/[.02] ${i ? 'border-t border-black/[.05]' : ''}`}>
                  <span className={`grid h-10 w-10 flex-none place-items-center rounded-full ${c.answered ? 'bg-brand-600/10 text-brand-600' : 'bg-black/[.05] text-ink-400'}`}>
                    {c.answered ? <PhoneCall size={17} /> : <PhoneMissed size={17} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 text-[15px] font-semibold text-ink-900">
                      {dateTime(c.at)}
                      <span className="text-[13px] font-normal text-ink-400">{duration(c.durationSec)}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-ink-500">{c.summary ?? (c.flat ? `About your ${c.flat}` : 'Check-in call')}</p>
                  </div>
                  <span className="hidden sm:block"><LangBadge code={c.language} /></span>
                  <ChevronRight size={18} className="flex-none text-ink-300" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* ── Visits ──────────────────────── */}
      <Section title="Visits" subtitle="Tenants Pakka has screened against your rules.">
        {data.visits.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.visits.map((v) => (
              <div key={v.id} className="flex items-center gap-4 rounded-[22px] bg-white p-5 shadow-card">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-gradient-to-br from-pakka-400 to-brand-600 text-white"><CalendarCheck size={20} /></span>
                <div>
                  <p className="text-[16px] font-semibold text-ink-900">{v.slot}</p>
                  <p className="text-[13px] text-ink-500">{v.tenant} · {v.flat}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="rounded-[22px] bg-white px-5 py-6 text-[14px] text-ink-500 shadow-card">No visits booked yet.</p>}
      </Section>

      {/* ── Preferences ─────────────────── */}
      <Section title="Check-in calls">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-white p-5 shadow-card">
          <div className="max-w-[560px]">
            <p className="text-[15px] font-semibold text-ink-900">{data.paused ? 'Paused' : 'On'} · in <LangBadge code={data.language} /></p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-500">A short call every few days to confirm your flat is still available and the details are right. Pakka's assistant always says it's an AI. Listing is free; you pay only when Pakka finds your tenant.</p>
          </div>
          <button onClick={() => act('/api/owner/calls-paused', { paused: !data.paused })} disabled={busy} className={data.paused ? 'btn-primary' : 'btn-secondary'}>
            {data.paused ? 'Resume calls' : 'Pause calls'}
          </button>
        </div>
      </Section>

      <PortalCallDrawer id={openCall} onClose={() => setOpenCall(null)} you={data.name || 'You'} />
    </>
  );
}
