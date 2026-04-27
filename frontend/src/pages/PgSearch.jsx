import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AnimatedCard from '../components/AnimatedCard';
import { Sparkles, MapPin, IndianRupee, BedDouble, Navigation, Map as MapIcon, LayoutGrid } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { getImageUrl } from '../utils/imageHelper';
import MapDiscovery from '../components/MapDiscovery';
import './PgSearch.css';

const PgSearch = () => {
  const [pgs, setPgs] = useState([]);
  const [cityQuery, setCityQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  
  // AI Smart Search States
  const [useSmartSearch, setUseSmartSearch] = useState(false);
  const [maxBudget, setMaxBudget] = useState(5000);
  const [facilitiesCount, setFacilitiesCount] = useState(2);
  const [importanceScore, setImportanceScore] = useState(0.5);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const fetchPgs = async (city = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = city ? `${API_BASE_URL}/api/pgs?city=${city}` : '${API_BASE_URL}/api/pgs';
      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        // Handle unauth if needed, but search usually can be public if backend allows
        if(res.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setPgs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSmartPgs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/advanced/recommend`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          max_budget: Number(maxBudget),
          facilities_count: Number(facilitiesCount),
          importance_score: Number(importanceScore)
        })
      });
      if (!res.ok) throw new Error('ML recommendation failed');
      const data = await res.json();
      setPgs(data.recommendations || []);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cityFromUrl = searchParams.get('city');
    if (cityFromUrl) {
      setCityQuery(cityFromUrl);
      fetchPgs(cityFromUrl);
    } else {
      fetchPgs();
    }
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (useSmartSearch) {
      fetchSmartPgs();
    } else {
      fetchPgs(cityQuery);
    }
  };

  return (
    <div className="search-page container fade-in">
      <div className={`search-header ${useSmartSearch ? 'smart-mode' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>{useSmartSearch ? 'AI Smart Search' : 'Explore PGs'}</h2>
          <div className="search-mode-controls">
            <button 
              className={`view-switch-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              className={`view-switch-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              title="Map View"
            >
              <MapIcon size={18} />
            </button>
            <div className="control-separator"></div>
            <button 
              className={`btn-secondary small-btn toggle-ai-switch ${useSmartSearch ? 'ai-active' : ''}`} 
              onClick={() => { setUseSmartSearch(!useSmartSearch); setCityQuery(''); fetchPgs(); }}
            >
              <Sparkles size={16} color={useSmartSearch ? '#E91E63' : '#78909C'} /> 
              {useSmartSearch ? 'Switch to Normal Search' : 'Use AI Matching'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSearch} className="search-bar">
          {!useSmartSearch ? (
            <input 
              type="text" 
              placeholder="Search by city..." 
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
            />
          ) : (
            <div className="smart-search-inputs fade-in">
              <div className="smart-input-col">
                <label>Max Budget (₹{maxBudget})</label>
                <input 
                  type="range" min="1000" max="25000" step="500" 
                  value={maxBudget} onChange={e => setMaxBudget(e.target.value)} 
                />
              </div>
              <div className="smart-input-col">
                <label>Min Facilities ({facilitiesCount})</label>
                <input 
                  type="range" min="0" max="10" step="1" 
                  value={facilitiesCount} onChange={e => setFacilitiesCount(e.target.value)} 
                />
              </div>
              <div className="smart-input-col">
                <label>Priority: {importanceScore < 0.5 ? 'Price' : importanceScore > 0.5 ? 'Facilities' : 'Balanced'}</label>
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  value={importanceScore} onChange={e => setImportanceScore(e.target.value)} 
                />
              </div>
            </div>
          )}
          <button type="submit" className="btn-primary">
            {useSmartSearch ? 'Find Matches' : 'Search'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner-center"></div>
          <p>Finding amazing spaces...</p>
        </div>
      ) : viewMode === 'map' ? (
        <div className="map-view-container fade-in">
          <MapDiscovery pgs={pgs} selectedCity={cityQuery} />
        </div>
      ) : (
        <div className="pg-grid">
          {pgs.length === 0 ? (
            <div className="empty-state">No PGs found in this area.</div>
          ) : (
            pgs.map(pg => {
              const isOverBudget = useSmartSearch && pg.matchDistance === 999;
              const matchPercent = useSmartSearch && pg.matchDistance !== undefined && pg.matchDistance !== 999
                ? Math.round((1 - pg.matchDistance) * 100)
                : null;

              return (
                <AnimatedCard 
                  key={pg.id} 
                  className={`pg-card ${isOverBudget ? 'over-budget-card' : ''}`}
                  onClick={() => navigate(`/pg/${pg.id}`)}
              >
                  <div className="pg-card-image">
                    <img 
                      src={pg.photos && pg.photos.length > 0
                        ? getImageUrl(pg.photos[0])
                        : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80'}
                      alt={pg.name} 
                    />
                    {isOverBudget && (
                      <div className="over-budget-overlay">Over Budget</div>
                    )}
                  </div>
                  <div className="pg-card-content">
                    <div className="pg-card-header">
                      <div className="pg-title-wrap">
                        <h3>{pg.name}</h3>
                        {matchPercent !== null && (
                          <div className={`ai-match-badge ${matchPercent >= 70 ? 'high-match' : matchPercent >= 40 ? 'mid-match' : 'low-match'}`}>
                            {matchPercent}% Match
                          </div>
                        )}
                      </div>
                      <span className={`price ${isOverBudget ? 'over-price' : ''}`}>₹{pg.rentMonthly}/mo</span>
                    </div>
                  <p className="text-muted location">{pg.city}, {pg.state}</p>
                  <p className="address">{pg.address}</p>
                  
                  {pg.pgScore > 0 && (
                    <div className="rating">★ {pg.pgScore.toFixed(1)}</div>
                  )}

                  <div className="facilities">
                    {pg.facilities.slice(0, 3).map((f, i) => (
                      <span key={i} className="facility-tag">{f}</span>
                    ))}
                    {pg.facilities.length > 3 && <span className="facility-tag">+{pg.facilities.length - 3}</span>}
                  </div>

                  <div className="card-actions-row">
                    <button 
                      className="btn-secondary small-btn directions-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const addr = `${pg.address}, ${pg.city}, ${pg.state}`;
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');
                      }}
                    >
                      <Navigation size={14} /> <span>Directions</span>
                    </button>
                    <button className="btn-primary small-btn">View Details</button>
                  </div>
                  </div>
                </AnimatedCard>
              );
            })
          )}
        </div>
      )}

    </div>
  );
};

export default PgSearch;
