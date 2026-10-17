import type { League, Match } from '../types';

export type StatusFilter = 'ALL' | 'LIVE' | 'SCHEDULED' | 'FINISHED';

const NOT_PLAYED = new Set(['STATUS_POSTPONED', 'STATUS_CANCELED', 'STATUS_SUSPENDED', 'STATUS_ABANDONED', 'STATUS_FORFEIT']);

/** Postponed, cancelled or abandoned: there is no score to show. */
export const isNotPlayed = (m: Match): boolean => NOT_PLAYED.has(m.statusName);

export const isHalftime = (m: Match): boolean => m.statusName === 'STATUS_HALFTIME';

/**
 * Minute shown for a live match. ESPN sends `clock` (seconds) with the last poll time;
 * we advance it locally between polls. Stoppage time that ESPN already labels ("90'+7'")
 * is shown as sent, and the local ticker never runs past 45' / 90' without saying "+".
 */
export function liveMinuteLabel(m: Match, now: number = Date.now()): string {
  if (isHalftime(m)) return 'Descanso';
  const sent = m.displayClock ?? m.statusDetail;
  if (m.clockSeconds === undefined || m.fetchedAt === undefined || m.period === undefined) return sent || 'En vivo';
  if (sent?.includes('+')) return sent;
  const elapsed = m.clockSeconds + Math.max(0, Math.floor((now - m.fetchedAt) / 1000));
  const minute = Math.floor(elapsed / 60) + 1;
  const cap = m.period === 1 ? 45 : m.period === 2 ? 90 : m.period === 3 ? 105 : m.period === 4 ? 120 : undefined;
  if (cap !== undefined && minute > cap) return `${cap}'+`;
  return `${minute}'`;
}

const FINISHED_DETAIL: Record<string, string> = {
  FT: 'Final',
  AET: 'Final (prórroga)',
  'FT-Pens': 'Final (penales)',
  Postponed: 'Postergado',
  Canceled: 'Cancelado',
  Suspended: 'Suspendido',
  Abandoned: 'Suspendido',
};

export function statusText(m: Match, now: number = Date.now()): string {
  if (m.status === 'LIVE') return liveMinuteLabel(m, now);
  if (isNotPlayed(m)) return FINISHED_DETAIL[m.statusDetail] ?? 'Sin jugar';
  if (m.status === 'FINISHED') return FINISHED_DETAIL[m.statusDetail] ?? 'Final';
  return 'Programado';
}

export function filterByStatus(matches: Match[], filter: StatusFilter): Match[] {
  return filter === 'ALL' ? matches : matches.filter((m) => m.status === filter);
}

export interface LeagueGroup {
  league: League;
  matches: Match[];
}

/**
 * Groups by league. Leagues with a live match come first, then the rest by their earliest kickoff
 * (ties keep the configured league order). Inside a group, live matches come first, then by kickoff.
 */
export function groupByLeague(matches: Match[], leagues: League[]): LeagueGroup[] {
  const rank = (m: Match) => (m.status === 'LIVE' ? 0 : 1);
  const time = (m: Match) => new Date(m.date).getTime();
  return leagues
    .map((league, order) => ({
      league,
      order,
      matches: matches.filter((m) => m.leagueId === league.id).sort((a, b) => rank(a) - rank(b) || time(a) - time(b)),
    }))
    .filter((g) => g.matches.length > 0)
    .sort((a, b) => rank(a.matches[0]) - rank(b.matches[0]) || Math.min(...a.matches.map(time)) - Math.min(...b.matches.map(time)) || a.order - b.order)
    .map(({ league, matches: ms }) => ({ league, matches: ms }));
}

/** ESPN can keep a delayed match as scheduled for a while after its kickoff time. */
const LATE_KICKOFF_MS = 3 * 3600_000;

/** Spoken score, e.g. "2 a 1, penales 4 a 3". Undefined when there is no score to read. */
export function scoreLabel(m: Match): string | undefined {
  if (!m.score || isNotPlayed(m)) return undefined;
  const pens = m.penalties ? `, penales ${m.penalties.home} a ${m.penalties.away}` : '';
  return `${m.score.home} a ${m.score.away}${pens}`;
}

/**
 * When to start polling today's scores: 0 (right away) if a match is live, else the next kickoff,
 * including kickoffs up to 3 h late. Undefined when no match can still change.
 */
export function pollStartAt(matches: Match[], now: number): number | undefined {
  if (matches.some((m) => m.status === 'LIVE')) return 0;
  const kickoffs = matches.filter((m) => m.status === 'SCHEDULED').map((m) => new Date(m.date).getTime()).filter((t) => t >= now - LATE_KICKOFF_MS);
  return kickoffs.length > 0 ? Math.min(...kickoffs) : undefined;
}

/** Featured match: a live one, else the next kickoff, else the most recent result. */
export function pickFeatured(matches: Match[], now: number = Date.now()): Match | undefined {
  const live = matches.find((m) => m.status === 'LIVE');
  if (live) return live;
  const upcoming = matches
    .filter((m) => m.status === 'SCHEDULED' && new Date(m.date).getTime() >= now - LATE_KICKOFF_MS)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (upcoming[0]) return upcoming[0];
  return matches
    .filter((m) => m.status === 'FINISHED' && !isNotPlayed(m))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
}

/** Replaces matches by id and adds new ones; used to merge the small "today" poll into the loaded window. */
export function mergeMatches(base: Match[], fresh: Match[]): Match[] {
  const byId = new Map(base.map((m) => [m.id, m]));
  for (const m of fresh) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
