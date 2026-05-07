import { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MatchList } from './components/MatchList';
import { Standings } from './components/Standings';
import { leagues } from './services/mockData';
import { fetchMatches } from './services/api';
import type { Match, Team } from './types';
import './index.css';

function App() {
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(localStorage.getItem('favTeam'));
  const [viewMode, setViewMode] = useState<'fixtures' | 'standings'>('fixtures');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchMatches();
      setMatches(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSetFavoriteTeam = (teamId: string | null) => {
    setFavoriteTeamId(teamId);
    if (teamId) {
      localStorage.setItem('favTeam', teamId);
    } else {
      localStorage.removeItem('favTeam');
    }
  };

  const handleSelectLeague = (id: string | null) => {
    setActiveLeague(id);
    if (!id) {
      setViewMode('fixtures'); // Only fixtures for "All matches"
    }
  };

  const allTeams = useMemo(() => {
    const teamsMap = new Map<string, Team>();
    matches.forEach(m => {
      teamsMap.set(m.homeTeam.id, m.homeTeam);
      teamsMap.set(m.awayTeam.id, m.awayTeam);
    });
    return Array.from(teamsMap.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (activeLeague) {
      filtered = filtered.filter(m => m.leagueId === activeLeague);
    }
    return filtered;
  }, [activeLeague, matches]);

  const favoriteMatches = useMemo(() => {
    if (!favoriteTeamId) return [];
    return matches.filter(m => m.homeTeam.id === favoriteTeamId || m.awayTeam.id === favoriteTeamId);
  }, [favoriteTeamId, matches]);

  const liveMatches = filteredMatches.filter(m => m.status === 'LIVE');
  const scheduledMatches = filteredMatches.filter(m => m.status === 'SCHEDULED');
  const finishedMatches = filteredMatches.filter(m => m.status === 'FINISHED');

  const selectedLeagueObj = leagues.find(l => l.id === activeLeague);

  return (
    <div className="app-container">
      <Header />
      
      <Sidebar 
        leagues={leagues} 
        activeLeague={activeLeague} 
        onSelectLeague={handleSelectLeague} 
        teams={allTeams}
        favoriteTeamId={favoriteTeamId}
        onSelectFavoriteTeam={handleSetFavoriteTeam}
      />
      
      <main className="main-content">
        {activeLeague && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <button 
              onClick={() => setViewMode('fixtures')}
              style={{ 
                background: viewMode === 'fixtures' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', 
                color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '99px', cursor: 'pointer', fontWeight: 600, transition: '0.2s' 
              }}>
              Partidos
            </button>
            <button 
              onClick={() => setViewMode('standings')}
              style={{ 
                background: viewMode === 'standings' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', 
                color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '99px', cursor: 'pointer', fontWeight: 600, transition: '0.2s' 
              }}>
              Posiciones
            </button>
          </div>
        )}

        {viewMode === 'standings' && selectedLeagueObj ? (
          <Standings league={selectedLeagueObj} />
        ) : loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⚽</div>
            Cargando partidos en tiempo real...
          </div>
        ) : (
          <>
            {favoriteMatches.length > 0 && !activeLeague && (
              <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent)', borderRadius: 'var(--border-radius-md)' }}>
                <MatchList title="⭐ Mi Equipo Favorito" matches={favoriteMatches} leagues={leagues} />
              </div>
            )}

            {liveMatches.length > 0 && (
              <MatchList title="En Vivo 🔴" matches={liveMatches} leagues={leagues} />
            )}
            
            {scheduledMatches.length > 0 && (
              <MatchList title="Próximos Partidos" matches={scheduledMatches} leagues={leagues} />
            )}

            {finishedMatches.length > 0 && (
              <MatchList title="Resultados Anteriores" matches={finishedMatches} leagues={leagues} />
            )}

            {filteredMatches.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No hay partidos programados para esta semana en esta competición.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
