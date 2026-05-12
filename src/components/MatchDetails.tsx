import React, { useEffect, useState } from 'react';
import type { Match } from '../types';

interface MatchDetailsProps {
  match: Match;
}

const translateEvent = (ev: any): string => {
  const type = ev.type?.type || '';
  const p1 = ev.participants?.[0]?.athlete?.displayName;
  const p2 = ev.participants?.[1]?.athlete?.displayName;

  switch (type) {
    case 'goal':
      return `⚽ Gol de ${p1 || 'desconocido'}`;
    case 'penalty-goal':
      return `⚽ Gol de penal de ${p1 || 'desconocido'}`;
    case 'own-goal':
      return `⚽ Gol en contra de ${p1 || 'desconocido'}`;
    case 'yellow-card':
      return `🟨 Tarjeta Amarilla para ${p1 || 'desconocido'}`;
    case 'red-card':
      return `🟥 Tarjeta Roja para ${p1 || 'desconocido'}`;
    case 'substitution':
      if (p1 && p2) return `🔄 Cambio: Entra ${p1}, Sale ${p2}`;
      return `🔄 Sustitución de ${p1 || 'jugador'}`;
    case 'kickoff':
      return `Empezó el partido`;
    case 'halftime':
      return `Fin del primer tiempo`;
    case 'start-2nd-half':
      return `Inició el segundo tiempo`;
    case 'end-match':
    case 'end-2nd-half':
      return `Fin del partido`;
    case 'var':
      return `🖥️ VAR: ${ev.text}`;
    default:
      let text = ev.shortText || ev.text || '';
      text = text.replace(/Yellow Card/i, 'Tarjeta Amarilla');
      text = text.replace(/Red Card/i, 'Tarjeta Roja');
      text = text.replace(/Goal/i, 'Gol');
      text = text.replace(/Substitution/i, 'Sustitución');
      return text;
  }
};

