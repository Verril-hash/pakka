import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui';
import { api } from '../../lib/api';

const AREAS = {
  Brookefield: [12.9690, 77.7212], Hoodi: [12.9918, 77.7161], Kundalahalli: [12.9605, 77.7128], Marathahalli: [12.9553, 77.7001],
  Whitefield: [12.9698, 77.7500], ITPL: [12.9857, 77.7365], Mahadevapura: [12.9915, 77.6960], 'AECS Layout': [12.9634, 77.7151],
};

const initial = {
  ownerName: '', ownerPhone: '', ownerLanguage: 'kn', bhk: '2', area: 'Brookefield', landmark: '', rent: '', deposit: '',
  furnishing: 'semi-furnished', tenantPreference: 'any', pets: 'unknown', parking: '', availableFrom: 'Immediately', houseRules: '', visitSlot: '', notes: '',
};

export default function NewListing() {
  const [f, setF] = useState(initial);
  const [checks, setChecks] = useState({ identity: false, visited: false, consent: false });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Small jitter so flats in the same area don't stack on one map point.
      const [lat, lng] = AREAS[f.area] ?? [12.97, 77.72];
      const jitter = () => (Math.random() - 0.5) * 0.006;
      const { listing } = await api('/api/listings', { method: 'POST', body: { ...f, lat: lat + jitter(), lng: lng + jitter() } });
      navigate(`/console/listings/${listing.id}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  const ready = Object.values(checks).every(Boolean);

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl">
      <Link to="/console/listings" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"><ArrowLeft size={15} /> Listings</Link>
      <h1 className="text-[22px] font-semibold tracking-tight text-ink-900">Add a verified listing</h1>
      <p className="mb-6 mt-1 text-sm text-ink-500">Only add flats you've verified yourself. From here on, Pakka Check keeps the listing current by calling the owner.</p>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-6">
        <Card title="Owner" subtitle="Who Pakka will call, and in which language">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label">Owner name</label><input required className="input" value={f.ownerName} onChange={set('ownerName')} placeholder="e.g. Gowda" /></div>
            <div><label className="label">Phone</label><input required className="input" value={f.ownerPhone} onChange={set('ownerPhone')} placeholder="98XXXXXXXX" inputMode="tel" /></div>
            <div>
              <label className="label">Calls in</label>
              <select className="input" value={f.ownerLanguage} onChange={set('ownerLanguage')}>
                <option value="kn">Kannada · ಕನ್ನಡ</option><option value="hi">Hindi · हिंदी</option><option value="ta">Tamil · தமிழ்</option><option value="en">English</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="Flat">
          <div className="grid gap-4 sm:grid-cols-4">
            <div><label className="label">BHK</label><select className="input" value={f.bhk} onChange={set('bhk')}>{[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}</select></div>
            <div><label className="label">Area</label><select className="input" value={f.area} onChange={set('area')}>{Object.keys(AREAS).map((a) => <option key={a}>{a}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="label">Landmark</label><input className="input" value={f.landmark} onChange={set('landmark')} placeholder="e.g. near ITPL main road" /></div>
            <div><label className="label">Rent / month</label><input required className="input tnum" value={f.rent} onChange={set('rent')} placeholder="23000" inputMode="numeric" /></div>
            <div><label className="label">Deposit</label><input className="input tnum" value={f.deposit} onChange={set('deposit')} placeholder="100000" inputMode="numeric" /></div>
            <div><label className="label">Furnishing</label><select className="input" value={f.furnishing} onChange={set('furnishing')}><option>unfurnished</option><option>semi-furnished</option><option>fully furnished</option></select></div>
            <div><label className="label">Available from</label><input className="input" value={f.availableFrom} onChange={set('availableFrom')} /></div>
          </div>
        </Card>

        <Card title="Owner's rules">
          <div className="grid gap-4 sm:grid-cols-4">
            <div><label className="label">Tenants</label><select className="input" value={f.tenantPreference} onChange={set('tenantPreference')}><option value="any">Anyone</option><option value="family">Family</option><option value="bachelors">Bachelors</option></select></div>
            <div><label className="label">Pets</label><select className="input" value={f.pets} onChange={set('pets')}><option value="unknown">Not discussed</option><option value="yes">Allowed</option><option value="no">Not allowed</option></select></div>
            <div><label className="label">Parking</label><input className="input" value={f.parking} onChange={set('parking')} placeholder="one car" /></div>
            <div><label className="label">Visit slot</label><input className="input" value={f.visitSlot} onChange={set('visitSlot')} placeholder="Saturday 11 AM" /></div>
            <div className="sm:col-span-4"><label className="label">House rules</label><input className="input" value={f.houseRules} onChange={set('houseRules')} placeholder="e.g. vegetarian cooking only" /></div>
          </div>
        </Card>

        <Card title="Your verification" subtitle="This is what the green “Verified” badge means to tenants">
          <div className="space-y-3">
            {[
              ['identity', 'I checked the owner\'s identity and that they own (or legally manage) this flat'],
              ['visited', 'I visited the flat, and it matches the details above'],
              ['consent', 'The owner agreed to occasional check-in calls from Pakka\'s AI assistant'],
            ].map(([k, label]) => (
              <label key={k} className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/[.06] p-3 text-sm hover:bg-black/[.03]">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={checks[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} />
                <span className="text-ink-700">{label}</span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-4 border-t border-black/[.06] bg-canvas/95 py-4 backdrop-blur">
        <p className="flex items-center gap-2 text-sm text-ink-500"><ShieldCheck size={16} className="text-emerald-600" />Saved as “Verified by Verril”</p>
        <div className="flex gap-2">
          <Link to="/console/listings" className="btn-secondary">Cancel</Link>
          <button className="btn-primary" disabled={!ready || saving}>{saving ? 'Saving…' : 'Add listing'}</button>
        </div>
      </div>
    </form>
  );
}
