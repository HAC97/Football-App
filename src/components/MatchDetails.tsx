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
      // Basic fallback translations
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

  if (loading) return <div style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>Cargando formaciones y eventos...</div>;
  if (!data) return null;

  const rosters = data.rosters;
  const keyEvents = data.keyEvents;

  const hasLineups = rosters && rosters.length >= 2 && rosters[0].roster && rosters[0].roster.length > 0;

  const homeRoster = hasLineups ? (rosters.find((r: any) => r.homeAway === 'home') || rosters[0]) : null;
  const awayRoster = hasLineups ? (rosters.find((r: any) => r.homeAway === 'away') || rosters[1]) : null;

  const renderTeam = (roster: any) => {
    if (!roster || !roster.roster) return null;
    const starters = roster.roster.filter((p: any) => p.starter);
    const subs = roster.roster.filter((p: any) => !p.starter);

    if (starters.length === 0 && subs.length === 0) {
      return (
        <div style={{ flex: 1, textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
          Sin datos de jugadores
        </div>
      );
    }

    return (
      <div style={{ flex: 1 }}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>{roster.team.displayName}</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Formación: {roster.formation || 'N/D'}</p>
        
        {starters.length > 0 && (
          <>
            <h4 style={{ fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px' }}>Titulares</h4>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1rem', fontSize: '0.9rem' }}>
              {starters.map((p: any) => (
                <li key={p.athlete.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>{p.jersey} - {p.athlete.shortName}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.position.abbreviation}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {subs.length > 0 && (
          <>
            <h4 style={{ fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px' }}>Suplentes</h4>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem' }}>
              {subs.map((p: any) => (
                <li key={p.athlete.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>{p.jersey} - {p.athlete.shortName}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{p.position.abbreviation}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      
      {!hasLineups ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem 0' }}>
          La formación de este partido aún no está disponible.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '2rem' }}>
          {renderTeam(homeRoster)}
          <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
          {renderTeam(awayRoster)}
        </div>
      )}

      {keyEvents && keyEvents.length > 0 && (
        <div style={{ marginTop: hasLineups ? '2rem' : '0' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', letterSpacing: '1px' }}>Eventos Destacados</h4>
          <ul style={{ listStyle: 'none', padding: 0, fontSize: '0.9rem' }}>
            {keyEvents.map((ev: any) => {
              if (!ev.clock || !ev.clock.displayValue) return null; // skip events without a clock (like generic notices)
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
  );
};
