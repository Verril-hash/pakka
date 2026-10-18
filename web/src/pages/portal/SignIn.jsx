import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

export default function SignIn({ team = false }) {
  const [params] = useSearchParams();
  const [role, setRole] = useState(team ? 'team' : params.get('as') === 'owner' ? 'owner' : 'tenant');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState('phone'); // phone | code
  const [devCode, setDevCode] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const codeInput = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { if (stage === 'code') codeInput.current?.focus(); }, [stage]);

  async function sendCode(e) {
    e?.preventDefault();
    setBusy(true); setError(null);
    try {
      const out = await api('/api/auth/start', { method: 'POST', body: { phone, role } });
      setDevCode(out.devCode ?? null);
      setStage('code');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function verify(e) {
    e?.preventDefault();
    setBusy(true); setError(null);
    try {
      const out = await api('/api/auth/verify', { method: 'POST', body: { phone, code } });
      const next = params.get('next');
      navigate(out.role === 'team' ? '/console' : out.role === 'owner' ? '/owner' : next?.startsWith('/') && !next.startsWith('//') ? next : '/me');
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <main className="flex min-h-[calc(100vh-48px)] items-start justify-center bg-canvas px-5 pb-20 pt-16 md:pt-24">
      <div className="w-full max-w-[400px]">
        <h1 className="text-center text-[34px] font-semibold tracking-display">{team ? 'Pakka team' : 'Sign in to Pakka'}</h1>
        <p className="mt-2 text-center text-[15px] text-ink-500">{team ? 'Internal console. Team members only.' : role === 'owner' ? 'See your flats and every call Pakka made to you.' : 'See your requests, visits and calls with Pakka.'}</p>

        <div className="mt-8 rounded-[28px] bg-white p-6 shadow-card md:p-7">
          {stage === 'phone' ? (
            <form onSubmit={sendCode}>
              <div className={`grid grid-cols-2 gap-1 rounded-full bg-black/[.05] p-1 ${team ? 'hidden' : ''}`}>
                {[['tenant', "I'm looking for a flat"], ['owner', 'I own a flat']].map(([v, label]) => (
                  <button type="button" key={v} onClick={() => { setRole(v); setError(null); }}
                    className={`rounded-full py-2 text-[13px] transition-all ${role === v ? 'bg-white font-semibold text-ink-900 shadow-sm' : 'text-ink-500'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <label className={`label ${team ? '' : 'mt-6'}`}>Mobile number</label>
              <div className="flex items-center gap-2">
                <span className="flex h-12 items-center rounded-xl bg-black/[.04] px-3.5 text-[17px] text-ink-500">+91</span>
                <input autoFocus required inputMode="numeric" autoComplete="tel-national" className="input tnum h-12 text-[17px]" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} />
              </div>
              {error && <p className="mt-3 text-[14px] text-[#d70015]">{error}</p>}
              <button className="btn-primary mt-6 h-12 w-full text-[17px]" disabled={busy || phone.replace(/\D/g, '').length < 10}>{busy ? 'Sending…' : 'Send code'}</button>
            </form>
          ) : (
            <form onSubmit={verify}>
              <button type="button" onClick={() => { setStage('phone'); setCode(''); setError(null); }} className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ArrowLeft size={14} />Change number</button>
              <p className="text-[15px] text-ink-700">Enter the 6-digit code sent to <span className="tnum font-semibold">+91 {phone}</span></p>
              <input ref={codeInput} required inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                className="input tnum mt-4 h-14 text-center text-[26px] tracking-[.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              {devCode && (
                <p className="mt-3 rounded-xl bg-[#ff9f0a]/10 px-3 py-2 text-[12px] text-[#b25f00]">
                  Dev mode: codes aren't sent by SMS yet. Your code is <span className="tnum font-semibold">{devCode}</span> (also in the server log).
                </p>
              )}
              {error && <p className="mt-3 text-[14px] text-[#d70015]">{error}</p>}
              <button className="btn-primary mt-6 h-12 w-full text-[17px]" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Sign in'}</button>
              <button type="button" onClick={sendCode} className="mt-3 w-full text-[13px] text-brand-600 hover:underline">Send a new code</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
