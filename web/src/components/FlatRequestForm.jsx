import { useState } from 'react';
import { api } from '../lib/api';

/**
 * Details of a flat for the Pakka team to visit. Used for a new owner's first flat (with the ownership
 * confirmation) and for "List another flat". Nothing goes live until the team has seen the flat.
 */
export default function FlatRequestForm({ endpoint, title, intro, askOwnership = false, submitLabel = 'Send to Pakka', onDone, onCancel, className = '' }) {
  const [f, setF] = useState({ area: '', bhk: '2', rent: '', deposit: '', furnishing: 'semi-furnished', availableFrom: '', visitTime: '', notes: '', ownership: false });
  const [state, setState] = useState({ status: 'idle' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const digits = (k) => (e) => setF({ ...f, [k]: e.target.value.replace(/\D/g, '') });

  async function submit(e) {
    e.preventDefault();
    setState({ status: 'sending' });
    try {
      await api(endpoint, { method: 'POST', body: f });
      onDone?.();
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }

  return (
    <form onSubmit={submit} className={`space-y-4 rounded-[24px] bg-white p-6 shadow-card ${className}`}>
      <div>
        <p className="text-[19px] font-semibold tracking-display text-ink-900">{title}</p>
        {intro && <p className="mt-1 text-[14px] text-ink-500">{intro}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Area</label><input className="input h-11" placeholder="e.g. Brookefield" value={f.area} onChange={set('area')} required /></div>
        <div><label className="label">Size</label>
          <select className="input h-11" value={f.bhk} onChange={set('bhk')}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} BHK</option>)}</select>
        </div>
        <div><label className="label">Expected rent / month</label><input inputMode="numeric" className="input tnum h-11" placeholder="25000" value={f.rent} onChange={digits('rent')} required /></div>
        <div><label className="label">Deposit</label><input inputMode="numeric" className="input tnum h-11" placeholder="100000" value={f.deposit} onChange={digits('deposit')} /></div>
        <div><label className="label">Furnishing</label>
          <select className="input h-11" value={f.furnishing} onChange={set('furnishing')}>
            <option value="unfurnished">Unfurnished</option><option value="semi-furnished">Semi-furnished</option><option value="fully furnished">Fully furnished</option>
          </select>
        </div>
        <div><label className="label">Free from</label><input className="input h-11" placeholder="e.g. 1 December" value={f.availableFrom} onChange={set('availableFrom')} /></div>
      </div>
      <div><label className="label">Good time for our visit</label><input className="input h-11" placeholder="e.g. Weekday evenings, or Saturday morning" value={f.visitTime} onChange={set('visitTime')} /></div>
      <div><label className="label">Anything else (optional)</label><input className="input h-11" placeholder="Parking, pets, who you'd like as tenants…" value={f.notes} onChange={set('notes')} /></div>
      {askOwnership && (
        <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-ink-600">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-600" checked={f.ownership} onChange={(e) => setF({ ...f, ownership: e.target.checked })} required />
          I own this flat, or the owner has authorised me to rent it out. I'll show proof when the Pakka team visits.
        </label>
      )}
      {state.status === 'error' && <p className="text-[14px] text-[#d70015]">{state.message}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={state.status === 'sending' || (askOwnership && !f.ownership)}>{state.status === 'sending' ? 'Sending…' : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>}
      </div>
    </form>
  );
}
