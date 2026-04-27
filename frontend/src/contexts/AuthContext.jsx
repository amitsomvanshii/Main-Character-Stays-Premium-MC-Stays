import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // We could parse JWT here to extract user details like ID or role, 
      // or fetch from an /api/auth/me if that existed.
      // For now, let's decode the JWT locally to get basic info.
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ 
          id: payload.id, 
          role: payload.role, 
          name: payload.name,
          profileImage: payload.profileImage || null 
        });
      } catch (e) {
        console.error("Invalid token parsing");
        logout();
      }
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const login = (newToken, userData) => {
    setToken(newToken);
    if(userData) setUser(userData);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
