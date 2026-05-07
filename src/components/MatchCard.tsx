import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import type { Match, League } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchDetails } from './MatchDetails';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  league: League;
  index: number;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, league, index }) => {
  const [expanded, setExpanded] = useState(false);
  const isLive = match.status === 'LIVE';
  const matchDate = parseISO(match.date);

  return (
    <motion.div 
      className="glass-panel"
      style={{ '--league-color': league.color, overflow: 'hidden', cursor: 'pointer' } as React.CSSProperties}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="match-card" style={{ paddingBottom: expanded ? '1rem' : '1.5rem' }}>
        <div className="match-time-container">
          <span className={`match-status ${isLive ? 'live' : ''}`}>
            {isLive || match.status === 'FINISHED' ? (match.clockDisplay || (isLive ? `${match.minute}'` : 'FT')) : 'Pronto'}
          </span>
          {!isLive && (
            <span className="match-time">
              {format(matchDate, 'HH:mm')}
            </span>
          )}
        </div>

        <div className="teams-container" style={{ position: 'relative' }}>
          <div className="team home">
            <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="team-logo" />
            <span className="team-name">{match.homeTeam.name}</span>
          </div>

          <div className="score-container">
            <span className="score">
              {match.score ? match.score.home : '-'}
            </span>
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>vs</span>
            <span className="score">
              {match.score ? match.score.away : '-'}
            </span>
          </div>

          <div className="team away">
            <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="team-logo" />
            <span className="team-name">{match.awayTeam.name}</span>
          </div>
        </div>

        <div className="league-info">
          <div className="league-badge">
            <span>{league.logo}</span>
            <span style={{ display: 'none' }}>{league.name}</span> {/* Optional text */}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {format(matchDate, 'dd MMM yyyy')}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <MatchDetails match={match} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
