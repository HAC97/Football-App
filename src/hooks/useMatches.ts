import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { leagues } from '../config/leagues';
import { fetchToday, fetchWindow } from '../services/espn';
import { WINDOW_FUTURE_DAYS, WINDOW_PAST_DAYS } from '../lib/date';
import { mergeMatches, POLL_MS, pollDelay, pollStartAt } from '../lib/match';
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
  reload: () => void;
}

export function useMatches(): MatchesState {
  const [matches, setMatches] = useState<Match[]>([]);
  const [meta, setMeta] = useState<Record<string, LeagueMeta>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [pollFailures, setPollFailures] = useState(0);
  /** When `matches` last changed; the reference time for deciding what can still kick off. */
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    const today = new Date();
    fetchWindow(leagues, addDays(today, -WINDOW_PAST_DAYS), addDays(today, WINDOW_FUTURE_DAYS), controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setMatches(res.matches);
        setUpdatedAt(Date.now());
        setMeta(res.meta);
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

  return { matches, meta, loading, error: !loading && matches.length === 0 && failed.length === leagues.length, failed, hasLive, lastUpdated: updatedAt, pollFailures, reload };
}
