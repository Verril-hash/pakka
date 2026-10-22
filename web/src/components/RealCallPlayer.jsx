import { Check, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * A real Pakka Check call, recorded during testing, with the transcript in time with the audio.
 * The public site plays this instead of placing calls, so nobody can point Pakka at someone else's phone.
 * Line times are where each speaker starts in the recording (measured from its two audio channels).
 */
const CALLS = [
  {
    id: 'en',
    label: 'English',
    src: '/demo/owner-call-en.mp3',
    duration: 77.8,
    flat: '2 BHK · Brookefield',
    lines: [
      [0.1, 'ai', "Hello, Gowda ji? This is Pakka's AI assistant. I'm calling about your 2 BHK in Brookefield — is it still available for rent?"],
      [11.7, 'owner', 'Yeah, yeah, it is available.'],
      [15.4, 'ai', 'Achha, thanks. Is the rent still twenty-three thousand and the deposit one lakh?'],
      [21.0, 'owner', 'Uh, rent is 30k, and the deposit is, uh, 2 lakh.'],
      [28.0, 'ai', "Oh, thirty thousand now and two lakh deposit — okay. You're the owner yourself, right?"],
      [34.1, 'owner', "Yeah, yeah, I'm the owner myself."],
      [37.5, 'ai', 'Got it. Who do you prefer for the flat — family, bachelors, or anyone?'],
      [45.4, 'owner', "Families or bachelors. I'm okay with both of them."],
      [50.9, 'ai', 'Okay, and is a small dog okay there?'],
      [54.6, 'owner', 'Small dog? No, not really allowed.'],
      [58.6, 'ai', 'Understood, no small dog. What day and time this week would work for a visit?'],
      [64.6, 'owner', 'Wednesday at 4:00 PM would be better.'],
      [70.8, 'ai', "Great, Wednesday at 4:00 PM. Thank you so much, Mr. Gowda — we'll only send tenants who fit what you're looking for."],
    ],
    // What Pakka noted, appearing once the owner has said it.
    notes: [
      [12.7, 'Available', 'Yes'],
      [24.7, 'Rent', '₹30,000 (was ₹23,000)'],
      [24.7, 'Deposit', '₹2,00,000'],
      [34.9, 'Listed by', 'Owner'],
      [47.4, 'Tenants', 'Family or bachelors'],
      [55.7, 'Small dog', 'Not allowed'],
      [68.8, 'Visit', 'Wednesday, 4 PM'],
    ],
  },
];

const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Avatar({ who }) {
  return who === 'ai'
    ? <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-gradient-to-br from-pakka-400 to-brand-600 text-[12px] font-bold text-white shadow-sm">p</span>
    : <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-brand-600/10 text-[11px] font-semibold text-brand-700">G</span>;
}

export default function RealCallPlayer({ className = '' }) {
  const [callIdx, setCallIdx] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audio = useRef(null);
  const scroller = useRef(null);
  const call = CALLS[callIdx];

  const shown = call.lines.filter(([at]) => at <= t + 0.05);
  const notes = call.notes.filter(([at]) => at <= t);
  const started = t > 0 || playing;
  const done = t >= call.duration - 0.3;
  const speaker = playing ? shown.at(-1)?.[1] : null;

  // Keep the newest line in view by scrolling the transcript box only, never the page.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [shown.length]);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      if (done) a.currentTime = 0;
      a.play().catch(() => setPlaying(false));
    } else a.pause();
  }

  function seek(e) {
    const a = audio.current;
    const r = e.currentTarget.getBoundingClientRect();
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * call.duration;
    setT(a.currentTime);
  }

  function pick(i) {
    audio.current?.pause();
    setCallIdx(i);
    setT(0);
  }

  return (
    <div className={`overflow-hidden rounded-[28px] bg-white shadow-[0_1px_2px_rgba(0,0,0,.05),0_30px_80px_-24px_rgba(0,49,115,.28)] ring-1 ring-black/[.06] ${className}`}>
      <audio
        ref={audio}
        src={call.src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setT(call.duration); }}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
      />

      {/* Header: language tabs + real-call badge */}
      <div className="flex items-center gap-3 border-b border-black/[.05] px-5 py-3.5">
        {CALLS.length > 1 ? (
          <div className="flex gap-1 rounded-full bg-black/[.04] p-1" role="tablist" aria-label="Recorded calls">
            {CALLS.map((c, i) => (
              <button key={c.id} role="tab" aria-selected={i === callIdx} onClick={() => pick(i)}
                className={`rounded-full px-3.5 py-1.5 text-[13px] transition-all ${i === callIdx ? 'bg-white font-semibold text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'}`}>
                {c.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[13px] font-semibold text-ink-900">{call.label}</p>
        )}
        <span className="ml-auto rounded-full bg-pakka-500/10 px-2.5 py-1 text-[12px] font-semibold text-pakka-700">Real call</span>
      </div>

      <div className="grid sm:grid-cols-[1.35fr_1fr]">
        {/* Transcript */}
        <div ref={scroller} className="no-scrollbar h-[300px] space-y-3.5 overflow-y-auto px-5 pb-5 pt-4 text-left">
          {!started && (
            <button onClick={toggle} className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-white shadow-lg transition-transform hover:scale-105"><Play size={26} className="ml-1" fill="currentColor" /></span>
              <span className="text-[15px] font-medium text-ink-900">Play the call</span>
              <span className="text-[13px] text-ink-500">Pakka checks a flat with its owner · {clock(call.duration)}</span>
            </button>
          )}
          {started && shown.map(([at, who, text]) => (
            <div key={`${call.id}-${at}`} className={`flex animate-bubble-in items-end gap-2.5 ${who === 'ai' ? '' : 'flex-row-reverse'}`}>
              <Avatar who={who} />
              <p className={`max-w-[80%] rounded-[20px] px-4 py-2.5 text-[15px] leading-snug ${who === 'ai' ? 'rounded-bl-md bg-canvas text-ink-900' : 'rounded-br-md bg-brand-600 text-white'} ${speaker === who && at === shown.at(-1)[0] ? 'ring-2 ring-pakka-400/60' : ''}`}>
                {text}
              </p>
            </div>
          ))}
        </div>

        {/* What Pakka noted */}
        <div className="relative border-t border-black/[.05] bg-[linear-gradient(180deg,#f7f9fc,#fff)] px-5 pb-5 pt-4 text-left sm:border-l sm:border-t-0">
          <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-ink-400">What Pakka noted</p>
          <p className="mt-1 text-[17px] font-semibold tracking-display text-ink-900">{call.flat}</p>
          <ul className="mt-3 space-y-2">
            {call.notes.map(([at, k, v]) => {
              const on = notes.some((n) => n[1] === k);
              return (
                <li key={k} className={`flex items-baseline justify-between gap-3 text-[13px] transition-opacity duration-500 ${on ? 'opacity-100' : 'opacity-30'}`}>
                  <span className="flex items-center gap-1.5 text-ink-500">
                    <Check size={13} strokeWidth={3} className={on ? 'text-pakka-600' : 'text-ink-300'} />{k}
                  </span>
                  <span className="text-right font-medium text-ink-900">{on ? v : '—'}</span>
                </li>
              );
            })}
          </ul>
          {/* Reserved row, so the stamp never covers the notes */}
          <div className="mt-4 flex h-9 items-center justify-center">
            {done && (
              <span className="animate-stamp rounded-lg border-2 border-pakka-600 bg-white/80 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider text-pakka-600">
                Visit booked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Player bar */}
      <div className="flex items-center gap-3 border-t border-black/[.05] px-5 py-3">
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}
          className="grid h-9 w-9 flex-none place-items-center rounded-full bg-ink-900 text-white transition-transform hover:scale-105">
          {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} className="ml-0.5" fill="currentColor" />}
        </button>
        <div onClick={seek} className="group relative h-6 flex-1 cursor-pointer" role="slider" aria-label="Seek"
          aria-valuemin={0} aria-valuemax={Math.round(call.duration)} aria-valuenow={Math.round(t)}>
          <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-black/[.08]" />
          <span className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-pakka-400 to-brand-600" style={{ width: `${Math.min(100, (t / call.duration) * 100)}%` }} />
        </div>
        <span className="tnum w-[76px] flex-none text-right text-[12px] text-ink-500">{clock(t)} / {clock(call.duration)}</span>
      </div>
    </div>
  );
}
