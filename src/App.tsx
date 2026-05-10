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
  const [viewMode, setViewMode] = useState<'fixtures' | 'standings' | 'knockout'>('fixtures');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchMatches();
      setMatches(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const hasLiveMatches = useMemo(() => matches.some(m => m.status === 'LIVE'), [matches]);

  useEffect(() => {
    if (loading || !hasLiveMatches) return;

    const interval = setInterval(async () => {
      try {
        const fresh = await fetchMatches();
        setMatches(fresh);
      } catch {
        // silently retry on next interval
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [loading, hasLiveMatches]);

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
      setViewMode('fixtures');
    } else if (viewMode === 'knockout' && id !== 'cl' && id !== 'ucl') {
      setViewMode('fixtures');
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

  const isKnockoutMatch = (m: Match) => {
    const p = m.phase?.toLowerCase() || '';
    return p.includes('16') || p.includes('quarter') || p.includes('semi') || p.includes('final') || (p.includes('stage') && !p.includes('group'));
  };

  const knockoutMatches = filteredMatches.filter(isKnockoutMatch);

  const liveMatches = filteredMatches.filter(m => m.status === 'LIVE');
  const scheduledMatches = filteredMatches.filter(m => m.status === 'SCHEDULED');
  const finishedMatches = filteredMatches.filter(m => m.status === 'FINISHED');

  const selectedLeagueObj = leagues.find(l => l.id === activeLeague);
  const showKnockoutButton = activeLeague === 'cl' || activeLeague === 'ucl';

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
            {showKnockoutButton && (
              <button 
                onClick={() => setViewMode('knockout')}
                style={{ 
                  background: viewMode === 'knockout' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', 
                  color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '99px', cursor: 'pointer', fontWeight: 600, transition: '0.2s' 
                }}>
                Eliminatorias
              </button>
            )}
          </div>
        )}

        {viewMode === 'standings' && selectedLeagueObj ? (
          <Standings league={selectedLeagueObj} />
        ) : viewMode === 'knockout' && selectedLeagueObj ? (
          knockoutMatches.length > 0 ? (
            <>
              {knockoutMatches.filter(m => m.status === 'LIVE').length > 0 && <MatchList title="Eliminatorias - En Vivo" matches={knockoutMatches.filter(m => m.status === 'LIVE')} leagues={leagues} />}
              {knockoutMatches.filter(m => m.status === 'SCHEDULED').length > 0 && <MatchList title="Eliminatorias - Próximos" matches={knockoutMatches.filter(m => m.status === 'SCHEDULED')} leagues={leagues} />}
              {knockoutMatches.filter(m => m.status === 'FINISHED').length > 0 && <MatchList title="Eliminatorias - Resultados" matches={knockoutMatches.filter(m => m.status === 'FINISHED')} leagues={leagues} />}
            </>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--border-radius-lg)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏆</div>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Aún no hay datos de eliminatorias disponibles.</p>
              <p style={{ marginTop: '0.5rem' }}>Esta fase del torneo todavía no ha comenzado o no se han programado los partidos oficiales.</p>
            </div>
          )
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
