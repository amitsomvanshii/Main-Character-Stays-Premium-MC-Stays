import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config';
import { LogIn, Mail, Lock } from 'lucide-react';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      login(data.token, data.user);
      if (data.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass">
        <div className="badge glass" style={{ display: 'inline-flex', marginBottom: '20px', padding: '10px 18px', borderRadius: '40px', gap: '8px', color: 'var(--primary)', background: 'var(--accent)', fontWeight: '700', fontSize: '0.85rem' }}>
          <LogIn size={16} /> SECURE ACCESS
        </div>
        <h2>Welcome Back</h2>
        <p className="text-muted">Enter your credentials to access your smart dashboard.</p>
        
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="input-group">
            <label><Mail size={16} /> Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="name@email.com" 
              required 
            />
          </div>
          <div className="input-group">
            <label><Lock size={16} /> Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              required 
            />
          </div>
          <button type="submit" className="btn-primary auth-submit">Sign In to Account</button>
        </form>

        <p className="auth-footer">
          New to Smart PG Finder? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
