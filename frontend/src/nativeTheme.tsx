import React, { createContext, useContext, useMemo, useState } from 'react';

const lightColors = {
  bg: '#ffffff',
  bg2: '#dbdbdb',
  bg3: '#ffffff',
  panel: '#ffffff',
  panel2: '#f8fafc',
  headerAxisBG: '#f4f4f4',
  text: '#111827',
  text2: '#ffffff',
  text3: '#ffffff',
  text4: '#ffffff',
  taskText: '#05070b',
  muted: '#6b7280',
  border: 'rgba(17, 24, 39, 0.35)',
  border2: '#ffffff',
  border3: '#000000',
  topBtn: '#ffffff',
  topBtn2: '#90b1ffe2',
  topBtn3: '#181818',
  bottomBtn: '#181818',
  bottomBtn2: '#f8fafc',

  // Opaque equivalent of `border` composited over `panel` (#ffffff).
  // Use this where two lines must stack without darkening.
  borderSolid: '#ACAEB3',
  accent: '#6aa6ff',
  error: '#ff6b6b',
  errorDark: '#d63031',
  success: '#51cf66',
};

const darkColors = {
  bg: '#0F1115',
  bg2: '#3a3a3a',
  bg3: '#3a3a3a',
  panel: '#171A21',
  panel2: '#20242D',
  headerAxisBG: '#171A21',
  text: '#ffffff',
  text2: '#000000',
  text3: '#a3a3a3',
  text4: '#ffffff',
  taskText: '#05070b',
  muted: '#A1A1AA',
  border: 'rgba(255,255,255,0.12)',
  border2: '#000000',
  border3: '#ffffff',
  topBtn: '#20242D',
  topBtn2: '#334155',
  topBtn3: '#3a3a3a',
  bottomBtn: '#3a3a3a',
  bottomBtn2: '#20242D',

  borderSolid: '#2A2F3A',
  accent: '#60A5FA',
  error: '#F87171',
  errorDark: '#F87171',
  success: '#4ADE80',
};

export type AppColors = typeof lightColors;

type ThemeContextType = {
  isDark: boolean;
  setIsDark: (value: boolean) => void;
  colors: AppColors;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const value = useMemo(
    () => ({
      isDark,
      setIsDark,
      colors: isDark ? darkColors : lightColors,
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return ctx;
}

export const colors = lightColors;

export const sizes = {
  topbarH: 50,
  railW: 60,
  bottombarH: 72,
  hourColW: 88,
  dayColW: 120,
  hourRowH: 60,
  dayAxisH: 44,
};
