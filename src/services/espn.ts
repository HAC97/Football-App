import type { League, LeagueMeta, Match, MatchStatus, StandingsGroup, StandingTeam, Team } from '../types';
import { espnDay, espnMonths } from '../lib/date';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const V2 = 'https://site.api.espn.com/apis/v2/sports/soccer';

/* ---- Raw ESPN shapes: only the fields we read ---- */

interface RawTeam {
  id?: string;
  name?: string;
  displayName?: string;
  abbreviation?: string;
  logo?: string;
  logos?: { href: string }[];
}

interface RawCompetitor {
  homeAway: 'home' | 'away';
  score?: string;
  shootoutScore?: number | string;
  team: RawTeam;
}

export interface RawEvent {
  id: string;
  date: string;
  season?: { slug?: string };
  status: {
    clock?: number;
    displayClock?: string;
    period?: number;
    type: { name?: string; state: 'pre' | 'in' | 'post'; detail?: string; shortDetail?: string };
  };
  competitions: {
    competitors: RawCompetitor[];
    venue?: { fullName?: string };
    series?: { title?: string };
  }[];
}

interface RawScoreboard {
  events?: RawEvent[];
  leagues?: { logos?: { href: string; rel?: string[] }[] }[];
}

interface RawStandingEntry {
  team?: RawTeam;
  note?: { color?: string; description?: string };
  stats?: { name: string; value?: number }[];
}

interface RawStandings {
  children?: { name?: string; standings?: { entries?: RawStandingEntry[] } }[];
}

/* ---- Normalizers (pure, unit-tested) ---- */

const toTeam = (t: RawTeam): Team => {
  const name = t.displayName ?? t.name ?? 'Equipo';
  return {
    id: t.id ?? name,
    name,
    shortName: t.abbreviation ?? name.slice(0, 3).toUpperCase(),
    logo: t.logo ?? t.logos?.[0]?.href ?? '',
  };
};

const STATE_TO_STATUS: Record<string, MatchStatus> = { pre: 'SCHEDULED', in: 'LIVE', post: 'FINISHED' };

export function normalizeEvent(event: RawEvent, league: League, fetchedAt: number = Date.now()): Match | null {
  const competition = event.competitions?.[0];
  const home = competition?.competitors.find((c) => c.homeAway === 'home');
  const away = competition?.competitors.find((c) => c.homeAway === 'away');
  if (!competition || !home || !away) return null;

  const status = STATE_TO_STATUS[event.status.type.state] ?? 'SCHEDULED';
  const played = status !== 'SCHEDULED';
  const homePens = home.shootoutScore;
  const awayPens = away.shootoutScore;
  const hasPens = played && (homePens !== undefined || awayPens !== undefined);

  return {
    id: event.id,
    leagueId: league.id,
    espnSlug: league.espnSlug,
    homeTeam: toTeam(home.team),
    awayTeam: toTeam(away.team),
    date: event.date,
    status,
    statusName: event.status.type.name ?? '',
    statusDetail: event.status.type.shortDetail ?? event.status.type.detail ?? '',
    score: played ? { home: parseInt(home.score ?? '0', 10) || 0, away: parseInt(away.score ?? '0', 10) || 0 } : undefined,
    penalties: hasPens ? { home: Number(homePens) || 0, away: Number(awayPens) || 0 } : undefined,
    clockSeconds: status === 'LIVE' ? event.status.clock : undefined,
    displayClock: status === 'LIVE' ? event.status.displayClock : undefined,
    period: status === 'LIVE' ? event.status.period : undefined,
    fetchedAt: status === 'LIVE' ? fetchedAt : undefined,
    phase: competition.series?.title ?? event.season?.slug ?? '',
    venue: competition.venue?.fullName,
  };
}

export function normalizeStandings(raw: RawStandings): StandingsGroup[] {
  return (raw.children ?? []).map((child) => {
    const entries = (child.standings?.entries ?? []).map((entry): StandingTeam => {
      const stat = (name: string) => entry.stats?.find((s) => s.name === name)?.value ?? 0;
      const team = toTeam(entry.team ?? {});
      return {
        id: team.id,
        rank: stat('rank'),
        team,
        played: stat('gamesPlayed'),
        points: stat('points'),
        wins: stat('wins'),
        draws: stat('ties'),
        losses: stat('losses'),
        goalsFor: stat('pointsFor'),
        goalsAgainst: stat('pointsAgainst'),
        goalDifference: stat('pointDifferential'),
        zone: entry.note?.color && entry.note.description ? { color: entry.note.color, description: translateZone(entry.note.description) } : undefined,
      };
    });
    return { name: translateGroupName(child.name), entries: entries.sort((a, b) => a.rank - b.rank) };
  });
}

