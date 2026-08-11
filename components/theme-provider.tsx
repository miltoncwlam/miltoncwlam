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

function detectTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("study-a-theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const fromDom = document.documentElement.dataset.theme;
      const initial =
        fromDom === "dark" || fromDom === "light" ? fromDom : detectTheme();
      setTheme(initial);
      setReady(true);
      document.documentElement.dataset.theme = initial;
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("study-a-theme", theme);
  }, [theme, ready]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({ theme, ready, toggleTheme }),
    [theme, ready, toggleTheme],
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
