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
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando posiciones...</div>;
  }

  if (standingsGroups.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Tabla no disponible.</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ '--league-color': league.color } as React.CSSProperties}
    >
      {standingsGroups.map((group, groupIdx) => (
        <div key={groupIdx} className="glass-panel" style={{ overflow: 'hidden', padding: '1rem', marginBottom: '1.5rem' }}>
          {standingsGroups.length > 1 && (
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-primary)' }}>{group.name}</h3>
          )}
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.5rem', width: '20px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '0.5rem' }}>Team</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>P</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>GD</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>PTS</th>
                </tr>
              </thead>
              <tbody>
                {group.entries.map((row, idx) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' }}>
                    <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold' }}>{row.rank}</td>
                    <td style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                      <img src={row.team.logo} alt={row.team.name} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                      <span title={row.team.name}>{row.team.shortName || row.team.name}</span>
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.played}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', color: row.goalDifference > 0 ? '#4ade80' : row.goalDifference < 0 ? '#f87171' : 'inherit' }}>
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--accent)' }}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </motion.div>
  );
};
