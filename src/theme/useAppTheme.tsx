import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { AppTheme, getStoredAppTheme, setStoredAppTheme, applyAppTheme, subscribeSystemTheme } from './appTheme';

type Ctx = { 
  theme: AppTheme; 
  setTheme: (t: AppTheme) => void; 
  toggleTheme: () => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => getStoredAppTheme());

  useEffect(() => {
    applyAppTheme(theme);
    if (theme !== 'system') return;
    const unsub = subscribeSystemTheme(() => applyAppTheme('system'));
    return unsub;
  }, [theme]);

  const api = useMemo<Ctx>(() => ({
    theme,
    setTheme: (t) => { 
      setStoredAppTheme(t); 
      setThemeState(t); 
    },
    toggleTheme: () => {
      const next = theme === 'dark' ? 'light' : 'dark';
      setStoredAppTheme(next);
      setThemeState(next);
    },
  }), [theme]);

  return <ThemeCtx.Provider value={api}>{children}</ThemeCtx.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useAppTheme must be used within AppThemeProvider');
  return ctx;
}
