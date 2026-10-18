import { Card, PageHeader } from '../../components/ui';

// Read-only for now: these mirror how the server and agents are configured today.
const SECTIONS = [
  {
    title: 'Calling rules',
    subtitle: 'How and when Pakka calls owners',
    rows: [
      ['A listing counts as current for', '48 hours after the owner confirms it on a call'],
      ['Re-checks', 'On a tenant request, or “Re-check now” on a listing'],
      ['Owners called per tenant request', 'Up to 2, one at a time per phone number'],
      ['AI disclosure', "Every call opens with “this is Pakka's AI assistant”"],
      ['Do-not-call', 'Honoured immediately and permanently'],
    ],
  },
  {
    title: 'Tenant experience',
    rows: [
      ['When a listing needs checking', 'Pakka calls the owner and calls the tenant back'],
      ['Budget flexibility', 'Offers flats up to 25% over budget, clearly labelled'],
      ['Visit confirmations', 'WhatsApp (coming soon)'],
    ],
  },
  {
    title: 'Team',
    rows: [
      ['Verril', 'Founder · Admin'],
    ],
  },
];

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" description="How Pakka operates in Whitefield." />
      <div className="max-w-3xl space-y-6">
        {SECTIONS.map((s) => (
          <Card key={s.title} title={s.title} subtitle={s.subtitle} bodyClass="px-5 py-1">
            <dl className="divide-y divide-black/[.06]">
              {s.rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3 text-sm">
                  <dt className="text-ink-500">{k}</dt>
                  <dd className="text-right font-medium text-ink-900">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
    </>
  );
}
