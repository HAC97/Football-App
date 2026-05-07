import React from 'react';
import type { League, Team } from '../types';
import { motion } from 'framer-motion';

interface SidebarProps {
  leagues: League[];
  activeLeague: string | null;
  onSelectLeague: (id: string | null) => void;
  teams: Team[];
  favoriteTeamId: string | null;
  onSelectFavoriteTeam: (id: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  leagues, activeLeague, onSelectLeague, teams, favoriteTeamId, onSelectFavoriteTeam 
}) => {
  return (
    <motion.aside 
      className="sidebar"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>⭐ Mi Equipo Favorito</label>
        <select 
          value={favoriteTeamId || ''} 
          onChange={(e) => onSelectFavoriteTeam(e.target.value || null)}
          style={{ 
            width: '100%', 
            padding: '0.8rem', 
            borderRadius: 'var(--border-radius-md)', 
            background: 'rgba(0,0,0,0.3)', 
            color: 'var(--text-primary)',
            border: '1px solid rgba(255,255,255,0.1)',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        >
          <option value="">Selecciona un equipo...</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <button 
        className={`league-btn ${activeLeague === null ? 'active' : ''}`}
        onClick={() => onSelectLeague(null)}
      >
        <span className="league-logo">🌐</span>
        Todos los Partidos
      </button>

      <div style={{ margin: '1rem 0', height: '1px', background: 'rgba(255,255,255,0.05)' }} />

      {leagues.map((league) => (
        <button
          key={league.id}
          className={`league-btn ${activeLeague === league.id ? 'active' : ''}`}
          onClick={() => onSelectLeague(league.id)}
          style={{ '--league-color': league.color } as React.CSSProperties}
        >
          <span className="league-logo">{league.logo}</span>
          {league.name}
        </button>
      ))}
    </motion.aside>
  );
};
