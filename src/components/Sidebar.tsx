import React, { useState } from 'react';
import type { League } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  leagues: League[];
  activeLeague: string | null;
  onSelectLeague: (id: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  leagues, activeLeague, onSelectLeague 
}) => {
  const [isLigasOpen, setIsLigasOpen] = useState(true);

  return (
    <motion.aside 
      className="sidebar"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="sidebar-logo">
        <span className="logo-icon">⚽</span>
        <span className="logo-text">Fulltime</span>
      </div>

      <div className="sidebar-section">
        <h3 
          className="section-header" 
          onClick={() => setIsLigasOpen(!isLigasOpen)}
          style={{ cursor: 'pointer' }}
        >
          Ligas
          <span className="chevron" style={{ transform: isLigasOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>▼</span>
        </h3>
        
        <AnimatePresence>
          {isLigasOpen && (
            <motion.div 
              className="section-items"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <button
                className={`league-btn ${activeLeague === null ? 'active' : ''}`}
                onClick={() => onSelectLeague(null)}
              >
                <span className="league-logo">🌐</span>
                All Matches
              </button>
              
              {leagues.map((league) => (
                <button
                  key={league.id}
                  className={`league-btn ${activeLeague === league.id ? 'active' : ''}`}
                  onClick={() => onSelectLeague(league.id)}
                >
                  <span className="league-logo">{league.logo}</span>
                  {league.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
};
