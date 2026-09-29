export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
}

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED';

export interface Match {
  id: string;
  leagueId: string;
  espnSlug: string;
  homeTeam: Team;
  awayTeam: Team;
  date: string; // ISO string
  status: MatchStatus;
  /** ESPN status name, e.g. STATUS_HALFTIME, STATUS_POSTPONED. */
  statusName: string;
  /** Short ESPN label: "FT", "AET", "HT", "67'". */
  statusDetail: string;
  score?: { home: number; away: number };
  penalties?: { home: number; away: number };
  /** Live clock as sent by ESPN, used as the base for the local ticker. */
  clockSeconds?: number;
  displayClock?: string;
  period?: number;
  fetchedAt?: number;
  phase?: string;
  venue?: string;
}

export interface League {
  id: string;
  name: string;
  country: string;
  espnSlug: string;
  /** Fallback glyph used until the real league logo loads. */
  glyph: string;
  color: string;
}

export interface StandingTeam {
  id: string;
  rank: number;
  team: Team;
  played: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  /** Qualification / relegation zone from ESPN, when it defines one. */
  zone?: { color: string; description: string };
}

export interface StandingsGroup {
  name: string;
  entries: StandingTeam[];
}

export interface LeagueMeta {
  logo?: string;
  logoDark?: string;
}
