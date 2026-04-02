import { useCallback, useEffect, useState } from "react";

export const THEMES = [
  {
    id: "spotify-green",
    name: "Spotify Green",
    accent: "oklch(0.71 0.19 142)",
    bg: "oklch(0.08 0 0)",
  },
  {
    id: "midnight-purple",
    name: "Midnight Purple",
    accent: "oklch(0.68 0.22 295)",
    bg: "oklch(0.07 0.02 280)",
  },
  {
    id: "royal-gold",
    name: "Royal Gold",
    accent: "oklch(0.78 0.18 80)",
    bg: "oklch(0.08 0.01 60)",
  },
  {
    id: "ethereal-ink",
    name: "Ethereal Ink",
    accent: "oklch(0.72 0.14 220)",
    bg: "oklch(0.07 0.02 230)",
  },
  {
    id: "winter-tree-grey",
    name: "Winter Tree Grey",
    accent: "oklch(0.75 0.02 220)",
    bg: "oklch(0.09 0 0)",
  },
  {
    id: "obsidian",
    name: "Obsidian",
    accent: "oklch(0.65 0.10 30)",
    bg: "oklch(0.06 0 0)",
  },
  {
    id: "solar-flare",
    name: "Solar Flare",
    accent: "oklch(0.75 0.20 50)",
    bg: "oklch(0.08 0.01 40)",
  },
  {
    id: "deep-sea",
    name: "Deep Sea",
    accent: "oklch(0.68 0.16 200)",
    bg: "oklch(0.07 0.02 210)",
  },
  {
    id: "sahara-sand",
    name: "Sahara Sand",
    accent: "oklch(0.80 0.12 90)",
    bg: "oklch(0.09 0.01 70)",
  },
  {
    id: "nordic-frost",
    name: "Nordic Frost",
    accent: "oklch(0.82 0.08 200)",
    bg: "oklch(0.09 0.01 200)",
  },
  {
    id: "crimson-velvet",
    name: "Crimson Velvet",
    accent: "oklch(0.65 0.22 20)",
    bg: "oklch(0.07 0.01 10)",
  },
  {
    id: "cyber-neon",
    name: "Cyber Neon",
    accent: "oklch(0.85 0.25 160)",
    bg: "oklch(0.06 0.02 160)",
  },
  {
    id: "high-contrast-day",
    name: "High Contrast Day",
    accent: "#1a6fe8",
    bg: "#ffffff",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function useTheme() {
  const [activeTheme, setActiveThemeState] = useState<ThemeId>(() => {
    return (
      (localStorage.getItem("writefy_theme") as ThemeId) ?? "spotify-green"
    );
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme);
  }, [activeTheme]);

  const setTheme = useCallback((id: ThemeId) => {
    localStorage.setItem("writefy_theme", id);
    setActiveThemeState(id);
    document.documentElement.setAttribute("data-theme", id);
  }, []);

  return { activeTheme, setTheme, themes: THEMES };
}
