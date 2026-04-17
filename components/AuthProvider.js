'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext({
  user: null,
  coach: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children, initialSession }) {
  const [user, setUser] = useState(initialSession);
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(!initialSession);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        setUser(data.profile);
        setCoach(data.coach);
      } else {
        setUser(null);
        setCoach(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If we have an initial session (server side), we still refresh once to get full profile
    refresh();
  }, [refresh]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setCoach(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, coach, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
