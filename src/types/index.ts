export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
}

export interface Match {
  id: string;
  leagueId: string;
  espnSlug: string;
  homeTeam: Team;
  awayTeam: Team;
  date: string; // ISO string
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  score?: {
    home: number;
    away: number;
  };
  minute?: number;
  clockDisplay?: string;
}

export interface League {
  id: string;
  name: string;
  country: string;
  logo: string;
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
}
