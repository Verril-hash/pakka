import { CalendarCheck, Car, Check, Dog, Lock, MapPin, PhoneCall, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CallMeForm from '../../components/CallMeForm';
import MapView from '../../components/MapView';
import Reveal from '../../components/Reveal';
import { api, useApi } from '../../lib/api';
import { ago, isFresh, rupees } from '../../lib/format';

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-full bg-black/[.05] p-1">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`rounded-full px-3.5 py-1.5 text-[14px] transition-all ${value === v ? 'bg-white font-semibold text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Signed-in tenant actions on one flat: book the owner's slot, or ask Pakka to check something. */
function FlatActions({ flat, busyElsewhere, onDone }) {
  const [mode, setMode] = useState(null); // null | 'ask'
  const [question, setQuestion] = useState('');
  const [state, setState] = useState({ status: 'idle' });

  async function post(path, body) {
    setState({ status: 'sending' });
    try {
      const out = await api(path, { method: 'POST', body });
      setState({ status: 'done', message: out.message ?? `Visit booked for ${body.slot}. It's in your Pakka account.` });
      onDone?.();
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }

  if (state.status === 'done') {
    return <p className="flex items-start gap-2 rounded-2xl bg-pakka-400/15 px-4 py-3 text-[13px] font-medium text-pakka-700"><Check size={15} className="mt-px flex-none" strokeWidth={3} />{state.message}</p>;
  }

  return (
    <div className="space-y-2.5">
      {mode === 'ask' ? (
        <form onSubmit={(e) => { e.preventDefault(); post(`/api/tenant/flats/${flat.id}/ask`, { question }); }} className="space-y-2">
          <input autoFocus className="input" placeholder="e.g. Is a small dog okay? Is parking covered?" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={160} />
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={state.status === 'sending'}><PhoneCall size={15} />{state.status === 'sending' ? 'Starting…' : 'Ask the owner'}</button>
            <button type="button" onClick={() => setMode(null)} className="btn-secondary">Cancel</button>
          </div>
          <p className="text-[12px] text-ink-400">Pakka calls the owner now and calls you back with the answer.</p>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          {flat.bookable && flat.visitSlots.map((slot) => (
            <button key={slot} onClick={() => post(`/api/tenant/flats/${flat.id}/visit`, { slot })} disabled={state.status === 'sending'} className="btn-primary">
              <CalendarCheck size={15} />Book {slot}
            </button>
          ))}
          <button onClick={() => setMode('ask')} disabled={busyElsewhere} className={flat.bookable ? 'btn-secondary' : 'btn-primary'} title={busyElsewhere ? 'Pakka is already checking something for you' : undefined}>
            <PhoneCall size={15} />{flat.bookable ? 'Ask Pakka' : 'Ask Pakka to arrange a visit'}
          </button>
        </div>
      )}
      {state.status === 'error' && <p className="text-[13px] text-[#d70015]">{state.message}</p>}
    </div>
  );
}

export default function Flats() {
  const [role, setRole] = useState(undefined); // undefined = loading, null = signed out
  useEffect(() => { api('/api/me').then((m) => setRole(m.role)).catch(() => setRole(null)); }, []);
  const tenant = role === 'tenant';
  const { data, loading, error, reload } = useApi(role === undefined ? null : tenant ? '/api/tenant/listings' : '/api/public/listings', { interval: 15000 });
  const [bhk, setBhk] = useState('');
  const [max, setMax] = useState('');
  const [pets, setPets] = useState(false);

  const listings = (data?.listings ?? [])
    .filter((l) => !bhk || String(l.bhk) === bhk)
    .filter((l) => !max || l.rent <= Number(max))
    .filter((l) => !pets || l.pets === 'yes');

  return (
    <main className="bg-canvas">
      <section className="mx-auto max-w-[1080px] px-5 pb-10 pt-14 md:pt-20">
        <h1 className="text-[48px] font-semibold leading-none tracking-tightest md:text-[72px]">Verified flats.</h1>
        <p className="mt-3 text-[24px] font-semibold tracking-display text-ink-400 md:text-[32px]">Whitefield. Every one checked in person.</p>

        {role === null && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-white px-5 py-4 shadow-card">
            <p className="flex items-center gap-2.5 text-[15px] text-ink-700"><Lock size={16} className="text-brand-600" />Sign in to see the exact location, visit times, and to book a visit.</p>
            <Link to="/signin?as=tenant&next=/flats" className="btn-primary">Sign in</Link>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Segmented value={bhk} onChange={setBhk} options={[['', 'Any'], ['1', '1 BHK'], ['2', '2 BHK'], ['3', '3 BHK']]} />
          <Segmented value={max} onChange={setMax} options={[['', 'Any budget'], ['20000', '≤ ₹20k'], ['25000', '≤ ₹25k'], ['40000', '≤ ₹40k']]} />
          <button onClick={() => setPets(!pets)} className={`rounded-full px-4 py-2 text-[14px] transition-all ${pets ? 'bg-ink-900 text-white' : 'bg-black/[.05] text-ink-700 hover:bg-black/[.08]'}`}>
            <Dog size={15} className="mr-1.5 inline -translate-y-px" />Pets allowed
          </button>
          <span className="ml-auto text-[14px] text-ink-500">{listings.length} flat{listings.length === 1 ? '' : 's'}</span>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1080px] gap-8 px-5 pb-28 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-5 sm:grid-cols-2">
          {error && <p className="text-[15px] text-[#e5484d]">Couldn't load flats right now.</p>}
          {(loading || role === undefined) && !data && [...Array(4)].map((_, i) => <div key={i} className="h-[380px] animate-pulse rounded-[28px] bg-white" />)}
          {listings.map((l, i) => (
            <Reveal key={l.id} delay={(i % 2) * 80} className="flex flex-col overflow-hidden rounded-[28px] bg-white shadow-card transition-shadow duration-300 hover:shadow-float">
              <div className="relative">
                <MapView
                  className="h-44 rounded-none"
                  zoom={15}
                  interactive={false}
                  pins={[l.approximate
                    ? { id: l.id, lat: l.lat, lng: l.lng, radius: 650 }
                    : { id: l.id, lat: l.lat, lng: l.lng, status: 'confirmed', label: l.area }]}
                />
                <span className="glass pointer-events-none absolute left-3 top-3 z-[400] rounded-full px-3 py-1 text-[12px] font-semibold text-ink-900">{l.bhk} BHK · {l.furnishing}</span>
                {l.approximate && <span className="glass pointer-events-none absolute bottom-3 left-3 z-[400] rounded-full px-2.5 py-1 text-[11px] font-medium text-ink-700">Approximate area</span>}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <p className="text-[13px] font-medium text-ink-400">{l.area}</p>
                <p className="mt-1 text-[24px] font-semibold tracking-display">{rupees(l.rent)}<span className="text-[15px] font-normal text-ink-400"> /month</span></p>
                <p className="mt-1 text-[14px] text-ink-500">Deposit {rupees(l.deposit)}</p>
                {!l.approximate && l.landmark && <p className="mt-2 flex items-center gap-1.5 text-[14px] font-medium text-ink-900"><MapPin size={14} className="text-brand-600" />{l.landmark}</p>}

                <div className="mt-5 space-y-2">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-pakka-700"><ShieldCheck size={15} />Verified in person by Pakka</p>
                  {l.lastCallAt && (
                    <p className={`flex items-center gap-2 text-[13px] font-medium ${isFresh(l.lastCallAt) ? 'text-brand-700' : 'text-ink-500'}`}>
                      <PhoneCall size={14} />Owner confirmed on a call {ago(l.lastCallAt)}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-black/[.06] pt-4 text-[13px] text-ink-500">
                  <span className="flex items-center gap-1.5"><Users size={14} />{l.tenantPreference === 'any' ? 'Anyone' : l.tenantPreference === 'family' ? 'Families' : 'Bachelors'}</span>
                  <span className="flex items-center gap-1.5"><Dog size={14} />{l.pets === 'yes' ? 'Pets OK' : l.pets === 'no' ? 'No pets' : 'Ask about pets'}</span>
                  {l.parking && <span className="flex items-center gap-1.5"><Car size={14} />{l.parking}</span>}
                  <span>From {l.availableFrom}</span>
                </div>

                <div className="mt-auto pt-5">
                  {tenant ? (
                    <FlatActions flat={l} busyElsewhere={data?.checking} onDone={reload} />
                  ) : (
                    <Link to="/signin?as=tenant&next=/flats" className="flex items-center justify-center gap-2 rounded-full bg-black/[.05] py-2.5 text-[14px] font-medium text-ink-700 transition-colors hover:bg-black/[.08]">
                      <Lock size={14} />Sign in for location & visit times
                    </Link>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
          {!loading && role !== undefined && listings.length === 0 && <p className="text-[15px] text-ink-500">No flats match these filters yet.</p>}
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-4 text-[24px] font-semibold leading-tight tracking-display">Don't see the one?<br /><span className="text-ink-400">Ask Pakka.</span></p>
          <CallMeForm />
          <p className="mt-4 px-1 text-[13px] leading-relaxed text-ink-500">Pakka can check anything that isn't listed, like pets, parking or move-in dates, with the owner, then call you back.</p>
        </aside>
      </section>
    </main>
  );
}
