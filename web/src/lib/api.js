import { useCallback, useEffect, useRef, useState } from 'react';

// Everything except public listings and "who am I" needs an App Check token. Firebase loads only for these,
// so signed-out visitors on the public site never download it.
const needsAppCheck = (path) => path.startsWith('/api/') && !path.startsWith('/api/public/') && path !== '/api/me';

export async function api(path, options = {}) {
  const appCheck = needsAppCheck(path) ? await (await import('./firebase')).appCheckToken() : null;
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(appCheck ? { 'X-Firebase-AppCheck': appCheck } : {}), ...options.headers },
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data;
}

/** Fetch `path`, optionally re-polling every `interval` ms. Returns { data, error, loading, reload }. */
export function useApi(path, { interval } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!path) { setLoading(false); return; }
    try {
      const d = await api(path);
      if (alive.current) { setData(d); setError(null); }
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    setData(null);
    load();
    const id = interval ? setInterval(load, interval) : null;
    return () => { alive.current = false; if (id) clearInterval(id); };
  }, [load, interval]);

  return { data, error, loading, reload: load };
}