/** Qualification / relegation labels come in English from ESPN. Unknown labels pass through unchanged. */
export function translateZone(description: string): string {
  const d = description.trim();
  if (/^relegation play-?off/i.test(d)) return 'Promoción por el descenso';
  if (/^relegation/i.test(d)) return 'Descenso';
  if (/^promotion/i.test(d)) return 'Ascenso';
  if (/^qualifies? for (the )?round of 16/i.test(d)) return 'Clasifica a octavos de final';
  if (/^qualifies? for (the )?(knockout( round)? )?play-?offs?/i.test(d)) return 'Clasifica al playoff';
  if (/^(eliminated|out)/i.test(d)) return 'Eliminado';
  if (/^qualifies? for (the )?(.+)/i.test(d)) return `Clasifica a ${d.replace(/^qualifies? for (the )?/i, '')}`;
  return d;
}

/** ESPN group names are English ("Group A", "League Phase"). */
export function translateGroupName(name?: string): string {
  if (!name) return 'Tabla general';
  if (/^league phase$/i.test(name)) return 'Fase de liga';
  return name.replace(/^group\s+/i, 'Grupo ');
}

/* ---- Network ---- */

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`ESPN respondió ${res.status}`);
  return (await res.json()) as T;
}

export interface LeagueLoad {
  matches: Match[];
  meta?: LeagueMeta;
}

async function fetchLeague(league: League, dates: string[], signal?: AbortSignal): Promise<LeagueLoad> {
  const pages = await Promise.all(dates.map((d) => getJson<RawScoreboard>(`${SITE}/${league.espnSlug}/scoreboard?dates=${d}&limit=300`, signal)));
  const fetchedAt = Date.now();
  const byId = new Map<string, Match>();
  for (const page of pages) {
    for (const event of page.events ?? []) {
      const match = normalizeEvent(event, league, fetchedAt);
      if (match) byId.set(match.id, match);
    }
  }
  const logos = pages[0]?.leagues?.[0]?.logos;
  return {
    matches: [...byId.values()],
    meta: logos ? { logo: logos.find((l) => l.rel?.includes('default'))?.href, logoDark: logos.find((l) => l.rel?.includes('dark'))?.href } : undefined,
  };
}

export interface LoadResult {
  matches: Match[];
  meta: Record<string, LeagueMeta>;
  /** Leagues whose request failed; the rest still render. */
  failed: string[];
}

async function fetchAll(leagues: League[], datesFor: () => string[], signal?: AbortSignal): Promise<LoadResult> {
  const dates = datesFor();
  const settled = await Promise.allSettled(leagues.map((l) => fetchLeague(l, dates, signal)));
  const result: LoadResult = { matches: [], meta: {}, failed: [] };
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') {
      result.matches.push(...s.value.matches);
      if (s.value.meta) result.meta[leagues[i].id] = s.value.meta;
    } else if (!signal?.aborted) {
      result.failed.push(leagues[i].id);
    }
  });
  result.matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return result;
}

/** Full window (months covering [from, to]). */
export const fetchWindow = (leagues: League[], from: Date, to: Date, signal?: AbortSignal) =>
  fetchAll(leagues, () => espnMonths(from, to), signal);

/** Just today: cheap enough to poll while matches are live. */
export const fetchToday = (leagues: League[], signal?: AbortSignal) => fetchAll(leagues, () => [espnDay(new Date())], signal);

export async function fetchStandings(league: League, signal?: AbortSignal): Promise<StandingsGroup[]> {
  return normalizeStandings(await getJson<RawStandings>(`${V2}/${league.espnSlug}/standings`, signal));
}

export const fetchSummary = <T>(match: Pick<Match, 'espnSlug' | 'id'>, signal?: AbortSignal): Promise<T> =>
  getJson<T>(`${SITE}/${match.espnSlug}/summary?event=${match.id}`, signal);
