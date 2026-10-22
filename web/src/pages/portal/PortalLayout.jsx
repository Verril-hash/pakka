import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Wordmark } from '../../components/Logo';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { api } from '../../lib/api';
import { auth } from '../../lib/firebase';

/** Shell for the owner and tenant portals. Redirects to sign-in when there's no session. */
export default function PortalLayout() {
  const [me, setMe] = useState(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const want = pathname.startsWith('/owner') ? 'owner' : 'tenant';

  useEffect(() => {
    api('/api/me').then((m) => {
      if (m.role !== want || m.needsProfile) navigate(`/signin?as=${want}`, { replace: true });
      else setMe(m);
    }).catch(() => navigate(`/signin?as=${want}`, { replace: true }));
  }, [want, navigate]);

  async function signOut() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    await firebaseSignOut(auth).catch(() => {});
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="glass sticky top-0 z-40 border-b border-black/[.06]">
        <div className="mx-auto flex h-14 max-w-[980px] items-center gap-3 px-5">
          <Link to="/"><Wordmark size="sm" /></Link>
          {want === 'owner' ? (
            <span className="rounded-full bg-black/[.05] px-2.5 py-1 text-[12px] font-medium text-ink-700">Owner</span>
          ) : (
            <nav className="flex gap-1 text-[14px]">
              <Link to="/me" className="rounded-full bg-black/[.06] px-3 py-1 font-medium text-ink-900">My Pakka</Link>
              <Link to="/flats" className="rounded-full px-3 py-1 text-ink-500 transition-colors hover:text-ink-900">Flats</Link>
            </nav>
          )}
          {me && <span className="tnum ml-auto hidden text-[13px] text-ink-400 sm:block">{me.phone.replace('+91', '+91 ')}</span>}
          <button onClick={signOut} className={`btn-ghost h-8 px-3 text-[13px] ${me ? 'sm:ml-0' : ''} ml-auto sm:ml-2`}><LogOut size={15} /> Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-[980px] px-5 py-8 md:py-12">{me ? <Outlet /> : <div className="h-64 animate-pulse rounded-[28px] bg-white" />}</main>
    </div>
  );
}
