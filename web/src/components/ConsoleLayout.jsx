import {
  Bot, Building2, CalendarCheck, ExternalLink, Inbox, LayoutGrid, LogOut, Menu, PhoneCall, Radio, Search, Settings, Users, X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { api, useApi } from '../lib/api';
import { auth } from '../lib/firebase';
import { Wordmark } from './Logo';

const NAV = [
  { items: [
    { to: '/console', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/console/live', label: 'Live', icon: Radio, live: true },
  ] },
  { heading: 'Operations', items: [
    { to: '/console/listings', label: 'Listings', icon: Building2 },
    { to: '/console/requests', label: 'Requests', icon: Inbox },
    { to: '/console/visits', label: 'Visits', icon: CalendarCheck },
    { to: '/console/owners', label: 'Owners', icon: Users },
  ] },
  { heading: 'Voice', items: [
    { to: '/console/calls', label: 'Calls', icon: PhoneCall },
    { to: '/console/agents', label: 'Agents', icon: Bot },
  ] },
  { items: [{ to: '/console/settings', label: 'Settings', icon: Settings }] },
];

function activeCalls(state) {
  if (!state) return 0;
  return state.sessions.reduce(
    (n, s) => n + s.checks.filter((c) => c.state === 'calling').length + (s.state === 'calling_back' ? 1 : 0),
    0,
  );
}

function NavList({ calls, large = false }) {
  return NAV.map((group, i) => (
    <div key={i} className="mt-4 first:mt-1">
      {group.heading && <p className="mb-1 px-2.5 text-[11px] font-semibold text-ink-400">{group.heading}</p>}
      {group.items.map(({ to, label, icon: Icon, end, live: isLive }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `mb-px flex items-center gap-2.5 rounded-lg px-2.5 transition-colors ${large ? 'py-2.5 text-[15px]' : 'py-[7px] text-[13px]'} ${
              isActive ? 'bg-white font-medium text-ink-900 shadow-[0_1px_2px_rgba(0,0,0,.06)]' : 'text-ink-700 hover:bg-black/[.04]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={large ? 18 : 16} strokeWidth={1.9} className={isActive ? 'text-brand-600' : 'text-ink-500'} />
              <span className="flex-1">{label}</span>
              {isLive && calls > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-brand-600 px-1.5 py-px text-[11px] font-semibold text-white">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />{calls}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  ));
}

function SearchBox({ className = '' }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  return (
    <form className={`relative ${className}`} onSubmit={(e) => { e.preventDefault(); navigate(`/console/listings?q=${encodeURIComponent(q)}`); }}>
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 w-full rounded-lg bg-black/[.06] pl-8 pr-3 text-[14px] placeholder:text-ink-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 lg:h-8 lg:text-[13px]" />
    </form>
  );
}

function Status({ error }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] ${error ? 'text-[#e5484d]' : 'text-ink-500'}`}>
      <span className={`h-2 w-2 rounded-full ${error ? 'bg-[#e5484d]' : 'bg-pakka-500'}`} />
      {error ? 'Server offline' : 'Voice agents online'}
    </div>
  );
}

/** Team-only gate: anyone without a team session goes to /console/signin. */
export default function ConsoleLayout() {
  const [me, setMe] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' });
    document.head.appendChild(meta);
    api('/api/me')
      .then((m) => (m.role === 'team' ? setMe(m) : navigate('/console/signin', { replace: true })))
      .catch(() => navigate('/console/signin', { replace: true }));
    return () => meta.remove();
  }, [navigate]);
  if (!me) return <div className="min-h-screen bg-canvas" />;
  return <Console me={me} />;
}

async function signOut(navigate) {
  await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  await firebaseSignOut(auth).catch(() => {});
  navigate('/console/signin', { replace: true });
}

function Console({ me }) {
  const navigate = useNavigate();
  // Shared live snapshot: drives the live-call count and is handed to pages via Outlet context.
  const live = useApi('/state', { interval: 2500 });
  const calls = activeCalls(live.data);
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menu]);

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-black/[.06] bg-[#ececee]/70 backdrop-blur-xl lg:flex">
        <div className="flex h-14 items-center px-5">
          <Link to="/console"><Wordmark size="sm" /></Link>
        </div>
        <SearchBox className="mx-3 mb-2" />
        <nav className="scroll-thin flex-1 overflow-y-auto px-3 pb-4"><NavList calls={calls} /></nav>
        <div className="space-y-1 border-t border-black/[.06] p-3">
          <Status error={live.error} />
          <Link to="/" target="_blank" className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] text-ink-500 hover:bg-black/[.04] hover:text-ink-900">
            Public site <ExternalLink size={12} />
          </Link>
          <div className="flex items-center gap-2.5 px-2.5 pt-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-b from-ink-700 to-ink-900 text-[11px] font-semibold text-white">V</span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[13px] font-medium text-ink-900">Verril</p>
              <p className="tnum truncate text-[11px] text-ink-400">{me.phone}</p>
            </div>
            <button onClick={() => signOut(navigate)} className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-black/[.05] hover:text-ink-900" aria-label="Sign out" title="Sign out"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      {/* Phone / tablet header */}
      <header className="glass fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-black/[.06] px-4 lg:hidden">
        <Link to="/console"><Wordmark size="sm" /></Link>
        {calls > 0 && (
          <Link to="/console/live" className="flex items-center gap-1.5 rounded-full bg-brand-600 px-2.5 py-1 text-[12px] font-semibold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />{calls} live
          </Link>
        )}
        <button onClick={() => setMenu(!menu)} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-black/[.05] text-ink-700" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>
          {menu ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* Phone / tablet menu sheet */}
      {menu && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-30 overflow-y-auto bg-canvas px-4 pb-8 pt-4 lg:hidden">
          <SearchBox />
          <nav className="mt-2"><NavList calls={calls} large /></nav>
          <div className="mt-6 space-y-1 border-t border-black/[.06] pt-4">
            <Status error={live.error} />
            <Link to="/" className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[14px] text-ink-500">Public site <ExternalLink size={14} /></Link>
            <button onClick={() => signOut(navigate)} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[14px] text-ink-500">Sign out <LogOut size={14} /></button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col pt-14 lg:pl-[232px] lg:pt-0">
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <Outlet context={{ live: live.data, reloadLive: live.reload }} />
        </main>
      </div>
    </div>
  );
}
