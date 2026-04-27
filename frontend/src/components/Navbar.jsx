import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, LogIn, LogOut, UserPlus, FileText, User, ShieldAlert, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useChatSocket } from '../hooks/useChatSocket';
import { API_BASE_URL } from '../config';
import { getImageUrl } from '../utils/imageHelper';
import './Navbar.css';

const Navbar = () => {
  const { user, token, logout } = useAuth();
  const { socket } = useChatSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user && token) {
      fetchUnreadCount();
    }
  }, [user, token]);

  useEffect(() => {
    if (!socket || location.pathname === '/messages') return;

    const handleNewMessage = () => {
      setUnreadCount(prev => prev + 1);
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [socket, location.pathname]);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUnreadCount(data.count);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar glass">
      <div className="container nav-content">
        <Link to="/" className="nav-brand">
          <Home className="nav-logo" size={28} />
          <h2>MC Stays</h2>
        </Link>
        <div className="nav-links">
          <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
            <Home size={18} />
            <span>Home</span>
          </Link>
          {user?.role !== 'ADMIN' && (
            <Link to="/search" className={`nav-item ${location.pathname === '/search' ? 'active' : ''}`}>
              <Search size={18} />
              <span>Search</span>
            </Link>
          )}
          {user ? (
            <>
              {user.role !== 'ADMIN' && (
                <Link 
                  to="/messages" 
                  className="nav-item nav-messages"
                  onClick={() => setUnreadCount(0)}
                >
                  <div className="icon-wrapper">
                    <MessageSquare size={18} />
                    {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
                  </div>
                  <span>Messages</span>
                </Link>
              )}
              {user.role === 'OWNER' && (
                <Link to="/manage" className="nav-item">
                  <FileText size={18} />
                  <span>Manage PGs</span>
                </Link>
              )}
              {user.role === 'STUDENT' && (
                <Link to="/profile" className="nav-item">
                  {user.profileImage ? (
                    <img 
                      src={getImageUrl(user.profileImage)} 
                      alt="Me" 
                      className="nav-avatar-img"
                    />
                  ) : (
                    <User size={18} />
                  )}
                  <span>Profile</span>
                </Link>
              )}
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="nav-item admin-link">
                  <ShieldAlert size={18} />
                  <span>Admin Console</span>
                </Link>
              )}
              <span className="welcome-text">Hi, {user.name || user.role}</span>
              <button onClick={handleLogout} className="btn-secondary nav-item">
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-item">
                <LogIn size={18} />
                <span>Login</span>
              </Link>
              <Link to="/register" className="btn-primary nav-item">
                <UserPlus size={18} />
                <span>Sign Up</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
