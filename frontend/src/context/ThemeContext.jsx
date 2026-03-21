import { createContext, useContext, useEffect, useMemo, useState } from 'react';

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
    document.documentElement.dataset.palette = palette;
    localStorage.setItem('fg-palette', palette);
  }, [palette]);

  const contextValue = useMemo(
    () => ({ isDark, setIsDark, palette, setPalette }),
    [isDark, setIsDark, palette, setPalette],
  );
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext);
}
