import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Sparkles, Map, Shield, ChevronDown, ChevronUp,
  Clock, Phone, Send, Info, HelpCircle, Star,
  ExternalLink, CheckCircle2, Globe, MessageCircle, Camera, PlayCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import RecommendWidget from '../components/RecommendWidget';
import './Home.css';

const indiaStates = [
  { state: "Andhra Pradesh", cities: ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore"] },
  { state: "Arunachal Pradesh", cities: ["Itanagar"] },
  { state: "Assam", cities: ["Guwahati", "Dibrugarh", "Silchar"] },
  { state: "Bihar", cities: ["Patna", "Gaya", "Bhagalpur"] },
  { state: "Chhattisgarh", cities: ["Raipur", "Bhilai", "Bilaspur"] },
  { state: "Goa", cities: ["Panaji", "Margao"] },
  { state: "Gujarat", cities: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"] },
  { state: "Haryana", cities: ["Gurgaon", "Faridabad", "Ambala", "Panipat"] },
  { state: "Himachal Pradesh", cities: ["Shimla", "Dharamshala"] },
  { state: "Jharkhand", cities: ["Ranchi", "Jamshedpur", "Dhanbad"] },
  { state: "Karnataka", cities: ["Bangalore", "Mysore", "Hubli", "Mangalore"] },
  { state: "Kerala", cities: ["Kochi", "Trivandrum", "Kozhikode", "Thrissur"] },
  { state: "Madhya Pradesh", cities: ["Indore", "Bhopal", "Gwalior", "Jabalpur"] },
  { state: "Maharashtra", cities: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"] },
  { state: "Manipur", cities: ["Imphal"] },
  { state: "Meghalaya", cities: ["Shillong"] },
  { state: "Mizoram", cities: ["Aizawl"] },
  { state: "Nagaland", cities: ["Kohima", "Dimapur"] },
  { state: "Odisha", cities: ["Bhubaneswar", "Cuttack", "Rourkela"] },
  { state: "Punjab", cities: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"] },
  { state: "Rajasthan", cities: ["Jaipur", "Jodhpur", "Udaipur", "Kota"] },
  { state: "Sikkim", cities: ["Gangtok"] },
  { state: "Tamil Nadu", cities: ["Chennai", "Coimbatore", "Madurai", "Salem"] },
  { state: "Telangana", cities: ["Hyderabad", "Warangal", "Nizamabad"] },
  { state: "Tripura", cities: ["Agartala"] },
  { state: "Uttar Pradesh", cities: ["Noida", "Lucknow", "Kanpur", "Agra", "Ghaziabad"] },
  { state: "Uttarakhand", cities: ["Dehradun", "Haridwar", "Nainital"] },
  { state: "West Bengal", cities: ["Kolkata", "Howrah", "Durgapur", "Siliguri"] }
];

const itCities = [
  { name: "Bangalore", hubs: "650+ Hubs", img: "🏙️" },
  { name: "Hyderabad", hubs: "480+ Hubs", img: "🏛️" },
  { name: "Pune", hubs: "420+ Hubs", img: "🏞️" },
  { name: "Mumbai", hubs: "590+ Hubs", img: "🌊" },
  { name: "Chennai", hubs: "380+ Hubs", img: "🏖️" },
  { name: "Gurgaon", hubs: "310+ Hubs", img: "🏬" },
  { name: "Noida", hubs: "290+ Hubs", img: "🏗️" },
  { name: "Kolkata", hubs: "250+ Hubs", img: "🌉" },
  { name: "Ahmedabad", hubs: "180+ Hubs", img: "🕌" },
  { name: "Kochi", hubs: "140+ Hubs", img: "🌴" },
  { name: "Indore", hubs: "120+ Hubs", img: "🏟️" },
  { name: "Jaipur", hubs: "110+ Hubs", img: "🏰" },
  { name: "Lucknow", hubs: "95+ Hubs", img: "🚇" },
  { name: "Chandigarh", hubs: "80+ Hubs", img: "🏛️" },
  { name: "Coimbatore", hubs: "75+ Hubs", img: "⛰️" },
  { name: "Visakhapatnam", hubs: "70+ Hubs", img: "⚓" },
  { name: "Bhubaneswar", hubs: "65+ Hubs", img: "🛕" },
  { name: "Trivandrum", hubs: "60+ Hubs", img: "🛖" }
];

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = React.useState(null);
  const [tourMode, setTourMode] = React.useState('inperson');

  // Form State for All-India selection
  const [tourState, setTourState] = React.useState('');
  const [tourCity, setTourCity] = React.useState('');
  const [callState, setCallState] = React.useState('');
  const [callCity, setCallCity] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(null); // 'tour' or 'call'
  const [submitted, setSubmitted] = React.useState(null); // 'tour' or 'call'

  const handleLeadSubmit = async (e, type) => {
    e.preventDefault();
    setIsSubmitting(type);
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Add hierarchical data that might be handled via controlled selects
    const finalData = {
      ...data,
      type: type === 'tour' ? 'TOUR' : 'CALLBACK',
      state: type === 'tour' ? tourState : callState,
      city: type === 'tour' ? tourCity : callCity,
      mode: type === 'tour' ? tourMode : undefined
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/leads/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });
      if (res.ok) {
        setSubmitted(type);
      }
    } catch (err) {
      console.error('Lead Submission Error:', err);
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="home-container">
      {/* ─── Premium Hero Section ─── */}
      <div className="hero-wrapper">
        <div className="hero-bg-image"></div>
        <div className="hero-overlay"></div>

        <div className="hero-content fade-in">
          <div className="badge glass" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '40px', marginBottom: '24px', fontWeight: '600', fontSize: '0.9rem', color: '#6D28D9' }}>
            <Sparkles size={16} color="var(--primary)" /> AI-Powered VIBE Check Stays
          </div>
          <h1>Find Your Perfect PG, Smartly.</h1>
          <p className="subtitle">
            Join thousands of students and office professionals securing reliable accommodations with real-time tracking.
          </p>

          <div className="hero-search-container glass">
            <Search className="search-icon" size={50} color="rgba(165, 118, 118, 0.7)" />
            <input
              type="text"
              placeholder="Where are you looking to stay?"
              className="search-input"
              readOnly
              onClick={() => navigate('/search')}
            />
            <Link to="/search" className="btn-primary" style={{ padding: '12px 32px' }}>
              Search
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Features Overlap ─── */}
      <div className="container">
        <div className="features-grid">
          <div className="feature-card fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="feature-emoji">🤖</div>
            <h3>AI Recommendations</h3>
            <p className="text-muted">Smart matches that understand your lifestyle and budget perfectly.</p>
          </div>
          <div className="feature-card fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="feature-emoji">📡</div>
            <h3>Real-Time Tracking</h3>
            <p className="text-muted">See every available bed in real-time. Transparent and instant.</p>
          </div>
          <div className="feature-card fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="feature-emoji">🛡️</div>
            <h3>Verified Security</h3>
            <p className="text-muted">Fraud-detection models and digital agreements for your peace of mind.</p>
          </div>
        </div>
      </div>

      {/* ─── 18 IT Cities Gallery ─── */}
      <div className="container" style={{ marginTop: '80px', marginBottom: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800' }}>Major IT City Hubs</h2>
          <p className="text-muted">Explore premium stays across 18+ leading technology destinations in India.</p>
        </div>
        <div className="city-gallery-grid">
          {itCities.map((city, i) => (
            <div
              key={i}
              className="city-badge-card glass-dark fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => navigate(`/search?city=${city.name}`)}
            >
              <div className="city-emoji-bg">{city.img}</div>
              <div className="city-info">
                <h4>{city.name}</h4>
                <span>{city.hubs}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── AI Recommendation Section ─────────── */}
      <div className="recommend-section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '12px' }}>Personalized for You</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '600px', margin: '0 auto' }}>
              Our AI analyzes your preferences to suggest the best neighborhoods and PG facilities for your commute.
            </p>
          </div>
          <RecommendWidget />
        </div>
      </div>

      {/* ─── Marketing Forms Section ─────────── */}
      {user?.role !== 'ADMIN' && (
        <div className="container" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
          <div className="marketing-grid">
            {/* Schedule a Tour */}
            <div className="marketing-form-card glass-dark fade-in">
              <div className="section-header">
                <Clock className="header-icon" />
                <h2>Schedule a Tour</h2>
                <p>Visit your dream stay today</p>
              </div>
              {submitted === 'tour' ? (
                <div className="lead-success-msg glass fade-in">
                  <CheckCircle2 size={40} className="primary-color" />
                  <h3>Tour Scheduled!</h3>
                  <p>Our concierge will call you shortly to confirm the time.</p>
                  <button className="btn-secondary small-btn" onClick={() => setSubmitted(null)}>Back</button>
                </div>
              ) : (
                <form className="marketing-form" onSubmit={(e) => handleLeadSubmit(e, 'tour')}>
                  <input type="text" name="name" placeholder="Full Name *" required />
                  <input type="email" name="email" placeholder="Email Address" />
                  <input type="tel" name="phone" placeholder="Phone Number *" required />

                  <div className="geo-select-row">
                    <select name="state" value={tourState} onChange={(e) => { setTourState(e.target.value); setTourCity(''); }} required>
                      <option value="" disabled>Select State</option>
                      {indiaStates.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                    </select>
                    <select name="city" value={tourCity} onChange={(e) => setTourCity(e.target.value)} disabled={!tourState} required>
                      <option value="" disabled>{!tourState ? 'Select State First' : 'Select City'}</option>
                      {tourState && indiaStates.find(s => s.state === tourState)?.cities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="referral-group">
                    <input type="text" name="referral" placeholder="Referral code here" />
                    <button type="button">Apply</button>
                  </div>

                  <div className="multi-select-group">
                    <label>Mode of Visit *</label>
                    <div className="radio-btns">
                      <button type="button" className={tourMode === 'virtual' ? 'active' : ''} onClick={() => setTourMode('virtual')}>Virtual Visit</button>
                      <button type="button" className={tourMode === 'inperson' ? 'active' : ''} onClick={() => setTourMode('inperson')}>In-person Visit</button>
                    </div>
                  </div>

                  <div className="checkbox-row">
                    <input type="checkbox" id="tour-terms" required />
                    <label htmlFor="tour-terms">I agree to Terms & Conditions, Cookie Policy and Privacy Policy</label>
                  </div>

                  <button type="submit" className="btn-primary w-full" disabled={isSubmitting === 'tour'}>
                    {isSubmitting === 'tour' ? 'Registering...' : 'Submit Tour Request'}
                  </button>
                </form>
              )}
            </div>

            {/* Request a Callback */}
            <div className="marketing-form-card glass-dark fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="section-header">
                <Phone className="header-icon" />
                <h2>Request a callback</h2>
                <p>We'll call you back within 24 hours</p>
              </div>
              {submitted === 'call' ? (
                <div className="lead-success-msg glass fade-in">
                  <Phone className="primary-color" size={40} />
                  <h3>Request Logged!</h3>
                  <p>Our advisor will contact you on WhatsApp/Phone shortly.</p>
                  <button className="btn-secondary small-btn" onClick={() => setSubmitted(null)}>Back</button>
                </div>
              ) : (
                <form className="marketing-form" onSubmit={(e) => handleLeadSubmit(e, 'call')}>
                  <input type="text" name="name" placeholder="Name *" required />
                  <input type="email" name="email" placeholder="Email Address" />
                  <input type="tel" name="phone" placeholder="Whatsapp Number *" required />

                  <div className="geo-select-row">
                    <select name="state" value={callState} onChange={(e) => { setCallState(e.target.value); setCallCity(''); }} required>
                      <option value="" disabled>Select State</option>
                      {indiaStates.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
                    </select>
                    <select name="city" value={callCity} onChange={(e) => setCallCity(e.target.value)} disabled={!callState} required>
                      <option value="" disabled>{!callState ? 'Select State First' : 'Select City'}</option>
                      {callState && indiaStates.find(s => s.state === callState)?.cities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <select name="budget" defaultValue="" required>
                    <option value="" disabled>Budget (Price per bed/month) *</option>
                    <option value="₹2K">₹2K</option>
                    <option value="₹4K-₹5K">₹4K-₹5K</option>
                    <option value="₹5K-₹6K">₹5K-₹6K</option>
                    <option value="₹6K-₹7K">₹6K-₹7K</option>
                    <option value="₹7K-₹8K">₹7K-₹8K</option>
                    <option value="₹8K-₹9K">₹8K-₹9K</option>
                    <option value="₹9K-₹10K">₹9K-₹10K</option>
                    <option value="₹10K+">₹10K+</option>
                  </select>

                  <div className="checkbox-row">
                    <input type="checkbox" id="call-terms" required />
                    <label htmlFor="call-terms">I agree to Terms & Conditions, Cookie Policy and Privacy Policy</label>
                  </div>

                  <button type="submit" className="btn-primary w-full" disabled={isSubmitting === 'call'}>
                    {isSubmitting === 'call' ? 'Submitting...' : 'Submit Details'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── FAQ Section ─────────── */}
      <div className="container" style={{ marginTop: '100px', marginBottom: '100px' }}>
        <div className="faq-header text-center">
          <HelpCircle size={40} color="var(--primary)" style={{ marginBottom: '16px' }} />
          <h2>Freqently Asked Questions</h2>
          <p className="text-muted">Everything you need to know about your future stay</p>
        </div>
        <div className="faq-grid mt-5">
          {[
            { q: "What documents are required for booking?", a: "You need a valid Aadhar Card and a Passport-sized photo. For working professionals, an office ID might be requested." },
            { q: "Is the security deposit refundable?", a: "Yes, the security deposit is fully refundable at the end of your stay, subject to our checkout policy and any property damages." },
            { q: "What facilities are inlcuded in the rent?", a: "Our premium stays include high-speed WiFi, 3 meals a day, housekeeping, laundry service, and 24/7 power backup." },
            { q: "Are there any hidden charges?", a: "No. We believe in 100% transparency. Rent and security deposit are the only major costs. Onboarding fee is one-time." },
            { q: "Can I schedule a physical tour?", a: "Absolutely! You can use our 'Schedule a Tour' form above to book an in-person visit at your convenience." },
            { q: "Is there a lock-in period?", a: "Usually, our properties have a 3-month lock-in period. You can check specific details on the property page." },
            { q: "What is the guest policy?", a: "Day visitors are allowed in common areas until 9:00 PM. Periodic overnight stays depend on property specific rules." },
            { q: "How do I pay my monthly rent?", a: "You can pay directly via our Student Dashboard using UPI or Bank Transfer, and get instant digital receipts." },
            { q: "Are the properties safe for females?", a: "Safety is our priority. All properties have CCTV surveillance, biometric access, and 24/7 security personnel." },
            { q: "Is there a parking facility?", a: "Yes, most of our luxury stays provide dedicated space for two-wheelers. Four-wheeler parking is subject to availability." },
          ].map((faq, i) => (
            <div key={i} className={`faq-item glass ${activeFaq === i ? 'active' : ''}`} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
              <div className="faq-question">
                <h3>{faq.q}</h3>
                {activeFaq === i ? <ChevronUp /> : <ChevronDown />}
              </div>
              <div className="faq-answer">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Testimonials Section ─────────── */}
      <div className="testimonials-section">
        <div className="container">
          <div className="section-header text-center">
            <span style={{ color: '#DB2777', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.85rem' }}>Community Voices</span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'white', marginTop: '10px' }}>Real Resident Stories</h2>
            <p className="text-muted" style={{ maxWidth: '600px', margin: '10px auto' }}>Join 10,000+ professionals and students who found their perfect stay with us.</p>
          </div>

          <div className="testimonial-grid">
            {[
              { name: "Amit Singh", role: "Student, Pimpri Chinchwad University", date: "MAR 12, 2026", text: "The AI recommendation engine is a game changer. It suggested a PG in Indiranagar that fit my vibe perfectly. The smart home integration is just the cherry on top!", rating: 5 },
              { name: "Priya Sharma", role: "Graduate Student, PU", date: "JAN 28, 2026", text: "Safety was my top priority. With biometric access and 24/7 concierge, I feel incredibly secure. The 'Vibe Check' really helps you find like-minded flatmates.", rating: 5 },
              { name: "Rahul Verma", role: "Sr. Data Analyst, ZS", date: "FEB 15, 2026", text: "The co-working lounges are better than most corporate offices! High-speed internet and free coffee made my 'Work from Home' days extremely productive.", rating: 5 },
              { name: "Anjali Gupta", role: "UX Designer, Freelance", date: "APR 05, 2026", text: "I love the community events! From rooftop movie nights to Sunday brunches, there's always something happening. It never feels lonely at M C Stays.", rating: 4 },
              { name: "Vikram Mehta", role: "Management Consultant", date: "MAY 20, 2026", text: "Transparent pricing and zero hidden costs. The digital onboarding was seamless—I moved in just 2 hours after booking. Truly a premium experience.", rating: 5 },
              { name: "Sneha Reddy", role: "Research Scholar", date: "JUN 10, 2026", text: "The balance between privacy and social life is perfect. The 'silent zones' are great for my research work, while the gym keeps me active. 10/10!", rating: 5 }
            ].map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="testimonial-date">{t.date}</div>
                <div className="rating-stars">
                  {[...Array(t.rating)].map((_, j) => <Star key={j} size={16} fill="currentColor" />)}
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-user">
                  <div className="user-avatar">{t.name[0]}</div>
                  <div className="user-info">
                    <h4>{t.name}</h4>
                    <p>{t.role}</p>
                    <div className="verified-badge">
                      <HelpCircle size={10} fill="currentColor" /> Verified Resident
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Footer Section ─────────── */}
    </div>
  );
};

export default Home;
