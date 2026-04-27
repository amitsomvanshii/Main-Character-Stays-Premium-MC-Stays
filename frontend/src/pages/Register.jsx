import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GraduationCap, Building2, User, Mail, Lock, Sparkles, ShieldCheck } from 'lucide-react';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT'
  });
  const [error, setError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');

      setIsVerifying(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');

      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass">
        <div className="badge glass" style={{ display: 'inline-flex', marginBottom: '20px', padding: '10px 18px', borderRadius: '40px', gap: '8px', color: 'var(--primary)', background: 'var(--accent)', fontWeight: '700', fontSize: '0.85rem' }}>
          <Sparkles size={16} /> FIRST STEP TO FREEDOM
        </div>
        <h2>Create Account</h2>
        <p className="text-muted">Join a community of thousands searching for the perfect stay.</p>

        {formData.email.toLowerCase() === 'amitsomvanshi63@gmail.com' && (
          <div className="admin-detect-badge glass-dark fade-in">
             <ShieldCheck size={20} className="text-primary" />
             <div>
                <strong>Root Admin Detected</strong>
                <p>Registering this account will grant absolute platform control.</p>
             </div>
          </div>
        )}

        {/* ─── Role Selector ─── */}
        {!isVerifying && (
          <div className="role-selector">
            <div
              className={`role-option ${formData.role === 'STUDENT' ? 'role-active' : ''}`}
              onClick={() => setFormData({ ...formData, role: 'STUDENT' })}
            >
              <div className="role-icon-wrap" style={{ color: formData.role === 'STUDENT' ? 'var(--primary)' : '#94A3B8' }}>
                <GraduationCap size={32} />
              </div>
              <strong>Student</strong>
              <span>Booking a bed</span>
            </div>
            <div
              className={`role-option ${formData.role === 'OWNER' ? 'role-active' : ''}`}
              onClick={() => setFormData({ ...formData, role: 'OWNER' })}
            >
              <div className="role-icon-wrap" style={{ color: formData.role === 'OWNER' ? 'var(--secondary)' : '#94A3B8' }}>
                <Building2 size={32} />
              </div>
              <strong>Owner</strong>
              <span>Listing my PG</span>
            </div>
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}

        {!isVerifying ? (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="input-group">
              <label><User size={16} /> Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="input-group">
              <label><Mail size={16} /> Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="youremail@example.com"
                required
              />
            </div>
            <div className="input-group">
              <label><Lock size={16} /> Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="btn-primary auth-submit">
              {formData.email.toLowerCase() === 'amitsomvanshi63@gmail.com' ? 'Register As Root Admin' : `Get Started as ${formData.role === 'OWNER' ? 'Owner' : 'Student'}`}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="auth-form fade-in">
            <div className="otp-notice">
              <ShieldCheck size={24} color="var(--primary)" style={{ marginBottom: '12px' }} />
              <div>
                We've sent a 6-digit verification code to <strong>{formData.email}</strong>. 
              </div>
            </div>
            <div className="input-group">
              <label>Enter 6-Digit OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))}
                placeholder="000 000"
                required
                style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.8rem', fontWeight: '800' }}
              />
            </div>

            <button type="submit" className="btn-primary auth-submit">
              Verify & Complete Signup
            </button>
            
            <button 
              type="button" 
              className="btn-secondary text-btn" 
              style={{ marginTop: '16px', fontSize: '0.85rem' }}
              onClick={() => setIsVerifying(false)}
            >
              ← Back to Details
            </button>
          </form>
        )}

        <p className="auth-footer">
          Already a member? <Link to="/login">Log in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