export const MatchDetails: React.FC<MatchDetailsProps> = ({ match }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');

  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      try {
        const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${match.espnSlug}/summary?event=${match.id}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    }
    fetchDetails();
  }, [match]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)' }}>Cargando datos del partido...</div>;
  }

  if (!data) return null;

  const rosters = data.rosters;
  const keyEvents = data.keyEvents;
  const hasLineups = rosters && rosters.length >= 2 && rosters[0].roster && rosters[0].roster.length > 0;
  
  let statsList: any[] = [];
  if (data?.boxscore?.statistics && data.boxscore.statistics.length > 0) {
    const s = data.boxscore.statistics[0].statistics;
    if (s && s.length > 0) {
      statsList = s.map((stat: any) => {
        let h = parseInt(stat.displayValue) || 0;
        let a = parseInt(stat.displayValue) || 0;
        if (stat.displayValue && stat.displayValue.includes('-')) {
            const parts = stat.displayValue.split('-');
            h = parseInt(parts[0]);
            a = parseInt(parts[1]);
        }
        const total = h + a || 1;
        return {
          label: stat.text || stat.name,
          home: h.toString(),
          away: a.toString(),
          homeVal: (h / total) * 100,
          awayVal: (a / total) * 100
        };
      });
    }
  }

  const hasStats = statsList.length > 0;
  const hasEvents = keyEvents && keyEvents.length > 0;

  if (!hasLineups && !hasStats && !hasEvents) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)' }}>
        No hay datos disponibles para este partido todavía.
      </div>
    );
  }

  const homeRoster = hasLineups ? (rosters.find((r: any) => r.homeAway === 'home') || rosters[0]) : null;
  const awayRoster = hasLineups ? (rosters.find((r: any) => r.homeAway === 'away') || rosters[1]) : null;

  const currentRoster = activeTeam === 'home' ? homeRoster : awayRoster;
  const starters = currentRoster?.roster?.filter((p: any) => p.starter) || [];
  
  // Try to group by position
  const gk = starters.filter((p: any) => ['G', 'GK', 'Goalkeeper'].includes(p.position?.abbreviation || p.position?.name));
  const def = starters.filter((p: any) => ['D', 'DEF', 'Defender', 'CB', 'LB', 'RB'].includes(p.position?.abbreviation || p.position?.name));
  const mid = starters.filter((p: any) => ['M', 'MID', 'Midfielder', 'CM', 'LM', 'RM', 'AM', 'DM'].includes(p.position?.abbreviation || p.position?.name));
  const fwd = starters.filter((p: any) => ['F', 'FWD', 'Forward', 'ST', 'LW', 'RW'].includes(p.position?.abbreviation || p.position?.name));

  // If grouping failed (e.g. unexpected abbreviations), fallback to typical 1-4-4-2 order slicing
  const useFallback = gk.length + def.length + mid.length + fwd.length !== starters.length && starters.length > 0;
  const renderGk = useFallback ? starters.slice(0, 1) : gk;
  const renderDef = useFallback ? starters.slice(1, 5) : def;
  const renderMid = useFallback ? starters.slice(5, 9) : mid;
  const renderFwd = useFallback ? starters.slice(9) : fwd;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: hasLineups && (hasStats || hasEvents) ? '1fr 1fr' : '1fr', gap: '1.5rem', padding: '1.5rem', background: 'var(--bg-dark)', borderTop: '1px solid rgba(255,255,255,0.05)', borderRadius: '0 0 var(--border-radius-lg) var(--border-radius-lg)' }}>
      
      {/* Left Column: Pitch / Lineup */}
      {hasLineups && (
        <div style={{ position: 'relative', background: '#1c2420', borderRadius: '16px', overflow: 'hidden', minHeight: '500px', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.5)', padding: '0.25rem', borderRadius: '99px' }}>
              <button 
                onClick={() => setActiveTeam('home')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: activeTeam === 'home' ? 'var(--green)' : 'transparent', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '99px', cursor: 'pointer', transition: 'background 0.2s', fontWeight: 600, fontSize: '0.85rem' }}
              >
                {match.homeTeam.shortName || match.homeTeam.name}
                <img src={match.homeTeam.logo} alt="" style={{ width: '16px', height: '16px' }} />
              </button>
              <button 
                onClick={() => setActiveTeam('away')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: activeTeam === 'away' ? 'var(--green)' : 'transparent', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '99px', cursor: 'pointer', transition: 'background 0.2s', fontWeight: 600, fontSize: '0.85rem' }}
              >
                {match.awayTeam.shortName || match.awayTeam.name}
                <img src={match.awayTeam.logo} alt="" style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Formación: {currentRoster?.formation || 'N/D'}</span>
            </div>
          </div>

          <div style={{ flex: 1, position: 'relative', opacity: 0.9, display: 'flex', flexDirection: 'column', padding: '1rem 0' }}>
            <div style={{ position: 'absolute', top: '50%', left: '0', width: '100%', height: '2px', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80px', height: '80px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }} />
            <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', width: '150px', height: '80px', border: '2px solid rgba(255,255,255,0.2)' }} />
            <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', width: '150px', height: '80px', border: '2px solid rgba(255,255,255,0.2)' }} />
            
            {/* Players on Pitch */}
            <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-around', padding: '2rem 0', zIndex: 1 }}>
              {/* Forwards */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: renderFwd.length > 2 ? '1rem' : '4rem' }}>
                {renderFwd.map((p: any) => (
                  <div key={p.athlete?.id || Math.random()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', width: '60px' }}>
                    <div style={{ width: '28px', height: '28px', background: 'var(--green)', borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#132F20', fontSize: '0.75rem', fontWeight: 'bold' }}>{p.jersey}</div>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.6)', padding: '2px 4px', borderRadius: '4px', textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' }}>{p.athlete?.shortName || p.athlete?.displayName}</span>
                  </div>
                ))}
              </div>
              {/* Midfielders */}
              <div style={{ display: 'flex', justifyContent: 'space-evenly', padding: '0 1rem' }}>
                {renderMid.map((p: any) => (
                  <div key={p.athlete?.id || Math.random()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', width: '60px' }}>
                    <div style={{ width: '28px', height: '28px', background: 'var(--green)', borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#132F20', fontSize: '0.75rem', fontWeight: 'bold' }}>{p.jersey}</div>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.6)', padding: '2px 4px', borderRadius: '4px', textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' }}>{p.athlete?.shortName || p.athlete?.displayName}</span>
                  </div>
                ))}
              </div>
              {/* Defenders */}
              <div style={{ display: 'flex', justifyContent: 'space-evenly', padding: '0 1rem' }}>
                {renderDef.map((p: any) => (
                  <div key={p.athlete?.id || Math.random()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', width: '60px' }}>
                    <div style={{ width: '28px', height: '28px', background: 'var(--green)', borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#132F20', fontSize: '0.75rem', fontWeight: 'bold' }}>{p.jersey}</div>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.6)', padding: '2px 4px', borderRadius: '4px', textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' }}>{p.athlete?.shortName || p.athlete?.displayName}</span>
                  </div>
                ))}
              </div>
              {/* Goalkeeper */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {renderGk.map((p: any) => (
                  <div key={p.athlete?.id || Math.random()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', width: '60px' }}>
                    <div style={{ width: '28px', height: '28px', background: '#3b82f6', borderRadius: '50%', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>{p.jersey}</div>
                    <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.6)', padding: '2px 4px', borderRadius: '4px', textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' }}>{p.athlete?.shortName || p.athlete?.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Column: Stats & Events */}
      {(hasStats || hasEvents) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {hasStats && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--green)', fontWeight: 600, position: 'relative' }}>
                  Estadísticas
                  <div style={{ position: 'absolute', bottom: '-17px', left: 0, width: '100%', height: '2px', background: 'var(--green)' }} />
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {statsList.map((stat, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                      <span style={{ color: stat.homeVal > stat.awayVal ? 'var(--green)' : 'var(--text-primary)' }}>{stat.home}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize' }}>{stat.label}</span>
                      <span style={{ color: stat.awayVal > stat.homeVal ? '#3b82f6' : 'var(--text-primary)' }}>{stat.away}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', height: '4px' }}>
                      <div style={{ flex: stat.homeVal, background: stat.homeVal > 0 ? 'var(--green)' : 'transparent', borderRadius: '99px 0 0 99px' }} />
                      <div style={{ flex: stat.awayVal, background: stat.awayVal > 0 ? '#3b82f6' : 'transparent', borderRadius: '0 99px 99px 0' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasEvents && (
            <div style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--green)', fontWeight: 600, position: 'relative' }}>
                  Eventos
                  <div style={{ position: 'absolute', bottom: '-17px', left: 0, width: '100%', height: '2px', background: 'var(--green)' }} />
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                {keyEvents.map((ev: any) => {
                  if (!ev.clock || !ev.clock.displayValue) return null;
                  return (
                    <li key={ev.id} style={{ padding: '0.5rem 0', display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 'bold', width: '50px' }}>{ev.clock.displayValue}</span>
                      <span>{translateEvent(ev)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
};
