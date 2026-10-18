import { CalendarCheck, ChevronRight, PhoneCall, PhoneMissed, ShieldCheck } from 'lucide-react';
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
};

const HELLO = { kn: 'Namaskara', hi: 'Namaste', ta: 'Vanakkam', en: 'Hello' };

function Section({ title, subtitle, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-[22px] font-semibold tracking-display text-ink-900">{title}</h2>
      {subtitle && <p className="mt-1 text-[14px] text-ink-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function OwnerHome() {
  const { data, reload } = useApi('/api/owner/overview', { interval: 15000 });
  const [openCall, setOpenCall] = useState(null);
  const [busy, setBusy] = useState(null);

  async function act(path, body) {
    setBusy(path);
    try { await api(path, { method: 'POST', body }); await reload(); } finally { setBusy(null); }
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
      <Section title={data.flats.length > 1 ? 'Your flats' : 'Your flat'}>
        <div className="grid gap-4 md:grid-cols-2">
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

                <div className="mt-5 flex gap-2">
                  {f.status === 'rented' ? (
                    <button onClick={() => act(`/api/owner/flats/${f.id}/available`)} disabled={busy} className="btn-secondary">It's available again</button>
                  ) : (
                    <button onClick={() => confirm('Mark this flat as rented? Tenants will stop seeing it.') && act(`/api/owner/flats/${f.id}/rented`)} disabled={busy} className="btn-secondary">Mark as rented</button>
                  )}
                </div>
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
            <p className="mt-1 text-[13px] leading-relaxed text-ink-500">A short call every few days to confirm your flat is still available and the details are right. Pakka's assistant always says it's an AI. You never pay anything.</p>
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
