"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  ready: boolean;
  toggleTheme: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    try {
      window.localStorage.setItem("study-a-theme", "light");
    } catch {
      // Ignore private-mode storage.
    }
    queueMicrotask(() => setReady(true));
  }, []);

  const toggleTheme = useCallback(() => undefined, []);

  const value = useMemo(
    () => ({ theme: "light" as const, ready, toggleTheme }),
    [ready, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: "light" as const, ready: false, toggleTheme: () => undefined };
  }
  return ctx;
}
