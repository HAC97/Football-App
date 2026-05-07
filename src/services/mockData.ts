import type { League, Match, Team } from '../types';

export const leagues: League[] = [
  { id: 'arg', name: 'Liga Profesional', country: 'Argentina', logo: '🇦🇷', color: '#43a1d5' },
  { id: 'pl', name: 'Premier League', country: 'England', logo: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#3d195b' },
  { id: 'sa', name: 'Serie A', country: 'Italy', logo: '🇮🇹', color: '#004b96' },
  { id: 'll', name: 'LaLiga', country: 'Spain', logo: '🇪🇸', color: '#ff4b44' },
  { id: 'lib', name: 'Copa Libertadores', country: 'South America', logo: '🌎', color: '#c49a45' },
  { id: 'ucl', name: 'Champions League', country: 'Europe', logo: '🌍', color: '#002554' },
];

const teamsByLeague: Record<string, Team[]> = {
  'arg': [
    { id: 'boc', name: 'Boca Juniors', shortName: 'BOC', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Club_Atl%C3%A9tico_Boca_Juniors.svg' },
    { id: 'riv', name: 'River Plate', shortName: 'RIV', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Logo_River_Plate.png' },
    { id: 'rac', name: 'Racing Club', shortName: 'RAC', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/30/Racing_Club_logo.svg' },
    { id: 'ind', name: 'Independiente', shortName: 'IND', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Escudo_del_Club_Atl%C3%A9tico_Independiente.svg' },
    { id: 'san', name: 'San Lorenzo', shortName: 'SLO', logo: 'https://upload.wikimedia.org/wikipedia/commons/e/ed/Escudo_de_San_Lorenzo.svg' },
    { id: 'tal', name: 'Talleres', shortName: 'TAL', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Escudo_Talleres_2015.svg' },
  ],
  'pl': [
    { id: 'mci', name: 'Manchester City', shortName: 'MCI', logo: 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg' },
    { id: 'ars', name: 'Arsenal', shortName: 'ARS', logo: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg' },
    { id: 'liv', name: 'Liverpool', shortName: 'LIV', logo: 'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg' },
    { id: 'mun', name: 'Manchester United', shortName: 'MUN', logo: 'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg' },
    { id: 'che', name: 'Chelsea', shortName: 'CHE', logo: 'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg' },
    { id: 'tot', name: 'Tottenham Hotspur', shortName: 'TOT', logo: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg' },
  ],
  'sa': [
    { id: 'int', name: 'Inter Milan', shortName: 'INT', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg' },
    { id: 'juv', name: 'Juventus', shortName: 'JUV', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Juventus_FC_2017_icon_%28black%29.svg' },
    { id: 'mil', name: 'AC Milan', shortName: 'MIL', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg' },
    { id: 'nap', name: 'Napoli', shortName: 'NAP', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/SSC_Napoli_logo_2024.svg' },
    { id: 'rom', name: 'AS Roma', shortName: 'ROM', logo: 'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg' },
    { id: 'ata', name: 'Atalanta', shortName: 'ATA', logo: 'https://upload.wikimedia.org/wikipedia/en/6/66/AtalantaBC.svg' },
  ],
  'll': [
    { id: 'rma', name: 'Real Madrid', shortName: 'RMA', logo: 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg' },
    { id: 'bar', name: 'FC Barcelona', shortName: 'BAR', logo: 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg' },
    { id: 'atm', name: 'Atlético Madrid', shortName: 'ATM', logo: 'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg' },
    { id: 'gir', name: 'Girona FC', shortName: 'GIR', logo: 'https://upload.wikimedia.org/wikipedia/en/9/90/Girona_FC_logo.svg' },
    { id: 'ath', name: 'Athletic Club', shortName: 'ATH', logo: 'https://upload.wikimedia.org/wikipedia/en/9/9a/Athletic_Club_logo.svg' },
    { id: 'rso', name: 'Real Sociedad', shortName: 'RSO', logo: 'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg' },
  ],
  'lib': [
    { id: 'flu', name: 'Fluminense', shortName: 'FLU', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Escudo_Fluminense_FC.svg' },
    { id: 'fla', name: 'Flamengo', shortName: 'FLA', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Flamengo_braz_logo.svg' },
    { id: 'pal', name: 'Palmeiras', shortName: 'PAL', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/10/Palmeiras_logo.svg' },
    { id: 'sao', name: 'São Paulo', shortName: 'SAO', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/38/S%C3%A3o_Paulo_Futebol_Clube.svg' },
    { id: 'pen', name: 'Peñarol', shortName: 'PEN', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/14/Club_Atl%C3%A9tico_Pe%C3%B1arol_%28Escudo%29.svg' },
    { id: 'col', name: 'Colo-Colo', shortName: 'COL', logo: 'https://upload.wikimedia.org/wikipedia/en/0/07/Colo-Colo_logo.svg' },
  ],
  'ucl': [
    { id: 'bay', name: 'Bayern Munich', shortName: 'BAY', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg' },
    { id: 'psg', name: 'Paris SG', shortName: 'PSG', logo: 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg' },
    { id: 'dor', name: 'B. Dortmund', shortName: 'BVB', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg' },
    { id: 'lev', name: 'B. Leverkusen', shortName: 'B04', logo: 'https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg' },
    { id: 'int', name: 'Inter Milan', shortName: 'INT', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg' },
    { id: 'ars', name: 'Arsenal', shortName: 'ARS', logo: 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg' },
  ]
};

// Helper to generate some random matches
function generateMockMatches(): Match[] {
  const matches: Match[] = [];
  const today = new Date();
  
  leagues.forEach(league => {
    const teams = teamsByLeague[league.id];
    if (!teams || teams.length < 2) return;

    // Create 3 matches per league: 1 finished yesterday, 1 live today, 1 scheduled tomorrow
    
    // Finished Match (Yesterday)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(20, 0, 0, 0);
    matches.push({
      id: `match_${league.id}_fin`,
      leagueId: league.id,
      espnSlug: 'soccer',
      homeTeam: teams[0],
      awayTeam: teams[1],
      date: yesterday.toISOString(),
      status: 'FINISHED',
      score: { home: Math.floor(Math.random() * 4), away: Math.floor(Math.random() * 4) }
    });

    // Live Match (Today)
    const now = new Date(today);
    matches.push({
      id: `match_${league.id}_live`,
      leagueId: league.id,
      espnSlug: 'soccer',
      homeTeam: teams[2],
      awayTeam: teams[3],
      date: now.toISOString(),
      status: 'LIVE',
      score: { home: Math.floor(Math.random() * 3), away: Math.floor(Math.random() * 2) },
      minute: Math.floor(Math.random() * 90) + 1
    });

    // Scheduled Match (Tomorrow)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(16, 30, 0, 0);
    matches.push({
      id: `match_${league.id}_sch`,
      leagueId: league.id,
      espnSlug: 'soccer',
      homeTeam: teams[4],
      awayTeam: teams[5],
      date: tomorrow.toISOString(),
      status: 'SCHEDULED'
    });
  });

  return matches;
}

export const matches: Match[] = generateMockMatches();
