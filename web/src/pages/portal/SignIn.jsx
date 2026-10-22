import { GoogleAuthProvider, linkWithPhoneNumber, RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup, signOut } from 'firebase/auth';
import { ArrowLeft, Phone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { auth } from '../../lib/firebase';

const LANGS = [['en', 'English'], ['hi', 'हिंदी'], ['kn', 'ಕನ್ನಡ'], ['ta', 'தமிழ்']];
const HOME = { tenant: '/me', owner: '/owner', team: '/console' };

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const friendly = (err) => {
  const code = err?.code ?? '';
  if (code.includes('invalid-verification-code')) return 'That code is not right.';
  if (code.includes('code-expired')) return 'That code has expired. Send a new one.';
  if (code.includes('too-many-requests')) return 'Too many tries. Please wait a few minutes.';
  if (code.includes('invalid-phone-number')) return 'Enter a 10-digit Indian mobile number.';
  if (code.includes('popup-closed') || code.includes('cancelled-popup')) return null;
  if (code.includes('credential-already-in-use') || code.includes('account-exists')) return 'This number is already linked to another account. Sign in with phone instead.';
  if (code.includes('billing-not-enabled') || code.includes('quota') || code.includes('operation-not-allowed')) return 'Phone codes are not available right now. Please continue with Google, or try again later.';
  return err?.message ?? 'Something went wrong. Please try again.';
};

export default function SignIn({ team = false }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [role, setRole] = useState(team ? 'team' : params.get('as') === 'owner' ? 'owner' : 'tenant');
  // start | code | linkPhone | linkCode | profile
  const [stage, setStage] = useState('start');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState(null);
  const confirmation = useRef(null);
  const verifier = useRef(null);

  const next = params.get('next');
  const goHome = (r) => navigate(r === 'tenant' && next?.startsWith('/') && !next.startsWith('//') ? next : HOME[r]);

  // Already signed in but profile missing (e.g. sent here from an account page)? Go straight to the profile.
  useEffect(() => {
    api('/api/me').then((m) => {
      if (m.role && m.role === role && m.needsProfile) { setMe(m); setStage('profile'); }
    }).catch(() => {});
  }, [role]);

  // clear() can throw once the reCAPTCHA element is gone. Thrown during the unmount after phone sign-in,
  // it took the whole app down: a blank /me until a reload.
  useEffect(() => () => { try { verifier.current?.clear?.(); } catch { /* already gone */ } }, []);

  function recaptcha() {
    if (!verifier.current) verifier.current = new RecaptchaVerifier(auth, 'recaptcha', { size: 'invisible' });
    return verifier.current;
  }

  /** Exchange the Firebase session for a Pakka session, then route to the next step. */
  async function finish() {
    const idToken = await auth.currentUser.getIdToken(true);
    const out = await api('/api/auth/firebase', { method: 'POST', body: { idToken, role } });
    if (out.needsPhone) { setStage('linkPhone'); return; }
    if (out.needsProfile) {
      setMe(await api('/api/me'));
      setStage('profile');
      return;
    }
    goHome(out.role);
  }

  async function run(fn) {
    setBusy(true); setError(null);
    try { await fn(); } catch (err) {
      const msg = friendly(err);
      if (msg) setError(msg);
      // If our server refused (e.g. not an owner), don't leave a half-signed-in Firebase user around.
      if (err?.message && !err?.code) await signOut(auth).catch(() => {});
    } finally { setBusy(false); }
  }

  const e164 = () => `+91${phone.replace(/\D/g, '').slice(-10)}`;

  const google = () => run(async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
    await finish();
  });

  const sendCode = (e) => { e?.preventDefault(); run(async () => {
    confirmation.current = await signInWithPhoneNumber(auth, e164(), recaptcha());
    setCode(''); setStage('code');
  }); };

  const linkPhone = (e) => { e?.preventDefault(); run(async () => {
    confirmation.current = await linkWithPhoneNumber(auth.currentUser, e164(), recaptcha());
    setCode(''); setStage('linkCode');
  }); };

  const confirmCode = (e) => { e?.preventDefault(); run(async () => {
    await confirmation.current.confirm(code);
    await finish();
  }); };

  const title = team ? 'Pakka team' : stage === 'profile' ? 'A few details' : 'Sign in to Pakka';
  const subtitle = team ? 'Team members only.'
    : stage === 'profile' ? 'So Pakka knows who it is talking to. You only do this once.'
      : role === 'owner' ? 'Manage your flats and calls from Pakka.' : 'Your requests, visits and calls with Pakka.';

  return (
    <main className="flex min-h-[calc(100vh-48px)] items-start justify-center bg-canvas px-5 pb-20 pt-14 md:pt-20">
      <div className="w-full max-w-[420px]">
        <h1 className="text-center text-[34px] font-semibold tracking-display">{title}</h1>
        <p className="mt-2 text-center text-[15px] text-ink-500">{subtitle}</p>

        <div className="mt-8 rounded-[28px] bg-white p-6 shadow-card md:p-7">
          {stage === 'start' && (
            <>
              {!team && (
                <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-black/[.05] p-1">
                  {[['tenant', 'Find a flat'], ['owner', 'List my flat']].map(([v, label]) => (
                    <button type="button" key={v} onClick={() => { setRole(v); setError(null); }}
                      className={`whitespace-nowrap rounded-full py-2.5 text-[14px] transition-all ${role === v ? 'bg-white font-semibold text-ink-900 shadow-sm' : 'text-ink-500'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <button onClick={google} disabled={busy} className="btn h-12 w-full bg-white text-[16px] text-ink-900 ring-1 ring-black/10 hover:bg-black/[.02]">
                <GoogleMark />Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-[12px] text-ink-400"><span className="h-px flex-1 bg-black/[.08]" />or<span className="h-px flex-1 bg-black/[.08]" /></div>

              <form onSubmit={sendCode}>
                <label className="label">Mobile number</label>
                <div className="flex items-center gap-2">
                  <span className="flex h-12 items-center rounded-xl bg-black/[.04] px-3.5 text-[17px] text-ink-500">+91</span>
                  <input required inputMode="numeric" autoComplete="tel-national" className="input tnum h-12 text-[17px]" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} />
                </div>
                <button className="btn-primary mt-4 h-12 w-full text-[16px]" disabled={busy || phone.replace(/\D/g, '').length < 10}>
                  <Phone size={16} />{busy ? 'Sending…' : 'Continue with phone'}
                </button>
              </form>
            </>
          )}

          {stage === 'linkPhone' && (
            <form onSubmit={linkPhone}>
              <p className="text-[15px] font-semibold text-ink-900">Add your mobile number</p>
              <p className="mt-1 text-[13px] text-ink-500">Pakka works over the phone, so we confirm your number once.</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="flex h-12 items-center rounded-xl bg-black/[.04] px-3.5 text-[17px] text-ink-500">+91</span>
                <input autoFocus required inputMode="numeric" autoComplete="tel-national" className="input tnum h-12 text-[17px]" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, ''))} />
              </div>
              <button className="btn-primary mt-4 h-12 w-full text-[16px]" disabled={busy || phone.replace(/\D/g, '').length < 10}>{busy ? 'Sending…' : 'Send code'}</button>
            </form>
          )}

          {(stage === 'code' || stage === 'linkCode') && (
            <form onSubmit={confirmCode}>
              <button type="button" onClick={() => { setStage(stage === 'code' ? 'start' : 'linkPhone'); setError(null); }} className="mb-4 inline-flex items-center gap-1 text-[13px] text-ink-500 hover:text-ink-900"><ArrowLeft size={14} />Change number</button>
              <p className="text-[15px] text-ink-700">Enter the 6-digit code sent to <span className="tnum font-semibold">{e164().replace('+91', '+91 ')}</span></p>
              <input autoFocus required inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                className="input tnum mt-4 h-14 text-center text-[26px] tracking-[.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              <button className="btn-primary mt-5 h-12 w-full text-[16px]" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Confirm'}</button>
              <button type="button" onClick={stage === 'code' ? sendCode : linkPhone} disabled={busy} className="mt-3 w-full text-[13px] text-brand-600 hover:underline">Send a new code</button>
            </form>
          )}

          {stage === 'profile' && <ProfileForm role={role} me={me} onDone={() => goHome(role)} />}

          {error && <p className="mt-4 text-[14px] text-[#d70015]">{error}</p>}
          <div id="recaptcha" />
        </div>

        {stage === 'start' && !team && (
          <p className="mt-5 px-2 text-center text-[12px] leading-relaxed text-ink-400">By continuing you agree to receive calls from Pakka's AI assistant about your flat search or listing.</p>
        )}
      </div>
    </main>
  );
}

function ProfileForm({ role, me, onDone }) {
  const [f, setF] = useState({
    fullName: me?.name ?? '', email: me?.email ?? '', language: 'en',
    moveIn: '', budget: '', household: '', consentCalls: false, consentTerms: false,
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try { await api('/api/profile', { method: 'POST', body: f }); onDone(); } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div><label className="label">Full name</label><input required className="input h-11" value={f.fullName} onChange={set('fullName')} autoComplete="name" /></div>
      <div><label className="label">Email</label><input required type="email" className="input h-11" value={f.email} onChange={set('email')} autoComplete="email" /></div>
      <div>
        <label className="label">{role === 'owner' ? 'Language for calls' : 'Language you prefer'}</label>
        <div className="grid grid-cols-4 gap-1 rounded-full bg-black/[.05] p-1">
          {LANGS.map(([v, label]) => (
            <button type="button" key={v} onClick={() => setF({ ...f, language: v })} className={`rounded-full py-1.5 text-[13px] transition-all ${f.language === v ? 'bg-white font-semibold text-ink-900 shadow-sm' : 'text-ink-500'}`}>{label}</button>
          ))}
        </div>
      </div>

      {role === 'tenant' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Moving in</label>
              <select className="input h-11" value={f.moveIn} onChange={set('moveIn')}>
                <option value="">Choose</option><option>Immediately</option><option>This month</option><option>Next month</option><option>In 2–3 months</option>
              </select>
            </div>
            <div><label className="label">Budget / month</label><input inputMode="numeric" className="input tnum h-11" placeholder="25000" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value.replace(/\D/g, '') })} /></div>
          </div>
          <div><label className="label">Who's moving in</label>
            <select className="input h-11" value={f.household} onChange={set('household')}>
              <option value="">Choose</option><option value="family">Family</option><option value="couple">Couple</option><option value="bachelors">Friends / bachelors</option><option value="single">Just me</option>
            </select>
          </div>
        </>
      )}

      <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-ink-600">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={f.consentCalls} onChange={set('consentCalls')} />
        {role === 'owner' ? "I agree to short check-in calls from Pakka's AI assistant about my flat." : "I agree to calls from Pakka's AI assistant about my flat search."}
      </label>
      {role === 'owner' && (
        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-ink-600">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={f.consentTerms} onChange={set('consentTerms')} />
          I understand listing is free and I pay a fixed fee only when Pakka finds my tenant.
        </label>
      )}

      {error && <p className="text-[14px] text-[#d70015]">{error}</p>}
      <button className="btn-primary h-12 w-full text-[16px]" disabled={busy || !f.consentCalls || (role === 'owner' && !f.consentTerms)}>{busy ? 'Saving…' : 'Continue'}</button>
    </form>
  );
}
