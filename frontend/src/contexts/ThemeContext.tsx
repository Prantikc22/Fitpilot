import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Light theme colors (existing)
const lightColors = {
  bg: "#FAFAFA",
  bgAlt: "#FFFFFF",
  bgWarm: "#F2F0ED",
  text: "#1A1A1A",
  textMute: "#595959",
  textDim: "#A6A6A6",
  textInv: "#FFFFFF",
  brand: "#2B4C3B",
  brandLight: "#E9EFEA",
  brandSoft: "#859C8A",
  terracotta: "#C0604A",
  sand: "#E6DCCC",
  success: "#3A7D44",
  warning: "#E5A93B",
  error: "#D14949",
  info: "#4A708B",
  border: "#EBEBEB",
};

// Dark theme colors (carefully designed for premium feel)
const darkColors = {
  bg: "#121212",
  bgAlt: "#1E1E1E",
  bgWarm: "#252320",
  text: "#EDEDED",
  textMute: "#A8A8A8",
  textDim: "#6B6B6B",
  textInv: "#121212",
  brand: "#5FB67A",
  brandLight: "#1F2D23",
  brandSoft: "#3E5243",
  terracotta: "#E58271",
  sand: "#4A443A",
  success: "#5FD068",
  warning: "#FFCC5C",
  error: "#FF6B6B",
  info: "#7EB1D1",
  border: "#333333",
};

export type ThemeMode = "light" | "dark" | "system";
export type ColorTheme = typeof lightColors;

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: ColorTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@leanly_theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [loaded, setLoaded] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved === "light" || saved === "dark" || saved === "system")) {
          setModeState(saved as ThemeMode);
        }
      } catch (e) {
        console.log("Failed to load theme preference:", e);
      } finally {
        setLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.log("Failed to save theme preference:", e);
    }
  };

  // Determine if dark mode should be active
  const isDark =
    mode === "dark" || (mode === "system" && systemScheme === "dark");

  // Get colors based on current theme
  const colors = isDark ? darkColors : lightColors;

  // Don't render children until theme is loaded to avoid flash
  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Export color constants for components that can't use context
export { lightColors, darkColors };
