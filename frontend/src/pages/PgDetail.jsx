import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { getImageUrl } from '../utils/imageHelper';
import { io } from 'socket.io-client';
import { TrendingUp, AlertCircle, CheckCircle, Download, Camera, ShieldCheck, X, Star, Navigation, MessageCircle, Sparkles } from 'lucide-react';
import ChatWidget from '../components/ChatWidget';
import './PgDetail.css';

const PgDetail = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [pg, setPg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [predLoading, setPredLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [viewerLifestyle, setViewerLifestyle] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [reviewInsights, setReviewInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Booking Modal States
  const [showModal, setShowModal] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);
  const [occupantName, setOccupantName] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [passportFile, setPassportFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [bookingSuccessData, setBookingSuccessData] = useState(null);

  // Review Form
  const [reviewStar, setReviewStar] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchPg = async () => {
      try {
        const authToken = token || localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/pgs/${id}/layout`, {
          headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        if (!res.ok) {
          if (res.status === 401) navigate('/login');
          throw new Error('Could not load PG structure');
        }
        const data = await res.json();
        setPg(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPg();
  }, [id, token, navigate]);

  useEffect(() => {
    if (!id) return;
    const fetchPrediction = async () => {
      setPredLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/advanced/predict/${id}`);
        if (res.ok) {
          const data = await res.json();
          setPrediction(data);
        }
      } catch (e) {
        console.warn('Prediction unavailable', e);
      } finally {
        setPredLoading(false);
      }
    };
    fetchPrediction();
  }, [id]);

  useEffect(() => {
    if (!token) return;
    const fetchMyLifestyle = async () => {
      try {
        const res = await fetch('${API_BASE_URL}/api/advanced/lifestyle', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setViewerLifestyle(await res.json());
      } catch (err) { console.warn('Lifestyle fetching failed', err); }
    };
    fetchMyLifestyle();
  }, [token]);

  useEffect(() => {
    if (!token || !id) return;
    const fetchCanReview = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/advanced/pgs/${id}/can-review`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCanReview(data.canReview);
        }
      } catch (err) { console.warn('CanReview check failed', err); }
    };
    fetchCanReview();
  }, [token, id]);

  useEffect(() => {
    if (!id) return;
    const fetchInsights = async () => {
      setInsightsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/advanced/pgs/${id}/review-insights`);
        if (res.ok) {
          const data = await res.json();
          setReviewInsights(data);
        }
      } catch (err) { console.warn('Insights check failed', err); }
      finally { setInsightsLoading(false); }
    };
    fetchInsights();
  }, [id]);

  const calculateCompatibility = (roommateLifestyle) => {
    if (!viewerLifestyle || !roommateLifestyle) return null;
    
    // Mapping matches the Python ML microservice logic
    const v1 = [
      viewerLifestyle.sleep, viewerLifestyle.clean, viewerLifestyle.social, 
      viewerLifestyle.diet, viewerLifestyle.music, viewerLifestyle.smoker ? 5 : 0
    ];
    const v2 = [
      roommateLifestyle.sleep, roommateLifestyle.clean, roommateLifestyle.social, 
      roommateLifestyle.diet, roommateLifestyle.music, roommateLifestyle.smoker ? 5 : 0
    ];

    let sumSq = 0;
    for (let i = 0; i < v1.length; i++) {
      sumSq += Math.pow(v1[i] - v2[i], 2);
    }
    const dist = Math.sqrt(sumSq);
    const maxDist = 12.25;
    
    let score = Math.max(0, 100 - (dist / maxDist * 100));
    
    // Smoking penalty
    if (viewerLifestyle.smoker !== roommateLifestyle.smoker) {
      score = score * 0.7;
    }
    
    return Math.round(score);
  };

  useEffect(() => {
    if (!pg) return;

    const socket = io('${API_BASE_URL}');
    socket.emit('join_pg_room', pg.id);

    socket.on('bed_status_changed', ({ bedId, newStatus }) => {
      setPg(prevPg => {
        const newPg = { ...prevPg };
        newPg.floors = newPg.floors.map(floor => ({
          ...floor,
          beds: floor.beds.map(bed =>
            bed.id === bedId ? { ...bed, status: newStatus } : bed
          )
        }));
        return newPg;
      });
    });

    return () => socket.disconnect();
  }, [pg?.id]);

  const openBookingModal = (bed) => {
    if (!user) {
      alert('Please login to book a bed.');
      navigate('/login');
      return;
    }
    setSelectedBed(bed);
    setOccupantName(user.name || '');
    setAadharNumber('');
    setPassportFile(null);
    setPreviewUrl(null);
    setBookingError(null);
    setBookingSuccessData(null);
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPassportFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    setBookingError(null);

    if (!/^\d{12}$/.test(aadharNumber)) {
      setBookingError("Please enter exactly 12 digits for Aadhar Number.");
      return;
    }

    if (!passportFile) {
      setBookingError("Passport photo is required.");
      return;
    }

    setBookingLoading(true);
    try {
      const formData = new FormData();
      formData.append('bedId', selectedBed.id);
      formData.append('occupantName', occupantName);
      formData.append('aadharNumber', aadharNumber);
      formData.append('passportPhoto', passportFile);

      const res = await fetch('${API_BASE_URL}/api/pgs/book-bed', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Fetch QR Code
      const qrRes = await fetch(`${API_BASE_URL}/api/advanced/booking/${data.booking.id}/qr`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const qrData = await qrRes.json();

      setBookingSuccessData({
        bookingId: data.booking.id,
        qrCodeUrl: qrData.qrCodeUrl
      });

      // Update local state to show as occupied for me
      setPg(prevPg => {
        const newPg = { ...prevPg };
        newPg.floors = newPg.floors.map(floor => ({
          ...floor,
          beds: floor.beds.map(bed =>
            bed.id === selectedBed.id ? { 
              ...bed, 
              status: 'OCCUPIED',
              bookings: [{ status: 'ACTIVE', occupantName, user: { name: user?.name } }]
            } : bed
          )
        }));
        return newPg;
      });

    } catch (err) {
      console.error('[Booking Flow Error]', err);
      // If the error message starts with "Unexpected token", it's likely HTML from the server
      if (err.message.includes('Unexpected token') || err.message.includes('JSON')) {
        setBookingError("Server returned an invalid response. Please check if the backend is running or contact support.");
      } else {
        setBookingError(err.message);
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    setReviewLoading(true);
    setReviewError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/advanced/pgs/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ rating: reviewStar, text: reviewText })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message);
      }
      setReviewText('');
      setReviewStar(5);
      
      // refresh PG layout data to get new reviews
      const pgRes = await fetch(`${API_BASE_URL}/api/pgs/${id}/layout`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      setPg(await pgRes.json());
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) return <div className="detail-container detail-loading">Loading PG layout...</div>;
  if (error) return <div className="detail-container error">{error}</div>;
  if (!pg) return null;

  const allBeds = pg.floors.flatMap(f => f.beds);
  const emptyCount = allBeds.filter(b => b.status === 'EMPTY').length;
  const occupiedCount = allBeds.filter(b => b.status === 'OCCUPIED').length;
  const fillPercent = allBeds.length > 0 ? Math.round((occupiedCount / allBeds.length) * 100) : 0;

  return (
    <div className="detail-container fade-in">
      {/* ─── Photo Gallery ─── */}
      {pg.photos && pg.photos.length > 0 && (
        <div className="pg-detail-gallery">
          <img
            src={getImageUrl(pg.photos[0])}
            alt={pg.name}
            className="gallery-main"
          />
          {pg.photos.length > 1 && (
            <div className="gallery-thumbs">
              {pg.photos.slice(1, 5).map((url, i) => (
                <img key={i} src={getImageUrl(url)} alt={`Photo ${i + 2}`} className="gallery-thumb" />
              ))}
              {pg.photos.length > 5 && (
                <div className="gallery-more">+{pg.photos.length - 5} more</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="detail-header">
        {/* ─── Fraud Warning ─── */}
        {!pg.isVerified && (
          <div className="fraud-warning-banner fade-in">
            <AlertCircle size={24} />
            <div className="warning-text">
              <strong>Suspicious Listing Detected</strong>
              <p>{pg.fraudReason || "This listing has been flagged for inconsistent data (too many facilities for the price) and is under review."}</p>
            </div>
          </div>
        )}

        <div className="detail-title-row">
          <div>
            <h1>{pg.name}</h1>
            <div className="address-block">
              <p className="text-muted">{pg.address}, {pg.city}, {pg.state}</p>
              <button 
                className="btn-secondary small-btn directions-link-btn"
                onClick={() => {
                  const addr = `${pg.address}, ${pg.city}, ${pg.state}`;
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');
                }}
              >
                <Navigation size={14} /> Get Directions
              </button>
            </div>
          </div>
          <div className="price-tag">₹{pg.rentMonthly} / month</div>
        </div>

        {user?.role === 'STUDENT' && (
          <button 
            className="btn-primary message-owner-btn" 
            onClick={() => setShowChat(true)}
            style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <MessageCircle size={20} /> Message Owner
          </button>
        )}

        {/* ─── Occupancy Stats Bar ─── */}
        {allBeds.length > 0 && (
          <div className="occupancy-stats">
            <div className="stat-row">
              <span>Occupancy: <strong>{occupiedCount}/{allBeds.length} beds</strong></span>
              <span className={emptyCount > 0 ? 'seats-left' : 'seats-full'}>
                {emptyCount > 0 ? `${emptyCount} beds available` : 'Fully occupied'}
              </span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${fillPercent}%`, background: fillPercent >= 90 ? '#F44336' : fillPercent >= 60 ? '#FF9800' : '#4CAF50' }}
              />
            </div>
          </div>
        )}

        {/* ─── ML Occupancy Prediction ─── */}
        <div className="prediction-box">
          <div className="prediction-header">
            <TrendingUp size={20} />
            <span>AI Occupancy Forecast</span>
          </div>
          {predLoading ? (
            <p className="text-muted pred-loading">Running ML model...</p>
          ) : prediction ? (
            <div className="pred-result">
              {prediction.days_until_full === 0 ? (
                <div className="pred-alert full">
                  <AlertCircle size={18} />
                  This PG is currently <strong>fully occupied</strong>.
                </div>
              ) : prediction.days_until_full === -1 ? (
                <div className="pred-alert safe">
                  <CheckCircle size={18} />
                  Plenty of availability — no rush!
                </div>
              ) : (
                <div className={`pred-alert ${prediction.days_until_full <= 7 ? 'urgent' : 'moderate'}`}>
                  <AlertCircle size={18} />
                  Predicted to be <strong>100% full by {prediction.predicted_full_date}</strong>
                  &nbsp;({prediction.days_until_full} day{prediction.days_until_full !== 1 ? 's' : ''} remaining)
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted">Prediction unavailable (add beds to enable)</p>
          )}
        </div>

        {/* ─── Trust Seal ─── */}
        <div className="trust-seal-bar fade-in">
           <div className="trust-seal glass">
              <ShieldCheck size={16} color="#10B981" />
              <span>Verified Reviews Platform</span>
           </div>
           <div className="trust-seal glass">
              <CheckCircle size={16} color="#10B981" />
              <span>Verified PG Inventory</span>
           </div>
        </div>
      </div>

      {/* ─── About This PG ─── */}
      {(pg.description || (pg.rules && pg.rules.length > 0) || pg.securityDeposit || pg.lockInDays || pg.onboardingFee) && (
        <div className="pg-about-section">

          {pg.description && (
            <div className="about-card glass">
              <h3 className="about-heading">📋 About This PG</h3>
              <p className="about-description">{pg.description}</p>
            </div>
          )}

          {(pg.securityDeposit || pg.lockInDays || pg.onboardingFee) && (
            <div className="about-card glass">
              <h3 className="about-heading">💰 Important Information</h3>
              <div className="policy-grid">
                {pg.securityDeposit && (
                  <div className="policy-item">
                    <span className="policy-label">Security Deposit</span>
                    <strong>₹{Number(pg.securityDeposit).toLocaleString('en-IN')}</strong>
                    <span className="policy-note">Equivalent to one month's rent</span>
                  </div>
                )}
                {pg.onboardingFee && (
                  <div className="policy-item">
                    <span className="policy-label">Onboarding Fee</span>
                    <strong>₹{Number(pg.onboardingFee).toLocaleString('en-IN')}</strong>
                    <span className="policy-note">Includes agreement &amp; police verification</span>
                  </div>
                )}
                {pg.lockInDays && (
                  <div className="policy-item">
                    <span className="policy-label">Lock-in Period</span>
                    <strong>{pg.lockInDays} Days</strong>
                    <span className="policy-note">Minimum stay commitment</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {pg.rules && pg.rules.length > 0 && (
            <div className="about-card glass">
              <h3 className="about-heading">🏠 House Rules &amp; Policies</h3>
              <ul className="rules-list">
                {pg.rules.map((rule, i) => (
                  <li key={i} className="rule-item">
                    <span className="rule-dot">•</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}

      {/* ─── Floor Plan ─── */}
      <div className="floor-plan">
        <h2>Live Floor Plan</h2>
        {pg.floors.length === 0 ? (
          <p className="text-muted">No floors added by the owner yet.</p>
        ) : (
          pg.floors.map(floor => (
            <div key={floor.id} className="floor-card">
              <h3>Floor {floor.floorNumber}</h3>
              <div className="beds-grid">
                {floor.beds.length === 0 ? (
                  <p className="text-muted">No beds on this floor.</p>
                ) : (
                  floor.beds.map(bed => {
                    const activeBooking = bed.bookings && bed.bookings.length > 0 ? bed.bookings[0] : null;
                    return (
                      <div
                        key={bed.id}
                        className={`bed-item ${bed.status === 'OCCUPIED' ? 'occupied' : 'empty'}`}
                      >
                        {(!bed.photos || bed.photos.length === 0) && <div className="bed-icon">🛏️</div>}
                        
                        {bed.photos && bed.photos.length > 0 && (
                          <div className="pg-bed-photos-preview">
                            <img src={getImageUrl(bed.photos[0])} alt="Bed" />
                          </div>
                        )}

                        <div className="bed-info">
                          <strong>{bed.identifier}</strong>
                          <span>₹{Math.round(pg.rentMonthly * bed.priceMultiplier)}</span>
                          {bed.status === 'OCCUPIED' && activeBooking && (
                            <div className="occupant-details">
                              <span className="occupant-name">Booked by: {activeBooking.user?.name}</span>
                              {viewerLifestyle && activeBooking.user?.lifestyle && (
                                <div className="compatibility-badge fade-in">
                                   <Sparkles size={12} fill="var(--primary)" />
                                   <span>{calculateCompatibility(activeBooking.user.lifestyle)}% Match</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {user?.role !== 'ADMIN' && (
                          <button
                            className="btn-primary book-btn"
                            disabled={bed.status === 'OCCUPIED'}
                            onClick={() => openBookingModal(bed)}
                          >
                            {bed.status === 'OCCUPIED' ? 'Booked' : 'Book Now'}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Reviews Section ─── */}
      <div className="reviews-section">
        <div className="reviews-header">
          <h2><Star size={24} color="#FFB300" fill="#FFB300" /> Reviews & Ratings</h2>
        </div>

        {/* ─── AI Review Insights ─── */}
        {reviewInsights?.hasInsights && (
          <div className="ai-insights-card glass fade-in">
             <div className="insights-header">
                <Sparkles size={20} color="var(--primary)" />
                <span>AI Resident Sentiment Analysis</span>
                <div className="sentiment-score-badge" title="Overall Satisfaction Score">
                   {Math.round(reviewInsights.sentiment_score * 100)}%
                </div>
             </div>
             
             <div className="insights-grid">
                <div className="insight-column pros">
                   <div className="column-label">What residents love</div>
                   <div className="insight-pills">
                      {reviewInsights.pros.map((p, i) => (
                        <div key={i} className="insight-pill pro">
                           <CheckCircle size={14} /> {p}
                        </div>
                      ))}
                   </div>
                </div>
                <div className="insight-column cons">
                   <div className="column-label">Areas for improvement</div>
                   <div className="insight-pills">
                      {reviewInsights.cons.map((c, i) => (
                        <div key={i} className="insight-pill con">
                           <AlertCircle size={14} /> {c}
                        </div>
                      ))}
                   </div>
                </div>
             </div>
             <p className="insights-disclaimer">
                * Summarized from {pg.reviews?.length} verified resident reviews.
             </p>
          </div>
        )}

        {user?.role === 'STUDENT' && canReview && (
          <div className="review-form-card fade-in">
            <h3>Leave a review</h3>
            {reviewError && <div className="form-error">{reviewError}</div>}
            <form onSubmit={handleReviewSubmit}>
              <div className="star-rating-select">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setReviewStar(s)} className="star-btn">
                    <Star size={24} color={s <= reviewStar ? '#FFB300' : '#E0E0E0'} fill={s <= reviewStar ? '#FFB300' : 'none'} />
                  </button>
                ))}
              </div>
              <textarea 
                placeholder="Share your experience staying here..." 
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary" disabled={reviewLoading}>
                {reviewLoading ? 'Submitting...' : 'Post Review'}
              </button>
            </form>
          </div>
        )}

        <div className="reviews-list">
          {!pg.reviews || pg.reviews.length === 0 ? (
            <p className="text-muted">No reviews yet for this PG.</p>
          ) : (
            pg.reviews.map(rev => (
              <div key={rev.id} className="review-card">
                <div className="reviewer-info">
                  <div className="reviewer-avatar">👤</div>
                  <div>
                    <strong>{rev.user?.name}</strong>
                    <div className="review-stars-display">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14} color={s <= rev.rating ? '#FFB300' : '#E0E0E0'} fill={s <= rev.rating ? '#FFB300' : 'none'} />
                      ))}
                    </div>
                  </div>
                  <div className="verified-badge-pill">
                     <CheckCircle size={12} />
                     Verified Resident
                  </div>
                </div>
                <p className="review-text-content">{rev.text}</p>
                <span className="review-date">{new Date(rev.createdAt).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Booking Modal ─── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !bookingSuccessData && setShowModal(false)}>
          <div className="modal-content fade-in" onClick={e => e.stopPropagation()}>
            {!bookingSuccessData ? (
              <>
                <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                <h2>Complete Your Booking</h2>
                <p className="text-muted">Details for {pg.name} - {selectedBed?.identifier}</p>

                {bookingError && <div className="form-error">{bookingError}</div>}

                <form onSubmit={submitBooking} className="kyc-form">
                  <div className="input-group">
                    <label>Name on Agreement <span style={{fontSize:'0.72rem', color:'var(--text-muted)', fontWeight: 400}}>(can differ from your profile)</span></label>
                    <input 
                      type="text" 
                      value={occupantName} 
                      onChange={e => setOccupantName(e.target.value)} 
                      placeholder="Enter name as it should appear on the agreement" 
                      required 
                    />
                    <p style={{fontSize:'0.72rem', color:'var(--text-muted)', margin:'4px 0 0', display:'flex', alignItems:'center', gap:'5px'}}>
                      🔒 Your profile name stays unchanged.
                    </p>
                  </div>
                  
                  <div className="input-group">
                    <label><ShieldCheck size={16} /> Aadhar Number</label>
                    <input 
                      type="text" 
                      placeholder="12-digit Aadhar Number" 
                      value={aadharNumber} 
                      onChange={e => setAadharNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      required 
                    />
                  </div>

                  <div className="input-group">
                    <label><Camera size={16} /> Passport Size Photo</label>
                    <div 
                      className={`photo-upload-box ${previewUrl ? 'has-preview' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {previewUrl ? (
                         <img src={previewUrl} alt="Passport Preview" className="passport-preview" />
                      ) : (
                        <div className="upload-prompt">
                          <Camera size={24} />
                          <span>Click to browse</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary full-width-btn" disabled={bookingLoading}>
                    {bookingLoading ? 'Processing...' : `Confirm & Pay ₹${Math.round(pg.rentMonthly * selectedBed?.priceMultiplier)}`}
                  </button>
                </form>
              </>
            ) : (
              <div className="booking-success-view fade-in">
                <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
                <div className="success-icon-wrap">
                  <CheckCircle size={48} color="#4CAF50" />
                </div>
                <h2>Booking Confirmed!</h2>
                <p className="text-muted">Your bed ({selectedBed?.identifier}) is now reserved.</p>

                <div className="qr-box">
                  <img src={bookingSuccessData.qrCodeUrl} alt="Check-in QR Code" />
                  <span>Show this to the PG Owner for check-in</span>
                </div>

                <a 
                  href={`${API_BASE_URL}/api/advanced/booking/${bookingSuccessData.bookingId}/agreement?token=${token}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-primary download-btn"
                >
                  <Download size={18} /> Download Rental Agreement (PDF)
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {showChat && user && (
        <ChatWidget 
          pgId={pg.id} 
          ownerId={pg.ownerId} 
          ownerName={pg.owner?.name || 'Owner'} 
          pgName={pg.name}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
};

export default PgDetail;
