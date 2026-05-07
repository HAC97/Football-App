import React from 'react';
import { Trophy, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

export const Header: React.FC = () => {
  return (
    <motion.header 
      className="header glass-panel"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="logo-container">
        <Trophy size={32} className="logo-icon" />
        <span className="logo-text">FutbolX</span>
      </div>
      
      <div className="header-actions">
        {/* Placeholder for future features like date picker or search */}
        <button style={{ 
          background: 'rgba(255,255,255,0.05)', 
          border: 'none', 
          padding: '0.75rem', 
          borderRadius: '50%', 
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s'
        }}>
          <CalendarDays size={20} />
        </button>
      </div>
    </motion.header>
  );
};
