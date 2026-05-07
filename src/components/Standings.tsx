import React, { useEffect, useState } from 'react';
import { fetchStandings } from '../services/api';
import type { StandingsGroup, League } from '../types';
import { motion } from 'framer-motion';

interface StandingsProps {
  league: League;
}

export const Standings: React.FC<StandingsProps> = ({ league }) => {
  const [standingsGroups, setStandingsGroups] = useState<StandingsGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStandings() {
      setLoading(true);
      const data = await fetchStandings(league.id);
      setStandingsGroups(data);
      setLoading(false);
    }
    loadStandings();
  }, [league.id]);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando tabla de posiciones...</div>;
  }

  if (standingsGroups.length === 0) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>La tabla de posiciones no está disponible para este torneo en este momento.</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ '--league-color': league.color } as React.CSSProperties}
    >
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', padding: '0 1rem' }}>
        <span>{league.logo}</span>
        Tabla de Posiciones - {league.name}
      </h2>

      {standingsGroups.map((group, groupIdx) => (
        <div key={groupIdx} className="glass-panel" style={{ overflowX: 'auto', padding: '1.5rem', marginBottom: '2rem' }}>
          {standingsGroups.length > 1 && (
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{group.name}</h3>
          )}
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '1rem 0.5rem', width: '40px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '1rem 0.5rem' }}>Equipo</th>
                <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }} title="Puntos">PTS</th>
                <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }} title="Partidos Jugados">PJ</th>
                <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }} title="Victorias">G</th>
                <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }} title="Empates">E</th>
                <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }} title="Derrotas">P</th>
                <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }} title="Goles a Favor">GF</th>
                <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }} title="Goles en Contra">GC</th>
                <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }} title="Diferencia de Goles">DIF</th>
              </tr>
            </thead>
            <tbody>
              {group.entries.map((row, idx) => (
                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' }}>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold' }}>{row.rank}</td>
                  <td style={{ padding: '0.75rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 500 }}>
                    <img src={row.team.logo} alt={row.team.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                    {row.team.name}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--accent)' }}>{row.points}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{row.played}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{row.wins}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{row.draws}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{row.losses}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{row.goalsFor}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{row.goalsAgainst}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: row.goalDifference > 0 ? '#4ade80' : row.goalDifference < 0 ? '#f87171' : 'inherit' }}>
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </motion.div>
  );
};
