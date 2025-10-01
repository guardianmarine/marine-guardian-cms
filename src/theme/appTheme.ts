// Global app theme utilities
export type AppTheme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'gm:appTheme';

export function getStoredAppTheme(): AppTheme {
  const v = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
  return v ?? 'system';
}

export function setStoredAppTheme(t: AppTheme) {
  localStorage.setItem(STORAGE_KEY, t);
}

export function applyAppTheme(t: AppTheme) {
  const root = document.documentElement;
  const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const enableDark = t === 'dark' || (t === 'system' && isSystemDark);

  root.classList.toggle('dark', enableDark);

  // Set background variables
  if (enableDark) {
    root.style.setProperty('--app-bg', '#00163b');
    root.style.setProperty('--app-surface', '#052055');
  } else {
    root.style.setProperty('--app-bg', '#ffffff');
    root.style.setProperty('--app-surface', '#ffffff');
  }
}

export function subscribeSystemTheme(onChange: () => void) {
  const m = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => onChange();
  m.addEventListener?.('change', handler);
  return () => m.removeEventListener?.('change', handler);
}
