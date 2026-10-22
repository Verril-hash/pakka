import { CalendarCheck, Car, Check, Dog, Lock, MapPin, PhoneCall, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { ago, isFresh, rupees } from '../lib/format';
import Reveal from './Reveal';

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

/** One flat. Signed-out visitors see the approximate area; signed-in tenants get the location, visit slots and actions. */
export default function FlatCard({ flat: l, tenant, busyElsewhere, onDone, delay = 0, next = '/flats' }) {
  return (
    <Reveal delay={delay} className="flex flex-col overflow-hidden rounded-[28px] bg-white shadow-card transition-shadow duration-300 hover:shadow-float">
      <div className="relative">
        <img src={l.photo} alt={`${l.bhk} BHK in ${l.area}`} loading="lazy" className="h-52 w-full bg-canvas object-cover" />
        <span className="glass pointer-events-none absolute left-3 top-3 rounded-full px-3 py-1 text-[12px] font-semibold text-ink-900">{l.bhk} BHK · {l.furnishing}</span>
        {l.samplePhoto && <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">Sample photo</span>}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-[13px] font-medium text-ink-400">{l.area}</p>
        <p className="mt-1 text-[24px] font-semibold tracking-display">{rupees(l.rent)}<span className="text-[15px] font-normal text-ink-400"> /month</span></p>
        <p className="mt-1 text-[14px] text-ink-500">Deposit {rupees(l.deposit)}</p>
        {!l.approximate && l.landmark && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-medium text-ink-900">
            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-brand-600" />{l.landmark}</span>
            {l.lat != null && <a href={`https://www.google.com/maps?q=${l.lat},${l.lng}`} target="_blank" rel="noreferrer" className="text-[13px] font-medium text-brand-600 hover:underline">Open in Maps</a>}
          </p>
        )}
    
        <div className="mt-5 space-y-2">
          <p className="flex items-center gap-2 text-[13px] font-medium text-pakka-700"><ShieldCheck size={15} />Direct from owner</p>
          {l.lastCallAt && (
            <p className={`flex items-center gap-2 text-[13px] font-medium ${isFresh(l.lastCallAt) ? 'text-brand-700' : 'text-ink-500'}`}>
              <PhoneCall size={14} />Available · updated {ago(l.lastCallAt)}
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
            <FlatActions flat={l} busyElsewhere={busyElsewhere} onDone={onDone} />
          ) : (
            <Link to={`/signin?as=tenant&next=${encodeURIComponent(next)}`} className="flex items-center justify-center gap-2 rounded-full bg-black/[.05] py-2.5 text-[14px] font-medium text-ink-700 transition-colors hover:bg-black/[.08]">
              <Lock size={14} />Sign in for location & visit times
            </Link>
          )}
        </div>
      </div>
    </Reveal>
  );
}
