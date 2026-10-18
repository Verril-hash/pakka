import { X } from 'lucide-react';
import { useEffect } from 'react';
import { LANGUAGES } from '../lib/format';

const TONES = {
  green: 'bg-pakka-500/10 text-pakka-700',
  amber: 'bg-[#ff9f0a]/[.12] text-[#b25f00]',
  red: 'bg-[#ff3b30]/10 text-[#d70015]',
  blue: 'bg-brand-600/10 text-brand-700',
  violet: 'bg-[#af52de]/10 text-[#8944ab]',
  brand: 'bg-brand-600/10 text-brand-700',
  gray: 'bg-black/[.05] text-ink-500',
};
const DOTS = { green: 'bg-pakka-500', amber: 'bg-[#ff9f0a]', red: 'bg-[#ff3b30]', blue: 'bg-brand-600', violet: 'bg-[#af52de]', brand: 'bg-brand-600', gray: 'bg-ink-300' };

export function Badge({ tone = 'gray', dot, pulse, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[12px] font-medium ${TONES[tone]} ${className}`}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${DOTS[tone]}`} />}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${DOTS[tone]}`} />
        </span>
      )}
      {children}
    </span>
  );
}

export function LangBadge({ code, native = true }) {
  const l = LANGUAGES[code];
  if (!l) return null;
  const showNative = native && code !== 'en';
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/[.04] px-2.5 py-[3px] text-[12px] font-medium text-ink-700">
      {showNative && <span className="text-ink-900">{l.native}</span>}
      <span className={showNative ? 'text-ink-400' : ''}>{l.label}</span>
    </span>
  );
}

export function PageHeader({ title, description, actions, children }) {
  return (
    <div className="mb-6 md:mb-8">
      {children}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-display text-ink-900 md:text-[34px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-[640px] text-[15px] text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({ title, subtitle, actions, children, className = '', bodyClass = 'p-5 md:p-6' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-5 pb-1 pt-5 md:px-6">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-ink-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-400">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, icon: Icon, tone = 'brand', dark = false }) {
  const color = dark ? 'text-pakka-400' : { brand: 'text-brand-600', green: 'text-pakka-600', amber: 'text-[#c46a00]', red: 'text-[#d70015]', violet: 'text-[#8944ab]', blue: 'text-brand-600' }[tone];
  return (
    <div className={`rounded-[22px] ${dark ? 'bg-dark-card text-white shadow-float' : 'card'} p-5 md:p-6`}>
      <p className={`flex items-center gap-1.5 text-[13px] font-medium ${dark ? 'text-ink-300' : 'text-ink-500'}`}>
        {Icon && <Icon size={14} strokeWidth={2.2} className={color} />}
        {label}
      </p>
      <p className={`tnum mt-3 text-[36px] font-semibold leading-none tracking-tightest md:text-[44px] ${dark ? 'text-gradient-cyan' : 'text-ink-900'}`}>{value}</p>
      {hint && <p className={`mt-3 text-[13px] leading-snug ${dark ? 'text-ink-400' : 'text-ink-400'}`}>{hint}</p>}
    </div>
  );
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Icon && (
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-black/[.04] text-ink-400">
          <Icon size={20} />
        </span>
      )}
      <p className="text-[15px] font-semibold text-ink-900">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[14px] text-ink-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-black/[.05] ${className}`} />;
}

export function ErrorNote({ error }) {
  if (!error) return null;
  return <div className="mb-5 rounded-2xl bg-[#ff3b30]/10 px-5 py-3.5 text-[14px] text-[#d70015]">Couldn't load: {error}</div>;
}

/** Segmented control. */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="no-scrollbar inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-black/[.05] p-[3px]">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] transition-all ${
            value === t.value ? 'bg-white font-semibold text-ink-900 shadow-[0_1px_3px_rgba(0,0,0,.1)]' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          {t.label}
          {t.count != null && <span className={`tnum ml-1.5 ${value === t.value ? 'text-ink-400' : 'text-ink-300'}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, width = 'max-w-xl' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <aside className={`relative m-0 flex h-full w-full sm:m-2 sm:h-[calc(100%-16px)] ${width} animate-slide-in flex-col overflow-hidden bg-white shadow-pop sm:rounded-[22px]`}>
        <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <div>
            <h2 className="text-[22px] font-semibold tracking-display text-ink-900">{title}</h2>
            {subtitle && <div className="mt-2 text-[13px] text-ink-500">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-full bg-black/[.05] text-ink-500 hover:bg-black/[.09]" aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="scroll-thin flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 text-[14px]">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium text-ink-900">{children ?? '—'}</dd>
    </div>
  );
}

export function Waveform({ className = '' }) {
  return (
    <span className={`inline-flex h-3.5 items-center gap-[2px] ${className}`}>
      {[0, 0.15, 0.3, 0.45].map((d) => (
        <i key={d} className="w-[3px] animate-wave rounded-full bg-brand-600" style={{ animationDelay: `${d}s` }} />
      ))}
    </span>
  );
}

export function Transcript({ text, agentLabel = 'Pakka', userLabel = 'Caller' }) {
  const lines = (text || '').split('\n').filter(Boolean);
  if (!lines.length) return <p className="text-[14px] text-ink-500">No transcript yet.</p>;
  return (
    <ol className="space-y-2">
      {lines.map((line, i) => {
        const [who, ...rest] = line.split(': ');
        const agent = who === 'assistant';
        return (
          <li key={i} className={`flex ${agent ? '' : 'justify-end'}`}>
            <div className={`max-w-[82%] rounded-[20px] px-4 py-2 text-[14px] leading-snug ${agent ? 'rounded-bl-md bg-[#e9e9eb] text-ink-900' : 'rounded-br-md bg-brand-600 text-white'}`}>
              <p className={`mb-0.5 text-[11px] font-medium ${agent ? 'text-ink-400' : 'text-white/70'}`}>{agent ? agentLabel : userLabel}</p>
              {rest.join(': ')}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
