import type { Metadata, Viewport } from "next";
import { Providers } from "@/app/providers";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HelpMeProcess COD",
  description: "Gestion des commandes Cash on Delivery — HelpMeProcess",
  // Empêche l'indexation par les moteurs de recherche (app interne)
  robots: { index: false, follow: false },
  // Icône pour l'écran d'accueil mobile (PWA-like)
  appleWebApp: {
    capable: true,
    title: "HMP COD",
    statusBarStyle: "black-translucent",
  },
};

// Viewport séparé de metadata (recommandé Next.js 14+)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom mobile laissé actif (accessibilité agents terrain / malvoyants).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased">
        <Providers>
          {children}
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
