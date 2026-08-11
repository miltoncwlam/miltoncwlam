"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, ready, toggleTheme } = useTheme();
  const isDark = ready && theme === "dark";

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="theme-toggle"
      onClick={toggleTheme}
      suppressHydrationWarning
      type="button"
    >
      {ready ? (isDark ? "Light" : "Dark") : "Theme"}
    </button>
  );
}
