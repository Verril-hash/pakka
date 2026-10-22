import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Flats from './pages/site/Flats';
import Home from './pages/site/Home';
import SiteLayout from './pages/site/SiteLayout';

// Sign-in and account pages load on demand (they pull in Firebase), keeping the landing page light.
const SignIn = lazy(() => import('./pages/portal/SignIn'));
const PortalLayout = lazy(() => import('./pages/portal/PortalLayout'));
const OwnerHome = lazy(() => import('./pages/portal/OwnerHome'));
const TenantHome = lazy(() => import('./pages/portal/TenantHome'));

// The team console is loaded on demand, so its code never ships to customers' browsers.
const ConsoleLayout = lazy(() => import('./components/ConsoleLayout'));
const TeamSignIn = lazy(() => import('./pages/console/TeamSignIn'));
const Overview = lazy(() => import('./pages/console/Overview'));
const Live = lazy(() => import('./pages/console/Live'));
const Listings = lazy(() => import('./pages/console/Listings'));
const NewListing = lazy(() => import('./pages/console/NewListing'));
const ListingDetail = lazy(() => import('./pages/console/ListingDetail'));
const Requests = lazy(() => import('./pages/console/Requests'));
const Visits = lazy(() => import('./pages/console/Visits'));
const Owners = lazy(() => import('./pages/console/Owners'));
const Calls = lazy(() => import('./pages/console/Calls'));
const Agents = lazy(() => import('./pages/console/Agents'));
const SettingsPage = lazy(() => import('./pages/console/Settings'));

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/flats" element={<Flats />} />
          <Route path="/signin" element={<SignIn />} />
        </Route>
        <Route element={<PortalLayout />}>
          <Route path="/owner" element={<OwnerHome />} />
          <Route path="/me" element={<TenantHome />} />
        </Route>
        <Route path="/console/signin" element={<TeamSignIn />} />
        <Route path="/console" element={<ConsoleLayout />}>
          <Route index element={<Overview />} />
          <Route path="live" element={<Live />} />
          <Route path="listings" element={<Listings />} />
          <Route path="listings/new" element={<NewListing />} />
          <Route path="listings/:id" element={<ListingDetail />} />
          <Route path="requests" element={<Requests />} />
          <Route path="visits" element={<Visits />} />
          <Route path="owners" element={<Owners />} />
          <Route path="calls" element={<Calls />} />
          <Route path="agents" element={<Agents />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
