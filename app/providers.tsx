"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ColorThemeProvider } from "@/components/ColorThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ColorThemeProvider>
          {children}
        </ColorThemeProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
