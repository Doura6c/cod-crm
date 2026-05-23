import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { ColorThemeProvider } from "@/components/ColorThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "HelpMeProcess COD",
  description: "Gestion des commandes Cash on Delivery — HelpMeProcess",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ColorThemeProvider>
            {children}
          </ColorThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
