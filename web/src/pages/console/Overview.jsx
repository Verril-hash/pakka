import {
  Activity, BadgeCheck, CalendarCheck, CircleDollarSign, Clock3, Ghost, PhoneCall, PhoneIncoming, Plus, ShieldAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, ErrorNote, PageHeader, Skeleton, Stat } from '../../components/ui';
import { useApi } from '../../lib/api';
import { ago, cents, duration, LANGUAGES, OUTCOMES } from '../../lib/format';

const OUTCOME_COLORS = { confirmed: '#00b8d9', rented: '#98a2b3', call_later: '#f79009', do_not_call: '#f04438', wrong_number: '#d92d20', no_conversation: '#cbd5e1', pending: '#c7c7cc' };
const EVENT_TONES = { listing_confirmed: 'bg-emerald-500', listing_rented: 'bg-slate-400', broker_flagged: 'bg-red-500', visit_booked: 'bg-violet-500', owner_call: 'bg-sky-500', tenant_callback: 'bg-sky-500', listing_added: 'bg-brand-500' };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-black/[.06] bg-white px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-semibold text-ink-900">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-ink-500">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} /> {p.name}: <b className="text-ink-900">{p.value}</b>
        </p>
      ))}
    </div>
  );
}

export default function Overview() {
  const { data, error, loading } = useApi('/api/overview', { interval: 10000 });
  const k = data?.kpis;

  const days = (data?.callsByDay ?? []).map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));
  const outcomes = data?.outcomes ?? [];
  const outcomeTotal = outcomes.reduce((n, o) => n + o.count, 0);
  const langs = [...(data?.languages ?? [])].sort((a, b) => b.count - a.count);
  const langTotal = langs.reduce((n, l) => n + l.count, 0);

  return (
    <>
      <PageHeader
        title={`${greeting()}, Verril`}
        description="What Pakka's voice agents did across Whitefield."
        actions={
          <>
            <select className="input h-9 w-auto pr-8" defaultValue="14">
              <option value="14">Last 14 days</option>
            </select>
            <Link to="/console/listings/new" className="btn-primary"><Plus size={16} /> Add verified listing</Link>
          </>
        }
      />
      <ErrorNote error={error} />

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        {loading && !k ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-[108px]" />) : k && (
          <>
            <Stat dark label="Live listings" value={k.live} icon={BadgeCheck} hint={`${k.listings} verified in person by the Pakka team`} />
            <Stat label="Confirmed by call · 48h" value={k.fresh} icon={PhoneCall} tone="green" hint={`${k.live ? Math.round((k.fresh / k.live) * 100) : 0}% of live listings are current`} />
            <Stat label="Dead listings caught" value={k.deadCaught} icon={Ghost} tone="amber" hint="Rented flats hidden before a tenant wasted a visit" />
            <Stat label="Visits booked" value={k.visits} icon={CalendarCheck} tone="violet" hint={`From ${k.requests} tenant request${k.requests === 1 ? '' : 's'}`} />
          </>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-4 md:gap-4 xl:grid-cols-4">
        {k && (
          <>
            <MiniStat icon={PhoneIncoming} label="Owner calls" value={k.ownerCalls} sub={`${k.pickupRate}% picked up`} />
            <MiniStat icon={Clock3} label="Avg owner call" value={duration(k.avgOwnerCallSec)} sub="Availability, rent, rules, visit slot" />
            <MiniStat icon={ShieldAlert} label="Brokers flagged" value={k.brokers} sub="Caught in conversation" />
            <MiniStat icon={CircleDollarSign} label="Voice cost" value={cents(k.totalCostCents)} sub={`${cents(k.costPerMinuteCents)} per minute · ${k.calls} calls`} />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-5 md:mt-6 md:gap-6 xl:grid-cols-3">
        <Card title="Call volume" subtitle="Owner re-checks and tenant conversations per day" className="xl:col-span-2">
          <div className="h-[220px] md:h-[260px]">
            <ResponsiveContainer>
              <BarChart data={days} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="#f0f0f2" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="owner" name="Owner calls" stackId="a" fill="#004aad" radius={[0, 0, 0, 0]} />
                <Bar dataKey="tenant" name="Tenant calls" stackId="a" fill="#00c8e0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-5 text-xs text-ink-500">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-brand-600" />Owner calls</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-pakka-500" />Tenant calls</span>
          </div>
        </Card>

        <Card title="Owner call outcomes" subtitle="What owners told Pakka">
          <div className="relative h-[190px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={outcomes} dataKey="count" nameKey="outcome" innerRadius={58} outerRadius={84} paddingAngle={2} strokeWidth={0}>
                  {outcomes.map((o) => <Cell key={o.outcome} fill={OUTCOME_COLORS[o.outcome] ?? '#cbd5e1'} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="tnum text-2xl font-semibold text-ink-900">{outcomeTotal}</p>
                <p className="text-xs text-ink-500">owner calls</p>
              </div>
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {outcomes.map((o) => (
              <li key={o.outcome} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ink-500">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: OUTCOME_COLORS[o.outcome] ?? '#cbd5e1' }} />
                  {OUTCOMES[o.outcome]?.label ?? o.outcome}
                </span>
                <span className="tnum font-medium text-ink-900">{o.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 md:mt-6 md:gap-6 xl:grid-cols-3">
        <Card title="Listing freshness" subtitle="When each live listing was last confirmed with its owner">
          <div className="h-[200px]">
            <ResponsiveContainer>
              <BarChart data={data?.freshness ?? []} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="bucket" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#475569' }} width={70} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" name="Listings" radius={[0, 4, 4, 0]} barSize={18}>
                  {(data?.freshness ?? []).map((f, i) => <Cell key={f.bucket} fill={['#004aad', '#00c8e0', '#fec84b', '#f79009'][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Languages spoken" subtitle="Every call starts in the other person's language">
          <ul className="space-y-4 pt-1">
            {langs.map((l) => (
              <li key={l.language}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-900">
                    {LANGUAGES[l.language]?.native !== LANGUAGES[l.language]?.label && <span className="mr-1.5">{LANGUAGES[l.language]?.native}</span>}
                    <span className="text-ink-500">{LANGUAGES[l.language]?.label ?? l.language}</span>
                  </span>
                  <span className="tnum text-ink-500">{l.count} · {Math.round((l.count / langTotal) * 100)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/[.05]">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(l.count / langTotal) * 100}%` }} />
                </div>
              </li>
            ))}
            {!langs.length && <p className="text-sm text-ink-500">No calls yet.</p>}
          </ul>
        </Card>

        <Card title="Recent activity" actions={<Link to="/console/live" className="text-xs font-medium text-brand-700 hover:underline">Open live view</Link>} bodyClass="px-5 py-3">
          <ol className="relative">
            {(data?.events ?? []).slice(0, 7).map((e, i) => (
              <li key={i} className="relative flex gap-3 pb-3.5 last:pb-0">
                <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${EVENT_TONES[e.type] ?? 'bg-slate-300'}`} />
                <div className="min-w-0">
                  <p className="text-sm text-ink-700">{e.text}</p>
                  <p className="text-xs text-ink-400">{ago(e.at)}</p>
                </div>
              </li>
            ))}
            {!data?.events?.length && <p className="py-6 text-center text-sm text-ink-500"><Activity size={16} className="mx-auto mb-2 text-ink-300" />Nothing yet today.</p>}
          </ol>
        </Card>
      </div>
    </>
  );
}

function MiniStat({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-black/[.06] bg-white px-4 py-3.5">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-black/[.03] text-ink-500 ring-1 ring-inset ring-black/[.06]">
        <Icon size={17} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="tnum text-[17px] font-semibold text-ink-900">{value}</p>
        <p className="truncate text-[11px] text-ink-400">{sub}</p>
      </div>
    </div>
  );
}
