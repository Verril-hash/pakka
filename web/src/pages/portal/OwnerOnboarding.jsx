import { Check, FileText, IdCard, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import FlatRequestForm from '../../components/FlatRequestForm';
import { api } from '../../lib/api';
import { ago, rupees } from '../../lib/format';

/** One step of the verification timeline: done, current, or still ahead. */
function Step({ state, title, detail }) {
  return (
    <li className="flex gap-3.5">
      <span className={`mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full text-[12px] font-bold ${
        state === 'done' ? 'bg-pakka-400 text-ink-900' : state === 'now' ? 'bg-brand-600 text-white ring-4 ring-brand-600/15' : 'border border-dashed border-ink-300 text-ink-300'
      }`}>
        {state === 'done' ? <Check size={14} strokeWidth={3} /> : null}
      </span>
      <div className="pb-5">
        <p className={`text-[15px] font-semibold ${state === 'later' ? 'text-ink-400' : 'text-ink-900'}`}>{title}</p>
        {detail && <p className="mt-0.5 text-[13px] text-ink-500">{detail}</p>}
      </div>
    </li>
  );
}

/**
 * A new owner before the team has verified them: send the first flat, then "Pending verification"
 * until the team visits. Approval happens when the team lists the flat, and the full owner page opens.
 */
export default function OwnerOnboarding({ data, reload }) {
  const [busy, setBusy] = useState(false);
  const app = data.application;
  const hello = data.name ? `, ${data.name}` : '';

  async function cancel() {
    if (!confirm('Cancel this request and change the details?')) return;
    setBusy(true);
    try { await api(`/api/owner/listing-requests/${app.id}/cancel`, { method: 'POST' }); await reload(); } finally { setBusy(false); }
  }

  // ── Waiting for the team ──
  if (app) {
    const scheduled = app.status === 'visit_scheduled';
    return (
      <>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ff9f0a]/12 px-3 py-1 text-[13px] font-semibold text-[#8a4b00]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9f0a]" />Pending verification
        </span>
        <h1 className="mt-4 text-[34px] font-bold leading-tight tracking-display md:text-[44px]">Thanks{hello}.</h1>
        <p className="mt-2 max-w-[620px] text-[17px] text-ink-500">
          {scheduled
            ? 'Your visit with the Pakka team is fixed. Once we have seen the flat, it goes live and your owner page opens.'
            : 'The Pakka team will call you within 24 hours to fix a visit. Once we have seen the flat, it goes live.'}
        </p>

        <div className="mt-8 grid items-start gap-5 md:grid-cols-[1.1fr_1fr]">
          <section className="rounded-[24px] bg-white p-6 shadow-card">
            <ol>
              <Step state="done" title="Flat details sent" detail={`Sent ${ago(app.createdAt)}`} />
              <Step state={scheduled ? 'done' : 'now'} title="Pakka calls you to fix a visit" detail={app.visitTime ? `You suggested: ${app.visitTime}` : null} />
              <Step state={scheduled ? 'now' : 'later'} title="Visit and verification" detail="We meet you at the flat and check your ID and ownership." />
              <Step state="later" title="Your flat goes live" detail="Tenants who fit your rules start seeing it." />
            </ol>
          </section>

          <div className="space-y-5">
            <section className="rounded-[24px] bg-white p-6 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-ink-400">Your flat</p>
              <p className="mt-1 text-[20px] font-semibold tracking-display text-ink-900">{app.bhk} BHK · {app.area}</p>
              <p className="tnum mt-0.5 text-[14px] text-ink-500">
                {rupees(app.rent)}/month{app.deposit ? ` · deposit ${rupees(app.deposit)}` : ''}{app.furnishing ? ` · ${app.furnishing}` : ''}
              </p>
              {app.availableFrom && <p className="text-[14px] text-ink-500">Free from {app.availableFrom}</p>}
              <button onClick={cancel} disabled={busy} className="mt-4 text-[13px] font-medium text-ink-500 hover:text-ink-900">Change details</button>
            </section>

            <section className="rounded-[24px] bg-dark-card p-6 text-white">
              <p className="text-[17px] font-semibold tracking-display">Keep these ready for the visit</p>
              <ul className="mt-3 space-y-2.5 text-[14px] text-ink-300">
                <li className="flex gap-2.5"><IdCard size={17} className="mt-0.5 flex-none text-pakka-400" />A government ID: Aadhaar, PAN or driving licence</li>
                <li className="flex gap-2.5"><FileText size={17} className="mt-0.5 flex-none text-pakka-400" />Proof of ownership: sale deed, property tax receipt or electricity bill in your name</li>
                <li className="flex gap-2.5"><ShieldCheck size={17} className="mt-0.5 flex-none text-pakka-400" />Renting it out for someone? A signed note from the owner</li>
              </ul>
            </section>
          </div>
        </div>
      </>
    );
  }

  // ── First flat (new, or after a declined request) ──
  return (
    <>
      <h1 className="text-[34px] font-bold leading-tight tracking-display md:text-[44px]">Welcome{hello}.</h1>
      <p className="mt-2 max-w-[620px] text-[17px] text-ink-500">List your flat on Pakka for free. Tenants are matched to your rules, and you pay only when Pakka finds your tenant.</p>

      {data.status === 'declined' && (
        <div className="mt-6 rounded-[22px] bg-black/[.04] px-5 py-4 text-[15px] text-ink-700">
          <p className="font-semibold text-ink-900">We couldn't verify your last request.</p>
          {data.declineReason && <p className="mt-1">{data.declineReason}</p>}
          <p className="mt-1 text-ink-500">You're welcome to send it again with the right details.</p>
        </div>
      )}

      <FlatRequestForm
        className="mt-8 max-w-[720px]"
        endpoint="/api/owner/apply"
        title="Tell us about your flat"
        intro="The Pakka team visits every flat before tenants see it. Share the basics and we'll call you to fix a time."
        askOwnership
        submitLabel="Send for verification"
        onDone={reload}
      />
    </>
  );
}
