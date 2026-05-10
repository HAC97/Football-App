import React, { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import type { Match, League } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchDetails } from './MatchDetails';
import { ChevronDown, ChevronUp, Target } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  league: League;
  index: number;
}

function formatClock(seconds: number, period: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const label = period === 1 ? '1st' : period === 2 ? '2nd' : period === 3 ? 'ET1' : period === 4 ? 'ET2' : `${period}th`;
  return `${label} ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getStatusLabel(match: Match, liveDisplay?: string): string {
  if (match.status === 'LIVE') {
    const detail = match.statusDetail?.toLowerCase() || '';
    if (detail.includes('halftime') || detail.includes('half-time') || detail.includes('half time')) return 'HT';
    if (detail.includes('penalty') || detail.includes('penalties') || match.penalties) return 'PEN';
    return liveDisplay || match.clockDisplay || `${match.minute}'`;
  }
  if (match.status === 'FINISHED') {
    const detail = match.statusDetail?.toLowerCase() || '';
    if (detail.includes('penalty') || detail.includes('penalties') || match.penalties) return 'PEN';
    return match.clockDisplay || 'FT';
  }
  return 'Pronto';
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, league, index }) => {
  const [expanded, setExpanded] = useState(false);
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
  const lastPeriodRef = useRef<number | undefined>(undefined);
  const initializedForId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!hasClockData) {
      timerRef.current.active = false;
      initializedForId.current = undefined;
      return;
    }
    if (initializedForId.current === match.id) return;

    timerRef.current = {
      baseSeconds: match.clockSeconds!,
      baseTimestamp: match.fetchedAt!,
      period: match.period!,
      active: true,
    };
    lastPeriodRef.current = match.period;
    initializedForId.current = match.id;
  }, [match.id, hasClockData, match.clockSeconds, match.period, match.fetchedAt]);

  useEffect(() => {
    if (!timerRef.current.active || match.period === undefined || match.clockSeconds === undefined || match.fetchedAt === undefined) return;

    if (match.period !== lastPeriodRef.current) {
      timerRef.current.baseSeconds = match.clockSeconds;
      timerRef.current.baseTimestamp = match.fetchedAt;
      timerRef.current.period = match.period;
      lastPeriodRef.current = match.period;
      return;
    }

    const estimate = timerRef.current.baseSeconds + Math.floor((Date.now() - timerRef.current.baseTimestamp) / 1000);
    if (match.clockSeconds > estimate) {
      timerRef.current.baseSeconds = match.clockSeconds;
      timerRef.current.baseTimestamp = match.fetchedAt;
    }
  }, [match.period, match.clockSeconds, match.fetchedAt]);

  useEffect(() => {
    if (!hasClockData) return;

    const interval = setInterval(() => {
      const { baseSeconds, baseTimestamp, period, active } = timerRef.current;
      if (!active) return;
      const elapsed = baseSeconds + Math.floor((Date.now() - baseTimestamp) / 1000);
      setLiveDisplay(formatClock(elapsed, period));
    }, 250);

    return () => clearInterval(interval);
  }, [match.id, hasClockData]);

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
          <span className={`match-status ${isLive ? 'live' : ''} ${(match.statusDetail?.toLowerCase().includes('penalty') || match.penalties) ? 'penalty' : ''}`}>
            {getStatusLabel(match, liveDisplay)}
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

        {match.penalties && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', padding: '0.25rem 0.75rem', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <Target size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Penales</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {match.penalties.home} - {match.penalties.away}
            </span>
          </div>
        )}

        <div className="league-info">
          <div className="league-badge">
            <span>{league.logo}</span>
            <span style={{ display: 'none' }}>{league.name}</span>
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
