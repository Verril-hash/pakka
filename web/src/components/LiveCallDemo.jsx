import { Check, ShieldAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useInView } from './Reveal';

// Illustrative calls, modelled on real Pakka Check conversations from testing.
// An owner line can confirm listing fields (`sets`); they tick on the right the moment they're said.
const CALLS = [
  {
    tab: 'English', who: 'Mr. Gowda', first: 'Gowda', initials: 'G', flat: '2 BHK · Brookefield', id: 'PK-101', rent: '₹23,000',
    fields: [['available', 'Still available'], ['rent', 'Rent · deposit'], ['pets', 'Pets'], ['visit', 'Visit slot'], ['owner', 'Owner or broker']],
    lines: [
      ['ai', "Hi Mr. Gowda, this is Pakka's AI assistant. Is your 2 BHK in Brookefield still available?"],
      ['owner', 'Yes, still available.', { available: 'Yes' }],
      ['ai', 'Great. Still ₹23,000 rent and one lakh deposit?'],
      ['owner', "Same. And a small dog is fine, if they're careful.", { rent: '₹23k · ₹1L', pets: 'Small dog OK' }],
      ['ai', 'Noted. When can someone come and see it this week?'],
      ['owner', "Saturday, 11 in the morning. It's my flat, I'll be there.", { visit: 'Sat 11 AM', owner: 'Owner' }],
    ],
    result: 'confirmed',
  },
  {
    tab: 'ಕನ್ನಡ', who: 'Mrs. Reddy', first: 'Reddy', initials: 'R', flat: '1 BHK · Kundalahalli', id: 'PK-103', rent: '₹15,000',
    fields: [['available', 'Still available'], ['rent', 'Rent'], ['tenants', 'Tenants'], ['visit', 'Visit slot']],
    lines: [
      ['ai', 'ನಮಸ್ಕಾರ Reddy ಅವರೇ, ನಾನು Pakka ಇಂದ AI assistant. ನಿಮ್ಮ 1 BHK ಇನ್ನೂ rent ಗೆ ಇದೆಯಾ?'],
      ['owner', 'ಹೌದು, ಇದೆ.', { available: 'Yes' }],
      ['ai', 'Rent ಹದಿನೈದು ಸಾವಿರ ಅಲ್ವಾ? Bachelors ಆದ್ರೂ ಪರವಾಗಿಲ್ವಾ?'],
      ['owner', 'ಹಾ, ಹದಿನೈದೇ. Bachelors okay, veg only.', { rent: '₹15,000', tenants: 'Bachelors · veg' }],
      ['ai', 'ಸರಿ! ನೋಡೋಕೆ ಯಾವಾಗ ಬರಬಹುದು?'],
      ['owner', 'Sunday ಸಂಜೆ.', { visit: 'Sun evening' }],
    ],
    result: 'confirmed',
  },
  {
    tab: 'हिंदी', who: 'Mr. Sharma', first: 'Sharma', initials: 'S', flat: '2 BHK · Hoodi', id: 'PK-102', rent: '₹24,000',
    fields: [['available', 'Still available'], ['owner', 'Owner or broker']],
    lines: [
      ['ai', 'नमस्ते Sharma जी, मैं Pakka की AI assistant। आपका Hoodi वाला 2 BHK अभी available है?'],
      ['owner', 'हाँ, available है।', { available: 'Yes' }],
      ['ai', 'अच्छा। आप ही owner हैं ना?'],
      ['owner', 'नहीं, मैं broker हूँ।', { owner: 'Broker' }],
      ['ai', 'ठीक है, बताने के लिए धन्यवाद। हमारी team आपसे बात करेगी।'],
    ],
    result: 'broker',
  },
];

const LINE_MS = 1900;
const HOLD_MS = 4200;
const BARS = 44;

/** Voice equaliser: bars dance while someone is speaking; colour follows the speaker. */
function Waveform({ speaker }) {
  const color = speaker === 'ai' ? 'bg-pakka-500' : speaker === 'owner' ? 'bg-brand-600' : 'bg-ink-300';
  return (
    <div className="flex h-8 items-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => {
        const base = 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45));
        return (
          <i
            key={i}
            className={`h-full w-[3px] origin-center rounded-full transition-colors duration-500 ${color} ${speaker ? 'animate-eq' : ''}`}
            style={{ transform: speaker ? undefined : 'scaleY(.12)', animationDelay: `${(i % 9) * 0.09}s`, animationDuration: `${0.7 + base * 0.6}s`, opacity: 0.35 + base * 0.65 }}
          />
        );
      })}
    </div>
  );
}

