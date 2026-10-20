import { useCallback, useEffect, useRef, useState } from 'react';
import { leagues } from '../config/leagues';
import { buildSearch, parseUrl, type UrlState } from '../lib/url';

const leagueIds = leagues.map((l) => l.id);
const read = () => parseUrl(window.location.search, leagueIds);
const urlFor = (state: UrlState) => `${window.location.pathname}${buildSearch(state)}${window.location.hash}`;

export interface UrlStateApi {
  state: UrlState;
  /** Changes the view in place: the address updates but Back does not step through it. */
  update: (patch: Partial<Omit<UrlState, 'partido'>>) => void;
  /** Opens a match as its own history entry, so Back closes it. */
  openMatch: (id: string) => void;
  /** Closes the open match; steps Back if we opened it, otherwise just clears it from the address. */
  closeMatch: () => void;
}

/**
 * View state mirrored in the address bar (?liga=&dia=&estado=&partido=) without a router.
 * `fallbackLeague` only applies when the address names no league (the league remembered on this device).
 */
export function useUrlState(fallbackLeague: string | null): UrlStateApi {
  const [state, setState] = useState<UrlState>(() => {
    const fromUrl = read();
    return { ...fromUrl, liga: fromUrl.liga ?? fallbackLeague };
  });
  // Handlers read the latest state here so they stay stable and never depend on a render having happened.
  const latest = useRef(state);

  const commit = useCallback((next: UrlState, mode: 'push' | 'replace', historyState: unknown) => {
    latest.current = next;
    const url = urlFor(next);
    if (mode === 'push') window.history.pushState(historyState, '', url);
    else window.history.replaceState(historyState, '', url);
    setState(next);
  }, []);

  // Make the address match what is on screen (e.g. the remembered league) without adding a history entry.
  useEffect(() => {
    if (urlFor(latest.current) !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, '', urlFor(latest.current));
    }
  }, []);

  // Back / Forward: the address is the truth.
  useEffect(() => {
    const onPop = () => {
      latest.current = read();
      setState(latest.current);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const update = useCallback<UrlStateApi['update']>((patch) => commit({ ...latest.current, ...patch }, 'replace', window.history.state), [commit]);

  const openMatch = useCallback((id: string) => commit({ ...latest.current, partido: id }, 'push', { modal: true }), [commit]);

  const closeMatch = useCallback(() => {
    if (latest.current.partido === null) return;
    // Opened by us: undo that entry. popstate then clears `partido`. Opened from a shared link: nothing to go back to.
    if ((window.history.state as { modal?: boolean } | null)?.modal) window.history.back();
    else commit({ ...latest.current, partido: null }, 'replace', window.history.state);
  }, [commit]);

  return { state, update, openMatch, closeMatch };
}
