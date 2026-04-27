import React from 'react';
import './AnimatedCard.css';

const AnimatedCard = ({ children, onClick, className = '' }) => {
  return (
    <div 
      className={`animated-card ${className}`} 
      onClick={onClick}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export default AnimatedCard;
