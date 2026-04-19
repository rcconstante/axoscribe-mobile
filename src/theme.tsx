import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

export const lightColors = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceVariant: '#EAECEF',
  primary: '#000000',
  primaryForeground: '#FFFFFF',
  text: '#0A0A0A',
  textSecondary: '#555555',
  textMuted: '#8E8E93',
  border: '#E8EAED',
  tabBar: '#FFFFFF',
  tabBarInactive: '#8E8E93',
  statusBar: 'dark' as const,
  headerButton: '#EAECEF',
};

export const darkColors = {
  background: '#0C0C0E',
  surface: '#1C1C1E',
  surfaceVariant: '#2C2C2E',
  primary: '#FFFFFF',
  primaryForeground: '#000000',
  text: '#F2F2F7',
  textSecondary: '#AEAEB2',
  textMuted: '#636366',
  border: '#2C2C2E',
  tabBar: '#1C1C1E',
  tabBarInactive: '#636366',
  statusBar: 'light' as const,
  headerButton: '#2C2C2E',
};

export type Colors = Omit<typeof lightColors, 'statusBar'> & { statusBar: 'light' | 'dark' };
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  colors: Colors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: lightColors,
  isDark: false,
  mode: 'system',
  setMode: () => {},
  toggleDark: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  const isDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const toggleDark = () => setMode(isDark ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ colors, isDark, mode, setMode, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
