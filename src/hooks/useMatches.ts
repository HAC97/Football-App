import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays } from 'date-fns';
import { leagues } from '../config/leagues';
import { fetchToday, fetchWindow } from '../services/espn';
import { WINDOW_FUTURE_DAYS, WINDOW_PAST_DAYS } from '../lib/date';
import { CACHE_KEY, parseCache, serializeCache } from '../lib/cache';
import { mergeMatches, POLL_MS, pollDelay, pollStartAt } from '../lib/match';
import { store } from '../lib/storage';
import type { LeagueMeta, Match } from '../types';

export interface MatchesState {
  matches: Match[];
  meta: Record<string, LeagueMeta>;
  loading: boolean;
  /** Every league failed: nothing can be shown. */
  error: boolean;
  /** Some leagues failed: what loaded is still shown, with a notice. */
  failed: string[];
  /** At least one match is being played right now. */
  hasLive: boolean;
  /** When the data on screen was last confirmed by ESPN (ms). */
  lastUpdated: number;
  /** Polls in a row that got nothing back; 0 when healthy. */
  pollFailures: number;
  /** ESPN has answered at least once in this session: what is missing from `matches` is really missing, not just not loaded yet. */
  confirmed: boolean;
  reload: () => void;
}

export function useMatches(): MatchesState {
  // The last good answer from this device paints the first frame; the request below still always runs and replaces it.
  const [cached] = useState(() => parseCache(store.get(CACHE_KEY), Date.now()));
  const [matches, setMatches] = useState<Match[]>(cached?.matches ?? []);
  const [meta, setMeta] = useState<Record<string, LeagueMeta>>(cached?.meta ?? {});
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(!cached);
  const [attempt, setAttempt] = useState(0);
  const [pollFailures, setPollFailures] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  /** When ESPN last confirmed `matches`; the reference time for deciding what can still kick off. */
  const [updatedAt, setUpdatedAt] = useState(() => cached?.savedAt ?? Date.now());
  /** Set by a confirmed answer so the effect below persists it; a cache hydration or a failure never writes. */
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    dirty.current = false;
    store.set(CACHE_KEY, serializeCache(matches, meta, updatedAt));
  }, [matches, meta, updatedAt]);

  useEffect(() => {
    const controller = new AbortController();
    const today = new Date();
    fetchWindow(leagues, addDays(today, -WINDOW_PAST_DAYS), addDays(today, WINDOW_FUTURE_DAYS), controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        // With every league down there is no news: keep what is on screen (cache included) instead of blanking it.
        if (res.failed.length < leagues.length) {
          dirty.current = true;
          // A league that failed keeps its previous matches rather than vanishing.
          setMatches((prev) => mergeMatches(prev.filter((m) => res.failed.includes(m.leagueId)), res.matches));
          setMeta((prev) => ({ ...prev, ...res.meta }));
          setUpdatedAt(Date.now());
          setConfirmed(true);
        }
        setFailed(res.failed);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setFailed(leagues.map((l) => l.id));
        setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  const hasLive = useMemo(() => matches.some((m) => m.status === 'LIVE'), [matches]);
  const pollFrom = useMemo(() => pollStartAt(matches, updatedAt), [matches, updatedAt]);

  useEffect(() => {
    if (pollFrom === undefined) return;
    const from = pollFrom;
    let controller = new AbortController();
    let timer: number | undefined;
    let failures = 0;
    // setTimeout caps at ~24.8 days.
    const schedule = (ms: number) => {
      timer = window.setTimeout(poll, Math.min(ms, 2 ** 31 - 1));
    };
    function poll() {
      clearTimeout(timer);
      if (Date.now() < from) return schedule(from - Date.now());
      if (document.hidden) return schedule(POLL_MS);
      controller.abort();
      controller = new AbortController();
      const mine = controller;
      fetchToday(leagues, mine.signal)
        .then((res) => {
          if (mine.signal.aborted) return;
          // fetchAll never rejects: a total outage arrives as "every league failed".
          if (res.failed.length === leagues.length) throw new Error('every league failed');
          failures = 0;
          setPollFailures(0);
          dirty.current = true;
          setMatches((prev) => mergeMatches(prev, res.matches));
          setUpdatedAt(Date.now());
        })
        .catch(() => {
          if (mine.signal.aborted) return;
          failures += 1;
          setPollFailures(failures);
        })
        .finally(() => {
          if (!mine.signal.aborted) schedule(pollDelay(failures));
        });
    }
    // First poll at kickoff (or one interval from now if something is already live).
    schedule(Math.max(from - Date.now(), POLL_MS));
    // Coming back to the tab refreshes right away instead of waiting out the current delay.
    const onVisible = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      controller.abort();
    };
  }, [pollFrom]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  return { matches, meta, loading, error: !loading && matches.length === 0 && failed.length === leagues.length, failed, hasLive, lastUpdated: updatedAt, pollFailures, confirmed, reload };
}
