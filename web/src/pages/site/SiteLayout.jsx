import { Menu, X } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Wordmark } from '../../components/Logo';
import { api } from '../../lib/api';

// Signed-in customers get a link to their account instead of 'Sign in'. Team accounts never get a console link here.
const ACCOUNT = { tenant: ['/me', 'My Pakka'], owner: ['/owner', 'My flats'] };

const NAV = [
  ['/flats', 'Flats'],
  ['/#how', 'How it works'],
  ['/#owners', 'For owners'],
  ['/#why', 'Why Pakka'],
];

export default function SiteLayout() {
  const { pathname, hash } = useLocation();
  const [menu, setMenu] = useState(false);
  const [account, setAccount] = useState(['/signin', 'Sign in']);
  useEffect(() => {
    api('/api/me').then((m) => setAccount(ACCOUNT[m.role] && !m.needsProfile ? ACCOUNT[m.role] : ['/signin', 'Sign in'])).catch(() => {});
  }, [pathname]);
  useEffect(() => {
    setMenu(false);
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="min-h-screen bg-white">
      <header className="glass sticky top-0 z-50 border-b border-black/[.06]">
        <div className="mx-auto flex h-12 max-w-[1080px] items-center px-5">
          <Link to="/" aria-label="Pakka home"><Wordmark size="sm" /></Link>
          <nav className="mx-auto hidden items-center gap-8 md:flex">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} className="text-[12px] text-ink-700 transition-colors hover:text-ink-900">{label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 md:ml-0">
            <Link to={account[0]} className="hidden text-[12px] text-ink-700 hover:text-ink-900 sm:block">{account[1]}</Link>
            <Link to="/flats" className="btn-primary h-7 px-3.5 text-[12px]">Find a flat</Link>
            <button
              onClick={() => setMenu(!menu)}
              className="-mr-1.5 grid h-8 w-8 place-items-center rounded-full text-ink-700 md:hidden"
              aria-label={menu ? 'Close menu' : 'Open menu'}
              aria-expanded={menu}
            >
              {menu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {/* Phone menu */}
        {menu && (
          <nav className="border-t border-black/[.06] px-5 pb-6 pt-2 md:hidden">
            {[...NAV, account].map(([to, label]) => (
              <Link key={to} to={to} onClick={() => setMenu(false)} className="block border-b border-black/[.06] py-3.5 text-[17px] font-semibold tracking-tight text-ink-900">
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <Outlet />

      <footer className="bg-canvas">
        <div className="mx-auto max-w-[1080px] px-5 py-10 text-[12px] text-ink-500">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <Wordmark />
            <p className="text-[14px] text-ink-500">Rent straight from owners.</p>
          </div>
          <p className="border-b border-black/[.08] pb-4 leading-relaxed">
            Zero brokerage for tenants. Owners list for free and pay only when Pakka finds their tenant. Pakka's phone assistant is an AI and says so at the start of every call.
            Your phone number stays private.
          </p>
          <div className="grid gap-6 py-6 sm:grid-cols-3">
            <div>
              <p className="mb-2 font-semibold text-ink-900">Tenants</p>
              <ul className="space-y-1.5"><li><Link to="/flats" className="hover:underline">Verified flats</Link></li><li><a href="/#call" className="hover:underline">Get a call from Pakka</a></li></ul>
            </div>
            <div>
              <p className="mb-2 font-semibold text-ink-900">Owners</p>
              <ul className="space-y-1.5"><li><a href="/#owners" className="hover:underline">List your flat</a></li><li><Link to="/signin?as=owner" className="hover:underline">Owner sign in</Link></li></ul>
            </div>
            <div>
              <p className="mb-2 font-semibold text-ink-900">Pakka</p>
              <ul className="space-y-1.5"><li><a href="/#how" className="hover:underline">How it works</a></li><li><Link to="/signin" className="hover:underline">Sign in</Link></li></ul>
            </div>
          </div>
          <p className="border-t border-black/[.08] pt-4">Copyright © 2026 Pakka. Whitefield, Bengaluru. Voice by Bolna.</p>
        </div>
      </footer>
    </div>
  );
}
