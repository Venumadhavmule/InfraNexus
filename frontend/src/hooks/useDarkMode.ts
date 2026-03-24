"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/uiStore";

export function useDarkMode() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return { theme, toggleTheme, isDark: theme === "dark" };
}
