import { CalendarCheck, Check, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ── Characters (simple SVG illustrations) ─────────────────────────── */

function Person({ bg, skin, shirt, hair, kind, className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill={bg} />
      <clipPath id={`clip-${kind}`}><circle cx="32" cy="32" r="32" /></clipPath>
      <g clipPath={`url(#clip-${kind})`}>
        {kind === 'tenant' && <path d="M17 30c0-12 6-19 15-19s15 7 15 19v14H17z" fill={hair} />}
        <path d="M11 66c0-13 9.5-21 21-21s21 8 21 21z" fill={shirt} />
        <rect x="28" y="38" width="8" height="9" rx="3" fill={skin} />
        <circle cx="32" cy="29" r="12" fill={skin} />
        {kind === 'tenant' && <path d="M20 27c1-9 6-13 12-13s11 4 12 13c-4-1-9-4-12-8-3 4-8 7-12 8z" fill={hair} />}
        {kind === 'gowda' && (
          <>
            <path d="M20 26c0-8 5-12 12-12s12 4 12 12c-2-3-6-5-12-5s-10 2-12 5z" fill={hair} />
            <path d="M26.5 35.2c2-1.6 3.8-1.2 5.5 0 1.7-1.2 3.5-1.6 5.5 0-1.8.8-3.6.9-5.5.2-1.9.7-3.7.6-5.5-.2z" fill={hair} />
          </>
        )}
        {kind === 'sharma' && (
          <>
            <path d="M21 25c0-7 5-11 11-11s11 4 11 11c-3-2-6-3-11-3s-8 1-11 3z" fill={hair} />
            <rect x="24" y="26.5" width="7" height="5" rx="2" fill="none" stroke="#1d1d1f" strokeWidth="1.3" />
            <rect x="33" y="26.5" width="7" height="5" rx="2" fill="none" stroke="#1d1d1f" strokeWidth="1.3" />
            <path d="M31 28.5h2" stroke="#1d1d1f" strokeWidth="1.3" />
          </>
        )}
        <circle cx="27.5" cy="29" r="1.4" fill="#1d1d1f" />
        <circle cx="36.5" cy="29" r="1.4" fill="#1d1d1f" />
        {kind !== 'gowda' && <path d="M28.5 34.5c2 1.8 5 1.8 7 0" stroke="#1d1d1f" strokeWidth="1.4" fill="none" strokeLinecap="round" />}
      </g>
    </svg>
  );
}

const CAST = {
  tenant: { name: 'Priya', role: 'Tenant', bg: '#e8f1ff', skin: '#c98d6b', shirt: '#004aad', hair: '#2b1d16' },
  gowda: { name: 'Mr. Gowda', role: 'Owner · ಕನ್ನಡ', bg: '#e6fbff', skin: '#a8714f', shirt: '#0094b3', hair: '#3a3a3c' },
  sharma: { name: 'Mr. Sharma', role: 'Owner · हिंदी', bg: '#f2f2f5', skin: '#d29c7a', shirt: '#6e6e73', hair: '#1d1d1f' },
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ── Small building blocks (all driven by a 0..1 `v`) ─────────────── */

/** Fades/slides in as v goes 0 → 1. Scroll-scrubbed, so it reverses on scroll up. */
function In({ v, dir = 'up', className = '', children }) {
  const x = clamp(v);
  const off = (1 - x) * 14;
  const t = { up: `translateY(${off}px)`, left: `translateX(${-off}px)`, right: `translateX(${off}px)` }[dir];
  return <div className={className} style={{ opacity: x, transform: `${t} scale(${0.96 + x * 0.04})` }}>{children}</div>;
}

const win = (v, a, len = 0.18) => clamp((v - a) / len);

function Avatar({ who, size = 'md', ringing }) {
  const c = CAST[who];
  return (
    <div className="flex flex-none flex-col items-center">
      <div className="relative">
        {ringing && <span className="absolute -inset-1.5 animate-ping rounded-full bg-pakka-400/30" />}
        <Person kind={who} {...c} className={`relative rounded-full ring-[3px] ring-white shadow-card ${size === 'sm' ? 'h-11 w-11' : 'h-14 w-14 md:h-16 md:w-16'}`} />
      </div>
      <p className="mt-1.5 whitespace-nowrap text-[12px] font-semibold text-ink-900">{c.name}</p>
      <p className="whitespace-nowrap text-[10px] text-ink-400">{c.role}</p>
    </div>
  );
}

function PakkaMark() {
  return (
    <div className="flex flex-none flex-col items-center">
      <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-white shadow-float ring-1 ring-black/[.06] md:h-16 md:w-16">
        <img src="/images/pakka-wordmark.png" alt="Pakka" className="h-3.5 w-auto md:h-4" />
      </div>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-pakka-700">AI assistant</p>
    </div>
  );
}

const TONE = {
  light: 'bg-canvas text-ink-900',
  blue: 'bg-brand-600 text-white',
  cyan: 'bg-pakka-400 text-ink-900',
  red: 'bg-[#ff3b30] text-white',
};

function Say({ v, tone = 'light', mine, children }) {
  return (
    <In v={v} className={`flex ${mine ? 'justify-end' : ''}`}>
      <p className={`max-w-[260px] rounded-[18px] px-3.5 py-2 text-[14px] leading-snug ${mine ? 'rounded-br-md' : 'rounded-bl-md'} ${TONE[tone]}`}>{children}</p>
    </In>
  );
}

function Chip({ v, status, children }) {
  const s = { pick: 'text-ink-900 ring-brand-600/25', ok: 'text-ink-900 ring-pakka-500/60', rented: 'text-ink-400 line-through ring-[#ff3b30]/30' }[status];
  return (
    <In v={v}>
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-2.5 py-1.5 text-[12px] font-semibold shadow-card ring-1 ${s}`}>
        {status === 'ok' && <Check size={13} strokeWidth={3} className="text-pakka-600" />}
        {status === 'rented' && <X size={13} strokeWidth={3} className="text-[#ff3b30]" />}
        {children}
      </span>
    </In>
  );
}

/* ── The five scenes ──────────────────────────────────────────────── */

const STEPS = [
  {
    time: '0:00',
    title: 'You tell Pakka what you need.',
    text: 'One call, in English, Hindi, Kannada or Tamil.',
    scene: (v) => (
      <div className="flex items-end gap-3">
        <Avatar who="tenant" ringing={v > 0.1 && v < 0.9} />
        <div className="min-w-0 flex-1 space-y-2 pb-6">
          <Say v={win(v, 0.15)} tone="blue">“Hi! I need a 2 BHK near ITPL, under 25k.”</Say>
          <Say v={win(v, 0.4)} tone="blue">“And I have a small dog.”</Say>
        </div>
      </div>
    ),
  },
  {
    time: '0:20',
    title: 'Pakka checks verified flats only.',
    text: 'No scraped posts. Two flats match, but neither has the dog question on record.',
    scene: (v) => (
      <div className="flex items-center gap-4">
        <PakkaMark />
        <div className="min-w-0 flex-1 space-y-2">
          <Chip v={win(v, 0.1)} status="pick">PK-101 · Brookefield · ₹23k</Chip>
          <Chip v={win(v, 0.3)} status="pick">PK-102 · Hoodi · ₹24k</Chip>
          <In v={win(v, 0.5)}><p className="text-[13px] text-ink-500">Dog allowed? <span className="font-semibold text-ink-900">Not on record.</span> Calling owners…</p></In>
        </div>
      </div>
    ),
  },
  {
    time: '0:45',
    title: 'Pakka calls the owners.',
    text: 'At the same time, each in their own language.',
    scene: (v) => (
      <div className="space-y-4">
        <In v={win(v, 0.05)} className="flex items-end gap-3">
          <Avatar who="gowda" size="sm" ringing={v > 0.05 && v < 0.5} />
          <div className="min-w-0 flex-1 space-y-1.5 pb-5">
            <Say v={win(v, 0.15)}>“Is your 2 BHK still free? Is a small dog okay?”</Say>
            <Say v={win(v, 0.3)} tone="cyan" mine>“ಹೌದು, small dog ಪರವಾಗಿಲ್ಲ.”</Say>
          </div>
        </In>
        <In v={win(v, 0.4)} className="flex items-end gap-3">
          <Avatar who="sharma" size="sm" ringing={v > 0.4 && v < 0.85} />
          <div className="min-w-0 flex-1 space-y-1.5 pb-5">
            <Say v={win(v, 0.5)}>“आपका Hoodi वाला flat अभी available है?”</Say>
            <Say v={win(v, 0.65)} tone="red" mine>“Already rented, ji.”</Say>
          </div>
        </In>
      </div>
    ),
  },
  {
    time: '4:00',
    title: 'Pakka calls you back.',
    text: 'With real answers, not guesses: which flat works, the rent, and when the owner can show it.',
    scene: (v) => (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Chip v={win(v, 0.05)} status="ok">PK-101 · dog OK</Chip>
          <Chip v={win(v, 0.15)} status="rented">PK-102 · rented</Chip>
        </div>
        <div className="flex items-end gap-3">
          <Avatar who="tenant" size="sm" ringing={v > 0.25 && v < 0.85} />
          <div className="min-w-0 flex-1 space-y-1.5 pb-5">
            <Say v={win(v, 0.3)}><span className="font-semibold text-pakka-700">Pakka: </span>“Gowda's flat works. ₹23k, dog OK, Saturday 11. Book it?”</Say>
            <Say v={win(v, 0.55)} tone="blue" mine>“Yes please!”</Say>
          </div>
        </div>
      </div>
    ),
  },
  {
    time: '4:40',
    title: 'Visit booked. Pakka.',
    text: 'The listing is fresh again, and the rented one is hidden from everyone else.',
    scene: (v) => (
      <In v={win(v, 0.1, 0.3)}>
        <div className="rotate-[-1.5deg] rounded-[20px] bg-white p-4 shadow-pop ring-1 ring-black/[.06]">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-gradient-to-br from-pakka-400 to-brand-600 text-white"><CalendarCheck size={20} /></span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-pakka-700">Visit booked</p>
              <p className="text-[17px] font-semibold text-ink-900">Saturday · 11:00 AM</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-dashed border-black/10 pt-3 text-[13px] text-ink-500">
            <span>2 BHK · Brookefield · ₹23,000</span>
            <span className="font-medium text-ink-700">Priya × Gowda</span>
          </div>
        </div>
      </In>
    ),
  },
];

/* ── Section ──────────────────────────────────────────────────────── */

export default function HowItWorksScroll() {
  const spine = useRef(null);
  const rows = useRef([]);
  const [fill, setFill] = useState(0);
  const [prog, setProg] = useState(() => STEPS.map(() => 0));
  const pinned = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('howall');

  const measure = useCallback(() => {
    const vh = window.innerHeight;
    const line = vh * 0.62; // the "reading line" on screen
    const s = spine.current?.getBoundingClientRect();
    if (s) setFill(clamp((line - s.top) / s.height));
    setProg(rows.current.map((el) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      // 0 when the row's top reaches the bottom of the screen, 1 when it's well past the reading line
      return clamp((vh - r.top) / (vh - line + r.height * 0.6));
    }));
  }, []);

  useEffect(() => {
    if (pinned) { setFill(1); setProg(STEPS.map(() => 1)); return undefined; }
    // Measure straight on scroll (only five rects): rAF-throttling can stall in background/throttled frames.
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => { window.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); };
  }, [measure, pinned]);

  return (
    <section id="how" className="scroll-mt-12 bg-white py-24 md:py-32">
      <div className="mx-auto max-w-[1080px] px-5">
        <div className="text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-2 text-[36px] font-semibold leading-[1.06] tracking-display md:text-[56px]">
            You make one call.<br /><span className="text-ink-400">Pakka makes the rest.</span>
          </h2>
        </div>

        <div ref={spine} className="relative mt-16 md:mt-24">
          {/* Spine: grey track + fill that grows with scroll */}
          <div className="absolute bottom-0 left-[19px] top-0 w-[3px] rounded-full bg-black/[.06] md:left-1/2 md:-translate-x-1/2">
            <div className="w-full rounded-full bg-gradient-to-b from-pakka-400 via-brand-500 to-brand-600" style={{ height: `${fill * 100}%` }} />
          </div>

          <ol className="space-y-14 md:space-y-24">
            {STEPS.map((st, i) => {
              const v = prog[i];
              const lit = v > 0.15;
              const right = i % 2 === 1; // desktop: scene alternates sides
              return (
                <li key={st.time} ref={(el) => { rows.current[i] = el; }} className="relative grid gap-5 pl-14 md:grid-cols-2 md:gap-16 md:pl-0">
                  {/* Node on the spine */}
                  <span
                    className={`tnum absolute left-0 top-0 z-10 grid h-10 w-10 place-items-center rounded-full font-mono text-[11px] font-semibold transition-all duration-500 md:left-1/2 md:h-12 md:w-12 md:-translate-x-1/2 md:text-[12px] ${
                      lit ? 'bg-ink-900 text-pakka-400 shadow-float' : 'bg-white text-ink-300 ring-2 ring-black/[.06]'
                    }`}
                  >
                    {st.time}
                  </span>

                  {/* Text */}
                  <In v={win(v, 0.05, 0.25)} dir={right ? 'left' : 'right'} className={`md:pt-2 ${right ? 'md:order-2 md:pl-4' : 'md:pr-4 md:text-right'}`}>
                    <p className="text-[12px] font-semibold text-pakka-600">Step {i + 1}</p>
                    <h3 className="mt-1 text-[22px] font-semibold leading-tight tracking-display text-ink-900 md:text-[28px]">{st.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-500 md:text-[17px]">{st.text}</p>
                  </In>

                  {/* Scene */}
                  <div className={right ? 'md:order-1 md:pr-4' : 'md:pl-4'}>
                    <div className="rounded-[24px] bg-white p-4 shadow-card ring-1 ring-black/[.05] md:p-5">{st.scene(v)}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
