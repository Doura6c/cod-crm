"use client";

import { createContext, useContext, useEffect, useState } from "react";

/* ─── Types ──────────────────────────────────────────── */
export type ColorTheme = "blue" | "violet" | "emerald" | "orange" | "rose";
export type DisplayTheme = "light" | "dark" | "system";

const COLOR_KEY   = "cod-crm-color";
const DISPLAY_KEY = "cod-crm-theme";

/* ─── Context ────────────────────────────────────────── */
interface ThemeContextValue {
  colorTheme: ColorTheme;
  setColorTheme: (c: ColorTheme) => void;
  displayTheme: DisplayTheme;
  setDisplayTheme: (t: DisplayTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorTheme: "blue",
  setColorTheme: () => {},
  displayTheme: "system",
  setDisplayTheme: () => {},
});

/* ─── Provider ───────────────────────────────────────── */
export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState]     = useState<ColorTheme>("blue");
  const [displayTheme, setDisplayThemeState] = useState<DisplayTheme>("system");

  /* On mount : lire localStorage et appliquer */
  useEffect(() => {
    const savedColor   = (localStorage.getItem(COLOR_KEY)   as ColorTheme)   || "blue";
    const savedDisplay = (localStorage.getItem(DISPLAY_KEY) as DisplayTheme) || "system";
    setColorThemeState(savedColor);
    setDisplayThemeState(savedDisplay);
    applyColor(savedColor);
    applyDisplay(savedDisplay);

    /* Écouter le changement de préférence système */
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if ((localStorage.getItem(DISPLAY_KEY) || "system") === "system") {
        applyDisplay("system");
      }
    };
    mq.addEventListener("change", onSystem);
    return () => mq.removeEventListener("change", onSystem);
  }, []);

  function setColorTheme(c: ColorTheme) {
    setColorThemeState(c);
    localStorage.setItem(COLOR_KEY, c);
    applyColor(c);
  }

  function setDisplayTheme(t: DisplayTheme) {
    setDisplayThemeState(t);
    localStorage.setItem(DISPLAY_KEY, t);
    applyDisplay(t);
  }

  return (
    <ThemeContext.Provider value={{ colorTheme, setColorTheme, displayTheme, setDisplayTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────── */
export function useColorTheme() {
  return useContext(ThemeContext);
}

/* ─── Helpers DOM ────────────────────────────────────── */
function applyColor(c: ColorTheme) {
  if (c === "blue") {
    document.documentElement.removeAttribute("data-color");
  } else {
    document.documentElement.setAttribute("data-color", c);
  }
}

function applyDisplay(t: DisplayTheme) {
  const html = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = t === "dark" || (t === "system" && prefersDark);
  html.classList.toggle("dark", isDark);
}
