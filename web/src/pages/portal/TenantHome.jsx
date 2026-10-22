import { CalendarCheck, Check, ChevronRight, Loader2, MapPin, PhoneCall, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import MapView from '../../components/MapView';
import { Badge } from '../../components/ui';
import { useApi } from '../../lib/api';
import { ago, dateTime, duration, rupees } from '../../lib/format';
import PortalCallDrawer from './PortalCallDrawer';

const OUTCOME = {
  available: { label: 'Available', icon: Check, cls: 'bg-pakka-400 text-ink-900' },
  rented: { label: 'Already rented', icon: X, cls: 'bg-[#ff3b30] text-white' },
  unavailable: { label: 'Not available', icon: X, cls: 'bg-ink-300 text-white' },
  unreachable: { label: "Owner didn't pick up", icon: X, cls: 'bg-ink-300 text-white' },
  unconfirmed: { label: 'Not confirmed', icon: X, cls: 'bg-ink-300 text-white' },
  checking: { label: 'Checking with owner', icon: Loader2, cls: 'bg-brand-600 text-white', spin: true },
};

const REQUEST_STATUS = {
  checking: { label: 'Pakka is calling owners', tone: 'blue', pulse: true },
  calling_you: { label: 'Pakka is calling you back', tone: 'blue', pulse: true },
  done: { label: 'Done', tone: 'green' },
};

function Section({ title, children, action }) {
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-[22px] font-semibold tracking-display text-ink-900">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function TenantHome() {
  const { data } = useApi('/api/tenant/overview', { interval: 8000 });
  const [openCall, setOpenCall] = useState(null);

  if (!data) return <div className="h-64 animate-pulse rounded-[28px] bg-white" />;
  const empty = !data.requests.length && !data.visits.length && !data.calls.length;

  return (
    <>
      <h1 className="text-[34px] font-bold leading-tight tracking-display md:text-[44px]">Hi{data.name ? `, ${data.name}` : ''}.</h1>
      <p className="mt-2 text-[17px] text-ink-500">Your flat hunt with Pakka, in one place.</p>

      {empty && (
        <div className="mt-8 rounded-[28px] bg-white p-8 text-center shadow-card">
          <p className="text-[20px] font-semibold tracking-display">Nothing here yet.</p>
          <p className="mt-2 text-[15px] text-ink-500">Tell Pakka what you're looking for and it'll check with owners for you.</p>
          <Link to="/#call" className="btn-primary mt-5 h-11 px-6"><PhoneCall size={16} />Get a call from Pakka</Link>
        </div>
      )}

      {/* ── Visits first: what matters most ── */}
      {data.visits.length > 0 && (
        <Section title="Your visits">
          <div className="grid gap-4 md:grid-cols-2">
            {data.visits.map((v) => (
              <article key={v.id} className="overflow-hidden rounded-[24px] bg-white shadow-card">
                {v.lat != null && <MapView className="h-36 rounded-none" zoom={15} interactive={false} pins={[{ id: v.id, lat: v.lat, lng: v.lng, status: 'confirmed', label: v.area }]} />}
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-gradient-to-br from-pakka-400 to-brand-600 text-white"><CalendarCheck size={20} /></span>
                    <div>
                      <p className="text-[18px] font-semibold text-ink-900">{v.slot}</p>
                      <p className="text-[13px] text-ink-500">{v.bhk} BHK · {v.area} · {rupees(v.rent)}/month</p>
                    </div>
                  </div>
                  <p className="mt-4 flex items-center gap-2 border-t border-black/[.06] pt-4 text-[13px] text-ink-500"><MapPin size={14} />{v.landmark}{v.owner ? ` · owner: ${v.owner}` : ''}</p>
                </div>
              </article>
            ))}
          </div>
        </Section>
      )}

      {/* ── Requests ── */}
      {data.requests.length > 0 && (
        <Section title="What you asked for">
          <div className="space-y-4">
            {data.requests.map((r) => {
              const st = REQUEST_STATUS[r.status];
              return (
                <article key={r.id} className="rounded-[24px] bg-white p-5 shadow-card md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[17px] font-semibold text-ink-900">{r.lookingFor || 'A flat'}</p>
                      <p className="text-[13px] text-ink-400">{ago(r.at)}{r.question ? ` · asked: “${r.question}”` : ''}</p>
                    </div>
                    <Badge tone={st.tone} dot pulse={st.pulse}>{st.label}</Badge>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {r.flats.map((f) => {
                      const o = OUTCOME[f.outcome];
                      const Icon = o.icon;
                      return (
                        <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3">
                          <span className={`grid h-7 w-7 flex-none place-items-center rounded-full ${o.cls}`}><Icon size={14} strokeWidth={3} className={o.spin ? 'animate-spin' : ''} /></span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[14px] font-semibold ${f.outcome === 'available' ? 'text-ink-900' : 'text-ink-500'}`}>{f.bhk} BHK · {f.area} <span className="tnum font-normal text-ink-400">· {rupees(f.rent)}</span></p>
                            <p className="text-[12px] text-ink-500">{o.label}{f.answer ? ` · ${f.answer}` : ''}{f.visitSlot ? ` · visits ${f.visitSlot}` : ''}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── Calls ── */}
      {data.calls.length > 0 && (
        <Section title="Your calls with Pakka">
          <ul className="overflow-hidden rounded-[24px] bg-white shadow-card">
            {data.calls.map((c, i) => (
              <li key={c.id}>
                <button onClick={() => setOpenCall(c.id)} className={`flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-black/[.02] ${i ? 'border-t border-black/[.05]' : ''}`}>
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-brand-600/10 text-brand-600"><PhoneCall size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink-900">{c.kind === 'callback' ? 'Pakka called you back' : 'You told Pakka what you need'}</p>
                    <p className="text-[13px] text-ink-500">{dateTime(c.at)} · {duration(c.durationSec)}</p>
                  </div>
                  <ChevronRight size={18} className="text-ink-300" />
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="mt-12 rounded-[24px] bg-dark-card p-6 text-white md:p-8">
        <p className="text-[22px] font-semibold tracking-display">Looking for something else?</p>
        <p className="mt-1 text-[15px] text-ink-400">Free for tenants, always. Pakka arranges every visit for you.</p>
        <Link to="/#call" className="btn mt-5 h-11 bg-white px-5 text-ink-900 hover:bg-white/90"><PhoneCall size={16} />Get a call from Pakka</Link>
      </div>

      <PortalCallDrawer id={openCall} onClose={() => setOpenCall(null)} you={data.name || 'You'} />
    </>
  );
}
