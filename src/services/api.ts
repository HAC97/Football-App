import type { Match, Team } from '../types';
import { leagues } from './mockData';

// Map our internal league IDs to ESPN API slugs
const espnLeagueSlugs: Record<string, string> = {
  'arg': 'arg.1',
  'pl': 'eng.1',
  'sa': 'ita.1',
  'll': 'esp.1',
  'lib': 'conmebol.libertadores',
  'ucl': 'uefa.champions',
};

// Helper to format Date to YYYYMMDD
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export async function fetchMatches(dateYYYYMMDD?: string): Promise<Match[]> {
  const allMatches: Match[] = [];

  // Calculate default date range if none provided: 7 days ago to 14 days ahead
  let dateQuery = dateYYYYMMDD;
  if (!dateQuery) {
    const today = new Date();
    const past = new Date(today);
    past.setDate(past.getDate() - 7);
    const future = new Date(today);
    future.setDate(future.getDate() + 14);
    dateQuery = `${formatDate(past)}-${formatDate(future)}`;
  }

  // Fetch all leagues in parallel
  const promises = leagues.map(async (league) => {
    const slug = espnLeagueSlugs[league.id];
    if (!slug) return [];

    let url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`;
    
    // For Champions League and Libertadores, fetch a much wider range to cover all knockout stages
    if (slug === 'uefa.champions' || slug === 'conmebol.libertadores') {
      const today = new Date();
      const past = new Date(today);
      past.setMonth(past.getMonth() - 8); // Go back 8 months to catch start of knockouts / groups
      const future = new Date(today);
      future.setMonth(future.getMonth() + 4);
      url += `?dates=${formatDate(past)}-${formatDate(future)}&limit=500`;
    } else if (dateQuery) {
      url += `?dates=${dateQuery}&limit=200`;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      
      const data = await response.json();
      const events = data.events || [];

      return events.map((event: any): Match => {
        const competition = event.competitions[0];
        const competitors = competition.competitors;
        
        const homeCompetitor = competitors.find((c: any) => c.homeAway === 'home');
        const awayCompetitor = competitors.find((c: any) => c.homeAway === 'away');

        const homeTeam: Team = {
          id: homeCompetitor.team.id,
          name: homeCompetitor.team.name,
          shortName: homeCompetitor.team.abbreviation || homeCompetitor.team.name.substring(0, 3).toUpperCase(),
          logo: homeCompetitor.team.logo || 'https://via.placeholder.com/40?text=?',
        };

        const awayTeam: Team = {
          id: awayCompetitor.team.id,
          name: awayCompetitor.team.name,
          shortName: awayCompetitor.team.abbreviation || awayCompetitor.team.name.substring(0, 3).toUpperCase(),
          logo: awayCompetitor.team.logo || 'https://via.placeholder.com/40?text=?',
        };

        let status: 'SCHEDULED' | 'LIVE' | 'FINISHED' = 'SCHEDULED';
        const espnStatus = event.status.type.state; // 'pre', 'in', 'post'
        if (espnStatus === 'post') status = 'FINISHED';
        if (espnStatus === 'in') status = 'LIVE';

        const statusDetail = event.status.type.detail;

        let score;
        if (status !== 'SCHEDULED') {
          score = {
            home: parseInt(homeCompetitor.score, 10) || 0,
            away: parseInt(awayCompetitor.score, 10) || 0,
          };
        }

        let penalties: { home: number; away: number } | undefined;
        if (status === 'LIVE' || status === 'FINISHED') {
          const homePen = homeCompetitor.penaltyScore ?? homeCompetitor.shootoutScore ?? homeCompetitor.shootoutAdvantage;
          const awayPen = awayCompetitor.penaltyScore ?? awayCompetitor.shootoutScore ?? awayCompetitor.shootoutAdvantage;
          if (homePen !== undefined || awayPen !== undefined) {
            penalties = {
              home: parseInt(homePen, 10) || 0,
              away: parseInt(awayPen, 10) || 0,
            };
          }
        }

        let clockDisplay: string | undefined;
        let clockSeconds: number | undefined;
        let period: number | undefined;
        if (status === 'LIVE' || status === 'FINISHED') {
          const espnPeriod = event.status.period;
          const espnClock = event.status.clock;
          if (espnClock !== undefined && espnPeriod !== undefined) {
            clockSeconds = espnClock;
            period = espnPeriod;
            const mins = Math.floor(espnClock / 60);
            const secs = Math.floor(espnClock % 60);
            const periodStr = espnPeriod === 1 ? '1st' : espnPeriod === 2 ? '2nd' : espnPeriod === 3 ? 'ET1' : espnPeriod === 4 ? 'ET2' : espnPeriod + 'th';
            clockDisplay = `${periodStr} ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          } else {
            clockDisplay = event.status.displayClock;
          }
        }

        return {
          id: event.id,
          leagueId: league.id,
          espnSlug: slug,
          homeTeam,
          awayTeam,
          date: event.date,
          status,
          score,
          minute: status === 'LIVE' ? event.status.clock : undefined,
          clockDisplay,
          clockSeconds,
          period,
          fetchedAt: status === 'LIVE' ? Date.now() : undefined,
          phase: event.season?.slug || event.competitions?.[0]?.series?.title || '',
          statusDetail,
          penalties,
        };
      });
    } catch (error) {
      console.error(`Error fetching data for ${league.name}:`, error);
      return [];
    }
  });

  const results = await Promise.all(promises);
  results.forEach(matches => allMatches.push(...matches));

  return allMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function fetchStandings(leagueId: string): Promise<any[]> {
  const slug = espnLeagueSlugs[leagueId];
  if (!slug) return [];

  const url = `https://site.api.espn.com/apis/v2/sports/soccer/${slug}/standings`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    if (!data.children || data.children.length === 0) return [];

    return data.children.map((child: any) => {
      const entries = child.standings?.entries || [];
      const formattedEntries = entries.map((entry: any) => {
        const getStat = (name: string) => {
          const stat = entry.stats?.find((s: any) => s.name === name);
          return stat ? stat.value : 0;
        };

        return {
          id: entry.team?.id || Math.random().toString(),
          rank: getStat('rank') || 0,
          team: {
            id: entry.team?.id || '',
            name: entry.team?.displayName || 'Desconocido',
            shortName: entry.team?.abbreviation || entry.team?.displayName?.substring(0, 3).toUpperCase() || '',
            logo: entry.team?.logos?.[0]?.href || 'https://via.placeholder.com/40?text=?',
          },
          played: getStat('gamesPlayed'),
          points: getStat('points'),
          wins: getStat('wins'),
          draws: getStat('ties'),
          losses: getStat('losses'),
          goalsFor: getStat('pointsFor'),
          goalsAgainst: getStat('pointsAgainst'),
          goalDifference: getStat('pointDifferential'),
        };
      });

      return {
        name: child.name || 'Tabla General',
        entries: formattedEntries.sort((a: any, b: any) => a.rank - b.rank)
      };
    });
  } catch (error) {
    console.error(`Error fetching standings for ${slug}:`, error);
    return [];
  }
}
