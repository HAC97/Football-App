import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { leagues } from '../config/leagues';
import { fetchToday, fetchWindow } from '../services/espn';
import { WINDOW_FUTURE_DAYS, WINDOW_PAST_DAYS } from '../lib/date';
import { mergeMatches } from '../lib/match';
import type { LeagueMeta, Match } from '../types';

const POLL_MS = 30_000;

export interface MatchesState {
  matches: Match[];
  meta: Record<string, LeagueMeta>;
  loading: boolean;
  /** Every league failed: nothing can be shown. */
  error: boolean;
  /** Some leagues failed: what loaded is still shown, with a notice. */
  failed: string[];
  reload: () => void;
}

export function useMatches(): MatchesState {
  const [matches, setMatches] = useState<Match[]>([]);
  const [meta, setMeta] = useState<Record<string, LeagueMeta>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const today = new Date();
    fetchWindow(leagues, addDays(today, -WINDOW_PAST_DAYS), addDays(today, WINDOW_FUTURE_DAYS), controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setMatches(res.matches);
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

  useEffect(() => {
    if (!hasLive) return;
    let controller = new AbortController();
    const tick = () => {
      if (document.hidden) return;
      controller.abort();
      controller = new AbortController();
      fetchToday(leagues, controller.signal)
        .then((res) => setMatches((prev) => mergeMatches(prev, res.matches)))
        .catch(() => {});
    };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      controller.abort();
    };
  }, [hasLive]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  return { matches, meta, loading, error: !loading && matches.length === 0 && failed.length === leagues.length, failed, reload };
}
