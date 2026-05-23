"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useColorTheme, type ColorTheme } from "./ColorThemeProvider";

const themes = [
  { key: "light", label: "Clair", icon: Sun, desc: "Fond blanc" },
  { key: "dark", label: "Sombre", icon: Moon, desc: "Fond noir" },
  { key: "system", label: "Auto", icon: Monitor, desc: "Selon l'appareil" },
];

const colorOptions: { key: ColorTheme; label: string; hex: string; name: string }[] = [
  { key: "blue",    label: "Bleu",    hex: "#0ea5e9", name: "Sky Blue" },
  { key: "violet",  label: "Violet",  hex: "#8b5cf6", name: "Violet" },
  { key: "emerald", label: "Vert",    hex: "#10b981", name: "Emerald" },
  { key: "orange",  label: "Orange",  hex: "#f97316", name: "Orange" },
  { key: "rose",    label: "Rose",    hex: "#f43f5e", name: "Rose" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Dark / Light */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Mode d'affichage
        </p>
        <div className="grid grid-cols-3 gap-3">
          {themes.map(({ key, label, icon: Icon, desc }) => {
            const active = theme === key;
            return (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                  active
                    ? "border-[color:var(--acc-500)] bg-[color:var(--acc-50)] dark:bg-slate-800"
                    : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800"
                }`}
              >
                {active && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--acc-500)" }}>
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                )}
                <Icon className="w-5 h-5" style={{ color: active ? "var(--acc-500)" : undefined }} />
                <span className={`text-sm font-bold ${active ? "text-[color:var(--acc-700)] dark:text-[color:var(--acc-400)]" : "text-slate-700 dark:text-slate-300"}`}>
                  {label}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Theme */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Couleur d'accent
        </p>
        <div className="flex flex-wrap gap-3">
          {colorOptions.map(({ key, label, hex }) => {
            const active = colorTheme === key;
            return (
              <button
                key={key}
                onClick={() => setColorTheme(key)}
                title={label}
                className={`flex flex-col items-center gap-1.5 transition-all group`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    active
                      ? "ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{
                    backgroundColor: hex,
                    boxShadow: active ? `0 0 0 3px white, 0 0 0 5px ${hex}` : undefined,
                  }}
                >
                  {active && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </div>
                <span className={`text-xs font-medium ${active ? "text-slate-800 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
