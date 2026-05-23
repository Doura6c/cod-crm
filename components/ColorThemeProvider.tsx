"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ColorTheme = "blue" | "violet" | "emerald" | "orange" | "rose";

const COLOR_KEY = "cod-crm-color";

interface ColorThemeContextValue {
  colorTheme: ColorTheme;
  setColorTheme: (c: ColorTheme) => void;
}

const ColorThemeContext = createContext<ColorThemeContextValue>({
  colorTheme: "blue",
  setColorTheme: () => {},
});

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("blue");

  useEffect(() => {
    const saved = (localStorage.getItem(COLOR_KEY) as ColorTheme) || "blue";
    setColorThemeState(saved);
    applyTheme(saved);
  }, []);

  function setColorTheme(c: ColorTheme) {
    setColorThemeState(c);
    localStorage.setItem(COLOR_KEY, c);
    applyTheme(c);
  }

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

function applyTheme(c: ColorTheme) {
  if (c === "blue") {
    document.documentElement.removeAttribute("data-color");
  } else {
    document.documentElement.setAttribute("data-color", c);
  }
}

export function useColorTheme() {
  return useContext(ColorThemeContext);
}