function Avatar({ who, initials }) {
  if (who === 'ai') {
    return <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-gradient-to-br from-pakka-400 to-brand-600 text-[12px] font-bold text-white shadow-sm">p</span>;
  }
  return <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-brand-600/10 text-[12px] font-semibold text-brand-700">{initials}</span>;
}

export default function LiveCallDemo({ className = '' }) {
  const ref = useRef(null);
  const visible = useInView(ref, 0.25);
  const [callIdx, setCallIdx] = useState(0);
  const [shown, setShown] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [stamps, setStamps] = useState({}); // field → call time it was confirmed
  const secondsRef = useRef(0);
  const scroller = useRef(null);
  const call = CALLS[callIdx];
  const done = shown > call.lines.length;

  function jump(i) { setCallIdx(i); setShown(0); setSeconds(0); setStamps({}); }

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      if (shown <= call.lines.length) {
        const line = call.lines[shown];
        if (line?.[2]) setStamps((s) => ({ ...s, ...Object.fromEntries(Object.keys(line[2]).map((k) => [k, secondsRef.current])) }));
        setShown((s) => s + 1);
      } else jump((callIdx + 1) % CALLS.length);
    }, shown === 0 ? 700 : done ? HOLD_MS : LINE_MS);
    return () => clearTimeout(t);
  }, [visible, shown, done, call, callIdx]);

  useEffect(() => {
    if (!visible || done) return;
    const t = setInterval(() => setSeconds((s) => { secondsRef.current = s + 1; return s + 1; }), 1000);
    return () => clearInterval(t);
  }, [visible, done, callIdx]);

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [shown]);

  const confirmed = Object.assign({}, ...call.lines.slice(0, shown).map((l) => l[2] ?? {}));
  const count = call.fields.filter(([k]) => confirmed[k]).length;
  const speaker = !done && shown > 0 && shown < call.lines.length ? call.lines[shown][0] : !done && shown === 0 ? 'ai' : null;
  const broker = call.result === 'broker';
  const clock = (s) => `0:${String(s).padStart(2, '0')}`;

  return (
    <div ref={ref} className={`relative mx-auto w-full max-w-[980px] ${className}`}>
      <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.05),0_30px_80px_-24px_rgba(0,49,115,.28)] ring-1 ring-black/[.06]">

        {/* ── Top bar: call switcher + live voice ─────────────────── */}
        <div className="flex flex-wrap items-center gap-4 border-b border-black/[.05] px-5 py-3.5 md:px-6">
          <div className="flex gap-1 rounded-full bg-black/[.04] p-1" role="tablist" aria-label="Sample calls">
            {CALLS.map((c, i) => (
              <button
                key={c.tab}
                role="tab"
                aria-selected={i === callIdx}
                onClick={() => jump(i)}
                className={`relative overflow-hidden rounded-full px-3.5 py-1.5 text-[13px] transition-all ${i === callIdx ? 'bg-white font-semibold text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'}`}
              >
                {c.tab}
                {i === callIdx && (
                  <span className="absolute inset-x-3 bottom-0.5 h-[2px] overflow-hidden rounded-full bg-black/[.06]">
                    <span className="block h-full rounded-full bg-gradient-to-r from-pakka-400 to-brand-600 transition-[width] duration-700" style={{ width: `${Math.min(100, (shown / call.lines.length) * 100)}%` }} />
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-[12px] font-medium text-ink-400 sm:block">
              {done ? 'Call ended' : speaker === 'owner' ? `${call.first} speaking` : 'Pakka speaking'}
            </span>
            <span className={`tnum flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${done ? 'bg-black/[.05] text-ink-500' : 'bg-[#ff3b30]/10 text-[#d70015]'}`}>
              {!done && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff3b30]" />}
              {done ? clock(seconds) : `LIVE ${clock(seconds)}`}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-[1.4fr_1fr]">
          {/* ── Conversation ─────────────────────────────────────── */}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-4 px-6 pb-2 pt-5">
              <div className="min-w-0">
                <p className="text-[13px] text-ink-400">Pakka is calling</p>
                <p className="truncate text-[20px] font-semibold tracking-display text-ink-900">{call.who}</p>
              </div>
              <div className="ml-auto hidden sm:block"><Waveform speaker={speaker} /></div>
            </div>
            <div
              ref={scroller}
              className="no-scrollbar h-[330px] space-y-4 overflow-y-auto px-6 pb-6 pt-4 text-left"
              style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 36px)', maskImage: 'linear-gradient(to bottom, transparent 0, #000 36px)' }}
            >
              {call.lines.slice(0, shown).map(([who, text], i) => (
                <div key={`${callIdx}-${i}`} className={`flex animate-bubble-in items-end gap-2.5 ${who === 'ai' ? '' : 'flex-row-reverse'}`}>
                  <Avatar who={who} initials={call.initials} />
                  <p className={`max-w-[78%] rounded-[20px] px-4 py-2.5 text-[15px] leading-snug ${who === 'ai' ? 'rounded-bl-md bg-canvas text-ink-900' : 'rounded-br-md bg-brand-600 text-white'}`}>
                    {text}
                  </p>
                </div>
              ))}
              {speaker && shown > 0 && (
                <div className={`flex items-end gap-2.5 ${speaker === 'ai' ? '' : 'flex-row-reverse'}`}>
                  <Avatar who={speaker} initials={call.initials} />
                  <span className={`flex gap-1 rounded-full px-3.5 py-3 ${speaker === 'ai' ? 'bg-canvas' : 'bg-brand-600/10'}`}>
                    {[0, 150, 300].map((d) => <i key={d} className={`h-1.5 w-1.5 animate-pulse rounded-full ${speaker === 'ai' ? 'bg-ink-300' : 'bg-brand-400'}`} style={{ animationDelay: `${d}ms` }} />)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Listing, updating live ───────────────────────────── */}
          <div className="relative flex flex-col border-t border-black/[.05] bg-[linear-gradient(180deg,#f7f9fc,#fff)] px-6 pb-6 pt-5 text-left md:border-l md:border-t-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-ink-400">Listing</p>
              <span className="font-mono text-[11px] text-ink-400">{call.id}</span>
            </div>
            <p className="mt-1 text-[20px] font-semibold tracking-display text-ink-900">{call.flat}</p>
            <p className="text-[13px] text-ink-500">{call.rent} / month</p>

            <div className="mt-4">
              <div className="flex justify-between text-[12px] text-ink-500">
                <span>{count} of {call.fields.length} confirmed on this call</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[.06]">
                <div className={`h-full rounded-full transition-[width] duration-700 ${broker && confirmed.owner ? 'bg-[#ff3b30]' : 'bg-gradient-to-r from-pakka-400 to-brand-600'}`} style={{ width: `${(count / call.fields.length) * 100}%` }} />
              </div>
            </div>

            <ul className="mt-4 divide-y divide-black/[.05]">
              {call.fields.map(([key, label]) => {
                const v = confirmed[key];
                const bad = v === 'Broker';
                return (
                  <li key={`${callIdx}-${key}`} className="flex items-center gap-3 py-2.5">
                    <span className={`grid h-6 w-6 flex-none place-items-center rounded-full transition-all duration-500 ${v ? (bad ? 'bg-[#ff3b30] text-white' : 'bg-pakka-400 text-ink-900') : 'border border-dashed border-ink-300'}`}>
                      {v && (bad ? <ShieldAlert size={12} strokeWidth={2.6} /> : <Check size={13} strokeWidth={3.2} />)}
                    </span>
                    <span className="flex-1 text-[13px] text-ink-500">{label}</span>
                    {v ? (
                      <span className="flex animate-pop flex-col items-end">
                        <span className={`text-[14px] font-semibold ${bad ? 'text-[#d70015]' : 'text-ink-900'}`}>{v}</span>
                        <span className="tnum text-[11px] text-ink-400">at {clock(stamps[key] ?? 0)}</span>
                      </span>
                    ) : (
                      <span className="text-[13px] text-ink-300">listening…</span>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Stamp */}
            {done && (
              <div className="pointer-events-none absolute right-5 top-12 animate-stamp">
                <div className={`rounded-xl border-[2.5px] px-3.5 py-2 text-center backdrop-blur-sm ${broker ? 'border-[#ff3b30] bg-white/80 text-[#d70015]' : 'border-brand-600 bg-white/80 text-brand-700'}`}>
                  {broker ? (
                    <p className="flex items-center gap-1.5 text-[15px] font-extrabold uppercase tracking-[.08em]"><ShieldAlert size={16} strokeWidth={2.6} />Broker flagged</p>
                  ) : (
                    <>
                      <img src="/images/pakka-wordmark.png" alt="Pakka" className="mx-auto h-5 w-auto" />
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[.16em]">Confirmed by call</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[12px] text-ink-400">Illustration based on real Pakka calls · tap a language to switch</p>
    </div>
  );
}
