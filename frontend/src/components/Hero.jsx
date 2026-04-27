import React from 'react';
import './Hero.css';

export default function Hero() {
  return (
    <div className="hero">
      {/* Background Orbs */}
      <div className="hero-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <div className="hero-content">
        <h1 className="hero-title">
          Next-Gen <span className="gradient-text">PG Hunting</span>
        </h1>
        <p className="hero-subtitle">
          Powered by AI Recommendations and Real-Time bed tracking. Stop guessing, start living in the best Paying Guest accommodations tailored just for you.
        </p>
        
        <div className="hero-actions">
          <button className="btn-primary">
            Search PGs Now
          </button>
          <button className="btn-owner">
            I am a PG Owner
          </button>
        </div>
      </div>
    </div>
  );
}

