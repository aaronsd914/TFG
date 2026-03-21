import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  isDark: false,
  setIsDark: () => {},
  palette: 'warm',
  setPalette: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('fg-theme') === 'dark'
  );
  const [palette, setPalette] = useState(
    () => localStorage.getItem('fg-palette') || 'warm'
  );

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) html.classList.add('dark');
    else html.classList.remove('dark');
    localStorage.setItem('fg-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette);
    localStorage.setItem('fg-palette', palette);
  }, [palette]);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark, palette, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
