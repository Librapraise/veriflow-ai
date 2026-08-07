import { useEffect, useState } from 'react';

export interface AppRoute {
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
}

function readRoute(): AppRoute {
  const url = new URL(window.location.href);
  const segments = url.pathname.split('/').filter(Boolean);
  const path = segments.length ? `/${segments.join('/')}` : '/';
  const params: Record<string, string> = {};
  if (segments[0] === 'verifier' && segments[1]) params.proofId = decodeURIComponent(segments[1]);
  if (segments[0] === 'app' && segments[1]) params.workspace = segments[1];
  if (segments[0] === 'app' && segments[1] === 'verify' && segments[2]) params.requestCode = decodeURIComponent(segments[2]);
  return { path, params, query: url.searchParams };
}

export function useAppRouter(): { route: AppRoute; navigate: (to: string) => void } {
  const [route, setRoute] = useState<AppRoute>(() => readRoute());
  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const navigate = (to: string) => {
    if (to === window.location.pathname + window.location.search) return;
    window.history.pushState({}, '', to);
    setRoute(readRoute());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return { route, navigate };
}
