"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const themes = [
  { key: "light", label: "Clair", icon: Sun, desc: "Fond blanc, texte sombre" },
  { key: "dark", label: "Sombre", icon: Moon, desc: "Fond noir, texte clair" },
  { key: "system", label: "Automatique", icon: Monitor, desc: "Suit le réglage de votre appareil" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Choisissez l'apparence de l'interface. Le thème automatique suit les préférences de votre appareil.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {themes.map(({ key, label, icon: Icon, desc }) => {
          const active = theme === key;
          return (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                active
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-950"
                  : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800"
              }`}
            >
              {active && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <Icon className={`w-6 h-6 ${active ? "text-sky-500" : "text-slate-400 dark:text-slate-500"}`} />
              <span className={`text-sm font-bold ${active ? "text-sky-700 dark:text-sky-400" : "text-slate-700 dark:text-slate-300"}`}>
                {label}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 text-center leading-tight">
                {desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
