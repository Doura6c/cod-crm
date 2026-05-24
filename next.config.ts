import type { NextConfig } from "next";

/** ─── Security Headers ────────────────────────────────────── */
const securityHeaders = [
  // Empêche le site d'être chargé dans une iframe (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Désactive la détection MIME type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Contrôle le referrer envoyé
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions API : désactive caméra/micro/géo inutilisées
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // HTTP Strict Transport Security (HTTPS forcé, 1 an)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.neon.tech wss://*.neon.tech",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],

  // Supprime le header X-Powered-By (cache la stack technique)
  poweredByHeader: false,

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  async headers() {
    return [
      {
        // Applique les headers de sécurité sur toutes les routes
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // CORS pour webhook public
        source: "/api/webhook/:path*",
        headers: [
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, X-Webhook-Key" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        // Cache long pour les assets statiques buildés
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
