"use client";

import { SessionProvider } from "next-auth/react";
import { ColorThemeProvider } from "@/components/ColorThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ColorThemeProvider>
        {children}
      </ColorThemeProvider>
    </SessionProvider>
  );
}
