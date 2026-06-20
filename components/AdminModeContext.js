'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AdminModeContext = createContext();

export function AdminModeProvider({ children }) {
  const [isDesktopMode, setIsDesktopMode] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin-desktop-mode');
      if (saved === 'true') {
        setIsDesktopMode(true);
      }
    } catch (e) {}
  }, []);

  const toggleDesktopMode = () => {
    setIsDesktopMode(prev => {
      const next = !prev;
      try {
        localStorage.setItem('admin-desktop-mode', String(next));
      } catch (e) {}
      return next;
    });
  };

  return (
    <AdminModeContext.Provider value={{ isDesktopMode, toggleDesktopMode }}>
      {children}
    </AdminModeContext.Provider>
  );
}

export function useAdminMode() {
  return useContext(AdminModeContext);
}
