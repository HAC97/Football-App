import type { LeagueMeta, Match } from '../types';

export const CACHE_KEY = 'fulltime-matches';
/** Bump when the shape of `Match` changes: old entries are then ignored instead of crashing the UI. */
export const CACHE_VERSION = 1;
/**
 * shortcut: a fixed 2 h life, so a cached "live" match is still plausible (the minute ticker is capped at 45'/90'+);
 * upgrade to per-status handling if cached data should survive a night offline.
 */
export const CACHE_MAX_AGE_MS = 2 * 3600_000;

export interface CachedMatches {
  matches: Match[];
  meta: Record<string, LeagueMeta>;
  /** When ESPN last confirmed this data (ms). */
  savedAt: number;
}

export const serializeCache = (matches: Match[], meta: Record<string, LeagueMeta>, savedAt: number): string =>
  JSON.stringify({ v: CACHE_VERSION, savedAt, matches, meta });

const isMatch = (m: unknown): m is Match => {
  const x = m as Partial<Match> | null;
  return (
    !!x &&
    typeof x.id === 'string' &&
    typeof x.leagueId === 'string' &&
    typeof x.date === 'string' &&
    (x.status === 'SCHEDULED' || x.status === 'LIVE' || x.status === 'FINISHED') &&
    typeof x.homeTeam?.name === 'string' &&
    typeof x.awayTeam?.name === 'string'
  );
};

/** Parses a stored entry; anything stale, from the future, malformed or from another version is treated as absent. */
export function parseCache(raw: string | null, now: number): CachedMatches | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { v?: unknown; savedAt?: unknown; matches?: unknown; meta?: unknown };
    if (data.v !== CACHE_VERSION || typeof data.savedAt !== 'number') return null;
    const age = now - data.savedAt;
    if (age > CACHE_MAX_AGE_MS || age < -60_000) return null;
    if (!Array.isArray(data.matches) || data.matches.length === 0 || !data.matches.every(isMatch)) return null;
    const meta = data.meta && typeof data.meta === 'object' && !Array.isArray(data.meta) ? (data.meta as Record<string, LeagueMeta>) : {};
    return { matches: data.matches, meta, savedAt: data.savedAt };
  } catch {
    return null;
  }
}
