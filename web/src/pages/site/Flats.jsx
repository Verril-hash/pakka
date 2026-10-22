import { Dog, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CallMeForm from '../../components/CallMeForm';
import FlatCard from '../../components/FlatCard';
import { api, useApi } from '../../lib/api';

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-full bg-black/[.05] p-1">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`rounded-full px-3.5 py-1.5 text-[14px] transition-all ${value === v ? 'bg-white font-semibold text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function Flats() {
  const [role, setRole] = useState(undefined); // undefined = loading, null = signed out
  useEffect(() => { api('/api/me').then((m) => setRole(m.role)).catch(() => setRole(null)); }, []);
  const tenant = role === 'tenant';
  const { data, loading, error, reload } = useApi(role === undefined ? null : tenant ? '/api/tenant/listings' : '/api/public/listings', { interval: 15000 });
  const [bhk, setBhk] = useState('');
  const [max, setMax] = useState('');
  const [pets, setPets] = useState(false);

  const listings = (data?.listings ?? [])
    .filter((l) => !bhk || String(l.bhk) === bhk)
    .filter((l) => !max || l.rent <= Number(max))
    .filter((l) => !pets || l.pets === 'yes');

  return (
    <main className="bg-canvas">
      <section className="mx-auto max-w-[1080px] px-5 pb-10 pt-14 md:pt-20">
        <h1 className="text-[48px] font-semibold leading-none tracking-tightest md:text-[72px]">Flats from owners.</h1>
        <p className="mt-3 text-[24px] font-semibold tracking-display text-ink-400 md:text-[32px]">Whitefield, Bengaluru. Zero brokerage.</p>

        {role === null && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-white px-5 py-4 shadow-card">
            <p className="flex items-center gap-2.5 text-[15px] text-ink-700"><Lock size={16} className="text-brand-600" />Sign in to see the exact location, visit times, and to book a visit.</p>
            <Link to="/signin?as=tenant&next=/flats" className="btn-primary">Sign in</Link>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Segmented value={bhk} onChange={setBhk} options={[['', 'Any'], ['1', '1 BHK'], ['2', '2 BHK'], ['3', '3 BHK']]} />
          <Segmented value={max} onChange={setMax} options={[['', 'Any budget'], ['20000', '≤ ₹20k'], ['25000', '≤ ₹25k'], ['40000', '≤ ₹40k']]} />
          <button onClick={() => setPets(!pets)} className={`rounded-full px-4 py-2 text-[14px] transition-all ${pets ? 'bg-ink-900 text-white' : 'bg-black/[.05] text-ink-700 hover:bg-black/[.08]'}`}>
            <Dog size={15} className="mr-1.5 inline -translate-y-px" />Pets allowed
          </button>
          <span className="ml-auto text-[14px] text-ink-500">{listings.length} flat{listings.length === 1 ? '' : 's'}</span>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1080px] gap-8 px-5 pb-28 lg:grid-cols-[1fr_340px]">
        <div className="grid content-start gap-5 sm:grid-cols-2">
          {error && <p className="text-[15px] text-[#e5484d]">Couldn't load flats right now.</p>}
          {(loading || role === undefined) && !data && [...Array(4)].map((_, i) => <div key={i} className="h-[380px] animate-pulse rounded-[28px] bg-white" />)}
          {listings.map((l, i) => (
            <FlatCard key={l.id} flat={l} tenant={tenant} busyElsewhere={data?.checking} onDone={reload} delay={(i % 2) * 80} />
          ))}
          {!loading && role !== undefined && listings.length === 0 && <p className="text-[15px] text-ink-500">No flats match these filters yet.</p>}
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-4 text-[24px] font-semibold leading-tight tracking-display">Don't see the one?<br /><span className="text-ink-400">Ask Pakka.</span></p>
          <CallMeForm />
          <p className="mt-4 px-1 text-[13px] leading-relaxed text-ink-500">Questions about a flat, like pets, parking or move-in dates? Pakka gets you the answer from the owner.</p>
        </aside>
      </section>
    </main>
  );
}
