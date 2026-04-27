import React, { useState, useEffect } from 'react';
import AnimatedCard from './AnimatedCard';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader, Cpu, MapPin, IndianRupee, Star, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config';
import './RecommendWidget.css';

const RecommendWidget = () => {
  const [prefs, setPrefs] = useState({
    max_budget: 15000,
    facilities_count: 5,
    importance_score: 0.7,
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  // Initial load
  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('${API_BASE_URL}/api/advanced/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Recommendation failed');
      setResults(data.recommendations?.slice(0, 6) || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchResults();
  };

  return (
    <div className="recommend-widget fade-in">
      <div className="widget-header">
        <div className="widget-icon">
          <Cpu size={32} />
        </div>
        <div>
          <h2>AI Concierge</h2>
          <p className="text-muted">Our custom ML models analyze thousands of beds to find your perfect match.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="prefs-form">
        <div className="pref-row">
          <div className="pref-group">
            <label>Monthly Budget</label>
            <div className="slider-row">
              <input
                type="range"
                min={2000}
                max={40000}
                step={500}
                value={prefs.max_budget}
                onChange={(e) => setPrefs({ ...prefs, max_budget: Number(e.target.value) })}
              />
              <span className="slider-value">₹{prefs.max_budget.toLocaleString()}</span>
            </div>
          </div>

          <div className="pref-group">
            <label>Priority: {prefs.importance_score < 0.4 ? 'Budget First' : prefs.importance_score > 0.6 ? 'Quality First' : 'Balanced'}</label>
            <div className="slider-row">
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={prefs.importance_score}
                onChange={(e) => setPrefs({ ...prefs, importance_score: Number(e.target.value) })}
              />
              <span className="slider-value">{Math.round(prefs.importance_score * 100)}% Quality</span>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary recommend-btn" disabled={loading}>
          {loading ? 'Analyzing Data...' : 'Recalculate Matches'}
        </button>
      </form>

      {error && <div className="rec-error">⚠ {error}</div>}

      {loading ? (
        <div className="searching-phase fade-in">
          <div className="pulse-loader"><Cpu size={32} /></div>
          <h3>Running AI Neural Matcher...</h3>
        </div>
      ) : (
        <div className="results-section">
          {searched && (
            <div className="rec-grid">
              {results.length > 0 ? (
                results.map((pg, index) => {
                  const matchPercent = pg.matchDistance === 999.0 ? 0 : Math.round((1 - (pg.matchDistance || 0)) * 100);
                  return (
                    <AnimatedCard
                      key={pg.id}
                      className={`rec-card ${pg.matchDistance === 999.0 ? 'over-budget' : ''}`}
                      onClick={() => navigate(`/pg/${pg.id}`)}
                    >
                      <div className="rec-card-img">
                        <img 
                          src={pg.photos?.[0] ? `${API_BASE_URL}${pg.photos[0]}` : 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=400'} 
                          alt={pg.name} 
                        />
                        <div className="rec-match-pill">
                          <Sparkles size={12} />
                          {matchPercent}% Match
                        </div>
                      </div>
                      
                      <div className="rec-card-body">
                        <div className="rec-header">
                          <h3>{pg.name}</h3>
                          <div className="rec-rating">
                            <Star size={14} fill="#FFD700" color="#FFD700" />
                            <span>{pg.pgScore?.toFixed(1) || '4.2'}</span>
                          </div>
                        </div>
                        
                        <div className="rec-loc">
                          <MapPin size={12} /> {pg.city}
                        </div>

                        <div className="rec-footer">
                           <div className="rec-price">
                              <IndianRupee size={16} />
                              <strong>{pg.rentMonthly.toLocaleString()}</strong>
                              <span>/mo</span>
                           </div>
                           {matchPercent > 90 && <div className="rec-best-val"><Zap size={10} /> Smart Entry</div>}
                        </div>
                      </div>
                    </AnimatedCard>
                  );
                })
              ) : (
                <div className="empty-rec">No properties match your current filters. Try relaxing your budget.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendWidget;
