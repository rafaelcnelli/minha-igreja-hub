import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  highContrast: boolean;
  toggleHighContrast: () => void;
  setHighContrast: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('theme') || localStorage.getItem('hub_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // localStorage may fail in restricted environments
    }
    return 'light';
  });

  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('high_contrast') || localStorage.getItem('hub_high_contrast');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }

    try {
      localStorage.setItem('theme', theme);
      localStorage.setItem('hub_theme', theme);
    } catch (e) {
      console.warn('Erro ao salvar tema no localStorage:', e);
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('high-contrast');
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.classList.remove('high-contrast');
      root.removeAttribute('data-high-contrast');
    }

    try {
      localStorage.setItem('high_contrast', String(highContrast));
      localStorage.setItem('hub_high_contrast', String(highContrast));
    } catch (e) {
      console.warn('Erro ao salvar high_contrast no localStorage:', e);
    }
  }, [highContrast]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleHighContrast = () => {
    setHighContrastState(prev => !prev);
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        highContrast,
        toggleHighContrast,
        setHighContrast
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
