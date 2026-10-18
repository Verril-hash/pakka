import { Check, PhoneCall } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';

const LANGS = [['en', 'English'], ['hi', 'हिंदी'], ['kn', 'ಕನ್ನಡ'], ['ta', 'தமிழ்']];

/** "Get a call from Pakka": starts a real Pakka Line call to the visitor. */
export default function CallMeForm() {
  const [f, setF] = useState({ name: '', phone: '', language: 'en', consent: false });
  const [state, setState] = useState({ status: 'idle' });

  async function submit(e) {
    e.preventDefault();
    setState({ status: 'sending' });
    try {
      await api('/api/public/callback', { method: 'POST', body: f });
      setState({ status: 'done' });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }

  if (state.status === 'done') {
    return (
      <div className="rounded-[28px] bg-white p-8 text-center shadow-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-pakka-500/10 text-pakka-600"><Check size={26} strokeWidth={2.5} /></span>
        <p className="mt-4 text-[24px] font-semibold tracking-display">Pakka is calling you.</p>
        <p className="mt-2 text-[17px] text-ink-500">Pick up and tell her the area, BHK, budget, and anything that matters to you.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[28px] bg-white p-7 shadow-card md:p-8">
      <div className="space-y-3">
        <input className="input h-12 text-[17px]" placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <input className="input tnum h-12 text-[17px]" placeholder="Mobile number" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} required />
      </div>
      <p className="mb-2 mt-5 text-[13px] text-ink-500">She'll speak</p>
      <div className="grid grid-cols-4 gap-1 rounded-full bg-black/[.05] p-1">
        {LANGS.map(([code, label]) => (
          <button type="button" key={code} onClick={() => setF({ ...f, language: code })}
            className={`rounded-full py-1.5 text-[14px] transition-all ${f.language === code ? 'bg-white font-semibold text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'}`}>
            {label}
          </button>
        ))}
      </div>
      <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-ink-500">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} />
        I agree to receive a call from Pakka's AI assistant on this number.
      </label>
      {state.status === 'error' && <p className="mt-3 text-[14px] text-[#e5484d]">{state.message}</p>}
      <button className="btn-primary mt-6 h-12 w-full text-[17px]" disabled={state.status === 'sending' || !f.consent}>
        <PhoneCall size={17} /> {state.status === 'sending' ? 'Connecting…' : 'Call me now'}
      </button>
    </form>
  );
}
