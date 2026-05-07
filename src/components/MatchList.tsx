import React from 'react';
import type { Match, League } from '../types';
import { MatchCard } from './MatchCard';
import { AnimatePresence } from 'framer-motion';

interface MatchListProps {
  matches: Match[];
  leagues: League[];
  title: string;
}

export const MatchList: React.FC<MatchListProps> = ({ matches, leagues, title }) => {
  if (matches.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No hay partidos para mostrar.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 className="section-title">{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <AnimatePresence>
          {matches.map((match, index) => {
            const league = leagues.find(l => l.id === match.leagueId);
            if (!league) return null;
            return (
              <MatchCard 
                key={match.id} 
                match={match} 
                league={league} 
                index={index} 
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
