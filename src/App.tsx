import { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MatchList } from './components/MatchList';
import { Standings } from './components/Standings';
import { MatchDetails } from './components/MatchDetails';
import { leagues } from './services/mockData';
import { fetchMatches } from './services/api';
import type { Match } from './types';
import './index.css';

function App() {
  const [activeLeague, setActiveLeague] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

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
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [loading, hasLiveMatches]);

  const handleSelectLeague = (id: string | null) => {
    setActiveLeague(id);
  };

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (activeLeague) {
      filtered = filtered.filter(m => m.leagueId === activeLeague);
    }
    return filtered;
  }, [activeLeague, matches]);

  const liveMatches = filteredMatches.filter(m => m.status === 'LIVE');
  const scheduledMatches = filteredMatches.filter(m => m.status === 'SCHEDULED');
  const finishedMatches = filteredMatches.filter(m => m.status === 'FINISHED');

  const selectedLeagueObj = leagues.find(l => l.id === activeLeague);
  const defaultLeagueObj = leagues.find(l => l.id === 'sa') || leagues[0];

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [finishedLimit, setFinishedLimit] = useState(3);

  return (
    <div className="app-container">
      <Sidebar 
        leagues={leagues} 
        activeLeague={activeLeague} 
        onSelectLeague={handleSelectLeague} 
      />
      
      <main className="main-content">
        {/* Hero Banner Placeholder matching the image */}
        <div className="hero-banner">
          <div className="hero-content">
            <p className="hero-subtitle">Super Big Match</p>
            <p className="hero-week">Week 23 SerieA</p>
            <h1 className="hero-title">NAPOLI <span className="vs-badge">VS</span> INTER MILAN</h1>
            <p className="hero-date">29 September 2023 4.30PM</p>
            <p className="hero-live">Live at <strong>Guiseppe Meazza</strong></p>
          </div>
        </div>

        <div className="matches-section-header">
          <h2 className="section-title">{selectedLeagueObj ? `${selectedLeagueObj.name} Matches` : 'All Matches'}</h2>
          <select className="featured-match-dropdown">
            <option>Featured Match</option>
            <option>Live Matches</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading matches...
          </div>
        ) : (
          <div className="matches-grid">
            {liveMatches.length > 0 && (
              <MatchList title="En Vivo" matches={liveMatches} leagues={leagues} onSelectMatch={setSelectedMatch} />
            )}
            {scheduledMatches.length > 0 && (
              <MatchList title="Próximos Partidos" matches={scheduledMatches} leagues={leagues} onSelectMatch={setSelectedMatch} />
            )}
            {finishedMatches.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <MatchList title="Resultados" matches={finishedMatches.slice(0, finishedLimit)} leagues={leagues} onSelectMatch={setSelectedMatch} />
                {finishedMatches.length > finishedLimit && (
                  <button 
                    onClick={() => setFinishedLimit(prev => prev + 3)}
                    style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    Ver más resultados
                  </button>
                )}
              </div>
            )}
            {filteredMatches.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No hay partidos programados.
              </div>
            )}
          </div>
        )}
      </main>

      <aside className="right-sidebar">
        <div className="standings-widget">
          <h2 className="widget-title">{selectedLeagueObj ? selectedLeagueObj.name : 'Serie A'} Standings</h2>
          <Standings league={selectedLeagueObj || defaultLeagueObj} />
        </div>
      </aside>

      {/* Modal Popup */}
      {selectedMatch && (
        <div className="modal-overlay" onClick={() => setSelectedMatch(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMatch(null)}>✕</button>
            {/* Import MatchDetails dynamically or statically at top. We will add the import. */}
            <MatchDetails match={selectedMatch} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
