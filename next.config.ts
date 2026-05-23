import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Assurer la compatibilité Safari (transpilation ES modules)
  transpilePackages: [],
  experimental: {
    // Optimisation pour la compatibilité navigateurs
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
