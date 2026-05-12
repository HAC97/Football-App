import React, { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import type { Match, League } from '../types';
import { motion } from 'framer-motion';

interface MatchCardProps {
  match: Match;
  league: League;
  index: number;
  onClick?: () => void;
}

function formatClock(seconds: number, period: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const label = period === 1 ? '1st' : period === 2 ? '2nd' : period === 3 ? 'ET1' : period === 4 ? 'ET2' : `${period}th`;
  return `${label} ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getStatusLabel(match: Match, liveDisplay?: string): string {
  if (match.status === 'LIVE') {
    return liveDisplay || match.clockDisplay || `${match.minute}' Live`;
  }
  if (match.status === 'FINISHED') {
    return match.clockDisplay || 'FT';
  }
  return 'Pronto';
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, league, index, onClick }) => {
  const isLive = match.status === 'LIVE';
  const matchDate = parseISO(match.date);
  const hasClockData = isLive && match.clockSeconds !== undefined && match.period !== undefined && match.fetchedAt !== undefined;

  const [liveDisplay, setLiveDisplay] = useState<string | undefined>(
    hasClockData ? formatClock(match.clockSeconds!, match.period!) : match.clockDisplay
  );

  const timerRef = useRef({
    baseSeconds: 0,
    baseTimestamp: 0,
    period: 1,
    active: false,
  });

  useEffect(() => {
    if (!hasClockData) return;
    timerRef.current = {
      baseSeconds: match.clockSeconds!,
      baseTimestamp: match.fetchedAt!,
      period: match.period!,
      active: true,
    };
  }, [match.id, hasClockData, match.clockSeconds, match.period, match.fetchedAt]);

  useEffect(() => {
    if (!hasClockData) return;
    const interval = setInterval(() => {
      const { baseSeconds, baseTimestamp, period, active } = timerRef.current;
      if (!active) return;
      const elapsed = baseSeconds + Math.floor((Date.now() - baseTimestamp) / 1000);
      setLiveDisplay(formatClock(elapsed, period));
    }, 1000);
    return () => clearInterval(interval);
  }, [match.id, hasClockData]);

  return (
    <motion.div 
      className="glass-panel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      style={{ overflow: 'hidden', cursor: 'pointer' }}
      onClick={onClick}
    >
      <div className="match-card">
        <div className="match-header">
          <div>
            <div className="match-league">{league.name} Match</div>
            <div className="match-date">{format(matchDate, 'MMM dd, yyyy HH:mm a')}</div>
          </div>
          {isLive && (
            <div className="match-status live">{getStatusLabel(match, liveDisplay)}</div>
          )}
        </div>

        <div className="teams-container">
          <div className="team home">
            <img src={match.homeTeam.logo} alt={match.homeTeam.name} className="team-logo" />
            <span className="team-name">{match.homeTeam.name}</span>
          </div>

          <div className="score-container">
            <span>{match.score ? match.score.home : '-'}</span>
            <span style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>:</span>
            <span>{match.score ? match.score.away : '-'}</span>
          </div>

          <div className="team away">
            <img src={match.awayTeam.logo} alt={match.awayTeam.name} className="team-logo" />
            <span className="team-name">{match.awayTeam.name}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
