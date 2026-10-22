import { Check, Lock, PhoneCall } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const LANGS = [['en', 'English'], ['hi', 'हिंदी'], ['kn', 'ಕನ್ನಡ'], ['ta', 'தமிழ்']];

const spaced = (p) => (p ? `${p.slice(0, 3)} ${p.slice(3, 8)} ${p.slice(8)}` : '');

/**
 * "Get a call from Pakka". Signed-in tenants only: the server calls the verified phone on their account,
 * whatever the browser sends, so Pakka never rings anyone who didn't sign up for it.
 */
export default function CallMeForm() {
  const [me, setMe] = useState(undefined); // undefined = loading
  const [language, setLanguage] = useState('en');
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => {
    api('/api/me')
      .then((m) => { setMe(m); if (m.profile?.language) setLanguage(m.profile.language); })
      .catch(() => setMe({ role: null }));
  }, []);

  async function call() {
    setState({ status: 'sending' });
    try {
      await api('/api/tenant/call-me', { method: 'POST', body: { language } });
      setState({ status: 'done' });
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }

  if (me === undefined) return <div className="h-[260px] animate-pulse rounded-[28px] bg-white shadow-card" />;

  if (me.role !== 'tenant' || me.needsProfile) {
    return (
      <div className="rounded-[28px] bg-white p-7 shadow-card md:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-600/10 text-brand-700"><PhoneCall size={22} /></span>
        <p className="mt-4 text-[22px] font-semibold tracking-display">Pakka calls you.</p>
        <p className="mt-2 text-[16px] leading-relaxed text-ink-500">
          Sign in with your phone number and Pakka calls you on it within seconds. Tell her the area, BHK and budget, in English, हिंदी, ಕನ್ನಡ or தமிழ்.
        </p>
        <Link to={`/signin?as=tenant&next=${encodeURIComponent('/me#call')}`} className="btn-primary mt-6 h-12 w-full text-[17px]">
          <Lock size={16} /> {me.role === 'tenant' ? 'Finish your profile' : 'Sign in to get a call'}
        </Link>
      </div>
    );
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
    <div className="rounded-[28px] bg-white p-7 shadow-card md:p-8">
      <p className="text-[13px] text-ink-500">Pakka will call</p>
      <p className="tnum mt-0.5 text-[22px] font-semibold tracking-display">{spaced(me.phone)}</p>
      <p className="mb-2 mt-5 text-[13px] text-ink-500">She'll speak</p>
      <div className="grid grid-cols-4 gap-1 rounded-full bg-black/[.05] p-1">
        {LANGS.map(([code, label]) => (
          <button type="button" key={code} onClick={() => setLanguage(code)}
            className={`rounded-full py-1.5 text-[14px] transition-all ${language === code ? 'bg-white font-semibold text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'}`}>
            {label}
          </button>
        ))}
      </div>
      {state.status === 'error' && <p className="mt-3 text-[14px] text-[#e5484d]">{state.message}</p>}
      <button onClick={call} className="btn-primary mt-6 h-12 w-full text-[17px]" disabled={state.status === 'sending'}>
        <PhoneCall size={17} /> {state.status === 'sending' ? 'Connecting…' : 'Call me now'}
      </button>
    </div>
  );
}
