import { CalendarCheck, Check, PhoneCall, PhoneOutgoing, User, X } from 'lucide-react';
import { LANGUAGES, duration, time } from '../lib/format';
import { Badge, LangBadge, Waveform } from './ui';

function outcomeOf(check) {
  const r = check.result ?? '';
  if (check.state === 'unreachable') return { label: 'No answer', tone: 'amber', bad: true };
  if (check.state === 'skipped') return { label: 'Skipped', tone: 'gray', bad: true };
  if (/already been rented/.test(r)) return { label: 'Rented', tone: 'gray', bad: true };
  if (/broker/.test(r)) return { label: 'Broker', tone: 'red', bad: true };
  if (/still available/.test(r)) return { label: 'Confirmed', tone: 'green' };
  return { label: 'Not confirmed', tone: 'amber', bad: true };
}

function Step({ state, icon: Icon, title, meta, children, onClick, last }) {
  const ring = {
    done: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
    bad: 'bg-black/[.03] text-ink-500 ring-slate-200',
    active: 'bg-sky-50 text-sky-600 ring-sky-300 shadow-[0_0_0_6px_rgba(46,144,250,.12)]',
    pending: 'bg-white text-ink-300 ring-black/[.06]',
  }[state];
  return (
    <li className={`relative pl-12 ${last ? '' : 'pb-6'}`}>
      {!last && <span className={`absolute left-[17px] top-9 bottom-0 w-px ${state === 'done' || state === 'bad' ? 'bg-emerald-200' : 'bg-black/[.06]'}`} />}
      <span className={`absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-full ring-1 ${ring}`}>
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <div className={onClick ? 'cursor-pointer rounded-lg -m-2 p-2 hover:bg-black/[.03]' : ''} onClick={onClick}>
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-semibold ${state === 'pending' ? 'text-ink-400' : 'text-ink-900'}`}>{title}</p>
          {meta}
        </div>
        {children && <div className="mt-1 text-sm text-ink-500">{children}</div>}
      </div>
    </li>
  );
}

/** Tenant → owner calls → callback → visit, for one request (a server "session"). */
export default function RequestTimeline({ session, listings, visits = [], onOpenCall }) {
  const byId = Object.fromEntries(listings.map((l) => [l.id, l]));
  const visit = visits.find((v) => v.tenantPhone && v.tenantPhone === session.tenantPhone && v.bookedAt >= session.createdAt);
  const recheck = session.kind === 'recheck';

  const steps = [];
  steps.push(
    <Step key="t" state="done" icon={User} title={recheck ? `Re-check requested · ${session.tenantName}` : `Tenant call · ${session.tenantName}`} meta={<span className="text-xs text-ink-400">{time(session.createdAt)}</span>}>
      {session.requirement || 'Looking for a flat'}
      {session.question && <p className="mt-1 text-ink-500">Question for the owner: “{session.question}”</p>}
    </Step>,
  );

  session.checks.forEach((c, i) => {
    const last = recheck && i === session.checks.length - 1;
    const l = byId[c.listingId] ?? {};
    const name = `${l.ownerName ?? 'Owner'} · ${l.bhk} BHK ${l.area}`;
    const lang = <LangBadge code={l.ownerLanguage} />;
    if (c.state === 'queued') {
      steps.push(<Step key={c.listingId} last={last} state="pending" icon={PhoneOutgoing} title={`Call ${name}`} meta={lang}>Waiting for the owner's line</Step>);
    } else if (c.state === 'calling') {
      steps.push(
        <Step key={c.listingId} last={last} state="active" icon={PhoneCall} title={`Calling ${name}`} meta={<>{lang}<Badge tone="blue" dot pulse>{c.liveStatus === 'in-progress' ? 'On call' : 'Ringing'}</Badge></>}>
          <span className="flex items-center gap-2 text-ink-500"><Waveform /> Speaking {LANGUAGES[l.ownerLanguage]?.label ?? ''} with the owner</span>
        </Step>,
      );
    } else {
      const o = outcomeOf(c);
      steps.push(
        <Step
          key={c.listingId}
          last={last}
          state={o.bad ? 'bad' : 'done'}
          icon={o.bad ? X : Check}
          title={`Called ${name}`}
          meta={<>{lang}<Badge tone={o.tone}>{o.label}</Badge>{c.durationSec ? <span className="tnum text-xs text-ink-400">{duration(c.durationSec)}</span> : null}</>}
          onClick={c.executionId && onOpenCall ? () => onOpenCall(c.executionId) : undefined}
        >
          {c.result}
          {c.executionId && onOpenCall && <span className="ml-1 text-xs font-medium text-brand-700">View call →</span>}
        </Step>,
      );
    }
  });

  if (!recheck) {
    const cb = session.state === 'checking' ? 'pending' : session.state === 'calling_back' ? 'active' : 'done';
    steps.push(
      <Step key="cb" state={cb} icon={PhoneOutgoing} title={`${cb === 'done' ? 'Called' : cb === 'active' ? 'Calling' : 'Call'} ${session.tenantName} back`}
        meta={cb === 'active' ? <Badge tone="blue" dot pulse>{session.callbackLiveStatus === 'in-progress' ? 'On call' : 'Ringing'}</Badge> : null}
        onClick={cb === 'done' && session.callbackExecutionId && onOpenCall ? () => onOpenCall(session.callbackExecutionId) : undefined}
      >
        {cb === 'pending' ? 'Once the owners have answered' : cb === 'active' ? <span className="flex items-center gap-2 text-ink-500"><Waveform /> Sharing what the owners said</span> : null}
      </Step>,
    );
    steps.push(
      <Step key="v" state={visit ? 'done' : 'pending'} icon={CalendarCheck} title={visit ? 'Visit booked' : 'Visit'} last>
        {visit ? `${visit.slot} · ${byId[visit.listingId]?.ownerName}'s ${byId[visit.listingId]?.bhk} BHK in ${byId[visit.listingId]?.area}` : session.state === 'done' ? 'No visit booked' : null}
      </Step>,
    );
  }

  return <ol>{steps}</ol>;
}
