import { useEffect } from 'react';
import { Wordmark } from '../../components/Logo';
import SignIn from '../portal/SignIn';

/** /console/signin — the team's own door into the console. Never linked from the public site. */
export default function TeamSignIn() {
  useEffect(() => {
    const meta = Object.assign(document.createElement('meta'), { name: 'robots', content: 'noindex, nofollow' });
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-14 items-center px-5"><Wordmark size="sm" /></header>
      <SignIn team />
    </div>
  );
}
