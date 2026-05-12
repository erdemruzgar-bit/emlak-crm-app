"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface ThemeState {
  backgroundUrl: string | null; // null = varsayılan (düz renk)
  overlayOpacity: number; // 0-100 arka planı bulanıklaştırma
  darkMode: boolean;
}

const STORAGE_KEY = "emlak-crm-theme";

const defaultTheme: ThemeState = {
  backgroundUrl: null,
  overlayOpacity: 85,
  darkMode: false,
};

interface ThemeContextValue extends ThemeState {
  setBackgroundUrl: (url: string | null) => void;
  setOverlayOpacity: (n: number) => void;
  setDarkMode: (v: boolean) => void;
  toggleDarkMode: () => void;
  reset: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeState>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setTheme({ ...defaultTheme, ...JSON.parse(stored) });
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(theme)); } catch { /* ignore */ }
  }, [theme, mounted]);

  // Dark mode class'ı document.documentElement'e uygulanır.
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme.darkMode);
  }, [theme.darkMode, mounted]);

  const setBackgroundUrl = useCallback((url: string | null) => {
    setTheme((prev) => ({ ...prev, backgroundUrl: url }));
  }, []);

  const setOverlayOpacity = useCallback((n: number) => {
    setTheme((prev) => ({ ...prev, overlayOpacity: Math.max(0, Math.min(100, n)) }));
  }, []);

  const setDarkMode = useCallback((v: boolean) => {
    setTheme((prev) => ({ ...prev, darkMode: v }));
  }, []);

  const toggleDarkMode = useCallback(() => {
    setTheme((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const reset = useCallback(() => setTheme(defaultTheme), []);

  return (
    <ThemeContext.Provider value={{ ...theme, setBackgroundUrl, setOverlayOpacity, setDarkMode, toggleDarkMode, reset }}>
      {/* Arka plan katmanı — sayfaların arkasında, z-index -10 */}
      {mounted && theme.backgroundUrl && (
        <>
          <div
            aria-hidden
            className="fixed inset-0 -z-20 bg-center bg-cover bg-no-repeat transition-[background-image] duration-500"
            style={{ backgroundImage: `url("${theme.backgroundUrl}")` }}
          />
          <div
            aria-hidden
            className="fixed inset-0 -z-10 bg-background transition-opacity duration-300"
            style={{ opacity: theme.overlayOpacity / 100 }}
          />
        </>
      )}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
